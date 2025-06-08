# Accessibility Guidelines

## Overview

Dzinza is committed to providing an inclusive genealogy platform that serves users of all abilities, backgrounds, and circumstances. These guidelines ensure compliance with WCAG 2.1 AA standards while going beyond minimum requirements to create truly accessible experiences.

## Core Accessibility Principles

### 1. Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

### 2. Operable
User interface components and navigation must be operable by all users.

### 3. Understandable
Information and the operation of the user interface must be understandable.

### 4. Robust
Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

## WCAG 2.1 AA Compliance Requirements

### Color and Contrast
- **Minimum Contrast Ratio**: 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Never use color alone to convey information
- **Focus Indicators**: Visible focus indicators with minimum 3:1 contrast ratio
- **User-Controlled Colors**: Allow users to customize color schemes

**Implementation:**
```css
/* High contrast color palette */
:root {
  --primary-text: #1a1a1a;
  --secondary-text: #4a4a4a;
  --background: #ffffff;
  --accent: #0066cc;
  --error: #cc0000;
  --success: #008800;
  
  /* Focus indicators */
  --focus-outline: 3px solid #0066cc;
  --focus-offset: 2px;
}

/* Focus management */
*:focus {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary-text: #000000;
    --background: #ffffff;
    --accent: #0000ff;
  }
}
```

### Typography and Content
- **Font Size**: Minimum 16px base font size
- **Line Height**: Minimum 1.5 times font size
- **Scalability**: Support 200% zoom without horizontal scrolling
- **Simple Language**: Clear, concise writing at 8th-grade reading level
- **Cultural Sensitivity**: Appropriate language for diverse audiences

**Implementation:**
```css
/* Responsive typography */
html {
  font-size: 16px;
  line-height: 1.6;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Navigation and Interaction
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Skip Links**: Bypass navigation to reach main content
- **Consistent Navigation**: Predictable navigation patterns
- **Error Prevention**: Clear form validation with helpful messages
- **Undo Functionality**: Allow users to reverse actions

**Implementation:**
```jsx
// Skip link component
const SkipLink = () => (
  <a 
    href="#main-content" 
    className="skip-link"
    onFocus={(e) => e.target.classList.add('visible')}
    onBlur={(e) => e.target.classList.remove('visible')}
  >
    Skip to main content
  </a>
);

// Keyboard navigation handler
const handleKeyNavigation = (event) => {
  switch (event.key) {
    case 'Tab':
      // Handle tab navigation
      break;
    case 'Enter':
    case ' ':
      // Activate element
      break;
    case 'Escape':
      // Close modal/dropdown
      break;
    case 'ArrowUp':
    case 'ArrowDown':
      // Navigate lists
      break;
  }
};
```

## Screen Reader Accessibility

### Semantic HTML
Use appropriate HTML elements and ARIA attributes to provide meaning and structure.

```jsx
// Proper heading hierarchy
<main id="main-content">
  <h1>Family Tree</h1>
  <section aria-labelledby="tree-navigation">
    <h2 id="tree-navigation">Navigation</h2>
    <nav aria-label="Family tree navigation">
      <ul role="tree" aria-label="Smith Family Tree">
        <li role="treeitem" aria-expanded="true">
          <button aria-controls="john-smith-children">
            John Smith (1945-2020)
          </button>
          <ul id="john-smith-children" role="group">
            <li role="treeitem">Mary Smith (1970-)</li>
          </ul>
        </li>
      </ul>
    </nav>
  </section>
</main>

// Form accessibility
<form>
  <fieldset>
    <legend>Personal Information</legend>
    
    <label htmlFor="first-name">
      First Name *
      <input 
        id="first-name"
        type="text"
        required
        aria-describedby="first-name-help"
        aria-invalid={errors.firstName ? 'true' : 'false'}
      />
    </label>
    <div id="first-name-help" className="help-text">
      Enter your given name as it appears on official documents
    </div>
    {errors.firstName && (
      <div role="alert" aria-live="polite" className="error">
        {errors.firstName}
      </div>
    )}
  </fieldset>
