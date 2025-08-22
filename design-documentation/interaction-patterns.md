# True Crime App - Interaction Patterns & Accessibility Guidelines

## Overview

Comprehensive interaction patterns and accessibility guidelines that ensure the True Crime app provides an inclusive, intuitive experience across all platforms while maintaining sensitivity to content nature and user safety.

## Interaction Design Principles

### Core Interaction Philosophy
- **Predictable Patterns**: Consistent interaction behaviors across all features
- **Respectful Feedback**: Appropriate response timing and tone for sensitive content
- **User Control**: Granular control over content exposure and interaction preferences
- **Progressive Disclosure**: Complexity revealed gradually based on user expertise
- **Error Prevention**: Design patterns that prevent mistakes before they occur

### Platform-Specific Considerations
- **Mobile**: Touch-first design with gesture support and haptic feedback
- **Web**: Keyboard and mouse optimization with hover states and shortcuts
- **Cross-Platform**: Consistent core patterns with platform-appropriate enhancements

---

## Mobile Interaction Patterns

### Touch Interactions

#### Primary Touch Gestures

**Tap (Single Touch)**
- **Content Cards**: Open content detail view
- **Buttons**: Execute primary action with visual feedback
- **List Items**: Select or navigate to detail view
- **Tab Bar**: Switch between main navigation sections

**Feedback Pattern**:
```
Touch Down → Visual Press State (0ms)
Touch Up → Action Execution (100ms)
Success → Visual Confirmation (200ms)
```

**Long Press (Touch Hold)**
- **Content Cards**: Open context menu with quick actions
- **List Items**: Enter multi-select mode
- **Text Content**: Show text selection tools
- **Images**: Show full-screen preview or context menu

**Timing**: 500ms minimum hold duration
**Feedback**: Haptic feedback on press recognition, visual feedback on menu appearance

#### Advanced Touch Gestures

**Swipe Actions (Left/Right)**
- **Watchlist Items**: 
  - Swipe right → Mark as watched (green checkmark)
  - Swipe left → Remove from list (red delete)
- **Content Cards in Lists**:
  - Swipe right → Add to different list
  - Swipe left → Quick share or remove
- **Comments**: 
  - Swipe right → Upvote/like
  - Swipe left → Report or reply

**Visual Feedback**: Progressive reveal of action buttons during swipe, color-coded actions

**Pull to Refresh**
- **Content Lists**: Update content with new releases or changes
- **Search Results**: Refresh search results and availability
- **Social Feeds**: Load new activity and posts

**Animation**: 
```
Pull Distance: 60px trigger threshold
Animation: Smooth elastic bounce with loading spinner
Duration: 300ms pull animation, 1-2s refresh operation
```

**Pinch and Zoom**
- **Images**: Content posters, case evidence photos (when appropriate)
- **Text**: Accessibility zoom for better readability
- **Timeline Views**: Case timeline exploration

**Bounds**: 0.5x to 3x zoom range with smooth interpolation

### Haptic Feedback Patterns

#### Success Actions
- **Add to Watchlist**: Light impact feedback
- **Mark as Watched**: Medium impact feedback
- **Complete Setup Step**: Light impact feedback

#### Warning Actions
- **Content Warning Acknowledgment**: Medium impact feedback
- **Destructive Action**: Heavy impact with delay (remove content, delete list)
- **Error States**: Error haptic pattern (if platform supports)

#### Navigation Feedback
- **Tab Switch**: Light impact on selection
- **Modal Open/Close**: Light impact feedback
- **Search Results Load**: Success light impact

### Loading and Progress Patterns

#### Content Loading States

**Content Cards Loading**
```
State 1: Skeleton Screen (0-500ms)
├─ Placeholder shapes for image and text
├─ Subtle shimmer animation
└─ Proper spacing maintained

State 2: Progressive Loading (500ms+)
├─ Image placeholder → Actual image
├─ Text placeholders → Actual text
└─ Actions appear when data ready
```

**Search Results Loading**
```
Immediate: Show skeleton grid (0ms)
Progressive: Load results in batches of 20
Error: Show error state with retry option
Empty: Show "no results" with suggestions
```

#### Progress Indicators

**Linear Progress (for known duration)**
- Video/podcast playback progress
- List completion progress
- Case content consumption progress

**Circular Progress (for unknown duration)**
- Content search and filtering
- Account setup operations
- Data synchronization

**Step Indicators (for multi-step processes)**
- Onboarding flow (5 steps)
- Content rating process (3 steps)
- List creation (4 steps)

