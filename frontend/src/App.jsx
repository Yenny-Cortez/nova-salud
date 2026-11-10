
import { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
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

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setError('')

    if (!correo.trim() || !contrasena) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    try {
      setCargando(true)

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

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudo iniciar sesión.')
      }

      if (!datos.token || !datos.usuario) {
        throw new Error('La respuesta del servidor no contiene los datos esperados.')
      }

      localStorage.setItem('nova_salud_token', datos.token)
      localStorage.setItem(
        'nova_salud_usuario',
        JSON.stringify(datos.usuario),
      )

      setSesion({
        token: datos.token,
        usuario: datos.usuario,
      })
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.'
          : err.message,
      )
    } finally {
      setCargando(false)
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('nova_salud_token')
    localStorage.removeItem('nova_salud_usuario')
    setSesion(null)
    setCorreo('')
    setContrasena('')
    setError('')
  }

  if (sesion) {
    return (
      <main className="welcome-page">
        <section className="welcome-card">
          <div className="brand-symbol">+</div>
          <p className="eyebrow">BOTICA NOVA SALUD</p>
          <h1>¡Bienvenido, {sesion.usuario.nombre}!</h1>
          <p className="welcome-description">
            Has iniciado sesión correctamente en el sistema.
          </p>

          <div className="user-information">
            <div>
              <span>Correo electrónico</span>
              <strong>{sesion.usuario.correo}</strong>
            </div>
            <div>
              <span>Rol de usuario</span>
              <strong>{sesion.usuario.rol}</strong>
            </div>
          </div>

          <div className="session-status">
            <span className="status-dot" />
            Sesión iniciada correctamente
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

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
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    aria-label={
                      mostrarContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={cargando}
              >
                {cargando ? 'Ingresando...' : 'Iniciar sesión'}
                {!cargando && <span aria-hidden="true">→</span>}
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

export default App
