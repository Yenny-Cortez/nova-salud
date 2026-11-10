const router = require('express').Router();
const productos = require('../controllers/productosController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', productos.listar);
router.get('/:id', productos.obtener);
router.post('/', soloRoles('admin'), productos.crear);
router.put('/:id', soloRoles('admin'), productos.actualizar);
router.delete('/:id', soloRoles('admin'), productos.desactivar);

module.exports = router;