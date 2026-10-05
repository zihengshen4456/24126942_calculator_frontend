# Front-End Code Standard (HTML / CSS / JavaScript)

## Source of the Standard

The rules in this document are derived from the following publicly available and widely
recognised official or community standards:

1. [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
2. [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
3. [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)
4. [MDN Web Docs – JavaScript reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
5. [Front-End Checklist – naming conventions](https://github.com/thedaviddias/Front-End-Checklist)

On top of those general standards, a small number of project-specific conventions are
added below.

## 1. General Conventions

| Item | Convention |
| --- | --- |
| Indentation | 2 spaces; tabs are not permitted |
| Line length | At most 100 characters per line |
| File encoding | UTF-8; every page declares `<meta charset="UTF-8">` |
| Case | HTML tags, attributes and CSS selectors are lowercase |
| End of file | Exactly one trailing newline |

## 2. HTML

- Use the HTML5 doctype `<!DOCTYPE html>`;
- declare the page language (`lang="en"` in this project);
- close every tag and quote every attribute value with double quotes;
- prefer semantic elements (`header`, `main`, `section`, `ul`, `button`) over `div`;
- interactive elements are `<button type="button">`; form controls have an associated
  `<label>` or an `aria-label`;
- images always carry an `alt` attribute, and decorative icons use an empty `alt=""`;
- for accessibility, dynamically announced regions use `role="status"` and
  `aria-live="polite"`, and expandable controls use `aria-expanded`.

## 3. CSS

### 3.1 Naming: BEM

Class names follow the [BEM](https://getbem.com/) convention (block__element--modifier):

```
.block               an independent functional unit, such as .calculator
.block__element      a part of a block, such as .calculator__keypad
.block--modifier     a state or variant, such as .button--danger
```

Conventions:

- class names use lowercase letters, digits and hyphens only;
- tag selectors and `#id` selectors are not used for styling (`#id` is reserved for
  JavaScript lookups);
- nesting is limited to two levels so that rules stay easy to override;
- state classes use the `is-` prefix, for example `is-active` and `is-busy`.

### 3.2 Other Rules

- Colours, radii and shadows are declared once as CSS custom properties on `:root`;
  switching a theme only reassigns those variables;
- declaration order inside a rule is positioning, box model, typography, visual, animation;
- zero values omit the unit, and decimals below one omit the leading zero;
- `!important` is avoided; when a browser default such as `[hidden]` is overridden by a
  class selector, the rule is restated explicitly (the project does this with
  `.calculator__scientific[hidden]`).

## 4. JavaScript

### 4.1 Basic Formatting

- Statements end with a semicolon and strings use single quotes;
- `const` and `let` are preferred; `var` is only used inside the IIFEs of this project for
  compatibility, and new code should use `const` / `let`;
- strict mode is enabled with `'use strict';` at the top of every file or IIFE;
- global variables are not created: modules are wrapped in an IIFE and expose a single
  namespace object.

### 4.2 Naming

| Element | Convention | Example |
| --- | --- | --- |
| Variables and functions | camelCase | `refreshHistory`, `pageSize` |
| Constants | UPPER_CASE_WITH_UNDERSCORES | `DEFAULT_API_BASE` |
| Classes | PascalCase | `CalculatorApi` |
| Booleans | `is` / `has` / `can` prefix | `isBusy`, `hasNext` |

### 4.3 Functions and Asynchrony

- A function stays below roughly 50 lines and has a single responsibility;
- asynchronous work uses `async` / `await` rather than nested callbacks;
- every network call handles its failure branch; silent failure is not acceptable;
- error objects carry machine-readable information such as `error.code` so that the
  interface can react differently to different failures.

### 4.4 Network Requests

- All endpoint calls are wrapped in `js/api.js`; interface code never calls `fetch`
  directly;
- the API address comes from `js/config.js` and is never hard-coded in business code;
- requests set `Content-Type: application/json`;
- a `success: false` payload or a non-2xx status is turned into an exception that the
  interface layer reports to the user.

### 4.5 DOM Access and Safety

- DOM references are cached with `document.getElementById` / `querySelector` instead of
  being queried repeatedly;
- list rendering uses event delegation rather than one listener per item;
- **every value inserted with `innerHTML` is escaped first** (this project uses
  `escapeHtml()`), which prevents cross-site scripting;
- user input is never concatenated into `innerHTML` directly.

## 5. Comments

- The top of every JavaScript file states the responsibility of that file;
- public functions are documented in JSDoc style, describing parameters and return
  values;
- comments explain why something is done, not what the code literally says;
- identifiers remain in English even when the surrounding documentation is not.

## 6. File and Directory Organisation

- Structure, styling and behaviour are separated: the HTML contains no inline style or
  inline event handler, the CSS contains no logic and the JavaScript contains no styling;
- the three JavaScript files are split as `config.js` (configuration), `api.js` (network)
  and `app.js` (interface);
- file names are lowercase.

## 7. Accessibility and Compatibility

- Every interactive control can be operated from the keyboard; this project supports the
  digits, the operators, `Enter`, `Backspace` and `Esc`;
- colour contrast meets WCAG AA in both the light and the dark theme;
- the page is usable from 360px (mobile) to 1440px (desktop); the responsive breakpoint is
  at 900px.

## 8. Committing

- Commit messages are short imperative sentences;
- the browser console must be free of JavaScript errors and failed resource requests
  before committing;
- editor configuration, temporary files and local debugging code are not committed.
