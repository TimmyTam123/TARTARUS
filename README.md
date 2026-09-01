# Tartarus

A quiet study timer that sits over a looping lofi backdrop. Three modes,
one screen, no accounts.

- **Stopwatch** — counts up from zero, adding to the day's total.
- **Pomodoro** — alternates focus blocks and breaks, chiming at each change.
- **Countdown** — runs down to zero from a time you set.

Beside the clock is a toolbox: an fx-82CW calculator, a graphing plane and
a notes pad, with a player working four playlists of lofi. Everything is
glass over the backdrop, and everything stays in the browser.

## Run it

```bash
pip install -r requirements.txt
python app.py
```

Then open <http://localhost:5000>. `app.py` is a convenience rather than a
requirement: there is no server-side work here — no build, no API, nothing
but files — so any static host will serve it.

## Publish it

Settings ▸ Pages ▸ Deploy from a branch ▸ `master` ▸ `/ (root)`, and it
comes up at `https://<user>.github.io/TARTARUS/`. No build step, no
workflow to add.

A project page is not served at `/` — it sits under a folder named after
the repository — so every link is written relative to the page
(`static/style.css`, never `/static/style.css`), which is why the entry
point is `index.html`. The audio is the thing to watch: 130 tracks come to
about 215 MB of the 1 GB a Pages site is allowed.

## Put it on a phone

Open the page in Safari, tap the Share button in the toolbar, then **Add
to Home Screen**. It opens as its own thing from there: no address bar and
no toolbar, the backdrop carried right up under the clock, and the day's
total and everything else already kept in that browser.

Four tags in the head do that — the icon, `apple-mobile-web-app-capable`,
a translucent status bar and the name under the icon. The translucent bar
is the reason the page has to know the shape of the screen, since it puts
the backdrop behind the clock and the camera rather than below them.

## Files

```
index.html          the whole interface — home, session, focus mode, dialogs
app.py              a dev server: hands back index.html and static/
.nojekyll           tells GitHub Pages to serve the files as they are
static/apple-touch-icon.png  the icon on a home screen (180 square)
static/style.css    design tokens + every screen
static/timer.js     session state, storage, settings, the calculator
static/graph.js     the graphing plane and the parser behind it
static/music.js     the four playlists and the player that works them
static/cursor.js    glass cursor and ribbon trail
static/audio/       the tracks, one flat folder of 130 (~215 MB)
static/lofi_13.mp4  background loop (~10 MB, 4K)
```

## Notes

- **Four scripts, one scope.** They are classic `defer` scripts, not
  modules, so every top-level name in `timer.js`, `graph.js`, `music.js`
  and `cursor.js` shares one global. Two `const`s of one name kill the
  second file outright; two `function`s quietly replace each other, which
  is worse. Grep the other three before adding a top-level name.
- **The island** holds the clock and every control and is dragged
  anywhere on screen. Its spot is kept as a fraction of the free space
  rather than a pixel offset, so an edge stays an edge after a resize or
  a rotation. The cards work the same way, and remember their size too.
- **The calculator** is an fx-82CW: the same keys, the same menus, the
  same MathI/MathO entry. Answers come back exact where there is an exact
  form — `√3/2`, `π/4`, `(√6+√2)/4` — which is recognition rather than
  algebra. The sum was done in doubles long before; the smallest exact
  value landing within a part in 10¹² of the result is the answer, and no
  value fits two of them.
- **Upright on a phone** the island is a bar along the foot and a card
  fills the screen above it, one at a time. Everything a finger lands on
  keeps 44px and every field keeps 16px — under that, iOS zooms the page
  in on focus and nothing here scrolls, so there is no way back. The
  keypad is the one exception, deliberately: it is a scale drawing of a
  real calculator, so it is scaled to the room instead.
- **Nothing that frosts fades.** An element under full opacity is drawn as
  a group and then composited over the very room it filtered, so half way
  through a fade a pane is a sheet of clear film rather than half-frosted
  glass. `--in` runs 0 → 1 in opacity's place and the wash, the rim and
  the blur thicken together.
- **Keyboard**: `Space` pauses or resumes, `F` toggles focus mode, `Esc`
  closes whatever is open, innermost first. While the calculator is out it
  takes the keys — digits, operators, Enter, Backspace, arrows — so a sum
  cannot be cut in half by the timer's own shortcuts.
- **Storage**: preferences and the day's total live in `localStorage`
  under one key. Ending a session clears the desk but not what the cards
  were holding, so the next one opens them where the last left them.

## Credits

The backdrop and every track under `static/audio/` come from
[Pixabay](https://pixabay.com) under the Pixabay Content License, free to
use without attribution — the players are named on the card anyway. The
playlists are [LoFi Study](https://pixabay.com/playlists/lofi-study-17501840/),
[Beats](https://pixabay.com/playlists/beats-27348305/),
[LoFi Chillout](https://pixabay.com/playlists/lofi-chillout-17503543/) and
[LoFi Hiphop](https://pixabay.com/playlists/lofi-hiphop-17501841/).

A track on two playlists is one file, named as Pixabay names it, so
nothing is stored twice; `static/music.js` lists them by name, player and
file, so adding another is a line there and a file beside it.