---

## Web Interaction Patterns

### Mouse and Keyboard Interactions

#### Hover States

**Content Cards**
```
Default State: Static card with basic information
Hover State: 
├─ Subtle scale transform (scale: 1.02)
├─ Elevated shadow (0px 8px 24px rgba(0,0,0,0.2))
├─ Quick action buttons appear
└─ Cursor changes to pointer
```

**Buttons**
```
Primary Button Hover:
├─ Background color darkens (-10% lightness)
├─ Subtle scale effect (scale: 1.01)
└─ Smooth transition (200ms ease-out)

Secondary Button Hover:
├─ Background color lightens (+5% lightness)
├─ Border color intensifies
└─ Smooth transition (200ms ease-out)
```

**Navigation Elements**
```
Tab Hover: Underline animation from center outward
Link Hover: Color change with underline grow animation
Menu Item Hover: Background color change + left border accent
```

#### Keyboard Navigation

**Tab Order Priority**
1. Primary navigation (header/sidebar)
2. Main content area (search, content cards)
3. Secondary actions (filters, sorting)
4. Footer/utility navigation

**Focus Indicators**
```
Focus Ring: 2px solid #8B4B7F (primary color)
Focus Offset: 2px from element boundary
Focus Animation: Smooth appearance (150ms ease-out)
High Contrast Mode: 3px solid with increased contrast
```

**Keyboard Shortcuts**
```
Global Shortcuts:
├─ "/" → Focus search bar
├─ "h" → Navigate to home
├─ "s" → Navigate to search
├─ "l" → Navigate to lists
├─ "?" → Show keyboard shortcuts help
└─ "Esc" → Close modal/overlay

Content Shortcuts:
├─ "Space" → Play/pause video content
├─ "w" → Add to watchlist
├─ "r" → Rate content (opens rating modal)
├─ "Enter" → Open selected content detail
└─ "Backspace" → Go back to previous screen
```

### Form Interactions

#### Input Field Patterns

**Text Input Focus**
```
Focus State:
├─ Border color: Primary (#8B4B7F)
├─ Border width: 2px (from 1px)
├─ Label animation: Float to top with scale
└─ Placeholder fade out (if label present)
```

**Error States**
```
Error Indication:
├─ Border color: Error red (#D32F2F)
├─ Error icon appears in field
├─ Error message below field
├─ Label color changes to error red
└─ Field background tinted with error color (5% opacity)
```

**Success States**
```
Success Indication:
├─ Border color: Success green (#388E3C)
├─ Checkmark icon appears in field
├─ Success message (if needed)
└─ Field background tinted with success color (5% opacity)
```

#### Search Interface Patterns

**Search Autocomplete**
```
Trigger: After 2 characters typed
Delay: 300ms debounce
Display: Dropdown with suggestions
Navigation: Arrow keys + Enter to select
Escape: Close suggestions, clear on double-escape
```

**Filter Interface**
```
Filter Panels:
├─ Collapsible sections with count indicators
├─ Apply/Clear actions at panel level
├─ Real-time result count updates
├─ Filter chips for active filters
└─ "Clear All" option when multiple filters active
```

---

## Animation and Motion Design

### Animation Principles for True Crime Content

#### Respectful Motion
- **Subdued Timing**: Slower, more thoughtful animations
- **Gentle Easing**: Avoid aggressive bounce or snap effects
- **Purposeful Movement**: Every animation serves a functional purpose
- **Content Sensitivity**: Reduced motion for graphic content warnings

#### Core Animation Patterns

**Page Transitions**
```
Mobile Navigation:
├─ Slide transitions between tabs (300ms ease-out)
├─ Fade transitions for overlays (250ms ease-out)
├─ Scale transitions for modals (300ms ease-out-back)
└─ Push/pop for navigation stack (350ms ease-out)

Web Navigation:
├─ Fade transitions between pages (200ms ease-out)
├─ Slide-in sidebars (250ms ease-out)
├─ Content area updates (150ms fade + 200ms slide)
└─ Modal overlays (200ms fade background + 250ms scale content)
```

**Content Interactions**
```
Card Interactions:
├─ Hover scale: scale(1.02) over 200ms ease-out
├─ Press feedback: scale(0.98) over 100ms ease-out
├─ Add to list: checkmark animation + success color
└─ Remove from list: slide-out + fade (300ms ease-in)

List Operations:
├─ Item addition: slide-in from top (250ms ease-out)
├─ Item removal: slide-out to right + fade (300ms ease-in)
├─ Reordering: smooth position transitions (200ms ease-out)
└─ Bulk selection: checkbox appear stagger (50ms delay between items)
```

