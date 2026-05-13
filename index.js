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

// Inicialización de la tabla
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
  } catch (err) {
    console.error(err);
  }
};
initDb();

// --- RUTA PARA RECIBIR DATOS ---
app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query(
      'INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)',
      [uid, material, weight_kg]
    );
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
});

// --- RUTA DE LA APP (VISTA MÓVIL) ---
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    
    let tarjetas = result.rows.map(r => {
      const materialClass = r.material.toLowerCase();
      const fecha = new Date(r.fecha).toLocaleString('es-EC', { 
        timeZone: 'America/Guayaquil', 
        hour12: true,
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      
      return `
        <div class="card">
          <div class="info">
            <div class="date">${fecha}</div>
            <div class="uid">ID: ${r.uid}</div>
            <span class="tag ${materialClass}">${r.material}</span>
          </div>
          <div class="weight">${r.peso} g</div>
        </div>
      `;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>App Banda UG</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f0f2f5; color: #333; }
          .header { background: #004a99; color: white; padding: 20px; text-align: center; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .container { max-width: 500px; margin: auto; padding-bottom: 20px; }
          .card { background: white; margin: 12px; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .date { font-weight: bold; color: #004a99; font-size: 0.9em; }
          .uid { color: #888; font-size: 0.8em; margin: 4px 0; font-family: monospace; }
          .weight { font-size: 1.4em; font-weight: bold; color: #2e7d32; }
          .tag { padding: 4px 10px; border-radius: 20px; font-size: 0.75em; font-weight: bold; color: white; text-transform: uppercase; }
          .carton { background: #8d6e63; }
          .papel { background: #1976d2; }
          .metal { background: #607d8b; }
          .refresh-msg { font-size: 0.7em; opacity: 0.8; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 1.2em; font-weight: bold;">Reciclaje Telemática UG</div>
          <div class="refresh-msg">Se actualiza automáticamente cada 10s</div>
        </div>
        <div class="container">
          ${tarjetas || '<p style="text-align:center; margin-top:20px;">Esperando datos...</p>'}
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.send("Error al conectar con la base de datos.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor listo'));
