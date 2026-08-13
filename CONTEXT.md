# CONTEXTO DEL PROYECTO - ASOGEMA-BACK

> Archivo de seguimiento de sesión. Actualizado: 2026-08-13
> Propósito: permitir retomar el trabajo sin perder el hilo de decisiones y pendientes.

---

## 1. Descripción del proyecto

Backend NestJS para Asogema (gestión de hotelería, restaurante y eventos).
Es un sistema semiprofesional con:

- Stack: NestJS 11 + TypeScript + Prisma 6 + PostgreSQL + Redis + Docker
- Arquitectura: Clean Architecture (estructura base creada, por aplicar en módulos de negocio)
- Gitflow: main / stage / develop (este último es la rama activa)
- CI: GitHub Actions en PR/push a develop y stage
- Repositorio: https://github.com/Cesarmc-0/asogema-back
- Local: ~/asogema-back/asogema-back
- Rama base: develop | Sesión actual: `feat/email-notifications` (verificación de correo + notificaciones por email, PR a develop)

---

## 2. Estado actual (completado)

### Base de datos PostgreSQL (Railway)
- URL: `postgresql://postgres:...@tokaido.proxy.rlwy.net:46875/railway?sslmode=require`
- (Esta URL está en el .env local, NO commiteada)
- Prisma 6 configurado con introspección del esquema real (21 modelos)
- Archivos: `prisma/schema.prisma`, `src/infrastructure/persistence/postgres/`
- cliente Prisma se genera con `pnpm exec prisma generate` (no commiteado)

### Redis (nativo en WSL Ubuntu)
- **Redis 8.0.5 instalado en WSL Ubuntu** como servicio systemd (`redis-server.service`, enabled, autostart). Sin Docker en esta máquina.
- Red de WSL en modo **`mirrored`** (`networkingMode=mirrored`) + **`instanceIdleTimeout=-1`** y `vmIdleTimeout=-1` en `C:\Users\rodri\.wslconfig` — evita que la VM se apague por inactividad (mataba Redis cada ~1 min) y el relay NAT inestable.
- Variables: `REDIS_URL=redis://127.0.0.1:6379` en .env (usar `127.0.0.1`, NO `localhost`: en Windows `localhost` resuelve a IPv6 `::1` y falla).
- Cliente ioredis + BullMQ para colas (BullMQ exige Redis >= 5; 8.0.5 OK)
- Archivos: `src/infrastructure/persistence/redis/`
- Para levantarlo: abrir WSL (redis arranca solo). `wsl --shutdown` **mata Redis** (apaga la VM) — hay que volver a abrir WSL.
- Los **refresh tokens** de auth se guardan en Redis con clave `auth:refresh:<token>` y TTL 7 días (rotación = un solo uso)
- `RedisService` endurecido: si Redis está caído al arrancar, loguea y reintenta en vez de tumbar el proceso (`redis.service.ts`)

### Docker
- `Dockerfile` multi-stage (bookworm-slim + prisma generate + healthcheck + user no-root)
- Pendiente: build local falla por red de Docker daemon (no del Dockerfile). En Railway/CI sí builda.
- `docker-compose.yml` con servicio backend + redis local (mongo comentado para futuro)

### CI con GitHub Actions
- Workflow: `.github/workflows/ci.yml`
- Triggers: PR y push a `develop` y `stage`
- Job `quality`: lint + build + test
- pnpm 10 + Node 22 (alineado con Dockerfile) | prisma generate incluido | lockfile `pnpm-lock.yaml` con `--frozen-lockfile`
- Badge en README.md
- Probado en GitHub: CI corrió verde en PR #6 a develop

### Documentación
- `CONTRIBUTING.md` con Gitflow, commits, onboarding, reglas Prisma, estructura Clean Arch
- `README.md` limpio (sin markers de conflict) + badge CI
- `.env.example` commiteable con placeholders

### Endpoints
- `GET /` → scaffold NestJS (getHello) - aún presente (pendiente eliminar)
- `GET /health` → `{status, timestamp, uptime}`
- `GET /health/redis` → `{status, redis}` (ping Redis)
- `POST /auth/tokens` → login: devuelve access token + refresh token + `expires_in`
- `POST /auth/users` → registro de usuario (envía correo de bienvenida + código de verificación)
- `POST /auth/verify-email` → valida código de 6 dígitos y marca `correo_verificado=true`
- `POST /auth/refresh` → renueva el access token (rota el refresh: el anterior queda inválido)
- `POST /auth/logout` → revoca el refresh token en Redis
- `GET /auth/users/me` → perfil del usuario autenticado (requiere JWT)
- `GET /docs` → Swagger UI

