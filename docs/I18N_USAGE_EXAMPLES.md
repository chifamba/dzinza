# i18n Usage Examples

This document provides practical examples of how to use the internationalization system in the Dzinza genealogy platform.

## Quick Start

1. **Import the hook in your component:**
```tsx
import { useTranslation } from 'react-i18next';
```

2. **Use translations in your component:**
```tsx
const MyComponent = () => {
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <div>
      <h1>{t('common:welcome')}</h1>
      <p>{t('dashboard:overview.description')}</p>
    </div>
  );
};
```

## Real Examples

### Example 1: Simple Component with Single Namespace
```tsx
import { useTranslation } from 'react-i18next';

const ProfileHeader = () => {
  const { t } = useTranslation('profile');
  
  return (
    <header>
      <h1>{t('header.title')}</h1>
      <p>{t('header.subtitle')}</p>
    </header>
  );
};
```

### Example 2: Component with Multiple Namespaces
```tsx
import { useTranslation } from 'react-i18next';

const FamilyTreeNode = ({ member }) => {
  const { t } = useTranslation(['familyTree', 'common']);
  
  return (
    <div className="family-member">
      <h3>{member.name}</h3>
      <p>{t('familyTree:relationships.father')}: {member.father}</p>
      <button>{t('common:actions.edit')}</button>
    </div>
  );
};
```

### Example 3: Dynamic Translations with Variables
```tsx
import { useTranslation } from 'react-i18next';

const WelcomeMessage = ({ userName }) => {
  const { t } = useTranslation('common');
  
  return (
    <div>
      {/* Translation with interpolation */}
      <h1>{t('greetings.welcome', { name: userName })}</h1>
      
      {/* Count-based pluralization */}
      <p>{t('messages.itemCount', { count: 5 })}</p>
    </div>
  );
};
```

### Example 4: Cultural Formatting
```tsx
import { useTranslation } from 'react-i18next';
import { formatDate, formatCurrency } from '../i18n/utils/culturalFormatting';

const EventCard = ({ event }) => {
  const { t, i18n } = useTranslation('historicalRecords');
  
  return (
    <div className="event-card">
      <h3>{t('events.title')}</h3>
      <p>{formatDate(event.date, i18n.language)}</p>
      <span>{formatCurrency(event.cost, i18n.language)}</span>
    </div>
  );
};
```

### Example 5: Language Switching
```tsx
import { useTranslation } from 'react-i18next';

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  
  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };
  
  return (
    <div className="language-toggle">
      <button onClick={() => switchLanguage('en')}>English</button>
      <button onClick={() => switchLanguage('sn')}>ChiShona</button>
      <button onClick={() => switchLanguage('nd')}>IsiNdebele</button>
    </div>
  );
};
```

## Translation Key Structure

Follow this consistent pattern for translation keys:

```
namespace:section.subsection.key
```

Examples:
- `common:actions.save`
- `familyTree:relationships.father`
- `dashboard:overview.statistics.totalMembers`

## Adding New Translations

1. **Add to all language files** (`en`, `sn`, `nd`)
2. **Use consistent key structure**
3. **Test with all languages**

Example for adding a new feature:
```json
// en/newFeature.json
{
  "title": "New Feature",
  "description": "This is a new feature",
  "actions": {
    "enable": "Enable",
    "disable": "Disable"
  }
}
```

```json
// sn/newFeature.json
{
  "title": "Chinhu Chitsva",
  "description": "Ichi chinhu chitsva",
  "actions": {
    "enable": "Gonesa",
    "disable": "Dzima"
  }
}
```

## Best Practices

1. **Always provide fallbacks**: Use the `fallbackLng` option
2. **Test all languages**: Ensure translations work in all supported languages
3. **Use interpolation**: For dynamic content, use `{{variable}}` syntax
4. **Namespace organization**: Group related translations in the same namespace
5. **Cultural sensitivity**: Consider cultural context, not just literal translation
6. **Consistent naming**: Use clear, descriptive key names

## Common Patterns

### Loading States
```tsx
const { t, ready } = useTranslation('common');

if (!ready) return <div>Loading translations...</div>;

return <div>{t('content')}</div>;
```

### Error Boundaries
```tsx
const { t } = useTranslation('common', { 
  fallbackLng: 'en',
  useSuspense: false 
});
```

### Testing Components
```tsx
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};
```

## Cultural Considerations

### Shona (ChiShona)
- Respectful family terms: Use proper honorifics
- Time expressions: Consider traditional time concepts
- Greetings: Context-appropriate greetings (morning/afternoon/evening)

### Ndebele (IsiNdebele)
- Family relationships: Use correct kinship terminology
- Formal vs informal: Choose appropriate register
- Cultural expressions: Include traditional sayings where appropriate

This system provides a solid foundation for multilingual support while respecting Zimbabwe's rich linguistic heritage.
