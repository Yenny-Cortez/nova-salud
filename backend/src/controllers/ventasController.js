
const pool = require('../db');

// Registrar una venta utilizando una transacción.
async function registrar(req, res) {
  const { productos } = req.body || {};

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      mensaje: 'Debe incluir al menos un producto'
    });
  }

  const cantidades = new Map();

  for (const item of productos) {
    const id = Number(item.producto_id);
    const cantidad = Number(item.cantidad);

    if (
      !Number.isInteger(id) || id <= 0 ||
      !Number.isInteger(cantidad) || cantidad <= 0
    ) {
      return res.status(400).json({
        mensaje: 'Producto o cantidad inválidos'
      });
    }

    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // El usuario se obtiene de la autenticación, nunca del formulario.
    const usuarioId = req.usuario.id;
    let total = 0;
    const detalles = [];

    for (const [productoId, cantidad] of cantidades) {
      const resultado = await client.query(
        `SELECT id, nombre, precio, stock
         FROM productos
         WHERE id = $1 AND activo = TRUE
         FOR UPDATE`,
        [productoId]
      );

      if (resultado.rowCount === 0) {
        throw Object.assign(
          new Error(`Producto ${productoId} no encontrado`),
          { status: 404 }
        );
      }

      const producto = resultado.rows[0];

      if (producto.stock < cantidad) {
        throw Object.assign(
          new Error(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
          ),
          { status: 400 }
        );
      }

      const precio = Number(producto.precio);
      const subtotal = Math.round(precio * cantidad * 100) / 100;

      total = Math.round((total + subtotal) * 100) / 100;

      detalles.push({
        producto_id: productoId,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: precio,
        subtotal
      });
    }

    const venta = await client.query(
      `INSERT INTO ventas (usuario_id, total)
       VALUES ($1, $2)
       RETURNING id, usuario_id, total, fecha`,
      [usuarioId, total]
    );

    const ventaId = venta.rows[0].id;

    for (const item of detalles) {
      await client.query(
        `INSERT INTO detalle_ventas
         (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal
        ]
      );

      await client.query(
        `UPDATE productos
         SET stock = stock - $1
         WHERE id = $2`,
        [item.cantidad, item.producto_id]
      );

      await client.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad)
         VALUES ($1, 'salida', $2)`,
        [item.producto_id, item.cantidad]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      venta: {
        ...venta.rows[0],
        total: Number(venta.rows[0].total),
        detalles
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');

    res.status(error.status || 500).json({
      mensaje: error.status
        ? error.message
        : 'Error al registrar la venta'
    });

    if (!error.status) {
      console.error(error);
    }
  } finally {
    client.release();
  }
}

// Administrador: todas las ventas.
// Trabajador: solamente sus propias ventas.
async function listar(req, res) {
  try {
    const esAdmin = req.usuario.rol === 'admin';

    const consulta = esAdmin
      ? `SELECT
           v.id,
           v.usuario_id,
           u.nombre AS vendedor,
           v.total,
           v.fecha
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuario_id
         ORDER BY v.fecha DESC`
      : `SELECT
           v.id,
           v.usuario_id,
           u.nombre AS vendedor,
           v.total,
           v.fecha
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuario_id
         WHERE v.usuario_id = $1
         ORDER BY v.fecha DESC`;

    const parametros = esAdmin ? [] : [req.usuario.id];

    const resultado = await pool.query(consulta, parametros);

    return res.json(resultado.rows);
  } catch (error) {
    console.error('Error al consultar las ventas:', error);

    return res.status(500).json({
      mensaje: 'Error al consultar las ventas'
    });
  }
}

// Consultar una venta.
// El trabajador solamente puede consultar una venta propia.
async function obtener(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'ID de venta inválido'
    });
  }

  try {
    const esAdmin = req.usuario.rol === 'admin';

    const consulta = esAdmin
      ? `SELECT
           v.id,
           v.usuario_id,
           u.nombre AS vendedor,
           v.total,
           v.fecha
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuario_id
         WHERE v.id = $1`
      : `SELECT
           v.id,
           v.usuario_id,
           u.nombre AS vendedor,
           v.total,
           v.fecha
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuario_id
         WHERE v.id = $1
           AND v.usuario_id = $2`;

    const parametros = esAdmin
      ? [id]
      : [id, req.usuario.id];

    const venta = await pool.query(consulta, parametros);

    if (venta.rowCount === 0) {
      return res.status(404).json({
        mensaje: 'Venta no encontrada'
      });
    }

    const detalles = await pool.query(
      `SELECT
         d.producto_id,
         p.nombre,
         d.cantidad,
         d.precio_unitario,
         d.subtotal
       FROM detalle_ventas d
       INNER JOIN productos p ON p.id = d.producto_id
       WHERE d.venta_id = $1`,
      [id]
    );

    return res.json({
      venta: venta.rows[0],
      detalles: detalles.rows
    });
  } catch (error) {
    console.error('Error al consultar el detalle de la venta:', error);

    return res.status(500).json({
      mensaje: 'Error al consultar la venta'
    });
  }
}

module.exports = {
  registrar,
  listar,
  obtener
};
