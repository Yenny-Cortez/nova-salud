const router = require('express').Router();
const ventas = require('../controllers/ventasController');
const reportes = require('../controllers/reportesController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/reportes', soloRoles('admin'), reportes.obtenerReportes);
router.get('/', ventas.listar);
router.get('/:id', ventas.obtener);
router.post('/', ventas.registrar);

module.exports = router;