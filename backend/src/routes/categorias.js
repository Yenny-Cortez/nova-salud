
const router = require('express').Router();

const {
  listar,
  crear,
  actualizar,
  desactivar,
} = require('../controllers/categoriasController');

const {
  verificarToken,
  soloRoles,
} = require('../middleware/auth');

router.use(verificarToken);

router.get('/', listar);
router.post('/', soloRoles('admin'), crear);
router.put('/:id', soloRoles('admin'), actualizar);
router.delete('/:id', soloRoles('admin'), desactivar);

module.exports = router;