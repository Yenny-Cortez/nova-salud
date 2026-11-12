# Procedimiento de Despliegue - Botica Nova Salud

## 1. Requisitos Previos
- Cuenta activa en Render y Neon.tech.
- Repositorio clonado en tu cuenta personal de GitHub.

## 2. Configuración de la Base de Datos (Neon)
1. Crear un nuevo proyecto en Neon PostgreSQL.
2. Copiar la cadena de conexión (Connection String) con SSL habilitado.
3. Ejecutar el script SQL inicial para poblar las tablas (`usuarios`, `productos`, `ventas`).

## 3. Despliegue del Backend en Render
1. Crear un nuevo Web Service en Render conectándolo a tu repositorio.
2. **Configuración del servicio:**
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. **Variables de Entorno:**
   - `PORT=4000`
   - `DATABASE_URL=` [Tu URL de conexión de Neon]

## 4. Despliegue del Frontend en Render
1. Crear un nuevo Static Site en Render conectado al mismo repositorio.
2. **Configuración del sitio:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
3. **Variables de Entorno:**
   - `VITE_API_URL=` [La URL pública del Backend desplegado]

## 5. Posibles Problemas y Soluciones
- **Error de CORS:** Verificar que el backend permita peticiones del dominio frontend en Render.
- **Conexión rechazada:** Comprobar que la cadena de conexión incluya `?sslmode=require`.
