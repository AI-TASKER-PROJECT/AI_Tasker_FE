# Design Decisions

This file stores reusable UI/design decisions for the Stitch-to-React conversion flow.

The AI agent should update this file when it discovers stable design rules from `DESIGN.md` or exported Stitch screens.

## Color System

- Landing screens use a warm off-white hero background (`#fff8f8`) with soft pink and blue blur accents behind the content.
- Primary marketing CTA uses the saturated magenta family (`#b30069` to `#b8006c`) with white text.
- Highlight underlines and supporting accents use vivid blue (`#0070ea`).
- Feature cards alternate between pale pink surfaces (`#fff0f3`) and strong blue emphasis blocks for contrast.

## Typography

- Display headings should stay bold, dense, and high-contrast, using the existing display font with tight tracking.
- Marketing body copy stays larger than dashboard body text, around 18-20px with generous line height.
- Small badges and metadata use compact bold labels with rounded pill containers.

## Layout Rules

- Public marketing sections continue to use a centered `max-w-7xl` container with large vertical spacing.
- Hero layout is a two-column desktop composition and a stacked mobile composition.
- Shared anchor routes such as `/how-it-works` and `/about` should keep stable section ids even when the visual design changes.

## Components

### Buttons

- Primary CTA buttons are rounded rectangles with solid magenta fill and a soft shadow.
- Secondary CTA buttons use white backgrounds, muted outline borders, and darker text instead of blue fill.

### Forms

<!-- Add input, label, error message style rules here -->

### Cards

- Marketing cards for the landing screen use low-contrast borders, large rounded corners, and mostly flat surfaces without heavy dashboard shadows.
- The emphasized feature tile can switch to a full blue surface with white text while preserving the same radius rhythm.

## Responsive Rules

- Hide the hero illustration on smaller screens and preserve the primary message/CTA stack first.
- Keep footer and top navigation session behavior shared through `PublicShell`; screen-specific restyling should stay inside the page where possible.

## Notes

- When a Stitch export filename differs from tracking files, normalize the tracking metadata to the actual export instead of modifying `stitch/raw/`.
