# Botica Nova Salud – Backend

## 1. Descripción del proyecto

El backend de **Botica Nova Salud** es una API REST desarrollada con Node.js y Express, conectada a una base de datos PostgreSQL. Su finalidad es administrar las operaciones principales de una botica, permitiendo gestionar usuarios, productos, categorías, ventas y movimientos de inventario.

La API proporciona los servicios necesarios para que el frontend pueda consultar y registrar información de manera segura y organizada.

## 2. Tecnologías utilizadas

- **Node.js:** entorno de ejecución de JavaScript.
- **Express:** framework para desarrollar la API REST.
- **PostgreSQL:** sistema de gestión de base de datos.
- **JWT:** autenticación mediante tokens.
- **bcryptjs:** protección de contraseñas mediante hash.
- **CORS:** configuración del acceso desde el frontend.
- **dotenv:** administración de variables de entorno.
- **Nodemon:** reinicio automático del servidor durante el desarrollo.

## 3. Funcionalidades implementadas

### Autenticación y usuarios
- Inicio de sesión mediante correo electrónico y contraseña.
- Generación y validación de tokens JWT.
- Middleware para proteger las rutas.
- Control de acceso según roles de usuario.

### Gestión de categorías
- Consulta de categorías.
- Registro de nuevas categorías, restringido al administrador.

### Gestión de productos
- Consulta del listado de productos.
- Consulta de productos por identificador.
- Registro y actualización de productos.
- Desactivación de productos.
- Administración del stock y stock mínimo.

### Gestión de ventas
- Registro de ventas.
- Consulta del historial de ventas.
- Consulta de ventas por identificador.
- Actualización automática del stock al registrar una venta.
- Registro de movimientos de salida relacionados con las ventas.

### Gestión de inventario
- Consulta de productos con stock bajo o igual al mínimo establecido.
- Registro de entradas y salidas manuales de inventario.
- Consulta del historial de movimientos.
- Validación para evitar salidas superiores al stock disponible.
- Registro de movimientos y actualización de existencias mediante transacciones.

## 4. Seguridad

El backend utiliza autenticación JWT para proteger las rutas que requieren un usuario autorizado.

Además, implementa:
- Validación de datos recibidos.
- Restricción de operaciones administrativas según el rol.
- Contraseñas almacenadas mediante hash.
- Consultas SQL parametrizadas.
- Transacciones para operaciones que modifican las existencias y las ventas.
- Variables de entorno para proteger la configuración.

## 5. Estructura del backend

```text
backend/
├── database/
│   ├── schema.sql
│   └── seed.sql
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── db.js
│   └── index.js
├── .env.example
└── package.json
```

## 6. Principales endpoints de la API

| Método | Endpoint | Funcionalidad |
|---|---|---|
| GET | `/` | Información y estado de la API |
| GET | `/api/health` | Verificación del servidor y la base de datos |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/categorias` | Consultar categorías |
| POST | `/api/categorias` | Registrar categoría |
| GET | `/api/productos` | Consultar productos |
| GET | `/api/productos/:id` | Consultar producto por ID |
| POST | `/api/productos` | Registrar producto |
| PUT | `/api/productos/:id` | Actualizar producto |
| DELETE | `/api/productos/:id` | Desactivar producto |
| GET | `/api/ventas` | Consultar ventas |
| GET | `/api/ventas/:id` | Consultar una venta |
| POST | `/api/ventas` | Registrar venta |
| GET | `/api/inventario/alertas` | Consultar alertas de stock |
| GET | `/api/inventario/movimientos` | Consultar movimientos |
| POST | `/api/inventario/movimientos` | Registrar entrada o salida |

Las rutas protegidas requieren autenticación mediante JWT. Las operaciones administrativas están restringidas al rol correspondiente.

## 7. Configuración e instalación

### Requisitos
- Node.js.
- PostgreSQL.
- Git.
- Un cliente para realizar solicitudes HTTP, como Postman o PowerShell.

### Instalación

Ingresar a la carpeta del backend:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

Crear el archivo `.env` tomando como referencia `.env.example` y configurar las variables necesarias:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:clave@localhost:5432/nova_salud
DB_SSL=false
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=colocar_un_secreto_seguro
```

Crear la base de datos PostgreSQL y ejecutar los scripts SQL disponibles en la carpeta `database`, en el orden correspondiente.

Iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

La API estará disponible localmente en:

`http://localhost:3000`

## 8. Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de ejecución del servidor |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `DB_SSL` | Habilita o deshabilita SSL para la conexión |
| `CORS_ORIGIN` | Origen u orígenes autorizados para el frontend |
| `JWT_SECRET` | Secreto utilizado para firmar los tokens JWT |

**Importante:** el archivo `.env` contiene información privada y no debe subirse a GitHub. Para compartir la configuración se utiliza `.env.example`, sin contraseñas ni secretos reales.

## 9. Pruebas realizadas

Durante las pruebas locales se verificaron las siguientes operaciones:

- Inicio y respuesta de la API.
- Conexión con PostgreSQL mediante el endpoint de salud.
- Inicio de sesión y generación de token JWT.
- Consulta de alertas de stock bajo.
- Registro de entradas de inventario.
- Consulta del historial de movimientos.
- Registro de ventas.
- Descuento automático de stock después de una venta.
- Validación del stock actualizado.

Los resultados confirmaron el funcionamiento local de las principales operaciones del backend.

## 10. Estado del desarrollo

El backend cuenta con las funcionalidades principales de autenticación, gestión de productos y categorías, ventas e inventario. Se encuentra preparado para continuar con la integración del frontend y las siguientes etapas de despliegue.

**Proyecto académico:** Botica Nova Salud  
**Tecnología backend:** Node.js, Express y PostgreSQL.