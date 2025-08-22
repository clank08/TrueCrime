# True Crime App - Complete Style Guide

## Design Philosophy

This design system balances the engaging nature of True Crime content with the respect and sensitivity required for real-world tragedy. Our visual identity emphasizes sophistication, clarity, and user safety while maintaining the compelling experience that keeps users engaged.

## Color System

### Primary Colors

**Primary**: `#8B4B7F` – Deep plum, sophisticated and respectful
**Primary Dark**: `#6B3760` – Darker variation for hover states and emphasis
**Primary Light**: `#A66B9E` – Lighter variation for subtle backgrounds and highlights

*Usage*: Main CTAs, brand elements, navigation highlights. Chosen for its sophisticated feel that avoids the sensationalism often associated with crime content.

### Secondary Colors

**Secondary**: `#4A4A5A` – Charcoal grey, neutral and calming
**Secondary Light**: `#6B6B7A` – Lighter grey for supporting elements
**Secondary Pale**: `#E8E8EA` – Very light grey for subtle backgrounds

*Usage*: Supporting UI elements, secondary actions, content containers.

### Accent Colors

**Accent Primary**: `#D32F2F` – Muted red for warnings and important alerts
**Accent Secondary**: `#FF8F00` – Amber for notifications and highlights
**Gradient Start**: `#8B4B7F` – Primary purple for gradient elements
**Gradient End**: `#4A4A5A` – Secondary grey for sophisticated gradients

### Semantic Colors

**Success**: `#388E3C` – Forest green, trustworthy and positive
**Warning**: `#F57C00` – Orange, attention-grabbing but not alarming
**Error**: `#D32F2F` – Muted red, clear but not harsh
**Info**: `#1976D2` – Professional blue for informational content

### Neutral Palette (Dark Theme Primary)

- **Neutral-50**: `#FAFAFA` – Pure whites for high contrast text
- **Neutral-100**: `#F5F5F5` – Off-white for cards on light backgrounds  
- **Neutral-200**: `#EEEEEE` – Light grey for borders and dividers
- **Neutral-300**: `#E0E0E0` – Medium light grey for inactive elements
- **Neutral-400**: `#BDBDBD` – Mid grey for placeholder text
- **Neutral-500**: `#9E9E9E` – True grey for secondary text
- **Neutral-600**: `#757575` – Dark grey for body text on light backgrounds
- **Neutral-700**: `#616161` – Darker grey for emphasis
- **Neutral-800**: `#424242` – Very dark grey for headings on light
- **Neutral-900**: `#212121` – Near black for high contrast text

### Dark Theme Palette (Optimized for True Crime Viewing)

- **Dark-50**: `#1A1A1C` – Primary background, optimized for evening viewing
- **Dark-100**: `#2C2C30` – Card backgrounds with subtle contrast
- **Dark-200**: `#3A3A40` – Elevated surfaces and active states
- **Dark-300**: `#4A4A52` – Borders and dividers with visibility
- **Dark-400**: `#6A6A74` – Secondary text, readable but not prominent
- **Dark-500**: `#8A8A94` – Primary text with good contrast
- **Dark-600**: `#AAAAB4` – Emphasized text and active elements
- **Dark-700**: `#CACAD4` – High contrast text for important content
- **Dark-800**: `#EAEAF4` – Maximum contrast for critical text
- **Dark-900**: `#FFFFFF` – Pure white for alerts and CTAs

### Accessibility Notes

- All text on background combinations maintain minimum 4.5:1 contrast ratio (WCAG AA)
- Critical actions and warnings maintain 7:1 contrast ratio for enhanced accessibility
- Color combinations tested for common color vision deficiencies (deuteranopia, protanopia, tritanopia)
- Dark theme optimized for reduced eye strain during extended viewing sessions

## Typography System

### Font Stack

**Primary**: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`
**Monospace**: `'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace`

*Rationale*: Inter provides excellent readability across all sizes and weights, crucial for content-heavy True Crime interfaces. Its humanist characteristics soften the technical feel while maintaining professionalism.

### Font Weights

- **Light**: 300 – Subtle text, large headings where appropriate
- **Regular**: 400 – Body text, standard UI elements
- **Medium**: 500 – Subheadings, emphasized text
- **Semibold**: 600 – Section headers, button text
- **Bold**: 700 – Major headings, critical information

### Type Scale (Mobile-First)

