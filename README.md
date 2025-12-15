# Team Retrospective

Application web de rétrospective d'équipe collaborative et auto-hébergée. Aucune dépendance externe à des APIs cloud n'est requise.

## Fonctionnalités

- **Gestion d'équipes** : Création d'équipes avec authentification par mot de passe
- **Templates de rétrospective** : Start/Stop/Continue, 4L (Liked/Learned/Lacked/Longed For), personnalisés
- **Phases de rétrospective** : Icebreaker, Brainstorm, Groupement, Vote, Discussion, Revue
- **Système de vote** : Votes configurables par personne
- **Suivi des actions** : Création, assignation et suivi des actions entre rétrospectives
- **Mode anonyme** : Brainstorming anonyme optionnel
- **Timer** : Minuteur configurable avec notification audio
- **Stockage local** : Toutes les données sont stockées dans le localStorage du navigateur

## Prérequis

- **Node.js** 20+ (pour le développement)
- **Docker** (pour le déploiement)
- **OpenShift CLI** (`oc`) ou **kubectl** (pour le déploiement Kubernetes)

## Développement local

### Option 1 : Node.js direct

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur http://localhost:3000

### Option 2 : Docker Compose

```bash
# Mode développement avec hot reload
docker-compose up dev

# Mode production local
docker-compose up app
```

- Mode dev : http://localhost:3000
- Mode production : http://localhost:8080

## Configuration pour proxy/MITM (Windows)

Si vous êtes derrière un proxy d'entreprise avec interception SSL (MITM) :

### Pour npm

Créez ou modifiez `~/.npmrc` :

```ini
proxy=http://proxy.example.com:8080
https-proxy=http://proxy.example.com:8080
strict-ssl=false
```

### Pour Docker

Créez `~/.docker/config.json` :

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

### Variables d'environnement

```powershell
# PowerShell
$env:HTTP_PROXY = "http://proxy.example.com:8080"
$env:HTTPS_PROXY = "http://proxy.example.com:8080"
$env:NO_PROXY = "localhost,127.0.0.1"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"  # Dev uniquement!
```

```cmd
:: CMD
set HTTP_PROXY=http://proxy.example.com:8080
set HTTPS_PROXY=http://proxy.example.com:8080
set NO_PROXY=localhost,127.0.0.1
set NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Build

```bash
# Build local
npm run build

# Build Docker
npm run docker:build
# ou
docker build -t team-retrospective .

# Lancer l'image Docker
npm run docker:run
# ou
docker run -p 8080:8080 team-retrospective
```

## Déploiement OpenShift

### Avec Kustomize

```bash
# Créer le namespace
oc new-project team-retrospective-dev

# Déployer en environnement de développement
oc apply -k k8s/overlays/dev

# Déployer en production
oc apply -k k8s/overlays/prod
```

### Build sur OpenShift (Source-to-Image)

```bash
# Créer une BuildConfig
oc new-build --name=team-retrospective \
  --binary \
  --strategy=docker

# Lancer le build
oc start-build team-retrospective --from-dir=. --follow

# Créer le déploiement
oc apply -k k8s/overlays/dev
```

### Avec un registry externe

```bash
# Tag et push vers votre registry
docker tag team-retrospective your-registry.com/team-retrospective:latest
docker push your-registry.com/team-retrospective:latest

# Mettre à jour le kustomization avec votre image
# Modifier k8s/overlays/prod/kustomization.yaml :
# images:
#   - name: team-retrospective
#     newName: your-registry.com/team-retrospective
#     newTag: latest

