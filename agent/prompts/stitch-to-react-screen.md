# Stitch to React Screen Conversion Prompt

You are working inside my existing React frontend project.

This project already has working routes, pages, components, API calls, auth guards, role checks, form submit handlers, validation, loading states, and error states.

Your job is not to rebuild the app.

Your job is to convert one exported Stitch screen into the existing React codebase while preserving all existing business logic.

## Current Flow

The UI redesign flow uses exported Stitch files.

Source folders:

```txt
stitch/raw/
stitch/screenshots/
```

Tracking folders:

```txt
docs/screen-map.md
docs/ui-flow-history.md
docs/design-decisions.md
agent/ui-flow-state.json
agent/last-run-report.md
```

Global design file:

```txt
DESIGN.md
```

## Critical Rules

* Do not push to GitHub.
* Do not rebuild the app from scratch.
* Do not generate a new UI from imagination.
* Do not redesign the Stitch screen.
* Do not make the screen “better”.
* Do not simplify the Stitch layout.
* Do not reinterpret `DESIGN.md` as the full screen layout.
* Use the exported Stitch file as the visual source of truth.
* Treat files inside `stitch/raw/` as read-only.
* Convert only one screen per run.
* Preserve existing React logic.

## Logic That Must Be Preserved

When editing a screen, preserve:

* Existing route path
* Existing navigation behavior
* Existing API calls
* Existing auth guards
* Existing role checks
* Existing state management
* Existing form submit handlers
* Existing validation
* Existing loading states
* Existing error states
* Existing token/session behavior
* Existing redirects/navigation after actions

Only change UI, layout, styling, and safe component structure.

## Before Editing Code

First inspect the project:

* `package.json`
* React entry point
* Router setup
* Layout files
* Page files
* Component files
* API client files
* Auth guard files
* CSS/Tailwind/theme files

Then read:

* `DESIGN.md`
* `stitch/README.md`
* `docs/screen-map.md`
* `docs/ui-flow-history.md`
* `docs/design-decisions.md`
* `agent/ui-flow-state.json` if it exists
* `agent/last-run-report.md` if it exists

## Screen Selection Rule

Pick exactly one screen to work on.

Use this source priority when selecting the next screen:

1. `agent/ui-flow-state.json`
2. `docs/ui-flow-history.md`
3. `docs/screen-map.md`

Important:

* `docs/screen-map.md` is the route/component reference, not the source of truth for per-screen status.
* If `agent/ui-flow-state.json` exists, use it as the source of truth for `status`, prior conversions, and next recommended screen.
* If status is missing from tracking files, treat the screen as `missing`.

Choose the first screen from tracking data that satisfies all conditions:

1. Status is `pending`, `needs-review`, or missing.
2. It has a matching file in `stitch/raw/`.
3. It has a mapped React route and React component/page.
4. It is not already marked as `done`.

If a screen does not have a matching Stitch raw file, mark it as:

```txt
needs-stitch-export
```

Do not treat missing Stitch files as an error.

### Stitch File Matching Rule

Do not assume the ideal export filename exists.

Match Stitch files using this priority:

1. Exact file path already recorded in `agent/ui-flow-state.json`
2. Exact file path recorded in `docs/ui-flow-history.md`
3. Exact filename manually listed for the target screen in any tracking file
4. Best matching filename in `stitch/raw/` and `stitch/screenshots/`

If tracking says a screen exists but the real export file uses a different name, use the real existing file and normalize the tracking metadata to that actual filename.

Do not rename or edit files in `stitch/raw/` just to satisfy naming conventions.

## Conversion Steps

For the selected screen:

1. Read the matching Stitch source file from `stitch/raw/`.
2. Read the matching screenshot from `stitch/screenshots/` if available.
3. Read the current React page/component mapped in `docs/screen-map.md`.
4. Verify the route-to-component mapping against the real router and exports in code.
5. If the screen is shared across multiple routes or roles, inspect the actual shared component and preserve that behavior.
6. Identify existing logic that must be preserved.
7. Convert the Stitch screen into React as closely as possible.
8. Match:
 
    * layout
    * spacing
    * colors
    * typography
    * button styles
    * card styles
    * input styles
    * section structure
    * responsive behavior
9. Use existing shared components only when safe.
10. Create new reusable components only when useful and low-risk.
11. Do not edit files inside `stitch/raw/`.

## Styling Rules

Follow the existing project styling approach.

If the project uses Tailwind, convert the Stitch styles carefully into Tailwind classes.

If exact conversion is risky, too verbose, or likely to break visual accuracy, create a scoped CSS file or CSS module for the converted screen.

Do not introduce global CSS that can break other pages.

## Shared Route Rule

Some routes may share the same component.

Before editing, check whether the selected component is reused by multiple routes.

Do not rely on `docs/screen-map.md` alone for this check. Confirm reuse in the real router, page exports, and component files.

If a component is shared by multiple routes, preserve that behavior unless the screen-map explicitly says to split the screens.

If splitting is necessary, do it carefully and update the router, screen-map, and history.

## Documentation Updates

After conversion, update:

```txt
docs/ui-flow-history.md
docs/design-decisions.md
agent/ui-flow-state.json
agent/last-run-report.md
```

### Update `docs/ui-flow-history.md`

Append a new entry with:

* Date
* Screen name
* Route
* Stitch raw file
* Stitch screenshot
* React files changed
* Logic preserved
* Checks run
* Result
* Notes
* TODOs

### Update `docs/design-decisions.md`

Add stable reusable design rules discovered from `DESIGN.md` or the Stitch export, such as:

* colors
* typography
* spacing
* layout patterns
* button styles
* form styles
* card styles
* responsive rules

Do not add one-off details unless they are useful for future screens.

### Update `agent/ui-flow-state.json`

Record:

* selected screen
* route
* Stitch raw file
* screenshot file
* React files changed
* status
* preserved logic
* notes
* next recommended screen

Use these statuses:

```txt
pending
in_progress
done
needs-review
needs-stitch-export
blocked
skip
```

### Update `agent/last-run-report.md`

Overwrite this file with the latest run summary.

Include:

* status
* target screen
* target route
* files changed
* logic preserved
* checks run
* check results
* issues found
* TODOs
* next recommended screen

## Checks

Run available checks:

```txt
npm run lint
npm run build
npm test
```

If a command does not exist, record it in `agent/last-run-report.md`.

Do not treat a missing script as a failure.

If a check fails, record the failure and fix it if it is related to your changes.

Before finishing, scan the converted screen and report if any user-facing English text remains on that screen.
## Final Response

At the end, report:

* Screen converted
* Route updated
* Files changed
* Logic preserved
* Checks run and results
* Screens marked as `needs-stitch-export`
* Next recommended screen to export from Stitch
* Confirm all user-facing text on the converted screen is Vietnamese.

## Final Critical Reminder

Do not redesign.

Do not generate a new screen.

Do not improve the design creatively.

Convert the exported Stitch screen into the existing React page as closely as possible while preserving the current app logic.

