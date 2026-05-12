const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor UG Online');
});

app.post('/save_data', (req, res) => {
  console.log('--- Datos Recibidos ---');
  console.log(req.body);
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor corriendo en puerto: ' + PORT);
});