#### Loading Animations

**Skeleton Screens**
```
Shimmer Effect:
├─ Gradient: Linear from transparent to white to transparent
├─ Animation: Move left to right over 1.5s ease-in-out
├─ Repeat: Infinite with 0.5s pause between cycles
└─ Performance: GPU-accelerated transform properties
```

**Progress Indicators**
```
Circular Spinner:
├─ Rotation: 360deg over 1s linear, infinite
├─ Color: Primary brand color with opacity
├─ Size: Responsive to container (24px, 32px, 48px)
└─ Accessibility: Announced to screen readers

Linear Progress:
├─ Indeterminate: Moving gradient animation
├─ Determinate: Smooth width transitions
├─ Color: Primary with background track
└─ Height: 4px standard, 8px for emphasis
```

### Reduced Motion Support

**Prefers-Reduced-Motion Implementation**
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable transform animations */
  .animated-element {
    transform: none !important;
    animation: none !important;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  
  /* Keep essential feedback, remove decorative motion */
  .loading-spinner {
    animation: none;
    opacity: 0.7;
  }
  
  /* Simplify page transitions */
  .page-transition {
    transition: opacity 0.2s ease;
  }
}
```

**Alternative Feedback for Reduced Motion**
- Static visual changes instead of animations
- Immediate state changes without transitions
- Audio feedback where appropriate (haptics on mobile)
- Clear text indicators for state changes

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

#### Color and Contrast

**Text Contrast Requirements**
```
Normal Text (under 18px):
├─ Minimum ratio: 4.5:1
├─ Target ratio: 7:1 for enhanced readability
├─ Testing: Against all background colors
└─ Tools: Automated testing in CI/CD pipeline

Large Text (18px+ or 14px+ bold):
├─ Minimum ratio: 3:1
├─ Target ratio: 4.5:1 for enhanced readability
├─ Headlines and UI elements included
└─ Testing: Manual verification with contrast tools

Non-text Elements:
├─ UI components: 3:1 minimum ratio
├─ Focus indicators: 3:1 against adjacent colors
├─ Icons and graphics: 3:1 when conveying information
└─ Interactive boundaries: Clear visual distinction
```

**Color Independence**
- Information never conveyed by color alone
- Status indicators use icons + color + text
- Error states combine color, icons, and descriptive text
- Charts and graphs include patterns and labels

#### Screen Reader Support

**Semantic HTML Structure**
```html
<!-- Proper heading hierarchy -->
<h1>Page Title</h1>
  <h2>Section Title</h2>
    <h3>Subsection Title</h3>

<!-- Meaningful landmarks -->
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main role="main">
<aside role="complementary" aria-label="Content filters">
<footer role="contentinfo">

<!-- Form associations -->
<label for="search-input">Search for True Crime content</label>
<input id="search-input" type="search" aria-describedby="search-help">
<div id="search-help">Search by case name, criminal, or location</div>
```

**ARIA Labels and Descriptions**
```html
<!-- Interactive elements -->
<button aria-label="Add Mindhunter to watchlist">
  <svg aria-hidden="true">...</svg>
  Add to Watchlist
</button>

<!-- Dynamic content -->
<div role="status" aria-live="polite" id="search-results">
  Found 24 documentaries about serial killers
</div>

<!-- Complex widgets -->
<div role="tabpanel" aria-labelledby="tab-documentaries">
  Documentary content...
</div>

<!-- Content warnings -->
<div role="alert" aria-describedby="warning-details">
  Content Warning: Graphic Violence
  <div id="warning-details">
    This content contains descriptions of violent crimes
  </div>
</div>
```

#### Keyboard Navigation

**Focus Management**
```javascript
// Modal focus trapping
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }
  });
}

// Skip links for efficiency
<a href="#main-content" class="skip-link">Skip to main content</a>
<a href="#navigation" class="skip-link">Skip to navigation</a>
```

**Keyboard Shortcuts Help**
```html
<!-- Accessible help modal -->
<dialog aria-labelledby="shortcuts-title" aria-describedby="shortcuts-desc">
  <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
  <p id="shortcuts-desc">Available keyboard shortcuts for efficient navigation</p>
  
  <dl>
    <dt>/ (slash)</dt>
    <dd>Focus search bar</dd>
    
    <dt>h</dt>
    <dd>Navigate to home page</dd>
    
    <dt>? (question mark)</dt>
    <dd>Show this help dialog</dd>
  </dl>
