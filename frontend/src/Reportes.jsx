
import { useCallback, useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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

const nombreArchivo = (extension, fechaInicio, fechaFin) =>
  `Nova_Salud_Reporte_${fechaInicio}_${fechaFin}.${extension}`

// Estilos para Excel
const estiloTitulo = {
  font: {
    bold: true,
    color: { rgb: 'FFFFFF' },
    sz: 18,
  },
  fill: {
    fgColor: { rgb: '1765AD' },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
  },
}

const estiloSubtitulo = {
  font: {
    bold: true,
    color: { rgb: '183B60' },
    sz: 13,
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
  },
}

const estiloPeriodo = {
  font: {
    italic: true,
    color: { rgb: '64748B' },
    sz: 10,
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
  },
}

const estiloCabecera = {
  font: {
    bold: true,
    color: { rgb: 'FFFFFF' },
    sz: 10,
  },
  fill: {
    fgColor: { rgb: '1765AD' },
  },
  alignment: {
    horizontal: 'center',
    vertical: 'center',
    wrapText: true,
  },
  border: {
    top: { style: 'thin', color: { rgb: 'D5E1EE' } },
    bottom: { style: 'thin', color: { rgb: 'D5E1EE' } },
    left: { style: 'thin', color: { rgb: 'D5E1EE' } },
    right: { style: 'thin', color: { rgb: 'D5E1EE' } },
  },
}

const estiloCelda = {
  font: {
    color: { rgb: '354B62' },
    sz: 10,
  },
  alignment: {
    vertical: 'center',
  },
  border: {
    bottom: { style: 'thin', color: { rgb: 'EAF0F6' } },
  },
}

// Construcción de hojas de Excel
const crearHojaExcel = ({
  titulo,
  periodo,
  encabezados,
  filas,
  anchos,
  formatosMoneda = [],
}) => {
  const cantidadColumnas = encabezados.length

  const datos = [
    ['NOVA SALUD'],
    [titulo],
    [`Periodo: ${formatoFecha(periodo.inicio)} al ${formatoFecha(periodo.fin)}`],
    [],
    encabezados,
    ...(filas.length ? filas : [['Sin registros para este periodo']]),
  ]

  const hoja = XLSX.utils.aoa_to_sheet(datos)

  // Unir celdas del encabezado
  hoja['!merges'] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: cantidadColumnas - 1 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: cantidadColumnas - 1 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: cantidadColumnas - 1 },
    },
  ]

  hoja['!cols'] = anchos.map((wch) => ({ wch }))

  hoja['!rows'] = [
    { hpt: 30 },
    { hpt: 25 },
    { hpt: 22 },
    { hpt: 8 },
    { hpt: 30 },
  ]

  // Estilos del encabezado principal
  hoja.A1.s = estiloTitulo
  hoja.A2.s = estiloSubtitulo
  hoja.A3.s = estiloPeriodo

  // Estilos de las columnas
  for (let columna = 0; columna < cantidadColumnas; columna += 1) {
    const letra = XLSX.utils.encode_col(columna)
    const celdaCabecera = hoja[`${letra}5`]

    if (celdaCabecera) {
      celdaCabecera.s = estiloCabecera
    }
  }

  // Estilos de las filas de datos
  for (let fila = 5; fila < datos.length; fila += 1) {
    for (let columna = 0; columna < cantidadColumnas; columna += 1) {
      const letra = XLSX.utils.encode_col(columna)
      const referencia = `${letra}${fila + 1}`
      const celda = hoja[referencia]

      if (!celda) continue

      celda.s = {
        ...estiloCelda,
        alignment: {
          vertical: 'center',
          horizontal: columna === 0 ? 'left' : 'center',
        },
      }

      // Formato de moneda peruana
      if (formatosMoneda.includes(columna) && typeof celda.v === 'number') {
        celda.z = '"S/" #,##0.00'
        celda.s.alignment = {
          horizontal: 'right',
          vertical: 'center',
        }
      }
    }
  }

  // Filtro de columnas
  if (filas.length) {
    const ultimaColumna = XLSX.utils.encode_col(cantidadColumnas - 1)

    hoja['!autofilter'] = {
      ref: `A5:${ultimaColumna}${datos.length}`,
    }
  }

  return hoja
}

