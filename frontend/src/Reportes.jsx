
import { useCallback, useEffect, useState } from 'react'
import './Reportes.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const hoyLocal = () => {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

const inicioMes = () => {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')

  return `${anio}-${mes}-01`
}

const formatoMoneda = (valor) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(valor || 0))

const formatoFecha = (valor) => {
  if (!valor) return '—'

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(valor))
    ? new Date(`${valor}T12:00:00`)
    : new Date(valor)

  if (Number.isNaN(fecha.getTime())) return '—'

  return fecha.toLocaleDateString('es-PE')
}

const Reportes = ({ token }) => {
  const [fechaInicio, setFechaInicio] = useState(inicioMes)
  const [fechaFin, setFechaFin] = useState(hoyLocal)
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const consultarReportes = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona ambas fechas para generar el reporte.')
      return
    }

    if (fechaInicio > fechaFin) {
      setError('La fecha inicial no puede ser posterior a la fecha final.')
      return
    }

    setCargando(true)
    setError('')

    try {
      const parametros = new URLSearchParams({
        fechaInicio,
        fechaFin,
      })

      const respuesta = await fetch(
        `${API_URL}/api/ventas/reportes?${parametros.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      const datos = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            datos.error ||
            'No se pudo obtener el reporte.',
        )
      }

      setReporte(datos)
    } catch (err) {
      setError(
        err.message || 'Ocurrió un error al cargar los reportes.',
      )
      setReporte(null)
    } finally {
      setCargando(false)
    }
  }, [fechaInicio, fechaFin, token])

  useEffect(() => {
    const temporizador = setTimeout(() => {
      consultarReportes()
    }, 0)

    return () => clearTimeout(temporizador)
  }, [consultarReportes])

  return (
    <section className="reports-container">
      <div className="reports-heading">
        <div>
          <h2>Reportes de ventas</h2>
          <p>
            Consulta el rendimiento de la botica y el estado del inventario.
          </p>
        </div>
      </div>

      <div className="reports-filters">
        <div className="reports-field">
          <label htmlFor="fechaInicio">Desde</label>
          <input
            id="fechaInicio"
            type="date"
            value={fechaInicio}
            max={hoyLocal()}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="reports-field">
          <label htmlFor="fechaFin">Hasta</label>
          <input
            id="fechaFin"
            type="date"
            value={fechaFin}
            min={fechaInicio}
            max={hoyLocal()}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="reports-button"
          onClick={consultarReportes}
          disabled={cargando}
        >
          {cargando ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>

      {error && (
        <div className="reports-error" role="alert">
          {error}
        </div>
      )}

      {cargando && !reporte && (
        <p className="reports-message">Cargando información...</p>
      )}

      {reporte && (
        <>
          <div className="reports-summary">
            <article className="reports-summary-card">
              <span>Ventas realizadas</span>
              <strong>
                {Number(reporte.resumen?.cantidad_ventas || 0)}
              </strong>
            </article>

            <article className="reports-summary-card">
              <span>Total vendido</span>
              <strong>
                {formatoMoneda(reporte.resumen?.total_ventas)}
              </strong>
            </article>

            <article className="reports-summary-card">
              <span>Ticket promedio</span>
              <strong>
                {formatoMoneda(reporte.resumen?.ticket_promedio)}
              </strong>
            </article>
          </div>

          <section className="reports-panel">
            <h3>Ventas por día</h3>

            {reporte.ventasPorDia?.length ? (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cantidad de ventas</th>
                      <th>Total vendido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.ventasPorDia.map((item) => (
                      <tr key={item.fecha}>
                        <td>{formatoFecha(item.fecha)}</td>
                        <td>{item.cantidad_ventas}</td>
                        <td>{formatoMoneda(item.total_ventas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reports-empty">
                No hay ventas en este periodo.
              </p>
            )}
          </section>

          <section className="reports-panel">
            <h3>Productos más vendidos</h3>

            {reporte.productosMasVendidos?.length ? (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Unidades vendidas</th>
                      <th>Total vendido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productosMasVendidos.map((item) => (
                      <tr key={item.producto_id}>
                        <td>{item.codigo}</td>
                        <td>{item.nombre}</td>
                        <td>{item.unidades_vendidas}</td>
                        <td>{formatoMoneda(item.total_vendido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reports-empty">
                Todavía no hay productos vendidos en este periodo.
              </p>
            )}
          </section>

          <section className="reports-panel">
            <h3>Productos con stock bajo</h3>

            {reporte.productosStockBajo?.length ? (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Stock actual</th>
                      <th>Stock mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.productosStockBajo.map((item) => (
                      <tr key={item.id}>
                        <td>{item.codigo}</td>
                        <td>{item.nombre}</td>
                        <td>
                          <span className="reports-stock-warning">
                            {item.stock}
                          </span>
                        </td>
                        <td>{item.stock_minimo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reports-empty">
                No hay productos con stock bajo.
              </p>
            )}
          </section>

          <section className="reports-panel">
            <h3>Últimas ventas</h3>

            {reporte.ultimasVentas?.length ? (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>N.º de venta</th>
                      <th>Vendedor</th>
                      <th>Fecha</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.ultimasVentas.map((venta) => (
                      <tr key={venta.id}>
                        <td>#{venta.id}</td>
                        <td>{venta.vendedor || '—'}</td>
                        <td>{formatoFecha(venta.fecha)}</td>
                        <td>{formatoMoneda(venta.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reports-empty">
                No hay ventas registradas.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default Reportes
