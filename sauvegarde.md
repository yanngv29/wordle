````markdown
# Système de sauvegarde anonyme pour jeu type Wordle

## Objectif

Mettre en place un système de sauvegarde :
- sans création de compte
- sans mot de passe
- sans authentification forte
- respectant au maximum la simplicité utilisateur

Le système doit permettre :
- sauvegarde des statistiques
- sauvegarde des streaks
- reprise d'une partie en cours
- éventuellement synchronisation multi-appareils

---

# Solution 2 — Identifiant anonyme automatique (UUID)

## Principe

Lors de la première visite :
- le frontend génère un identifiant unique anonyme (`UUID`)
- cet identifiant est stocké dans le navigateur (`localStorage`)
- toutes les statistiques utilisateur sont associées à cet UUID côté backend

L'utilisateur :
- ne voit aucun système de compte
- ne crée aucun mot de passe
- reste totalement anonyme

---

# Architecture

## Frontend

### Génération du playerId

```js
let playerId = localStorage.getItem("playerId");

if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem("playerId", playerId);
}
````

---

## Données stockées localement

### Exemple

```json
{
  "playerId": "9d5d1d1a-b9f0-4bcb-8e9f-4c8f5f6b1d4a",
  "settings": {
    "theme": "dark"
  }
}
```

---

## Backend

Le backend associe les statistiques au `playerId`.

### Exemple de structure

```json
{
  "playerId": "9d5d1d1a-b9f0-4bcb-8e9f-4c8f5f6b1d4a",
  "gamesPlayed": 42,
  "gamesWon": 35,
  "currentStreak": 12,
  "maxStreak": 18,
  "lastPlayedDate": "2026-05-16",
  "currentGame": {
    "attempts": ["CHAIR", "CHIEN"],
    "solution": "CHOIX"
  }
}
```

---

# API recommandée

## Sauvegarde des stats

### Endpoint

```http
POST /api/player/save
```

### Payload

```json
{
  "playerId": "uuid",
  "stats": {
    "gamesPlayed": 42,
    "gamesWon": 35
  }
}
```

---

## Chargement des stats

### Endpoint

```http
GET /api/player/:playerId
```

---

# Sécurité minimale

## Important

Le `playerId` n'est PAS sécurisé :

* il sert uniquement d'identifiant anonyme
* il ne protège pas contre la triche
* il ne doit jamais donner accès à des données sensibles

---

# Protection simple contre abus

## Recommandations

* limiter le rate limiting par IP
* limiter la taille des payloads
* vérifier les formats UUID
* ne jamais faire confiance aux stats envoyées par le client

---

# Gestion du Wordle quotidien

## Important

Le backend doit :

* fournir le mot du jour
* vérifier la date
* enregistrer les victoires

Le frontend ne doit pas décider seul :

* du mot du jour
* du streak
* de la validation de victoire

Sinon l'utilisateur peut :

* modifier son horloge système
* falsifier ses statistiques

---

# Avantages

## UX excellente

* aucune inscription
* aucun mot de passe
* expérience immédiate

## Technique simple

* backend léger
* faible complexité
* scalable facilement

## Vie privée

* aucune donnée personnelle obligatoire
* utilisateur anonyme

---

# Inconvénients

## Perte possible

Les données sont perdues si :

* le navigateur est vidé
* le stockage local est supprimé
* l'utilisateur change d'appareil

---

# Amélioration possible

Ajouter :

* export/import JSON
* synchronisation facultative
* système de récupération

---

# Solution 3 — Magic Link facultatif

## Principe

Le fonctionnement reste anonyme par défaut.

Optionnellement :

* l'utilisateur peut associer un email
* le serveur envoie un lien magique
* ce lien reconnecte automatiquement l'utilisateur

Aucun mot de passe n'est utilisé.

---

# Flux utilisateur

## Cas nominal

### Étape 1

Utilisateur clique :

```text
Sauvegarder ma progression
```

---

### Étape 2

Il entre simplement son email :

```text
utilisateur@example.com
```

---

### Étape 3

Le backend génère :

* un token sécurisé
* temporaire
* signé

---

### Étape 4

Envoi d'un email :

```text
Cliquez ici pour récupérer votre progression
```

---

### Étape 5

Le lien reconnecte automatiquement :

* le playerId
* les statistiques
* la progression

---

# Architecture recommandée

## Base de données

### Table player

```json
{
  "playerId": "uuid",
  "email": "utilisateur@example.com",
  "gamesPlayed": 42
}
```

---

## Table magic_links

```json
{
  "token": "secure-random-token",
  "playerId": "uuid",
  "expiresAt": "2026-05-16T18:00:00Z"
}
```

---

# API recommandée

## Demande de lien magique

```http
POST /api/auth/magic-link
```

### Payload

```json
{
  "email": "utilisateur@example.com"
}
```

---

## Validation du lien

```http
GET /api/auth/validate?token=xxxxx
```

---

# Sécurité recommandée

## Token

Le token doit :

* être aléatoire
* être long
* expirer rapidement
* être à usage unique

---

## Durée de validité

Recommandé :

* 15 minutes
* 30 minutes maximum

---

# Avantages

## Multi-appareils

L'utilisateur retrouve :

* ses stats
* ses streaks
* sa progression

---

## UX moderne

Pas de :

* mot de passe
* formulaire complexe
* compte traditionnel

---

## Récupération possible

Même si :

* le navigateur est vidé
* l'appareil change

---

# Inconvénients

## Backend plus complexe

Nécessite :

* gestion email
* SMTP
* génération de tokens
* sécurité supplémentaire

---

# RGPD

## UUID anonyme

Même sans email :

* un identifiant persistant peut être considéré comme une donnée personnelle indirecte

Il faut :

* expliquer le stockage
* permettre réinitialisation/suppression

---

## Magic Link

Avec email :

* consentement clair
* politique de confidentialité
* suppression des données
* conformité RGPD minimale

---

# Recommandation finale

## MVP recommandé

### Étape 1

Implémenter :

* UUID anonyme
* sauvegarde locale
* sync backend simple

### Étape 2

Ajouter plus tard :

* magic link facultatif
* récupération multi-device

---

# Conclusion

La combinaison idéale pour un Wordle moderne :

* expérience sans compte
* utilisateur anonyme
* sauvegarde automatique
* récupération facultative
* faible friction
* backend raisonnablement simple

Cette approche est utilisée par de nombreux jeux web modernes et offre un excellent compromis entre simplicité et persistance.

```
```
