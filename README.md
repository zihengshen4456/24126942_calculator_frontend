# Calculator Frontend

Client application of an online calculator built with a front-end / back-end separated
architecture. It is written in plain HTML, CSS and JavaScript and requires no build step:
opening the page in a browser is enough.

> The matching back-end repository is linked in the assignment blog post.

## 1. Overview

The page is responsible for exactly three things:

1. **Input** — provide the keypad and the expression field;
2. **Request** — send the expression the user typed to the back-end API unchanged;
3. **Present** — display the result, the history and the error messages that come back.

The page contains **no arithmetic logic whatsoever**. If the back-end service is stopped
the interface remains usable, but it cannot produce a new result. That is precisely the
verification method described in the assignment.

## 2. Technology Stack

| Item | Choice |
| --- | --- |
| Markup | Plain HTML5 (`src/calculator.html`) |
| Styling | Plain CSS3 with CSS custom properties for theming, BEM class names |
| Behaviour | Plain JavaScript (ES2017, `async` / `await`), no framework and no build tool |
| Communication | `fetch` against the back-end REST API (JSON over HTTP) |

The plain stack was chosen because it has no dependencies at all. The reviewer does not
need to install Node.js or any package manager; the page can simply be opened in a
browser, which satisfies the requirement that the technology should not depend
unnecessarily on a particular local environment.

## 3. Requirements

- Any modern browser (Chrome, Edge, Firefox or Safari)
- Network access to the back-end service (default `http://127.0.0.1:5000/api`)
- If opening the file directly with `file://` triggers browser restrictions on
  cross-origin requests, use the static server described below

## 4. Installation and Startup

There are no third-party dependencies and therefore nothing to install.

### Option A: local static server (recommended)

```bash
cd 24126942_calculator_frontend/src

# Python 3
python -m http.server 8080

# or with Node.js
npx http-server -p 8080
```

Then open:

```
http://127.0.0.1:8080/calculator.html
```

### Option B: open the file directly

Double-clicking `src/calculator.html` also works. If the browser blocks the cross-origin
requests made from a `file://` page, use option A instead.

> The back-end service must be running, otherwise the page reports that the back end is
> unavailable.

## 5. Configuration

The API address is configured in [`src/js/config.js`](src/js/config.js):

```js
var DEFAULT_API_BASE = 'http://127.0.0.1:5000/api';
```

If the API is hosted elsewhere there is **no need to edit the code**: append the `?api=`
parameter to the page URL.

```
http://127.0.0.1:8080/calculator.html?api=http://192.168.1.10:5000/api
```

The address currently in use is displayed at the bottom right of the page, which makes
troubleshooting much easier.

## 6. How the Two Parts Are Connected

```
Browser (calculator.html)
      |
      |  fetch + JSON
      v
Back-end API (http://127.0.0.1:5000/api)
      |
      v
SQLite database
```

| Action in the interface | Endpoint that is called |
| --- | --- |
| Pressing `=` or `Enter` | `POST /api/calculate` |
| Loading the page or pressing "Refresh" | `GET /api/history` |
| Typing into the search field | `GET /api/history?keyword=...` |
| Pressing "Delete" on a record | `DELETE /api/history/{id}` |
| Pressing "Clear all" | `DELETE /api/history` |
| The indicator in the header | `GET /api/health` |
| The statistics in the history header | `GET /api/statistics` |

CORS is enabled on the server, so the front end and the back end may be hosted on
different domains or ports.

## 7. Features

### Mandatory features

- Addition, subtraction, multiplication and division, evaluated by the back end
- Compound expressions and parentheses
- Operator precedence, handled by the parser rather than by the client
- Unary plus and minus, for example `-5+8` and `3*-2`
- Decimal numbers
- Error message for invalid expressions
- Error message for division by zero
- History display and deletion of an individual record

### Extended features

- Scientific keypad (`sqrt`, `sin`, `cos`, `tan`, `ln`, `log`, `abs`, `exp`, `n!`, `mod`, `min`, `max`, `pow`, `hypot`, `round`) with an expandable panel
- Exponentiation `x^y`, modulo `%`, and the constants `π` and `e`
- Keyword search over the history
- Pagination of the history (10, 20 or 50 records per page)
- Clearing the entire history in one action
- Clicking a stored expression loads it back into the input field
- Statistics: total records, records created today and the most frequently used operator
- Light and dark themes, remembered between visits and following the system preference on first use
- Keyboard shortcuts
- One-click copying of the result

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0`–`9`, `.`, `+`, `-`, `*`, `/`, `(`, `)`, `%`, `^`, `,` | Insert the character |
| `Enter` | Calculate |
| `Backspace` | Delete one character |
| `Esc` | Clear the input |

## 8. Project Structure

```
24126942_calculator_frontend/
├── src/
│   ├── calculator.html        # Page markup
│   ├── css/
│   │   └── style.css          # Styling and theme variables (BEM naming)
│   └── js/
│       ├── config.js          # API address configuration
│       ├── api.js             # Thin wrapper around the back-end API
│       └── app.js             # Interface behaviour
├── README.md
└── codestyle.md
```

The three JavaScript files have clearly separated responsibilities: `config.js` holds the
configuration, `api.js` performs the network calls and `app.js` drives the interface.

## 9. Suggested Test Procedure

The following sequence is convenient when reviewing the submission:

1. Start the back end, open the page and confirm that the header shows "Back end connected".
2. Verify the four basic operations with `12+8`, `9-15`, `6*7` and `10/4`.
3. Verify precedence and parentheses with `1+2*3` and `(1+2)*3`.
4. Verify the unary minus with `3*-2`.
5. Verify the error messages with `5/0` and `1+*2`; both messages come from the back end.
6. Reload the page and confirm that the history is still there, because it is stored in
   the back-end database rather than in the browser.
7. Press "Delete" on a record and confirm that it really disappears from the database.
8. **Stop the back-end service and press `=` again**: the client can only report an error,
   which demonstrates that it cannot compute anything on its own.
