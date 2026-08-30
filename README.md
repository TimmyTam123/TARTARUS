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

`app.py` is a convenience, not a requirement: there is no server-side
work here at all — no build, no API, nothing but files — so any static
host will serve it.

## Publish it

Settings ▸ Pages ▸ Deploy from a branch ▸ `master` ▸ `/ (root)`, and it
comes up at `https://<user>.github.io/TARTARUS/`. There is no build step
and no workflow to add.

The one thing that needed care is that a project page is not served at
`/`: it sits under a folder named after the repository. Every link is
therefore written relative to the page — `static/style.css`, never
`/static/style.css` — including the one `music.js` builds for each track,
which is why the entry point is `index.html` rather than `main.html`.
Checked by serving the folder under a subpath and playing a track through:
the page, the backdrop and the audio all resolve, and GitHub Pages answers
range requests, so the seek bar works.

The audio is the thing to keep an eye on: 130 tracks come to about 215 MB
of the 1 GB a Pages site is allowed, and Pages asks for a soft 100 GB of
bandwidth a month, which is roughly five hundred people listening through
the lot.

## Files

```
index.html          the whole interface — home, session, focus mode, dialogs
app.py              a dev server: hands back index.html and static/
.nojekyll           tells GitHub Pages to serve the files as they are
static/style.css    design tokens + every screen
static/timer.js     session state, storage, settings, the calculator
static/graph.js     the graphing plane and the parser behind it
static/music.js     the four playlists and the player that works them
static/cursor.js    glass cursor and ribbon trail
static/audio/       the tracks themselves, one flat folder of 130 (~215 MB)
static/lofi_13.mp4  background loop (~10 MB, 4K)
static/lofi_720.mp4 a 720p re-encode of it (~2 MB, unused)
```

## Notes

- **Four scripts, one scope.** They are classic `defer` scripts, not
  modules, so every top-level name in `timer.js`, `graph.js`, `music.js`
  and `cursor.js` sits in the same global. Two `const`s of one name kill
  the second file outright; two `function`s of one name quietly replace
  each other, which is worse. A new top-level name is worth grepping the
  other three files for first.
- **The island** — one box holding the clock and its buttons, with a groove
  at the top to say it can be picked up and dragged anywhere on screen. Its
  spot is stored as a fraction of the free space rather than a pixel offset,
  so an edge stays an edge after a resize or a rotation. It is the one pane
  that wraps its glass instead of being it, so its corners have to be cut
  twice — the shadow it carries has a bright hairline along its top inside
  edge, and left square that hairline ran on past the curve.
- **Controls**: pausing slides out restart, the speaker and settings; the
  toolbox slides out Math, Graph and Notes. Both are columns of the box itself,
  clipped open and shut so it grows and shrinks smoothly rather than
  jumping a column wide.
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
  of them are honoured when an answer is printed: Sci keeps every digit it
  was asked for, and Norm reaches for an exponent only at the ends of its
  range — measured after the rounding, since 9999999999.9 does not fit in
  ten figures however nearly it does on the way in. The nine letters A–F and
  x, y, z store and recall, and outlive the session.
- **Reading a sum**: a small recursive-descent parser climbs expr → term →
  unary → fraction → power → postfix → primary, so `−2²` is −4, `2^3²` is
  2⁹, a fraction bar bites harder than `×`, and `2π`, `3sin(30` and a
  bracket left off the end all work as they do on the real thing. Answers
  come back exact where they can — `sin(30` is ½, `sin(60` is √3/2 — and
  FORMAT turns one into a decimal, a mixed fraction, prime factors,
  engineering notation or degrees and minutes. A logarithm is written
  `log(base,value)` either way round, and printed `log▫(▪)` once it has a
  base: the plain `log` above `x²` leaves you to type the comma yourself,
  while the key printed `log▪▫` lays the comma down for you and stands the
  cursor on the base, so `▶` steps across to the value. A base left empty
  is ten.
- **An exact answer is recognised, not derived.** The sum was done in
  doubles long before the screen sees it, so there is nothing symbolic
  left to work with: the printer instead looks for the small exact value
  that the decimal is only a rounding of. A fraction first, by continued
  fractions; then a multiple of π; then `a√m/b`, tried over every radicand
  under a hundred with no square factor in it, which is where nearly every
  angle in the table lands; and last the two-root form a half angle comes
  to, which is what makes `sin(15` into (√6−√2)/4 and `tan(15` into 2−√3.
  Each is written in the same language the keypad types, so an answer can
  be typed straight back in and the hand that draws an entry stacks it
  over its bar without being told how.
  The line between an answer and a coincidence is drawn at twelve digits:
  every one of these comes out of a double within a few bits of the truth,
  while a ten-digit decimal typed by hand is a thousand times further out
  than that, so `0.8660254038` stays as it was typed while `sin(60` does
  not. Four thousand random doubles snapped to nothing at all.
