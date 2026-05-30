# Plan d'implémentation : Pages Légales (ToS & Politique de Confidentialité)

Ce document présente le plan pour ajouter deux pages de mentions légales nécessaires au jeu Wordle, en particulier pour sa validation et son référencement en tant qu'Activité Discord :
1. **Conditions d'Utilisation** (Terms of Service)
2. **Politique de Confidentialité** (Privacy Policy)

## User Review Required

> [!NOTE]
> Les deux pages seront intégrées dans le thème visuel sombre et moderne du jeu (teintes sombres `#121213`, police Inter de Google Fonts, et mise en page responsive soignée). Elles seront accessibles sous des URL claires et professionnelles : `/terms` et `/privacy`.

## Changements Proposés

### Création des Pages Web Légales

#### [NEW] [terms.html](file:///Users/s043204/dev/lfdq/wordle/src/terms.html)
Création d'une page HTML premium rédigée en français et en anglais détaillant les Conditions d'Utilisation :
- Acceptation des conditions.
- Description du jeu (reproduction récréative du concept Wordle).
- Utilisation acceptable et limitation de responsabilité.
- Liens vers le jeu et la politique de confidentialité.

#### [NEW] [privacy.html](file:///Users/s043204/dev/lfdq/wordle/src/privacy.html)
Création d'une page HTML premium rédigée en français et en anglais décrivant la Politique de Confidentialité :
- Collecte minimale : stockage uniquement du `playerId` (généré aléatoirement ou issu de l'ID unique Discord) et des statistiques associées (streak, parties jouées, tentatives).
- Aucun traceur publicitaire, aucun cookie de pistage tiers.
- Informations sur la sécurité des données et les droits des utilisateurs.

---

### Configuration du Serveur et Routage

#### [MODIFY] [index.ts](file:///Users/s043204/dev/lfdq/wordle/src/index.ts)
Mise à jour du gestionnaire de fichiers statiques pour rediriger proprement les URL `/terms` et `/privacy` vers leurs fichiers HTML correspondants :
```typescript
if (pathname === "/" || pathname === "/fr") {
  pathname = "/index.html";
} else if (pathname === "/en" || pathname === "/en/") {
  pathname = "/en.html";
} else if (pathname === "/terms") {
  pathname = "/terms.html";
} else if (pathname === "/privacy") {
  pathname = "/privacy.html";
}
```

---

## Plan de vérification

### Tests d'intégration et Accessibilité
1. **Compilation et Build** : Lancer `bun run build` pour vérifier que les nouveaux fichiers `terms.html` et `privacy.html` sont correctement identifiés et copiés/compilés dans le dossier final `dist/`.
2. **Vérification du routage** :
   - Tester l'accessibilité des URL `/terms` et `/privacy` sur le serveur local en s'assurant que les pages s'affichent correctement et proprement, sans renvoyer d'erreur 404 ni nécessiter l'extension `.html` dans la barre d'adresse.
3. **Qualité visuelle** : Inspecter le rendu visuel pour garantir une esthétique haut de gamme (sombre, aérée, et responsive).
