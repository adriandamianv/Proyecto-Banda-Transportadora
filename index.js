const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: 'postgresql://db_banda_bvov_user:ulbzic1SYMcuwBNP8QzvEeOt3yCn38Dg@dpg-d81pe957vvec738ja0tg-a/db_banda_bvov', 
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- RUTA PRINCIPAL (APP CON MENÚ Y ESTADÍSTICAS) ---
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    
    // Lógica para estadísticas (conteo por material)
    const stats = { carton: 0, papel: 0, metal: 0 };
    result.rows.forEach(r => {
      const mat = r.material.toLowerCase();
      if(stats.hasOwnProperty(mat)) stats[mat]++;
    });

    let tarjetas = result.rows.map(r => {
      const matClass = r.material.toLowerCase();
      const fecha = new Date(r.fecha).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', hour12: true });
      return `
        <div class="card">
          <div><b style="color:#004a99">${fecha}</b><br><small>ID: ${r.uid}</small><br>
          <span class="tag ${matClass}">${r.material}</span></div>
          <div class="weight">${r.peso} g</div>
        </div>`;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: sans-serif; margin: 0; background: #f4f7f6; }
          .header { background: #004a99; color: white; padding: 15px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; }
          .menu-icon { font-size: 24px; margin-right: 15px; cursor: pointer; }
          
          /* Menú Lateral */
          .sidenav { height: 100%; width: 0; position: fixed; z-index: 200; top: 0; left: 0; background-color: #111; overflow-x: hidden; transition: 0.5s; padding-top: 60px; }
          .sidenav a { padding: 15px; text-decoration: none; font-size: 20px; color: #818181; display: block; transition: 0.3s; }
          .sidenav a:hover { color: #f1f1f1; }
          .sidenav .closebtn { position: absolute; top: 0; right: 25px; font-size: 36px; margin-left: 50px; }

          .section { display: none; padding: 15px; }
          .active { display: block; }
          .card { background: white; margin-bottom: 10px; padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .tag { padding: 3px 8px; border-radius: 5px; color: white; font-size: 12px; }
          .carton { background: #8d6e63; } .papel { background: #1e88e5; } .metal { background: #546e7a; }
          .weight { font-size: 20px; font-weight: bold; }
        </style>
      </head>
      <body>

        <div id="mySidenav" class="sidenav">
          <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>
          <a href="#" onclick="showSection('historial')">Historial</a>
          <a href="#" onclick="showSection('stats')">Estadísticas</a>
        </div>

        <div class="header">
          <span class="menu-icon" onclick="openNav()">&#9776;</span>
          <span>Reciclaje UG - App</span>
        </div>

        <div id="historial" class="section active">
          <h2>Registros Recientes</h2>
          ${tarjetas}
        </div>

        <div id="stats" class="section">
          <h2>Resumen de Reciclaje</h2>
          <canvas id="myChart" width="400" height="400"></canvas>
        </div>

        <script>
          function openNav() { document.getElementById("mySidenav").style.width = "250px"; }
          function closeNav() { document.getElementById("mySidenav").style.width = "0"; }
          
          function showSection(id) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            closeNav();
          }

          // Configuración de la Gráfica
          const ctx = document.getElementById('myChart').getContext('2d');
          new Chart(ctx, {
            type: 'pie',
            data: {
              labels: ['Cartón', 'Papel', 'Metal'],
              datasets: [{
                data: [${stats.carton}, ${stats.papel}, ${stats.metal}],
                backgroundColor: ['#8d6e63', '#1e88e5', '#546e7a']
              }]
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.send("Error"); }
});

app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query('INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)', [uid, material, weight_kg]);
    res.status(200).send('OK');
  } catch (err) { res.status(500).send('Error'); }
});

app.listen(process.env.PORT || 10000);