**H1**: `28px/32px, 600, -0.02em` – Page titles, feature headers
**H2**: `24px/28px, 600, -0.01em` – Section headers, modal titles  
**H3**: `20px/24px, 500, 0em` – Subsection headers, card titles
**H4**: `18px/22px, 500, 0em` – Content headers, list titles
**H5**: `16px/20px, 500, 0em` – Minor headers, metadata labels
**Body Large**: `18px/26px, 400` – Primary reading text, descriptions
**Body**: `16px/24px, 400` – Standard UI text, form inputs
**Body Small**: `14px/20px, 400` – Secondary information, captions
**Caption**: `12px/16px, 400` – Timestamps, metadata, fine print
**Label**: `14px/16px, 500, 0.02em, uppercase` – Form labels, categories
**Button**: `16px/20px, 600` – Button text, CTAs
**Code**: `14px/20px, 400, monospace` – Technical text, debug info

### Responsive Typography (Desktop Scaling)

**H1**: `36px/40px` (+8px)
**H2**: `30px/34px` (+6px)
**H3**: `24px/28px` (+4px)
**Body Large**: `20px/28px` (+2px)
**Body**: `18px/26px` (+2px)

*All other sizes remain consistent across breakpoints to maintain UI familiarity*

## Spacing & Layout System

### Base Unit: 4px

Chosen for pixel-perfect alignment across all devices while providing fine-grained control for compact mobile interfaces.

### Spacing Scale

- **xs**: `4px` – Micro spacing between closely related elements
- **sm**: `8px` – Small spacing, internal padding for buttons
- **md**: `16px` – Default spacing, standard margins between sections
- **lg**: `24px` – Large spacing, major section separation  
- **xl**: `32px` – Extra large spacing, screen padding
- **2xl**: `48px` – Huge spacing, hero sections and major breaks
- **3xl**: `64px` – Maximum spacing, full-screen separations

### Layout Grid System

**Mobile (320px - 767px)**
- **Columns**: 4 with 16px gutters
- **Margins**: 16px on each side
- **Max Content Width**: 288px (320-32px margins)

**Tablet (768px - 1023px)** 
- **Columns**: 8 with 20px gutters  
- **Margins**: 32px on each side
- **Max Content Width**: 704px (768-64px margins)

**Desktop (1024px - 1439px)**
- **Columns**: 12 with 24px gutters
- **Margins**: 48px on each side  
- **Max Content Width**: 928px (1024-96px margins)

**Wide (1440px+)**
- **Columns**: 12 with 24px gutters
- **Margins**: Auto-center with max 1200px content width
- **Max Content Width**: 1200px centered

## Component Specifications

### Button Component

**Variants**: Primary, Secondary, Tertiary, Ghost, Danger

**Primary Button**
- **Height**: `48px` (mobile), `44px` (desktop)
- **Padding**: `16px 24px`
- **Border Radius**: `8px`
- **Background**: Primary (`#8B4B7F`)
- **Text**: White (`#FFFFFF`)
- **Typography**: Button (16px/20px, 600)

**States**:
- **Default**: Background `#8B4B7F`, shadow `0px 2px 4px rgba(139, 75, 127, 0.2)`
- **Hover**: Background `#6B3760`, shadow `0px 4px 8px rgba(139, 75, 127, 0.3)`
- **Active**: Background `#5A2E50`, shadow `inset 0px 2px 4px rgba(0, 0, 0, 0.2)`  
- **Focus**: Background `#8B4B7F`, outline `2px solid #A66B9E`, offset `2px`
- **Disabled**: Background `#E0E0E0`, text `#9E9E9E`, no shadow
- **Loading**: Background `#8B4B7F`, spinner overlay, disabled pointer events

### Card Component

**Base Card**
- **Background**: `#2C2C30` (dark theme), `#FFFFFF` (light theme)
- **Border Radius**: `12px`
- **Padding**: `16px`
- **Shadow**: `0px 2px 8px rgba(0, 0, 0, 0.1)` (light), `0px 2px 8px rgba(0, 0, 0, 0.3)` (dark)
- **Border**: `1px solid #3A3A40` (dark theme only)

**Content Card (for shows/movies)**
- **Aspect Ratio**: 3:4 for poster images
- **Image Border Radius**: `8px`
- **Content Padding**: `12px` below image
- **Title Typography**: H4 (18px/22px, 500)
- **Meta Typography**: Body Small (14px/20px, 400)

### Form Input Component

**Text Input**
- **Height**: `48px`
- **Padding**: `12px 16px`
- **Border Radius**: `8px`
- **Border**: `1px solid #4A4A52` (dark), `1px solid #E0E0E0` (light)
- **Background**: `#3A3A40` (dark), `#FFFFFF` (light)
- **Typography**: Body (16px/24px, 400)

**States**:
- **Default**: Border as specified above
- **Focus**: Border `2px solid #8B4B7F`, outline removed
- **Error**: Border `2px solid #D32F2F`, background tint `rgba(211, 47, 47, 0.05)`
- **Success**: Border `2px solid #388E3C`, background tint `rgba(56, 142, 60, 0.05)`
- **Disabled**: Background `#2C2C30` (dark), `#F5F5F5` (light), text `#6A6A74`

