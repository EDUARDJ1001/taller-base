# Plantilla base — gestión de taller automotriz

Sistema web para la gestión administrativa de un taller automotriz, **sin marca**:
el nombre del taller, sus logos, su color y su moneda se definen al instalar, en un
**asistente de bienvenida**, y quedan guardados en la base de datos.

- Backend Node.js + Express, PostgreSQL (`pg`), autenticación JWT.
- Frontend Vite + React.
- Módulos: dashboard, usuarios, clientes, vehículos, visitas, recepción, servicios,
  inventario, facturación, cotizaciones, reportes, panel de mecánico y **configuración**.
- Roles: `Admin`, `Cajero`, `Mecanico`.

Para instalar en la PC de un taller (paso a paso, con servicio de Windows y respaldos),
mira [INSTALL.md](INSTALL.md).

---

## Asistente de bienvenida (primer arranque)

La base de datos arranca **vacía**: sin taller configurado y **sin usuarios**.
Mientras ese sea el caso, la app no muestra el login sino el asistente, que recoge:

1. **Datos del taller** — nombre (obligatorio), eslogan, razón social, RTN/identidad,
   teléfono, WhatsApp, email, dirección, ciudad y país.
2. **Logos y apariencia** — logo de la app, logo para documentos (facturas y
   cotizaciones), icono del navegador, color principal, moneda y formato regional.
3. **Cuenta de administrador** — el primer usuario del sistema.

Al guardar, todo se escribe en una transacción y la sesión del administrador queda
iniciada. El asistente no vuelve a aparecer: a partir de ahí los mismos datos se editan
en el módulo **Configuración** (solo rol `Admin`).

Reglas:

- El asistente está disponible **solo** mientras `configuracion_taller.setup_completado`
  es `false` **y** no hay ningún usuario `Activo`. Si ya hay usuarios, el endpoint
  responde `409` y solo se puede cambiar la configuración con sesión de `Admin`.
- Los logos se suben antes de crear el usuario, así que el endpoint de logos acepta
  peticiones sin token **solo** mientras el asistente está pendiente
  (ver `backend/src/middlewares/setupGuard.js`).

### Dónde vive el branding

| Pieza | Archivo |
|---|---|
| Tabla y fila única de configuración | `backend/db/migrations/010_configuracion_taller.sql` |
| API de configuración y setup | `backend/src/modules/configuracion/` |
| Permiso "sin sesión mientras falta el setup" | `backend/src/middlewares/setupGuard.js` |
| Valores por defecto y helpers del frontend | `frontend/src/config/branding.js` |
| Carga y propagación en la app | `frontend/src/context/BrandingContext.jsx` |
| Asistente | `frontend/src/components/setup/` |
| Pantalla de configuración | `frontend/src/pages/ConfiguracionPage.jsx` |
| Logo de marcador de posición (genérico) | `frontend/src/assets/logo.svg` |

Mientras no haya logo cargado se usa `frontend/src/assets/logo.svg`, un marcador de
posición neutro sin ninguna identidad de empresa. El nombre cae a `Mi Taller`
(`brandingDefaults` en `frontend/src/config/branding.js`).

---

## Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Configura `backend/.env` con las credenciales locales de PostgreSQL antes de iniciar la API.

Ruta de salud:

```text
GET http://localhost:4000/api/health
```

Documentación Swagger:

```text
GET http://localhost:4000/api/docs
GET http://localhost:4000/api/docs.json
```

