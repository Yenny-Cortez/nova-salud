
import { useEffect, useState } from 'react';
import './Inventario.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatoFecha(fecha) {
  if (!fecha) return '-';

  return new Date(fecha).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export default function Inventario({ token, esAdmin, onCambio }) {
  const [alertas, setAlertas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [formulario, setFormulario] = useState({
    producto_id: '',
    tipo: 'entrada',
    cantidad: '1'
  });

  async function consultar(ruta) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'Error al consultar los datos');
    }

    return datos;
  }

  async function cargarInventario() {
    setCargando(true);
    setError('');

    try {
      const [datosAlertas, datosMovimientos, datosProductos] =
        await Promise.all([
          consultar('/api/inventario/alertas'),
          consultar('/api/inventario/movimientos'),
          consultar('/api/productos')
        ]);

      setAlertas(datosAlertas.productos || []);
      setMovimientos(datosMovimientos);
      setProductos(datosProductos.filter((producto) => producto.activo !== false));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarInventario();
    }, 0);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function cambiarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value
    }));
  }

  async function registrarMovimiento(evento) {
    evento.preventDefault();

    setError('');
    setMensaje('');

    if (!formulario.producto_id) {
      setError('Selecciona un producto.');
      return;
    }

    const cantidad = Number(formulario.cantidad);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setError('La cantidad debe ser un número entero mayor que cero.');
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/inventario/movimientos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          producto_id: Number(formulario.producto_id),
          tipo: formulario.tipo,
          cantidad
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudo registrar el movimiento');
      }

      setMensaje(datos.mensaje || 'Movimiento registrado correctamente.');

      setFormulario({
        producto_id: '',
        tipo: 'entrada',
        cantidad: '1'
      });

      await cargarInventario();

      if (onCambio) {
        await onCambio();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="inventario">
      <div className="inventario-encabezado">
        <div>
          <h2>Inventario</h2>
          <p>Control de existencias y movimientos de productos.</p>
        </div>

        <button
          type="button"
          className="inventario-btn-actualizar"
          onClick={cargarInventario}
          disabled={cargando}
        >
          Actualizar información
        </button>
      </div>

      {error && <div className="inventario-alerta error">{error}</div>}
      {mensaje && <div className="inventario-alerta exito">{mensaje}</div>}

      <div className="inventario-resumen">
        <article className="inventario-tarjeta">
          <span>Productos con stock bajo</span>
          <strong>{alertas.length}</strong>
        </article>

        <article className="inventario-tarjeta">
          <span>Movimientos registrados</span>
          <strong>{movimientos.length}</strong>
        </article>

        <article className="inventario-tarjeta">
          <span>Productos activos</span>
          <strong>{productos.length}</strong>
        </article>
      </div>

      {esAdmin && (
        <section className="inventario-panel">
          <h3>Registrar movimiento manual</h3>
          <p>Registra entradas o salidas de productos del inventario.</p>

          <form onSubmit={registrarMovimiento} className="inventario-formulario">
            <div className="inventario-campo">
              <label htmlFor="producto_id">Producto</label>
              <select
                id="producto_id"
                name="producto_id"
                value={formulario.producto_id}
                onChange={cambiarCampo}
                required
              >
                <option value="">Seleccionar producto</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.codigo} - {producto.nombre} (Stock: {producto.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="inventario-campo">
              <label htmlFor="tipo">Tipo de movimiento</label>
              <select
                id="tipo"
                name="tipo"
                value={formulario.tipo}
                onChange={cambiarCampo}
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>

            <div className="inventario-campo">
              <label htmlFor="cantidad">Cantidad</label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="1"
                step="1"
                value={formulario.cantidad}
                onChange={cambiarCampo}
                required
              />
            </div>

            <button type="submit" disabled={guardando || cargando}>
              {guardando ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </form>
        </section>
      )}

      <section className="inventario-panel">
        <h3>Alertas de stock bajo</h3>

        {cargando ? (
          <p>Cargando alertas...</p>
        ) : alertas.length === 0 ? (
          <p className="inventario-vacio">No hay productos con stock bajo.</p>
        ) : (
          <div className="inventario-tabla-contenedor">
            <table className="inventario-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock actual</th>
                  <th>Stock mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.codigo}</td>
                    <td>{producto.nombre}</td>
                    <td>{producto.categoria || '-'}</td>
                    <td>{producto.stock}</td>
                    <td>{producto.stock_minimo}</td>
                    <td>
                      <span className="inventario-estado-bajo">
                        {Number(producto.stock) === 0 ? 'Agotado' : 'Stock bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inventario-panel">
        <h3>Historial de movimientos</h3>

        {cargando ? (
          <p>Cargando movimientos...</p>
        ) : movimientos.length === 0 ? (
          <p className="inventario-vacio">Todavía no hay movimientos registrados.</p>
        ) : (
          <div className="inventario-tabla-contenedor">
            <table className="inventario-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td>{formatoFecha(movimiento.fecha)}</td>
                    <td>{movimiento.codigo}</td>
                    <td>{movimiento.producto}</td>
                    <td>
                      <span className={`inventario-tipo ${movimiento.tipo}`}>
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td>{movimiento.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
