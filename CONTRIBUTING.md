# Contribuir a asogema-back

Backend NestJS para Asogema (gestión hotelería, restaurante y eventos) con PostgreSQL, Redis, MongoDB, GraphQL y WebSockets, siguiendo Clean Architecture y Gitflow.

---

## 1. Flujo Gitflow

```
main        ← protegida, producción. Solo merges desde stage (release/hotfix).
stage       ← existe para pre-producción / pruebas (no se usa aún).
develop     ← rama de integración activa. Todas las features se merguean acá.
feature/*   ← nuevas funcionalidades. Base: develop. PR target: develop.
bugfix/*    ← correcciones no urgentes. Base: develop. PR target: develop.
hotfix/*    ← correcciones urgentes en producción. Base: main. PR target: main + develop.
release/*   ← preparación de release. Base: develop. PR target: stage y main.
```

### Reglas
- **Nunca** commitear directo a `main`, `stage` ni `develop`. Todo va por PR.
- `main` y `stage` deben tener **branch protection** activa en GitHub (pendiente de configurar).
- Mínimo **1 approval** por PR + CI verde (cuando exista CI).
- Estrategia de merge: **Squash and merge** (historial limpio, un commit por PR).

---

## 2. Convención de commits (Conventional Commits)

```
<tipo>(<scope opcional>): <descripción en minúsculas, sin punto final>
```

### Tipos válidos
- `feat:`     nueva funcionalidad
- `fix:`      corrección de bug
- `docs:`     documentación (README, CONTRIBUTING, comentarios)
- `style:`    formato, indentación, puntos y comas (sin cambio de lógica)
- `refactor:` reestructuración sin cambio de comportamiento
- `perf:`     mejora de performance
- `test:`     agregar o corregir tests
- `chore:`    tareas de mantenimiento (deps, configs, scripts)
- `build:`    sistema de build, deps, package.json
- `ci:`       pipelines CI
- `revert:`   revertir un commit previo

### Ejemplos
```
feat(auth): implementar login con JWT
fix(facturas): corregir cálculo de impuestos
docs: actualizar onboarding en CONTRIBUTING
chore(prisma): actualizar schema tras db pull
```

---

## 3. Nomenclatura de branches

```
<tipo>/<modulo>-<breve-descripción>
```

- `feature/auth-jwt`
- `feature/reservas-hotel-crud`
- `bugfix/facturas-total-negativo`
- `hotfix/login-500-error`
- `release/v0.1.0`

Usar **kebab-case**, sin espacios ni tildes.

---

## 4. Onboarding de un dev nuevo

```bash
# 1. Clonar
git clone https://github.com/Cesarmc-0/asogema-back.git
cd asogema-back

# 2. Ubicarse en develop y actualizar
git checkout develop
git pull origin develop

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con las URLs reales (pedir a un admin)
#   - DATABASE_URL: postgresql://...@railway.../railway?sslmode=require

# 5. Generar el cliente Prisma tipado
npx prisma generate

# 6. Levantar la app
npm run start:dev      # http://localhost:3000
```

---

## 5. Trabajando en una feature

```bash
# Desde develop actualizado
git checkout -b feature/mi-feature

# ...desarrollar... correr tests locales...
npm run lint
npm run build
npm test

# Commitear (Conventional Commits)
git add .
git commit -m "feat(modulo): descripción breve"

# Push y PR contra develop
git push -u origin feature/mi-feature
# Abrir PR en GitHub con target: develop
```

---

## 6. Nosotros y Prisma (importante)

El esquema de la BD **ya existe en Railway**. Prisma opera en modo **introspección**:

| Quiero... | Comando |
|-----------|---------|
| Validar el schema | `npm run prisma:validate` |
| Regenerar el cliente TS tipado | `npm run prisma:generate` |
| Sincronizar el schema desde la BD (si cambió fuera del ORM) | `npm run prisma:pull` |
| Inspeccionar datos en GUI web | `npm run prisma:studio` |
| Crear migración nueva (cuando empecemos a evolucionar schema desde el ORM) | `npm run prisma:migrate` |

### Reglas con Prisma
- **No editar `prisma/schema.prisma` a mano** salvo en migraciones controladas.
- Si la BD cambia (otro dev, SQL directo): `npm run prisma:pull` + commitear schema + avisar al equipo para que corran `prisma:generate`.
- Antes de un PR que toque datos: `npx prisma validate` debe pasar.

---

## 7. Lo que NO se toca

- `.env` (es local y **no se commitea**). El template es `.env.example`.
- `main`, `stage`, `develop` (todo por PR).
- `prisma/schema.prisma` a mano (usar `prisma db pull` o `prisma migrate`).
- Configuración de estas ramas/protecciones en GitHub (lo hace el lead).

---

## 8. Estructura del proyecto (Clean Architecture)

```
src/
  application/       (casos de uso / servicios de aplicación)
  domain/            (entidades, value objects, interfaces de repositorios)
  infrastructure/
    persistence/
      postgres/      (Prisma + PrismaService)
      mongo/         (pendiente)
      redis/         (pendiente)
    gateways/        (pendiente - WebSockets)
  presentation/
    controllers/     (REST)
    resolvers/       (GraphQL - pendiente)
    dto/
  auth/              (autenticación)
  shared/            (config, decorators, constants, utils)
prisma/
  schema.prisma
test/
```

Capas y dependencias:
- `domain` **no depende de nadie** (solo de sí misma).
- `application` depende de `domain`.
- `infrastructure` implementa interfaces de `domain`, depende de `application`.
- `presentation` depende de `application`.
- **Ninguna capa importa Prisma directamente excepto `infrastructure/persistence/postgres`**.

---

## 9. Convenciones de código

- TypeScript estricto (`tsconfig.json` ya configurado).
- Prettier + ESLint ya configurados. Correr antes de commitear:
  ```bash
  npm run lint
  npm run format
  ```
- `ValidationPipe` global activo con `whitelist`, `forbidNonWhitelisted` y `transform`.
- No usar `any`. Tipar todo.
- Comentarios solo cuando sea necesario (vertir el "por qué", no el "qué").

---

## 10. Tests

- Unit tests: `*.spec.ts` junto al archivo. Correr con `npm test`.
- E2E tests: carpeta `test/`. Correr con `npm run test:e2e`.
- Cobertura: `npm run test:cov`.

Todo PR con feature nueva debe incluir al menos un test unitario del servicio.

---

## 11. Estado de integraciones

- [x] PostgreSQL (Railway) — operativa
- [x] Prisma 6 — operativa
- [ ] Redis (cache, auditoría, reportes, queries masivas, rate limit, colas)
- [ ] MongoDB
- [ ] GraphQL
- [ ] WebSockets
- [ ] CI/CD en GitHub
- [ ] Branch protection en `main` / `stage`
