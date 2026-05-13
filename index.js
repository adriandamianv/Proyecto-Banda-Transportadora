const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: 'postgresql://db_banda_bvov_user:ulbzic1SYMcuwBNP8QzvEeOt3yCn38Dg@dpg-d81pe957vvec738ja0tg-a/db_banda_bvov',
  ssl: { rejectUnauthorized: false }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- RUTA PARA EXPORTAR CSV ---
app.get('/exportar', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    const campos = ['id', 'uid', 'material', 'peso', 'fecha'];
    let csv = campos.join(',') + '\n';
    
    result.rows.forEach(row => {
      csv += `${row.id},${row.uid},${row.material},${row.peso},"${row.fecha}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_reciclaje_UG.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).send("Error al exportar");
  }
});

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY fecha DESC');
    
    const stats = { carton: 0, papel: 0, metal: 0, totalPeso: 0 };
    result.rows.forEach(r => {
      const mat = r.material.toLowerCase();
      if(stats.hasOwnProperty(mat)) stats[mat]++;
      stats.totalPeso += parseFloat(r.peso || 0);
    });

    let tarjetas = result.rows.map(r => {
      const matClass = r.material.toLowerCase();
      return `
        <div class="card" data-id="${r.id}">
          <div class="info">
            <div class="date">${new Date(r.fecha).toLocaleTimeString()}</div>
            <div class="uid">UID: ${r.uid}</div>
            <span class="tag ${matClass}">${r.material}</span>
          </div>
          <div class="weight">${r.peso}g</div>
        </div>`;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard Reciclaje UG</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          :root {
            --bg: #121212;
            --card-bg: #1e1e1e;
            --text: #ffffff;
            --accent: #00d4ff;
            --header-bg: #1a1a1a;
          }
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; background: var(--bg); color: var(--text);
            display: flex; flex-direction: column; align-items: center; 
          }
          .header { 
            background: var(--header-bg); width: 100%; padding: 15px; 
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 2px solid var(--accent); box-sizing: border-box;
          }
          .main-container { width: 95%; max-width: 550px; margin-top: 20px; }
          
          /* Estilo Power BI KPI */
          .kpi-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .kpi-card { 
            background: var(--card-bg); padding: 15px; border-radius: 12px; 
            text-align: center; border-left: 4px solid var(--accent);
          }
          .kpi-value { font-size: 1.5em; font-weight: bold; color: var(--accent); }
          .kpi-label { font-size: 0.8em; opacity: 0.7; }

          .card { 
            background: var(--card-bg); margin-bottom: 10px; padding: 15px; 
            border-radius: 12px; display: flex; justify-content: space-between; align-items: center;
          }
          .tag { padding: 4px 10px; border-radius: 15px; font-size: 0.7em; font-weight: bold; }
          .carton { background: #5d4037; } .papel { background: #1565c0; } .metal { background: #455a64; }
          
          .btn-export {
            background: var(--accent); color: #000; padding: 10px 20px; 
            border-radius: 8px; text-decoration: none; font-weight: bold;
            display: block; text-align: center; margin: 20px 0;
          }
          .section { display: none; } .active { display: block; }
          canvas { background: #1e1e1e; border-radius: 12px; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div onclick="location.reload()" style="cursor:pointer">📊 Dashboard Pro</div>
          <div style="font-size: 0.8em; color: var(--accent);">Modo Noche Activo</div>
        </div>

        <div class="main-container">
          <div class="kpi-container">
            <div class="kpi-card">
              <div class="kpi-value">${result.rows.length}</div>
              <div class="kpi-label">Objetos Totales</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${(stats.totalPeso/1000).toFixed(2)}kg</div>
              <div class="kpi-label">Peso Total</div>
            </div>
          </div>

          <canvas id="myChart" style="margin-bottom: 20px;"></canvas>

          <a href="/exportar" class="btn-export">📥 Descargar Reporte CSV</a>

          <div id="historial" class="section active">
            <h3 style="border-left: 3px solid var(--accent); padding-left: 10px;">Logs en Tiempo Real</h3>
            <div>${tarjetas}</div>
          </div>
        </div>

        <script>
          const ctx = document.getElementById('myChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Cartón', 'Papel', 'Metal'],
              datasets: [{
                label: 'Cantidad por Material',
                data: [${stats.carton}, ${stats.papel}, ${stats.metal}],
                backgroundColor: ['#8d6e63', '#1976d2', '#607d8b']
              }]
            },
            options: { 
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
          });

          // Notificación Kodular
          let ultimoID = localStorage.getItem('ultimoID') || 0;
          setInterval(() => {
            const pc = document.querySelector('.card');
            if (pc) {
              const id = pc.getAttribute('data-id');
              if (ultimoID != 0 && id > ultimoID) {
                if (window.AppInventor) window.AppInventor.setWebViewString("NUEVO_DATO");
              }
              ultimoID = id;
              localStorage.setItem('ultimoID', ultimoID);
            }
          }, 5000);
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Dashboard Dark activo'));