## Motion & Animation System

### Timing Functions

**Ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` – Used for entrances and expansions
**Ease-in-out**: `cubic-bezier(0.4, 0, 0.6, 1)` – Used for transitions and movements  
**Spring**: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` – Used for playful interactions

### Duration Scale

- **Micro**: `150ms` – State changes, hover effects, button presses
- **Short**: `250ms` – Component transitions, dropdowns, tooltips
- **Medium**: `400ms` – Page transitions, modal appearances  
- **Long**: `600ms` – Complex animations, onboarding flows

### Animation Principles

**Performance First**: All animations use GPU-accelerated properties (transform, opacity) for 60fps performance
**Purposeful Motion**: Every animation serves a functional purpose (guidance, feedback, spatial relationships)
**Respectful Pacing**: Animation timing respects the serious nature of content while maintaining engagement
**Accessibility**: All animations respect `prefers-reduced-motion` and can be disabled

### Common Animation Patterns

**Fade In**: `opacity: 0 → 1, duration: 250ms, ease-out`
**Slide Up**: `transform: translateY(20px) → translateY(0), opacity: 0 → 1, duration: 400ms, ease-out`
**Scale In**: `transform: scale(0.95) → scale(1), opacity: 0 → 1, duration: 250ms, ease-out`
**Loading Pulse**: `opacity: 1 → 0.6 → 1, duration: 1500ms, infinite, ease-in-out`

## Dark Theme Implementation (Primary Experience)

### Theme Strategy

The True Crime app defaults to dark theme as the primary experience, optimized for evening viewing when users are most likely to consume this content type.

**Background Hierarchy**:
- **Level 0**: `#1A1A1C` – App background, safe areas
- **Level 1**: `#2C2C30` – Card backgrounds, main content areas
- **Level 2**: `#3A3A40` – Elevated surfaces, active states
- **Level 3**: `#4A4A52` – Highest elevation, overlays, modals

**Text Hierarchy**:
- **Primary**: `#EAEAF4` – Headings, important text
- **Secondary**: `#AAAAB4` – Body text, standard content
- **Tertiary**: `#8A8A94` – Supporting text, metadata
- **Disabled**: `#6A6A74` – Inactive elements

### Light Theme (Secondary Option)

Available for users who prefer light interfaces, particularly for daytime usage or accessibility needs.

**Background Hierarchy**:
- **Level 0**: `#FFFFFF` – App background
- **Level 1**: `#FAFAFA` – Card backgrounds  
- **Level 2**: `#F5F5F5` – Elevated surfaces
- **Level 3**: `#EEEEEE` – Highest elevation

**Text Hierarchy**:
- **Primary**: `#212121` – Headings, important text
- **Secondary**: `#424242` – Body text
- **Tertiary**: `#757575` – Supporting text
- **Disabled**: `#BDBDBD` – Inactive elements

## Content-Specific Design Patterns

### Content Warning System

**Warning Levels**:
- **Mild**: Yellow indicator (`#FF8F00`) for mature themes
- **Moderate**: Orange indicator (`#F57C00`) for graphic content discussion
- **Severe**: Red indicator (`#D32F2F`) for explicit violence or disturbing imagery

**Visual Treatment**:
- Warning badge in top-right corner of content cards
- Consistent iconography across all warning levels
- Optional content blurring with user control to reveal

### Content Type Indicators

**Documentary**: Green badge (`#388E3C`) with "DOC" label
**Series**: Blue badge (`#1976D2`) with "SERIES" label  
**Dramatization**: Purple badge (`#8B4B7F`) with "DRAMA" label
**Podcast**: Orange badge (`#F57C00`) with "PODCAST" label

*Visual Implementation*: Small rounded badges positioned consistently on all content cards

### Progress Indicators

**Watch Status**:
- **Not Started**: Empty circle outline
- **In Progress**: Partial filled circle with percentage
- **Completed**: Filled circle with checkmark
- **Abandoned**: Empty circle with X overlay

**Colors**: 
- Progress: Primary (`#8B4B7F`)
- Completed: Success (`#388E3C`)
- Abandoned: Neutral (`#6A6A74`)

## Accessibility Specifications

### WCAG 2.1 AA Compliance

**Color Contrast**:
- Normal text: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio  
- Critical actions: Target 7:1 ratio for enhanced accessibility
- UI components: Minimum 3:1 ratio for non-text elements

**Keyboard Navigation**:
- All interactive elements accessible via keyboard
- Logical tab order throughout application
- Visible focus indicators with 2px outline
- Skip links for main navigation areas

**Screen Reader Support**:
- Semantic HTML structure with proper headings hierarchy
- ARIA labels for all custom components
- Live regions for dynamic content updates
- Alternative text for all meaningful images

