
import { useEffect, useState } from 'react'
import './Ventas.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const formatoMoneda = (valor) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(valor) || 0)

const formatoFecha = (fecha) => {
  if (!fecha) return 'Sin fecha'

  const valor = new Date(fecha)

  if (Number.isNaN(valor.getTime())) return 'Sin fecha'

  return valor.toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function Ventas({ token, onCambio }) {
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [boleta, setBoleta] = useState(null)

  async function consultarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opciones.headers,
      },
    })

    const datos = await respuesta.json().catch(() => ({}))

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error(
        'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.',
      )
    }

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo completar la operación.')
    }

    return datos
  }

  async function cargarDatos() {
    setCargando(true)
    setError('')

    try {
      const [listaProductos, listaVentas] = await Promise.all([
        consultarAPI('/api/productos'),
        consultarAPI('/api/ventas'),
      ])

      setProductos(Array.isArray(listaProductos) ? listaProductos : [])
      setVentas(Array.isArray(listaVentas) ? listaVentas : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarDatos()
    }, 0)

    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const productosFiltrados = productos.filter((producto) => {
    const termino = busqueda.trim().toLowerCase()

    return (
      producto.activo !== false &&
      (
        (producto.nombre || '').toLowerCase().includes(termino) ||
        (producto.codigo || '').toLowerCase().includes(termino)
      )
    )
  })

  const total = carrito.reduce(
    (suma, item) => suma + Number(item.precio) * item.cantidad,
    0,
  )

  function agregarProducto(producto) {
    setError('')
    setMensaje('')

    if (Number(producto.stock) <= 0) {
      setError(`No hay stock disponible de ${producto.nombre}.`)
      return
    }

    const existente = carrito.find((item) => item.id === producto.id)

    if (existente && existente.cantidad >= Number(producto.stock)) {
      setError(`No hay más unidades disponibles de ${producto.nombre}.`)
      return
    }

    if (existente) {
      setCarrito((actual) =>
        actual.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      )
      return
    }

    setCarrito((actual) => [
      ...actual,
      {
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        precio: Number(producto.precio),
        stock: Number(producto.stock),
        cantidad: 1,
      },
    ])
  }

  function cambiarCantidad(productoId, nuevaCantidad) {
    const cantidad = Number(nuevaCantidad)
    const producto = carrito.find((item) => item.id === productoId)

    if (!producto) return

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      quitarProducto(productoId)
      return
    }

    if (cantidad > producto.stock) {
      setError(
        `Solo hay ${producto.stock} unidades disponibles de ${producto.nombre}.`,
      )
      return
    }

    setError('')

    setCarrito((actual) =>
      actual.map((item) =>
        item.id === productoId ? { ...item, cantidad } : item,
      ),
    )
  }

  function quitarProducto(productoId) {
    setCarrito((actual) =>
      actual.filter((item) => item.id !== productoId),
    )
    setError('')
  }

  async function registrarVenta() {
    if (carrito.length === 0) {
      setError('Agrega al menos un producto para registrar la venta.')
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')
    setBoleta(null)

    try {
      const resultado = await consultarAPI('/api/ventas', {
        method: 'POST',
        body: JSON.stringify({
          productos: carrito.map((item) => ({
            producto_id: item.id,
            cantidad: item.cantidad,
          })),
        }),
      })

      setMensaje(
        `¡Venta #${resultado.venta.id} registrada correctamente! Total: ${formatoMoneda(resultado.venta.total)}`,
      )

      setBoleta({
        venta: resultado.venta,
        detalles: resultado.venta.detalles || [],
      })

      setCarrito([])
      setBusqueda('')

      await cargarDatos()

      if (onCambio) {
        await onCambio()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function verDetalle(ventaId) {
    setCargandoDetalle(true)
    setError('')
    setVentaSeleccionada(null)

    try {
      const resultado = await consultarAPI(`/api/ventas/${ventaId}`)
      setVentaSeleccionada(resultado)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoDetalle(false)
    }
  }

  function cerrarDetalle() {
    setVentaSeleccionada(null)
    setCargandoDetalle(false)
  }

  return (
    <section className="ventas-contenedor">
      <header className="ventas-encabezado">
        <div>
          <h2>Gestión de ventas</h2>
          <p>Registra ventas y consulta las operaciones de la botica.</p>
        </div>

        <button
          type="button"
          className="ventas-boton-actualizar"
          onClick={cargarDatos}
          disabled={cargando}
        >
          ↻ {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </header>

      {error && (
        <div className="ventas-mensaje-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="ventas-mensaje-exito" role="status">
          {mensaje}
        </div>
      )}

      <div className="ventas-columnas">
        <article className="ventas-panel">
          <div className="ventas-panel-encabezado">
            <div>
              <h3>Productos disponibles</h3>
              <p>Selecciona los productos que deseas vender.</p>
            </div>
            <span className="ventas-contador">
              {productosFiltrados.length} productos
            </span>
          </div>

          <input
            className="ventas-busqueda"
            type="search"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />

          {cargando ? (
            <p className="ventas-estado">Cargando productos...</p>
          ) : productosFiltrados.length === 0 ? (
            <p className="ventas-estado">
              No se encontraron productos disponibles.
            </p>
          ) : (
            <div className="ventas-lista-productos">
              {productosFiltrados.map((producto) => (
                <div className="ventas-producto" key={producto.id}>
                  <div className="ventas-producto-info">
                    <strong>{producto.nombre}</strong>
                    <span>
                      {producto.codigo} · Stock: {producto.stock}
                    </span>
                    <b>{formatoMoneda(producto.precio)}</b>
                  </div>

                  <button
                    type="button"
                    className="ventas-boton-agregar"
                    onClick={() => agregarProducto(producto)}
                    disabled={Number(producto.stock) <= 0}
                  >
                    {Number(producto.stock) <= 0 ? 'Sin stock' : 'Agregar +'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="ventas-panel ventas-carrito-panel">
          <div className="ventas-panel-encabezado">
            <div>
              <h3>Detalle de venta</h3>
              <p>Productos seleccionados para esta operación.</p>
            </div>
            <span className="ventas-contador">
              {carrito.length} artículos
            </span>
          </div>

          {carrito.length === 0 ? (
            <p className="ventas-estado">
              Aún no has agregado productos a la venta.
            </p>
          ) : (
            <div className="ventas-carrito-lista">
              {carrito.map((item) => (
                <div className="ventas-carrito-item" key={item.id}>
                  <div className="ventas-carrito-info">
                    <strong>{item.nombre}</strong>
                    <span>{formatoMoneda(item.precio)} por unidad</span>
                  </div>

                  <div className="ventas-cantidad">
                    <button
                      type="button"
                      aria-label={`Restar una unidad de ${item.nombre}`}
                      onClick={() =>
                        cambiarCantidad(item.id, item.cantidad - 1)
                      }
                    >
                      −
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${item.nombre}`}
                      onClick={() =>
                        cambiarCantidad(item.id, item.cantidad + 1)
                      }
                      disabled={item.cantidad >= item.stock}
                    >
                      +
                    </button>
                  </div>

                  <strong className="ventas-subtotal">
                    {formatoMoneda(item.precio * item.cantidad)}
                  </strong>

                  <button
                    type="button"
                    className="ventas-quitar"
                    onClick={() => quitarProducto(item.id)}
                    aria-label={`Quitar ${item.nombre} de la venta`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="ventas-total">
            <span>Total de la venta</span>
            <strong>{formatoMoneda(total)}</strong>
          </div>

          <button
            type="button"
            className="ventas-boton-confirmar"
            onClick={registrarVenta}
            disabled={guardando || cargando || carrito.length === 0}
          >
            {guardando ? 'Registrando venta...' : 'Confirmar venta'}
          </button>
        </article>
      </div>

      <article className="ventas-panel ventas-historial">
        <div className="ventas-panel-encabezado">
          <div>
            <h3>Historial de ventas</h3>
            <p>Últimas operaciones registradas.</p>
          </div>
          <span className="ventas-contador">{ventas.length} ventas</span>
        </div>

        {cargando ? (
          <p className="ventas-estado">Cargando historial...</p>
        ) : ventas.length === 0 ? (
          <p className="ventas-estado">
            Todavía no hay ventas registradas.
          </p>
        ) : (
          <div className="ventas-tabla-contenedor">
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th>N.º de venta</th>
                  <th>Vendedor</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>#{venta.id}</td>
                    <td>{venta.vendedor || 'Usuario'}</td>
                    <td>{formatoFecha(venta.fecha)}</td>
                    <td className="ventas-tabla-total">
                      {formatoMoneda(venta.total)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ventas-boton-detalle"
                        onClick={() => verDetalle(venta.id)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {(ventaSeleccionada || cargandoDetalle) && (
        <div className="ventas-modal-fondo">
          <section
            className="ventas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalle-venta"
          >
            <div className="ventas-modal-encabezado">
              <h3 id="titulo-detalle-venta">Detalle de venta</h3>
              <button
                type="button"
                className="ventas-modal-cerrar"
                onClick={cerrarDetalle}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            {cargandoDetalle ? (
              <p className="ventas-estado">Consultando detalle...</p>
            ) : ventaSeleccionada ? (
              <>
                <p>
                  <strong>Venta:</strong> #{ventaSeleccionada.venta.id}
                </p>
                <p>
                  <strong>Vendedor:</strong>{' '}
                  {ventaSeleccionada.venta.vendedor || 'Usuario'}
                </p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {formatoFecha(ventaSeleccionada.venta.fecha)}
                </p>

                <div className="ventas-tabla-contenedor">
                  <table className="ventas-tabla">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaSeleccionada.detalles.map((detalle, indice) => (
                        <tr key={`${detalle.producto_id}-${indice}`}>
                          <td>{detalle.nombre}</td>
                          <td>{detalle.cantidad}</td>
                          <td>
                            {formatoMoneda(detalle.precio_unitario)}
                          </td>
                          <td>{formatoMoneda(detalle.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ventas-total">
                  <span>Total registrado</span>
                  <strong>
                    {formatoMoneda(ventaSeleccionada.venta.total)}
                  </strong>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      {boleta && (
        <div className="ventas-modal-fondo ventas-boleta-fondo">
          <section
            className="ventas-modal ventas-boleta"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-boleta"
          >
            <div className="ventas-boleta-acciones">
              <button
                type="button"
                className="ventas-boleta-imprimir"
                onClick={() => window.print()}
              >
                Imprimir / Guardar PDF
              </button>

              <button
                type="button"
                className="ventas-modal-cerrar"
                onClick={() => setBoleta(null)}
                aria-label="Cerrar boleta"
              >
                ×
              </button>
            </div>

            <header className="ventas-boleta-cabecera">
              <div className="ventas-boleta-logo">N</div>
              <h2 id="titulo-boleta">BOTICA NOVA SALUD</h2>
              <p>Comprobante interno de venta</p>
              <span>Documento de control interno</span>
            </header>

            <div className="ventas-boleta-separador" />

            <div className="ventas-boleta-datos">
              <p>
                <strong>N.º de venta:</strong> #{boleta.venta.id}
              </p>
              <p>
                <strong>Fecha:</strong> {formatoFecha(boleta.venta.fecha)}
              </p>
              <p>
                <strong>Atendido por:</strong>{' '}
                {boleta.venta.vendedor || 'Usuario'}
              </p>
            </div>

            <div className="ventas-boleta-tabla-contenedor">
              <table className="ventas-boleta-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {boleta.detalles.map((detalle, indice) => (
                    <tr key={`${detalle.producto_id}-${indice}`}>
                      <td>{detalle.nombre}</td>
                      <td>{detalle.cantidad}</td>
                      <td>{formatoMoneda(detalle.precio_unitario)}</td>
                      <td>{formatoMoneda(detalle.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ventas-boleta-total">
              <span>TOTAL</span>
              <strong>{formatoMoneda(boleta.venta.total)}</strong>
            </div>

            <footer className="ventas-boleta-pie">
              <p>¡Gracias por tu compra!</p>
              <span>BOTICA NOVA SALUD</span>
              <small>
                Este documento es un comprobante interno y no reemplaza una
                boleta electrónica autorizada por SUNAT.
              </small>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

export default Ventas
