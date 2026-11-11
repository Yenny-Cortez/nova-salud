
import { useEffect, useState } from 'react'
import './App.css'
import Productos from './Productos'
import Categorias from './Categorias'
import Ventas from './Ventas'

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

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function consultarAPI(ruta, token) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const datos = await respuesta.json().catch(() => ({}))

  if (respuesta.status === 401 || respuesta.status === 403) {
    throw new Error(
      'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.',
    )
  }

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || `Error al consultar ${ruta}`)
  }

  return datos
}

function App() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargandoLogin, setCargandoLogin] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  const [vista, setVista] = useState('inicio')

  const [sesion, setSesion] = useState(() => {
    const token = localStorage.getItem('nova_salud_token')
    const usuarioGuardado = localStorage.getItem('nova_salud_usuario')

    if (token && usuarioGuardado) {
      try {
        return {
          token,
          usuario: JSON.parse(usuarioGuardado),
        }
      } catch {
        localStorage.removeItem('nova_salud_token')
        localStorage.removeItem('nova_salud_usuario')
      }
    }

    return null
  })

  const [datos, setDatos] = useState({
    productos: [],
    categorias: [],
    ventas: [],
    alertas: [],
    movimientos: [],
  })

  const [cargandoDashboard, setCargandoDashboard] = useState(false)
  const [errorDashboard, setErrorDashboard] = useState('')

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setErrorLogin('')

    if (!correo.trim() || !contrasena) {
      setErrorLogin('Ingresa tu correo y contraseña.')
      return
    }

    try {
      setCargandoLogin(true)

      const respuesta = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: correo.trim(),
          contrasena,
        }),
      })

      const resultado = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || 'No se pudo iniciar sesión.')
      }

      if (!resultado.token || !resultado.usuario) {
        throw new Error(
          'La respuesta del servidor no contiene los datos esperados.',
        )
      }

      localStorage.setItem('nova_salud_token', resultado.token)
      localStorage.setItem(
        'nova_salud_usuario',
        JSON.stringify(resultado.usuario),
      )

      setSesion({
        token: resultado.token,
        usuario: resultado.usuario,
      })

      setVista('inicio')
      setContrasena('')
    } catch (error) {
      setErrorLogin(
        error.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.'
          : error.message,
      )
    } finally {
      setCargandoLogin(false)
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('nova_salud_token')
    localStorage.removeItem('nova_salud_usuario')

    setSesion(null)
    setCorreo('')
    setContrasena('')
    setErrorLogin('')
    setErrorDashboard('')
    setVista('inicio')
  }

  async function cargarDashboard() {
    if (!sesion?.token) return

    try {
      setCargandoDashboard(true)
      setErrorDashboard('')

      const [productos, categorias, ventas, resultadoAlertas, movimientos] =
        await Promise.all([
          consultarAPI('/api/productos', sesion.token),
          consultarAPI('/api/categorias', sesion.token),
          consultarAPI('/api/ventas', sesion.token),
          consultarAPI('/api/inventario/alertas', sesion.token),
          consultarAPI('/api/inventario/movimientos', sesion.token),
        ])

      setDatos({
        productos: Array.isArray(productos) ? productos : [],
        categorias: Array.isArray(categorias) ? categorias : [],
        ventas: Array.isArray(ventas) ? ventas : [],
        alertas: Array.isArray(resultadoAlertas.productos)
          ? resultadoAlertas.productos
          : [],
        movimientos: Array.isArray(movimientos) ? movimientos : [],
      })
    } catch (error) {
      setErrorDashboard(error.message)

      if (
        error.message.includes('sesión no es válida') ||
        error.message.includes('ha expirado')
      ) {
        cerrarSesion()
      }
    } finally {
      setCargandoDashboard(false)
    }
  }

  useEffect(() => {
    if (!sesion?.token) return

    const temporizador = setTimeout(() => {
      cargarDashboard()
    }, 0)

    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.token])

  if (!sesion) {
    return (
      <main className="login-page">
        <section className="login-layout">
          <aside className="brand-panel">
            <div className="brand-content">
              <div className="brand-logo">+</div>
              <p className="brand-name">NOVA SALUD</p>
              <h1>
                Cuidamos de ti,
                <br />
                administramos
                <br />
                con confianza.
              </h1>
              <p className="brand-description">
                Sistema de gestión para el control de productos,
                ventas e inventario de Botica Nova Salud.
              </p>
            </div>

            <div className="brand-footer">
              <span>BOTICA NOVA SALUD</span>
              <span>Gestión inteligente de farmacia</span>
            </div>
          </aside>

          <section className="form-panel">
            <div className="login-form-container">
              <div className="mobile-brand">
                <div className="brand-logo">+</div>
                <span>NOVA SALUD</span>
              </div>

              <div className="form-heading">
                <span className="form-label">ACCESO AL SISTEMA</span>
                <h2>¡Hola de nuevo!</h2>
                <p>Ingresa tus datos para acceder a tu cuenta.</p>
              </div>

              <form onSubmit={iniciarSesion}>
                <div className="form-group">
                  <label htmlFor="correo">Correo electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    placeholder="ejemplo@novasalud.com"
                    value={correo}
                    onChange={(evento) => setCorreo(evento.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contrasena">Contraseña</label>
                  <div className="password-wrapper">
                    <input
                      id="contrasena"
                      type={mostrarContrasena ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña"
                      value={contrasena}
                      onChange={(evento) => setContrasena(evento.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      className="show-password"
                      type="button"
                      onClick={() =>
                        setMostrarContrasena(!mostrarContrasena)
                      }
                    >
                      {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                {errorLogin && (
                  <div className="error-message" role="alert">
                    {errorLogin}
                  </div>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={cargandoLogin}
                >
                  {cargandoLogin ? 'Ingresando...' : 'Iniciar sesión'}
                  {!cargandoLogin && <span aria-hidden="true">→</span>}
                </button>
              </form>

              <div className="form-footer">
                <span className="security-icon">●</span>
                Acceso seguro mediante autenticación
              </div>
            </div>

            <p className="copyright">
              © 2026 Botica Nova Salud. Todos los derechos reservados.
            </p>
          </section>
        </section>
      </main>
    )
  }

  const totalVendido = datos.ventas.reduce(
    (total, venta) => total + Number(venta.total || 0),
    0,
  )

  const ventasRecientes = datos.ventas.slice(0, 5)
  const movimientosRecientes = datos.movimientos.slice(0, 5)

  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">+</div>
          <div>
            <strong>NOVA SALUD</strong>
            <span>Gestión de farmacia</span>
          </div>
        </div>

        <p className="sidebar-label">MENÚ PRINCIPAL</p>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-link ${vista === 'inicio' ? 'active' : ''}`}
            onClick={() => setVista('inicio')}
          >
            <span>▦</span> Inicio
          </button>

          <button
            type="button"
            className={`nav-link ${vista === 'productos' ? 'active' : ''}`}
            onClick={() => setVista('productos')}
          >
            <span>▣</span> Productos
          </button>

          <button
            type="button"
            className={`nav-link ${vista === 'categorias' ? 'active' : ''}`}
            onClick={() => setVista('categorias')}
          >
            <span>▤</span> Categorías
          </button>

          <button
            type="button"
            className={`nav-link ${vista === 'ventas' ? 'active' : ''}`}
            onClick={() => setVista('ventas')}
          >
            <span>▤</span> Ventas
          </button>

          <button
            type="button"
            className={`nav-link ${vista === 'inicio' ? '' : ''}`}
            onClick={() => setVista('inicio')}
          >
            <span>⚠</span> Alertas de stock
          </button>

          <button
            type="button"
            className="nav-link"
            onClick={() => setVista('inicio')}
          >
            <span>↕</span> Movimientos
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(sesion.usuario.nombre || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <strong>{sesion.usuario.nombre}</strong>
              <span>{sesion.usuario.rol}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="dashboard-content" id="inicio">
        {vista === 'ventas' ? (
          <Ventas
            token={sesion.token}
            onCambio={cargarDashboard}
          />
        ) : vista === 'categorias' ? (
          <Categorias
            token={sesion.token}
            esAdmin={sesion.usuario.rol === 'admin'}
            onCambio={cargarDashboard}
          />
        ) : vista === 'productos' ? (
          <Productos
            token={sesion.token}
            categorias={datos.categorias}
            esAdmin={sesion.usuario.rol === 'admin'}
          />
        ) : (
          <>
            <header className="dashboard-header">
              <div>
                <span className="dashboard-eyebrow">PANEL DE CONTROL</span>
                <h1>¡Hola, {sesion.usuario.nombre}!</h1>
                <p>Este es el resumen de tu farmacia.</p>
              </div>

              <button
                type="button"
                className="refresh-button"
                onClick={cargarDashboard}
                disabled={cargandoDashboard}
              >
                <span>↻</span>
                {cargandoDashboard ? 'Actualizando...' : 'Actualizar datos'}
              </button>
            </header>

            {errorDashboard && (
              <div className="dashboard-error" role="alert">
                {errorDashboard}
                <button type="button" onClick={cargarDashboard}>
                  Reintentar
                </button>
              </div>
            )}

            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-icon green">▣</div>
                <span>Productos activos</span>
                <strong>
                  {cargandoDashboard ? '...' : datos.productos.length}
                </strong>
                <small>Productos registrados</small>
              </article>

              <article className="stat-card">
                <div className="stat-icon blue">▤</div>
                <span>Categorías</span>
                <strong>
                  {cargandoDashboard ? '...' : datos.categorias.length}
                </strong>
                <small>Categorías registradas</small>
              </article>

              <article className="stat-card">
                <div className="stat-icon purple">S/</div>
                <span>Total vendido</span>
                <strong className="money-value">
                  {cargandoDashboard ? '...' : formatoMoneda(totalVendido)}
                </strong>
                <small>{datos.ventas.length} ventas registradas</small>
              </article>

              <article className="stat-card">
                <div className="stat-icon orange">⚠</div>
                <span>Stock bajo</span>
                <strong>
                  {cargandoDashboard ? '...' : datos.alertas.length}
                </strong>
                <small>Productos por reponer</small>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-panel sales-panel" id="ventas">
                <div className="panel-heading">
                  <div>
                    <h2>Ventas recientes</h2>
                    <p>Últimas operaciones registradas</p>
                  </div>
                  <span className="panel-tag">VENTAS</span>
                </div>

                {ventasRecientes.length === 0 ? (
                  <div className="empty-state">
                    {cargandoDashboard
                      ? 'Cargando ventas...'
                      : 'Todavía no hay ventas registradas.'}
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>N.º</th>
                          <th>Vendedor</th>
                          <th>Fecha</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasRecientes.map((venta) => (
                          <tr key={venta.id}>
                            <td>#{venta.id}</td>
                            <td>{venta.vendedor || 'Usuario'}</td>
                            <td>{formatoFecha(venta.fecha)}</td>
                            <td className="table-total">
                              {formatoMoneda(venta.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="dashboard-panel alerts-panel" id="alertas">
                <div className="panel-heading">
                  <div>
                    <h2>Alertas de stock</h2>
                    <p>Productos que necesitan atención</p>
                  </div>
                  <span className="alert-count">{datos.alertas.length}</span>
                </div>

                {datos.alertas.length === 0 ? (
                  <div className="empty-state">
                    {cargandoDashboard
                      ? 'Consultando inventario...'
                      : 'No hay productos con stock bajo.'}
                  </div>
                ) : (
                  <div className="alert-list">
                    {datos.alertas.slice(0, 6).map((producto) => (
                      <div className="alert-item" key={producto.id}>
                        <div className="alert-product-icon">!</div>
                        <div className="alert-product-info">
                          <strong>{producto.nombre}</strong>
                          <span>
                            {producto.codigo} ·{' '}
                            {producto.categoria || 'Sin categoría'}
                          </span>
                        </div>
                        <div className="alert-stock">
                          <strong>{producto.stock}</strong>
                          <span>Mín. {producto.stock_minimo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article
                className="dashboard-panel movements-panel"
                id="movimientos"
              >
                <div className="panel-heading">
                  <div>
                    <h2>Movimientos de inventario</h2>
                    <p>Entradas y salidas recientes</p>
                  </div>
                  <span className="panel-tag">INVENTARIO</span>
                </div>

                {movimientosRecientes.length === 0 ? (
                  <div className="empty-state">
                    {cargandoDashboard
                      ? 'Cargando movimientos...'
                      : 'Todavía no hay movimientos registrados.'}
                  </div>
                ) : (
                  <div className="movement-list">
                    {movimientosRecientes.map((movimiento) => (
                      <div className="movement-item" key={movimiento.id}>
                        <span
                          className={`movement-symbol ${
                            movimiento.tipo === 'entrada' ? 'entry' : 'exit'
                          }`}
                        >
                          {movimiento.tipo === 'entrada' ? '↓' : '↑'}
                        </span>
                        <div className="movement-info">
                          <strong>{movimiento.producto}</strong>
                          <span>{formatoFecha(movimiento.fecha)}</span>
                        </div>
                        <div className="movement-quantity">
                          <strong>
                            {movimiento.tipo === 'entrada' ? '+' : '-'}
                            {movimiento.cantidad}
                          </strong>
                          <span>{movimiento.tipo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="dashboard-panel account-panel">
                <div className="account-decoration">+</div>
                <span className="dashboard-eyebrow">CUENTA ACTIVA</span>
                <h2>{sesion.usuario.nombre}</h2>
                <p>{sesion.usuario.correo}</p>
                <div className="account-role">
                  <span className="status-dot" />
                  Rol: {sesion.usuario.rol}
                </div>
                <div className="account-note">
                  Bienvenido al sistema de gestión de Botica Nova Salud.
                </div>
              </article>
            </section>

            <footer className="dashboard-footer">
              Botica Nova Salud · Sistema de gestión de farmacia · 2026
            </footer>
          </>
        )}
      </section>
    </main>
  )
}

export default App
