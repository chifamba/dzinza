# Internationalization (i18n) Guidelines

## Overview

The Dzinza platform supports multiple languages to serve users from diverse linguistic backgrounds. This document outlines the internationalization strategy, implementation guidelines, and best practices.

## Language Support

### Initial Languages
- **English (en)**: Default language
- **Shona (sn)**: Primary indigenous language of Zimbabwe
- **Ndebele (nd)**: Secondary indigenous language of Zimbabwe

### Language Codes
Following ISO 639-1 standard:
- English: `en`
- Shona: `sn`
- Ndebele: `nd`

### Future Language Support
The system is designed to easily accommodate additional languages:
- Chewa/Nyanja (`ny`)
- Tonga (`to`)
- Kalanga (`kck`)
- Nambya (`nmq`)
- Other African languages as needed

## Technical Implementation

### Technology Stack
- **Frontend**: React-i18next for React components
- **Backend**: i18next for server-side translations
- **Storage**: JSON files for translation resources
- **Fallback**: English as default fallback language

### File Structure
```
src/
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── navigation.json
│   │   ├── forms.json
│   │   ├── genealogy.json
│   │   └── errors.json
│   ├── sn/
│   │   ├── common.json
│   │   ├── navigation.json
│   │   ├── forms.json
│   │   ├── genealogy.json
│   │   └── errors.json
│   └── nd/
│       ├── common.json
│       ├── navigation.json
│       ├── forms.json
│       ├── genealogy.json
│       └── errors.json
```

### Translation Namespace Organization

#### Common (`common.json`)
- General UI elements
- Button labels
- Common actions
- Time and date formats

#### Navigation (`navigation.json`)
- Menu items
- Page titles
- Breadcrumb labels
- Navigation actions

#### Forms (`forms.json`)
- Form labels
- Input placeholders
- Validation messages
- Form instructions

#### Genealogy (`genealogy.json`)
- Family relationship terms
- Genealogy-specific terminology
- Historical periods and events
- Cultural terms and concepts

#### Errors (`errors.json`)
- Error messages
- Warning messages
- Success messages
- Status messages

## Implementation Guidelines

### Component Usage

#### Basic Translation
```tsx
import { useTranslation } from 'react-i18next';

const Component: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('description')}</p>
    </div>
  );
};
```

#### Translation with Parameters
```tsx
const UserGreeting: React.FC<{ userName: string }> = ({ userName }) => {
  const { t } = useTranslation('common');
  
  return (
    <h2>{t('greeting', { name: userName })}</h2>
  );
};
```

#### Pluralization
```tsx
const ItemCount: React.FC<{ count: number }> = ({ count }) => {
  const { t } = useTranslation('common');
  
  return (
    <span>{t('itemCount', { count })}</span>
  );
};
```

#### Date and Number Formatting
```tsx
const FormattedDate: React.FC<{ date: Date }> = ({ date }) => {
  const { i18n } = useTranslation();
  
  return (
    <span>
      {date.toLocaleDateString(i18n.language)}
    </span>
  );
};
```

### Translation Key Naming Convention

#### Structure
```
namespace.category.element[.variant]
```

#### Examples
```json
{
  "navigation.menu.dashboard": "Dashboard",
  "navigation.menu.familyTree": "Family Tree",
  "forms.labels.firstName": "First Name",
  "forms.placeholders.email": "Enter your email address",
  "forms.validation.required": "This field is required",
  "genealogy.relationships.father": "Father",
  "genealogy.relationships.mother": "Mother",
  "errors.network.connectionFailed": "Connection failed",
  "common.actions.save": "Save",
  "common.actions.cancel": "Cancel"
}
```

### Translation Files Format

#### English (`en/genealogy.json`)
```json
{
  "relationships": {
    "father": "Father",
    "mother": "Mother",
    "son": "Son",
    "daughter": "Daughter",
    "grandfather": "Grandfather",
    "grandmother": "Grandmother",
    "uncle": "Uncle",
    "aunt": "Aunt",
    "cousin": "Cousin"
  },
  "titles": {
    "familyTree": "Family Tree",
    "ancestors": "Ancestors",
    "descendants": "Descendants",
    "relatives": "Relatives"
  },
  "actions": {
    "addMember": "Add Family Member",
    "editMember": "Edit Member",
    "deleteMember": "Delete Member",
    "viewDetails": "View Details"
  }
}
```

#### Shona (`sn/genealogy.json`)
```json
{
  "relationships": {
    "father": "Baba",
    "mother": "Amai",
    "son": "Mwanakomana",
    "daughter": "Mwanasikana",
    "grandfather": "Sekuru",
    "grandmother": "Ambuya",
    "uncle": "Babamunini / Babamukuru",
    "aunt": "Tete",
    "cousin": "Muzukuru"
  },
  "titles": {
    "familyTree": "Muti weMhuri",
    "ancestors": "Mudzimu",
    "descendants": "Vana",
    "relatives": "Hama"
  },
  "actions": {
    "addMember": "Wedzera Nhengo yeMhuri",
    "editMember": "Gadzirisa Nhengo",
    "deleteMember": "Bvisa Nhengo",
    "viewDetails": "Ona Rondedzero"
  }
}
```

