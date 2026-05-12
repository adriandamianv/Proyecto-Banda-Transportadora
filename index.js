const express = require('express');
const { Pool } = require('pg');
const app = express();

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// RECUERDA: Pega tu dirección real entre las comillas
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

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Panel de Control - Banda UG</title>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 20px; background-color: #f0f2f5; }
          .container { max-width: 900px; margin: auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          h1 { color: #004a99; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #004a99; color: white; padding: 15px; text-align: left; }
          td { padding: 12px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Panel de Control - Clasificación de Residuos</h1>
          <h3 style="text-align:center; color: #666;">Universidad de Guayaquil - Telemática</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora (Ecuador)</th>
                <th>ID Tarjeta (UID)</th>
                <th>Material</th>
                <th>Peso Neto</th>
              </tr>
            </thead>
            <tbody>
              ${filas || '<tr><td colspan="4" style="text-align:center;">No hay registros.</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error al cargar la página:", err);
    res.send("<h1>Error al conectar con la base de datos</h1>");
  }
});

// Configuración del puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});
