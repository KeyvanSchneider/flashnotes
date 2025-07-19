const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir les fichiers statiques depuis le dossier dist
app.use(express.static(path.join(__dirname, 'dist')));

// Pour toutes les routes, servir index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FlashNotes est disponible sur http://localhost:${PORT}`);
  console.log(`📁 Fichiers servis depuis: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Ouvrez votre navigateur sur: http://localhost:${PORT}`);
});