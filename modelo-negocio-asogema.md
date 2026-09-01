# Análisis del modelo de negocio — Asogema

## 1. Qué es Asogema
- Sistema de gestión para un cluster hotelero de 3 líneas: hotel, restaurante y eventos.
- Stack: NestJS (backend) + Vue (frontend) + PostgreSQL/Prisma.
- Líneas de negocio según el esquema (21 modelos):
  - Hotel: habitaciones, tipos, reservas, huéspedes.
  - Restaurante: mesas, menú, reservas, pedidos presenciales y online.
  - Eventos: salones, tipos, servicios, reservas.
  - Transversal: facturas (electrónica), pagos, códigos de descuento.

## 2. Actores
- Cliente / huésped final.
- Mesero y recepcionista (operación).
- Administrador (panel de KPIs, ingresos, socios).

## 3. Fortalezas del modelo actual
1. Facturación electrónica de primera (cufe, factus_id, qr_url, numero_factura).
2. Monedero/prepago existente (saldo_recargas + saldos_usuario): capta capital antes del consumo.
3. Pedido online con modalidad (para llevar / incluir mesa / QR).
4. Gestión de tareas internas entre empleados (tareas + reportes con imagen).
5. Descuentos controlados (usos_max, usos_actuales, vigencia).

## 4. Déficits del modelo (brechas de monetización, por impacto)
1. Monetizar por transacción, no por cliente: sin cuenta transversal ni "cargar a la habitación".
   - Sin cross-selling ni medición de LTV/ingreso por cliente.
2. Monedero operativo pero sin auditoría de consumos: el ciclo recarga→saldo→pago funciona.
   - No hay ledger de movimientos (solo se registran recargas, no consumos).
   - Falta reporte de saldo ocioso / inactividad de monedero. *(NOTA: el recibo de compra SÍ está conectado a todo pago exitoso.)*
3. Sin revenue management: precios estáticos en el activo más caro (hotel/salones).
   - Sin disponibilidad/overbooking lógico ni precio por temporada/ocupación.
4. Retención débil: sin fidelidad, membresías ni historial/preferencias de cliente.
5. Estados poco gobernados: ciclos manejados con varchar+CHECK sueltos (riesgo de doble venta).

## 5. Recomendación estratégica del modelo
- Transformar Asogema de "sistema de reservas por silo" a "plataforma de experiencia del cliente con monedero".
1. Un cliente, un folio, una cuenta: sesión/hospedaje que agrupe todas las reservas y consumos.
   - Habilita cross-selling, paquetes, cargar a la habitación y medir LTV.
2. El monedero como núcleo financiero: saldo recargado como pago principal de todo el ecosistema.
   - Capta capital por adelantado (flotante) y fuerza retención.
3. Gobernar el valor por demanda: precios dinámicos (hotel/salones) + fidelidad por historial real.
- Secuencia que cerraría el modelo:
  - Recargar saldo → reservar y consumir en cualquier línea → descontar del monedero → facturar (electrónica) → recibo → acumular fidelidad por historial.

## 6. Qué NO recomendar (YAGNI)
- No meter MongoDB a ciegas sin caso de negocio.
- No encender GraphQL/WebSockets sin necesidad real de producto.
- No overcomplicar la fidelidad hasta cerrar el flujo básico de ingreso (checkout).

## 7. Prioridad sugerida
1. Cerrar el monedero/checkout (recarga → pago → factura → recibo → descuento) — **CORE YA HECHO**; pendiente pago mixto y ledger de movimientos.
2. Unificar la cuenta de cliente transversal.
3. Fidelidad / historial recurrente.
4. Revenue management (precios por temporada/ocupación).

## 8. Avance — Fix reversión de saldo (2026-08-29)
- Al anular una factura pagada con `SALDO` ahora se devuelve el saldo descontado al monedero.
- Al anular una recarga se revierte el crédito y se marca la `saldo_recargas` como `RECHAZADO` (se corrige el wiring de `factura_id`, antes nunca se poblaba).
