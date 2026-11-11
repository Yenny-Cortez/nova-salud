
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

async function login(req, res) {
  const { correo, contrasena } = req.body || {};

  if (!correo || !contrasena) {
    return res.status(400).json({
      mensaje: 'Correo y contraseña son obligatorios',
    });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, nombre, correo, contrasena, rol, activo FROM usuarios WHERE correo = $1',
      [correo.trim().toLowerCase()]
    );

    const usuario = resultado.rows[0];

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas',
      });
    }

    const coincide = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!coincide) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas',
      });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: 'Error del servidor',
    });
  }
}

// Registrar nuevos usuarios
async function registrarUsuario(req, res) {
  const { nombre, correo, contrasena } = req.body || {};

  if (
    typeof nombre !== 'string' ||
    typeof correo !== 'string' ||
    typeof contrasena !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Debes completar todos los campos correctamente.',
    });
  }

  const nombreLimpio = nombre.trim();
  const correoLimpio = correo.trim().toLowerCase();

  if (!nombreLimpio || !correoLimpio || !contrasena) {
    return res.status(400).json({
      mensaje: 'Nombre, correo y contraseña son obligatorios.',
    });
  }

  if (nombreLimpio.length > 100) {
    return res.status(400).json({
      mensaje: 'El nombre no puede superar los 100 caracteres.',
    });
  }

  if (correoLimpio.length > 150) {
    return res.status(400).json({
      mensaje: 'El correo no puede superar los 150 caracteres.',
    });
  }

  const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formatoCorreo.test(correoLimpio)) {
    return res.status(400).json({
      mensaje: 'Ingresa un correo electrónico válido.',
    });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({
      mensaje: 'La contraseña debe tener al menos 8 caracteres.',
    });
  }

  try {
    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios
        (nombre, correo, contrasena, rol, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, nombre, correo, rol`,
      [
        nombreLimpio,
        correoLimpio,
        contrasenaEncriptada,
        'vendedor',
      ]
    );

    return res.status(201).json({
      mensaje: 'Registro exitoso. Ya puedes iniciar sesión.',
      usuario: resultado.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'Este correo electrónico ya está registrado.',
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: 'No se pudo completar el registro.',
    });
  }
}

async function perfil(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT id, nombre, correo, rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado',
      });
    }

    res.json({
      usuario: resultado.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: 'Error del servidor',
    });
  }
}

module.exports = {
  login,
  perfil,
  registrarUsuario,
};