oc apply -k k8s/overlays/prod
```

## Déploiement Railway

Railway permet un déploiement simple en un clic depuis GitHub.

### Option 1 : Déploiement avec Docker (recommandé)

1. Connectez votre repo GitHub à Railway
2. Railway détecte automatiquement le `Dockerfile`
3. Le déploiement se fait automatiquement

Configuration dans `railway.toml` :
- Build : Dockerfile multi-stage avec nginx
- Health check : `/health`
- Port : géré automatiquement via `$PORT`

### Option 2 : Déploiement avec Nixpacks

Si vous préférez ne pas utiliser Docker :

1. Supprimez ou renommez le `Dockerfile`
2. Railway utilisera `nixpacks.toml` automatiquement
3. L'application sera servie via `npm run preview`

### Variables d'environnement

Railway injecte automatiquement la variable `PORT`. Aucune configuration supplémentaire n'est requise.

Pour la persistance des données (teams, actions, etc.), spécifiez un chemin en écriture via une variable d'environnement si le dossier de l'application est en lecture seule :

- `DATA_FILE_PATH=/data/data.json` (recommandé avec un volume Railway monté sur `/data`)
- ou `DATA_DIR=/tmp` pour utiliser un dossier temporaire (non persistant).

### Activer l'envoi d'emails (invitation par email)

Pour que l'envoi d'invitations par email fonctionne sur Railway, ajoutez des variables d'environnement SMTP :

1. Dans votre service Railway, ouvrez l'onglet **Variables**.
2. Ajoutez :
   - `SMTP_HOST` : nom d'hôte SMTP (ex. `smtp.gmail.com` ou hôte de votre provider)
   - `SMTP_PORT` : port (587 par défaut)
   - `SMTP_USER` et `SMTP_PASS` : identifiants SMTP
   - `SMTP_SECURE=true` si votre fournisseur impose TLS explicite (défaut activé sur le port 465)
   - `SMTP_REQUIRE_TLS=true` si le provider impose STARTTLS
   - `SMTP_IGNORE_TLS=true` pour un provider qui refuse STARTTLS
   - `FROM_EMAIL` (optionnel) si l'adresse d'expéditeur diffère de `SMTP_USER`
3. Sauvegardez puis relancez le déploiement ; l'UI affichera que l'email est prêt dès que `SMTP_HOST` est détecté.

En cas d'erreur `Connection timeout` / `ETIMEDOUT`, le host/port n'est pas joignable depuis Railway :

- Utilisez le bouton "Test SMTP" dans le modal d'invitation pour vérifier la connectivité en direct ; le message renvoyé contiendra le code d'erreur SMTP.
- Évitez les ports 25 et 465 souvent bloqués en egress ; essayez le port `587` avec STARTTLS (`SMTP_SECURE=false` ou vide) ou `2525` selon votre provider.
- Vérifiez les pare-feux / allowlists côté provider pour autoriser la sortie depuis Railway.
- Ajustez les timeouts si besoin avec `SMTP_CONNECTION_TIMEOUT` / `SMTP_GREETING_TIMEOUT` / `SMTP_SOCKET_TIMEOUT` (en ms).
- Si le provider impose TLS strict sur 465, activez `SMTP_SECURE=true`, mais privilégiez 587+STARTTLS quand c'est possible.

Alternative recommandée si l'egress SMTP est filtré : déployez le template **Resend Railway SMTP Gateway** (https://railway.com/deploy/resend-railway-smtp-gateway). Ce service tourne dans Railway et expose des credentials SMTP atteignables ; copiez l'hôte/le port/l'utilisateur/le mot de passe fournis vers `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (via Variables du service ou une Variable Set partagée), laissez `SMTP_SECURE=false` et utilisez STARTTLS sur 587 ou 2525.

Avec un provider type Mailtrap, vous pouvez copier les valeurs SMTP fournies par Mailtrap dans ces variables.

### Déploiement manuel via CLI

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Déployer
railway up
```

### Lien avec GitHub

```bash
# Lier à un repo existant
railway link

# Les déploiements seront automatiques à chaque push
```

## Structure du projet

```
.
├── App.tsx                 # Composant principal React
├── index.tsx               # Point d'entrée React
├── index.html              # Template HTML
├── index.css               # Styles Tailwind + CSS custom
├── types.ts                # Types TypeScript
├── components/
│   ├── Session.tsx         # Composant de session de rétrospective
│   ├── Dashboard.tsx       # Tableau de bord équipe
│   ├── TeamLogin.tsx       # Authentification
│   └── InviteModal.tsx     # Modal d'invitation
├── services/
│   └── dataService.ts      # Gestion des données localStorage
├── k8s/                    # Fichiers Kubernetes/OpenShift
│   ├── base/               # Configuration de base
│   └── overlays/           # Overlays dev/prod
├── Dockerfile              # Build production multi-stage
├── Dockerfile.dev          # Build développement
├── docker-compose.yml      # Orchestration locale
├── nginx.conf              # Configuration Nginx
├── railway.toml            # Configuration Railway (Docker)
├── nixpacks.toml           # Configuration Railway (Nixpacks)
├── vite.config.ts          # Configuration Vite
├── tailwind.config.js      # Configuration Tailwind
└── package.json            # Dépendances npm
```

## Sécurité

- L'application fonctionne entièrement côté client (pas de backend)
- Les données sont stockées dans le localStorage du navigateur
- Aucune donnée n'est envoyée vers des serveurs externes
- Le conteneur s'exécute en tant qu'utilisateur non-root (compatible OpenShift)
- Headers de sécurité configurés dans Nginx (X-Frame-Options, CSP, etc.)

## Personnalisation

### Modifier les couleurs

Éditez `tailwind.config.js` pour personnaliser la palette :

```javascript
colors: {
  retro: {
    bg: '#F8FAFC',
    primary: '#6366F1',      // Couleur principale
    primaryHover: '#4F46E5',
    secondary: '#CBD5E1',
    dark: '#0F172A',
  }
}
```

### Ajouter des templates de rétrospective

Modifiez la fonction `getPresets()` dans `services/dataService.ts`.

## Licence

MIT