</dialog>
```

### Trauma-Informed Accessibility

#### Content Warning Implementation

**Warning Hierarchy**
```
Level 1 - Mild Content Warnings:
├─ Visual: Yellow indicator badge
├─ Text: "Mature themes discussed"
├─ Audio: Optional audio warning
└─ Bypass: User can dismiss after acknowledgment

Level 2 - Moderate Content Warnings:
├─ Visual: Orange indicator badge + blur overlay
├─ Text: "Graphic content discussion"
├─ Audio: Emphasized audio warning
├─ Interaction: Requires explicit user action to view
└─ Bypass: Cannot be globally disabled

Level 3 - Severe Content Warnings:
├─ Visual: Red indicator + full content block
├─ Text: "Explicit violence and disturbing imagery"
├─ Audio: Clear audio warning with pause
├─ Interaction: Multiple confirmation steps
└─ Bypass: Session-only bypass, resets on restart
```

**User Control Patterns**
```html
<!-- Content warning preferences -->
<fieldset>
  <legend>Content Warning Preferences</legend>
  
  <div role="group" aria-labelledby="warning-level">
    <span id="warning-level">Warning Sensitivity Level</span>
    <input type="radio" name="warnings" id="high-sensitivity" value="high">
    <label for="high-sensitivity">High - Show all warnings</label>
    
    <input type="radio" name="warnings" id="medium-sensitivity" value="medium">
    <label for="medium-sensitivity">Medium - Show moderate and severe warnings</label>
    
    <input type="radio" name="warnings" id="low-sensitivity" value="low">
    <label for="low-sensitivity">Low - Show severe warnings only</label>
  </div>
</fieldset>

<!-- Content filter controls -->
<div role="region" aria-labelledby="content-filters">
  <h3 id="content-filters">Content Filters</h3>
  
  <label>
    <input type="checkbox" id="hide-graphic-violence">
    Hide content with graphic violence descriptions
  </label>
  
  <label>
    <input type="checkbox" id="hide-victim-photos">
    Hide victim photographs and personal images
  </label>
</div>
```

#### Safe Exit Patterns

**Emergency Exit Features**
```javascript
// Quick exit functionality
function implementQuickExit() {
  document.addEventListener('keydown', (e) => {
    // Triple ESC key for emergency exit
    if (e.key === 'Escape') {
      escapeCount++;
      if (escapeCount === 3) {
        // Immediate redirect to neutral site
        window.location.href = 'https://www.google.com';
      }
      setTimeout(() => { escapeCount = 0; }, 1000);
    }
  });
  
  // Always-visible exit button
  const exitButton = document.createElement('button');
  exitButton.innerHTML = 'Quick Exit';
  exitButton.className = 'emergency-exit';
  exitButton.setAttribute('aria-label', 'Emergency exit - leaves app immediately');
  exitButton.onclick = () => {
    window.location.href = 'https://www.google.com';
  };
}
```

### Motor Accessibility

#### Touch Target Guidelines

**Minimum Sizes**
```
Primary Actions: 48x48px minimum (iOS), 48x48dp (Android)
Secondary Actions: 44x44px minimum
Text Links: 44x44px clickable area (may extend beyond visual)
Form Controls: 48x48px minimum touch area
Close Buttons: 44x44px minimum (often made larger for safety)
```

**Touch Target Spacing**
```
Adjacent Targets: 8px minimum space between targets
Destructive Actions: 16px minimum space from other actions
Form Buttons: 16px minimum space between submit/cancel
Navigation Elements: 4px minimum space, larger for primary nav
```

#### Alternative Input Methods

**Voice Control Support**
```html
<!-- Voice control labels -->
<button aria-label="Add to watchlist" data-voice-command="add watchlist">
  Add to List
</button>

<nav aria-label="Main navigation" data-voice-region="main menu">
  <a href="/home" data-voice-command="home">Home</a>
  <a href="/search" data-voice-command="search">Search</a>
</nav>
```

**Switch Control Support**
```css
/* High visibility focus indicators for switch users */
.switch-navigation-mode button:focus {
  outline: 4px solid #8B4B7F;
  outline-offset: 4px;
  background-color: rgba(139, 75, 127, 0.1);
}

