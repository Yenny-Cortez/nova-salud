
import { useEffect, useState } from 'react'
import './App.css'
import Productos from './Productos'
import Categorias from './Categorias'
import Ventas from './Ventas'
import Inventario from './Inventario'
import Reportes from './Reportes'

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

  if (respuesta.status === 401) {
    const error = new Error(
      'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.',
    )
    error.status = 401
    throw error
  }

  if (respuesta.status === 403) {
    throw new Error(
      datos.mensaje || 'No tienes permiso para realizar esta acción.',
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

  // Estados para el registro de nuevos usuarios
  const [modoRegistro, setModoRegistro] = useState(false)
  const [nombreRegistro, setNombreRegistro] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [mensajeRegistro, setMensajeRegistro] = useState('')

  const [vista, setVista] = useState('inicio')
  const [menuContraido, setMenuContraido] = useState(false)

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

  const esAdmin = sesion?.usuario?.rol === 'admin'
  const nombreRol = esAdmin ? 'Administrador' : 'Trabajador'

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setErrorLogin('')
    setMensajeRegistro('')

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

  async function registrarUsuario(evento) {
    evento.preventDefault()
    setErrorLogin('')
    setMensajeRegistro('')

    if (!nombreRegistro.trim()) {
      setErrorLogin('Ingresa tu nombre completo.')
      return
    }

    if (!correo.trim()) {
      setErrorLogin('Ingresa tu correo electrónico.')
      return
    }

    if (contrasena.length < 8) {
      setErrorLogin('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (contrasena !== confirmarContrasena) {
      setErrorLogin('Las contraseñas no coinciden.')
      return
    }

    try {
      setCargandoLogin(true)

      const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreRegistro.trim(),
          correo: correo.trim(),
          contrasena,
        }),
      })

      const resultado = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || 'No se pudo completar el registro.',
        )
      }

      setMensajeRegistro(
        resultado.mensaje || 'Registro exitoso. Ya puedes iniciar sesión.',
      )

      setModoRegistro(false)
      setNombreRegistro('')
      setConfirmarContrasena('')
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

  function cambiarModoAutenticacion() {
    setModoRegistro((actual) => !actual)
    setErrorLogin('')
    setMensajeRegistro('')
    setNombreRegistro('')
    setContrasena('')
    setConfirmarContrasena('')
    setMostrarContrasena(false)
  }

  function cerrarSesion() {
    localStorage.removeItem('nova_salud_token')
    localStorage.removeItem('nova_salud_usuario')

    setSesion(null)
    setCorreo('')
    setContrasena('')
    setErrorLogin('')
    setMensajeRegistro('')
    setErrorDashboard('')
    setModoRegistro(false)
    setVista('inicio')
    setMenuContraido(false)
  }

  async function cargarDashboard() {
    if (!sesion?.token) return

    try {
      setCargandoDashboard(true)
      setErrorDashboard('')

      const [
        productos,
        categorias,
        ventas,
        resultadoAlertas,
        movimientos,
      ] = await Promise.all([
        consultarAPI('/api/productos', sesion.token),
        consultarAPI('/api/categorias', sesion.token),
        consultarAPI('/api/ventas', sesion.token),
        consultarAPI('/api/inventario/alertas', sesion.token),
        esAdmin
          ? consultarAPI('/api/inventario/movimientos', sesion.token)
          : Promise.resolve([]),
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

      if (error.status === 401) {
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
                <span className="form-label">
                  {modoRegistro ? 'REGISTRO DE USUARIO' : 'ACCESO AL SISTEMA'}
                </span>

                <h2>
                  {modoRegistro ? 'Crea tu cuenta' : '¡Hola de nuevo!'}
                </h2>

                <p>
                  {modoRegistro
                    ? 'Completa tus datos para registrarte en NOVA SALUD.'
                    : 'Ingresa tus datos para acceder a tu cuenta.'}
                </p>
              </div>

              <form onSubmit={modoRegistro ? registrarUsuario : iniciarSesion}>
                {modoRegistro && (
                  <div className="form-group">
                    <label htmlFor="nombreRegistro">Nombre completo</label>
                    <input
                      id="nombreRegistro"
                      type="text"
                      placeholder="Tu nombre completo"
                      value={nombreRegistro}
                      onChange={(evento) =>
                        setNombreRegistro(evento.target.value)
                      }
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="correo">Correo electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    placeholder="ejemplo@novasalud.com"
                    value={correo}
                    onChange={(evento) => setCorreo(evento.target.value)}
                    autoComplete={modoRegistro ? 'email' : 'username'}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contrasena">Contraseña</label>
                  <div className="password-wrapper">
                    <input
                      id="contrasena"
                      type={mostrarContrasena ? 'text' : 'password'}
                      placeholder={
                        modoRegistro
                          ? 'Crea una contraseña (mínimo 8 caracteres)'
                          : 'Ingresa tu contraseña'
                      }
                      value={contrasena}
                      onChange={(evento) => setContrasena(evento.target.value)}
                      autoComplete={
                        modoRegistro ? 'new-password' : 'current-password'
                      }
                      minLength={modoRegistro ? 8 : undefined}
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

                {modoRegistro && (
                  <div className="form-group">
                    <label htmlFor="confirmarContrasena">
                      Confirmar contraseña
                    </label>
                    <input
                      id="confirmarContrasena"
                      type={mostrarContrasena ? 'text' : 'password'}
                      placeholder="Repite tu contraseña"
                      value={confirmarContrasena}
                      onChange={(evento) =>
                        setConfirmarContrasena(evento.target.value)
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>
                )}

                {errorLogin && (
                  <div className="error-message" role="alert">
                    {errorLogin}
                  </div>
                )}

                {mensajeRegistro && (
                  <div className="success-message" role="status">
                    {mensajeRegistro}
                  </div>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={cargandoLogin}
                >
                  {cargandoLogin
                    ? modoRegistro
                      ? 'Registrando...'
                      : 'Ingresando...'
                    : modoRegistro
                      ? 'Crear cuenta'
                      : 'Iniciar sesión'}

                  {!cargandoLogin && (
                    <span aria-hidden="true">→</span>
                  )}
                </button>
              </form>

              <button
                className="auth-switch"
                type="button"
                onClick={cambiarModoAutenticacion}
                disabled={cargandoLogin}
              >
                {modoRegistro
                  ? '¿Ya tienes una cuenta? Inicia sesión'
                  : '¿No tienes una cuenta? Regístrate'}
              </button>

              <div className="form-footer">
                <span className="security-icon">◉</span>
                {modoRegistro
                  ? 'Registro seguro de usuarios'
                  : 'Acceso seguro mediante autenticación'}
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

  const opcionesMenu = [
    { id: 'inicio', icono: '▦', texto: 'Inicio' },
    { id: 'productos', icono: '▣', texto: 'Productos' },
    { id: 'categorias', icono: '▤', texto: 'Categorías' },
    { id: 'ventas', icono: '▧', texto: 'Ventas' },
    { id: 'inventario', icono: '▥', texto: 'Inventario' },
    ...(esAdmin
      ? [{ id: 'reportes', icono: '▨', texto: 'Reportes' }]
      : []),
  ]

  return (
    <main className={`dashboard-page ${menuContraido ? 'menu-contraido' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-main">
            <div className="sidebar-logo">+</div>
            <div className="sidebar-brand-text">
              <strong>NOVA SALUD</strong>
              <span>Gestión de farmacia</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setMenuContraido((actual) => !actual)}
            aria-label={menuContraido ? 'Expandir menú' : 'Contraer menú'}
            title={menuContraido ? 'Expandir menú' : 'Contraer menú'}
          >
            {menuContraido ? '☰' : '‹'}
          </button>
        </div>

        <p className="sidebar-label">MENÚ PRINCIPAL</p>

        <nav className="sidebar-nav">
          {opcionesMenu.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className={`nav-link ${vista === opcion.id ? 'active' : ''}`}
              onClick={() => setVista(opcion.id)}
              title={opcion.texto}
              aria-label={opcion.texto}
            >
              <span className="nav-icon">{opcion.icono}</span>
              <span className="nav-text">{opcion.texto}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(sesion.usuario.nombre || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <strong>{sesion.usuario.nombre}</strong>
              <span>{nombreRol}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={cerrarSesion}
            title="Cerrar sesión"
          >
            <span>↪</span>
            <span className="logout-text">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <section className="dashboard-content" id="inicio">
        {vista === 'reportes' && esAdmin ? (
          <Reportes token={sesion.token} />
        ) : vista === 'ventas' ? (
          <Ventas
            token={sesion.token}
            onCambio={cargarDashboard}
          />
        ) : vista === 'inventario' ? (
          <Inventario
            token={sesion.token}
            esAdmin={esAdmin}
            onCambio={cargarDashboard}
          />
        ) : vista === 'categorias' ? (
          <Categorias
            token={sesion.token}
            esAdmin={esAdmin}
            onCambio={cargarDashboard}
          />
        ) : vista === 'productos' ? (
          <Productos
            token={sesion.token}
            categorias={datos.categorias}
            esAdmin={esAdmin}
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

              {esAdmin && (
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
              )}

              <article className="dashboard-panel account-panel">
                <div className="account-decoration">+</div>
                <span className="dashboard-eyebrow">CUENTA ACTIVA</span>
                <h2>{sesion.usuario.nombre}</h2>
                <p>{sesion.usuario.correo}</p>
                <div className="account-role">
                  <span className="status-dot" />
                  Rol: {nombreRol}
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
