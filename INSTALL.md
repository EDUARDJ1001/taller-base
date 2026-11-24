# Guía de instalación — plantilla base de taller

Instalación nueva (base vacía) en la PC del taller. La app corre como **un solo proceso**:
el backend (Node + Express) sirve a la vez el **API** y la **web app compilada** en el puerto **4000**.
El usuario solo abre el navegador en `http://localhost:4000` (o `http://IP-DEL-EQUIPO:4000`
desde otra PC de la red).

El nombre del taller y sus logos **no están en el código**: se definen la primera vez que
se abre la app, en el **asistente de bienvenida**, y se pueden cambiar después en el módulo
**Configuración**.

> En esta guía se asume que el proyecto quedará en `C:\TallerBase`. Ajusta las rutas si usas otra.

---

## 1. Requisitos a instalar en la PC

| Software | Versión | Notas |
|---|---|---|
| **Node.js** | LTS 18 o 20+ | https://nodejs.org — instalar la versión "LTS". |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/windows/ — anota la contraseña del usuario `postgres`. Se instala como servicio de Windows que **arranca solo**. |
| **NSSM** | última | https://nssm.cc — para correr el backend como servicio que inicia con la PC (opcional). |

Verifica que Node quedó instalado:

```powershell
node -v
npm -v
```

---

## 2. Copiar el proyecto

Copia la carpeta del proyecto a `C:\TallerBase`, **sin** estas carpetas (se regeneran):

- `backend/node_modules`
- `frontend/node_modules`
- `frontend/dist`

El archivo `backend/.env` se crea en el paso 4 (no viaja en el repositorio).
En producción el frontend **no** necesita `.env`: ya llama al API por ruta relativa `/api`.

---

## 3. Crear la base de datos (vacía)

La plantilla trae el **esquema completo** en `backend/db/migrations`, así que no hace falta
ningún volcado: basta con crear una base vacía y aplicar las migraciones (paso 5).

En **pgAdmin**:

1. Expande `Servers → PostgreSQL → Databases`.
2. Clic derecho sobre `Databases → Create → Database...`
3. Nómbrala **`taller_base`** (o el nombre que prefieras) y guarda.

Desde la línea de comandos sería:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres taller_base
```

> El nombre debe coincidir con `DB_NAME` del `.env` del paso siguiente.

---

## 4. Configurar `backend/.env`

Crea el archivo `C:\TallerBase\backend\.env` con los valores de **esta** PC
(puedes copiar `backend/.env.example` como punto de partida):

```dotenv
PORT=4000
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taller_base
DB_USER=postgres
DB_PASSWORD=LA_CONTRASEÑA_DE_POSTGRES_DE_ESTA_PC
JWT_SECRET=PON_UNA_CLAVE_LARGA_Y_UNICA_AQUI
JWT_EXPIRES_IN=8h
UPLOAD_DIR=C:\TallerBaseDatos\uploads
CORS_ORIGIN=*
```

Puntos importantes:

- **`DB_PASSWORD`**: la contraseña de PostgreSQL de esta PC (la del paso 1).
- **`JWT_SECRET`**: cámbiala por una clave larga y única. Si la cambias, las sesiones abiertas se invalidan (hay que volver a iniciar sesión).
- **`UPLOAD_DIR`**: ruta donde se guardan las imágenes (fotos de vehículos y visitas, **y los logos del taller**). Se recomienda una carpeta **fuera del proyecto** (ej. `C:\TallerBaseDatos\uploads`) para que sobreviva a actualizaciones y sea fácil de respaldar. La carpeta se crea sola si no existe.

---

## 5. Instalar dependencias, compilar y migrar

Desde la raíz del proyecto, un solo comando hace todo el montaje:

```powershell
cd C:\TallerBase
npm run setup
```

`npm run setup` ejecuta:

1. `install:all` — instala dependencias de backend y frontend.
2. `build` — compila el frontend a `frontend/dist`.
3. `migrate` — aplica todas las migraciones SQL (crea el esquema; es idempotente, se puede repetir).

---

## 6. Primer arranque y asistente de bienvenida

```powershell
cd C:\TallerBase
npm run start:prod
```

Abre en el navegador:

```text
http://localhost:4000
```

Como la base está vacía, la app muestra el **asistente de bienvenida**, que pide:

1. **Datos del taller**: nombre (obligatorio), eslogan, RTN/identidad, teléfono, WhatsApp, email, dirección.
2. **Logos y apariencia**: logo de la app, logo para documentos (facturas y cotizaciones), icono del navegador, color principal, moneda y formato regional.
3. **Cuenta de administrador**: el primer usuario del sistema (nombre, usuario y contraseña).

Al terminar, el sistema queda configurado, el asistente ya no vuelve a aparecer y entras
directamente con la cuenta de administrador que creaste. Desde **Usuarios** creas al resto
del personal (cajeros y mecánicos), y desde **Configuración** cambias en cualquier momento
el nombre, los logos y los datos del taller.

Detén la prueba con `Ctrl + C` antes de pasar al servicio.

---

## 7. Dejarlo como servicio que arranca con la PC (NSSM)

Para que el backend (y por tanto la web app) inicie solo al encender la PC, en segundo plano:

```powershell
# 1. Averigua el nombre exacto del servicio de PostgreSQL
Get-Service *postgres*   # ej: postgresql-x64-16