/* Extended hover time for motor difficulties */
.content-card:hover {
  transition-delay: 0.5s; /* Gives users time to stabilize */
}
```

### Cognitive Accessibility

#### Clear Information Architecture

**Consistent Patterns**
- Same interactions work the same way throughout app
- Predictable navigation patterns across all screens
- Consistent visual hierarchy and layout grids
- Standardized terminology and labeling

**Progress Indicators**
```html
<!-- Multi-step process clarity -->
<div role="progressbar" aria-valuenow="2" aria-valuemin="1" aria-valuemax="5">
  <span class="sr-only">Step 2 of 5: Content Preferences</span>
  <div class="progress-visual">
    <span class="step completed">Account</span>
    <span class="step current">Preferences</span>
    <span class="step">Services</span>
    <span class="step">Privacy</span>
    <span class="step">Complete</span>
  </div>
</div>
```

**Error Prevention and Recovery**
```html
<!-- Destructive action confirmation -->
<dialog role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
  <h2 id="confirm-title">Delete Watchlist</h2>
  <p id="confirm-desc">
    This will permanently delete your "Horror Documentaries" list with 12 items. 
    This action cannot be undone.
  </p>
  <button type="button">Cancel</button>
  <button type="button" class="destructive">Delete List</button>
</dialog>

<!-- Undo functionality -->
<div role="alert" aria-live="assertive">
  Removed "Mindhunter" from watchlist. 
  <button type="button">Undo</button>
</div>
```

## Testing and Validation

### Automated Accessibility Testing

**CI/CD Integration**
```javascript
// Axe-core automated testing
const axe = require('@axe-core/react');
const { toHaveNoViolations } = require('jest-axe');

expect.extend(toHaveNoViolations);

test('Content card should be accessible', async () => {
  const { container } = render(<ContentCard {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Lighthouse CI for performance and accessibility
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage'
      }
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:performance': ['warn', { minScore: 0.85 }]
      }
    }
  }
};
```

### Manual Testing Protocol

**Screen Reader Testing**
1. **NVDA (Windows)**: Complete user flow testing
2. **JAWS (Windows)**: Business user scenario testing  
3. **VoiceOver (macOS/iOS)**: Mobile and desktop testing
4. **TalkBack (Android)**: Mobile app testing

**Keyboard Testing Checklist**
- [ ] All functionality accessible via keyboard
- [ ] Focus indicators visible and logical
- [ ] No keyboard traps in complex widgets
- [ ] Skip links function correctly
- [ ] Shortcut keys don't conflict with assistive technology

**Motor Accessibility Testing**
- [ ] All touch targets meet minimum size requirements
- [ ] Alternative input methods work correctly
- [ ] Voice control operates all functions
- [ ] Switch control navigation is efficient

**Cognitive Load Testing**
- [ ] Information hierarchy is clear and logical
- [ ] Error messages are helpful and actionable
- [ ] Multi-step processes include progress indicators
- [ ] Undo functionality available for destructive actions

## Performance Impact Considerations

### Animation Performance
- All animations use GPU-accelerated properties (transform, opacity)
- Complex animations include performance budgets and fallbacks
- Reduced motion preferences respected without losing functionality
- 60fps target for all interactive animations

### Accessibility Feature Performance
- Screen reader optimizations don't impact visual user performance
- ARIA live regions used judiciously to avoid spam
- Focus management scripts optimized for large content lists
- Alternative text generation cached for repeated content

---

## Related Documentation

### Feature Specifications
- [Authentication & Onboarding](features/authentication/README.md) - Entry flow patterns and first-time user experience
- [Content Discovery](features/content-discovery/README.md) - Search and browse interaction patterns
- [Content Tracking](features/content-tracking/README.md) - Progress tracking and list management interactions
- [Social Features](features/social-features/README.md) - Community interaction patterns and sharing flows
- [Notifications](features/notifications/README.md) - Alert timing and interaction patterns

### Design Foundations
- [User Flows](user-flows.md) - Complete user journey mappings
- [User Personas](user-personas.md) - Target user definitions driving interaction decisions
- [User Stories](user-stories.md) - Feature requirements and acceptance criteria
- [Information Architecture](information-architecture.md) - Navigation structure and content organization

### Component Implementation
- [Component Library](design-system/components/README.md) - Reusable component specifications
- [Button Components](design-system/components/buttons.md) - Button interaction states and behaviors
- [Form Components](design-system/components/forms.md) - Input field interactions and validation
- [Card Components](design-system/components/cards.md) - Content card interaction patterns

---

*These interaction patterns and accessibility guidelines ensure the True Crime app provides an inclusive, respectful, and efficient experience for all users while maintaining the sensitivity required for the content domain.*

*Last Updated: August 19, 2025*
*Next Review: November 19, 2025*