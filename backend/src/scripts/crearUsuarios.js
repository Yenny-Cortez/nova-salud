require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

const usuarios = [
  { nombre: 'Administrador', correo: 'admin@novasalud.com', contrasena: 'Admin123', rol: 'admin' },
  { nombre: 'Vendedor de prueba', correo: 'vendedor@novasalud.com', contrasena: 'Vendedor123', rol: 'vendedor' },
];

async function main() {
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.contrasena, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, contrasena, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo) DO NOTHING`,
      [u.nombre, u.correo, hash, u.rol]
    );
    console.log(`Usuario listo: ${u.correo}`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});