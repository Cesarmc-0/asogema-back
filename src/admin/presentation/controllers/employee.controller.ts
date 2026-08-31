import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ImageStorage,
  MAX_IMAGE_SIZE_BYTES,
} from 'src/infrastructure/storage/domain/image-storage.interface';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import type { tareas, usuarios } from '@prisma/client';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';
import { TaskHistoryQueryDto } from '../dto/task-history-query.dto';
import { CompleteTaskDto } from '../dto/complete-task.dto';

// Transiciones permitidas para el rol Empleado.
// Solo el administrador puede cancelar una tarea (estado CANCELADA).
const EMPLOYEE_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ['EN_PROGRESO'],
  EN_PROGRESO: ['PENDIENTE', 'COMPLETADA'],
  COMPLETADA: ['EN_PROGRESO'],
  CANCELADA: [],
};

const ACTIVE_STATES = ['PENDIENTE', 'EN_PROGRESO'];
const HISTORY_STATES = ['COMPLETADA', 'CANCELADA'];

type TareaConAsignador = tareas & {
  usuarios_tareas_asignado_porTousuarios: Pick<
    usuarios,
    'id' | 'nombre' | 'apellido'
  >;
};

@ApiTags('employee')
@Controller('employee')
@Roles('Empleado')
export class EmployeeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorage,
  ) {}

  @Get('tasks/mine')
  @ApiOperation({
    summary:
      'Tareas activas del empleado autenticado (pendientes, en progreso y del día)',
  })
  async getMyTasks(@CurrentUser() user: AuthenticatedUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tareas = await this.prisma.tareas.findMany({
      where: {
        asignado_a: user.id,
        OR: [
          { estado: { in: ACTIVE_STATES } },
          { fecha: { gte: today, lt: tomorrow } },
        ],
      },
      include: {
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: [
        { fecha: 'asc' },
        { prioridad: 'desc' },
        { hora_inicio: 'asc' },
      ],
    });

    return tareas.map((t) => this.mapTask(t));
  }

  @Get('tasks/history')
  @ApiOperation({
    summary: 'Historial paginado de tareas completadas/canceladas',
  })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TaskHistoryQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const where = {
      asignado_a: user.id,
      estado: { in: HISTORY_STATES },
    };

    const [total, tareas] = await this.prisma.$transaction([
      this.prisma.tareas.count({ where }),
      this.prisma.tareas.findMany({
        where,
        include: {
          usuarios_tareas_asignado_porTousuarios: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: tareas.map((t) => this.mapTask(t)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('tasks/summary')
  @ApiOperation({ summary: 'Conteo de tareas del empleado por estado' })
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    const grouped = await this.prisma.tareas.groupBy({
      by: ['estado'],
      where: { asignado_a: user.id },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    let total = 0;
    for (const g of grouped) {
      counts[g.estado] = g._count._all;
      total += g._count._all;
    }

    return {
      total,
      pendientes: counts.PENDIENTE ?? 0,
      en_progreso: counts.EN_PROGRESO ?? 0,
      completadas: counts.COMPLETADA ?? 0,
      canceladas: counts.CANCELADA ?? 0,
    };
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de una tarea asignada' })
  async updateTaskStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tarea = await this.prisma.tareas.findUnique({
      where: { id: BigInt(id) },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    this.assertCanTransition(tarea, user.id, dto.estado);

    const updated = await this.prisma.tareas.update({
      where: { id: BigInt(id) },
      data: {
        estado: dto.estado,
        updated_at: new Date(),
      },
      include: {
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    return this.mapTask(updated);
  }

  @Post('tasks/:id/complete')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Tipo de archivo no permitido. Solo JPG, PNG o WebP',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reporte: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['reporte'],
    },
  })
  @ApiOperation({
    summary:
      'Completar una tarea asignada con reporte obligatorio e imagen opcional',
  })
  async completeTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tarea = await this.prisma.tareas.findUnique({
      where: { id: BigInt(id) },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    this.assertCanTransition(tarea, user.id, 'COMPLETADA');

    // Si ya tiene imagen previa, eliminarla de S3 antes de subir la nueva
    if (tarea.reporte_imagen_url) {
      const oldKey = this.extractS3Key(tarea.reporte_imagen_url);
      if (oldKey) await this.imageStorage.delete(oldKey);
    }

    let imagenUrl: string | null = null;
    if (file) {
      const uploaded = await this.imageStorage.upload(file, 'tareas');
      imagenUrl = uploaded.url;
    }

    const updated = await this.prisma.tareas.update({
      where: { id: tarea.id },
      data: {
        estado: 'COMPLETADA',
        reporte: dto.reporte.trim(),
        reporte_imagen_url: imagenUrl,
        reporte_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    return this.mapTask(updated);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Perfil del empleado autenticado' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const empleado = await this.prisma.usuarios.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
        fecha_nacimiento: true,
        direccion: true,
        roles: { select: { nombre: true } },
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return {
      id: Number(empleado.id),
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      correo: empleado.correo,
      telefono: empleado.telefono,
      fecha_nacimiento: empleado.fecha_nacimiento,
      direccion: empleado.direccion,
      rol: empleado.roles.nombre,
    };
  }

  /**
   * Verifica que la tarea pertenezca al empleado y que la transición de
   * estado sea válida para su rol. Lanza 403/400 en caso contrario.
   */
  private assertCanTransition(
    tarea: Pick<tareas, 'asignado_a' | 'estado'>,
    userId: bigint,
    newEstado: string,
  ): void {
    if (tarea.asignado_a !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta tarea',
      );
    }

    const allowed = EMPLOYEE_TRANSITIONS[tarea.estado] ?? [];
    if (!allowed.includes(newEstado)) {
      throw new BadRequestException(
        `No puedes cambiar una tarea de ${tarea.estado} a ${newEstado}`,
      );
    }
  }

  /**
   * Extrae la key de S3 a partir de la URL pública.
   * Soporta tanto el formato base URL como el formato default de S3.
   */
  private extractS3Key(url: string): string | null {
    const base = process.env.AWS_S3_PUBLIC_BASE_URL;
    if (base && url.startsWith(base)) {
      return url.slice(base.length).replace(/^\/+/, '');
    }
    const defaultPrefix = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/`;
    if (url.startsWith(defaultPrefix)) {
      return url.slice(defaultPrefix.length);
    }
    return null;
  }

  private mapTask(t: TareaConAsignador) {
    return {
      id: Number(t.id),
      titulo: t.titulo,
      descripcion: t.descripcion,
      fecha: t.fecha.toISOString().slice(0, 10),
      hora_inicio: t.hora_inicio
        ? t.hora_inicio.toISOString().slice(11, 16)
        : null,
      hora_fin: t.hora_fin ? t.hora_fin.toISOString().slice(11, 16) : null,
      estado: t.estado,
      prioridad: t.prioridad,
      reporte: t.reporte,
      reporte_imagen_url: t.reporte_imagen_url,
      reporte_at: t.reporte_at,
      asignado_por: {
        id: Number(t.usuarios_tareas_asignado_porTousuarios.id),
        nombre: `${t.usuarios_tareas_asignado_porTousuarios.nombre} ${t.usuarios_tareas_asignado_porTousuarios.apellido}`,
      },
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }
}
