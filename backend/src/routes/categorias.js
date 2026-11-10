const router = require('express').Router();
const { listar, crear } = require('../controllers/categoriasController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', listar);
router.post('/', soloRoles('admin'), crear);

module.exports = router;