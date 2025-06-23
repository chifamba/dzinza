# Dark Mode Implementation Guide

## Overview

This implementation adds comprehensive dark mode support to the Dzinza genealogy platform using Tailwind CSS's class-based dark mode system.

## Features

- ✅ **Automatic theme detection** - Respects user's system preference
- ✅ **Manual theme toggle** - Users can override system preference
- ✅ **Persistent theme choice** - Remembers user's selection in localStorage
- ✅ **Smooth transitions** - All theme changes include smooth color transitions
- ✅ **Theme toggle component** - Beautiful animated toggle with sun/moon icons
- ✅ **Mobile optimized** - Theme toggle works on all screen sizes

## Architecture

### 1. Theme Context (`src/contexts/ThemeContext.tsx`)

The theme context provides:

- Current theme state (`light` | `dark`)
- `toggleTheme()` function
- `setTheme(theme)` function
- Automatic system preference detection
- localStorage persistence

### 2. Theme Toggle Component (`src/components/ui/ThemeToggle.tsx`)

A reusable component that provides:

- Animated sun/moon icons
- Accessible button with proper ARIA labels
- Support for optional text labels
- Hover and focus states
- Dark mode compatible styling

### 3. Tailwind Configuration

Updated `tailwind.config.js` to include:

```javascript
{
  darkMode: 'class', // Enable class-based dark mode
  // ... rest of config
}
```

## Usage

### Basic Setup

The app is already wrapped with `ThemeProvider` in `App.tsx`:

```tsx
import { ThemeProvider } from "./contexts";

function App() {
  return <ThemeProvider>{/* Your app content */}</ThemeProvider>;
}
```

### Using the Theme Toggle

```tsx
import { ThemeToggle } from '../ui';

// Basic toggle
<ThemeToggle />

// With text label
<ThemeToggle showLabel={true} />

// With custom styling
<ThemeToggle className="my-custom-class" />
```

### Accessing Theme State

```tsx
import { useTheme } from "../contexts";

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme("dark")}>Force Dark</button>
    </div>
  );
}
```

### Styling Components for Dark Mode

Use Tailwind's `dark:` prefix for dark mode styles:

```tsx
// Basic dark mode styling
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>

// With transitions
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
  Content with smooth transitions
</div>

// Forms
<input className="
  border border-gray-300 dark:border-gray-600
  bg-white dark:bg-gray-700
  text-gray-900 dark:text-white
  focus:ring-blue-500 dark:focus:ring-blue-400
  transition-colors duration-200
" />

// Buttons
<button className="
  bg-blue-600 dark:bg-blue-700
  hover:bg-blue-700 dark:hover:bg-blue-600
  focus:ring-blue-500 dark:focus:ring-blue-400
  focus:ring-offset-2 dark:focus:ring-offset-gray-800
  transition-colors duration-200
">
  Click me
</button>
```

## Best Practices

### 1. Always Include Transitions

Add smooth transitions for better UX:

```css
transition-colors duration-200
```

### 2. Update Focus States

Ensure focus states work in both themes:

```css
focus:ring-blue-500 dark:focus:ring-blue-400
focus:ring-offset-2 dark:focus:ring-offset-gray-800
```

### 3. Consider All Interactive States

Include hover, focus, active, and disabled states:

```css
hover:bg-blue-700 dark:hover:bg-blue-600
disabled:opacity-50 disabled:cursor-not-allowed
```

### 4. Test Contrast Ratios

Ensure sufficient contrast in both themes:

- Light backgrounds: use dark text colors
- Dark backgrounds: use light text colors
- Icons: update colors to maintain visibility

### 5. Use Semantic Color Naming

Prefer semantic classes over hardcoded colors:

```css
/* Good */
text-gray-900 dark:text-white
bg-primary-500 dark:bg-primary-400

/* Avoid */
text-black dark:text-white
bg-blue-500 dark:bg-blue-600
```

## Color Palette Recommendations

### Backgrounds

- **Light**: `bg-white`, `bg-gray-50`, `bg-gray-100`
- **Dark**: `dark:bg-gray-900`, `dark:bg-gray-800`, `dark:bg-gray-700`

### Text

- **Primary Light**: `text-gray-900`
- **Primary Dark**: `dark:text-white`
- **Secondary Light**: `text-gray-600`
- **Secondary Dark**: `dark:text-gray-300`

### Borders

- **Light**: `border-gray-200`, `border-gray-300`
- **Dark**: `dark:border-gray-700`, `dark:border-gray-600`

### Interactive Elements

- **Links Light**: `text-blue-600 hover:text-blue-800`
- **Links Dark**: `dark:text-blue-400 dark:hover:text-blue-300`

## Components Updated

The following components have been updated with dark mode support:

1. ✅ **ThemeContext** - Core theme management
2. ✅ **ThemeToggle** - Theme switching component
3. ✅ **Header** - Site header with dark background
4. ✅ **Navbar** - Navigation with theme toggle
5. ✅ **ContactPage** - Example page with comprehensive dark styling

## Next Steps

### Recommended Components to Update

1. **Footer** - Add dark mode styling
2. **LandingPage** - Update hero section and components
3. **LoginPage/RegisterPage** - Form styling for dark mode
4. **FamilyTreePage** - Canvas and UI elements
5. **Modals** - Dark backgrounds and styling
6. **Buttons** - Consistent dark mode styling
7. **Cards** - Dark backgrounds and borders
8. **Tables** - Alternate row colors for dark mode

### Example Component Updates

For each component, follow this pattern:

```tsx
// Before
<div className="bg-white border border-gray-200 text-gray-900">

// After
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-colors duration-200">
```

## Testing

To test the dark mode implementation:

1. **Build the project**: `npm run build`
2. **Start development server**: `npm run dev`
3. **Test theme toggle** in the header navigation
4. **Test system preference** by changing your OS theme
5. **Test persistence** by refreshing the page
6. **Test transitions** by toggling themes quickly

## Browser Support

This implementation supports:

- ✅ Chrome/Chromium (88+)
- ✅ Firefox (89+)
- ✅ Safari (14+)
- ✅ Edge (88+)

## Performance Notes

- Theme detection and switching has minimal performance impact
- CSS transitions are hardware-accelerated where possible
- localStorage operations are batched to avoid excessive writes
- Dark mode classes are only applied when needed

## Troubleshooting

### Common Issues

1. **Theme not persisting**: Check localStorage permissions
2. **Transitions not smooth**: Ensure `transition-colors duration-200` is applied
3. **Icons not visible**: Update icon colors for both themes
4. **Focus states broken**: Add dark mode focus ring colors

### Debug Tips

```javascript
// Check current theme
console.log(document.documentElement.classList.contains("dark"));

// Check localStorage
console.log(localStorage.getItem("dzinza-theme"));

// Test system preference
console.log(window.matchMedia("(prefers-color-scheme: dark)").matches);
```
