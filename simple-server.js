const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(__dirname));

// Pour les modules ES6, servir avec le bon type MIME
app.use('/src', express.static(path.join(__dirname, 'src'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de développement sur http://localhost:${PORT}`);
  console.log(`📝 Ouvrez votre navigateur et allez à l'adresse ci-dessus`);
});