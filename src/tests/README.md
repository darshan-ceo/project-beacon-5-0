# Three-Layer Tooltip System - Test Suite

## Overview
Comprehensive automated test suite for the three-layer UI help system (Label + Explanation + Tooltip).

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Structure

### 1. Service Tests (`services/uiHelpService.test.ts`)
- **Data Loading**: Validates JSON loading from `/help/ui-tooltips.json`
- **Lookup Methods**: Tests `getHelp()`, `search()`, `getModuleHelp()`
- **Error Handling**: Ensures graceful degradation on fetch failures
- **Caching**: Verifies single-load behavior

**Coverage:**
- ✅ Load help data from JSON
- ✅ Handle network errors gracefully
- ✅ Return help entries by ID
- ✅ Search with query and module filter
- ✅ Get all entries for a module

### 2. Component Tests (`components/three-layer-help.test.tsx`)
- **Rendering**: Validates all three layers (Label, Explanation, Tooltip)
- **Interactions**: Tests hover, focus, blur behaviors
- **Props**: Verifies `showExplanation`, `showTooltipIcon` work correctly
- **Animations**: Ensures Framer Motion transitions render

**Coverage:**
- ✅ Render label from help data
- ✅ Render custom children
- ✅ Show/hide explanation based on prop
- ✅ Tooltip appears on hover
- ✅ Tooltip appears on keyboard focus
- ✅ Tooltip hides on blur
- ✅ Render learn more link
- ✅ Display keyboard shortcuts
- ✅ Graceful degradation without data

### 3. Button Component Tests (`components/help-button.test.tsx`)
- **Integration**: Tests `HelpButton` wrapper with `ThreeLayerHelp`
- **Button Props**: Validates onClick, variant, size, disabled
- **Accessibility**: Ensures keyboard navigation works
- **Layout**: Tests wrapper className and explanation visibility

**Coverage:**
- ✅ Render button with children
- ✅ Pass button props correctly
- ✅ Trigger onClick handler
- ✅ Show tooltip on help icon hover
- ✅ Keyboard accessible (Tab, Enter, Space)
- ✅ Work with disabled state
- ✅ Render with different variants

### 4. Accessibility Tests (`accessibility/tooltip-a11y.test.tsx`)
- **WCAG 2.1 AA**: Validates compliance with accessibility standards
- **Keyboard Navigation**: Tests Tab, Enter, Space, Escape
- **Screen Readers**: Ensures proper ARIA labels
- **Focus Management**: Verifies focus indicators and order
- **Color Contrast**: Checks semantic tokens usage
- **Motion**: Tests animation preferences

**Coverage:**
- ✅ Proper ARIA labels
- ✅ Keyboard navigable with Tab
- ✅ Tooltip on focus/blur
- ✅ Operable with Enter/Space
- ✅ Visible focus indicators
- ✅ Maintain DOM focus order
- ✅ Display keyboard shortcuts
- ✅ Sufficient touch target size
- ✅ Screen reader announcements
- ✅ Color contrast compliance
- ✅ External link attributes

## Coverage Goals

| Area | Target | Status |
|------|--------|--------|
| Services | 90% | ✅ |
| Components | 85% | ✅ |
| Accessibility | 100% | ✅ |
| Integration | 80% | ✅ |

## Test Data

Mock help data structure:
```typescript
{
  id: 'button-create-case',
  module: 'cases',
  type: 'button',
  label: 'Create Case',
  explanation: 'Start a new litigation case',
  tooltip: {
    title: 'Create New Case',
    content: 'Open wizard to register new case',
    learnMoreUrl: '/help/cases'
  },
  accessibility: {
    ariaLabel: 'Create a new case',
    keyboardShortcut: 'Ctrl+N'
  }
}
```

## Common Test Patterns

### Testing Tooltip Visibility
```typescript
const user = userEvent.setup();
const helpIcon = screen.getByRole('button', { name: /help/i });

// Test hover
await user.hover(helpIcon);
await waitFor(() => {
  expect(screen.getByText('Tooltip Title')).toBeInTheDocument();
});

// Test focus
await user.tab();
expect(helpIcon).toHaveFocus();
```

### Testing Graceful Degradation
```typescript
vi.mocked(uiHelpService.getHelp).mockReturnValue(null);

render(<HelpButton helpId="non-existent">Button</HelpButton>);

// Should render without errors
expect(screen.getByRole('button')).toBeInTheDocument();
```

### Testing Accessibility
```typescript
const element = screen.getByRole('button', { name: /action/i });

expect(element).toHaveAttribute('aria-label', 'Expected label');
expect(element).toHaveClass('focus-visible:ring-2');
```

## Troubleshooting

### Tests Failing Due to Animation
- Increase `waitFor` timeout for Framer Motion animations
- Mock `framer-motion` if needed

### Mock Not Working
- Ensure `vi.mock()` is at top of test file
- Clear mocks in `beforeEach()`

### ARIA Queries Not Found
- Use `screen.debug()` to see rendered HTML
- Check if feature flag is enabled in mock

## CI/CD Integration

Tests run automatically on:
- Pre-commit (via Husky)
- Pull requests (GitHub Actions)
- Main branch pushes

## Next Steps

1. Add visual regression tests with Playwright
2. Add performance benchmarks
3. Integrate with Lighthouse CI for accessibility scores
4. Add mutation testing with Stryker