### Endpoints de configuración

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/api/configuracion/estado` | Público. Dice si falta el asistente y devuelve el branding público. |
| `POST` | `/api/configuracion/setup` | Público **solo** mientras falta el setup. Guarda el taller y crea el primer `Admin`. |
| `GET` | `/api/configuracion` | Cualquier usuario autenticado (facturas, cotizaciones y reportes). |
| `PUT` | `/api/configuracion` | Solo `Admin`. |
| `POST` | `/api/configuracion/logo` | Sin token durante el asistente; después solo `Admin`. `tipo`: `logo`, `documentos`, `icono`. |
| `DELETE` | `/api/configuracion/logo/:tipo` | Sin token durante el asistente; después solo `Admin`. |

## Migraciones

Las migraciones SQL están en `backend/db/migrations` y se aplican **todas, en orden**,
cada vez que se corre el comando (son idempotentes):

```powershell
cd backend
npm run migrate
```

- `000_esquema_base.sql` — esquema completo: tipos, tablas, índices, triggers y vistas.
  Siembra los **roles** (`Admin`, `Cajero`, `Mecanico`) y catálogos genéricos de
  categorías de servicio y de producto. **No siembra usuarios**: el primer `Admin` lo
  crea el asistente de bienvenida.
- `001` a `009` — precios por visita, flujos de trabajo y etapas, notificaciones,
  recepción de vehículo, fotos, facturas e ítems manuales.
- `010_configuracion_taller.sql` — tabla `configuracion_taller` (fila única `id = 1`)
  con el nombre, los datos de contacto, los logos y la bandera `setup_completado`.

Si quieres arrancar **sin catálogos de ejemplo**, borra los bloques `INSERT INTO
categorias_servicio`, `INSERT INTO servicios` y `INSERT INTO categorias_producto` de
`000_esquema_base.sql` (y el bloque de `flujos_trabajo` de `002`) antes de migrar.
Los roles sí son necesarios.

## Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Por defecto consume la API en:

```text
VITE_API_URL=http://IP_DEL_EQUIPO:4000/api
```

Para probar desde móviles o tablets en la misma red, busca la IPv4 del equipo con
`ipconfig` (ej. `192.168.1.50`) y configura:

```text
backend/.env
HOST=0.0.0.0
PORT=4000
CORS_ORIGIN=*

frontend/.env
VITE_API_URL=http://192.168.1.50:4000/api
```

Luego inicia ambos servicios (`npm run dev` en cada carpeta) y abre
`http://192.168.1.50:5173` desde el móvil. Si no carga desde otro equipo, revisa que
Windows Firewall permita los puertos `4000` y `5173` en la red privada.

Estructura principal del frontend:

```text
frontend/src/api          Cliente HTTP
frontend/src/components   Componentes reutilizables (incluye components/setup)
frontend/src/config       Contratos de modulos, formularios y branding
frontend/src/context      Contexto de branding/configuracion
frontend/src/hooks        Carga de datos y catalogos
frontend/src/pages        Pantallas principales
frontend/src/routes       Definicion de modulos/rutas internas
frontend/src/utils        Helpers de sesion y formato
```

## Comandos de la raíz

```powershell
npm run install:all   # dependencias de backend y frontend
npm run build         # compila el frontend a frontend/dist
npm run migrate       # aplica las migraciones
npm run setup         # install:all + build + migrate
npm run start:prod    # compila el frontend y arranca el backend (sirve API + web)
```

## Despliegue en Vercel

El repositorio está listo para desplegarse completo en un solo proyecto de Vercel:

- `frontend/dist` se publica como sitio estático (SPA).
- La API Express corre como Serverless Function desde `api/index.js` y responde en `/api/*`.
- La configuración está en `vercel.json` (instala `backend` y `frontend`, compila el frontend).

Pasos:

1. Importa el repositorio en Vercel con **Root Directory = raíz del repo** (Framework Preset: *Other*).
2. Crea una base PostgreSQL externa (Neon, Supabase o Vercel Postgres desde el Marketplace).
3. En *Storage* conecta un **Blob store** al proyecto (agrega `BLOB_READ_WRITE_TOKEN`
   automáticamente). Sin esto no se pueden guardar las fotos **ni los logos del taller**,
   porque Vercel no tiene disco persistente.
4. Variables de entorno del proyecto:
   - `DATABASE_URL` (cadena de conexión con `sslmode=require`)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `CORS_ORIGIN` (opcional; el frontend y la API comparten dominio)
5. Aplica las migraciones contra la base remota desde tu equipo:

```powershell
cd backend
$env:DATABASE_URL="postgresql://..."; $env:DB_SSL="true"; npm run migrate
```

6. Abre el dominio del proyecto: al estar la base vacía aparece el asistente de bienvenida.

Límites a tener en cuenta: las peticiones tienen un máximo de 4.5 MB (las imágenes se
limitan a 4 MB) y cada petición a la API puede durar hasta 30 s.
