const express = require('express');
const { Pool } = require('pg');
const app = express();

// Configuración de la conexión
const pool = new Pool({
  connectionString: 'postgresql://db_banda_bvov_user:ulbzic1SYMcuwBNP8QzvEeOt3yCn38Dg@dpg-d81pe957vvec738ja0tg-a/db_banda_bvov', 
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Crear tabla si no existe
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id SERIAL PRIMARY KEY,
      uid TEXT,
      material TEXT,
      peso TEXT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
initDb();

// Recibir datos del ESP32
app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query(
      'INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)',
      [uid, material, weight_kg]
    );
    res.status(200).send('Dato guardado');
  } catch (err) {
    res.status(500).send('Error en BD');
  }
});

// Ver la base de datos en la página principal
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    let filas = result.rows.map(r => 
      `<tr><td>${new Date(r.fecha).toLocaleString()}</td><td>${r.uid}</td><td>${r.material}</td><td>${r.peso} kg</td></tr>`
    ).join('');

    res.send(`
      <html>
        <body style="font-family:sans-serif; text-align:center;">
          <h1>Panel de Control - Banda UG</h1>
          <table border="1" style="margin:auto; width:80%;">
            <tr style="background:#ddd;"><th>Fecha</th><th>Tarjeta (UID)</th><th>Material</th><th>Peso</th></tr>
            ${filas}
          </table>
        </body>
      </html>
    `);
  } catch (err) {
    res.send("Error al leer la base de datos");
  }
});

app.listen(process.env.PORT || 10000);
