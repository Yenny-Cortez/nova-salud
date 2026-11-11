
import { useEffect, useState } from 'react';
import './Categorias.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Categorias({ token, esAdmin, onCambio }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [nombre, setNombre] = useState('');

  async function consultarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opciones.headers,
      },
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo completar la operación');
    }

    return datos;
  }

  async function cargarCategorias() {
    setCargando(true);
    setError('');

    try {
      const datos = await consultarAPI('/api/categorias');
      setCategorias(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
  const temporizador = setTimeout(() => {
    cargarCategorias();
  }, 0);

  return () => clearTimeout(temporizador);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token]);

  function abrirNueva() {
    setCategoriaEditando(null);
    setNombre('');
    setError('');
    setModalAbierto(true);
  }

  function abrirEdicion(categoria) {
    setCategoriaEditando(categoria);
    setNombre(categoria.nombre);
    setError('');
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setModalAbierto(false);
    setCategoriaEditando(null);
    setNombre('');
  }

  async function guardarCategoria(evento) {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setError('Escribe el nombre de la categoría.');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const editando = Boolean(categoriaEditando);
      const ruta = editando
        ? `/api/categorias/${categoriaEditando.id}`
        : '/api/categorias';

      await consultarAPI(ruta, {
        method: editando ? 'PUT' : 'POST',
        body: JSON.stringify({ nombre: nombreLimpio }),
      });

      cerrarModal();
      await cargarCategorias();

      if (onCambio) {
        await onCambio();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivarCategoria(categoria) {
    const confirmar = window.confirm(
      `¿Deseas desactivar la categoría "${categoria.nombre}"?`
    );

    if (!confirmar) return;

    setError('');

    try {
      await consultarAPI(`/api/categorias/${categoria.id}`, {
        method: 'DELETE',
      });

      await cargarCategorias();

      if (onCambio) {
        await onCambio();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="categorias-contenedor">
      <div className="categorias-encabezado">
        <div>
          <h2>Gestión de categorías</h2>
          <p>Organiza los productos de la botica por categorías.</p>
        </div>

        {esAdmin && (
          <button
            type="button"
            className="categoria-boton-principal"
            onClick={abrirNueva}
          >
            + Nueva categoría
          </button>
        )}
      </div>

      {error && !modalAbierto && (
        <div className="categoria-mensaje-error">{error}</div>
      )}

      <div className="categorias-tarjeta">
        <div className="categorias-resumen">
          <span>Total de categorías activas</span>
          <strong>{categorias.length}</strong>
        </div>

        {cargando ? (
          <p className="categorias-estado">Cargando categorías...</p>
        ) : categorias.length === 0 ? (
          <p className="categorias-estado">
            Todavía no hay categorías registradas.
          </p>
        ) : (
          <div className="categorias-tabla-contenedor">
            <table className="categorias-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre de la categoría</th>
                  <th>Estado</th>
                  {esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria) => (
                  <tr key={categoria.id}>
                    <td>{categoria.id}</td>
                    <td>{categoria.nombre}</td>
                    <td>
                      <span className="categoria-estado-activo">
                        Activa
                      </span>
                    </td>
                    {esAdmin && (
                      <td>
                        <div className="categoria-acciones">
                          <button
                            type="button"
                            className="categoria-boton-editar"
                            onClick={() => abrirEdicion(categoria)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="categoria-boton-eliminar"
                            onClick={() => desactivarCategoria(categoria)}
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

      {modalAbierto && (
        <div className="categoria-modal-fondo">
          <div className="categoria-modal">
            <h3>
              {categoriaEditando ? 'Editar categoría' : 'Nueva categoría'}
            </h3>

            <form onSubmit={guardarCategoria}>
              <label htmlFor="nombre-categoria">
                Nombre de la categoría
              </label>
              <input
                id="nombre-categoria"
                type="text"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="Ej. Medicamentos"
                maxLength={100}
                autoFocus
              />

              {error && (
                <div className="categoria-mensaje-error">{error}</div>
              )}

              <div className="categoria-modal-acciones">
                <button
                  type="button"
                  className="categoria-boton-cancelar"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="categoria-boton-principal"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Categorias;