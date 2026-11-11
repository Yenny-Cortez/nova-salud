const router = require('express').Router();

const reportes = require('../controllers/reportesController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', reportes.obtenerReportes);

module.exports = router;