# Dzinza Internationalization (i18n) Implementation

This document provides a comprehensive guide to the internationalization implementation in the Dzinza genealogy platform.

## Overview

The Dzinza platform supports multiple languages with a focus on Zimbabwean heritage:
- **English** (en) - Default language
- **Shona** (sn) - ChiShona
- **Ndebele** (nd) - IsiNdebele

## Implementation Details

### Technology Stack
- **react-i18next**: React integration for i18next
- **i18next**: Core internationalization framework
- **i18next-browser-languagedetector**: Automatic language detection
- **i18next-http-backend**: Dynamic translation loading

### File Structure
```
src/i18n/
├── index.ts                    # Main i18n configuration
├── locales/                    # Translation files (src)
│   ├── en/                     # English translations
│   ├── sn/                     # Shona translations
│   └── nd/                     # Ndebele translations
└── utils/
    ├── languagePersistence.ts  # Language detection & persistence
    ├── culturalFormatting.ts   # Cultural formatting utilities
    └── testUtils.ts           # Testing utilities

public/locales/                 # Translation files (public)
├── en/                        # English translations (public)
├── sn/                        # Shona translations (public)
└── nd/                        # Ndebele translations (public)
```

### Translation Namespaces
- **common**: Shared UI elements, navigation, actions
- **dashboard**: Dashboard-specific content
- **familyTree**: Family tree and relationship terms
- **auth**: Authentication and user management
- **profile**: User profile and settings

## Usage Guide

### Basic Usage in Components
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

### Using Multiple Namespaces
```tsx
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { t: tCommon } = useTranslation('common');
  const { t: tDashboard } = useTranslation('dashboard');
  
  return (
    <div>
      <h1>{tDashboard('welcome', { name: 'John' })}</h1>
      <button>{tCommon('actions.save')}</button>
    </div>
  );
}
```

### Language Switching
```tsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <select onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="sn">ChiShona</option>
      <option value="nd">IsiNdebele</option>
    </select>
  );
}
```

## Cultural Considerations

### Relationship Terms
The platform uses culturally appropriate relationship terms:

**Shona (ChiShona)**:
- Baba (Father), Amai (Mother)
- Mukoma/Munin'ina (Older/Younger Brother)
- Hanzvadzi (Sister)
- Mbuya/Sekuru (Grandmother/Grandfather)

**Ndebele (IsiNdebele)**:
- Ubaba (Father), Umama (Mother)
- Umfowabo (Brother), Udadewabo (Sister)
- Ugogo/Umkhulu (Grandmother/Grandfather)

### Date and Number Formatting
- Uses Zimbabwean English formatting (en-ZW) as base
- Supports USD currency (primary currency in Zimbabwe)
- Time-based greetings in local languages

### Formatting Examples
```tsx
import { formatDate, formatCurrency, getTimeBasedGreeting } from '../i18n/utils/culturalFormatting';

// Date formatting
const date = formatDate(new Date(), 'sn'); // Uses Zimbabwean context

// Currency formatting  
const amount = formatCurrency(1234.56, 'en', 'USD'); // $1,234.56

// Cultural greetings
const greeting = getTimeBasedGreeting('sn'); // "Mangwanani" (morning)
```

## Language Detection

The platform automatically detects user language preference through:
1. **Saved preference** (localStorage)
2. **Browser language** (navigator.language)
3. **Default fallback** (English)

### Language Persistence
```tsx
import { initializeLanguage } from './i18n/utils/languagePersistence';

// Initialize in App.tsx
useEffect(() => {
  initializeLanguage(i18n);
}, [i18n]);
```

## Testing

### Test Utilities
```tsx
import { renderWithI18n, validateTranslationKeys } from '../i18n/utils/testUtils';

// Render component with i18n
const { getByText } = renderWithI18n(<MyComponent />, { language: 'sn' });

// Validate translation keys
const { missing } = await validateTranslationKeys('common', 'sn', ['navigation.home']);
```