</form>
```

### ARIA Labels and Descriptions
Provide context and descriptions for complex interactive elements.

```jsx
// Complex interactive elements
<button
  aria-label="Add Sarah Thompson as daughter of John Smith"
  aria-describedby="add-person-help"
  onClick={addPerson}
>
  <PlusIcon aria-hidden="true" />
  Add Person
</button>

<div id="add-person-help" className="sr-only">
  Click to open the add person dialog. You can add family members 
  and define their relationship to existing people in the tree.
</div>

// Dynamic content updates
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="status-updates"
>
  {statusMessage}
</div>

// Progress indicators
<div 
  role="progressbar"
  aria-valuenow={uploadProgress}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Photo upload progress"
>
  {uploadProgress}% complete
</div>
```

## Motor Accessibility

### Touch Targets
- **Minimum Size**: 44x44px touch targets
- **Spacing**: Minimum 8px between targets
- **Alternative Input Methods**: Support for switch control, voice control
- **Drag and Drop**: Provide keyboard alternatives

```css
/* Touch target sizing */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  margin: 8px;
  padding: 12px;
}

/* Large touch targets for mobile */
@media (pointer: coarse) {
  .touch-target {
    min-width: 48px;
    min-height: 48px;
  }
}
```

### Gesture Alternatives
Provide alternatives to complex gestures and multi-touch interactions.

```jsx
// Gesture alternatives
const FamilyTreeNode = ({ person, onExpand, onCollapse }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      onCollapse();
    } else {
      onExpand();
    }
  };
  
  return (
    <div className="tree-node">
      <button
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`${person.id}-children`}
      >
        {person.name}
      </button>
      
      {/* Alternative to pinch-to-zoom */}
      <div className="zoom-controls">
        <button aria-label="Zoom in">+</button>
        <button aria-label="Zoom out">-</button>
        <button aria-label="Reset zoom">Reset</button>
      </div>
    </div>
  );
};
```

## Cognitive Accessibility

### Clear Information Architecture
- **Consistent Layout**: Predictable page structures
- **Clear Headings**: Descriptive headings that outline content
- **Breadcrumbs**: Show user location within the application
- **Search**: Multiple ways to find information

### Error Prevention and Recovery
- **Form Validation**: Real-time validation with clear error messages
- **Confirmation Dialogs**: Confirm destructive actions
- **Auto-save**: Prevent data loss
- **Undo/Redo**: Allow users to reverse actions

```jsx
// Error prevention example
const PersonForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Auto-save draft
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveDraft(formData);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, isDirty]);
  
  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  
  return (
    <form>
      {/* Form fields with validation */}
      
      <div className="form-actions">
        <button type="submit">Save Changes</button>
        <button 
          type="button"
          onClick={() => {
            if (isDirty && !confirm('Are you sure you want to discard changes?')) {
              return;
            }
            resetForm();
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
```

## Multi-language Accessibility

### Text Direction Support
Support for right-to-left (RTL) languages and proper text rendering.

```css
/* RTL support */
html[dir="rtl"] {
  text-align: right;
}

html[dir="rtl"] .tree-node {
  margin-right: 0;
  margin-left: 20px;
}

/* Language-specific fonts */
html[lang="ar"] {
  font-family: 'Noto Sans Arabic', sans-serif;
}

html[lang="sn"] {
  font-family: 'Noto Sans', 'Ubuntu', sans-serif;
}
```

### Cultural Considerations
- **Name Formats**: Support various naming conventions
- **Date Formats**: Respect locale-specific date formats
- **Number Formats**: Use appropriate number formatting
- **Cultural Colors**: Avoid colors with negative cultural meanings

```jsx
// Cultural date formatting
const formatDate = (date, locale, culture) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  // Cultural calendar considerations
  if (culture === 'ethiopian') {
    // Handle Ethiopian calendar
    return formatEthiopianDate(date);
  }
  
  return new Intl.DateTimeFormat(locale, options).format(date);
};

// Cultural name handling
const formatName = (person, culture) => {
  switch (culture) {
    case 'shona':
      // Shona naming conventions (clan name, given name)
      return `${person.clanName} ${person.givenName}`;
    case 'ndebele':
      // Ndebele naming conventions
      return `${person.givenName} ${person.familyName}`;
    default:
      return `${person.firstName} ${person.lastName}`;
  }
};
```

## Testing and Validation

### Automated Testing
```javascript
// Accessibility testing with Jest and Testing Library
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Family Tree Accessibility', () => {
  test('should have no accessibility violations', async () => {
    const { container } = render(<FamilyTree />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  test('should support keyboard navigation', () => {
    render(<FamilyTree />);
    const firstNode = screen.getByRole('treeitem');
    
    firstNode.focus();
    expect(firstNode).toHaveFocus();
    
    fireEvent.keyDown(firstNode, { key: 'ArrowDown' });
    // Verify focus moved to next item
  });
  
  test('should announce dynamic updates', () => {
    render(<FamilyTree />);
    const liveRegion = screen.getByRole('status');
    
    // Trigger an update
    fireEvent.click(screen.getByText('Add Person'));
    
    expect(liveRegion).toHaveTextContent('Person added to family tree');
  });
});
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] All interactive elements focusable with Tab
- [ ] Logical tab order throughout application
- [ ] Visible focus indicators on all elements
- [ ] Escape key closes modals and dropdowns
- [ ] Arrow keys navigate lists and trees
- [ ] Enter/Space activates buttons and links

#### Screen Reader Testing
- [ ] Tested with NVDA (Windows)
- [ ] Tested with JAWS (Windows)
- [ ] Tested with VoiceOver (macOS/iOS)
- [ ] Tested with TalkBack (Android)
- [ ] All content announced correctly
- [ ] Proper heading hierarchy
- [ ] Form labels associated correctly
- [ ] Error messages announced

#### Motor Accessibility
- [ ] Touch targets minimum 44px
- [ ] No time-limited interactions
- [ ] Drag and drop has keyboard alternative
- [ ] Works with switch control
- [ ] Works with voice control

#### Visual Accessibility
- [ ] 4.5:1 contrast ratio for text
- [ ] 3:1 contrast ratio for UI elements
- [ ] Works at 200% zoom
- [ ] No horizontal scrolling at 320px width
- [ ] Respects user motion preferences
- [ ] Works in high contrast mode

### User Testing with Disabilities

#### Recruitment
- Partner with disability organizations
- Compensate participants appropriately
- Include diverse disability types
- Test with real assistive technologies

#### Testing Protocol
1. **Pre-session Setup**
   - Verify assistive technology setup
   - Confirm user preferences
   - Explain testing purpose and process

2. **Task-based Testing**
   - Create realistic family tree scenarios
   - Observe natural usage patterns
   - Note pain points and successes
   - Allow adequate time for completion

3. **Post-session Feedback**
   - Gather qualitative feedback
   - Identify priority improvements
   - Document accessibility barriers
   - Plan remediation efforts

## Accessibility Statement

### Our Commitment
Dzinza is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

### Conformance Status
This website is partially conformant with WCAG 2.1 AA standards. "Partially conformant" means that some parts of the content do not fully conform to the accessibility standard.

### Feedback and Contact
We welcome feedback on the accessibility of Dzinza. Please contact us if you encounter accessibility barriers:

- Email: accessibility@dzinza.com
- Phone: [Accessibility hotline]
- Address: [Mailing address]

We aim to respond to accessibility feedback within 3 business days.

### Accessibility Features

#### Current Features
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Scalable text (up to 200%)
- Alternative text for images
- Captions for videos
- Form field labels and descriptions

#### Planned Improvements
- Voice control integration
- Additional language support
- Enhanced mobile accessibility
- Cognitive accessibility features
- More customization options

This accessibility guideline ensures that Dzinza serves all users effectively while maintaining compliance with international accessibility standards and cultural sensitivity for diverse global audiences.
