
import { useEffect, useState } from 'react'
import './Productos.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const formularioInicial = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria_id: '',
  precio: '',
  stock: 0,
  stock_minimo: 5,
  fecha_vencimiento: '',
}

const moneda = (valor) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(valor) || 0)

async function peticion(ruta, token, metodo = 'GET', cuerpo = null) {
  const opciones = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  if (cuerpo) opciones.body = JSON.stringify(cuerpo)

  const respuesta = await fetch(`${API_URL}${ruta}`, opciones)
  const datos = await respuesta.json()

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo completar la operación')
  }

  return datos
}

export default function Productos({ token, categorias, esAdmin }) {
  const [productos, setProductos] = useState([])
  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [guardando, setGuardando] = useState(false)

  async function cargarProductos() {
    try {
      setCargando(true)
      setError('')

      const parametros = new URLSearchParams()
      if (buscar.trim()) parametros.set('buscar', buscar.trim())
      if (categoria) parametros.set('categoria', categoria)

      const consulta = parametros.toString()
      const resultado = await peticion(
        `/api/productos${consulta ? `?${consulta}` : ''}`,
        token,
      )

      setProductos(Array.isArray(resultado) ? resultado : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarProductos()
    }, 0)

    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, buscar, categoria])

  function abrirNuevo() {
    setProductoEditando(null)
    setFormulario(formularioInicial)
    setMensaje('')
    setError('')
    setMostrarFormulario(true)
  }

  function abrirEdicion(producto) {
    setProductoEditando(producto)
    setFormulario({
      codigo: producto.codigo || '',
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      categoria_id: producto.categoria_id || '',
      precio: producto.precio ?? '',
      stock: producto.stock ?? 0,
      stock_minimo: producto.stock_minimo ?? 5,
      fecha_vencimiento: producto.fecha_vencimiento || '',
    })
    setMensaje('')
    setError('')
    setMostrarFormulario(true)
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  async function guardarProducto(evento) {
    evento.preventDefault()
    setError('')
    setMensaje('')

    const datos = {
      ...formulario,
      categoria_id: formulario.categoria_id || null,
      precio: Number(formulario.precio),
      stock: Number(formulario.stock),
      stock_minimo: Number(formulario.stock_minimo),
      fecha_vencimiento: formulario.fecha_vencimiento || null,
    }

    try {
      setGuardando(true)

      if (productoEditando) {
        await peticion(
          `/api/productos/${productoEditando.id}`,
          token,
          'PUT',
          datos,
        )
        setMensaje('Producto actualizado correctamente.')
      } else {
        await peticion('/api/productos', token, 'POST', datos)
        setMensaje('Producto registrado correctamente.')
      }

      setMostrarFormulario(false)
      setFormulario(formularioInicial)
      setProductoEditando(null)
      await cargarProductos()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function desactivarProducto(producto) {
    const confirmar = window.confirm(
      `¿Deseas desactivar el producto "${producto.nombre}"?`,
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    try {
      await peticion(
        `/api/productos/${producto.id}`,
        token,
        'DELETE',
      )
      setMensaje('Producto desactivado correctamente.')
      await cargarProductos()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="productos-page">
      <header className="productos-header">
        <div>
          <span className="dashboard-eyebrow">GESTIÓN DE FARMACIA</span>
          <h1>Productos</h1>
          <p>Administra el catálogo de productos de Nova Salud.</p>
        </div>

        {esAdmin && (
          <button className="producto-primary-button" onClick={abrirNuevo}>
            + Nuevo producto
          </button>
        )}
      </header>

      {mensaje && <div className="producto-success">{mensaje}</div>}
      {error && <div className="producto-error" role="alert">{error}</div>}

      <div className="productos-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o código..."
          value={buscar}
          onChange={(evento) => setBuscar(evento.target.value)}
          aria-label="Buscar productos"
        />

        <select
          value={categoria}
          onChange={(evento) => setCategoria(evento.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>

        <button
          className="producto-secondary-button"
          onClick={cargarProductos}
          disabled={cargando}
        >
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="productos-resumen">
        <strong>{productos.length}</strong>
        <span>productos encontrados</span>
      </div>

      <div className="productos-table-card">
        {cargando ? (
          <div className="productos-empty">Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div className="productos-empty">
            No se encontraron productos.
          </div>
        ) : (
          <div className="productos-table-scroll">
            <table className="productos-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Vencimiento</th>
                  {esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.codigo}</td>
                    <td>
                      <strong>{producto.nombre}</strong>
                      {producto.descripcion && (
                        <small>{producto.descripcion}</small>
                      )}
                    </td>
                    <td>{producto.categoria || 'Sin categoría'}</td>
                    <td>{moneda(producto.precio)}</td>
                    <td>
                      <span
                        className={
                          Number(producto.stock) <= Number(producto.stock_minimo)
                            ? 'producto-stock bajo'
                            : 'producto-stock'
                        }
                      >
                        {producto.stock}
                      </span>
                    </td>
                    <td>{producto.fecha_vencimiento || 'Sin fecha'}</td>
                    {esAdmin && (
                      <td>
                        <div className="producto-actions">
                          <button
                            className="producto-edit-button"
                            onClick={() => abrirEdicion(producto)}
                          >
                            Editar
                          </button>
                          <button
                            className="producto-delete-button"
                            onClick={() => desactivarProducto(producto)}
                          >
                            Desactivar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <div className="producto-modal-backdrop">
          <section
            className="producto-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="producto-form-title"
          >
            <header className="producto-modal-header">
              <div>
                <span className="dashboard-eyebrow">CATÁLOGO</span>
                <h2 id="producto-form-title">
                  {productoEditando ? 'Editar producto' : 'Nuevo producto'}
                </h2>
              </div>
              <button
                type="button"
                className="producto-close-button"
                onClick={() => setMostrarFormulario(false)}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarProducto}>
              <div className="producto-form-grid">
                <label>
                  Código *
                  <input
                    name="codigo"
                    value={formulario.codigo}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label>
                  Nombre *
                  <input
                    name="nombre"
                    value={formulario.nombre}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label className="producto-field-full">
                  Descripción
                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={cambiarCampo}
                    rows="2"
                  />
                </label>

                <label>
                  Categoría
                  <select
                    name="categoria_id"
                    value={formulario.categoria_id}
                    onChange={cambiarCampo}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Precio (S/) *
                  <input
                    name="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.precio}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label>
                  Stock
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.stock}
                    onChange={cambiarCampo}
                  />
                </label>

                <label>
                  Stock mínimo
                  <input
                    name="stock_minimo"
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.stock_minimo}
                    onChange={cambiarCampo}
                  />
                </label>

                <label className="producto-field-full">
                  Fecha de vencimiento
                  <input
                    name="fecha_vencimiento"
                    type="date"
                    value={formulario.fecha_vencimiento}
                    onChange={cambiarCampo}
                  />
                </label>
              </div>

              {error && <div className="producto-error">{error}</div>}

              <footer className="producto-modal-actions">
                <button
                  type="button"
                  className="producto-secondary-button"
                  onClick={() => setMostrarFormulario(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="producto-primary-button"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar producto'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