### Translation Coverage
```tsx
import { checkTranslationCoverage } from '../i18n/utils/testUtils';

const coverage = await checkTranslationCoverage(['common', 'dashboard'], ['en', 'sn', 'nd']);
// Returns coverage percentage and missing keys per namespace/language
```

## Adding New Languages

1. **Create translation files**:
   ```
   src/i18n/locales/[language-code]/
   ├── common.json
   ├── dashboard.json
   ├── familyTree.json
   ├── auth.json
   └── profile.json
   ```

2. **Update language configuration**:
   ```tsx
   // src/i18n/index.ts
   const resources = {
     en: { /* ... */ },
     sn: { /* ... */ },
     nd: { /* ... */ },
     newLang: {
       common: require('./locales/newLang/common.json'),
       // ... other namespaces
     }
   };
   ```

3. **Update LanguageSelector component**:
   ```tsx
   const languages = [
     { code: 'en', name: 'English', nativeName: 'English' },
     { code: 'sn', name: 'Shona', nativeName: 'ChiShona' },
     { code: 'nd', name: 'Ndebele', nativeName: 'IsiNdebele' },
     { code: 'newLang', name: 'New Language', nativeName: 'Native Name' }
   ];
   ```

## Best Practices

### Translation Keys
- Use descriptive, hierarchical keys: `navigation.familyTree`
- Group related translations: `stats.totalMembers`
- Use consistent naming conventions

### Pluralization
```json
{
  "members": "{{count}} member",
  "members_plural": "{{count}} members"
}
```

### Interpolation
```json
{
  "welcome": "Welcome back, {{name}}!",
  "lastLogin": "Last login: {{date}}"
}
```

### Context-Aware Translations
```json
{
  "button": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "message": {
    "save": "Your changes have been saved",
    "cancel": "Changes have been cancelled"
  }
}
```

## Performance Considerations

### Lazy Loading
- Translations are loaded on-demand via HTTP backend
- Only active namespace translations are loaded initially
- Additional namespaces load as needed

### Caching
- Browser caches translation files
- localStorage persists language preferences
- Service worker can cache translations offline

### Bundle Size
- Translation files are separate from main bundle
- Only required languages are loaded
- Namespaced translations reduce initial load

## Troubleshooting

### Common Issues

1. **Missing Translation Keys**:
   ```tsx
   // Check translation exists
   if (i18n.exists('key.path')) {
     return t('key.path');
   }
   return 'Fallback text';
   ```

2. **Language Not Switching**:
   - Verify translation files are in `public/locales/`
   - Check browser network tab for 404 errors
   - Ensure language code matches folder name

3. **Formatting Issues**:
   - Check locale-specific formatting functions
   - Verify Intl API support in target browsers
   - Test with different timezone/locale settings

### Debugging
```tsx
// Enable debug mode
i18n.init({
  debug: true, // Shows missing keys and loading status
  // ... other options
});

// Check current language and resources
console.log('Current language:', i18n.language);
console.log('Available resources:', i18n.getResourceBundle(i18n.language));
```

## Migration Guide

### From Hardcoded Strings
1. Identify all user-facing strings
2. Create appropriate translation keys
3. Replace strings with `t()` calls
4. Test in all supported languages

### Adding New Features
1. Define translation keys first
2. Add to all language files
3. Use in components
4. Update tests

## Contributing

### Adding Translations
1. Fork the repository
2. Add translations to appropriate namespace files
3. Test with your language
4. Submit pull request with translation coverage report

### Cultural Sensitivity
- Research appropriate terms and phrases
- Consider cultural context and customs
- Validate with native speakers
- Respect traditional naming conventions

## Resources

- [react-i18next documentation](https://react.i18next.com/)
- [i18next documentation](https://www.i18next.com/)
- [Zimbabwean Languages Guide](../INTERNATIONALIZATION.md)
- [Cultural Formatting Examples](src/i18n/utils/culturalFormatting.ts)
