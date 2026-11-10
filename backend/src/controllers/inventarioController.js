
const pool = require('../db');

// Consultar productos con stock bajo
async function alertas(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.stock,
        p.stock_minimo,
        c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = TRUE
        AND p.stock <= p.stock_minimo
      ORDER BY p.stock ASC, p.nombre ASC
    `);

    res.json({
      cantidad: resultado.rowCount,
      productos: resultado.rows
    });
  } catch (error) {
    console.error('Error al consultar alertas:', error);
    res.status(500).json({
      mensaje: 'Error al consultar las alertas de stock'
    });
  }
}

// Consultar historial de movimientos
async function listarMovimientos(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT
        m.id,
        m.producto_id,
        p.codigo,
        p.nombre AS producto,
        m.tipo,
        m.cantidad,
        m.fecha
      FROM movimientos_inventario m
      INNER JOIN productos p ON p.id = m.producto_id
      ORDER BY m.fecha DESC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al consultar movimientos:', error);
    res.status(500).json({
      mensaje: 'Error al consultar los movimientos de inventario'
    });
  }
}

// Registrar entrada o salida manual de inventario
async function registrarMovimiento(req, res) {
  const productoId = Number(req.body.producto_id);
  const cantidad = Number(req.body.cantidad);
  const tipo = String(req.body.tipo || '').trim().toLowerCase();

  if (!Number.isInteger(productoId) || productoId <= 0) {
    return res.status(400).json({
      mensaje: 'El ID del producto no es válido'
    });
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      mensaje: 'La cantidad debe ser un entero mayor que cero'
    });
  }

  if (!['entrada', 'salida'].includes(tipo)) {
    return res.status(400).json({
      mensaje: 'El tipo debe ser entrada o salida'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      `SELECT id, nombre, stock
       FROM productos
       WHERE id = $1 AND activo = TRUE
       FOR UPDATE`,
      [productoId]
    );

    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        mensaje: 'Producto no encontrado o inactivo'
      });
    }

    const producto = resultado.rows[0];

    if (tipo === 'salida' && producto.stock < cantidad) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}`
      });
    }

    // Calculamos el cambio de stock en JavaScript.
    // Entrada suma; salida resta.
    const variacion = tipo === 'entrada'
      ? cantidad
      : -cantidad;

    const actualizacion = await client.query(
      `UPDATE productos
       SET stock = stock + $1
       WHERE id = $2
       RETURNING id, nombre, stock, stock_minimo`,
      [variacion, productoId]
    );

    const movimiento = await client.query(
      `INSERT INTO movimientos_inventario
       (producto_id, tipo, cantidad)
       VALUES ($1, $2, $3)
       RETURNING id, producto_id, tipo, cantidad, fecha`,
      [productoId, tipo, cantidad]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Movimiento registrado correctamente',
      movimiento: movimiento.rows[0],
      producto: actualizacion.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error al registrar movimiento:', error);

    res.status(500).json({
      mensaje: 'Error al registrar el movimiento de inventario'
    });

  } finally {
    client.release();
  }
}

module.exports = {
  alertas,
  listarMovimientos,
  registrarMovimiento
};
