# 🚀 Quick Start - Maintenance & Best Practices

Quick guide to get started with quality and maintenance tools.

## ⚡ Quick Installation

```bash
# Clone and install
git clone <repo-url>
cd RetroGeminiCodex
npm install
```

## 🎯 Essential Commands

```bash
# Development
npm run dev              # Start dev server

# Tests
npm test                 # Run tests
npm run test:coverage    # Tests + coverage

# Code quality
npm run lint             # Check code
npm run lint:fix         # Auto-fix issues
npm run type-check       # Check TS types

# Security
npm run security:audit   # Security audit

# Full CI (before push)
npm run ci               # Run lint + type-check + test + build
```

## ✅ Daily Workflow

### 1. Before Coding

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. During Development

```bash
npm run dev              # In background
npm run test:watch       # Tests in watch mode
```

### 3. Before Committing

```bash
npm run lint:fix         # Fix style
npm run type-check       # Check types
npm test                 # Run tests
```

### 4. Before Pushing

```bash
npm run ci               # Verify everything passes
git push -u origin feature/my-feature
```

### 5. Create a Pull Request

1. Go to GitHub
2. Create a PR from your branch
3. Fill in the PR template
4. Wait for all CI checks to pass ✅
5. Request a review
6. Merge after approval

## 🔧 Quick Troubleshooting

### ESLint Errors

```bash
npm run lint:fix         # Try to auto-fix
npm run lint             # See what remains
```

### Tests Failing

```bash
npm run test:watch       # Watch mode for debugging
npm run test:coverage    # View coverage
```

### TypeScript Type Errors

```bash
npm run type-check       # See type errors
```

### Security Vulnerabilities

```bash
npm run security:audit   # Identify vulnerabilities
npm run security:fix     # Try to fix them
```

## 📊 GitHub Actions (CI/CD)

Each push/PR automatically triggers:

- ✅ **Lint**: Code style verification
- ✅ **Type-Check**: TypeScript type verification
- ✅ **Tests**: Run all tests
- ✅ **Build**: Project compilation
- ✅ **Security**: Security audit

Additional workflows:

- 🔒 **CodeQL**: Advanced security analysis (weekly)
- 📦 **Dependency Review**: Check new dependencies (on PR)
- 🤖 **Dependabot**: Automatic dependency updates

## 🎓 Writing Tests - Templates

### Simple Test

```typescript
import { describe, it, expect } from 'vitest';

describe('My feature', () => {
  it('should work', () => {
    expect(myFunction()).toBe(expectedResult);
  });
});
```

### React Component Test

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

it('should display text', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Async Test

```typescript
it('should handle promises', async () => {
  const result = await myAsyncFunction();
  expect(result).toBe('success');
});
```

## 📈 Quality Goals

| Metric | Goal | Command |
|----------|----------|----------|
| Test coverage | 70%+ | `npm run test:coverage` |
| ESLint errors | 0 | `npm run lint` |
| TypeScript errors | 0 | `npm run type-check` |
| npm vulnerabilities | 0 high/critical | `npm run security:audit` |

## 🔗 Quick Links

- 📖 [Complete Maintenance Guide](./MAINTENANCE.md)
- 📋 [Audit Report](./AUDIT_REPORT.md)
- 🛡️ [Security Policy](./SECURITY.md)
- 🤝 [Contributing Guide](./CONTRIBUTING.md)

## 💡 Pro Tips

1. **Use `npm run ci` before every push** to ensure CI will pass
2. **Enable `npm run test:watch`** during development for instant feedback
3. **Merge Dependabot PRs quickly** to stay up to date
4. **Check coverage report** in `coverage/index.html` after tests
5. **Use pre-commit hooks** to automate checks

## 🆘 Need Help?

- 📚 See [MAINTENANCE.md](./MAINTENANCE.md) for the complete guide
- 🐛 Open an issue on GitHub
- 💬 Ask the team

---

**Enjoy coding!** 🎉
