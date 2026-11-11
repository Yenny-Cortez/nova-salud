const router = require('express').Router();
const inventario = require('../controllers/inventarioController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/alertas', inventario.alertas);
router.get('/movimientos', soloRoles('admin'), inventario.listarMovimientos);
router.post('/movimientos', soloRoles('admin'), inventario.registrarMovimiento);

module.exports = router;