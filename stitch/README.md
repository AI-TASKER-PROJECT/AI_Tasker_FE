# Stitch Export Source

This folder stores exported design sources from Stitch website.

These files are used as visual references for converting Stitch screens into the existing React frontend.

## Folder Structure

```txt
stitch/
├─ raw/
│  ├─ landing.html
│  ├─ login.html
│  ├─ register-business.html
│  └─ business-dashboard.html
├─ screenshots/
│  ├─ landing.png
│  ├─ login.png
│  ├─ register-business.png
│  └─ business-dashboard.png
└─ README.md
```

## Purpose

The `stitch/` folder is the design source folder.

It contains:

* Exported Stitch HTML/code files
* Screenshots of Stitch screens
* Visual references for the AI agent

The AI agent should use these files to convert Stitch designs into React components/pages.

## Important Rule

Files inside `stitch/raw/` are read-only design references.

Do not edit these files directly.

If a Stitch design changes, export or copy the updated screen from Stitch website again and replace the corresponding file in `stitch/raw/`.

## `raw/`

The `raw/` folder contains exported code from Stitch website.

Each file should represent one screen.

Example:

```txt
stitch/raw/login.html
```

This file is the source design for the React login page.

## `screenshots/`

The `screenshots/` folder contains images captured from Stitch website.

Each screenshot should match the corresponding raw file.

Example:

```txt
stitch/raw/login.html
stitch/screenshots/login.png
```

The screenshot is used to visually compare whether the React implementation matches the Stitch design.

## Naming Rule

Use simple kebab-case names.

Good examples:

```txt
landing.html
login.html
register-business.html
business-dashboard.html
expert-dashboard.html
```

Avoid names like:

```txt
Screen 1.html
final-new-copy.html
login latest.html
```

## Agent Instructions

When converting a screen, the AI agent must:

1. Read the matching file in `stitch/raw/`.
2. Use the matching screenshot in `stitch/screenshots/` as visual reference.
3. Convert the Stitch layout into React.
4. Preserve existing React logic.
5. Do not redesign the screen.
6. Do not simplify the layout.
7. Do not edit files inside `stitch/raw/`.

## Visual Rule

The exported Stitch file is the visual source of truth.

The AI agent should not generate a new UI based only on `DESIGN.md`.

The correct workflow is:

```txt
Stitch export
→ stitch/raw/<screen>.html
→ React conversion
→ preserve existing app logic
```

Not:

```txt
DESIGN.md
→ generate new screen
```

## Related Files

Screen mapping and progress are tracked outside this folder:

```txt
docs/screen-map.md
docs/ui-flow-history.md
agent/ui-flow-state.json
agent/last-run-report.md
```
