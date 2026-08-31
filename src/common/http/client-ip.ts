import type { Request } from 'express';

/**
 * Obtiene la IP real del cliente, priorizando el header X-Forwarded-For
 * (cuando hay proxy/load balancer) y cayendo a la dirección del socket.
 */
export function getClientIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (Array.isArray(xff)) return xff[0]?.split(',')[0]?.trim();
  return xff?.split(',')[0]?.trim() || req.socket?.remoteAddress;
}