- **Sums are drawn as they are written**, in the entry line as well as the
  answer: a fraction stacked over its bar, a logarithm's base sitting low
  beside it. One walk draws a stretch of the line and hands each half it
  finds back to itself, so the two shapes nest as deep as they are typed —
  and the cursor can sit inside a numerator or a base, because the caret is
  placed while the line is being drawn rather than bolted on after. A
  logarithm with nothing for a base stays written out, since an empty box
  would show as nothing at all. SHIFT+DEL arms INS, which hands the value in
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
    `2x̄` and `Σx²` are values like any other. A figure with nothing behind
    it says `ERROR` rather than printing a NaN: the sample spread of a
    single reading, or the mean of a table nothing has been typed into.
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
- **The graph** — Graph opens a plane with the expressions down one side
  of it. A row is read by what stands either side of its `=`: `y = …`
  draws left to right, `x = …` top to bottom, `f(x) = …` names something
  the other rows can call, a bare letter — `a = 3` — grows a slider, a
  pair in brackets is a point, and anything else is drawn as the line
  where the two sides balance, so `x² + y² = 25` is a circle. Dragging a
  slider writes the number back into the line it came from, so what is
  typed and what is drawn are never two different things. The dot beside
  a row opens its inks: the six the list cycles through, a colour of the
  row's own from whatever picker the browser offers, and the switch that
  takes the line off the plane without giving up the typing. A line that
  will not read keeps what was typed and says so in its border.
- **LaTeX** is read as readily as plain writing, since that is what
  Desmos keeps its expressions in: `\frac{x^{2}}{4}`, `\sqrt{x+8}`,
  `\sqrt[3]{x}`, `\cdot`, `\times`, `\div`, `\left(`…`\right)`, and a
  Greek name — `\theta` becomes θ, a letter of its own that can hold a
  value or take a slider like any other. Rather than teach the parser a
  second grammar, a line is written out into the plain form before it is
  read: `\frac{1}{2}` becomes a bracketed division. The brackets that
  step in for braces are a bracket of their own, ⟨ ⟩, which the reader
  treats exactly as ( ) and the setting below leaves undrawn — so a
  fraction typed either way is stacked, not bracketed. Subscripts and
  inequalities are not read; a line using one says so rather than
  guessing.
- **A row is set as maths** whenever it is not the row being typed in:
  fractions stacked over their bar, powers raised, roots given their
  overline, function names upright while letters lean, π and θ as
  themselves. It is one walk over the very tokens the reader walks, so
  what is drawn and what is plotted cannot come apart, and nothing in it
  may throw — a half-typed line still has to show something. Click the
  setting and it becomes the writing again, caret and all; leave the row
  and it sets itself back.
- **Reading a formula**: a second small parser, cousin to the
  calculator's but written for a plane — radians throughout, `x` and `y`
  free rather than stored, and every row compiled once into a function of
  a scope, so a curve costs one call per pixel rather than a fresh parse.
  Things written side by side multiply, so `2x`, `3(x+1)`, `xy` and
  `sin 2x` all read as they are written; `-x^2` is −(x²); `|x|` is the
  size of x. A letter with no value leaves the curve blank rather than
  drawing a line through zero, and a definition that names itself gives
  up rather than the tab.
- **Drawing it**: `y = …` takes one value to the pixel column, then goes
  back over every step and cuts it in half wherever the curve strays more
  than a quarter of a pixel from the straight line drawn across it. Six
  cuts is as far as a step is taken — sixty-four extra readings where the
  curve is bending hard, none at all where it is not — so a wave zoomed
  out to a few pixels a period keeps an even crest instead of a ragged
  one. A step longer than the plane is a pole: a gap, rather than a
  stroke straight up it. Everything else is walked as a grid with the
  crossing traced through each square it runs into, in squares small
  enough that a circle comes out round rather than polygonal; the whole
  contour is one path, so the glow is laid down once. Drag the plane to
  move it, pinch or roll the wheel to zoom about the pointer, and the
  corner reads out where the pointer is. The rows and the view are kept
  between sessions.
