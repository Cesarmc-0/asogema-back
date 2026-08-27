export const IVA_DEFAULT_RATE = 0.19;

export function calculateIva(subtotal: number): number {
  return Math.round(subtotal * IVA_DEFAULT_RATE);
}

export function getIvaRate(subtotal: number, impuestos: number): string {
  if (subtotal > 0 && impuestos >= 0) {
    return ((impuestos / subtotal) * 100).toFixed(2);
  }
  return (IVA_DEFAULT_RATE * 100).toFixed(2);
}

export function getIvaCode(subtotal: number, impuestos: number): string {
  const rate = parseFloat(getIvaRate(subtotal, impuestos));
  if (rate === 10) return '04';
  if (rate === 5) return '05';
  if (rate === 0) return '09';
  return '01';
}
