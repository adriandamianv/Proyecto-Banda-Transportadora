# Proyecto Banda Transportadora — Dashboard de Reciclaje

Sistema de monitoreo de reciclaje (**Telemática UG**). Una banda transportadora con
balanza y lector de UID registra materiales (cartón, papel, metal) y los muestra en
un dashboard web en tiempo real respaldado por **PostgreSQL**.

## Características

- Recepción de datos desde el ESP32 vía `POST /save_data`.
- Dashboard responsive "modo noche" con gráfico de barras (Chart.js) y KPIs
  (objetos totales, peso acumulado).
- Exportación de reportes a CSV (`GET /exportar`).
- Auto-refresco cada 25 s y notificación a apps móviles (Kodular / AppInventor).

## Endpoints

| Método | Ruta        | Descripción                                                       |
|--------|-------------|-------------------------------------------------------------------|
| POST   | `/save_data`| Inserta `{ uid, material, weight_kg }` en la base de datos.       |
| GET    | `/`         | Dashboard con historial y estadísticas.                           |
| GET    | `/exportar` | Descarga el reporte completo en CSV.                              |

## Base de datos

La tabla `registros` (PostgreSQL) guarda: `id`, `uid`, `material`, `peso`, `fecha`.

## Configuración

La conexión a la base de datos se pasa vía `connectionString` (Render PostgreSQL).
**Recomendado:** moverla a una variable de entorno `DATABASE_URL` en lugar de
hardcodearla, y evitar `rejectUnauthorized: false` en producción.

## Cómo ejecutar

```bash
npm install
npm start
```
