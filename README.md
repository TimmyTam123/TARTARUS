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
  so an edge stays an edge after a resize or a rotation.
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
  allowed to stand taller than the screen: the corner that would shrink it
  again has to stay reachable. That ceiling caps what is shown without
  touching what was asked for, so a face sized on a tall window comes back
  whole on the next one. Its corner has a strip of its own along the foot,
  where it cannot take a press meant for EXE. A placed card
  grows from its own top-left corner, so where it was put stays where it
  is. Like a card's spot, its size is kept as a share of the viewport
  rather than a pixel count — and a phone leaves the heights to the
  content, will not take a card below the width it would have had, and
  will not let a scaled-up face run off the side.
- **On a phone** the session takes the middle of the screen and the drawers
  open downwards rather than sideways; the graph puts its plane on top and
  the typing under it, where the keyboard will not cover it; the tube drops
  who made the track and how far in it is to keep its row. Everything is
  driven by touch — the cards are dragged by their heads, sized from their
  corners, and the plane takes one finger to pan and two to pinch. The root
  type is smaller here, and the controls measured from it shrank with it, so
  the settings rows keep the same minimum a key on the island does: a switch
  row was coming out 22px tall, half a fingertip.
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
