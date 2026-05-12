const express = require('express');
const { Pool } = require('pg');
const app = express();

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const pool = new Pool({
  connectionString: 'postgresql://db_banda_bvov_user:ulbzic1SYMcuwBNP8QzvEeOt3yCn38Dg@dpg-d81pe957vvec738ja0tg-a/db_banda_bvov', 
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Inicialización de la tabla en PostgreSQL
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        uid TEXT,
        material TEXT,
        peso TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Conexión a BD exitosa y tabla lista.");
  } catch (err) {
    console.error("Error al conectar con la BD:", err);
  }
};
initDb();

// --- RUTA PARA RECIBIR DATOS DEL ESP32 ---
app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query(
      'INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)',
      [uid, material, weight_kg]
    );
    console.log(`Dato Recibido: ${uid} | ${material} | ${weight_kg}kg`);
    res.status(200).send('Dato guardado correctamente');
  } catch (err) {
    console.error("Error al insertar dato:", err);
    res.status(500).send('Error interno del servidor');
  }
});

// --- RUTA PARA VISUALIZAR LA TABLA WEB ---
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    
    // Generar las filas de la tabla con la hora de Ecuador (UTC-5)
    let filas = result.rows.map(r => {
      const fechaLocal = new Date(r.fecha).toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      return `
        <tr>
          <td style="padding:12px; border:1px solid #ddd;">${fechaLocal}</td>
          <td style="padding:12px; border:1px solid #ddd; font-family:monospace;">${r.uid}</td>
          <td style="padding:12px; border:1px solid #ddd;">${r.material}</td>
          <td style="padding:12px; border:1px solid #ddd; font-weight:bold;">${r.peso} kg</td>
        </tr>
      `;
    }).join('');

    // Estructura HTML de la página
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Panel de Control - Banda UG</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f0f2f5; color: #333; }
          .container { max-width: 900px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          h1 { color: #004a99; text-align: center; margin-bottom: 5px; }
          h3 { text-align: center; color: #666; font-weight: normal; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #004a99; color: white; padding: 15px; text-align: left; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          tr:hover { background-color: #e
