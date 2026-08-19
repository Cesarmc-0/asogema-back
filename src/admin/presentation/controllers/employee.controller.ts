import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';

@ApiTags('employee')
@Controller('employee')
@Roles('Empleado')
export class EmployeeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tasks/mine')
  @ApiOperation({ summary: 'Tareas asignadas al empleado autenticado' })
  async getMyTasks(@CurrentUser() user: AuthenticatedUser) {
    const tareas = await this.prisma.tareas.findMany({
      where: { asignado_a: user.id },
      include: {
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: [
        { estado: 'asc' },
        { prioridad: 'desc' },
        { fecha: 'asc' },
      ],
    });

    return tareas.map((t) => ({
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
      asignado_por: {
        id: Number(t.usuarios_tareas_asignado_porTousuarios.id),
        nombre: `${t.usuarios_tareas_asignado_porTousuarios.nombre} ${t.usuarios_tareas_asignado_porTousuarios.apellido}`,
      },
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de una tarea asignada' })
  async updateTaskStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tarea = await this.prisma.tareas.findUnique({ where: { id } });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (tarea.asignado_a !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta tarea',
      );
    }

    const updated = await this.prisma.tareas.update({
      where: { id },
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

    return {
      id: Number(updated.id),
      titulo: updated.titulo,
      descripcion: updated.descripcion,
      fecha: updated.fecha.toISOString().slice(0, 10),
      hora_inicio: updated.hora_inicio
        ? updated.hora_inicio.toISOString().slice(11, 16)
        : null,
      hora_fin: updated.hora_fin
        ? updated.hora_fin.toISOString().slice(11, 16)
        : null,
      estado: updated.estado,
      prioridad: updated.prioridad,
      asignado_por: {
        id: Number(updated.usuarios_tareas_asignado_porTousuarios.id),
        nombre: `${updated.usuarios_tareas_asignado_porTousuarios.nombre} ${updated.usuarios_tareas_asignado_porTousuarios.apellido}`,
      },
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
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
}
