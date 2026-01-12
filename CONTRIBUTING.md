# Contributing Guidelines

## Adding New Languages

### Translation Files

1. Create a new translation file in `frontend/locales/`:
```bash
cp frontend/locales/en-US.json frontend/locales/xx-XX.json
```

2. Translate all strings in the new file

3. Import and register in `frontend/utils/i18n.ts`:
```typescript
import xxXX from '@/locales/xx-XX.json';

const resources = {
  // ... existing languages
  'xx-XX': { translation: xxXX },
};
```

4. Ensure all translation files have the same keys

### Spellcheck Dictionaries

1. Add Hunspell dictionary files to `dictionaries/xx-XX/`:
   - `xx-XX.dic` (dictionary)
   - `xx-XX.aff` (affix rules)

2. Register in spellcheck configuration (TODO: implement)

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow ESLint rules (run `npm run lint`)
- Use Prettier for formatting
- Comments and documentation in English
- Variable/function names in English

### React Components

- Use functional components with hooks
- Keep components small and focused
- Separate business logic into custom hooks
- Use TypeScript interfaces for props

### Git Commits

Use semantic commit messages:
```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass (when available)
4. Update documentation if needed
5. Submit PR with clear description

## Translation Validation

Before submitting translations, verify:

1. All keys from `en-US.json` are present
2. No extra keys that don't exist in other files
3. Strings maintain the same placeholders/variables
4. Grammar and spelling are correct
5. Cultural appropriateness

## Questions?

Open an issue for:
- Feature requests
- Bug reports
- Translation questions
- General questions