- **The music** — the speaker on the island opens a thin tube and starts
  playing; switching it off stops the music and puts the tube away, so
  the key reads as what it is. The tube is one row: the playlist between
  its two arrows, three keys, what is playing, and how far in — and it
  fills along its lower edge as the track runs, the same line the island
  wears while a block runs down. Reaching for that edge thickens it into
  something to scrub with. There is no head to grab: the tube is picked
  up anywhere that is not a key.
- **Four playlists** — Cozy, Jazzy, Dreamy and Upbeat, 133 tracks between
  them — and each is **always shuffled**, as a bag rather than a die: the
  whole playlist is dealt into a random order and played down it, so
  nothing comes round twice before everything has been heard once, and
  the order is drawn again at the end. There are no track numbers to
  read, because in a shuffled bag a number says nothing. A file that will
  not play is stepped over rather than left sitting there. One `Audio`
  element plays the lot, so the sound carries on while the tube is
  dragged, or while the timer runs underneath it. The chime that marks
  the end of a block is a separate thing, switched in Settings.
- **The tracks are HE-AAC at 64 kbps in an MP4 shell** (`.m4a`), re-encoded
  from the downloads to bring 7.2 hours of music from 804 MB down to 215.
  HE-AAC sends only the lower half of the spectrum and rebuilds the top of
  it on the way out, which is what makes a rate that low hold together on
  soft, bass-light music heard in the background. Python's own table calls
  a `.m4a` `audio/mp4a-latm`, a different packing that a browser is within
  its rights to refuse, so `app.py` corrects the type to `audio/mp4`.
- **Notes** opens a pad of sheets rather than one, kept between sessions
  in the same preferences blob and written back a moment after you stop
  typing. The strip under the head turns the pages: arrows either side of
  the name, the page's number in the pad, then the two keys that add a
  sheet after this one and drop this one. A sheet is named by its own
  first line, so there is nothing to fill in but the sheet itself — start
  typing and the strip says what it is. Dropping the last one leaves a
  blank, since the pad is never empty, and a single sheet written before
  the pad existed opens as page one. The sheet fills whatever size the
  card is pulled to.
- **Cards stack** in the order you last touched them, so the one you are
  working in is on top — and is the one `Esc` closes first. Each card
  registers itself and the switch that shuts it, so a tool kept in its own
  file joins the stack by saying so.
- **Cards resize** from the corner mark at their bottom right, which is
  also a way to bring one forward: taking hold of it raises the card
  without dragging it, since only the head does that. The mark is placed
  against the corner rather than laid out with the rest: it used to hang
  there on negative margins, and a flex line that ends on one lets the
  growing part beside it size a few pixels past the card's own edge —
  enough to give the card a scrollbar of its own, beside the one the sheet
  or the list already had. Out of the flow it takes no part in the sizing
  at all. A card also refuses to be laid out below the size the corner
  would let you drag it to, since the size it remembers is a share of the
  viewport and a window that has since grown shorter can ask for less than
  the contents can give. Notes and the graph
  take whatever shape they are pulled into — the sheet and the plane fill
  it, and the plane redraws to the room it lands in. The calculator is the
  exception: a face laid out key for key has one shape, so it is scaled
  rather than reshaped, keys, screen and printed alternates together, and
  the ratio holds by construction rather than by arithmetic. It is never
  scrolled either — the whole face is always on the card — so it is never
  allowed to stand larger than the room it is in, across as well as down:
  one number scales the lot, so what fits is the smaller of the two ratios.
  That ceiling holds whether or not a size was ever asked for, which is
  what a phone turned on its side depends on. The face wants six hundred
  points of height and is given three hundred and ninety, and with nothing
  stored to apply, nothing used to be applied at all: it hung off both ends
  of the window at once, the display above the top and EXE below the
  bottom, and no scroll to reach either. The ceiling caps what is shown
  without touching what was asked for, so a face sized on a tall window
  comes back whole on the next one. Its corner has a strip of its own along
  the foot, where it cannot take a press meant for EXE. A placed card grows
  from its own top-left corner, so where it was put stays where it is. Like
  a card's spot, its size is kept as a share of the viewport rather than a
  pixel count.
