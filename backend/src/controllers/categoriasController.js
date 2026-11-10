const pool = require('../db');

async function listar(req, res) {
  try {
    const resultado = await pool.query('SELECT id, nombre FROM categorias ORDER BY nombre');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function crear(req, res) {
  const nombre = (req.body && req.body.nombre ? String(req.body.nombre) : '').trim();
  if (!nombre) {
    return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  }
  try {
    const resultado = await pool.query(
      'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre',
      [nombre]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

module.exports = { listar, crear };