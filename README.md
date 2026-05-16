# Le Mot - Wordle en Français & English

[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-fbf0df?style=flat&logo=bun&logoColor=black)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)

Un clone moderne et élégant du jeu Wordle, disponible en **Français** et **Anglais**.

Ce projet a été développé en collaboration avec **Yann**,  **Antigravity** (gemini 3 flash) et **GitHub Copilot** (Claude Haiku 4.5).

### Propos de Yann
Je n'ai fait que prompter. Fait amusant : Copilot a retiré le crédit a Antigravity ;-) lors de l'update du readme.
---

## 🌍 Multilingue (Français 🇫🇷 / Anglais 🇬🇧)

Le jeu est maintenant disponible en deux langues avec une expérience complètement adaptée :

| Langue | URL | Clavier | Dictionnaire |
|--------|-----|---------|--------------|
| 🇫🇷 **Français** | `/` ou `/fr` | AZERTY | 4,448 mots |
| 🇬🇧 **Anglais** | `/en` | QWERTY | 3,103 mots |

Un **bouton de changement de langue** en haut à droite permet de basculer facilement entre les deux versions.

---

## 🇫🇷 Français

### À propos du projet
"Le Mot" est une version moderne du célèbre jeu de réflexion Wordle. Construit avec **Bun**, **React 19** et **Tailwind CSS 4**, il offre une expérience fluide, rapide et visuellement premium.

### Règles du jeu
Le but est de deviner un mot de **5 lettres** en **6 essais** maximum.
Après chaque tentative, la couleur des lettres change pour indiquer votre progression :

*   🟩 **VERT** : La lettre est correcte et à la bonne place.
*   🟨 **ORANGE** : La lettre est présente dans le mot mais à la mauvaise place.
*   ⬛ **GRIS** : La lettre n'est pas présente dans le mot.

### Caractéristiques
*   **🌐 Support Multilingue** : Français (AZERTY) et Anglais (QWERTY) avec dictionnaires dédiés.
*   **Dictionnaire Riche** : Plus de 4,400 mots français et 3,100 mots anglais de 5 lettres.
*   **Design Premium** : Mode sombre natif avec animations fluides.
*   **Claviers Adaptés** : AZERTY pour français, QWERTY pour anglais.
*   **Gestion des Accents** : Saisie intelligente qui normalise automatiquement les caractères accentués.
*   **Port Paramétrable** : Lancez le serveur sur un port personnalisé avec `PORT=8080 bun run dev`.

---

## 🇬🇧 English

### About the Project
"Le Mot" is a modern take on the famous puzzle game Wordle. Built using **Bun**, **React 19**, and **Tailwind CSS 4**, it provides a smooth, fast, and premium visual experience. **Now available in both French and English!**

### Game Rules
The goal is to guess a **5-letter** word in **6 attempts** or less.
After each guess, the color of the tiles will change to show how close your guess was:

*   🟩 **GREEN**: The letter is correct and in the right spot.
*   🟨 **ORANGE**: The letter is in the word but in the wrong spot.
*   ⬛ **GRAY**: The letter is not in the word at all.

### Features
*   **🌐 Multilingual Support**: French (AZERTY) and English (QWERTY) with dedicated dictionaries.
*   **Extensive Dictionary**: Over 4,400 French 5-letter words and 3,100 English words.
*   **Premium Design**: Native dark mode with smooth animations.
*   **Adaptive Keyboards**: AZERTY for French, QWERTY for English.
*   **Smart Input**: Automatic normalization of French accented characters.
*   **Customizable Port**: Run the server on a custom port with `PORT=8080 bun run dev`.

---

## 🚀 Installation & Développement

Assurez-vous d'avoir [Bun](https://bun.sh) installé.

```bash
# Installation des dépendances
bun install

# Lancer le serveur de développement (construction + serveur)
bun run dev

# Ou construire et lancer en production
bun run build
NODE_ENV=production bun run start
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour jouer.

### Port Personnalisé

```bash
# Lancer sur le port 8080
PORT=8080 bun run dev

# Ou définir dans un fichier .env
echo "PORT=8080" > .env
bun run dev
```

---

## 🛣️ Routage Multilingue

| URL | Langue | Clavier |
|-----|--------|---------|
| `/` | 🇫🇷 Français (défaut) | AZERTY |
| `/fr` | 🇫🇷 Français | AZERTY |
| `/en` | 🇬🇧 Anglais | QWERTY |

Un bouton en haut à droite permet de basculer entre les deux versions.

---

## 🔌 API Endpoints

Le serveur expose deux endpoints API pour les opérations du jeu :

### GET `/api/random-word?lang=fr|en`
Retourne un mot aléatoire pour la langue spécifiée.

```bash
curl http://localhost:3000/api/random-word?lang=fr
# Réponse: { "word": "ABACA" }
```

### GET `/api/validate-word?lang=fr|en&word=XXXXX`
Valide si un mot existe dans le dictionnaire.

```bash
curl http://localhost:3000/api/validate-word?lang=fr&word=ABACA
# Réponse: { "isValid": true }

curl http://localhost:3000/api/validate-word?lang=en&word=HELLO
# Réponse: { "isValid": true }
```

---

## 🏗️ Architecture

- **Frontend** : React 19 avec Tailwind CSS 4
- **Backend** : Bun avec serveur HTTP statique + API
- **Build** : Bun build avec support des fichiers HTML séparés (FR/EN)
- **Dictionnaires** : Chargés au démarrage du serveur pour optimiser les performances

### Structure des Fichiers

```
src/
  ├── index.html        # HTML français (FR)
  ├── en.html          # HTML anglais (EN)
  ├── frontend.tsx     # Point d'entrée React (partagé)
  ├── App.tsx          # Composant principal (multilingue)
  ├── index.ts         # Serveur Bun (routage + API)
  ├── dictionaries.ts  # Chargement des dictionnaires
  ├── words.ts         # Ré-exports pour rétro-compatibilité
  └── index.css        # Styles Tailwind

dist/                  # Fichiers compilés (généré par `bun run build`)
  ├── index.html       # HTML français compilé
  ├── en.html         # HTML anglais compilé
  └── chunk-*.js      # JavaScript bundlé

### Crédits et Contributeurs

**Développeurs:**
- **Yann** - Auteur principal
- **Gemini / Antigravity ** - Version initiale du projet
  - passe souvent derrière Copilot pour réparer.
- **GitHub Copilot** (Claude Haiku 4.5) - Implémentation du support multilingue (mai 2026):
  - Architecture multilingue FR/EN
  - Claviers adaptés (AZERTY/QWERTY)
  - Création des dictionnaires séparés
  - Endpoints API pour validation et mots aléatoires
  - Port paramétrable
  - Build workflow optimisé

**Dictionnaires:**
- Français : `ods.txt`
- Anglais : `5letter.words.list.txt`

### Remerciements

Merci à [Bun](https://bun.sh) pour le runtime ultra-rapide, [React](https://react.dev) pour l'UI framework et [Tailwind CSS](https://tailwindcss.com) pour le système de design.