const Reportes = ({ token }) => {
  const [fechaInicio, setFechaInicio] = useState(inicioMes)
  const [fechaFin, setFechaFin] = useState(hoyLocal)
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState('')

  // Consultar información al backend
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

  // Exportar Excel
  const exportarExcel = () => {
    if (!reporte || exportando) return

    setExportando('excel')
    setError('')

    try {
      const libro = XLSX.utils.book_new()
      const periodo = {
        inicio: fechaInicio,
        fin: fechaFin,
      }

      // Hoja 1: Resumen
      const resumen = crearHojaExcel({
        titulo: 'Resumen de ventas',
        periodo,
        encabezados: ['Indicador', 'Resultado'],
        filas: [
          [
            'Ventas realizadas',
            Number(reporte.resumen?.cantidad_ventas || 0),
          ],
          [
            'Total vendido',
            Number(reporte.resumen?.total_ventas || 0),
          ],
          [
            'Ticket promedio',
            Number(reporte.resumen?.ticket_promedio || 0),
          ],
        ],
        anchos: [30, 22],
        formatosMoneda: [1],
      })

      // Corregir formato de la cantidad de ventas
      resumen.B6.z = '0'

      XLSX.utils.book_append_sheet(libro, resumen, 'Resumen')

      // Hoja 2: Ventas por día
      const ventasPorDia = crearHojaExcel({
        titulo: 'Ventas por día',
        periodo,
        encabezados: [
          'Fecha',
          'Cantidad de ventas',
          'Total vendido',
        ],
        filas: (reporte.ventasPorDia || []).map((item) => [
          formatoFecha(item.fecha),
          Number(item.cantidad_ventas || 0),
          Number(item.total_ventas || 0),
        ]),
        anchos: [20, 24, 22],
        formatosMoneda: [2],
      })

      XLSX.utils.book_append_sheet(libro, ventasPorDia, 'Ventas por dia')

      // Hoja 3: Productos más vendidos
      const productos = crearHojaExcel({
        titulo: 'Productos más vendidos',
        periodo,
        encabezados: [
          'Código',
          'Producto',
          'Unidades vendidas',
          'Total vendido',
        ],
        filas: (reporte.productosMasVendidos || []).map((item) => [
          item.codigo || '—',
          item.nombre || '—',
          Number(item.unidades_vendidas || 0),
          Number(item.total_vendido || 0),
        ]),
        anchos: [18, 38, 22, 22],
        formatosMoneda: [3],
      })

      XLSX.utils.book_append_sheet(libro, productos, 'Mas vendidos')

      // Hoja 4: Stock bajo
      const stockBajo = crearHojaExcel({
        titulo: 'Productos con stock bajo',
        periodo,
        encabezados: [
          'Código',
          'Producto',
          'Stock actual',
          'Stock mínimo',
        ],
        filas: (reporte.productosStockBajo || []).map((item) => [
          item.codigo || '—',
          item.nombre || '—',
          Number(item.stock || 0),
          Number(item.stock_minimo || 0),
        ]),
        anchos: [18, 38, 18, 18],
      })

      XLSX.utils.book_append_sheet(libro, stockBajo, 'Stock bajo')

      // Hoja 5: Últimas ventas
      const ultimasVentas = crearHojaExcel({
        titulo: 'Últimas ventas',
        periodo,
        encabezados: [
          'N.º de venta',
          'Vendedor',
          'Fecha',
          'Total',
        ],
        filas: (reporte.ultimasVentas || []).map((venta) => [
          `#${venta.id}`,
          venta.vendedor || '—',
          formatoFecha(venta.fecha),
          Number(venta.total || 0),
        ]),
        anchos: [18, 30, 20, 22],
        formatosMoneda: [3],
      })

      XLSX.utils.book_append_sheet(libro, ultimasVentas, 'Ultimas ventas')

      XLSX.writeFile(
        libro,
        nombreArchivo('xlsx', fechaInicio, fechaFin),
        { compression: true },
      )
    } catch (err) {
      setError(`No se pudo exportar el Excel: ${err.message}`)
    } finally {
      setExportando('')
    }
  }

  // Exportar PDF
  const exportarPDF = () => {
    if (!reporte || exportando) return

    setExportando('pdf')
    setError('')

    try {
      const documento = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const anchoPagina = documento.internal.pageSize.getWidth()
      const margen = 15
      const colorAzul = [23, 101, 173]
      const colorTexto = [49, 75, 98]

      const periodoTexto =
        `${formatoFecha(fechaInicio)} al ${formatoFecha(fechaFin)}`

      documento.setProperties({
        title: 'Reporte de ventas - NOVA SALUD',
        subject: `Reporte del ${periodoTexto}`,
        author: 'NOVA SALUD',
        creator: 'Sistema NOVA SALUD',
      })

      // Encabezado
      documento.setFillColor(...colorAzul)
      documento.roundedRect(
        margen,
        12,
        anchoPagina - margen * 2,
        25,
        3,
        3,
        'F',
      )

      documento.setTextColor(255, 255, 255)
      documento.setFont('helvetica', 'bold')
      documento.setFontSize(19)
      documento.text('NOVA SALUD', anchoPagina / 2, 23, {
        align: 'center',
      })

      documento.setFont('helvetica', 'normal')
      documento.setFontSize(10)
      documento.text('REPORTE DE VENTAS', anchoPagina / 2, 31, {
        align: 'center',
      })

      documento.setTextColor(...colorTexto)
      documento.setFontSize(9)
      documento.text(`Periodo: ${periodoTexto}`, anchoPagina / 2, 44, {
        align: 'center',
      })

      // Resumen general
      documento.setFont('helvetica', 'bold')
      documento.setFontSize(12)
      documento.text('RESUMEN GENERAL', anchoPagina / 2, 55, {
        align: 'center',
      })

      autoTable(documento, {
        startY: 59,
        margin: {
          left: margen,
          right: margen,
        },
        head: [['Indicador', 'Resultado']],
        body: [
          [
            'Ventas realizadas',
            String(Number(reporte.resumen?.cantidad_ventas || 0)),
          ],
          [
            'Total vendido',
            formatoMoneda(reporte.resumen?.total_ventas),
          ],
          [
            'Ticket promedio',
            formatoMoneda(reporte.resumen?.ticket_promedio),
          ],
        ],
        theme: 'grid',
        tableWidth: 'auto',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3,
          textColor: colorTexto,
          lineColor: [225, 234, 244],
          lineWidth: 0.2,
          halign: 'center',
        },
        headStyles: {
          fillColor: colorAzul,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [245, 249, 253],
        },
        columnStyles: {
          0: {
            cellWidth: 90,
            halign: 'left',
          },
          1: {
            halign: 'center',
          },
        },
      })

      // Función para agregar cada tabla al PDF
      const agregarSeccion = (
        titulo,
        encabezados,
        filas,
        mensajeVacio,
      ) => {
        let inicioY = (documento.lastAutoTable?.finalY || 70) + 10

        if (inicioY > 255) {
          documento.addPage()
          inicioY = 20
        }

        documento.setFont('helvetica', 'bold')
        documento.setFontSize(11)
        documento.setTextColor(...colorAzul)

        documento.text(titulo, anchoPagina / 2, inicioY, {
          align: 'center',
        })

        autoTable(documento, {
          startY: inicioY + 4,
          margin: {
            left: margen,
            right: margen,
          },
          head: [encabezados],
          body: filas.length ? filas : [[mensajeVacio]],
          theme: 'grid',
          tableWidth: 'auto',
          styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.5,
            textColor: colorTexto,
            lineColor: [225, 234, 244],
            lineWidth: 0.2,
            halign: 'center',
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: colorAzul,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [245, 249, 253],
          },
          columnStyles: {
            0: {
              halign: 'center',
            },
          },
        })
      }

      // Ventas por día
      agregarSeccion(
        'VENTAS POR DÍA',
        ['Fecha', 'Cantidad de ventas', 'Total vendido'],
        (reporte.ventasPorDia || []).map((item) => [
          formatoFecha(item.fecha),
          String(item.cantidad_ventas ?? 0),
          formatoMoneda(item.total_ventas),
        ]),
        'No hay ventas en este periodo.',
      )

      // Productos más vendidos
      agregarSeccion(
        'PRODUCTOS MÁS VENDIDOS',
        ['Código', 'Producto', 'Unidades', 'Total vendido'],
        (reporte.productosMasVendidos || []).map((item) => [
          item.codigo || '—',
          item.nombre || '—',
          String(item.unidades_vendidas ?? 0),
          formatoMoneda(item.total_vendido),
        ]),
        'Todavía no hay productos vendidos.',
      )

      // Productos con stock bajo
      agregarSeccion(
        'PRODUCTOS CON STOCK BAJO',
        ['Código', 'Producto', 'Stock actual', 'Stock mínimo'],
        (reporte.productosStockBajo || []).map((item) => [
          item.codigo || '—',
          item.nombre || '—',
          String(item.stock ?? 0),
          String(item.stock_minimo ?? 0),
        ]),
        'No hay productos con stock bajo.',
      )

      // Últimas ventas
      agregarSeccion(
        'ÚLTIMAS VENTAS',
        ['N.º de venta', 'Vendedor', 'Fecha', 'Total'],
        (reporte.ultimasVentas || []).map((venta) => [
          `#${venta.id}`,
          venta.vendedor || '—',
          formatoFecha(venta.fecha),
          formatoMoneda(venta.total),
        ]),
        'No hay ventas registradas.',
      )

      // Pie de página y numeración
      const cantidadPaginas = documento.getNumberOfPages()

      for (let pagina = 1; pagina <= cantidadPaginas; pagina += 1) {
        documento.setPage(pagina)

        documento.setDrawColor(220, 230, 240)
        documento.line(
          margen,
          284,
          anchoPagina - margen,
          284,
        )

        documento.setFont('helvetica', 'normal')
        documento.setFontSize(8)
        documento.setTextColor(110, 125, 140)

        documento.text(
          'NOVA SALUD | Reporte generado por el sistema',
          margen,
          290,
        )

        documento.text(
          `Página ${pagina} de ${cantidadPaginas}`,
          anchoPagina - margen,
          290,
          { align: 'right' },
        )
      }

      documento.save(
        nombreArchivo('pdf', fechaInicio, fechaFin),
      )
    } catch (err) {
      setError(`No se pudo exportar el PDF: ${err.message}`)
    } finally {
      setExportando('')
    }
  }

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

      {/* Filtros de fechas */}
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
        <p className="reports-message">
          Cargando información...
        </p>
      )}

      {reporte && (
        <>
          {/* Opciones de exportación */}
          <div className="reports-export">
            <div className="reports-export-text">
              <strong>Descargar reporte</strong>
              <span>
                Exporta la información del periodo seleccionado.
              </span>
            </div>

            <div className="reports-export-actions">
              <button
                type="button"
                className="reports-export-button reports-export-excel"
                onClick={exportarExcel}
                disabled={Boolean(exportando)}
              >
                <span className="reports-export-icon" aria-hidden="true">
                  XLS
                </span>
                {exportando === 'excel'
                  ? 'Preparando Excel...'
                  : 'Exportar Excel'}
              </button>

              <button
                type="button"
                className="reports-export-button reports-export-pdf"
                onClick={exportarPDF}
                disabled={Boolean(exportando)}
              >
                <span className="reports-export-icon" aria-hidden="true">
                  PDF
                </span>
                {exportando === 'pdf'
                  ? 'Preparando PDF...'
                  : 'Exportar PDF'}
              </button>
            </div>
          </div>

          {/* Resumen */}
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

          {/* Ventas por día */}
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

          {/* Productos más vendidos */}
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

          {/* Productos con stock bajo */}
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

          {/* Últimas ventas */}
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
