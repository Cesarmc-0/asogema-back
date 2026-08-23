import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMenuCategoryDto } from './create-menu-category.dto';
import { CreateProductDto } from './create-product.dto';
import { CreateRoomDto } from './create-room.dto';
import { CreateRoomTypeDto } from './create-room-type.dto';
import { CreateSalonDto } from './create-salon.dto';
import { UpdateMenuCategoryDto } from './update-menu-category.dto';
import { UpdateProductDto } from './update-product.dto';
import { UpdateRoomDto } from './update-room.dto';
import { UpdateRoomTypeDto } from './update-room-type.dto';
import { UpdateSalonDto } from './update-salon.dto';

describe('DTOs del AdminModule (validación de payloads del panel)', () => {
  it('CreateSalonDto acepta el payload real del formulario de salones', async () => {
    const dto = plainToInstance(CreateSalonDto, {
      nombre: 'Salón Principal',
      capacidad: '120',
      precio_base: '1500000.50',
      imagen_url: 'https://bucket.s3.amazonaws.com/salones/salon.jpg',
      ubicacion: null,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateSalonDto acepta un payload parcial', async () => {
    const dto = plainToInstance(UpdateSalonDto, {
      precio_base: '1800000',
      ubicacion: 'Planta baja',
      imagen_url: '',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('CreateProductDto acepta el payload real del formulario de productos', async () => {
    const dto = plainToInstance(CreateProductDto, {
      nombre: 'Almuerzo ejecutivo',
      categoria_id: '3',
      precio: '25000.50',
      stock: '10',
      descripcion: null,
      imagen_url: null,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateProductDto acepta un payload parcial', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      precio: '19990',
      imagen_url: '',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('CreateRoomTypeDto acepta el payload real del formulario de tipos', async () => {
    const dto = plainToInstance(CreateRoomTypeDto, {
      nombre: 'Suite Presidencial',
      capacidad: '4',
      precio_noche: '350000',
      imagen_url: 'https://bucket.s3.amazonaws.com/tipos-habitacion/suite.jpg',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateRoomTypeDto acepta un payload parcial', async () => {
    const dto = plainToInstance(UpdateRoomTypeDto, {
      capacidad: '2',
      imagen_url: null,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('CreateRoomDto convierte y valida los campos numéricos', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      numero: '101',
      piso: '2',
      tipo_id: '5',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateRoomDto acepta un payload parcial', async () => {
    const dto = plainToInstance(UpdateRoomDto, { piso: '3' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('CreateMenuCategoryDto valida el nombre', async () => {
    const dto = plainToInstance(CreateMenuCategoryDto, { nombre: 'Bebidas' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('UpdateMenuCategoryDto acepta un payload parcial', async () => {
    const dto = plainToInstance(UpdateMenuCategoryDto, { nombre: 'Postres' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rechaza tipos inválidos en los campos numéricos', async () => {
    const dto = plainToInstance(CreateProductDto, {
      nombre: 'X',
      categoria_id: 'abc',
      precio: '1',
      stock: '1',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoria_id')).toBe(true);
  });
});
