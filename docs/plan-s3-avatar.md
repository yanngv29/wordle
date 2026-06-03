Explore Wordle codebase for avatar feature planning

Comprehensive codebase exploration

Read [](file:///Users/s043204/dev/lfdq/wordle/src/index.ts#1-1), lines 1 to 200

Read [](file:///Users/s043204/dev/lfdq/wordle/package.json)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/db/sqlite.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/db/types.ts)

Read memory

Read [](file:///Users/s043204/dev/lfdq/wordle/src/frontend.tsx)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/db/mongo.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/discord/verify.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/db.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/App.tsx#1-1), lines 1 to 300

Searched for regex `s3|aws|S3|AWS|cloud|upload|bucket`, 20 results

Read [](file:///Users/s043204/dev/lfdq/wordle/src/dailyWord.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/discord/commands.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/index.ts#200-200), lines 200 to 200

Read [](file:///Users/s043204/dev/lfdq/wordle/src/index.html)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/dictionaries.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/build.ts#1-1), lines 1 to 100

Read [](file:///Users/s043204/dev/lfdq/wordle/src/index.ts#200-200), lines 200 to 313

Read [](file:///Users/s043204/dev/lfdq/wordle/src/App.tsx#300-300), lines 300 to 500

Read [](file:///Users/s043204/dev/lfdq/wordle/src/en.html)

Read [](file:///Users/s043204/dev/lfdq/wordle/bunfig.toml)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/App.tsx#200-200), lines 200 to 500

Read [](file:///Users/s043204/dev/lfdq/wordle)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/words.ts)

Read [](file:///Users/s043204/dev/lfdq/wordle/.env.example)

Read [](file:///Users/s043204/dev/lfdq/wordle/README.md)

Read [](file:///Users/s043204/dev/lfdq/wordle/src/App.tsx#300-300), lines 300 to 500

Read [](file:///Users/s043204/Library/Application%20Support/Code/User/workspaceStorage/92daf4a9d0108792a15026243e22ad30/GitHub.copilot-chat/chat-session-resources/54ed57e3-3b07-46d6-b199-ad80e53f46c5/toolu_016PU9ay7mUSCKBhJUQTnpWh__vscode-1780429437057/content.txt#1-1), lines 1 to 500

Read [](file:///Users/s043204/Library/Application%20Support/Code/User/workspaceStorage/92daf4a9d0108792a15026243e22ad30/GitHub.copilot-chat/chat-session-resources/54ed57e3-3b07-46d6-b199-ad80e53f46c5/toolu_016PU9ay7mUSCKBhJUQTnpWh__vscode-1780429437057/content.txt#500-500), lines 500 to 569

Parfait ! J'ai exploré le codebase. Voici mes questions de clarification avant de créer le plan détaillé : 

Analyse en cours de vos réponses...

Excellent ! Créons le plan d'action détaillé : 

Created memory file [](file:///Users/s043204/Library/Application%20Support/Code/User/workspaceStorage/92daf4a9d0108792a15026243e22ad30/GitHub.copilot-chat/memory-tool/memories/NTRlZDU3ZTMtM2IwNy00NmQ2LWIxOTktYWQ4MGU1M2Y0NmM1/avatar-plan.md)

## Plan : Ajouter la fonctionnalité Avatar avec AWS S3

**TL;DR** — Permettre aux joueurs d'uploader un avatar (200x200px), stocker sur AWS S3, servir via API avec cache HTTP. Avatar affiché en header + menu profil.

---

### **Phases d'implémentation**

#### **Phase 1 : Backend Infrastructure**
1. Ajouter AWS SDK (`@aws-sdk/client-s3`) et `sharp` (compression image)
2. Configurer variables d'environnement (AWS_REGION, AWS_S3_BUCKET, credentials)
3. Modifier schéma DB : ajouter colonne `avatarKey` à la table `players`
4. Créer service S3 (src/services/s3-service.ts) avec méthodes upload/getUrl/delete

#### **Phase 2 : Backend API Endpoints**
5. **POST /api/avatar/upload** — Accepte image multipart, valide, compresse (200x200px), upload S3, met à jour DB
6. **GET /api/avatar/{playerId}** — Retourne image avec cache headers (ETag, Cache-Control: 1 an)
7. **DELETE /api/avatar/{playerId}** — Supprime avatar (optionnel)

#### **Phase 3 : Frontend - Upload**
8. Créer `AvatarUpload.tsx` — Input file, preview, compression client-side, POST upload
9. Intégrer dans menu burger — Section profil avec upload form + bouton "Changer avatar"

#### **Phase 4 : Frontend - Display**
10. Créer `Avatar.tsx` component — Affiche avatar avec fallback (initiales/icône)
11. Intégrer en header (coin droit, 40px) — Click ouvre menu profil
12. Intégrer en menu — Avatar plus grand (80px) + statistiques

#### **Phase 5 : Validation & Polish**
13. Migration schéma pour joueurs existants (backward compatible)
14. Tests : upload, affichage, cache, changement avatar, gestion erreurs

---

### **Architecture Data**

```
Player Upload Image (200x200)
  ↓
POST /api/avatar/upload
  ↓
Validation + Compression (sharp)
  ↓
Upload to S3 (avatars/{playerId}.webp)
  ↓
UPDATE players SET avatarKey = "avatars/{playerId}.webp"
  ↓
GET /api/avatar/{playerId} [Cache-Control: 1 year]
  ↓
Display in UI (header + menu)
```

---

### **Relevant Files**
- **New** : src/services/s3-service.ts — Service AWS S3
- **New** : src/AvatarUpload.tsx — Component upload
- **New** : src/Avatar.tsx — Component affichage
- **Modify** : App.tsx — Ajouter avatar en header + menu
- **Modify** : index.ts — Endpoints /api/avatar/*
- **Modify** : db.ts — Schéma DB (colonne avatarKey)
- **Modify** : package.json — Ajouter `@aws-sdk/client-s3` + `sharp`

---

### **Environment Variables à ajouter**
```bash
AWS_REGION=eu-west-1
AWS_S3_BUCKET=your-bucket-name (à créer manuellement)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_AVATAR_FOLDER=avatars/
AVATAR_MAX_SIZE_MB=5
```

---

### **Decisions prises**
- **DB Storage** : Colonne `avatarKey` dans `players` (simple, une image par joueur)
- **Display** : Header (40px) + Menu profil (80px)
- **Cache** : HTTP headers (ETag, Last-Modified, Cache-Control)
- **Update** : Remplacer l'image (une seule à la fois)
- **S3 Config** : Paramétré via variables d'environnement