- **Upright on a phone the island is a bar along the foot**, and it stays
  there. A thumb reaches the bottom of a six-inch screen and does not reach
  the middle of one, so the only controls in the place live where they can
  be pressed — and nothing moves when a card comes up, because there is
  nowhere left for the island to move to. It is not dragged there and it
  does not carry its groove: it is furniture rather than a thing standing
  on a desk.

  The bar puts the clock down its left at whatever height the keys come to,
  and gathers the keys themselves into a block three columns wide down its
  right — one row while a session runs, two with the toolbox out, three
  while it is also paused. Left to wrap, the drawers ran on under the clock
  instead and left the right-hand half of the bar empty; blocked, they
  stack under the row they belong with, and the clock takes exactly the
  height they came to — no padding and no label of its own, or it stood
  half a key proud of the row beside it and made the bar taller than it
  needed to be. Which leaves the figures alone in it, read at 35px rather
  than 15px: the difference between finding the time and glancing at it.
  The phase is no loss — the strip of light along the card's own foot
  already carries it, in the colour of whichever block is running.

  This is the one place the island's keys are a box of their own:
  everywhere else the wrapper is `display: contents` and its three rows are
  the island's own children, laid out as they always were.
- **And a card there is not a window.** There is no room to float one in.
  It is a sheet: it takes the screen from the top edge down to the bar. One
  at a time, since two cannot share one anchor, so the toolbox row swaps
  between them — that part is done in script, being a matter of what is
  open rather than of how it is drawn. Nothing is dragged and nothing is
  pulled about by a corner, so there is nothing to lose off the side of the
  screen: a spot kept from a larger window is put away while the phone is
  upright, and picked up again on the next screen with room to float
  something in. The drawers open downwards here rather than sideways; the
  graph puts its plane on top and the typing under it; the tube drops who
  made the track and how far in it is to keep its row.

  The keypad gets whatever the bar does not take. It is the tallest thing
  here, and on a phone it fills its sheet rather than sitting at whatever
  size it had on somebody's laptop. On an iPhone 16 that comes to a face
  28% larger than before: keys 55×41 rather than 43×32, and the printing on
  them 7.5px rather than 5.9px. Held sideways it goes the other way, down
  to about three quarters, which is small — it is also the first time the
  whole of it has been on the screen at once.
- **A fingertip is 44px** whichever way the phone is being held, so every
  key in the place keeps that much room: the page strip on the pad, the
  three over the plane, the tube's own row, the settings rows — a switch
  row was coming out 22px tall, half a fingertip. Every field keeps 16px,
  which is the size below which iOS stops reading a field and starts
  zooming the page into it, and there is no scroll here to come back with:
  the notes pad was set at 12.6px and a graph line at 10.5px, so both left
  the page magnified and off to one side on the first tap. The keypad is
  the one exception to the 44px floor, and a deliberate one — that face is
  a scale drawing of a real calculator, six columns by eight rows, and at
  44px a key it would stand half again as tall as any phone. It is grown as
  far as the screen allows and no further. A touch also behaves as a touch:
  no grey box flashes behind the glass a moment after a tap, holding a key
  down begins a drag rather than a selection or the system's own menu, and
  a drag past an edge has nowhere to go rather than peeling the whole page
  up off the glass and letting it snap back.
- **The screen is smaller than the window.** A phone keeps a band around
  the notch, a strip where the home indicator sits, and a margin either
  side of the camera when it is held on its side. CSS is told their depths
  and no script may ask for them — so a box is kept whose padding is
  exactly those four, and its padding is read instead. What is laid out and
  what is worked out then cannot disagree, and both follow the phone when
  it is turned over. Every edge clears them: a card is centred on the
  middle of what can be used rather than the middle of the window, which
  are ten points apart on a phone held sideways, and a dragged card can no
  longer be parked under the clock or the home indicator.
- **The keyboard takes nothing off the window.** `100dvh` is the same
  before and after one slides up, so a sheet laid out in the whole screen
  carries on underneath it and the line being typed sits behind the keys.
  What did change is how much of the window is still being shown, which the
  visual viewport does report — so the depth of what came up is taken off
  the foot of the sheet, and the sheet is the size of what can be seen. The
  bar goes under the keyboard rather than riding above it: while you are
  typing, the room is better spent on what you are typing into.
- **Held sideways** a phone is as wide as a laptop and as tall as nothing.
  The root type is sized off the width, so every rem in the place grew on
  the one screen with no height to spare; there it is sized off the short
  way instead. The island keeps its corner — width is the one thing there
  is plenty of — and a card stays a window rather than becoming a sheet,
  with the whole height to be scaled into.
