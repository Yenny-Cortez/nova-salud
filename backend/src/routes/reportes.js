const router = require('express').Router();
const reportes = require('../controllers/reportesController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', soloRoles('admin'), reportes.obtenerReportes);

module.exports = router;