#### Ndebele (`nd/genealogy.json`)
```json
{
  "relationships": {
    "father": "Ubaba",
    "mother": "Umama",
    "son": "Indodana",
    "daughter": "Indodakazi",
    "grandfather": "Umakhulu",
    "grandmother": "Ugogo",
    "uncle": "Umalume",
    "aunt": "Udadewethu",
    "cousin": "Umzala"
  },
  "titles": {
    "familyTree": "Isihlahla Somndeni",
    "ancestors": "Okhokho",
    "descendants": "Abantwana",
    "relatives": "Izihlobo"
  },
  "actions": {
    "addMember": "Engeza Ilungu Lomndeni",
    "editMember": "Hlela Ilungu",
    "deleteMember": "Susa Ilungu",
    "viewDetails": "Bona Imininingwane"
  }
}
```

## Language Selection and Persistence

### User Language Preference Storage
```typescript
// Store user language preference
const setUserLanguage = (language: string) => {
  localStorage.setItem('dzinza_user_language', language);
  i18n.changeLanguage(language);
};

// Retrieve user language preference
const getUserLanguage = (): string => {
  return localStorage.getItem('dzinza_user_language') || 'en';
};

// Initialize language on app start
const initializeLanguage = () => {
  const savedLanguage = getUserLanguage();
  i18n.changeLanguage(savedLanguage);
};
```

### Language Selector Component
```tsx
import { useTranslation } from 'react-i18next';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation('common');

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'sn', name: 'Shona', nativeName: 'chiShona' },
    { code: 'nd', name: 'Ndebele', nativeName: 'isiNdebele' }
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('dzinza_user_language', languageCode);
  };

  return (
    <select 
      value={i18n.language} 
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="language-selector"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
```

## Cultural Considerations

### Genealogical Terms
- **Family Structures**: Recognize different family structures in Zimbabwean culture
- **Clan Names**: Support for totems (mitupo in Shona, izibongo in Ndebele)
- **Traditional Roles**: Respect traditional family roles and hierarchies
- **Naming Conventions**: Support for multiple naming traditions

### Cultural Sensitivity
- **Respectful Language**: Use appropriate terms for elders and family relationships
- **Traditional Concepts**: Include traditional concepts like ancestral reverence
- **Historical Context**: Be sensitive to historical events and their cultural impact
- **Regional Variations**: Account for regional dialects and variations

### Date and Time Formats
```typescript
// Different date formats by culture
const formatDate = (date: Date, language: string) => {
  const formats = {
    'en': { day: 'numeric', month: 'long', year: 'numeric' },
    'sn': { day: 'numeric', month: 'long', year: 'numeric' },
    'nd': { day: 'numeric', month: 'long', year: 'numeric' }
  };
  
  return date.toLocaleDateString(language, formats[language] || formats['en']);
};
```

## Quality Assurance

### Translation Review Process
1. **Initial Translation**: Professional translators for Shona and Ndebele
2. **Cultural Review**: Cultural experts review for appropriateness
3. **User Testing**: Native speakers test the interface
4. **Feedback Integration**: Incorporate user feedback and corrections
5. **Continuous Updates**: Regular reviews and updates

### Testing Guidelines
- **Functional Testing**: Ensure all features work in all languages
- **UI Testing**: Verify text fits properly in different languages
- **Cultural Testing**: Confirm cultural appropriateness
- **Performance Testing**: Check loading times with different character sets

### Translation Quality Checklist
- [ ] All UI elements translated
- [ ] Cultural terms accurately represented
- [ ] No text truncation or overflow
- [ ] Proper use of formal/informal language
- [ ] Consistent terminology across the application
- [ ] Proper pluralization rules applied
- [ ] Date/time formats appropriate for culture

## Maintenance and Updates

### Adding New Languages
1. Create new language directory in `src/locales/`
2. Copy English translation files as templates
3. Translate all strings with cultural adaptation
4. Add language option to selector component
5. Test thoroughly with native speakers
6. Update documentation

### Managing Translation Updates
- **Version Control**: Track translation changes in git
- **Translation Keys**: Never remove keys, only deprecate
- **Backward Compatibility**: Maintain fallbacks for missing translations
- **Automated Checks**: Lint for missing translation keys

### Translation Workflow
1. **Development**: Add new translation keys in English
2. **Extraction**: Extract new keys for translation
3. **Translation**: Professional translation services
4. **Review**: Cultural and linguistic review
5. **Integration**: Merge translations into codebase
6. **Testing**: Comprehensive testing in all languages

## Performance Considerations

### Lazy Loading
```typescript
// Load translations on demand
const loadNamespaceForLanguage = async (language: string, namespace: string) => {
  const translations = await import(`../locales/${language}/${namespace}.json`);
  i18n.addResourceBundle(language, namespace, translations.default);
};
```

### Caching Strategy
- **Browser Cache**: Cache translation files in browser
- **CDN**: Serve translation files from CDN
- **Compression**: Gzip translation files
- **Bundling**: Bundle frequently used translations

### Optimization
- **Tree Shaking**: Only include used translations in bundles
- **Code Splitting**: Split translations by route/feature
- **Compression**: Minimize translation file sizes
- **Caching**: Implement proper caching strategies

---

**Remember**: Internationalization is not just translation—it's about creating an inclusive experience that respects and celebrates cultural diversity while maintaining functionality and usability across all supported languages.
