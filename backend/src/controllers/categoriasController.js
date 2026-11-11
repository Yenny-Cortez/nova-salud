
const pool = require('../db');

async function listar(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, activo
       FROM categorias
       WHERE activo = TRUE
       ORDER BY nombre`
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function crear(req, res) {
  const nombre = (
    req.body && req.body.nombre ? String(req.body.nombre) : ''
  ).trim();

  if (!nombre) {
    return res.status(400).json({
      mensaje: 'El nombre es obligatorio',
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO categorias (nombre)
       VALUES ($1)
       RETURNING id, nombre, activo`,
      [nombre]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'Ya existe una categoría con ese nombre',
      });
    }

    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function actualizar(req, res) {
  const { id } = req.params;

  const nombre = (
    req.body && req.body.nombre ? String(req.body.nombre) : ''
  ).trim();

  if (!nombre) {
    return res.status(400).json({
      mensaje: 'El nombre es obligatorio',
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE categorias
       SET nombre = $1
       WHERE id = $2 AND activo = TRUE
       RETURNING id, nombre, activo`,
      [nombre, id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        mensaje: 'Categoría no encontrada o inactiva',
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'Ya existe una categoría con ese nombre',
      });
    }

    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function desactivar(req, res) {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `UPDATE categorias
       SET activo = FALSE
       WHERE id = $1 AND activo = TRUE
       RETURNING id, nombre, activo`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        mensaje: 'Categoría no encontrada o ya está inactiva',
      });
    }

    res.json({
      mensaje: 'Categoría desactivada correctamente',
      categoria: resultado.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
  desactivar,
};