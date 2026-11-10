
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const inventarioRoutes = require('./routes/inventario');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Bienvenido a la API de Nova Salud',
    estado: 'activo',
    version: '1.0.0'
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventario', inventarioRoutes);

app.use((req, res) => {
  res.status(404).json({
    mensaje: 'Ruta no encontrada',
    ruta: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.message);

  res.status(err.status || 500).json({
    mensaje: err.status && err.status < 500
      ? err.message
      : 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Nova Salud activa en el puerto ${PORT}`);
});
