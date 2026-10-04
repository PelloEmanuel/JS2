// Servidor Express: entrega la página y guarda los .txt en la carpeta data/
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PUERTO = 3000;
const raiz = path.join(__dirname, '..');
const carpetaData = path.join(raiz, 'data');

fs.mkdirSync(carpetaData, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use('/styles', express.static(path.join(raiz, 'styles')));

app.get('/', (req, res) => {
  res.sendFile(path.join(raiz, 'pages', 'index.html'));
});

app.get('/modules/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'script.js'));
});

// Recibe el nombre y el contenido, y crea el archivo dentro de data/
app.post('/guardar', (req, res) => {
  const { archivo, contenido } = req.body;
  const nombreValido = typeof archivo === 'string' && /^[A-Za-z0-9_-]+\.txt$/.test(archivo);
  if (!nombreValido || typeof contenido !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos.' });
  }

  // Si el nombre ya existe, agrega un número para no pisar el archivo anterior
  let nombreFinal = archivo;
  let repeticion = 1;
  while (fs.existsSync(path.join(carpetaData, nombreFinal))) {
    repeticion++;
    nombreFinal = archivo.replace('.txt', '_' + repeticion + '.txt');
  }

  fs.writeFile(path.join(carpetaData, nombreFinal), contenido, 'utf8', (error) => {
    if (error) return res.status(500).json({ error: 'No se pudo escribir el archivo.' });
    res.json({ archivo: nombreFinal });
  });
});

app.listen(PUERTO, () => {
  console.log('Servidor listo en http://localhost:' + PUERTO);
});
