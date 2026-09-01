import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

const USER: AuthenticatedUser = {
  id: 1n,
  correo: 'empleado1@asogema.com',
  rol: 3n,
  rol_nombre: 'Empleado',
};

const ASIGNADOR = { id: 2n, nombre: 'Admin', apellido: 'Root' };

function buildTarea(overrides: Record<string, unknown> = {}) {
  return {
    id: 10n,
    titulo: 'Limpiar piscina',
    descripcion: 'Revisar cloro y filtros',
    fecha: new Date('2026-08-24T00:00:00Z'),
    hora_inicio: null,
    hora_fin: null,
    estado: 'PENDIENTE',
    prioridad: 'MEDIA',
    asignado_por: 2n,
    asignado_a: 1n,
    created_at: new Date('2026-08-20T10:00:00Z'),
    updated_at: new Date('2026-08-20T10:00:00Z'),
    usuarios_tareas_asignado_porTousuarios: ASIGNADOR,
    ...overrides,
  };
}

function buildMocks() {
  return {
    tareas: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    usuarios: { findUnique: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;
}

const FAKE_STORAGE = { upload: jest.fn(), delete: jest.fn() } as any;

describe('EmployeeController', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: EmployeeController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    FAKE_STORAGE.upload.mockReset();
    FAKE_STORAGE.delete.mockReset();
    controller = new EmployeeController(prisma, FAKE_STORAGE);
  });

  // ── GET tasks/mine ────────────────────────────────────────
  describe('getMyTasks', () => {
    it('devuelve solo tareas activas o del día, ordenadas por fecha y prioridad', async () => {
      prisma.tareas.findMany.mockResolvedValue([buildTarea()]);

      const result = await controller.getMyTasks(USER);

      const args = prisma.tareas.findMany.mock.calls[0][0];
      expect(args.where.asignado_a).toBe(USER.id);
      expect(args.where.OR).toHaveLength(2);
      expect(args.where.OR[0].estado.in).toEqual(['PENDIENTE', 'EN_PROGRESO']);
      expect(args.orderBy[0]).toEqual({ fecha: 'asc' });
      expect(result).toHaveLength(1);
      expect(result[0].asignado_por.nombre).toBe('Admin Root');
    });
  });

  // ── GET tasks/history ─────────────────────────────────────
  describe('getHistory', () => {
    it('devuelve historial paginado de completadas y canceladas', async () => {
      prisma.tareas.count.mockResolvedValue(30);
      prisma.tareas.findMany.mockResolvedValue([
        buildTarea({ estado: 'COMPLETADA' }),
      ]);

      const result = await controller.getHistory(USER, {
        page: 2,
        limit: 15,
      });

      expect(prisma.tareas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            asignado_a: USER.id,
            estado: { in: ['COMPLETADA', 'CANCELADA'] },
          },
          skip: 15,
          take: 15,
        }),
      );
      expect(result.total).toBe(30);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.data).toHaveLength(1);
    });

    it('usa page=1 y limit=15 por defecto', async () => {
      prisma.tareas.count.mockResolvedValue(0);
      prisma.tareas.findMany.mockResolvedValue([]);

      const result = await controller.getHistory(USER, {});

      expect(prisma.tareas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 15 }),
      );
      expect(result.totalPages).toBe(0);
    });
  });

  // ── GET tasks/summary ─────────────────────────────────────
  describe('getSummary', () => {
    it('agrupa los conteos por estado', async () => {
      prisma.tareas.groupBy.mockResolvedValue([
        { estado: 'PENDIENTE', _count: { _all: 3 } },
        { estado: 'COMPLETADA', _count: { _all: 7 } },
      ]);

      const result = await controller.getSummary(USER);

      expect(prisma.tareas.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { asignado_a: USER.id } }),
      );
      expect(result).toEqual({
        total: 10,
        pendientes: 3,
        en_progreso: 0,
        completadas: 7,
        canceladas: 0,
      });
    });
  });

  // ── PATCH tasks/:id/status ────────────────────────────────
  describe('updateTaskStatus', () => {
    it('lanza 404 si la tarea no existe', async () => {
      prisma.tareas.findUnique.mockResolvedValue(null);

      await expect(
        controller.updateTaskStatus(99, { estado: 'EN_PROGRESO' }, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza 403 si la tarea es de otro empleado', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ asignado_a: 99n }),
      );

      await expect(
        controller.updateTaskStatus(10, { estado: 'EN_PROGRESO' }, USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each([
      ['PENDIENTE', 'EN_PROGRESO'],
      ['EN_PROGRESO', 'PENDIENTE'],
      ['EN_PROGRESO', 'COMPLETADA'],
      ['COMPLETADA', 'EN_PROGRESO'],
    ])('permite la transición %s -> %s', async (from, to) => {
      prisma.tareas.findUnique.mockResolvedValue(buildTarea({ estado: from }));
      prisma.tareas.update.mockResolvedValue(buildTarea({ estado: to }));

      const result = await controller.updateTaskStatus(
        10,
        { estado: to },
        USER,
      );

      expect(prisma.tareas.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10n },
          data: expect.objectContaining({ estado: to }),
        }),
      );
      expect(result.estado).toBe(to);
    });

    it.each([
      ['PENDIENTE', 'COMPLETADA'],
      ['PENDIENTE', 'CANCELADA'],
      ['EN_PROGRESO', 'CANCELADA'],
      ['COMPLETADA', 'PENDIENTE'],
      ['COMPLETADA', 'CANCELADA'],
      ['CANCELADA', 'PENDIENTE'],
    ])('rechaza la transición %s -> %s con 400', async (from, to) => {
      prisma.tareas.findUnique.mockResolvedValue(buildTarea({ estado: from }));

      await expect(
        controller.updateTaskStatus(10, { estado: to }, USER),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.tareas.update).not.toHaveBeenCalled();
    });

    it('un empleado no puede cancelar una tarea asignada', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'EN_PROGRESO' }),
      );

      await expect(
        controller.updateTaskStatus(10, { estado: 'CANCELADA' }, USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── POST tasks/:id/complete ───────────────────────────────
  describe('completeTask', () => {
    const FAKE_FILE = {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('completa con imagen: sube a S3 y guarda reporte', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'EN_PROGRESO' }),
      );
      FAKE_STORAGE.upload.mockResolvedValue({
        url: 'https://s3/tareas/u.jpg',
        key: 'tareas/u.jpg',
      });
      prisma.tareas.update.mockResolvedValue(
        buildTarea({
          estado: 'COMPLETADA',
          reporte: 'Hecho',
          reporte_imagen_url: 'https://s3/tareas/u.jpg',
        }),
      );

      const result = await controller.completeTask(
        10,
        { reporte: 'Hecho' },
        USER,
        FAKE_FILE,
      );

      expect(FAKE_STORAGE.upload).toHaveBeenCalledWith(FAKE_FILE, 'tareas');
      expect(prisma.tareas.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'COMPLETADA',
            reporte: 'Hecho',
          }),
        }),
      );
      expect(result.estado).toBe('COMPLETADA');
    });

    it('completa sin imagen: no llama a storage', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'EN_PROGRESO' }),
      );
      prisma.tareas.update.mockResolvedValue(
        buildTarea({ estado: 'COMPLETADA', reporte: 'Listo' }),
      );

      await controller.completeTask(10, { reporte: 'Listo' }, USER);

      expect(FAKE_STORAGE.upload).not.toHaveBeenCalled();
    });

    it('elimina imagen anterior de S3 al sobrescribir reporte', async () => {
      const oldUrl = 'https://s3.tld/tareas/old-uuid.jpg';
      process.env.AWS_S3_BUCKET = 'my-bucket';
      process.env.AWS_S3_PUBLIC_BASE_URL = 'https://s3.tld';
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'EN_PROGRESO', reporte_imagen_url: oldUrl }),
      );
      FAKE_STORAGE.upload.mockResolvedValue({
        url: 'https://s3.tld/tareas/new.jpg',
        key: 'tareas/new.jpg',
      });
      prisma.tareas.update.mockResolvedValue(
        buildTarea({ estado: 'COMPLETADA', reporte: 'Nuevo' }),
      );

      await controller.completeTask(10, { reporte: 'Nuevo' }, USER, FAKE_FILE);

      expect(FAKE_STORAGE.delete).toHaveBeenCalledWith('tareas/old-uuid.jpg');
      expect(FAKE_STORAGE.upload).toHaveBeenCalled();
    });

    it('lanza 403 si la tarea es de otro empleado', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'EN_PROGRESO', asignado_a: 99n }),
      );

      await expect(
        controller.completeTask(10, { reporte: 'X' } as any, USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza 400 si la tarea no está EN_PROGRESO', async () => {
      prisma.tareas.findUnique.mockResolvedValue(
        buildTarea({ estado: 'PENDIENTE' }),
      );

      await expect(
        controller.completeTask(10, { reporte: 'X' } as any, USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza 404 si la tarea no existe', async () => {
      prisma.tareas.findUnique.mockResolvedValue(null);

      await expect(
        controller.completeTask(99, { reporte: 'X' } as any, USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── GET profile ───────────────────────────────────────────
  describe('getProfile', () => {
    it('devuelve el perfil del empleado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 1n,
        nombre: 'Laura',
        apellido: 'García',
        correo: USER.correo,
        telefono: '3201112233',
        fecha_nacimiento: null,
        direccion: null,
        roles: { nombre: 'Empleado' },
      });

      const result = await controller.getProfile(USER);

      expect(result.id).toBe(1);
      expect(result.rol).toBe('Empleado');
    });

    it('lanza 404 si el empleado no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(controller.getProfile(USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