### Auth (COMPLETADO)
- Módulo `auth/` implementado con Clean Architecture (domain/application/infrastructure/presentation)
- Login: bcrypt para password hashing, JWT para tokens
- Register: valida correo único, hashea password
- Perfil: endpoint protegido con JWT strategy
- **Access/refresh tokens implementados**:
  - Access token JWT de vida corta (default `15m`, configurable con `JWT_EXPIRES_IN`)
  - Refresh token opaco (96 chars) guardado en Redis con TTL (default `7d`, `JWT_REFRESH_EXPIRES_IN`)
  - **Rotación**: cada uso de un refresh token lo invalida y emite uno nuevo
  - **Revocación**: logout borra el refresh de Redis
  - Piezas: `TokenService`, `RefreshTokenUseCase`, `LogoutUseCase`, `RefreshTokenRepository` (Redis)
- No RBAC todavía (el `rol_id` está en el JWT payload pero no se valida)
- Swagger documentado con `@ApiTags`, `@ApiOperation`, DTOs con validación
- Deps instaladas: bcrypt, @nestjs/jwt, @nestjs/passport, passport-jwt
- **Verificación de correo (COMPLETADO)**:
  - Columna `correo_verificado boolean NOT NULL DEFAULT false` agregada en `usuarios` (vía SQL en Railway + schema actualizado)
  - Código de 6 dígitos hasheado (SHA-256) en Redis `auth:verify:<correo>`, TTL 10 min, un solo uso, máx 5 intentos (`auth:verify:attempts:<correo>`)
  - Piezas: `EmailVerificationService`, `VerifyEmailUseCase`, endpoint `POST /auth/verify-email`

### Notificaciones por correo (COMPLETADO)
- Módulo `src/infrastructure/mail/` (@Global, Clean Architecture):
  - `domain/email-sender.interface.ts` → port `EmailSender` (`sendWelcomeVerification`, `sendBookingConfirmation`, `sendPurchaseReceipt`)
  - `application/notification.service.ts` → encola jobs en BullMQ `email-queue` (3 intentos, backoff exponencial); **no lanza errores** (el correo nunca rompe un registro/reserva)
  - `application/email-queue.processor.ts` → worker que envía vía SMTP
  - `infrastructure/nodemailer-mailer.ts` → adaptador nodemailer + variables `MAIL_*`
  - `infrastructure/templates/*.hbs` → 5 templates Handlebars (welcome-verification, hotel-booking, event-booking, restaurant-reservation, purchase-receipt)
- **DI**: use-cases inyectan `EmailSender` (resuelve a `NotificationService` = cola); el worker usa `NodemailerMailer` directo
- Puntos de enganche: `RegisterUseCase` (welcome+código), `CreateHotelBookingUseCase`, `CreateEventBookingUseCase`, `CreateRestaurantReservationUseCase` (confirmaciones)
- Recibo de compra: **template listo sin wiring** (no existe flujo de facturación aún)
- `nest-cli.json` copia los `.hbs` a `dist/src` en el build
- Deps nuevas: `nodemailer`, `handlebars`, `@types/nodemailer`
- **VERIFICADO end-to-end (2026-08-13)**: registro → encola `email-queue` → envío SMTP Gmail con App Password real (`Correo welcome-verification -> <correo>`) → código recibido en inbox → `POST /auth/verify-email` responde 201 y deja `correo_verificado=true` en BD → reuso del código da 401 (one-time). Usuario de prueba borrado después de la prueba.

### Otros
- Módulos de negocio **integrados a develop** (merge squash, ramas borradas):
  - `src/admin` → `AdminModule`: panel de KPIs, reservas del día, ingresos, socios (protegido con `@Roles('Administrador')`)
  - `src/hotel` → `HotelModule`: habitaciones disponibles, reservas, mis reservas
  - `src/restaurant` → `RestaurantModule`: menú, mesas disponibles, reservaciones
  - `src/events` → `EventsModule`: salones, tipos de evento, reservas + `prisma/seed-negocio.ts`
  - `app.module.ts` registra los 4 módulos de negocio + Auth
