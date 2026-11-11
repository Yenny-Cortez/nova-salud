
const jwt = require('jsonwebtoken');
const pool = require('../db');

async function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({
      mensaje: 'Token requerido'
    });
  }

  let datosToken;

  try {
    datosToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token inválido o vencido'
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nombre, correo, rol, activo
       FROM usuarios
       WHERE id = $1`,
      [datosToken.id]
    );

    const usuario = resultado.rows[0];

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        mensaje: 'La cuenta no existe o está desactivada'
      });
    }

    // El rol siempre se obtiene de PostgreSQL, nunca del token.
    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol
    };

    return next();
  } catch (error) {
    console.error('Error al verificar el usuario:', error);

    return res.status(500).json({
      mensaje: 'Error al verificar la autenticación'
    });
  }
}

function soloRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para esta acción'
      });
    }

    return next();
  };
}

module.exports = {
  verificarToken,
  soloRoles
};
