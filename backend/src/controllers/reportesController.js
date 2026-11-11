const pool = require('../db');

// Verificar que la fecha tenga el formato YYYY-MM-DD y sea válida.
function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const fechaComprobada = new Date(`${fecha}T00:00:00.000Z`);

  return !Number.isNaN(fechaComprobada.getTime()) &&
    fechaComprobada.toISOString().slice(0, 10) === fecha;
}

// Construir el filtro de fechas para las consultas de ventas.
function construirFiltro(fechaInicio, fechaFin) {
  const condiciones = [];
  const parametros = [];

  if (fechaInicio) {
    parametros.push(fechaInicio);
    condiciones.push(`v.fecha >= $${parametros.length}::date`);
  }

  if (fechaFin) {
    parametros.push(fechaFin);
    condiciones.push(
      `v.fecha < ($${parametros.length}::date + INTERVAL '1 day')`
    );
  }

  return {
    sql: condiciones.length > 0
      ? `WHERE ${condiciones.join(' AND ')}`
      : '',
    parametros
  };
}

// Consultar todos los reportes.
async function obtenerReportes(req, res) {
  const { fechaInicio, fechaFin } = req.query;

  if (fechaInicio && !fechaValida(fechaInicio)) {
    return res.status(400).json({
      mensaje: 'La fecha de inicio no es válida. Utilice YYYY-MM-DD.'
    });
  }

  if (fechaFin && !fechaValida(fechaFin)) {
    return res.status(400).json({
      mensaje: 'La fecha de fin no es válida. Utilice YYYY-MM-DD.'
    });
  }

  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    return res.status(400).json({
      mensaje: 'La fecha de inicio no puede ser posterior a la fecha de fin.'
    });
  }

  const filtro = construirFiltro(fechaInicio, fechaFin);

  try {
    const [
      resumen,
      ventasPorDia,
      productosMasVendidos,
      productosStockBajo,
      ultimasVentas
    ] = await Promise.all([
      // Resumen general del período.
      pool.query(
        `SELECT
           COUNT(*)::int AS cantidad_ventas,
           COALESCE(SUM(v.total), 0)::float8 AS total_ventas,
           COALESCE(AVG(v.total), 0)::float8 AS ticket_promedio
         FROM ventas v
         ${filtro.sql}`,
        filtro.parametros
      ),

      // Total vendido por día.
      pool.query(
        `SELECT
           TO_CHAR(DATE(v.fecha), 'YYYY-MM-DD') AS fecha,
           COUNT(*)::int AS cantidad_ventas,
           COALESCE(SUM(v.total), 0)::float8 AS total_ventas
         FROM ventas v
         ${filtro.sql}
         GROUP BY DATE(v.fecha)
         ORDER BY DATE(v.fecha) ASC`,
        filtro.parametros
      ),

      // Productos con mayor cantidad de unidades vendidas.
      pool.query(
        `SELECT
           p.id AS producto_id,
           p.codigo,
           p.nombre,
           COALESCE(SUM(d.cantidad), 0)::int AS unidades_vendidas,
           COALESCE(SUM(d.subtotal), 0)::float8 AS total_vendido
         FROM detalle_ventas d
         INNER JOIN ventas v ON v.id = d.venta_id
         INNER JOIN productos p ON p.id = d.producto_id
         ${filtro.sql}
         GROUP BY p.id, p.codigo, p.nombre
         ORDER BY unidades_vendidas DESC, total_vendido DESC
         LIMIT 10`,
        filtro.parametros
      ),

      // Productos activos que necesitan reposición.
      pool.query(
        `SELECT
           id,
           codigo,
           nombre,
           stock,
           stock_minimo
         FROM productos
         WHERE activo = TRUE
           AND stock <= stock_minimo
         ORDER BY stock ASC, nombre ASC`
      ),

      // Últimas ventas del período.
      pool.query(
        `SELECT
           v.id,
           u.nombre AS vendedor,
           v.total::float8 AS total,
           v.fecha
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuario_id
         ${filtro.sql}
         ORDER BY v.fecha DESC
         LIMIT 10`,
        filtro.parametros
      )
    ]);

    res.json({
      filtros: {
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null
      },
      resumen: resumen.rows[0],
      ventasPorDia: ventasPorDia.rows,
      productosMasVendidos: productosMasVendidos.rows,
      productosStockBajo: productosStockBajo.rows,
      ultimasVentas: ultimasVentas.rows
    });
  } catch (error) {
    console.error('Error al generar los reportes:', error);

    res.status(500).json({
      mensaje: 'Error al generar los reportes'
    });
  }
}

module.exports = {
  obtenerReportes
};