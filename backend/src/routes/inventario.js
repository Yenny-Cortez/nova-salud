
const router = require('express').Router();

const inventario = require('../controllers/inventarioController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

// Consultar productos con stock bajo
router.get('/alertas', inventario.alertas);

// Consultar historial de movimientos
router.get('/movimientos', inventario.listarMovimientos);

// Registrar entradas y salidas: solo administrador
router.post(
  '/movimientos',
  soloRoles('admin'),
  inventario.registrarMovimiento
);

module.exports = router;
