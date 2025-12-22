# 🚀 Quick Start - Maintenance & Best Practices

Guide rapide pour démarrer avec les outils de qualité et maintenance.

## ⚡ Installation Rapide

```bash
# Cloner et installer
git clone <repo-url>
cd RetroGeminiCodex
npm install
```

## 🎯 Commandes Essentielles

```bash
# Développement
npm run dev              # Démarrer le serveur de dev

# Tests
npm test                 # Lancer les tests
npm run test:coverage    # Tests + couverture

# Qualité du code
npm run lint             # Vérifier le code
npm run lint:fix         # Corriger automatiquement
npm run type-check       # Vérifier les types TS

# Sécurité
npm run security:audit   # Audit de sécurité

# CI complet (avant de push)
npm run ci               # Lance lint + type-check + test + build
```

## ✅ Workflow Quotidien

### 1. Avant de Coder

```bash
git checkout develop
git pull origin develop
git checkout -b feature/ma-fonctionnalite
```

### 2. Pendant le Développement

```bash
npm run dev              # En arrière-plan
npm run test:watch       # Tests en mode watch
```

### 3. Avant de Commit

```bash
npm run lint:fix         # Corriger le style
npm run type-check       # Vérifier les types
npm test                 # Lancer les tests
```

### 4. Avant de Push

```bash
npm run ci               # Vérifier que tout passe
git push -u origin feature/ma-fonctionnalite
```

### 5. Créer une Pull Request

1. Aller sur GitHub
2. Créer une PR depuis votre branche
3. Remplir le template de PR
4. Attendre que tous les checks CI passent ✅
5. Demander une review
6. Merger après approbation

## 🔧 Résolution de Problèmes Rapides

### ESLint trouve des erreurs

```bash
npm run lint:fix         # Essayer de corriger auto
npm run lint             # Voir ce qui reste à corriger
```

### Tests échouent

```bash
npm run test:watch       # Mode watch pour débugger
npm run test:coverage    # Voir la couverture
```

### Types TypeScript incorrects

```bash
npm run type-check       # Voir les erreurs de type
```

### Vulnérabilités de sécurité

```bash
npm run security:audit   # Identifier les vulnérabilités
npm run security:fix     # Essayer de les corriger
```

## 📊 GitHub Actions (CI/CD)

Chaque push/PR déclenche automatiquement :

- ✅ **Lint** : Vérification du style de code
- ✅ **Type-Check** : Vérification des types TypeScript
- ✅ **Tests** : Exécution de tous les tests
- ✅ **Build** : Compilation du projet
- ✅ **Security** : Audit de sécurité

Workflows supplémentaires :

- 🔒 **CodeQL** : Analyse de sécurité avancée (hebdomadaire)
- 📦 **Dependency Review** : Vérification des nouvelles dépendances (sur PR)
- 🤖 **Dependabot** : Mises à jour automatiques des dépendances

## 🎓 Écrire des Tests - Templates

### Test Simple

```typescript
import { describe, it, expect } from 'vitest';

describe('Ma fonctionnalité', () => {
  it('devrait fonctionner', () => {
    expect(maFonction()).toBe(resultatAttendu);
  });
});
```

### Test React Component

```typescript
import { render, screen } from '@testing-library/react';
import MonComposant from './MonComposant';

it('devrait afficher le texte', () => {
  render(<MonComposant />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Test Async

```typescript
it('devrait gérer les promesses', async () => {
  const result = await maFonctionAsync();
  expect(result).toBe('success');
});
```

## 📈 Objectifs de Qualité

| Métrique | Objectif | Commande |
|----------|----------|----------|
| Couverture de tests | 70%+ | `npm run test:coverage` |
| Erreurs ESLint | 0 | `npm run lint` |
| Erreurs TypeScript | 0 | `npm run type-check` |
| Vulnérabilités npm | 0 high/critical | `npm run security:audit` |

## 🔗 Liens Rapides

- 📖 [Guide Complet de Maintenance](./MAINTENANCE.md)
- 📋 [Rapport d'Audit](./AUDIT_REPORT.md)
- 🛡️ [Politique de Sécurité](./SECURITY.md)
- 🤝 [Guide de Contribution](./CONTRIBUTING.md)

## 💡 Astuces Pro

1. **Utilisez `npm run ci` avant chaque push** pour vous assurer que le CI passera
2. **Activez `npm run test:watch`** pendant le développement pour feedback instantané
3. **Mergez les PRs Dependabot rapidement** pour rester à jour
4. **Vérifiez le rapport de couverture** dans `coverage/index.html` après les tests
5. **Utilisez les pre-commit hooks** pour automatiser les vérifications

## 🆘 Besoin d'Aide ?

- 📚 Voir [MAINTENANCE.md](./MAINTENANCE.md) pour le guide complet
- 🐛 Ouvrir une issue sur GitHub
- 💬 Demander à l'équipe

---

**Enjoy coding!** 🎉
