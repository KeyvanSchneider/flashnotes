# FlashNotes 📚

Une application de prise de notes intelligente avec système de flashcards intégré pour optimiser l'apprentissage et la mémorisation.

![FlashNotes](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.1-blue)
![Vite](https://img.shields.io/badge/Vite-5.4.2-purple)

## ✨ Fonctionnalités

### 📝 **Prise de notes avancée**
- Éditeur riche avec formatage (gras, italique, souligné)
- Support des couleurs de texte et surlignage
- Insertion d'images avec redimensionnement
- Organisation hiérarchique en dossiers et sous-dossiers
- Recherche dans les notes
- Sauvegarde automatique

### 🎯 **Système de flashcards**
- Création automatique de flashcards depuis le texte sélectionné
- Système de révision avec évaluation (Facile/À revoir)
- Mode focus pour une révision immersive
- Statistiques de révision
- Organisation par tags
- Modes de révision : note actuelle, dossier, toutes les cartes

### 🗂️ **Organisation intelligente**
- Structure hiérarchique de dossiers
- Drag & drop pour réorganiser notes et dossiers
- Comptage automatique des notes (incluant sous-dossiers)
- Interface sidebar collapsible
- Gestion des états avec React Context

### 💾 **Persistance des données**
- Sauvegarde automatique dans localStorage
- Restauration automatique au rechargement
- Aucune perte de données

## 🚀 Installation et lancement

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/flashnotes.git
cd flashnotes

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 🛠️ Technologies utilisées

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Icons**: Lucide React
- **State Management**: React Context + useReducer
- **Storage**: localStorage avec hook personnalisé

## 📁 Structure du projet

```
src/
├── components/          # Composants React
│   ├── Layout.tsx      # Layout principal
│   ├── Sidebar.tsx     # Barre latérale avec navigation
│   ├── NoteEditor.tsx  # Éditeur de notes
│   └── FlashcardPanel.tsx # Panel de révision
├── context/            # Gestion d'état
│   └── AppContext.tsx  # Context principal
├── hooks/              # Hooks personnalisés
│   └── useLocalStorage.ts
├── types.ts           # Types TypeScript
├── utils/             # Utilitaires
└── index.css         # Styles globaux
```

## 🎨 Fonctionnalités détaillées

### Éditeur de notes
- **Formatage riche** : Gras, italique, souligné
- **Couleurs** : Texte et surlignage personnalisables
- **Images** : Upload et redimensionnement interactif
- **Alignement** : Gauche, centre, droite
- **Tailles de police** : 8pt à 36pt

### Système de flashcards
- **Création rapide** : Sélectionnez du texte → Créez une flashcard
- **Révision adaptative** : Système d'évaluation simple
- **Mode focus** : Interface plein écran pour la révision
- **Statistiques** : Suivi des performances de révision

### Organisation
- **Hiérarchie** : Dossiers, sous-dossiers illimités
- **Drag & Drop** : Réorganisation intuitive
- **Recherche** : Filtrage en temps réel
- **Compteurs** : Nombre de notes par dossier (récursif)

## 🔧 Configuration

L'application fonctionne sans configuration supplémentaire. Toutes les données sont stockées localement dans le navigateur.

## 📱 Responsive Design

L'interface s'adapte automatiquement aux différentes tailles d'écran :
- **Desktop** : Interface complète avec sidebar
- **Mobile** : Sidebar collapsible, interface optimisée

## 🤝 Contribution

Les contributions sont les bienvenues ! 

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🎯 Roadmap

- [ ] Export/Import de notes en JSON/Markdown
- [ ] Synchronisation cloud
- [ ] Thèmes sombres/clairs
- [ ] Raccourcis clavier
- [ ] Plugin système pour extensions
- [ ] Mode collaboratif
- [ ] Application mobile

## 📞 Support

Si vous rencontrez des problèmes ou avez des questions :
- Ouvrez une [issue](https://github.com/votre-username/flashnotes/issues)
- Consultez la [documentation](https://github.com/votre-username/flashnotes/wiki)

---

Développé avec ❤️ pour optimiser l'apprentissage et la prise de notes.