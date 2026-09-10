<p align="center">
  <img src="./imagenes/logo-codexium.jpg" alt="CODEXIUM" width="160" />
</p>

<h1 align="center">Asogema — Backend</h1>

<p align="center">
  API REST/GraphQL para la gestión de hotelería, restaurante, eventos y pagos del club Asogema.
</p>

<p align="center">
  <strong>Software Asogema desarrollado por CODEXIUM</strong>
</p>

---

## Tabla de contenido

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación paso a paso](#instalación-paso-a-paso)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Ejecución](#ejecución)
- [Endpoints principales](#endpoints-principales)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Flujo de trabajo (Gitflow)](#flujo-de-trabajo-gitflow)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Descripción

Backend de Asogema, un sistema de gestión para un club que integra:

- **Hotel** — tipos de habitación, disponibilidad, reservas, check-in/check-out y pagos (anticipo y saldo).
- **Restaurante** — menú, mesas, reservas, pedidos online y comanda en tiempo real (WebSockets).
- **Eventos** — salones, tipos de evento, servicios y reservas con cobro.
- **Pagos** — Wompi (tarjeta, Nequi, Daviplata, PSE), saldo interno, facturación electrónica DIAN (Factus) y recibos por correo (Resend).
- **Usuarios** — autenticación JWT con refresh tokens, roles/permisos y verificación de correo.
- **Administración** — panel de KPIs, gestión de usuarios, tareas, reseñas y galería de imágenes (S3).

---

## Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | NestJS 11 + TypeScript |
| Base de datos relacional | PostgreSQL 16 + Prisma 6 |
| Caché / colas | Redis 7 + BullMQ |
| Base documental (opcional) | MongoDB + Mongoose |
| API | REST + GraphQL (Apollo) |
| Tiempo real | WebSockets (Socket.IO) |
| Correo | Resend |
| Pagos | Wompi |
| Facturación electrónica | Factus (DIAN) |
| Almacenamiento de imágenes | AWS S3 |
| Gestor de paquetes | pnpm 10 |
| CI/CD | GitHub Actions |

---

## Arquitectura

El proyecto sigue **Clean Architecture** por módulos, separando responsabilidades:

```
presentation/   → controladores REST, resolvers GraphQL, DTOs
application/    → casos de uso y servicios de aplicación
domain/         → entidades, interfaces de repositorios y puertos
infrastructure/ → persistencia (Prisma), gateways, colas, mail, S3
```

Principios aplicados: **SOLID, DRY, KISS, YAGNI**.

---

## Requisitos previos

- **Node.js 22+**
- **pnpm 10+**
- **PostgreSQL 16+** (local o remoto)
- **Redis 7+** (local o remoto)
- **MongoDB** (opcional; solo para el módulo de configuraciones)
- **Docker y Docker Compose** (opcional, para levantar el stack completo)

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/Cesarmc-0/asogema-back.git
cd asogema-back
```

### 2. Instalar dependencias

```bash
npm install -g pnpm@10
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales (ver sección Variables de entorno)
```

### 4. Generar el cliente de Prisma

```bash
pnpm prisma:generate
```

### 5. Crear la base de datos y el esquema

**Opción A — Script SQL completo (recomendado para empezar de cero):**

```bash
createdb asogema
psql -U postgres -d asogema -f db/asogema.sql
```

El archivo `db/asogema.sql` crea las 30 tablas del proyecto y carga los datos base (roles y tipos de documento). Es idempotente: se puede ejecutar varias veces sin romper nada.

**Opción B — Migraciones de Prisma:**

```bash
pnpm prisma:migrate
```

### 6. Cargar datos base y de ejemplo

```bash
# Crea el usuario administrador (usa ADMIN_EMAIL / ADMIN_PASSWORD del .env)
pnpm prisma:seed
```

> El seed requiere que existan los roles y los tipos de documento (los crea `db/asogema.sql` o las migraciones).

### 7. Levantar Redis y MongoDB (si no los tienes locales)

```bash
# Con Docker
docker run -d --name asogema-redis -p 6379:6379 redis:7-alpine
docker run -d --name asogema-mongo -p 27017:27017 mongo:7
```

O levanta todo el stack (backend + redis + postgres + mongo) con:

```bash
docker compose up -d
```

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores. Las variables se agrupan así:

### Aplicación y base de datos

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://postgres:postgres@localhost:5432/railway` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `MONGODB_URI` | Conexión MongoDB (opcional) | `mongodb://localhost:27017/asogema_mongo` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `JWT_SECRET` | Secreto para firmar tokens | `cambiar_por_secreto_seguro` |
| `JWT_EXPIRES_IN` | Vida del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Vida del refresh token | `7d` |

### Administrador inicial

| Variable | Descripción |
|----------|-------------|
| `ADMIN_EMAIL` | Correo del administrador por defecto |
| `ADMIN_PASSWORD` | Contraseña del administrador por defecto |

### Correo (Resend)

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM` | Remitente (dominio verificado) |

### Pagos (Wompi)

| Variable | Descripción |
|----------|-------------|
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` | Llaves de la pasarela |
| `WOMPI_EVENT_SECRET` | Secreto de eventos (webhook) |
| `WOMPI_INTEGRITY_SECRET` | Secreto de integridad |
| `WOMPI_API_URL` | `https://sandbox.wompi.co/v1` o producción |
| `FRONTEND_URL` | URL del frontend (redirect post-pago) |

### Facturación electrónica (Factus)

| Variable | Descripción |
|----------|-------------|
| `FACTUS_API_URL` | `https://api-sandbox.factus.com.co` o producción |
| `FACTUS_CLIENT_ID` / `FACTUS_CLIENT_SECRET` | Credenciales del API |
| `FACTUS_USERNAME` / `FACTUS_PASSWORD` | Usuario y contraseña del API |
| `FACTUS_SEND_EMAIL` | `true` para que Factus envíe el PDF |

### Almacenamiento (AWS S3)

| Variable | Descripción |
|----------|-------------|
| `AWS_REGION` / `AWS_S3_BUCKET` | Región y bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciales IAM |

---

## Base de datos

- **Script SQL completo:** [`db/asogema.sql`](./db/asogema.sql) — crea las 30 tablas y los datos base. Idempotente.
- **Schema de Prisma:** [`prisma/schema.prisma`](./prisma/schema.prisma).
- **Migraciones versionadas:** [`prisma/migrations/`](./prisma/migrations/).

Comandos útiles:

```bash
pnpm prisma:generate    # Genera el cliente de Prisma
pnpm prisma:migrate     # Aplica migraciones en desarrollo
pnpm prisma:studio      # Interfaz visual de la base de datos
pnpm prisma:validate    # Valida el schema
```

> ⚠️ Si la base de datos es compartida con otras aplicaciones, **no ejecutes `prisma db pull` a ciegas**: mantén el schema curado y aplica solo las migraciones versionadas.

---

## Ejecución

```bash
# Desarrollo
pnpm run start

# Modo watch (recomendado en desarrollo)
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod
```

Verifica que el servidor esté arriba:

```bash
curl http://localhost:3000/health
# { "status": "ok", "timestamp": "...", "uptime": ... }
```

Documentación interactiva de la API (Swagger): `http://localhost:3000/docs`

---

## Endpoints principales

| Módulo | Base | Descripción |
|--------|------|-------------|
| Autenticación | `/auth` | Login, registro, refresh, logout, verificación de correo |
| Hotel | `/hotel` | Habitaciones, disponibilidad, reservas, check-in/out |
| Restaurante | `/restaurant` | Menú, mesas, reservas, pedidos online, comanda |
| Eventos | `/events` | Salones, tipos de evento, servicios, reservas |
| Pagos | `/payments` | Crear pago, verificar, webhook, facturas, PDF |
| Billetera | `/wallet` | Saldo y recargas |
| Administración | `/admin` | KPIs, usuarios, tareas, galería |
| Reseñas | `/reviews` | Reseñas de servicios |
| Salud | `/health` | Estado del servicio |

---

## Pruebas

```bash
# Pruebas unitarias
pnpm test

# Cobertura
pnpm run test:cov

# Pruebas end-to-end
pnpm run test:e2e
```

---

## Despliegue

El despliegue a producción es automático mediante GitHub Actions (`.github/workflows/cd.yml`) al hacer merge a `main`. El backend se empaqueta con Docker (`Dockerfile` multi-stage) y se ejecuta junto a PostgreSQL, Redis y MongoDB vía `docker compose`.

---

## Flujo de trabajo (Gitflow)

- `main` — producción (solo se actualiza por PR de promoción).
- `stage` — preproducción.
- `develop` — integración continua.
- `feature/*`, `hotfix/*`, `fix/*` — ramas de trabajo.

Convenciones:

```bash
git checkout -b feature/nombre-corto develop
# ... cambios ...
git commit -m "feat(modulo): descripcion"
```

Se usa **Conventional Commits** y **squash and merge**. Consulta [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Estructura del proyecto

```
asogema-back/
├── db/
│   └── asogema.sql              # Script SQL completo (tablas + datos base)
├── imagenes/
│   └── logo-codexium.jpg        # Logo de CODEXIUM
├── prisma/
│   ├── schema.prisma            # Modelos de la base de datos
│   ├── migrations/              # Migraciones versionadas
│   ├── seed.ts                  # Admin + usuarios de ejemplo
│   ├── seed-catalogo.ts         # Catálogo (habitaciones, mesas, menú...)
│   └── seed-negocio.ts          # Datos de ejemplo (reservas, pedidos...)
├── src/
│   ├── admin/                   # Panel de administración
│   ├── auth/                    # Autenticación y autorización
│   ├── events/                  # Módulo de eventos
│   ├── facturacion/             # Facturación electrónica (Factus)
│   ├── hotel/                   # Módulo de hotel
│   ├── payments/                # Pagos (Wompi, saldo, webhooks)
│   ├── restaurant/              # Restaurante y comanda
│   ├── reviews/                 # Reseñas
│   ├── wallet/                  # Billetera / saldo
│   └── infrastructure/          # Prisma, Redis, mail, S3, GraphQL
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## Licencia

Software propietario de **Asogema**. Desarrollado por **CODEXIUM**.

<p align="center">
  <sub>Hecho con dedicación por CODEXIUM</sub>
</p>
