# asogema-back

Backend API desarrollado con NestJS, PostgreSQL, Redis, MongoDB y Clean Architecture.

## Requisitos

- Docker y Docker Compose instalados

## Levantar el proyecto

1. Clona el repo y entra a la carpeta
2. Copia el archivo de variables de entorno:

```bash
   cp .env.example .env
```

3. Si el puerto 3000 ya lo tienes ocupado, cambia `BACKEND_PORT` en tu `.env`
4. Levanta el contenedor:

```bash
   docker compose up --build
```

5. La API queda disponible en `http://localhost:3000`

## Flujo de trabajo (Gitflow)

- `main` → producción
- `develop` → rama de integración, todos los cambios van aquí vía PR
- `stage` → pre-producción

Crea tu rama desde `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-tu-feature
```

Abre un PR hacia `develop` cuando termines. Requiere al menos 1 aprobación.