# 2. Crea la carpeta de logs
New-Item -ItemType Directory -Force "C:\TallerBase\logs"

# 3. Registra el servicio apuntando a node.exe + server.js
nssm install TallerBase "C:\Program Files\nodejs\node.exe" "C:\TallerBase\backend\src\server.js"
nssm set TallerBase AppDirectory "C:\TallerBase\backend"
nssm set TallerBase DisplayName "Gestion de taller"
nssm set TallerBase Description "API + web app del taller"
nssm set TallerBase Start SERVICE_AUTO_START

# 4. Que dependa de PostgreSQL (usa el nombre del paso 1)
nssm set TallerBase DependOnService postgresql-x64-16

# 5. Logs
nssm set TallerBase AppStdout "C:\TallerBase\logs\out.log"
nssm set TallerBase AppStderr "C:\TallerBase\logs\err.log"

# 6. Arrancar
nssm start TallerBase
```

Comandos útiles del servicio:

```powershell
nssm restart TallerBase
nssm stop TallerBase
nssm status TallerBase
nssm edit TallerBase               # editor gráfico
nssm remove TallerBase confirm     # eliminar el servicio
```

> Se apunta directo a `node.exe` (no a `npm`) porque `npm` es un `.cmd` y da problemas como servicio.
> El servicio **solo arranca el backend**, que ya sirve el frontend compilado. No recompila en cada
> arranque (eso lo hiciste en el paso 5).

---

## 8. Firewall (solo si otras PCs/tablets de la red usan la app)

```powershell
New-NetFirewallRule -DisplayName "Taller 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
```

Averigua la IP del equipo servidor con `ipconfig` (IPv4, ej. `192.168.1.50`). Las demás PCs abren:

```text
http://192.168.1.50:4000
```

---

## 9. Acceso directo para el usuario

Crea un acceso directo en el escritorio que abra el navegador en la app, p. ej.:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:4000
```

(`--app=` abre en modo ventana sin barra de direcciones, como una aplicación de escritorio.)

---

## 10. Actualizar a una versión nueva (a futuro)

```powershell
nssm stop TallerBase
# reemplazar los archivos del proyecto (conservando backend/.env y la carpeta UPLOAD_DIR)
cd C:\TallerBase
npm run install:all   # solo si cambiaron dependencias
npm run build         # recompilar frontend
npm run migrate       # aplicar migraciones nuevas
nssm start TallerBase
```

---

## 11. Respaldos (importante)

Respalda **dos cosas juntas**, de forma periódica:

1. **Base de datos**: en pgAdmin, clic derecho sobre `taller_base → Backup...`, guardando el archivo con la fecha en el nombre.
2. **Carpeta de imágenes** (la de `UPLOAD_DIR`):

```powershell
Copy-Item -Recurse "C:\TallerBaseDatos\uploads" "D:\Respaldos\uploads_AAAA-MM-DD"
```

La BD guarda las rutas (incluidas las de los logos); la carpeta guarda los archivos.
Sin las dos, las imágenes no se ven.

---

## 12. Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| El servicio no arranca | Revisa `C:\TallerBase\logs\err.log`. Suele ser `.env` mal configurado o Postgres no listo. |
| `ECONNREFUSED` a la BD | PostgreSQL no está corriendo o `DB_*` del `.env` no coinciden. Verifica `Get-Service *postgres*`. |
| El asistente de bienvenida no aparece | Ya hay un usuario activo o el setup quedó marcado como completo. Inicia sesión y usa **Configuración**. |
| Vuelve a aparecer el asistente | La base se recreó vacía (o se desactivaron todos los usuarios). Vuelve a completarlo. |
| El asistente da error al guardar | Faltan las migraciones: ejecuta `npm run migrate` y recarga la página. |
| La página abre pero no carga datos | El backend no levantó, o el `JWT_SECRET` cambió (vuelve a iniciar sesión). |
| Los logos no se ven | `UPLOAD_DIR` cambió de carpeta y los archivos quedaron en la anterior. |
| No entra desde otra PC | Falta la regla de firewall (paso 8) o usaste `localhost` en vez de la IP del servidor. |
| `pg_dump`/`createdb` no encontrado | Usa la ruta completa según tu versión: `C:\Program Files\PostgreSQL\<versión>\bin\`. |
