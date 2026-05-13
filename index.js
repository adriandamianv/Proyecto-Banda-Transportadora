const express = require('express');
const { Pool } = require('pg');
const app = express();

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const pool = new Pool({
  connectionString: 'TU_INTERNAL_DATABASE_URL_AQUI', 
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

// --- RUTA PRINCIPAL (DASHBOARD RESPONSIVE MODO NOCHE) ---
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
      const fechaEC = new Date(r.fecha).toLocaleString('es-EC', { 
        timeZone: 'America/Guayaquil', hour12: true,
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      return `
        <div class="card" data-id="${r.id}">
          <div class="info">
            <div class="date">${fechaEC}</div>
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
            --bg: #0f111a;
            --card-bg: #1a1d29;
            --text: #ffffff;
            --accent: #00d4ff;
            --header-bg: #161925;
          }
          
          body { 
            font-family: 'Segoe UI', sans-serif; 
            margin: 0; background: var(--bg); color: var(--text);
            display: flex; flex-direction: column; align-items: center; 
          }

          .header { 
            background: var(--header-bg); width: 100%; padding: 15px 25px; 
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 2px solid var(--accent); box-sizing: border-box;
          }

          .main-container { 
            width: 95%; max-width: 1200px; margin: 20px 0;
            display: flex; flex-direction: column; gap: 20px;
          }

          /* GRID DINÁMICO: 1 columna en móvil, 2 en PC/Horizontal */
          @media (min-width: 850px) {
            .dashboard-grid {
              display: grid;
              grid-template-columns: 1.2fr 0.8fr;
              gap: 25px;
              align-items: start;
            }
          }

          .kpi-container { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .kpi-card { 
            background: var(--card-bg); padding: 20px; border-radius: 15px; 
            text-align: center; border-bottom: 3px solid var(--accent);
          }
          .kpi-value { font-size: 1.8em; font-weight: bold; color: var(--accent); }

          .card { 
            background: var(--card-bg); margin-bottom: 12px; padding: 15px; 
            border-radius: 12px; display: flex; justify-content: space-between; align-items: center;
            transition: 0.3s; border-left: 4px solid transparent;
          }
          .card:hover { background: #24283b; border-left-color: var(--accent); }

          .tag { padding: 4px 10px; border-radius: 15px; font-size: 0.7em; font-weight: bold; }
          .carton { background: #5d4037; } .papel { background: #1565c0; } .metal { background: #455a64; }
          
          .btn-export {
            background: var(--accent); color: #000; padding: 12px; 
            border-radius: 8px; text-decoration: none; font-weight: bold;
            display: block; text-align: center; margin-top: 15px;
          }

          canvas { background: var(--card-bg); border-radius: 15px; padding: 15px; }
          .section-title { border-left: 4px solid var(--accent); padding-left: 15px; margin-bottom: 15px; font-weight: bold; }
          
          #historial-scroll { max-height: 600px; overflow-y: auto; padding-right: 10px; }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div onclick="location.reload()" style="cursor:pointer; font-weight: bold; font-size: 1.2em;">📊 Dashboard Pro</div>
          <div style="font-size: 0.8em; color: var(--accent);">● MODO NOCHE ACTIVO</div>
        </div>

        <div class="main-container">
          <div class="dashboard-grid">
            
            <div class="stats-panel">
              <div class="kpi-container">
                <div class="kpi-card">
                  <div class="kpi-value">${result.rows.length}</div>
                  <div class="kpi-label">Objetos Totales</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-value">${(stats.totalPeso/1000).toFixed(2)}kg</div>
                  <div class="kpi-label">Peso Acumulado</div>
                </div>
              </div>
              
              <div class="section-title">Distribución de Materiales</div>
              <canvas id="myChart"></canvas>
              
              <a href="/exportar" class="btn-export">📥 Descargar Reporte CSV</a>
            </div>

            <div class="logs-panel">
              <div class="section-title">Historial en Tiempo Real</div>
              <div id="historial-scroll">
                ${tarjetas || '<p style="text-align:center; opacity:0.5;">Esperando datos del ESP32...</p>'}
              </div>
            </div>

          </div>
        </div>

        <script>
          const ctx = document.getElementById('myChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Cartón', 'Papel', 'Metal'],
              datasets: [{
                label: 'Cantidad',
                data: [${stats.carton}, ${stats.papel}, ${stats.metal}],
                backgroundColor: ['#8d6e63', '#1976d2', '#607d8b'],
                borderRadius: 8
              }]
            },
            options: { 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff' } }
                }
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
          
          // Recarga automática suave
          setTimeout(() => { location.reload(); }, 25000);
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send("Error de servidor"); }
});

// --- RECIBIR DATOS DEL ESP32 ---
app.post('/save_data', async (req, res) => {
  const { uid, material, weight_kg } = req.body;
  try {
    await pool.query('INSERT INTO registros (uid, material, peso) VALUES ($1, $2, $3)', [uid, material, weight_kg]);
    res.status(200).send('OK');
  } catch (err) { res.status(500).send('Error'); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor Dashboard corriendo en puerto ' + PORT));