**Motion & Animation**:
- Respect `prefers-reduced-motion` system setting
- Provide static alternatives for all animated content
- Essential animations (loading, progress) maintained but simplified

### Trauma-Informed Design Considerations

**User Control**:
- Granular content filtering options
- Ability to hide specific types of content
- User-controlled content warnings and blurring
- Easy exit options from distressing content

**Safe Default States**:
- Content warnings enabled by default
- Graphic content hidden until user opt-in
- Conservative notification settings initially
- Privacy-first social feature defaults

## Platform-Specific Adaptations

### iOS Adaptations

**Visual Design**:
- Rounded corners align with iOS 15+ design language
- SF Symbols integration where appropriate
- Haptic feedback for confirmations and warnings
- Dynamic Type support for accessibility

**Interaction Patterns**:
- Pull-to-refresh on scrollable lists
- Swipe gestures for quick actions (mark watched, add to list)
- Context menus for secondary actions
- Safe area respect for notched devices

### Android Adaptations  

**Material Design Integration**:
- Elevation system using appropriate shadow depths
- Material ripple effects on touch interactions
- Floating Action Buttons for primary actions
- Bottom sheet patterns for secondary actions

**Navigation**:
- Android back button behavior
- Navigation drawer for secondary navigation
- Adaptive icons for various launcher themes
- Edge-to-edge design with system bar handling

### Web Adaptations

**Responsive Behavior**:
- Fluid grid system scaling from 320px to 4K+
- Hover states for desktop interactions
- Keyboard shortcuts for power users
- Progressive enhancement for JavaScript-free functionality

**Performance Optimizations**:
- Image lazy loading with intersection observer
- Component code splitting for faster initial loads
- Service worker caching for offline functionality
- Core Web Vitals optimization

## Implementation Guidelines

### NativeWind/Tailwind CSS Integration

**Custom Configuration Required**:

```javascript
// tailwind.config.js additions
theme: {
  extend: {
    colors: {
      'primary': '#8B4B7F',
      'primary-dark': '#6B3760',
      'primary-light': '#A66B9E',
      'secondary': '#4A4A5A',
      'dark-50': '#1A1A1C',
      'dark-100': '#2C2C30',
      // ... rest of palette
    },
    fontFamily: {
      'sans': ['Inter', ...defaultTheme.fontFamily.sans],
    },
    spacing: {
      'xs': '4px',
      'sm': '8px', 
      'md': '16px',
      'lg': '24px',
      'xl': '32px',
      '2xl': '48px',
      '3xl': '64px',
    }
  }
}
```

### React Native Component Examples

```typescript
// Button Component Structure
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

// Theme Integration
const useThemeColors = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? Colors.dark : Colors.light;
};
```

### Performance Targets

**Animation Performance**: 60fps minimum for all transitions
**Component Rendering**: Sub-16ms render times for scrolling performance  
**Memory Usage**: Efficient image loading and caching for content-heavy interfaces
**Bundle Size**: Code splitting for feature-based loading

## Quality Assurance Checklist

### Design System Compliance
- [ ] All colors match defined palette with proper contrast ratios
- [ ] Typography follows established hierarchy and scale consistently
- [ ] Spacing uses systematic 4px base unit throughout
- [ ] Components match documented specifications exactly
- [ ] Motion follows timing and easing standards
- [ ] Dark theme is primary experience with proper contrast

### True Crime Content Considerations
- [ ] Content warnings are appropriately implemented and visible
- [ ] Fact vs. fiction distinctions are clear in all content displays
- [ ] Victim names and images are treated with appropriate respect
- [ ] Sensitive content has appropriate user controls and defaults
- [ ] Community features have privacy-first defaults
- [ ] Trauma-informed design principles are evident throughout

### Accessibility & Safety
- [ ] WCAG 2.1 AA compliance verified across all screens
- [ ] Keyboard navigation complete and logical throughout app
- [ ] Screen reader experience optimized with proper semantic markup
- [ ] Color contrast verified for both light and dark themes
- [ ] Motion respects user preferences and has static alternatives
- [ ] User safety features (content filtering, privacy controls) are accessible

### Cross-Platform Consistency
- [ ] Design system translates appropriately to iOS, Android, and Web
- [ ] Platform-specific adaptations maintain brand consistency
- [ ] Responsive behavior works across all supported screen sizes
- [ ] Performance targets are met on all target platforms
- [ ] Component implementations support both mobile and web usage

## Version History

- **v1.0** (August 15, 2025): Initial comprehensive design system
- **Component Library**: TBD based on development priorities
- **Platform Adaptations**: TBD based on platform launch sequence

---

*This style guide serves as the foundational document for all design decisions in the True Crime tracking app. It balances the engaging nature of the content with the respect and sensitivity required for real-world crime stories, ensuring both user engagement and ethical content handling.*