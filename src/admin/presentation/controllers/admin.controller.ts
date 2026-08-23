import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_UPLOAD_FOLDER,
  ImageStorage,
  MAX_IMAGE_SIZE_BYTES,
  UPLOAD_FOLDERS,
} from 'src/infrastructure/storage/domain/image-storage.interface';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateRoomTypeDto } from '../dto/create-room-type.dto';
import { UpdateRoomTypeDto } from '../dto/update-room-type.dto';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { CreateMenuCategoryDto } from '../dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from '../dto/update-menu-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CreateSalonDto } from '../dto/create-salon.dto';
import { UpdateSalonDto } from '../dto/update-salon.dto';

interface CalendarEvent {
  id: number;
  title: string;
  date: string | null;
  time: string;
  location: string;
  category: string;
  color: string;
}

@ApiTags('admin')
@Controller('admin')
@Roles('Administrador')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorage,
  ) {}

  private fmtDate(v?: string | number | Date | null): string | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return d.toISOString().slice(0, 10);
  }

  private fmtTime(v?: string | number | Date | null): string | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ======================
  // UPLOADS (S3)
  // ======================
  @Post('uploads')
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
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Subir una imagen a S3 y devolver su URL pública',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo es obligatorio (campo "file")');
    }
    const safeFolder =
      folder && UPLOAD_FOLDERS.includes(folder)
        ? folder
        : DEFAULT_UPLOAD_FOLDER;
    return this.imageStorage.upload(file, safeFolder);
  }

  // ======================
  // RESUMEN / KPIs
  // ======================
  @Get('summary')
  @ApiOperation({
    summary: 'KPIs del panel: reservas hoy, ingresos, ocupación',
  })
  async getSummary() {
    const hoy = new Date();

    const [
      reservasHotel,
      reservasRest,
      reservasEvento,
      facturasHoy,
      ingresosHoyAgg,
      totalHabitaciones,
      ocupadas,
    ] = await Promise.all([
      this.prisma.reservas_hotel.count({
        where: {
          fecha_entrada: { lte: hoy },
          fecha_salida: { gte: hoy },
          estado: { notIn: ['CANCELADA'] },
        },
      }),
      this.prisma.reservas_restaurante.count({
        where: {
          fecha: hoy,
          estado: { notIn: ['CANCELADA'] },
        },
      }),
      this.prisma.reservas_evento.count({
        where: {
          fecha: { gte: hoy },
          estado: { notIn: ['CANCELADA'] },
        },
      }),
      this.prisma.facturas.count({
        where: {
          fecha_factura: { lte: hoy },
          estado: 'PAGADA',
        },
      }),
      this.prisma.facturas.aggregate({
        where: {
          fecha_factura: { lte: hoy },
          estado: 'PAGADA',
        },
        _sum: { total: true },
      }),
      this.prisma.habitaciones.count(),
      this.prisma.reservas_hotel.count({
        where: {
          estado: 'CONFIRMADA',
        },
      }),
    ]);

    return {
      reservas_hotel: reservasHotel,
      reservas_restaurante: reservasRest,
      reservas_evento: reservasEvento,
      facturas_hoy: facturasHoy,
      ingresos_hoy: Number(ingresosHoyAgg._sum.total ?? 0),
      total_habitaciones: totalHabitaciones,
      ocupadas,
      ocupacion:
        totalHabitaciones > 0
          ? Math.round((ocupadas / totalHabitaciones) * 100)
          : 0,
    };
  }

  // ======================
  // HABITACIÓN TIPOS
  // ======================
  @Get('room-types')
  @ApiOperation({ summary: 'Listar todos los tipos de habitación' })
  async getRoomTypes() {
    return this.prisma.tipos_habitacion.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('room-types')
  @ApiOperation({ summary: 'Crear nuevo tipo de habitación' })
  async createRoomType(@Body() body: CreateRoomTypeDto) {
    return this.prisma.tipos_habitacion.create({
      data: {
        nombre: body.nombre,
        capacidad: body.capacidad,
        precio_noche: body.precio_noche,
        imagen_url: body.imagen_url,
      },
    });
  }

  @Patch('room-types/:id')
  @ApiOperation({ summary: 'Actualizar tipo de habitación' })
  async updateRoomType(
    @Param('id') id: number,
    @Body() body: UpdateRoomTypeDto,
  ) {
    const data: Prisma.tipos_habitacionUpdateInput = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.capacidad !== undefined) data.capacidad = body.capacidad;
    if (body.precio_noche !== undefined) data.precio_noche = body.precio_noche;
    if (body.imagen_url !== undefined) data.imagen_url = body.imagen_url;
    return this.prisma.tipos_habitacion.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  @Delete('room-types/:id')
  @ApiOperation({ summary: 'Eliminar tipo de habitación' })
  async deleteRoomType(@Param('id') id: number) {
    return this.prisma.tipos_habitacion.delete({
      where: { id: BigInt(id) },
    });
  }

  // ======================
  // HABITACIONES INDIVIDUALES
  // ======================
  @Get('rooms')
  @ApiOperation({ summary: 'Listar habitaciones con filtros opcionales' })
  async getRooms(
    @Query('tipo_id') tipo_id?: number,
    @Query('piso') piso?: number,
  ) {
    return this.prisma.habitaciones.findMany({
      where: {
        ...(tipo_id && { tipo_habitacion_id: BigInt(tipo_id) }),
        ...(piso !== undefined && { piso }),
      },
      include: {
        tipos_habitacion: {
          select: {
            nombre: true,
            precio_noche: true,
            capacidad: true,
            imagen_url: true,
          },
        },
      },
      orderBy: { numero: 'asc' },
    });
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Crear nueva habitación individual' })
  async createRoom(@Body() body: CreateRoomDto) {
    return this.prisma.habitaciones.create({
      data: {
        numero: body.numero,
        piso: body.piso,
        tipo_habitacion_id: BigInt(body.tipo_id),
        imagen_url: body.imagen_url ?? null,
      },
    });
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Actualizar habitación individual' })
  async updateRoom(@Param('id') id: number, @Body() body: UpdateRoomDto) {
    const data: Prisma.habitacionesUncheckedUpdateInput = {};
    if (body.numero !== undefined) data.numero = body.numero;
    if (body.piso !== undefined) data.piso = body.piso;
    if (body.tipo_id !== undefined)
      data.tipo_habitacion_id = BigInt(body.tipo_id);
    if (body.imagen_url !== undefined)
      data.imagen_url = body.imagen_url ?? null;
    return this.prisma.habitaciones.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Eliminar habitación individual' })
  async deleteRoom(@Param('id') id: number) {
    return this.prisma.habitaciones.delete({
      where: { id: BigInt(id) },
    });
  }

  // ======================
  // CATEGORÍAS MENÚ RESTAURANTE
  // ======================
  @Get('menu/categories')
  @ApiOperation({ summary: 'Listar categorías del menú' })
  async getMenuCategories() {
    return this.prisma.categorias_menu.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('menu/categories')
  @ApiOperation({ summary: 'Crear nueva categoría de menú' })
  async createMenuCategory(@Body() body: CreateMenuCategoryDto) {
    return this.prisma.categorias_menu.create({
      data: { nombre: body.nombre },
    });
  }

  @Patch('menu/categories/:id')
  @ApiOperation({ summary: 'Actualizar categoría de menú' })
  async updateMenuCategory(
    @Param('id') id: number,
    @Body() body: UpdateMenuCategoryDto,
  ) {
    return this.prisma.categorias_menu.update({
      where: { id: BigInt(id) },
      data: { nombre: body.nombre },
    });
  }

  @Delete('menu/categories/:id')
  @ApiOperation({ summary: 'Eliminar categoría de menú' })
  async deleteMenuCategory(@Param('id') id: number) {
    return this.prisma.categorias_menu.delete({
      where: { id: BigInt(id) },
    });
  }

  // ======================
  // PRODUCTOS MENÚ RESTAURANTE
  // ======================
  @Get('menu/products')
  @ApiOperation({
    summary: 'Listar productos del menú con filtro por categoría',
  })
  async getMenuProducts(@Query('categoria_id') categoria_id?: number) {
    return this.prisma.productos_menu.findMany({
      where: categoria_id ? { categoria_id: BigInt(categoria_id) } : {},
      include: { categorias_menu: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('menu/products')
  @ApiOperation({ summary: 'Crear nuevo producto de menú' })
  async createMenuProduct(@Body() body: CreateProductDto) {
    return this.prisma.productos_menu.create({
      data: {
        nombre: body.nombre,
        categoria_id: BigInt(body.categoria_id),
        precio: body.precio,
        stock: body.stock,
        descripcion: body.descripcion,
        imagen_url: body.imagen_url,
      },
    });
  }

  @Patch('menu/products/:id')
  @ApiOperation({ summary: 'Actualizar producto de menú' })
  async updateMenuProduct(
    @Param('id') id: number,
    @Body() body: UpdateProductDto,
  ) {
    const data: Prisma.productos_menuUncheckedUpdateInput = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.precio !== undefined) data.precio = body.precio;
    if (body.stock !== undefined) data.stock = body.stock;
    if (body.descripcion) data.descripcion = body.descripcion;
    if (body.imagen_url !== undefined) data.imagen_url = body.imagen_url;
    return this.prisma.productos_menu.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  @Delete('menu/products/:id')
  @ApiOperation({ summary: 'Eliminar producto de menú' })
  async deleteMenuProduct(@Param('id') id: number) {
    return this.prisma.productos_menu.delete({
      where: { id: BigInt(id) },
    });
  }

  // ======================
  // SALONES DE EVENTOS
  // ======================
  @Get('events/salons')
  @ApiOperation({ summary: 'Listar salones de eventos' })
  async getEventSalons() {
    return this.prisma.salones.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('events/salons')
  @ApiOperation({ summary: 'Crear nuevo salón de eventos' })
  async createEventSalon(@Body() body: CreateSalonDto) {
    return this.prisma.salones.create({
      data: {
        nombre: body.nombre,
        capacidad: body.capacidad,
        precio_base: body.precio_base,
        imagen_url: body.imagen_url,
        ubicacion: body.ubicacion ?? null,
      },
    });
  }

  @Patch('events/salons/:id')
  @ApiOperation({ summary: 'Actualizar salón de eventos' })
  async updateEventSalon(
    @Param('id') id: number,
    @Body() body: UpdateSalonDto,
  ) {
    const data: Prisma.salonesUpdateInput = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.capacidad !== undefined) data.capacidad = body.capacidad;
    if (body.precio_base !== undefined) data.precio_base = body.precio_base;
    if (body.imagen_url !== undefined) data.imagen_url = body.imagen_url;
    if (body.ubicacion !== undefined) data.ubicacion = body.ubicacion;
    return this.prisma.salones.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  @Delete('events/salons/:id')
  @ApiOperation({ summary: 'Eliminar salón de eventos' })
  async deleteEventSalon(@Param('id') id: number) {
    return this.prisma.salones.delete({
      where: { id: BigInt(id) },
    });
  }

  // ======================
  // RESERVAS DEL DÍA
  // ======================
  @Get('reservations/today')
  @ApiOperation({ summary: 'Reservas del día (hotel, restaurante, eventos)' })
  @ApiQuery({ name: 'fecha', required: false, type: String })
  async getTodayReservations(@Query('fecha') fecha?: string) {
    const fechaDate = fecha ? new Date(fecha + 'T00:00:00') : new Date();
    const startOfDay = new Date(
      fechaDate.getFullYear(),
      fechaDate.getMonth(),
      fechaDate.getDate(),
    );

    const [hoteles, restaurantes, eventos] = await Promise.all([
      this.prisma.reservas_hotel.findMany({
        where: {
          fecha_entrada: { lte: startOfDay },
          fecha_salida: { gte: startOfDay },
          estado: { notIn: ['CANCELADA'] },
        },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          habitaciones: { select: { numero: true } },
        },
      }),
      this.prisma.reservas_restaurante.findMany({
        where: {
          fecha: startOfDay,
          estado: { notIn: ['CANCELADA'] },
        },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          mesas: { select: { numero: true } },
        },
      }),
      this.prisma.reservas_evento.findMany({
        where: {
          fecha: startOfDay,
          estado: { notIn: ['CANCELADA'] },
        },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          salones: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      hotel: hoteles.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        habitacion: r.habitaciones?.numero ?? null,
        personas: r.cantidad_huespedes,
        estado: r.estado,
        telefono: r.usuarios.telefono,
      })),
      restaurante: restaurantes.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        hora: this.fmtTime(r.hora),
        personas: r.cantidad_personas,
        estado: r.estado,
        telefono: r.usuarios.telefono,
        mesa: r.mesas?.numero ?? null,
      })),
      eventos: eventos.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        hora_inicio: this.fmtTime(r.hora_inicio),
        personas: r.cantidad_personas,
        estado: r.estado,
        telefono: r.usuarios.telefono,
        salon: r.salones?.nombre ?? null,
      })),
    };
  }

  // ======================
  // INGRESOS POR PERÍODO
  // ======================
  @Get('income')
  @ApiOperation({
    summary: 'Datos de ingresos por período (diario, semanal, mensual)',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['diario', 'semanal', 'mensual'],
  })
  async getIncome(@Query('period') period: string = 'mensual') {
    const now = new Date();
    const labels: string[] = [];
    let inicio: Date;

    if (period === 'diario') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
      inicio = new Date(now);
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
    } else if (period === 'semanal') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        labels.push(`S${4 - i}`);
      }
      inicio = new Date(now);
      inicio.setDate(inicio.getDate() - 27);
      inicio.setHours(0, 0, 0, 0);
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        labels.push(`${d.getMonth() + 1}/${d.getFullYear()}`);
      }
      inicio = new Date(now);
      inicio.setMonth(inicio.getMonth() - 5);
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
    }

    const facturas = await this.prisma.facturas.findMany({
      where: {
        fecha_factura: { gte: inicio },
        estado: 'PAGADA',
      },
      select: { fecha_factura: true, total: true },
    });

    const values: number[] = labels.map(() => 0);

    facturas.forEach((f) => {
      if (!f.fecha_factura) return;
      const fd = new Date(f.fecha_factura);
      let idx = -1;

      if (period === 'diario') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const d2 = new Date(d);
          d2.setDate(d2.getDate() + 1);
          if (fd >= d && fd < d2) {
            idx = 6 - i;
            break;
          }
        }
      } else if (period === 'semanal') {
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - i * 7);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (fd >= weekStart && fd < weekEnd) {
            idx = 3 - i;
            break;
          }
        }
      } else {
        if (
          fd.getMonth() === now.getMonth() &&
          fd.getFullYear() === now.getFullYear()
        ) {
          idx = 5;
        } else {
          for (let i = 1; i <= 5; i++) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            if (
              fd.getMonth() === d.getMonth() &&
              fd.getFullYear() === d.getFullYear()
            ) {
              idx = 5 - i;
              break;
            }
          }
        }
      }

      if (idx >= 0 && idx < values.length) {
        values[idx] += Number(f.total);
      }
    });

    return { labels, values };
  }

  // ======================
  // SERVICIOS MÁS SOLICITADOS
  // ======================
  @Get('services/top')
  @ApiOperation({ summary: 'Ranking de servicios de eventos más solicitados' })
  async getTopServices() {
    const detalles = await this.prisma.detalle_servicios_evento.groupBy({
      by: ['servicio_id'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const totalBookings = detalles.reduce((sum, d) => sum + d._count.id, 0);

    const servicioIds = detalles.map((d) => d.servicio_id);
    const servicios = await this.prisma.servicios_evento.findMany({
      where: { id: { in: servicioIds } },
      select: { id: true, nombre: true },
    });
    const servicioMap = new Map(servicios.map((s) => [Number(s.id), s.nombre]));

    return detalles.map((d) => ({
      name: servicioMap.get(Number(d.servicio_id)) || 'Desconocido',
      bookings: d._count.id,
      percentage:
        totalBookings > 0
          ? Math.round((d._count.id / totalBookings) * 1000) / 10
          : 0,
    }));
  }

  // ======================
  // OCUPACIÓN HOTELERA
  // ======================
  @Get('hotel/occupancy')
  @ApiOperation({
    summary: 'Estadísticas de ocupación hotelera + historial 14 días',
  })
  async getHotelOccupancy() {
    const total = await this.prisma.habitaciones.count();
    const hoy = new Date();
    const startOfDay = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
    );

    const ocupadas = await this.prisma.reservas_hotel.count({
      where: {
        fecha_entrada: { lte: startOfDay },
        fecha_salida: { gte: startOfDay },
        estado: { notIn: ['CANCELADA'] },
      },
    });

    const disponibles = total - ocupadas;
    const actual = total > 0 ? Math.round((ocupadas / total) * 1000) / 10 : 0;

    const historico_14_dias: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const d2 = new Date(d);
      d2.setDate(d2.getDate() + 1);

      const count = await this.prisma.reservas_hotel.count({
        where: {
          fecha_entrada: { lte: d },
          fecha_salida: { gte: d },
          estado: { notIn: ['CANCELADA'] },
        },
      });
      historico_14_dias.push(
        total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      );
    }

    return {
      actual,
      ocupadas,
      totales: total,
      disponibles,
      historico_14_dias,
    };
  }

  // ======================
  // EVENTOS DEL CALENDARIO
  // ======================
  @Get('calendar/events')
  @ApiOperation({
    summary: 'Todos los eventos del calendario (reservas + eventos)',
  })
  async getCalendarEvents() {
    const [hoteles, restaurantes, eventos] = await Promise.all([
      this.prisma.reservas_hotel.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        select: {
          id: true,
          fecha_entrada: true,
          fecha_salida: true,
          estado: true,
          usuarios: { select: { nombre: true, apellido: true } },
        },
      }),
      this.prisma.reservas_restaurante.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        select: {
          id: true,
          fecha: true,
          hora: true,
          estado: true,
          usuarios: { select: { nombre: true, apellido: true } },
        },
      }),
      this.prisma.reservas_evento.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        select: {
          id: true,
          fecha: true,
          hora_inicio: true,
          estado: true,
          usuarios: { select: { nombre: true, apellido: true } },
          salones: { select: { nombre: true } },
        },
      }),
    ]);

    const events: CalendarEvent[] = [];

    hoteles.forEach((r) => {
      events.push({
        id: Number(r.id),
        title: `Hotel: ${r.usuarios.nombre} ${r.usuarios.apellido}`,
        date: this.fmtDate(r.fecha_entrada),
        time: '—',
        location: 'Hotel',
        category: 'reservas',
        color: '#fdcb6e',
      });
    });

    restaurantes.forEach((r) => {
      events.push({
        id: Number(r.id) + 100000,
        title: `Restaurante: ${r.usuarios.nombre} ${r.usuarios.apellido}`,
        date: this.fmtDate(r.fecha),
        time: this.fmtTime(r.hora) ?? '—',
        location: 'Restaurante',
        category: 'reservas',
        color: '#00cec9',
      });
    });

    eventos.forEach((r) => {
      events.push({
        id: Number(r.id) + 200000,
        title: `${r.salones?.nombre || 'Evento'}: ${r.usuarios.nombre} ${r.usuarios.apellido}`,
        date: this.fmtDate(r.fecha),
        time: this.fmtTime(r.hora_inicio) ?? '—',
        location: r.salones?.nombre || 'Evento',
        category: 'eventos',
        color: '#6c5ce7',
      });
    });

    return events;
  }

  // ======================
  // TAREAS — CRUD
  // ======================
  @Get('tasks')
  @ApiOperation({ summary: 'Listar tareas con filtros opcionales' })
  @ApiQuery({ name: 'fecha', required: false })
  @ApiQuery({ name: 'empleado_id', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'mes', required: false })
  async getTasks(
    @Query('fecha') fecha?: string,
    @Query('empleado_id') empleado_id?: string,
    @Query('estado') estado?: string,
    @Query('mes') mes?: string,
  ) {
    const where: Prisma.tareasWhereInput = {};

    if (fecha) {
      const d = new Date(fecha + 'T00:00:00');
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.fecha = { gte: start, lt: end };
    }

    if (empleado_id) {
      where.asignado_a = BigInt(empleado_id);
    }

    if (estado) {
      where.estado = estado;
    }

    if (mes) {
      const [year, month] = mes.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      if (!where.fecha) {
        where.fecha = { gte: start, lt: end };
      }
    }

    const tareas = await this.prisma.tareas.findMany({
      where,
      include: {
        usuarios_tareas_asignado_aTousuarios: {
          select: { id: true, nombre: true, apellido: true, correo: true },
        },
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: [{ fecha: 'asc' }, { created_at: 'desc' }],
    });

    return tareas.map((t) => this.mapTarea(t));
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Crear nueva tarea' })
  async createTask(
    @Body() body: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tarea = await this.prisma.tareas.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion,
        fecha: new Date(body.fecha + 'T00:00:00'),
        hora_inicio: body.hora_inicio
          ? new Date(`1970-01-01T${body.hora_inicio}`)
          : undefined,
        hora_fin: body.hora_fin
          ? new Date(`1970-01-01T${body.hora_fin}`)
          : undefined,
        estado: body.estado ?? 'PENDIENTE',
        prioridad: body.prioridad ?? 'MEDIA',
        asignado_a: BigInt(body.asignado_a),
        asignado_por: user.id,
      },
      include: {
        usuarios_tareas_asignado_aTousuarios: {
          select: { id: true, nombre: true, apellido: true, correo: true },
        },
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    return this.mapTarea(tarea);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Actualizar tarea' })
  async updateTask(@Param('id') id: number, @Body() body: UpdateTaskDto) {
    const data: Prisma.tareasUncheckedUpdateInput = {};
    if (body.titulo !== undefined) data.titulo = body.titulo;
    if (body.descripcion !== undefined) data.descripcion = body.descripcion;
    if (body.fecha !== undefined)
      data.fecha = new Date(body.fecha + 'T00:00:00');
    if (body.hora_inicio !== undefined)
      data.hora_inicio = body.hora_inicio
        ? new Date(`1970-01-01T${body.hora_inicio}`)
        : null;
    if (body.hora_fin !== undefined)
      data.hora_fin = body.hora_fin
        ? new Date(`1970-01-01T${body.hora_fin}`)
        : null;
    if (body.estado !== undefined) data.estado = body.estado;
    if (body.prioridad !== undefined) data.prioridad = body.prioridad;
    if (body.asignado_a !== undefined)
      data.asignado_a = BigInt(body.asignado_a);

    const tarea = await this.prisma.tareas.update({
      where: { id: BigInt(id) },
      data,
      include: {
        usuarios_tareas_asignado_aTousuarios: {
          select: { id: true, nombre: true, apellido: true, correo: true },
        },
        usuarios_tareas_asignado_porTousuarios: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    return this.mapTarea(tarea);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Eliminar tarea' })
  async deleteTask(@Param('id') id: number) {
    return this.prisma.tareas.delete({
      where: { id: BigInt(id) },
    });
  }

  private mapTarea(t: {
    id: bigint;
    titulo: string;
    descripcion: string | null;
    fecha: Date;
    hora_inicio: Date | null;
    hora_fin: Date | null;
    estado: string;
    prioridad: string;
    created_at: Date | null;
    updated_at: Date | null;
    usuarios_tareas_asignado_aTousuarios: {
      id: bigint;
      nombre: string;
      apellido: string;
      correo: string;
    } | null;
    usuarios_tareas_asignado_porTousuarios: {
      id: bigint;
      nombre: string;
      apellido: string;
    } | null;
  }) {
    return {
      id: Number(t.id),
      titulo: t.titulo,
      descripcion: t.descripcion,
      fecha: this.fmtDate(t.fecha),
      hora_inicio: this.fmtTime(t.hora_inicio),
      hora_fin: this.fmtTime(t.hora_fin),
      estado: t.estado,
      prioridad: t.prioridad,
      asignado_a: t.usuarios_tareas_asignado_aTousuarios
        ? {
            id: Number(t.usuarios_tareas_asignado_aTousuarios.id),
            nombre: t.usuarios_tareas_asignado_aTousuarios.nombre,
            apellido: t.usuarios_tareas_asignado_aTousuarios.apellido,
            correo: t.usuarios_tareas_asignado_aTousuarios.correo,
          }
        : null,
      asignado_por: t.usuarios_tareas_asignado_porTousuarios
        ? {
            id: Number(t.usuarios_tareas_asignado_porTousuarios.id),
            nombre: t.usuarios_tareas_asignado_porTousuarios.nombre,
            apellido: t.usuarios_tareas_asignado_porTousuarios.apellido,
          }
        : null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  // ======================
  // EMPLEADOS
  // ======================
  @Get('employees')
  @ApiOperation({ summary: 'Listar todos los empleados' })
  async getEmployees() {
    const empleados = await this.prisma.usuarios.findMany({
      where: {
        roles: { nombre: 'Empleado' },
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return empleados.map((e) => ({
      id: Number(e.id),
      nombre: `${e.nombre} ${e.apellido}`,
      correo: e.correo,
      telefono: e.telefono,
    }));
  }

  // ======================
  // SOCIOS (MEMBERS)
  // ======================
  @Get('members')
  @ApiOperation({ summary: 'Listar socios (clientes)' })
  async getMembers() {
    const socios = await this.prisma.usuarios.findMany({
      where: {
        roles: { nombre: 'Cliente' },
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return socios.map((s) => ({
      id: Number(s.id),
      nombre: `${s.nombre} ${s.apellido}`,
      correo: s.correo,
      telefono: s.telefono,
    }));
  }

  @Get('members/:id')
  @ApiOperation({ summary: 'Detalle de socio con reservas y facturas' })
  async getMemberDetail(@Param('id') id: number) {
    const [reservasHotel, reservasRestaurante, reservasEvento, facturas] =
      await Promise.all([
        this.prisma.reservas_hotel.findMany({
          where: { usuario_id: BigInt(id) },
          select: {
            id: true,
            fecha_entrada: true,
            cantidad_huespedes: true,
            estado: true,
          },
          orderBy: { fecha_entrada: 'desc' },
        }),
        this.prisma.reservas_restaurante.findMany({
          where: { usuario_id: BigInt(id) },
          select: {
            id: true,
            fecha: true,
            hora: true,
            cantidad_personas: true,
            estado: true,
          },
          orderBy: { fecha: 'desc' },
        }),
        this.prisma.reservas_evento.findMany({
          where: { usuario_id: BigInt(id) },
          select: {
            id: true,
            fecha: true,
            cantidad_personas: true,
            estado: true,
            tipos_evento: { select: { nombre: true } },
            salones: { select: { nombre: true } },
          },
          orderBy: { fecha: 'desc' },
        }),
        this.prisma.facturas.findMany({
          where: { usuario_id: BigInt(id) },
          select: {
            id: true,
            fecha_factura: true,
            total: true,
            estado: true,
          },
          orderBy: { fecha_factura: 'desc' },
        }),
      ]);

    return {
      reservas_hotel: reservasHotel.map((r) => ({
        id: Number(r.id),
        entrada: this.fmtDate(r.fecha_entrada),
        personas: r.cantidad_huespedes,
        estado: r.estado,
      })),
      reservas_restaurante: reservasRestaurante.map((r) => ({
        id: Number(r.id),
        fecha: this.fmtDate(r.fecha),
        hora: this.fmtTime(r.hora),
        personas: r.cantidad_personas,
        estado: r.estado,
      })),
      reservas_evento: reservasEvento.map((r) => ({
        id: Number(r.id),
        fecha: this.fmtDate(r.fecha),
        personas: r.cantidad_personas,
        estado: r.estado,
        tipo: r.tipos_evento?.nombre ?? null,
        salon: r.salones?.nombre ?? null,
      })),
      facturas: facturas.map((f) => ({
        id: Number(f.id),
        fecha: this.fmtDate(f.fecha_factura),
        total: Number(f.total),
        estado: f.estado,
      })),
    };
  }
}
