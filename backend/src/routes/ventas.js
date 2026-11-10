
const router = require('express').Router();

const ventas = require('../controllers/ventasController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', ventas.listar);
router.get('/:id', ventas.obtener);
router.post('/', ventas.registrar);

module.exports = router;
