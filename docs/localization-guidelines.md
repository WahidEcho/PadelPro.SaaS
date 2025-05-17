# Localization and UI/UX Guidelines

## Table of Contents
1. [Localization Overview](#localization-overview)
2. [Translation Key Management](#translation-key-management)
3. [RTL Support](#rtl-support)
4. [Accessibility Guidelines](#accessibility-guidelines)
5. [UI/UX Best Practices](#uiux-best-practices)

## Localization Overview

Our application supports two languages:
- English (en) - Left-to-Right (LTR)
- Arabic (ar) - Right-to-Left (RTL)

### Language Context
The application uses a React Context (`LanguageContext`) to manage language state and translations. The context provides:
- Current language state
- Language toggle function
- Translation function (`t`)

### Usage Example
```tsx
import { useLanguage } from '../contexts/language-context';

function MyComponent() {
  const { t, language, toggleLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t('welcome_message')}</h1>
      <button onClick={toggleLanguage}>
        {language === 'en' ? 'العربية' : 'English'}
      </button>
    </div>
  );
}
```

## Translation Key Management

### Key Naming Convention
- Use lowercase letters
- Use underscores for spaces
- Be descriptive and specific
- Group related keys with prefixes
- Example: `add_new_client`, `edit_client_details`

### Translation File Structure
Translations are organized in the `language-context.tsx` file with the following structure:
```typescript
const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    // ...
  },
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    // ...
  }
};
```

### Managing Translations
1. Use the translation checker script:
   ```bash
   npm run check-translations
   ```
2. The script will:
   - Find unused translation keys
   - Identify missing translations
   - Detect duplicate keys
   - Generate a summary report

## RTL Support

### Layout Guidelines
1. Use CSS logical properties:
   ```css
   .container {
     margin-inline-start: 1rem;
     padding-inline-end: 1rem;
   }
   ```

2. Set document direction:
   ```tsx
   useEffect(() => {
     document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
   }, [language]);
   ```

3. Use flexbox with `row-reverse` for RTL:
   ```css
   .nav-items {
     display: flex;
     flex-direction: row-reverse;
   }
   ```

### Text Alignment
- Use `text-align: start` instead of `left` or `right`
- Use `text-align: end` for opposite alignment
- Consider using CSS logical properties for margins and padding

## Accessibility Guidelines

### Keyboard Navigation
1. Ensure all interactive elements are focusable
2. Maintain a logical tab order
3. Provide visible focus indicators
4. Support keyboard shortcuts where appropriate

### ARIA Labels
1. Use appropriate ARIA roles
2. Provide descriptive labels
3. Include aria-live regions for dynamic content
4. Example:
   ```tsx
   <button
     aria-label={t('close_dialog')}
     onClick={handleClose}
   >
     ×
   </button>
   ```

### Color and Contrast
1. Maintain WCAG 2.1 AA compliance
2. Minimum contrast ratio: 4.5:1 for normal text
3. Use color combinations that work in both light and dark modes
4. Don't rely solely on color to convey information

## UI/UX Best Practices

### Forms
1. Clear labels and placeholders
2. Error messages in the correct language
3. Proper input types and validation
4. Consistent styling across languages

### Navigation
1. Clear and consistent navigation structure
2. Breadcrumbs for complex hierarchies
3. Responsive design for all screen sizes
4. Clear active state indicators

### Tables
1. Proper alignment based on language direction
2. Sortable columns with clear indicators
3. Responsive design considerations
4. Accessible table headers

### Images and Icons
1. Use SVG icons when possible
2. Provide alt text in both languages
3. Consider cultural differences in imagery
4. Ensure icons are clear in both directions

### Error Handling
1. Clear error messages in both languages
2. Consistent error message styling
3. Helpful recovery suggestions
4. Proper error logging

## Testing Checklist

### Localization Testing
- [ ] All text is properly translated
- [ ] No hardcoded strings
- [ ] Dates and numbers are properly formatted
- [ ] Currency symbols are correct
- [ ] No text overflow or layout issues

### RTL Testing
- [ ] Layout flows correctly in RTL
- [ ] Text alignment is correct
- [ ] Icons and images are properly mirrored
- [ ] Navigation works in both directions
- [ ] Forms and inputs are properly aligned

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets standards
- [ ] ARIA labels are present and correct
- [ ] Focus indicators are visible

### Responsive Testing
- [ ] Works on mobile devices
- [ ] Works on tablets
- [ ] Works on desktop
- [ ] No horizontal scrolling
- [ ] Touch targets are appropriately sized 