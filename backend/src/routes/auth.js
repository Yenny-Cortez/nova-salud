
const router = require('express').Router();

const {
  login,
  perfil,
  registrarUsuario,
} = require('../controllers/authController');

const { verificarToken } = require('../middleware/auth');

// Inicio de sesión
router.post('/login', login);

// Registro público de nuevos trabajadores
router.post('/registro', registrarUsuario);

// Consultar perfil del usuario autenticado
router.get('/perfil', verificarToken, perfil);

module.exports = router;
