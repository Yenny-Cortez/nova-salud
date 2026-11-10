const pool = require('../db');

// precio como número y fecha como texto AAAA-MM-DD (evita desfases de zona horaria)
const COLUMNAS = `
  p.id, p.codigo, p.nombre, p.descripcion, p.categoria_id,
  c.nombre AS categoria,
  p.precio::float8 AS precio,
  p.stock, p.stock_minimo,
  to_char(p.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
  p.activo
`;

function esEnteroNoNegativo(valor) {
  return Number.isInteger(Number(valor)) && Number(valor) >= 0;
}

function validar(datos) {
  const errores = [];
  if (!datos.codigo || !String(datos.codigo).trim()) errores.push('El código es obligatorio');
  if (!datos.nombre || !String(datos.nombre).trim()) errores.push('El nombre es obligatorio');
  if (datos.precio === undefined || datos.precio === '' || Number.isNaN(Number(datos.precio)) || Number(datos.precio) < 0) {
    errores.push('El precio debe ser un número mayor o igual a 0');
  }
  if (datos.stock !== undefined && !esEnteroNoNegativo(datos.stock)) {
    errores.push('El stock debe ser un entero mayor o igual a 0');
  }
  if (datos.stock_minimo !== undefined && !esEnteroNoNegativo(datos.stock_minimo)) {
    errores.push('El stock mínimo debe ser un entero mayor o igual a 0');
  }
  return errores;
}

function valoresDe(datos) {
  return [
    String(datos.codigo).trim(),
    String(datos.nombre).trim(),
    datos.descripcion || null,
    datos.categoria_id || null,
    Number(datos.precio),
    datos.stock === undefined ? 0 : Number(datos.stock),
    datos.stock_minimo === undefined ? 5 : Number(datos.stock_minimo),
    datos.fecha_vencimiento || null,
  ];
}

async function buscarPorId(id) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = $1`,
    [id]
  );
  return resultado.rows[0];
}

function manejarErrorBD(error, res) {
  if (error.code === '23505') {
    return res.status(409).json({ mensaje: 'Ya existe un producto con ese código' });
  }
  if (error.code === '23503') {
    return res.status(400).json({ mensaje: 'La categoría indicada no existe' });
  }
  console.error(error);
  return res.status(500).json({ mensaje: 'Error del servidor' });
}

async function listar(req, res) {
  const { buscar, categoria, incluirInactivos } = req.query;
  const condiciones = [];
  const valores = [];

  if (incluirInactivos !== 'true') {
    condiciones.push('p.activo = TRUE');
  }
  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(p.nombre ILIKE $${valores.length} OR p.codigo ILIKE $${valores.length})`);
  }
  if (categoria) {
    if (!Number.isInteger(Number(categoria))) {
      return res.status(400).json({ mensaje: 'La categoría debe ser un número' });
    }
    valores.push(Number(categoria));
    condiciones.push(`p.categoria_id = $${valores.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT ${COLUMNAS}
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}
       ORDER BY p.nombre`,
      valores
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function obtener(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ mensaje: 'Id inválido' });
  }
  try {
    const producto = await buscarPorId(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

async function crear(req, res) {
  const datos = req.body || {};
  const errores = validar(datos);
  if (errores.length) {
    return res.status(400).json({ mensaje: errores.join('. ') });
  }
  try {
    const resultado = await pool.query(
      `INSERT INTO productos
        (codigo, nombre, descripcion, categoria_id, precio, stock, stock_minimo, fecha_vencimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      valoresDe(datos)
    );
    const producto = await buscarPorId(resultado.rows[0].id);
    res.status(201).json(producto);
  } catch (error) {
    manejarErrorBD(error, res);
  }
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ mensaje: 'Id inválido' });
  }
  const datos = req.body || {};
  const errores = validar(datos);
  if (errores.length) {
    return res.status(400).json({ mensaje: errores.join('. ') });
  }
  try {
    const resultado = await pool.query(
      `UPDATE productos
       SET codigo = $1, nombre = $2, descripcion = $3, categoria_id = $4,
           precio = $5, stock = $6, stock_minimo = $7, fecha_vencimiento = $8
       WHERE id = $9
       RETURNING id`,
      [...valoresDe(datos), id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    const producto = await buscarPorId(id);
    res.json(producto);
  } catch (error) {
    manejarErrorBD(error, res);
  }
}

async function desactivar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ mensaje: 'Id inválido' });
  }
  try {
    const resultado = await pool.query(
      'UPDATE productos SET activo = FALSE WHERE id = $1 RETURNING id',
      [id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto desactivado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

module.exports = { listar, obtener, crear, actualizar, desactivar };