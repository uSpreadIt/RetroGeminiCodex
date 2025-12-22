# Guide de Maintenance - RetroGeminiCodex

Ce guide explique comment utiliser les outils de qualité et de maintenance du projet.

## 📦 Installation

Après avoir cloné le dépôt, installez toutes les dépendances :

```bash
npm install
```

## 🧪 Tests

### Exécuter les tests

```bash
# Exécuter tous les tests une fois
npm test

# Exécuter les tests en mode watch (re-run automatique)
npm run test:watch

# Exécuter les tests avec couverture de code
npm run test:coverage

# Exécuter les tests avec une interface graphique
npm run test:ui
```

### Structure des tests

Les tests sont organisés dans le répertoire `__tests__/` :

- `__tests__/example.test.ts` - Exemples de tests de base
- `__tests__/security.test.ts` - Tests de sécurité
- `__tests__/App.test.tsx` - Tests des composants React

### Écrire de nouveaux tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Ma fonctionnalité', () => {
  it('devrait faire quelque chose', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Pour les composants React :

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MonComposant from './MonComposant';

describe('MonComposant', () => {
  it('devrait s\'afficher correctement', () => {
    render(<MonComposant />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 🔍 Analyse Statique (Linting)

### Exécuter ESLint

```bash
# Analyser le code
npm run lint

# Analyser et corriger automatiquement les erreurs
npm run lint:fix
```

### Configuration ESLint

La configuration se trouve dans `eslint.config.js`. Elle inclut :

- Support TypeScript
- Support React et React Hooks
- Règles de sécurité
- Règles de qualité du code

## 📝 Vérification des Types TypeScript

```bash
# Vérifier les types sans générer de fichiers
npm run type-check
```

Cette commande vérifie que tout votre code TypeScript est correctement typé.

## 🔒 Audits de Sécurité

### Audit des dépendances npm

```bash
# Vérifier les vulnérabilités (niveau modéré et supérieur)
npm run security:audit

# Corriger automatiquement les vulnérabilités (quand possible)
npm run security:fix
```

### Audit manuel

```bash
# Audit complet avec détails
npm audit

# Audit avec niveau de sévérité spécifique
npm audit --audit-level=high
```

## 🚀 CI/CD - GitHub Actions

### Workflows Configurés

Le projet utilise plusieurs workflows GitHub Actions :

#### 1. CI Principal (`.github/workflows/ci.yml`)

**Déclenché sur** : Push et Pull Requests

**Étapes** :
- ✅ Lint du code
- ✅ Vérification TypeScript
- ✅ Tests avec couverture
- ✅ Build de production
- ✅ Audit de sécurité

**Matrices** : Teste sur Node.js 20.x et 22.x

#### 2. CodeQL (`.github/workflows/codeql.yml`)

**Déclenché sur** :
- Push sur main/master/develop
- Pull Requests
- Tous les lundis à 6h UTC (automatique)

**But** : Analyse de sécurité avancée du code

#### 3. Dependency Review (`.github/workflows/dependency-review.yml`)

**Déclenché sur** : Pull Requests

**But** : Vérifie les nouvelles dépendances pour les vulnérabilités

### Voir les résultats CI

1. Allez sur l'onglet "Actions" de votre dépôt GitHub
2. Cliquez sur un workflow pour voir les détails
3. Les échecs sont marqués en rouge, les succès en vert

## 🤖 Dependabot

Dependabot est configuré dans `.github/dependabot.yml` pour :

- **npm** : Vérification quotidienne des mises à jour
- **GitHub Actions** : Vérification hebdomadaire
- **Docker** : Vérification hebdomadaire

### Gérer les PRs Dependabot

Quand Dependabot crée une PR :

1. Vérifiez que les tests CI passent
2. Lisez le changelog si disponible
3. Mergez la PR si tout est OK
4. Ou commentez `@dependabot rebase` pour rebaser la PR

Commandes Dependabot utiles :
- `@dependabot rebase` - Rebaser la PR
- `@dependabot recreate` - Recréer la PR
- `@dependabot merge` - Merger automatiquement
- `@dependabot close` - Fermer la PR
- `@dependabot ignore this dependency` - Ignorer cette dépendance

## 📊 Couverture de Code

### Objectifs de Couverture

Le projet vise les objectifs suivants :

- **Lignes** : 70% minimum
- **Fonctions** : 70% minimum
- **Branches** : 70% minimum
- **Statements** : 70% minimum

### Voir le rapport de couverture

Après avoir exécuté `npm run test:coverage` :

```bash
# Le rapport est disponible dans coverage/index.html
# Ouvrez-le dans votre navigateur
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## 🔄 Workflow de Développement Recommandé

### Avant de Commit

```bash
# 1. Formater et corriger le code
npm run lint:fix

# 2. Vérifier les types
npm run type-check

# 3. Lancer les tests
npm test

# 4. (Optionnel) Vérifier la couverture
npm run test:coverage
```

### Avant de Push

```bash
# Lancer le CI complet en local
npm run ci

# Ou individuellement :
npm run lint
npm run type-check
npm run test
npm run build
```

### Créer une Pull Request

1. Créez une branche depuis `develop` ou `main`
2. Faites vos changements
3. Commitez avec des messages clairs
4. Pushez votre branche
5. Créez une PR sur GitHub
6. Attendez que tous les checks CI passent ✅
7. Demandez une review si nécessaire
8. Mergez quand approuvé

## 🛠️ Scripts npm Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrer le serveur de développement Vite |
| `npm run build` | Build de production |
| `npm start` | Démarrer le serveur Node.js |
| `npm test` | Exécuter les tests |
| `npm run test:watch` | Tests en mode watch |
| `npm run test:coverage` | Tests avec couverture |
| `npm run test:ui` | Interface graphique pour les tests |
| `npm run lint` | Analyser le code avec ESLint |
| `npm run lint:fix` | Corriger automatiquement les erreurs ESLint |
| `npm run type-check` | Vérifier les types TypeScript |
| `npm run security:audit` | Audit de sécurité des dépendances |
| `npm run security:fix` | Corriger les vulnérabilités |
| `npm run ci` | Exécuter tous les checks CI en local |

## 📁 Structure des Fichiers de Configuration

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI principal
│   │   ├── codeql.yml                # Analyse de sécurité
│   │   └── dependency-review.yml     # Review des dépendances
│   └── dependabot.yml                # Configuration Dependabot
├── __tests__/                        # Tests
│   ├── example.test.ts               # Exemples de tests
│   ├── security.test.ts              # Tests de sécurité
│   └── App.test.tsx                  # Tests React
├── eslint.config.js                  # Configuration ESLint
├── vitest.config.ts                  # Configuration Vitest
├── vitest.setup.ts                   # Setup des tests
├── tsconfig.json                     # Configuration TypeScript
└── package.json                      # Scripts et dépendances
```

## 🐛 Dépannage

### Les tests ne passent pas

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
npm test
```

### ESLint trouve trop d'erreurs

```bash
# Corriger automatiquement ce qui peut l'être
npm run lint:fix

# Puis corriger manuellement le reste
npm run lint
```

### Les types TypeScript ne sont pas corrects

```bash
# Vérifier les erreurs de type
npm run type-check

# Parfois, redémarrer l'éditeur aide
# Ou supprimer le cache TypeScript
rm -rf .tsbuildinfo
```

### npm audit trouve des vulnérabilités

```bash
# Essayer de les corriger automatiquement
npm audit fix

# Si ça ne marche pas, forcer les mises à jour (attention !)
npm audit fix --force

# Vérifier les vulnérabilités restantes
npm audit
```

## 📚 Ressources

- [Vitest Documentation](https://vitest.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Testing Library](https://testing-library.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [CodeQL](https://codeql.github.com/)

## 💡 Bonnes Pratiques

### Tests

1. **Écrivez des tests pour chaque nouvelle fonctionnalité**
2. **Visez 80%+ de couverture pour le code critique**
3. **Testez les cas limites et les erreurs**
4. **Utilisez des noms de tests descriptifs**
5. **Gardez les tests simples et lisibles**

### Code Quality

1. **Corrigez les erreurs ESLint avant de commit**
2. **Utilisez TypeScript strict autant que possible**
3. **Évitez `any` dans TypeScript**
4. **Commentez le code complexe**
5. **Gardez les fonctions petites et focalisées**

### Sécurité

1. **Ne commitez jamais de secrets ou credentials**
2. **Gardez les dépendances à jour**
3. **Lisez les rapports de sécurité Dependabot**
4. **Utilisez des variables d'environnement pour les secrets**
5. **Validez toutes les entrées utilisateur**

### CI/CD

1. **Tous les tests doivent passer avant merge**
2. **Vérifiez les rapports CodeQL régulièrement**
3. **Mergez les PRs Dependabot rapidement**
4. **Gardez les branches à jour avec main/develop**
5. **Utilisez des messages de commit clairs**

---

**Dernière mise à jour** : 2025-12-22

Pour toute question, ouvrez une issue sur GitHub.
