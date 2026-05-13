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
    console.log("Base de datos conectada.");
  } catch (err) {
    console.error("Error BD:", err);
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
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
});

// --- RUTA PRINCIPAL (WEB APP + ESTADÍSTICAS + NOTIFICACIONES) ---
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    
    // Cálculos para la gráfica de estadísticas
    const stats = { carton: 0, papel: 0, metal: 0 };
    result.rows.forEach(r => {
      const mat = r.material.toLowerCase();
      if(stats.hasOwnProperty(mat)) stats[mat]++;
    });

    // Generar las tarjetas de historial
    let tarjetas = result.rows.map(r => {
      const matClass = r.material.toLowerCase();
      const fechaEC = new Date(r.fecha).toLocaleString('es-EC', { 
        timeZone: 'America/Guayaquil', 
        hour12: true,
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="card" data-id="${r.id}">
          <div class="info">
            <div class="date">${fechaEC}</div>
            <div class="uid">ID: ${r.uid}</div>
            <span class="tag ${matClass}">${r.material}</span>
          </div>
          <div class="weight">${r.peso} g</div>
        </div>`;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reciclaje UG App</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #f0f2f5; }
          .header { background: #004a99; color: white; padding: 15px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
          .menu-btn { font-size: 24px; margin-right: 15px; cursor: pointer; }
          
          /* Menú Lateral */
          .sidenav { height: 100%; width: 0; position: fixed; z-index: 200; top: 0; left: 0; background-color: #111; overflow-x: hidden; transition: 0.5s; padding-top: 60px; }
          .sidenav a { padding: 15px; text-decoration: none; font-size: 20px; color: #818181; display: block; transition: 0.3s; }
          .sidenav a:hover { color: #f1f1f1; }
          .sidenav .closebtn { position: absolute; top: 0; right: 25px; font-size: 36px; }

          /* Secciones */
          .section { display: none; padding: 15px; max-width: 600px; margin: auto; }
          .active { display: block; }
          
          /* Tarjetas de Historial */
          .card { background: white; margin-bottom: 12px; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .date { font-weight: bold; color: #004a99; }
          .uid { color: #888; font-size: 0.8em; font-family: monospace; }
          .tag { padding: 4px 10px; border-radius: 20px; font-size: 0.7em; font-weight: bold; color: white; text-transform: uppercase; margin-top: 5px; display: inline-block; }
          .carton { background: #8d6e63; } .papel { background: #1976d2; } .metal { background: #607d8b; }
          .weight { font-size: 1.4em; font-weight: bold; color: #2e7d32; }
          
          canvas { background: white; border-radius: 12px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        </style>
      </head>
      <body>

        <div id="mySidenav" class="sidenav">
          <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>
          <a href="#" onclick="showSection('historial')">📊 Historial</a>
          <a href="#" onclick="showSection('stats')">📈 Estadísticas</a>
        </div>

        <div class="header">
          <span class="menu-btn" onclick="openNav()">&#9776;</span>
          <span>Banda UG - Telemática</span>
        </div>

        <div id="historial" class="section active">
          <h2 style="color:#004a99">Registros Recientes</h2>
          <div id="lista-tarjetas">${tarjetas || '<p>Esperando datos...</p>'}</div>
        </div>

        <div id="stats" class="section">
          <h2 style="color:#004a99">Resumen de Materiales</h2>
          <canvas id="myChart"></canvas>
          <div style="margin-top:20px; text-align:center; color:#666;">
            Total de objetos procesados: ${result.rows.length}
          </div>
        </div>

        <script>
          // Funciones del Menú
          function openNav() { document.getElementById("mySidenav").style.width = "250px"; }
          function closeNav() { document.getElementById("mySidenav").style.width = "0"; }
          function showSection(id) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            closeNav();
          }

          // Gráfica de Pastel
          const ctx = document.getElementById('myChart').getContext('2d');
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Cartón', 'Papel', 'Metal'],
              datasets: [{
                data: [${stats.carton}, ${stats.papel}, ${stats.metal}],
                backgroundColor: ['#8d6e63', '#1976d2', '#607d8b']
              }]
            },
            options: { responsive: true }
          });

          // --- LÓGICA DE NOTIFICACIÓN PARA KODULAR ---
          let ultimoID = localStorage.getItem('ultimoID') || 0;
          
          setInterval(() => {
            const primeraTarjeta = document.querySelector('.card');
            if (primeraTarjeta) {
              const idActual = primeraTarjeta.getAttribute('data-id');
              
              if (ultimoID != 0 && idActual > ultimoID) {
                // Si estamos en Kodular, enviamos la señal
                if (window.AppInventor) {
                   window.AppInventor.setWebViewString("NUEVO_DATO");
                }
              }
              ultimoID = idActual;
              localStorage.setItem('ultimoID', ultimoID);
            }
          }, 5000);

          // Auto-recarga suave de la página cada 15s para actualizar datos
          setTimeout(() => { location.reload(); }, 15000);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error en servidor");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));