- **Hotel unificado en REST**: `src/modules/hotel` (piloto GraphQL de tipos de habitación) fue eliminado para no duplicar `src/hotel`. La **infra GraphQL se conserva dormida**: `src/infrastructure/graphql/graphql.module.ts` + deps siguen en el repo pero `GraphqlModule` **no se importa** en `app.module.ts` (un módulo code-first sin resolvers rompe el boot con `Query root type must be provided`). Para reactivar: importar `GraphqlModule` y crear resolvers. La API activa es 100% REST.
- Rate limiting global con Redis storage (`@nestjs/throttler`, `RateLimitModule`) en develop
- Fix CI: `node-version: 20.x` (cumple engines de `@angular-devkit` >=20.11.1)
- Refactor `ChangePasswordUseCase` movido al `AuthRepository` (sin PrismaService directo) ya en develop
- `.gitkeep` en carpetas Clean Architecture: application, domain, infrastructure, presentation
- Parche BigInt→String en `src/main.ts` (necesario por PK bigint en BD)
- `AppController` ya está en `presentation/controllers/app.controller.ts` ✅
- `AppService` fue eliminado (no se usaba) ✅

---

## 3. Decisiones tomadas (para mantener consistencia)

| Decisión | Por qué |
|----------|---------|
| Prisma 6 (no 7) | API probada, más docs en español, estable |
| ioredis (no node-redis) | soporta pub/sub + cluster + retry strategy |
| BullMQ para colas | estándar NestJS, integra con Redis |
| Docker bookworm-slim (no alpine) | glibc = mismo target que dev PCs, sin recompilar Prisma |
| `@Global` en PostgresModule y RedisModule | simplifica inyección, un solo cliente por BD |
| BigInt mapea a String en JSON | evita `TypeError: serialize BigInt` en GraphQL/REST |
| `?sslmode=require` en URL PostgreSQL | Railway soporta SSL, mejor para prod |
| Clean Architecture: carpetas vacías con .gitkeep | onboarding devs en formación, esqueleto visible |
| CI solo en PR/push a develop y stage | main se protege con branch protection aparte, futuro |
| pnpm (no npm) | migrado en develop (Dockerfile + CI + `.npmrc` con `node-linker=hoisted`); lockfile `pnpm-lock.yaml` |
| Conventional Commits | ya lo venían usando, se documentó en CONTRIBUTING |
| Squash and merge | historial limpio, un commit por PR |
| Feature branch para infraestructura | Gitflow puro, probar CI en PR antes de develop |
| Refresh token opaco (no JWT) + almacenado en Redis | permite revocación real y rotación; un JWT de refresh no se puede invalidar por sí solo |
| Access token corto (15m) + refresh largo (7d) | limita la ventana de riesgo del access y evita re-login frecuente |
| Correo con nodemailer + SMTP Gmail (sin `@nestjs-modules/mailer`) | proyecto del wrapper archivado; adaptador propio = control total |
| Envío de correo vía cola BullMQ `email-queue` | SMTP es lento: no bloquea el HTTP response ni hace fallar una reserva; reintentos automáticos |
| Use-cases dependen del port `EmailSender`, no de nodemailer | DIP: cambiar de proveedor (SMTP→Resend/SendGrid) toca solo el adaptador |
| Código de verificación en Redis (SHA-256) + TTL 10 min | mismo patrón que refresh tokens: expiración, one-time y rate-limit gratis |
| Templates Handlebars `.hbs` | editables por gente no técnica; copiados a dist vía assets de nest-cli |
| Redis nativo en WSL (mirrored) en vez de Docker | Docker no está instalado en esta máquina; BullMQ exige Redis >= 5 (el viejo 3.0.504 de Windows no servía); el relay NAT de WSL es inestable y `localhost` resuelve a IPv6 en Windows |

---

## 4. Pendientes (backlog)

### Inmediato
- [x] Poblar `MAIL_USER` / `MAIL_PASS` reales en `.env` (App Password de Gmail con 2FA) — **hecho y verificado** con envío real
- [ ] Configurar branch protection en GitHub (main y stage requieren PR + CI verde)
- [x] Agregar tests unitarios del módulo auth (19 suites / 64 tests en verde)
- [x] Access + refresh token con rotación y revocación (en `feat/auth-refresh-token`, pendiente PR a develop)
- [ ] Armar CD (continuous deployment) con webhook a Railway desde main
- [ ] Considerar migrar estados varchar+CHECK de PG a enums reales (cosmético)

### Corto plazo
- [x] Implementar RBAC (guards globales JwtAuthGuard + RolesGuard con @Public/@Roles)
- [x] Rate limit con @nestjs/throttler + Redis store (RateLimitModule)
- [x] Manejo centralizado de errores (HttpExceptionFilter global)
- [ ] Logger estructurado (Winston o Pino)

