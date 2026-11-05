const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      estado: 'activo',
      baseDatos: 'conectada',
      hora: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({ estado: 'error', baseDatos: 'desconectada' });
  }
});

module.exports = router;