- **A card is measured again when it is shown.** Hidden, it has no size —
  and both the ceiling on a scaled face and the spot a placed one goes back
  to are worked out from that size, so while it was away they were worked
  out from nothing. Turning a phone on its side with the calculator shut
  would otherwise bring it back taller than the screen, with the corner that
  shrinks it off the bottom, or drop a card left near an edge almost
  entirely off it.
- **Keys go to the calculator** while its card is open — digits, operators,
  Enter, Backspace and the arrows — so a sum cannot be cut in half by the
  timer's own `Space` and `F`. `/` types the fraction bar, which is what
  writing `1/2` means. Typing in a text field always wins over both. `Esc`
  backs out of a menu first, then closes the card and hands the keys back.
- **Restart** sends the session back to the start of its first block. Today's
  total is a record of the day rather than of the session, so it survives.
- **Ending a session** clears the desk with it: the drawer shuts, and the
  calculator, the notes and the graph all go away rather than being left
  hanging over the home screen. What they were holding is untouched —
  where each card sat, what was typed into it — so the next session opens
  them exactly where the last one left them.
- **Keyboard**: `Space` pauses or resumes, `F` toggles focus mode, `Esc` closes
  whatever is open, innermost first.
- **Storage**: preferences — where each card was left, the calculator's
  Calc Settings and letters, the size each was pulled to, the notes pad,
  the graph's rows and view,
  the playlist and track last played — and today's total live in
  `localStorage` under
  `tartarus:prefs` and `tartarus:day`. The daily total resets on the next
  calendar day and counts focus time only — pomodoro breaks do not add to it.
- **Arriving**: glass cannot be faded. An element whose own opacity is under
  1 is drawn as a group and then composited over the very room it filtered,
  so the frost is mixed back into the sharp picture behind it — half way
  through a fade a pane is not half frosted, it is a sheet of clear film you
  can read the window frames through, and the glass only turns up in the last
  few hundredths, all at once. So nothing that frosts fades: `--in` runs
  0 → 1 in opacity's place and the pane is built out of it, wash, rim and
  blur thickening together while the pane itself stays fully opaque. Only the
  contents ride it as plain opacity — they have no backdrop of their own to
  lose. It is written `var(--in, 1)` throughout, so a browser too old to
  register the property gets everything, fully arrived. A pane that has only
  just stopped being `hidden` has no style behind it to leave from, so its
  size is read back once first: that settles the frame it is standing in,
  and the change that follows has somewhere to come from.
- **Hovering** brightens a control and grows its icon, never the button
  itself: a drawer is clipped to exactly one column wide, so a box that
  grew would have its own edge sliced off — nothing inside it can. What
  shrinks on a press is safe either way.
- **Sizing**: the root font size is fluid, so every `rem` in the stylesheet
  scales with the viewport; thicknesses and blurs use `vmin`, layout uses
  `%`/`vw`/`dvh`. There is no fixed-pixel layout to break on an odd screen.
- **The cursor trail** only replaces the pointer on devices that have one
  (`hover: hover` and `pointer: fine`), and can be switched off in Settings.
- **Low detail background** holds the loop on a single frame rather than
  taking the room away: nothing is decoded from then on, and the blur
  behind every pane has something fixed to work from, so the whole page
  costs a fraction of what it did. A cold video is started and stopped
  again once it is running, since a still needs a frame to be still on.
  Everything that nudges the loop back to life — a hidden tab returning,
  a browser pausing it on its own terms — asks the setting first.

## Credits

The backdrop loop and every track under `static/audio/` come from
[Pixabay](https://pixabay.com) under the Pixabay Content License, free to
use without attribution — the players are named on the card anyway. The
four playlists are:

- **Cozy** — [LoFi Study](https://pixabay.com/playlists/lofi-study-17501840/)
- **Jazzy** — [Beats](https://pixabay.com/playlists/beats-27348305/)
- **Dreamy** — [LoFi Chillout](https://pixabay.com/playlists/lofi-chillout-17503543/)
- **Upbeat** — [LoFi Hiphop](https://pixabay.com/playlists/lofi-hiphop-17501841/)

Every track on all four is here. A track on two playlists is one file,
named as Pixabay names it, so nothing is stored twice; `static/music.js`
lists them by name, player and file, so adding another is a line there
and a file beside it.
