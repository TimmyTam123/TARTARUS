# Tartarus

A quiet study timer that sits over a looping lofi backdrop. Three modes,
one screen, no accounts.

- **Stopwatch** — counts up from zero, adding to the day's total.
- **Pomodoro** — alternates focus blocks and breaks, with a chime at each change.
- **Countdown** — runs down to zero from a time you set.

## Run it

```bash
pip install -r requirements.txt
python app.py
```

Then open <http://localhost:5000>.

## Files

```
app.py              serves main.html and /static
main.html           the whole interface — home, session, focus mode, dialogs
static/style.css    design tokens + every screen
static/timer.js     session state, storage, settings
static/cursor.js    glass cursor and ribbon trail
static/lofi_13.mp4  background loop (~10 MB, 4K)
static/lofi_720.mp4 a 720p re-encode of it (~2 MB, unused)
```

## Notes

- **The island** — one box holding the clock and its buttons, with a groove
  at the top to say it can be picked up and dragged anywhere on screen. Its
  spot is stored as a fraction of the free space rather than a pixel offset,
  so an edge stays an edge after a resize or a rotation.
- **Controls**: pausing slides out restart, mute and settings; the toolbox
  slides out Math, Notes and Other — Other is not wired up yet. Both are
  columns of the box itself, clipped open and shut so it grows and shrinks
  smoothly rather than jumping a column wide.
- **Room to grow**: the island's spot is re-resolved on every frame of that
  0.4s, so one parked at the right edge glides back inside the screen as it
  widens instead of running off the side.
- **The calculator** — Math opens a card laid out key for key from the face
  of a Casio fx-82CW: a control block six columns wide holding the cursor
  cross and the page rocker, six columns of function keys, then five wider
  number keys. Each key's alternate function is printed above it on the
  left, with the same small elbow pointing back down at the key it belongs
  to. Pick the card up by its head; the keypad below it stays scrollable on
  a short screen.
- **Its menus** are one thing wearing several names: HOME, SETTINGS,
  CATALOG, FUNCTION, TOOLS, VARIABLE and FORMAT all put a list on the
  screen, walked with the cursor cross and entered with OK. A list that
  opens another pushes onto a stack; BACK, `◀` and `Esc` pop it, and AC
  leaves the lot. While a list has the screen, keys that only type are
  ignored, as they are on the real one.
  Calc Settings carries Input/Output, Angle Unit, Number Format
  (Fix, Sci, Norm 1, Norm 2), Fraction Result and Digit Separator, and all
  of them are honoured when an answer is printed. The nine letters A–F and
  x, y, z store and recall, and outlive the session.
- **Reading a sum**: a small recursive-descent parser climbs expr → term →
  unary → fraction → power → postfix → primary, so `−2²` is −4, `2^3²` is
  2⁹, a fraction bar bites harder than `×`, and `2π`, `3sin(30` and a
  bracket left off the end all work as they do on the real thing. Answers
  come back exact where they can — `sin(30` is ½, not 0.5 — and FORMAT
  turns one into a decimal, a mixed fraction, prime factors, engineering
  notation or degrees and minutes.
- **Fractions are drawn as they are written**, stacked over their bar, in
  the entry line as well as the answer — and the cursor can sit inside a
  numerator, because the caret is placed while the line is being drawn
  rather than bolted on after. SHIFT+DEL arms INS, which hands the value in
  front of the cursor to the next function pressed, so `176` becomes
  `√(176)` with one key.
- **All four apps** are on HOME. Statistics, Table and Math Box each put a
  table on the screen, so they share one: a grid names its columns, says
  how to fill them, and marks the cell the cursor is on. Whether it can be
  typed into is the only difference between the editor you enter data in
  and the results you read off it.
  - **Statistics** takes single or paired data, with an optional frequency
    column, and gives back n, the means, both variances and deviations,
    the quartiles and the sums — Casio's quartiles, which split the data at
    the median and leave it out of both halves. Paired data adds the
    least-squares line `y = a + bx` and its correlation. *Statistics Calc*
    drops you on the worksheet with all of those reachable by name, so
    `2x̄` and `Σx²` are values like any other.
  - **Table** works `f(x)` and `g(x)` down a range a step at a time. Each
    row sets `x` and reads the definitions back through the same parser, so
    a column can do anything the worksheet can; a row that will not
    evaluate says `ERROR` and the rest carry on.
  - **Math Box** rolls one to three dice, or tosses one to three coins, up
    to 250 times — as a list of every throw, or counted into frequencies
    and relative frequencies. Two dice can be counted by their sum or by
    their difference.
- **Backing out**: `BACK` and `◀` leave a menu, abandon a question, and
  step out of a results table to the screen it was opened from; at the root
  of an app it goes to HOME. `AC` clears the line being typed without
  giving up on the question asking for it.
- **Notes** opens a plain sheet, kept between sessions in the same
  preferences blob and written back a moment after you stop typing. Drag
  the sheet's corner to make it taller; the card re-places itself as it
  grows.
- **Cards stack** in the order you last touched them, so the one you are
  working in is on top — and is the one `Esc` closes first.
- **Keys go to the calculator** while its card is open — digits, operators,
  Enter, Backspace and the arrows — so a sum cannot be cut in half by the
  timer's own `Space` and `F`. `/` types the fraction bar, which is what
  writing `1/2` means. Typing in a text field always wins over both. `Esc`
  backs out of a menu first, then closes the card and hands the keys back.
- **Restart** sends the session back to the start of its first block. Today's
  total is a record of the day rather than of the session, so it survives.
- **Keyboard**: `Space` pauses or resumes, `F` toggles focus mode, `Esc` closes
  whatever is open, innermost first.
- **Storage**: preferences — where each card was left, the calculator's
  Calc Settings and letters, the notes sheet — and today's total live in
  `localStorage` under
  `tartarus:prefs` and `tartarus:day`. The daily total resets on the next
  calendar day and counts focus time only — pomodoro breaks do not add to it.
- **Sizing**: the root font size is fluid, so every `rem` in the stylesheet
  scales with the viewport; thicknesses and blurs use `vmin`, layout uses
  `%`/`vw`/`dvh`. There is no fixed-pixel layout to break on an odd screen.
- **The cursor trail** only replaces the pointer on devices that have one
  (`hover: hover` and `pointer: fine`), and can be switched off in Settings.
