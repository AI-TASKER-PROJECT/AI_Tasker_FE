---
name: Lumina Tech Pro
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e3'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fd'
  surface-container: '#f0ecf7'
  surface-container-high: '#eae7f1'
  surface-container-highest: '#e4e1ec'
  on-surface: '#1b1b22'
  on-surface-variant: '#594048'
  inverse-surface: '#303038'
  inverse-on-surface: '#f2effa'
  outline: '#8d6f79'
  outline-variant: '#e1bdc8'
  surface-tint: '#b8006c'
  primary: '#b30069'
  on-primary: '#ffffff'
  primary-container: '#df0e84'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb0cc'
  secondary: '#0059bb'
  on-secondary: '#ffffff'
  secondary-container: '#0070ea'
  on-secondary-container: '#fefcff'
  tertiary: '#00657a'
  on-tertiary: '#ffffff'
  tertiary-container: '#007f9a'
  on-tertiary-container: '#fafdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e4'
  primary-fixed-dim: '#ffb0cc'
  on-primary-fixed: '#3e0021'
  on-primary-fixed-variant: '#8d0051'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc7ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004493'
  tertiary-fixed: '#b4ebff'
  tertiary-fixed-dim: '#3cd7ff'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#004e5f'
  background: '#fcf8ff'
  on-background: '#1b1b22'
  surface-variant: '#e4e1ec'
typography:
  headline-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system transitions from a dark, neon-heavy aesthetic to a **Modern Professional Tech** style. The personality is efficient, high-clarity, and trustworthy, while retaining an energetic edge through strategic use of vibrant accents. 

The visual language draws from **Minimalism** and **Corporate Modern** influences, prioritizing high-contrast legibility and expansive whitespace. The "Cyber-Nomad" origins are preserved not through grit or darkness, but through sharp execution, precision lines, and a "high-performance" feel. The emotional response should be one of clarity, momentum, and professional reliability.

## Colors

The palette is anchored in a pristine, high-accessibility light environment. 

- **Primary (#E91E8C):** Retained as the signature "Energetic Pink." It is used for primary calls-to-action and critical brand moments.
- **Secondary/Tertiary:** The neon cyans have been refined into a professional Blue (#007BFF) and a vibrant Sky Blue (#00D4FF) to ensure they pop against white without feeling "washed out."
- **Neutrals:** We utilize a near-black (#0D0D14) for primary text to ensure maximum WCAG compliance. Secondary text (#5A5A7A) provides a softened hierarchy.
- **Surfaces:** Pure White (#FFFFFF) is reserved for interactive cards and input areas, while the Light Gray (#F8F9FA) acts as the foundation to define the viewport boundaries.

## Typography

The design system utilizes **Be Vietnam Pro** across all levels to maintain a contemporary, tech-forward character. 

- **Headlines:** Use Bold (700) or Semi-Bold (600) weights with slightly tight letter-spacing to create a "dense," professional look.
- **Body:** Standardized on 16px for optimal readability. The line height is generous (1.5x) to ensure content remains breathable in data-heavy applications.
- **Labels:** Set in medium to semi-bold weights with slight tracking (letter-spacing) to differentiate them from body text, often used for buttons, table headers, and small metadata.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum content width of 1440px for desktop. 

- **Grid:** A 12-column grid is used for desktop (40px margins), transitioning to a 4-column grid for mobile (16px margins).
- **Rhythm:** An 8px base unit governs all dimensions. Internal component padding should scale in 4px or 8px increments.
- **Reflow:** On tablet devices, gutters remain 24px, but side margins reduce to 24px to maximize screen real estate for complex SaaS-style dashboards.

## Elevation & Depth

This design system uses **Tonal Layers** and **Ambient Shadows** to create a structured sense of depth without the "heaviness" of the previous dark theme.

- **Level 0 (Base):** #F8F9FA.
- **Level 1 (Cards/Surfaces):** #FFFFFF with a 1px border of #E2E8F0. No shadow.
- **Level 2 (Interactive/Floating):** #FFFFFF with a soft, diffused shadow (0px 4px 12px rgba(13, 13, 20, 0.05)).
- **Level 3 (Modals/Overlays):** #FFFFFF with a deeper shadow (0px 12px 32px rgba(13, 13, 20, 0.1)).

Shadows should be tinted slightly with the neutral "near-black" to maintain a clean, professional appearance rather than using muddy true blacks.

## Shapes

The design system adopts a **Rounded** (0.5rem) language. This softens the "industrial" feel of the professional tech aesthetic, making the UI feel approachable and modern.

- **Small elements (Inputs, Buttons):** 0.5rem (8px).
- **Medium elements (Cards, Modals):** 1rem (16px).
- **Large elements (Outer containers):** 1.5rem (24px).
- **Pills:** Full rounding is reserved strictly for status chips and tags to differentiate them from primary action buttons.

## Components

- **Buttons:** Primary buttons use a solid #E91E8C fill with white text. Secondary buttons use a white fill with a #E2E8F0 border and #0D0D14 text. Use a 0.5rem corner radius.
- **Inputs:** Fields use a #FFFFFF background and #E2E8F0 border. On focus, the border transitions to #007BFF with a subtle 2px glow of the same color at 15% opacity.
- **Chips:** Small, pill-shaped tags. Use #F1F5F9 backgrounds with #5A5A7A text for neutral states, and light tints of primary/secondary colors for active states.
- **Cards:** White surfaces with a #E2E8F0 border. For "Hover" states, lift the card using the Level 2 shadow defined in the Elevation section.
- **Lists:** Clean rows separated by 1px #E2E8F0 horizontal rules. Use generous 16px vertical padding for list items.
- **Checkboxes/Radios:** Use #007BFF for the selected state to maintain professional clarity; reserve #E91E8C for high-impact marketing components or destructive actions.