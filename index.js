const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: 'https://proyecto-banda-transportadora.onrender.com/save_data', // Pega aquí tu URL de Render
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Crear la tabla automáticamente si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS registros (
    id SERIAL PRIMARY KEY,
    uid TEXT,
    material TEXT,
    peso TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ruta para guardar datos (lo que llama el ESP32)
app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query(
      'INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)',
      [uid, material, weight_kg]
    );
    console.log("Dato guardado en BD:", uid);
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Ruta para VER los datos en una tabla bonita
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    let html = `
      <html>
        <head>
          <title>Registros Banda Transportadora</title>
          <style>
            body { font-family: Arial; text-align: center; background: #f4f4f4; }
            table { width: 80%; margin: auto; border-collapse: collapse; background: white; }
            th, td { padding: 10px; border: 1px solid #ddd; }
            th { background: #6200ee; color: white; }
          </style>
        </head>
        <body>
          <h1>Historial de Clasificación - UG</h1>
          <table>
            <tr><th>Fecha</th><th>Usuario (UID)</th><th>Material</th><th>Peso (kg)</th></tr>`;
    
    result.rows.forEach(row => {
      html += `<tr>
        <td>${new Date(row.fecha).toLocaleString()}</td>
        <td>${row.uid}</td>
        <td>${row.material}</td>
        <td>${row.peso}</td>
      </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  } catch (err) {
    res.send("Error al cargar datos");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));
