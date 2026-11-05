const router = require('express').Router();
const { login, perfil } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/perfil', verificarToken, perfil);

module.exports = router;