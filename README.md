# Numeros Boca Juniors - Portal de Transparencia

**Los datos que todo socio de Boca Juniors tiene que saber.**

Portal de datos abiertos del Club Atletico Boca Juniors (Argentina). Transparencia economica, contractual y deportiva.

Basado en [Numeros Rojos](https://github.com/glesende/numeros-rojos) de Independiente de Avellaneda.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Backend](https://img.shields.io/badge/Backend-Lumen%20PHP%208.2-orange)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20+%20Vite-blue)
![Docker](https://img.shields.io/badge/Infra-Docker-2496ED)

---

## Stack

| Capa       | Tecnologia                     |
|------------|--------------------------------|
| Backend    | Lumen (PHP 8.2)               |
| Base datos | MySQL 8.0                      |
| Cache      | Redis 7                        |
| Frontend   | React 18 + Vite 5              |
| Estilos    | TailwindCSS 3.4                |
| Auth admin | JWT (tymon/jwt-auth)           |
| Infra      | Docker + docker compose        |

---

## Estructura del proyecto

```
numeros-bocajuniors/
├── backend/                  # API Lumen
│   ├── app/
│   │   ├── Console/Commands/ # Comandos (export CSV)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   └── Middleware/
│   │   ├── Models/           # EconomyRecord, Contract, User
│   │   └── Providers/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
├── frontend/                 # React + Vite
│   └── src/
│       ├── api/              # Axios client + endpoints
│       ├── components/       # UI components
│       ├── context/          # AuthContext
│       ├── hooks/            # useFilters
│       └── pages/            # Vistas
├── docker/
│   ├── nginx/
│   ├── mysql/
│   ├── php/
│   └── frontend/
├── docker compose.yml
├── Makefile
└── .env.example
```

---

## Inicio rapido (Windows)

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- [Git](https://git-scm.com/) instalado

### 1. Clonar y configurar

```powershell
git clone https://github.com/lucascapocasa1/Numeros-BocaJuniors.git
cd Numeros-BocaJuniors
copy .env.example .env
copy backend\.env.example backend\.env
```

### 2. Levantar el entorno

```powershell
docker compose build
docker compose up -d
```

### 3. Instalar dependencias

```powershell
docker compose exec frontend npm install
docker compose exec api composer install
```

### 4. Migrar y seedear

```powershell
docker compose exec api php artisan migrate:fresh --seed
```

### 5. Acceder

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173         |
| API       | http://localhost:8080/api/v1  |
| API root  | http://localhost:8080         |

### Credenciales admin por defecto

```
Email:    admin@numerosbocajuniors.ar
Password: password
```

---

## Dónde cargar tus fuentes

Los seeders vienen con **plantillas de ejemplo**. Reemplazalos con datos reales en:

| Archivo | Sección | Fuente esperada |
| --- | --- | --- |
| `backend/database/seeders/EconomyRecordSeeder.php` | Compromisos económicos (cobros/pagos) | Link web o de X por cada registro, en el campo `links` |
| `backend/database/seeders/ContractSeeder.php` | Contratos del plantel actual | Link web (Transfermarkt, prensa) o de X, en `links` |
| `backend/database/seeders/RightSeeder.php` | Derechos económicos sobre jugadores vendidos | Link web o de X, en `links` |
| `backend/database/seeders/BalanceSeeder.php` | Balances oficiales | Subí el PDF real del balance desde `/admin/balances` |

Formato del campo `links`:

```php
'links' => [
    ['url' => 'https://ejemplo.com/nota-o-comunicado', 'official' => false],
    ['url' => 'https://x.com/BocaJrsOficial/status/1234567890', 'official' => true],
],
```

`official => true` solo si la fuente es el propio club. Podés cargar datos editando los seeders o desde el panel admin (`/admin`).

---

## Comandos utiles (PowerShell)

```powershell
docker compose up -d              # Levantar contenedores
docker compose down               # Detener contenedores
docker compose build              # Rebuild contenedores
docker compose logs -f            # Ver logs
docker compose exec api php artisan migrate  # Migrar
docker compose exec api php artisan db:seed  # Seedear
docker compose exec api php artisan migrate:fresh --seed  # Reset completo
docker compose exec mysql mysql -u app -psecret numeros_bocajuniors  # MySQL CLI
```

---

## API Endpoints

### Publicos

| Metodo | Ruta                          | Descripcion                    |
|--------|-------------------------------|--------------------------------|
| GET    | /api/v1/economy               | Listar registros economicos    |
| GET    | /api/v1/economy/{id}          | Detalle de registro            |
| GET    | /api/v1/contracts             | Listar contratos               |
| GET    | /api/v1/contracts/{id}        | Detalle de contrato            |
| GET    | /api/v1/rights                | Derechos economicos            |
| GET    | /api/v1/balances              | Balances oficiales             |
| GET    | /api/v1/elections             | Elecciones                     |

### Filtros disponibles (economy)

- `type` - cobro | pago
- `official` - 1 | 0
- `date_from` - YYYY-MM-DD
- `date_to` - YYYY-MM-DD
- `sort_dir` - asc | desc
- `page` - numero de pagina
- `per_page` - registros por pagina (max 100)

### Admin (requiere JWT)

| Metodo | Ruta                              | Descripcion                |
|--------|-----------------------------------|----------------------------|
| POST   | /api/v1/auth/login                | Login (devuelve JWT)       |
| GET    | /api/v1/admin/me                  | Usuario actual             |
| POST   | /api/v1/admin/auth/refresh        | Refrescar token            |
| POST   | /api/v1/admin/auth/logout         | Cerrar sesion              |
| POST   | /api/v1/admin/economy             | Crear registro economico   |
| PUT    | /api/v1/admin/economy/{id}        | Actualizar registro        |
| DELETE | /api/v1/admin/economy/{id}        | Eliminar registro          |
| POST   | /api/v1/admin/contracts           | Crear contrato             |
| PUT    | /api/v1/admin/contracts/{id}      | Actualizar contrato        |
| DELETE | /api/v1/admin/contracts/{id}      | Eliminar contrato          |
| POST   | /api/v1/admin/balances            | Crear balance              |
| PUT    | /api/v1/admin/balances/{id}       | Actualizar balance         |
| DELETE | /api/v1/admin/balances/{id}       | Eliminar balance           |

---

## Modelo de datos

### economy_records

| Campo            | Tipo                       |
|------------------|----------------------------|
| id               | bigint (PK)                |
| description      | text                       |
| type             | enum: cobro, pago          |
| amount           | decimal(15,2)              |
| currency         | enum: ARS, USD, EUR       |
| record_date      | date (nullable)            |
| official         | boolean                    |
| links            | json (nullable)            |
| entity           | varchar (nullable)         |
| comments         | text (nullable)            |
| created_at       | timestamp                  |
| updated_at       | timestamp                  |

### contracts

| Campo                | Tipo                       |
|----------------------|----------------------------|
| id                   | bigint (PK)                |
| external_id          | varchar(255) nullable       |
| full_name            | varchar(255)               |
| expiration_date      | date                       |
| club_pass_percentage | decimal(5,2)               |
| estimated_salary     | decimal(15,2) nullable     |
| currency             | enum: ARS, USD, EUR (nullable)  |
| official             | boolean                    |
| clauses              | json (nullable)            |
| links                | json (nullable)            |
| loan                 | json (nullable)            |
| signing_date         | date (nullable)            |
| termination_date     | date (nullable)            |
| created_at           | timestamp                  |
| updated_at           | timestamp                  |

---

## Preparado para el futuro

- **Historial de cambios:** Estructura preparada para agregar tabla de auditorias (model events)
- **Exportacion CSV:** Comando `php artisan export:csv {table}` implementado
- **Nuevas secciones:** Arquitectura modular para agregar nuevos modelos y controladores

---

## Contribuir

Las contribuciones son bienvenidas. Leé [CONTRIBUTING.md](CONTRIBUTING.md) para saber cómo empezar.

Para reportar errores o sugerir mejoras, usá los [Issues de GitHub](https://github.com/lucascapocasa1/Numeros-BocaJuniors/issues).

---

## Licencia

MIT License. Ver [LICENSE](LICENSE) para mas detalles.