### Medio plazo
- [ ] Enganchar el correo de recibo de compra (`purchase-receipt.hbs` ya existe) cuando se implemente el flujo de facturación/checkout
- [ ] MongoDB (tercera BD)
- [ ] Definir uso de GraphQL (infra conservada dormida: `graphql.module.ts` + deps; hoy no importado porque sin resolvers no arranca. Reactivar: importar `GraphqlModule` + crear resolvers)
- [ ] WebSockets (Socket.IO vs WS nativo - pendiente)
- [ ] Documentación API con Swagger/OpenAPI (parcialmente hecho)

### Pendientes administrativos
- [ ] Pasar a devs: URL real de Railway PostgreSQL (o crearles usuario read-only)
- [ ] Pasar a devs: instrucción de Redis local (WSL: `service redis-server start` + abrir WSL para que la VM no se apague)
- [ ] Resetear `stage` a `main` (stage está atrás de main, rompe Gitflow)
- [ ] Verificar con devs: integridad de .env y onboarding (CONTRIBUTING.yml)

### Issues conocidos
- [ ] `stage` branch está desactualizada respecto a main (commit b102cf9, antiqueal auth/config)
- [ ] Historial de develop incluye Revert + re-merge de docker-setup (confuso pero funcional)
- [ ] Schema introspeccionado tiene CHECK constraints que Prisma no soporta nativo (estados como varchar+CHECK) - decisión pendiente: migrar a enums o dejar
- [ ] `test/app.e2e-spec.ts` scaffold falla (espera "Hello World!" pero AppController devuelve JSON)
- [x] Tests unitarios en verde (23 suites / 85 tests) tras notificaciones por correo
- [ ] Cuidado con `prisma db pull` a ciegas: la BD Railway comparte esquema con otras apps (142 tablas); el schema del proyecto se mantiene curado en 21 modelos — al sincronizar, revisar el diff y descartar modelos ajenos

---

## 5. Comandos útiles para retomar

```bash
cd ~/asogema-back/asogema-back

# Estado del repo
git status
git log --oneline -10

# Verificar que build pasa
pnpm run lint && pnpm run build && pnpm test

# Levantar Redis local (nativo en WSL)
# Redis arranca solo al abrir WSL (servicio systemd). Si hace falta:
wsl -d Ubuntu -- sudo service redis-server start
# OJO: "wsl --shutdown" apaga la VM y mata Redis (volver a abrir WSL)

# Levantar backend en dev
pnpm run start:dev

# Endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/redis

# Auth (access + refresh token)
curl -X POST http://localhost:3000/auth/tokens -H "Content-Type: application/json" -d '{"correo":"TU_CORREO","password":"TU_PASS"}'
curl -X POST http://localhost:3000/auth/refresh -H "Content-Type: application/json" -d '{"refresh_token":"TU_REFRESH"}'
curl -X POST http://localhost:3000/auth/logout -H "Content-Type: application/json" -d '{"refresh_token":"TU_REFRESH"}'
curl -X POST http://localhost:3000/auth/verify-email -H "Content-Type: application/json" -d '{"correo":"TU_CORREO","codigo":"123456"}'

# Prisma
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma studio
pnpm run prisma:pull
```

---

## 6. Cómo retomar la sesión

1. Leer este archivo `CONTEXT.md`
2. Verificar estado git: `git status && git log --oneline -3 && git branch --show-current`
3. Verificar que build pasa: `pnpm run lint && pnpm run build && pnpm test`
4. Verificar que Redis está corriendo: abrir WSL (`wsl -d Ubuntu`); comprobar `redis-cli ping` → PONG. Si hace falta: `service redis-server start`
5. Levantar backend: `pnpm run start:dev`
6. Verificar endpoints: `curl http://localhost:3000/health` y `curl http://localhost:3000/docs`
7. Revisar pendientes en la sección 4 de este archivo

---

## 7. Reglas acordadas (del usuario, en AGENTS.md)

- Senior developer (15+ años), arquitectura de software, backend
- Aplica SOLID, DRY, KISS, YAGNI
- SIEMPRE explicar el razonamiento ANTES de escribir código
- No generar código extenso sin confirmar approach si la tarea es ambigua
- Si detecta mala práctica, señalarla aunque no se le pida
- NUNCA responder fuera del contexto del proyecto
- Si no tiene info suficiente, pedir mostrar el archivo antes de asumir
- No inventar nombres de funciones, rutas, variables o dependencias
- Confirmar archivo y ubicación antes de modificar
- Explicaciones claras para dev en formación
- Respuestas cortas claras concretas concisas y breves
