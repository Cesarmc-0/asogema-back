/**
 * Constantes de dominio de pagos. Viven en la capa de dominio para que
 * los use-cases, DTOs y adaptadores dependan de un único origen (DIP).
 */

export const TIPOS_RESERVA = [
  'EVENTO',
  'HOTEL',
  'RESTAURANTE',
  'RECARGA',
] as const;
export type TipoReserva = (typeof TIPOS_RESERVA)[number];

export const METODOS_PAGO = [
  'TARJETA',
  'NEQUI',
  'DAVIPLATA',
  'PSE',
  'SALDO',
] as const;

/** Porcentaje inicial que se cobra en una reserva de hotel. */
export const HOTEL_PORCENTAJE_INICIAL = 0.15;

export const RECARGA_MONTO_MIN = 10000;
export const RECARGA_MONTO_MAX = 2000000;

/** Tiempo máximo para que el cliente responda una transacción directa (Nequi/Daviplata/PSE). */
export const TRANSACCION_DIRECTA_TIMEOUT_MS = 10 * 60 * 1000;

/** Prefijo de la referencia de pagos con transacción directa. */
export const REFERENCIA_DIRECTA_PREFIX = 'PAGO-';
