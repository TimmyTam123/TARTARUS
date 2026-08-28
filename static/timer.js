/* Tartarus — session logic
   One clock, three readings: a daily stopwatch, a pomodoro cycle and a
   countdown. Everything derives from `state.elapsed`, so pausing,
   resuming and phase changes stay in sync without drift. */

const $ = (id) => document.getElementById(id);

const el = {
    home: $('home'), modes: $('modes'), thumb: document.querySelector('.modes__thumb'),
    hint: $('mode-hint'), actions: $('home-actions'), adjust: $('adjust'), start: $('start'),
    hud: $('hud'), card: document.querySelector('.hud__card'), phase: $('phase'),
    time: $('time'), progress: $('progress'),
    toggle: $('toggle'), toggleIcon: $('toggle-icon'), focus: $('focus'),
    tools: $('tools'), toolpanel: $('toolpanel'),
    toolMath: $('tool-math'), toolNotes: $('tool-notes'),
    notes: $('notes'), notesSheet: $('notes-sheet'),
    pageTitle: $('page-title'), pageCount: $('page-count'),
    calc: $('calc'), calcPad: $('calc-pad'), calcEntry: $('calc-entry'), calcOut: $('calc-out'),
    calcWork: $('calc-work'), calcMenu: $('calc-menu'), calcTitle: $('calc-title'),
    calcList: $('calc-list'), calcUnit: $('calc-unit'), calcFmt: $('calc-fmt'), calcWrap: $('calc-wrap'),
    calcApp: $('calc-app'), calcAsk: $('calc-ask'), calcGrid: $('calc-grid'),
    calcHead: $('calc-head'), calcBody: $('calc-body'), calcCell: $('calc-cell'),
    more: $('more'), restart: $('restart'), restartIcon: $('restart-icon'),
    zen: $('zen'), zenPhase: $('zen-phase'), zenTime: $('zen-time'),
    setup: $('setup'), setupTitle: $('setup-title'), setupPomodoro: $('setup-pomodoro'),
    setupCountdown: $('setup-countdown'), setupSave: $('setup-save'),
    focusMinutes: $('focus-minutes'), focusOut: $('focus-out'),
    breakMinutes: $('break-minutes'), breakOut: $('break-out'),
    targetH: $('target-h'), targetM: $('target-m'), targetS: $('target-s'),
    settings: $('settings'), dim: $('dim'), dimOut: $('dim-out'),
    sound: $('opt-sound'), trail: $('opt-trail'), still: $('opt-still'),
    todayTotal: $('today-total'),
    title: $('title'), backdrop: $('backdrop'),
};

const MIN = 60000;

const COPY = {
    stopwatch: 'Counts up from zero, and adds to your total for today.',
    pomodoro: 'Alternates focus blocks and breaks until you stop.',
    countdown: 'Runs down to zero from a time you set.',
};

const prefs = {
    mode: null, focusMin: 25, breakMin: 5, targetMs: 45 * MIN,
    dim: 30, sound: true, trail: true, still: false, hud: null, calc: null, notes: null, graph: null,
    music: null, pages: null, page: 0, plot: null, tune: null, sized: null,
    ...read('tartarus:prefs', {}),
};

const day = (() => {
    const stored = read('tartarus:day', {});
    return stored.date === today() ? stored : { date: today(), ms: 0 };
})();

const state = { mode: null, running: false, elapsed: 0, since: 0, phase: 'focus', done: false };
let accountedAt = 0;
let lastRender = '';

/* ── Storage helpers ──────────────────────────────────────── */

function today() { return new Date().toDateString(); }

function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
}

function save() {
    localStorage.setItem('tartarus:prefs', JSON.stringify(prefs));
    localStorage.setItem('tartarus:day', JSON.stringify(day));
}

/* Fade a panel in or out. `hidden` keeps it out of the layout and the tab
   order once it has gone, so nothing invisible stays clickable.

   The pending hide is cancelled on the way back in: without that, pausing
   within the fade-out window lets the old timer fire afterwards and hide
   the panel that was just asked for. */
const hiding = new WeakMap();

/* Open, or on its way there. `hidden` lags a fade behind on the way out,
   and `is-ready` lands a frame late on the way in; the pending hide is the
   one thing that knows the difference. */
const showing = (node) => !node.hidden && !hiding.has(node);

/* A pane that has only just stopped being `hidden` has no style behind it
   to leave from, so its arrival would have nothing to run over and would
   simply be there. Reading a value back settles the frame it is standing
   in first, and the change that follows has somewhere to come from. */
function settled(node) {
    void node.offsetHeight; /* reading a measurement is what forces the work */
    return node;
}

function reveal(node, on, ms = 400) {
    clearTimeout(hiding.get(node));
    hiding.delete(node);
    if (on) {
        node.hidden = false;
        requestAnimationFrame(() => {
            /* Hidden, a card has no size — and both the ceiling on a scaled
               face and the spot a placed one goes back to are worked out
               from that size, so while it was away they were worked out
               from nothing. A phone turned on its side with the calculator
               shut would bring it back taller than the screen, or drop a
               card left near an edge almost entirely off it. Laid out
               again, it can be measured again: reading a size back is what
               forces that layout, and the size comes before the spot,
               since the spot is worked out from it. */
            settled(node).classList.add('is-ready');
            sizers.forEach((fit) => fit());
            placers.forEach((put) => put());
        });
    } else {
        node.classList.remove('is-ready');
        hiding.set(node, setTimeout(() => { node.hidden = true; hiding.delete(node); }, ms));
    }
}

/* ── Time ─────────────────────────────────────────────────── */

function fmt(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function elapsed() {
    return state.elapsed + (state.running ? Date.now() - state.since : 0);
}

function phaseMs() {
    return (state.phase === 'focus' ? prefs.focusMin : prefs.breakMin) * MIN;
}

/* Study time counts on the daily total; breaks do not. */
function accrue() {
    const now = Date.now();
    if (state.running && !(state.mode === 'pomodoro' && state.phase === 'break')) {
        day.ms += now - accountedAt;
    }
    accountedAt = now;
}

/* What the display should read right now. Time that has passed rounds
   down, time that is left rounds up, so neither reads a second early. */
function reading() {
    if (state.mode === 'stopwatch') {
        return { label: 'Stopwatch', ms: Math.floor(elapsed() / 1000) * 1000, progress: 0 };
    }
    if (state.mode === 'pomodoro') {
        const span = phaseMs();
        const left = Math.max(0, span - elapsed());
        return {
            label: state.phase === 'focus' ? 'Focus' : 'Break',
            ms: Math.ceil(left / 1000) * 1000,
            progress: 1 - left / span,
        };
    }
    const left = Math.max(0, prefs.targetMs - elapsed());
    return {
        label: state.done ? 'Done' : 'Countdown',
        ms: Math.ceil(left / 1000) * 1000,
        progress: prefs.targetMs ? 1 - left / prefs.targetMs : 0,
    };
}

/* ── Rendering ────────────────────────────────────────────── */

function render() {
    if (!state.mode) { el.title.textContent = 'Tartarus'; return; }

    const { label, ms, progress } = reading();
    const text = fmt(ms);
    if (text === lastRender && el.phase.textContent === label) return;

    lastRender = text;
    el.time.textContent = text;
    el.zenTime.textContent = text;
    el.phase.textContent = label;
    el.zenPhase.textContent = label;
    el.progress.style.setProperty('--p', progress.toFixed(4));
    el.card.classList.toggle('is-focus', state.mode === 'pomodoro' && state.phase === 'focus');
    el.card.classList.toggle('is-break', state.mode === 'pomodoro' && state.phase === 'break');
    el.title.textContent = `${text} · ${label}`;
    el.todayTotal.textContent = fmt(day.ms);
}

function tick() {
    accrue();

    if (state.mode === 'pomodoro') {
        const span = phaseMs();
        if (elapsed() >= span) {
            /* Carry the overshoot into the next block so it cannot drift. */
            state.elapsed = elapsed() - span;
            state.since = Date.now();
            state.phase = state.phase === 'focus' ? 'break' : 'focus';
            chime();
        }
    } else if (state.mode === 'countdown' && !state.done && elapsed() >= prefs.targetMs) {
        pause();
        state.done = true;
        chime();
    }

    render();
}

/* ── Transport ────────────────────────────────────────────── */

/* Paused is the moment you want the extra controls, so they ride the
   same switch as the play/pause icon. */
function setRunning(running) {
    el.toggleIcon.setAttribute('href', running ? '#i-pause' : '#i-play');
    el.toggle.setAttribute('aria-label', running ? 'Pause' : 'Resume');
    el.toggle.classList.toggle('is-running', running);
    reveal(el.more, !running);
}

function play() {
    if (state.running) return;
    if (state.done) { state.elapsed = 0; state.done = false; }
    state.running = true;
    state.since = accountedAt = Date.now();
    setRunning(true);
    render();
}

function pause() {
    if (!state.running) return;
    accrue();
    state.elapsed = elapsed();
    state.running = false;
    setRunning(false);
    save();
}

/* Back to the top of whatever is running: a stopwatch to zero, a
   pomodoro or countdown to the start of its first block. Today's total is
   a record of the day, not of this session, so it is left alone. */
function restart() {
    state.elapsed = 0;
    state.phase = 'focus';
    state.done = false;
    state.since = accountedAt = Date.now();
    lastRender = ''; /* render() skips unchanged text, so clear the guard */
    render();
    save();
}

/* ── Screens ──────────────────────────────────────────────── */

function startSession() {
    if (!prefs.mode) return;

    state.mode = prefs.mode;
    state.elapsed = 0;
    state.phase = 'focus';
    state.done = false;

    const isStopwatch = prefs.mode === 'stopwatch';
    el.restartIcon.setAttribute('href', isStopwatch ? '#i-stop' : '#i-restart');
    el.restart.setAttribute('aria-label', isStopwatch ? 'Reset to zero' : 'Restart session');

    el.home.style.setProperty('--in', '0');
    setTimeout(() => {
        el.home.hidden = true;
        el.hud.hidden = false;
        applyPlace();
        requestAnimationFrame(() => settled(el.hud).classList.add('is-ready'));
        play();
    }, 450);
}

function endSession() {
    pause();
    closeModal(el.settings);
    /* Everything the session had open goes with it: the drawer, the cards
       pulled out of it, and focus mode. Each card fades on its own clock,
       which is shorter than the 450ms the island takes to leave. */
    cards.forEach((shut) => shut(false));
    showTools(false);
    exitZen();
    state.mode = null;
    el.hud.classList.remove('is-ready');
    setTimeout(() => {
        el.hud.hidden = true;
        el.home.hidden = false;
        requestAnimationFrame(() => { settled(el.home).style.setProperty('--in', '1'); });
        moveThumb();
        render();
    }, 450);
}

function enterZen() { reveal(el.zen, true, 500); }
function exitZen() { reveal(el.zen, false, 500); }

function showTools(on) {
    el.tools.setAttribute('aria-expanded', String(on));
    el.tools.classList.toggle('is-on', on);
    reveal(el.toolpanel, on, 400);
}

/* ── Dragging a card ──────────────────────────────────────────
   The island and the calculator are moved the same way. Each keeps its
   spot as a fraction of the free space rather than a pixel offset, so an
   edge stays an edge whatever the screen does next. */

const placers = [];
const sizers = [];

/* Whatever you touched last sits on top — and is what Esc closes. */
let front = 11;

function raise(node) { if (+node.style.zIndex !== front) node.style.zIndex = ++front; }

function draggable(node, key, handle) {
    /* Travel available to the card, minus a margin so it never sits flush
       against an edge. */
    const free = () => {
        const rect = node.getBoundingClientRect();
        const gutter = Math.min(innerWidth, innerHeight) * 0.02;
        return {
            gutter,
            x: Math.max(0, innerWidth - rect.width - gutter * 2),
            y: Math.max(0, innerHeight - rect.height - gutter * 2),
        };
    };

    const place = () => {
        if (!prefs[key]) return;
        node.classList.add('is-placed'); /* set first: it can change the width */
        const room = free();
        const at = (ratio, span, viewport) => `${((room.gutter + ratio * span) / viewport) * 100}%`;
        node.style.setProperty('--x-pos', at(prefs[key].x, room.x, innerWidth));
        node.style.setProperty('--y-pos', at(prefs[key].y, room.y, innerHeight));
    };

    const placeAt = (x, y) => {
        const room = free();
        const ratio = (value, span) => (span ? Math.min(1, Math.max(0, (value - room.gutter) / span)) : 0);
        prefs[key] = { x: ratio(x, room.x), y: ratio(y, room.y) };
        place();
    };

    let drag = null;

    node.addEventListener('pointerdown', (e) => {
        raise(node);
        if (e.target.closest('button')) return; /* the controls come first */
        if (handle && !e.target.closest(handle)) return; /* and this one is picked up by its head */
        const rect = node.getBoundingClientRect();
        drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        node.setPointerCapture(e.pointerId);
        node.classList.add('is-dragging');
    });

    node.addEventListener('pointermove', (e) => {
        if (drag) placeAt(e.clientX - drag.dx, e.clientY - drag.dy);
    });

    const drop = () => {
        if (!drag) return;
        drag = null;
        node.classList.remove('is-dragging');
        save();
    };

    node.addEventListener('pointerup', drop);
    node.addEventListener('pointercancel', drop);

    /* A drawer opening or shutting changes how wide the card is, and its
       spot is a fraction of whatever room is left over — so re-placing it
       in step with the width slides a card parked at the right edge back
       inside the screen instead of letting it grow off the side. */
    new ResizeObserver(place).observe(node);
    placers.push(place);
    return place;
}

const applyPlace = draggable(el.hud, 'hud');
draggable(el.calc, 'calc', '.card__head');
draggable(el.notes, 'notes', '.card__head');

resizable(el.calc, 'calc', true); /* one shape, scaled */
resizable(el.notes, 'notes');

/* ── Sizing a card ────────────────────────────────────────────
   The same corner on every card that can be pulled bigger, and the same
   rule as its spot: the size is kept as a fraction of the viewport
   rather than a pixel count, so a card keeps its share of the screen
   when the window changes, and it is clamped to something that can still
   be read and still fits.

   The calculator is the exception. A face laid out key for key has one
   shape, so it is scaled rather than reshaped — the whole thing grows,
   keys, screen and printed alternates together, and the ratio is kept by
   construction rather than by arithmetic. */

function resizable(node, key, scaled) {
    const grab = node.querySelector('.card__grab');
    const root = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

    /* A scaled face is never scrolled, so it must never stand taller than
       the screen: the corner that would shrink it again has to stay on
       it. The ceiling is worked out from the card's own laid-out height,
       which a transform leaves alone — and it caps what is shown without
       touching what was asked for, so a face sized on a tall screen comes
       back whole on the next one. */
    const fits = () => (node.offsetHeight ? (innerHeight * 0.96) / node.offsetHeight : 2);

    const apply = () => {
        const kept = prefs.sized?.[key];
        if (!kept) return;
        node.classList.add(scaled ? 'is-scaled' : 'is-sized');
        if (scaled) node.style.setProperty('--zoom', Math.min(kept.zoom, fits()));
        else {
            node.style.setProperty('--w', `${(kept.w * 100).toFixed(3)}vw`);
            node.style.setProperty('--h', `${(kept.h * 100).toFixed(3)}vh`);
        }
    };

    let from = null;

    grab.addEventListener('pointerdown', (e) => {
        const rect = node.getBoundingClientRect();
        from = {
            x: e.clientX, y: e.clientY, w: rect.width, h: rect.height,
            zoom: Number(getComputedStyle(node).getPropertyValue('--zoom')) || 1,
        };
        grab.setPointerCapture(e.pointerId);
        node.classList.add('is-sizing');
        /* Left to bubble on purpose: the card raises itself on the way
           past, and only its head starts a drag, so the corner is safe. */
    });

    grab.addEventListener('pointermove', (e) => {
        if (!from) return;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;
        prefs.sized = prefs.sized ?? {};

        if (scaled) {
            /* Both ways the hand went, halved: the corner keeps up with it
               on either axis without either one taking over. */
            const by = ((from.w + dx) / from.w + (from.h + dy) / from.h) / 2;
            prefs.sized[key] = { zoom: Math.max(0.55, Math.min(2, fits(), from.zoom * by)) };
        } else {
            const w = Math.min(innerWidth * 0.96, Math.max(13 * root(), from.w + dx));
            const h = Math.min(innerHeight * 0.92, Math.max(9 * root(), from.h + dy));
            prefs.sized[key] = { w: w / innerWidth, h: h / innerHeight };
        }
        apply();
    });

    const done = () => {
        if (!from) return;
        from = null;
        node.classList.remove('is-sizing');
        save();
    };

    grab.addEventListener('pointerup', done);
    grab.addEventListener('pointercancel', done);

    /* The card is laid out again when it is first shown, and whenever the
       root type scales with the window; a transform never fires this, so
       re-reading the ceiling here cannot chase its own tail. */
    new ResizeObserver(apply).observe(node);
    sizers.push(apply);
    apply();
}

/* Every study card, and the switch that closes it. A tool of its own
   file — the Graph — adds itself to this on the way in. */
const cards = new Map([[el.calc, showCalc], [el.notes, showNotes]]);

/* ── Modals ───────────────────────────────────────────────── */

let lastFocused = null;

function openModal(modal) {
    lastFocused = document.activeElement;
    reveal(modal, true);
    requestAnimationFrame(() => modal.querySelector('input, button:not([data-close])')?.focus());
}

function closeModal(modal) {
    if (modal.hidden) return;
    reveal(modal, false, 350);
    lastFocused?.focus();
}

document.querySelectorAll('[data-close]').forEach((node) => {
    node.addEventListener('click', () => closeModal(node.closest('.modal')));
});

/* ── Mode picking ─────────────────────────────────────────── */

function pickMode(mode) {
    prefs.mode = mode;
    el.modes.classList.add('is-set');
    el.hint.textContent = COPY[mode];
    el.adjust.hidden = mode === 'stopwatch';
    el.actions.classList.add('is-ready');

    document.querySelectorAll('.mode').forEach((btn) => {
        const on = btn.dataset.mode === mode;
        btn.setAttribute('aria-selected', String(on));
        if (on) moveThumb(btn);
    });
    save();
}

/* Positioned in %, so it survives any resize without re-measuring.
   A hidden home screen measures 0 wide, so skip and re-run when it shows. */
function moveThumb(btn = document.querySelector('.mode[aria-selected="true"]')) {
    const track = el.modes.clientWidth;
    if (!btn || !track) return;

    el.thumb.style.left = `${((btn.offsetLeft - el.modes.clientLeft) / track) * 100}%`;
    el.thumb.style.width = `${(btn.offsetWidth / track) * 100}%`;
}

/* ── Setup form ───────────────────────────────────────────── */

function openSetup() {
    const isPomodoro = prefs.mode === 'pomodoro';
    el.setupTitle.textContent = isPomodoro ? 'Pomodoro' : 'Countdown';
    el.setupPomodoro.hidden = !isPomodoro;
    el.setupCountdown.hidden = isPomodoro;

    el.focusMinutes.value = prefs.focusMin;
    el.breakMinutes.value = prefs.breakMin;
    el.focusOut.textContent = prefs.focusMin;
    el.breakOut.textContent = prefs.breakMin;

    const total = Math.round(prefs.targetMs / 1000);
    el.targetH.value = Math.floor(total / 3600);
    el.targetM.value = Math.floor((total % 3600) / 60);
    el.targetS.value = total % 60;

    openModal(el.setup);
}

function clamp(input) {
    const value = Number(input.value) || 0;
    return Math.min(Number(input.max), Math.max(Number(input.min), Math.floor(value)));
}

function saveSetup() {
    if (prefs.mode === 'pomodoro') {
        prefs.focusMin = Number(el.focusMinutes.value);
        prefs.breakMin = Number(el.breakMinutes.value);
    } else {
        const ms = (clamp(el.targetH) * 3600 + clamp(el.targetM) * 60 + clamp(el.targetS)) * 1000;
        prefs.targetMs = ms || MIN; /* never start already finished */
    }
    save();
    closeModal(el.setup);
}

/* ── Appearance ───────────────────────────────────────────── */

/* The trail needs a pointer to replace, and someone who wants motion. */
const wantsTrail = matchMedia('(hover: hover) and (pointer: fine)').matches
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The chime is switched in Settings alone: the island's speaker opens the
   music card instead. */
function syncSound() { el.sound.checked = prefs.sound; }

function applyPrefs() {
    document.documentElement.style.setProperty('--dim', prefs.dim / 100);
    el.dim.value = prefs.dim;
    el.dimOut.textContent = prefs.dim;
    el.trail.checked = prefs.trail;
    document.body.classList.toggle('trail-on', prefs.trail && wantsTrail);
    el.still.checked = prefs.still;
    keepPlaying();
    syncSound();
}

/* A short two-note chime; no audio file needed. */
let actx = null;

function chime() {
    if (!prefs.sound) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((offset, i) => {
        const at = actx.currentTime + offset;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i ? 660 : 440;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
        osc.connect(gain).connect(actx.destination);
        osc.start(at);
        osc.stop(at + 0.7);
    });
}

/* ── Calculator ───────────────────────────────────────────────
   The Math tool: an fx-82CW, key for key. What is parsed is the same
   text that is printed, so the entry line and the answer can never
   drift apart.

   Multi-character keys are listed longest first: the tokeniser, the
   cursor and DEL all walk the entry by this list, so `sin(` moves and
   deletes whole the way it does on the keypad. */
const WORDS = [
    'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'RanInt(',
    'sinh(', 'cosh(', 'tanh(', 'Intg(', 'Ran#', 'Abs(', 'Rnd(', 'Int(', 'GCD(',
    'LCM(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '∛(', '×10^', 'Ans',
    'ˣ√', '⁻¹', 'π', 'e', '(', ')', ',', '+', '−', '×', '÷', '^', '²', '³',
    '!', '%', 'P', 'C', '°', '/', '¦', 'A', 'B', 'D', 'E', 'F', 'x', 'y', 'z',
    'Σx²', 'Σy²', 'Σxy', 'Σx', 'Σy', 'x̄', 'ȳ', 'σx', 'σy', 'sx', 'sy', 'n',
/* One token is only ever a prefix of a longer one, so trying the long
   ones first is the whole rule — worth stating once rather than keeping
   the list hand-sorted. */
].sort((a, b) => b.length - a.length);

const VARS = ['A', 'B', 'C', 'D', 'E', 'F', 'x', 'y', 'z'];

/* The Calc Settings, and the letters, both outlive the session. Older
   preferences are filled in rather than replaced, so a blob written
   before a setting existed still opens. */
const CALCSET = {
    io: 'MathI/MathO', angle: 'Degree', fmt: 'Norm 1', digits: 3,
    frac: 'Improp Fraction', sep: 'Off',
};

prefs.calcset = { ...CALCSET, ...prefs.calcset };
prefs.vars = Object.fromEntries(VARS.map((name) => [name, prefs.vars?.[name] ?? 0]));

const calc = {
    entry: '', cur: 0, ans: 0, value: null, out: '0',
    shift: false, wrap: false, past: [], seen: -1, undo: null, menu: [],
    app: 'Calculate', grid: null, ask: null,
};

const shiftKey = el.calcPad.querySelector('[data-cmd="shift"]');

/* ── Drawing the screen ───────────────────────────────────────
   An expression is drawn the way it is written — a fraction stacked over
   its bar, a logarithm's base sitting low beside it — with the caret
   dropped in wherever its index falls, inside a numerator or a base if
   that is where it sits. One walk draws a stretch of the line and hands
   each half it finds back to itself, so the two shapes nest as deep as
   they are typed. */

let caret = null;

function draw(src, at = -1) {
    let placed = false;

    /* A mixed fraction is joined by ¦, which is only ever a thin gap. */
    const plain = (from, to) => src.slice(from, to).replace(/¦/g, ' ');

    const piece = (from, to) => {
        const frag = document.createDocumentFragment();
        if (placed || at < from || at > to) { frag.append(plain(from, to)); return frag; }
        placed = true;
        caret = document.createElement('i');
        caret.className = `calc__caret${calc.wrap ? ' is-wrap' : ''}`;
        frag.append(plain(from, at), caret, plain(at, to));
        return frag;
    };

    const wrap = (name, className, ...parts) => {
        const box = document.createElement(name);
        if (className) box.className = className;
        box.append(...parts);
        return box;
    };

    const stack = (top, low) => wrap('span', 'frac', wrap('span', '', top), wrap('span', '', low));

    /* Whichever shape comes first from `i`: a fraction bar, or a logarithm
       with a base to lower. A tie goes to the fraction, so log(2,8)/4 is
       the logarithm standing on the 4 rather than the other way about. */
    const split = (i, to) => {
        const bar = src.indexOf('/', i);
        let frac = null;
        if (bar >= 0 && bar < to) {
            const top = Math.max(i, operandFrom(src, bar));
            const low = Math.min(to, operandTo(src, bar + 1));
            frac = { at: top, end: low, draw: () => stack(run(top, bar), run(bar + 1, low)) };
        }

        let s = src.indexOf('log(', i);
        let parts = null;
        while (s >= 0 && s < to && !(parts = logBase(src, s, to))) s = src.indexOf('log(', s + 4);
        if (!parts) return frac;

        const { comma, end, closed } = parts;
        const low = {
            at: s,
            end: closed ? end + 1 : end,
            draw: () => wrap('span', '', piece(s, s + 3), wrap('sub', '', run(s + 4, comma)),
                '(', run(comma + 1, end), closed ? ')' : ''),
        };
        return frac && frac.at <= low.at ? frac : low;
    };

    /* A stretch of the line, drawn from one shape to the next. */
    const run = (from, to) => {
        const out = document.createDocumentFragment();
        let i = from;
        for (let cut = split(i, to); cut; cut = split(i, to)) {
            out.append(piece(i, cut.at), cut.draw());
            i = cut.end;
        }
        out.append(piece(i, to));
        return out;
    };

    return run(0, src.length);
}

/* Where a logarithm's base and its value part company, so long as it has a
   base worth lowering: only a comma at the top of its own brackets counts,
   and the closing bracket may be left off the end as it may anywhere. */
function logBase(src, s, to) {
    let comma = -1;
    for (let i = s + 4, depth = 1; i < to; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')' && !--depth) return comma > s + 4 ? { comma, end: i, closed: true } : null;
        else if (src[i] === ',' && depth === 1 && comma < 0) comma = i;
    }
    return comma > s + 4 ? { comma, end: to, closed: false } : null;
}

/* Where the value ending at `at` begins: a plain number, or a bracketed
   group with whatever function name stands in front of it. */
function operandFrom(src, at) {
    let i = at;
    if (src[i - 1] !== ')') {
        while (i > 0 && /[\d.]/.test(src[i - 1])) i--;
        if (i < at) return i;
        /* A name stands in for a number, so x/y and Ans/2 have numerators. */
        while (i > 0 && /[A-Za-zπ#]/.test(src[i - 1])) i--;
        return i;
    }
    for (let depth = 0; i > 0;) {
        const c = src[--i];
        if (c === ')') depth++;
        else if (c === '(' && !--depth) break;
    }
    while (i > 0 && /[A-Za-zπ√∛⁻¹#]/.test(src[i - 1])) i--;
    return i;
}

/* And where the value starting at `from` ends. */
function operandTo(src, from) {
    let i = from;
    while (i < src.length && /[A-Za-zπ√∛⁻¹#]/.test(src[i])) i++;
    if (src[i] === '(') {
        for (let depth = 0; i < src.length;) {
            const c = src[i++];
            if (c === '(') depth++;
            else if (c === ')' && !--depth) break;
        }
        return i;
    }
    if (i > from) return i; /* a bare name: π, e, Ans */
    while (i < src.length && /[\d.]/.test(src[i])) i++;
    return i;
}

function calcRender() {
    const menu = menuNow();
    const grid = !menu && calc.grid;
    caret = null;

    el.calcMenu.hidden = !menu;
    el.calcGrid.hidden = !grid;
    el.calcWork.hidden = !!menu || !!grid;

    if (menu) drawMenu(menu);
    else if (grid) drawGrid(grid);
    else {
        el.calcAsk.hidden = !calc.ask;
        el.calcAsk.textContent = calc.ask?.label ?? '';
        el.calcEntry.replaceChildren(draw(calc.entry, calc.cur));
        el.calcOut.replaceChildren(draw(calc.out));
    }

    el.calcApp.textContent = APP_TAG[calc.app] ?? '';
    el.calcUnit.textContent = prefs.calcset.angle.slice(0, 3).toUpperCase();
    el.calcFmt.textContent = ['Fix', 'Sci'].includes(prefs.calcset.fmt) ? prefs.calcset.fmt.toUpperCase() : '';
    el.calcWrap.textContent = calc.wrap ? 'INS' : '';
    el.calc.classList.toggle('is-shift', calc.shift);
    shiftKey.classList.toggle('is-on', calc.shift);
    caret?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function drawMenu(menu) {
    el.calcTitle.textContent = menu.title;
    el.calcList.replaceChildren(...menu.items.map((item, n) => {
        const row = document.createElement('li');
        row.className = `calc__item${n === menu.at ? ' is-at' : ''}`;
        row.append(item.label);

        const tag = typeof item.tag === 'function' ? item.tag() : item.tag;
        if (tag) {
            const side = document.createElement('span');
            side.append(tag);
            row.append(side);
        }
        if (n === menu.at) requestAnimationFrame(() => row.scrollIntoView({ block: 'nearest' }));
        return row;
    }));
}

/* ── Menus ────────────────────────────────────────────────────
   HOME, SETTINGS, CATALOG and the rest are all one thing: a list on the
   screen, walked with the cursor cross and entered with OK. A menu that
   opens another pushes onto the stack; BACK, and ◀, pop it. Running an
   item closes the lot and drops you back on the worksheet. */

const menuNow = () => calc.menu[calc.menu.length - 1];

function openMenu(title, items, back) { calc.menu.push({ title, items, at: 0, back }); }

/* Backing out of the last menu in a stack lands wherever that stack was
   opened from, rather than on a worksheet nobody asked for. */
function popMenu() {
    const left = calc.menu.pop();
    if (!menuNow() && left?.back) left.back();
}

function moveMenu(by) {
    const menu = menuNow();
    menu.at = Math.max(0, Math.min(menu.items.length - 1, menu.at + by));
}

function chooseMenu() {
    const item = menuNow()?.items[menuNow().at];
    if (!item) return;
    if (item.into) openMenu(item.label, item.into());
    else { calc.menu.length = 0; item.run(); }
}

const insert = (label, text) => ({ label, run: () => calcIns(text) });

/* A setting shows what it is set to, and opens its choices. */
const setting = (label, key, choices) => ({
    label,
    tag: () => prefs.calcset[key],
    into: () => choices.map((choice) => ({
        label: choice,
        run: () => { prefs.calcset[key] = choice; save(); },
    })),
});

const places = (fmt) => Array.from({ length: 10 }, (unused, n) => ({
    label: `${fmt} ${n}`,
    run: () => { Object.assign(prefs.calcset, { fmt, digits: n }); save(); },
}));

const MENUS = {
    home: () => ['Calculate', 'Statistics', 'Table', 'Math Box'].map((label) => ({
        label, tag: () => (label === calc.app ? '◆' : ''), run: () => enterApp(label),
    })),

    box: () => [
        { label: 'Dice Roll', run: () => startBox('Dice Roll') },
        { label: 'Coin Toss', run: () => startBox('Coin Toss') },
    ],

    settings: () => [
        {
            label: 'Calc Settings',
            into: () => [
                setting('Input/Output', 'io', ['MathI/MathO', 'MathI/DecimalO', 'LineI/LineO', 'LineI/DecimalO']),
                setting('Angle Unit', 'angle', ['Degree', 'Radian', 'Gradian']),
                {
                    label: 'Number Format',
                    tag: () => prefs.calcset.fmt,
                    into: () => [
                        { label: 'Fix', into: () => places('Fix') },
                        { label: 'Sci', into: () => places('Sci') },
                        ...['Norm 1', 'Norm 2'].map((label) => ({
                            label, run: () => { prefs.calcset.fmt = label; save(); },
                        })),
                    ],
                },
                setting('Fraction Result', 'frac', ['Mixed Fraction', 'Improp Fraction']),
                setting('Digit Separator', 'sep', ['On', 'Off']),
            ],
        },
        {
            label: 'Reset',
            into: () => [
                { label: 'Settings & Data', run: () => { Object.assign(prefs.calcset, CALCSET); CMD.ac(); save(); } },
                { label: 'Variable Memory', run: () => { VARS.forEach((name) => { prefs.vars[name] = 0; }); save(); } },
            ],
        },
    ],

    /* CATALOG and FUNCTION open the same list on the real one too. */
    catalog: () => [
        {
            label: 'Func Analysis',
            into: () => [
                insert('Square Root', '√('), insert('Cube Root', '∛('),
                insert('Square', '²'), insert('Cube', '³'),
                insert('Power', '^'), insert('Power Root', 'ˣ√'),
                insert('Reciprocal', '⁻¹'),
                insert('Logarithm(logₐb)', 'log(▯,)'),
                insert('Logarithm(log)', 'log('), insert('Natural Logarithm', 'ln('),
                insert('10^', '10^('), insert('e^', 'e^('),
            ],
        },
        {
            label: 'Probability',
            into: () => [
                insert('%', '%'), insert('Factorial(!)', '!'),
                insert('Permutation(P)', 'P'), insert('Combination(C)', 'C'),
                insert('Random Number', 'Ran#'), insert('Random Integer', 'RanInt('),
            ],
        },
        {
            label: 'Numeric Calc',
            into: () => [
                insert('Absolute Value', 'Abs('), insert('Round Off', 'Rnd('),
                insert('Integer Part', 'Int('), insert('Greatest Integer', 'Intg('),
                insert('GCD', 'GCD('), insert('LCM', 'LCM('),
            ],
        },
        { label: 'Angle Unit', into: () => [insert('Degree(°)', '°')] },
        {
            label: 'Hyperbolic',
            into: () => ['sinh', 'cosh', 'tanh'].flatMap((fn) => [
                insert(fn, `${fn}(`), insert(`${fn}⁻¹`, `${fn}⁻¹(`),
            ]),
        },
        { label: 'Constant', into: () => [insert('π', 'π'), insert('e', 'e'), insert('Ans', 'Ans')] },
        ...(calc.app === 'Statistics' ? [{
            label: 'Statistics',
            into: () => [
                { label: 'Summation', into: () => ['Σx', 'Σx²', 'Σy', 'Σy²', 'Σxy'].map((name) => insert(name, name)) },
                { label: 'Mean/Var/Dev', into: () => ['x̄', 'ȳ', 'σx', 'σy', 'sx', 'sy', 'n'].map((name) => insert(name, name)) },
            ],
        }] : []),
    ],

    /* TOOLS belongs to whichever app is open. */
    tools: () => ({
        Calculate: [
            { label: 'Undo', run: undoEntry },
            { label: 'Variables', into: () => MENUS.variable() },
            { label: 'Clear History', run: () => { calc.past.length = 0; calc.seen = -1; } },
        ],
        Statistics: [
            {
                label: 'Select Type',
                tag: () => (stat.pairs ? '2-Variable' : '1-Variable'),
                into: () => [false, true].map((pairs) => ({
                    label: pairs ? '2-Variable' : '1-Variable', run: () => startStats(pairs),
                })),
            },
            {
                label: 'Frequency',
                tag: () => (stat.freq ? 'On' : 'Off'),
                into: () => ['On', 'Off'].map((choice) => ({
                    label: choice,
                    run: () => { stat.freq = choice === 'On'; stat.rows = []; statEditor(); },
                })),
            },
            { label: 'Variables', into: () => MENUS.variable() },
        ],
        Table: [
            { label: 'Define f(x)', run: () => ask('f(x)=', table.f, (src) => { table.f = src; buildTable(); }) },
            { label: 'Define g(x)', run: () => ask('g(x)=', table.g, (src) => { table.g = src; buildTable(); }) },
            { label: 'Table Range', run: askRange },
            {
                label: 'Table Type',
                tag: () => table.type,
                into: () => ['f(x)/g(x)', 'f(x)', 'g(x)'].map((choice) => ({
                    label: choice, run: () => { table.type = choice; buildTable(); },
                })),
            },
        ],
        'Math Box': [
            { label: box.kind, run: boxParams },
            { label: 'Math Box', into: () => MENUS.box() },
        ],
    }[calc.app]),

    variable: () => VARS.map((name) => ({
        label: name,
        tag: () => showNum(prefs.vars[name]),
        into: () => [
            { label: 'Insert', run: () => calcIns(name) },
            { label: 'Store', run: () => { prefs.vars[name] = calc.value ?? 0; save(); } },
            { label: 'Recall', run: () => calcIns(String(prefs.vars[name]).replace('-', '−')) },
        ],
    })),

    format: () => [
        { label: 'Standard', run: () => { calc.out = standard(calc.value); } },
        { label: 'Decimal', run: () => { calc.out = showNum(calc.value); } },
        { label: 'Prime Factor', run: () => { calc.out = primeFactors(calc.value); } },
        { label: 'Improper Fraction', run: () => { calc.out = asFraction(calc.value) || showNum(calc.value); } },
        { label: 'Mixed Fraction', run: () => { calc.out = asMixed(calc.value) || showNum(calc.value); } },
        { label: 'ENG Notation', run: () => { calc.out = engineering(calc.value); } },
        { label: 'Sexagesimal', run: () => { calc.out = sexagesimal(calc.value); } },
    ],
};

/* ── The keys ─────────────────────────────────────────────────
   Every key names a command or the text it types, and the cursor cross
   answers to whichever is on the screen: a menu, or the worksheet. */

const CMD = {
    shift() { calc.shift = !calc.shift; },
    on() { calc.menu.length = 0; CMD.ac(); },
    off() { showCalc(false); },
    /* The one key on the face with nothing behind it. */
    qr() { calc.out = 'QR is not in this build'; },

    home() { openMenu('HOME', MENUS.home()); },
    settings() { openMenu('SETTINGS', MENUS.settings()); },
    catalog() { openMenu('CATALOG', MENUS.catalog()); },
    funcs() { openMenu('FUNCTION', MENUS.catalog()); },
    tools() { openMenu('TOOLS', MENUS.tools()); },
    variable() { openMenu('VARIABLE', MENUS.variable()); },
    format() { if (calc.value !== null) openMenu('FORMAT', MENUS.format()); },

    /* Out of a menu, out of a question, out of a table — and finally
       back to whatever screen the open app starts on. */
    back() {
        if (menuNow()) popMenu();
        else if (calc.ask) Object.assign(calc, { ask: null, entry: '', cur: 0 });
        else if (calc.grid?.back) calc.grid.back();
        else if (calc.app !== 'Calculate') APP_HOME[calc.app]();
    },

    ok() { menuNow() ? chooseMenu() : calc.grid?.ok?.(); },
    up() { menuNow() ? moveMenu(-1) : calc.grid ? gridMove(-1, 0) : recall(1); },
    down() { menuNow() ? moveMenu(1) : calc.grid ? gridMove(1, 0) : recall(-1); },
    left() { menuNow() ? popMenu() : calc.grid ? gridMove(0, -1) : (calc.cur = Math.max(0, calc.cur - step(true))); },
    right() { menuNow() ? chooseMenu() : calc.grid ? gridMove(0, 1) : (calc.cur = Math.min(calc.entry.length, calc.cur + step(false))); },
    pgup() { menuNow() ? moveMenu(-4) : calc.grid ? gridMove(-4, 0) : (calc.cur = 0); },
    pgdn() { menuNow() ? moveMenu(4) : calc.grid ? gridMove(4, 0) : (calc.cur = calc.entry.length); },

    /* INS hands the value in front of the cursor to the next function
       pressed, so 176 becomes √(176) with one key. */
    wrap() { calc.wrap = !calc.wrap; },

    ac() {
        calc.menu.length = 0;
        calc.undo = calc.entry;
        /* AC clears the line, and only BACK gives up on a question. */
        Object.assign(calc, { entry: '', cur: 0, wrap: false });
        if (!calc.grid && !calc.ask) Object.assign(calc, { out: '0', value: null, seen: -1 });
    },

    del() {
        if (!calc.cur) { calc.grid?.drop?.(calc.grid.r); return; } /* an empty line takes the row */
        const n = step(true);
        calc.undo = calc.entry;
        calc.entry = calc.entry.slice(0, calc.cur - n) + calc.entry.slice(calc.cur);
        calc.cur -= n;
    },

    exe() {
        if (calc.ask) {
            const asked = calc.ask;
            const typed = calc.entry;
            Object.assign(calc, { ask: null, entry: '', cur: 0 });
            asked.done(typed);
            return;
        }
        if (calc.grid) { if (saveCell()) gridMove(1, 0); return; }
        if (!calc.entry) return;
        try {
            calc.value = calc.ans = evaluate(calc.entry);
            calc.out = standard(calc.value);
            if (calc.past[0] !== calc.entry) calc.past.unshift(calc.entry);
            calc.seen = -1;
            calc.cur = calc.entry.length;
        } catch (err) {
            calc.value = null;
            calc.out = `${err === 'Math' ? 'Math' : 'Syntax'} ERROR`;
        }
    },

    /* ≈ asks for the same sum, but as a plain decimal. */
    approx() { CMD.exe(); if (calc.value !== null) calc.out = showNum(calc.value); },
};

/* Shift arms the next key and is spent by it, exactly as on the keypad:
   an armed key runs whatever is printed above it, and falls back to its
   own face where nothing is. */
function tapKey(key) {
    const armed = calc.shift && (key.altcmd || key.shift);
    if (key.cmd !== 'shift') calc.shift = false;

    const cmd = armed ? key.altcmd : key.cmd;
    const text = armed ? key.shift : key.ins;
    /* A menu has the screen to itself: keys that only type are ignored
       until it closes, as they are on the real one. */
    if (cmd) CMD[cmd]?.();
    else if (text && !menuNow() && (!calc.grid || calc.grid.write)) calcIns(text);
    calcRender();
}

function calcIns(text) {
    /* With INS armed a function swallows the value in front of the
       cursor instead of being dropped in beside it. */
    if (calc.wrap && text.endsWith('(')) {
        const from = operandFrom(calc.entry, calc.cur);
        calc.entry = calc.entry.slice(0, from) + text + calc.entry.slice(from, calc.cur) + ')' + calc.entry.slice(calc.cur);
        calc.cur += text.length + 1;
        calc.wrap = false;
        return;
    }
    /* A template says where the cursor lands with ▯, so the log key can
       drop the comma in and leave you standing on the base. */
    const stop = text.indexOf('▯');
    const body = text.replace('▯', '');
    calc.entry = calc.entry.slice(0, calc.cur) + body + calc.entry.slice(calc.cur);
    calc.cur += stop < 0 ? body.length : stop;
}

function undoEntry() {
    if (calc.undo === null) return;
    [calc.entry, calc.undo] = [calc.undo, calc.entry];
    calc.cur = calc.entry.length;
}

/* How far the cursor and DEL step: a whole key's worth, or one character. */
function step(back) {
    const word = back
        ? WORDS.find((w) => calc.entry.endsWith(w, calc.cur))
        : WORDS.find((w) => calc.entry.startsWith(w, calc.cur));
    return word ? word.length : 1;
}

function recall(dir) {
    if (!calc.past.length) return;
    calc.seen = Math.max(0, Math.min(calc.past.length - 1, calc.seen + dir));
    calc.entry = calc.past[calc.seen];
    calc.cur = calc.entry.length;
}

function showCalc(on) {
    reveal(el.calc, on, 350);
    el.toolMath.classList.toggle('is-on', on);
    if (on) { raise(el.calc); calcRender(); }
}

/* ── Reading an entry ─────────────────────────────────────────
   Precedence climbs expr → term → unary → fraction → power → postfix →
   primary, so −2² is −4, 2^3² is 2⁹, and a fraction bar bites harder
   than × does. */

function evaluate(src) {
    const t = [];
    for (let at = 0; at < src.length;) {
        const num = /^\d+(\.\d*)?|^\.\d+/.exec(src.slice(at));
        const word = num ? num[0] : WORDS.find((w) => src.startsWith(w, at));
        if (!word) throw 'Syntax';
        t.push(word);
        at += word.length;
    }

    let i = 0;
    const eat = (s) => t[i] === s && ++i;
    /* Anything that can start a value — and so be multiplied by implicitly */
    const opens = (s) => s !== undefined
        && (/^[\d.]/.test(s) || s.endsWith('(') || s === 'π' || s === 'e'
            || s === 'Ans' || s === 'Ran#' || VARS.includes(s) || s in STATS);

    const unit = prefs.calcset.angle;
    const turn = unit === 'Degree' ? 180 : unit === 'Gradian' ? 200 : Math.PI;
    const rad = (x) => (x * Math.PI) / turn;
    const back = (x) => (x * turn) / Math.PI;
    const flat = (x) => (Math.abs(x) < 1e-12 ? 0 : x); /* sin 180° is zero, not 1.2e-16 */

    const FN = {
        'sin(': ([x]) => flat(Math.sin(rad(x))),
        'cos(': ([x]) => flat(Math.cos(rad(x))),
        'tan(': ([x]) => {
            const c = Math.cos(rad(x));
            if (Math.abs(c) < 1e-12) throw 'Math'; /* tan 90° has no value */
            return flat(Math.sin(rad(x)) / c);
        },
        'sin⁻¹(': ([x]) => back(Math.asin(x)),
        'cos⁻¹(': ([x]) => back(Math.acos(x)),
        'tan⁻¹(': ([x]) => back(Math.atan(x)),
        'sinh(': ([x]) => Math.sinh(x),
        'cosh(': ([x]) => Math.cosh(x),
        'tanh(': ([x]) => Math.tanh(x),
        'sinh⁻¹(': ([x]) => Math.asinh(x),
        'cosh⁻¹(': ([x]) => Math.acosh(x),
        'tanh⁻¹(': ([x]) => Math.atanh(x),
        /* One argument is the common logarithm; two are a base and its
           value, and a base left out is ten either way. */
        'log(': (args) => {
            const [base, of] = args.length > 1 ? args : [10, args[0]];
            return Math.log(of) / Math.log(base ?? 10);
        },
        'ln(': ([x]) => Math.log(x),
        '√(': ([x]) => Math.sqrt(x),
        '∛(': ([x]) => Math.cbrt(x),
        'Abs(': ([x]) => Math.abs(x),
        'Rnd(': ([x]) => Number(x.toPrecision(10)),
        'Int(': ([x]) => Math.trunc(x),
        'Intg(': ([x]) => Math.floor(x),
        'GCD(': ([a, b]) => gcd(a, b),
        'LCM(': ([a, b]) => Math.abs(a * b) / gcd(a, b),
        'RanInt(': ([a, b]) => a + Math.floor(Math.random() * (b - a + 1)),
    };

    const expr = () => {
        let v = term();
        for (;;) {
            if (eat('+')) v += term();
            else if (eat('−')) v -= term();
            else return v;
        }
    };

    const term = () => {
        let v = unary();
        for (;;) {
            if (eat('×')) v *= unary();
            else if (eat('÷')) v /= unary();
            else if (eat('×10^')) v *= 10 ** unary();
            else if (opens(t[i])) v *= unary(); /* 2π and 3sin(30) multiply */
            else return v;
        }
    };

    const unary = () => (eat('−') ? -unary() : fraction());

    /* A mixed fraction carries the sign of its whole part. */
    const fraction = () => {
        const v = power();
        if (eat('¦')) {
            const top = power();
            if (!eat('/')) throw 'Syntax';
            return v + (v < 0 ? -1 : 1) * (top / power());
        }
        if (eat('/')) return v / power();
        return v;
    };

    const power = () => {
        const v = postfix();
        if (eat('^')) return v ** unary();
        if (eat('ˣ√')) { const n = unary(); return n < 0 && v % 2 ? -((-n) ** (1 / v)) : n ** (1 / v); }
        return v;
    };

    /* 1°30°0° is one and a half degrees: each mark closes a field. */
    const degrees = (v) => {
        let out = v;
        i++;
        for (let scale = 60; scale <= 3600 && /^[\d.]/.test(t[i] ?? '') && t[i + 1] === '°'; scale *= 60) {
            out += Number(t[i]) / scale;
            i += 2;
        }
        return out;
    };

    const postfix = () => {
        let v = primary();
        for (;;) {
            if (eat('²')) v **= 2;
            else if (eat('³')) v **= 3;
            else if (eat('⁻¹')) v = 1 / v;
            else if (eat('!')) v = factorial(v);
            else if (eat('%')) v /= 100;
            else if (eat('P')) v = permutations(v, primary());
            else if (eat('C')) { const r = primary(); v = permutations(v, r) / factorial(r); }
            else if (t[i] === '°') v = degrees(v);
            else return v;
        }
    };

    const primary = () => {
        const tok = t[i];
        if (tok === undefined) throw 'Syntax';
        if (/^[\d.]/.test(tok)) { i++; return Number(tok); }
        if (eat('π')) return Math.PI;
        if (eat('e')) return Math.E;
        if (eat('Ans')) return calc.ans;
        if (eat('Ran#')) return Math.random();
        if (VARS.includes(tok)) { i++; return prefs.vars[tok]; }
        if (tok in STATS) { i++; return STATS[tok](summary()); }
        /* A closing bracket left off the end is fine, as it is on the keypad */
        if (eat('(')) { const v = expr(); eat(')'); return v; }
        if (tok.endsWith('(')) {
            i++;
            /* Only the logarithm takes an empty slot: log(,1000) has no base. */
            const args = [tok === 'log(' && t[i] === ',' ? undefined : expr()];
            while (eat(',')) args.push(expr());
            eat(')');
            return FN[tok](args);
        }
        throw 'Syntax';
    };

    const value = expr();
    if (i < t.length) throw 'Syntax'; /* a stray bracket or a dangling operator */
    if (!isFinite(value)) throw 'Math';
    return value;
}

function factorial(n) {
    if (n < 0 || n > 170 || n % 1) throw 'Math';
    let out = 1;
    for (let k = 2; k <= n; k++) out *= k;
    return out;
}

function permutations(n, r) {
    if (r < 0 || r > n) throw 'Math';
    return factorial(n) / factorial(n - r);
}

function gcd(a, b) {
    [a, b] = [Math.abs(a), Math.abs(b)];
    while (b) [a, b] = [b, a % b];
    return a;
}

/* ── Printing an answer ───────────────────────────────────────
   Ten significant figures, then scientific notation at either end — the
   window the real screen shows. Fix, Sci and the digit separator from
   Calc Settings override it. */

const SUP = { '-': '⁻', '−': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => [...String(n)].map((c) => SUP[c]).join('');

/* A printed answer uses the same minus as the keypad, not a hyphen. */
const minus = (s) => s.replace('-', '−');
const trim = (s) => minus(s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

/* Every third digit, once the setting asks for it. */
function grouped(s) {
    if (prefs.calcset.sep !== 'On') return s;
    const [whole, rest] = s.split('.');
    return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (rest === undefined ? '' : `.${rest}`);
}

/* Sci was asked for a number of digits and keeps all of them. Norm only
   falls back on this shape at the ends of its range, where the zeros it
   would be left holding say nothing. */
function sci(n, places, keep = false) {
    const [mantissa, exponent] = n.toExponential(places).split('e');
    return `${keep ? minus(mantissa) : trim(mantissa)}×10${sup(exponent.replace('+', ''))}`;
}

/* The same figures with no exponent behind them. How many decimal places
   that comes to depends on where the point falls once the rounding is
   done, which is what `toExponential` is being asked here. */
function written(n, digits) {
    const power = Number(n.toExponential(digits - 1).split('e')[1]);
    return trim(n.toFixed(Math.max(0, Math.min(100, digits - 1 - power))));
}

function showNum(n) {
    /* A figure with no value behind it — the spread of a single reading,
       the mean of an empty table — says so rather than printing NaN. */
    if (!isFinite(n)) return 'ERROR';

    const set = prefs.calcset;
    if (set.fmt === 'Fix') return grouped(minus(n.toFixed(set.digits)));
    if (set.fmt === 'Sci') return sci(n, set.digits, true);

    /* Measured after the rounding, not before it: 9999999999.9 does not
       fit in ten digits, however nearly it does on the way in. */
    const size = Math.abs(Number(n.toPrecision(10)));
    const small = set.fmt === 'Norm 1' ? 1e-2 : 1e-9;
    if (size >= 1e10 || (size && size < small)) return sci(n, 9);
    return grouped(written(n, 10));
}

/* MathO answers a sum the way it was asked — the fraction, the root or
   the multiple of π that the decimal is only a rounding of. DecimalO
   never does. */
function standard(v) {
    if (prefs.calcset.io.endsWith('DecimalO')) return showNum(v);
    const frac = prefs.calcset.frac === 'Mixed Fraction' ? asMixed(v) : asFraction(v);
    return frac || exact(v) || showNum(v);
}

/* The nearest fraction that lands exactly on a value, by continued
   fractions: its two halves, or nothing where no small enough pair fits. */
function ratio(x, most = 9999) {
    const size = Math.abs(x);
    const near = (top, bottom) => Math.abs(size - top / bottom) <= size * SNAP;
    let rest = size, top = 1, lastTop = 0, bottom = 0, lastBottom = 1;

    for (let k = 0; k < 24 && isFinite(rest); k++) {
        const whole = Math.floor(rest);
        [top, lastTop] = [whole * top + lastTop, top];
        [bottom, lastBottom] = [whole * bottom + lastBottom, bottom];
        if (near(top, bottom)) break;
        rest = 1 / (rest - whole);
    }

    if (!bottom || bottom > most || !near(top, bottom)) return null;
    return [x < 0 ? -top : top, bottom];
}

/* The same pair written out, which wants a denominator worth writing. */
function asFraction(x) {
    const part = ratio(x);
    return part && part[1] > 1 ? `${dash(part[0])}${Math.abs(part[0])}/${part[1]}` : null;
}

/* The same fraction with its whole part pulled out in front. */
function asMixed(x) {
    const improper = asFraction(x);
    if (!improper) return null;
    const [top, bottom] = improper.replace('−', '').split('/').map(Number);
    if (top < bottom) return improper;
    const whole = Math.floor(top / bottom);
    return `${x < 0 ? '−' : ''}${whole}¦${top - whole * bottom}/${bottom}`;
}

/* ── Exact answers ────────────────────────────────────────────
   A quarter turn is √2/2 on paper and 0.7071067812 in a double, and in
   MathO the screen says the first. Nothing here works symbolically — the
   sum was done in doubles long before any of it runs — so the job is
   recognition: find the small exact value that lands on the answer, and
   write it in the language the keypad types, so what is printed can be
   typed straight back in and drawn by the same hand that draws an entry.

   Every one of these comes out of a double within a few bits of the
   truth, a part in 10¹⁵ or so, while a decimal typed by hand to the ten
   digits the screen holds is a thousand times further out than that.
   Twelve digits is the line drawn between the two. */

const SNAP = 1e-12;

/* Radicands with no square factor in them: √8 is 2√2, so 8 is never
   wanted, and asking for it would only give the same answer twice. */
const rootless = (top) => {
    const out = [];
    for (let m = 2; m <= top; m++) {
        let clean = true;
        for (let p = 2; p * p <= m; p++) if (m % (p * p) === 0) clean = false;
        if (clean) out.push(m);
    }
    return out;
};

/* One root is looked for widely. Two at once is a far wider net for the
   same tolerance to hold, so that pass is cast over the small radicands
   alone — the ones half angles actually throw up — with 1 standing in
   for a term that carries no root, which is what makes tan 15 into 2−√3. */
const ROOTS = rootless(99);
const BOTH = [1, ...rootless(15)];
const SPAN = 30; /* how large a whole number in an exact answer may grow */

const dash = (n) => (n < 0 ? '−' : '');

/* A whole multiple of a root, without the 1 nobody writes. */
const rooted = (a, m) => (m === 1 ? String(a) : `${a === 1 ? '' : a}√(${m})`);
const divided = (body, d) => (d === 1 ? body : `${body}/${d}`);

function exact(v) {
    const size = Math.abs(v);
    /* A whole number is exact already, and none of these ever is one. */
    if (!isFinite(size) || v % 1 === 0 || size > 1e6) return null;

    /* A multiple of π first: one question rather than thousands of them,
       and no answer is ever both that and a root. */
    const turns = ratio(v / Math.PI, SPAN);
    if (turns && Math.abs(turns[0]) <= SPAN) {
        const many = Math.abs(turns[0]);
        return dash(turns[0]) + divided(`${many === 1 ? '' : many}π`, turns[1]);
    }

    /* One root: a√m over b, which is where nearly every angle in the
       table lands. The smallest radicand that fits wins, so √3/2 is
       never dressed up as √12/4. */
    for (const m of ROOTS) {
        const part = ratio(v / Math.sqrt(m), SPAN);
        if (part && Math.abs(part[0]) <= SPAN) {
            return dash(part[0]) + divided(rooted(Math.abs(part[0]), m), part[1]);
        }
    }

    /* And two, which is what a half angle comes to. No value fits more
       than one pair of radicands, so the first pair that fits is the
       answer rather than merely an answer. */
    for (let i = 0; i < BOTH.length; i++) {
        for (let k = i + 1; k < BOTH.length; k++) {
            const found = twoRoots(v, BOTH[i], BOTH[k]);
            if (found) return found;
        }
    }
    return null;
}

/* v = (a√u + b√w)/d, with both terms really there. Denominators are
   tried smallest first, so the plainest way of saying it is found. */
function twoRoots(v, u, w) {
    const ru = Math.sqrt(u);
    const rw = Math.sqrt(w);
    for (let d = 1; d <= SPAN; d++) {
        for (let a = -SPAN; a <= SPAN; a++) {
            if (!a) continue;
            const b = (v * d - a * ru) / rw;
            const near = Math.round(b);
            if (!near || Math.abs(near) > SPAN) continue;
            if (Math.abs(b - near) <= (Math.abs(near) + 1) * SNAP) return twoTerms(a, u, near, w, d);
        }
    }
    return null;
}

/* The two terms, in the order they read best. */
function twoTerms(a, u, b, w, d) {
    const by = gcd(gcd(Math.abs(a), Math.abs(b)), d);
    let terms = [[a / by, u], [b / by, w]];
    d /= by;

    /* Both halves negative is one minus in front of the whole thing —
       and a minus in front wants the brackets a denominator would have
       brought with it anyway. */
    const lead = terms.every(([c]) => c < 0);
    if (lead) terms = terms.map(([c, m]) => [-c, m]);

    /* Whichever half comes first: the one being added, and then the
       deeper root — so tan 15 is 2−√3, tan 22.5 is √2−1, and sin 75 is
       (√6+√2)/4 rather than any of them backwards. */
    const [[x, m], [y, n]] = terms.sort((p, q) => (p[0] < 0) - (q[0] < 0) || q[1] - p[1]);

    const body = `${rooted(x, m)}${y < 0 ? '−' : '+'}${rooted(Math.abs(y), n)}`;
    const held = lead || d > 1 ? `(${body})` : body;
    return `${lead ? '−' : ''}${divided(held, d)}`;
}

/* The exponent moved to the nearest multiple of three. */
function engineering(v) {
    if (!v) return '0';
    const power = Math.floor(Math.log10(Math.abs(v)) / 3) * 3;
    return trim((v / 10 ** power).toPrecision(10)) + (power ? `×10${sup(power)}` : '');
}

function sexagesimal(v) {
    const size = Math.abs(v);
    const whole = Math.floor(size);
    const minutes = Math.floor((size - whole) * 60);
    return `${v < 0 ? '−' : ''}${whole}°${minutes}′${trim(((size - whole) * 3600 - minutes * 60).toFixed(4))}″`;
}

/* Whole numbers only, and only up to the ten digits the screen holds. */
function primeFactors(v) {
    let rest = Math.abs(v);
    if (v % 1 || rest < 2 || rest >= 1e10) return showNum(v);

    const parts = [];
    for (let p = 2; p * p <= rest; p += p > 2 ? 2 : 1) {
        let power = 0;
        while (rest % p === 0) { rest /= p; power++; }
        if (power) parts.push(p + (power > 1 ? sup(power) : ''));
    }
    if (rest > 1) parts.push(String(rest));
    return (v < 0 ? '−' : '') + parts.join('×');
}

/* ── The other three apps ─────────────────────────────────────
   Statistics, Table and Math Box all put a table on the screen, so they
   share one. A grid names its columns, says how to fill them, and marks
   the cell the cursor is on; `write` is what makes it an editor rather
   than a result to read, and `back` is where its BACK key goes. */

const APP_TAG = { Statistics: 'STAT', Table: 'TABLE', 'Math Box': 'BOX' };

const stat = { pairs: false, freq: false, rows: [] };
const table = { f: '', g: '', type: 'f(x)/g(x)', from: 1, to: 5, step: 1, rows: [] };
const box = { kind: 'Dice Roll', count: 1, tries: 100, by: 'Sum', trials: [] };

function showGrid(head, body, more = {}) {
    Object.assign(calc, { grid: { head, body, r: 0, c: 0, ...more }, ask: null, entry: '', cur: 0 });
}

const cell = (tag, text) => {
    const node = document.createElement(tag);
    node.append(text);
    return node;
};

function drawGrid(g) {
    const head = g.head();
    const body = g.body();
    g.r = Math.min(g.r, Math.max(0, body.length - 1));
    g.c = Math.min(g.c, head.length - 1);

    /* A results list has no column names, and an empty heading strip
       would only sit over the first row. */
    el.calcHead.parentElement.hidden = head.every((name) => !name);
    el.calcHead.replaceChildren(...head.map((name) => cell('th', name)));
    el.calcBody.replaceChildren(...body.map((cells, r) => {
        const line = document.createElement('tr');
        line.append(...cells.map((text, c) => {
            const slot = cell('td', text);
            if (r === g.r && c === g.c) {
                slot.className = 'is-at';
                requestAnimationFrame(() => slot.scrollIntoView({ block: 'nearest' }));
            }
            return slot;
        }));
        return line;
    }));

    /* Underneath, the cell being typed into — or, on a table you only
       read, the one the cursor is on written out in full. */
    el.calcCell.replaceChildren(g.write
        ? draw(calc.entry, calc.cur)
        : document.createTextNode((body.length ? body[g.r]?.[g.c] : g.note) ?? ''));
}

function gridMove(dr, dc) {
    const g = calc.grid;
    if (!saveCell()) return;
    g.r = Math.max(0, Math.min(g.body().length - 1, g.r + dr));
    g.c = Math.max(0, Math.min(g.head().length - 1, g.c + dc));
}

/* What has been typed into a cell, put away. Nothing moves off a cell
   that will not parse. */
function saveCell() {
    const g = calc.grid;
    if (!g?.write || !calc.entry) return true;
    try { g.write(g.r, g.c, evaluate(calc.entry)); } catch { return false; }
    Object.assign(calc, { entry: '', cur: 0 });
    return true;
}

/* Some screens want a value before they can go on: the entry line takes
   the question, and EXE hands back what was typed. */
function ask(label, seed, done) {
    Object.assign(calc, { grid: null, ask: { label, done }, entry: seed, cur: seed.length });
}

/* A number written the way the keypad would have typed it, so what a
   question opens with can be read straight back. */
const typed = (n) => String(n).replace('-', '−');
const asNumber = (text, fallback) => { try { return evaluate(text); } catch { return fallback; } };

const APP_HOME = {
    Statistics: () => statEditor(),
    Table: () => showTable(),
    'Math Box': () => { calc.grid = null; openMenu('Math Box', MENUS.box(), CMD.home); },
};

function enterApp(app) {
    Object.assign(calc, { app, grid: null, ask: null });
    calc.menu.length = 0;
    if (app === 'Statistics') {
        openMenu('Statistics', [false, true].map((pairs) => ({
            label: pairs ? '2-Variable' : '1-Variable', run: () => startStats(pairs),
        })), statEditor);
    } else if (app !== 'Calculate') APP_HOME[app]();
}

/* ── Statistics ───────────────────────────────────────────────
   One table you type into, and the figures read off it. Paired data adds
   a y column; the Frequency setting adds a third. */

const statCols = () => ['x', ...(stat.pairs ? ['y'] : []), ...(stat.freq ? ['Freq'] : [])];

/* Which of a row's three numbers a column shows. */
const statAt = (c) => (c === 0 ? 0 : stat.pairs && c === 1 ? 1 : 2);

function startStats(pairs) {
    stat.pairs = pairs;
    stat.rows = [];
    statEditor();
}

function statEditor() {
    showGrid(statCols, () => [
        ...stat.rows.map((row) => statCols().map((name, c) => showNum(row[statAt(c)]))),
        statCols().map(() => ''), /* the empty line waiting at the end */
    ], {
        write(r, c, value) {
            while (stat.rows.length <= r) stat.rows.push([0, 0, 1]);
            stat.rows[r][statAt(c)] = value;
        },
        drop(r) { stat.rows.splice(r, 1); },
        back: CMD.home, /* the root of an app backs out to HOME */
        ok: () => openMenu('Statistics', [
            ...(stat.pairs
                ? [{ label: '2-Var Results', run: () => statResults(pairSums) },
                    { label: 'Reg Results', run: () => statResults(regression) }]
                : [{ label: '1-Var Results', run: () => statResults(oneSums) }]),
            /* The worksheet, with the figures above reachable by name. */
            { label: 'Statistics Calc', run: () => { calc.grid = null; } },
        ]),
    });
}

function statResults(figures) {
    showGrid(() => ['', ''], () => figures().map(([name, value]) => [name, showNum(value)]),
        { back: statEditor });
}

/* Everything the results screens are made of, in one pass over the data. */
function summary() {
    const spread = [];
    let n = 0, sx = 0, sxx = 0, sy = 0, syy = 0, sxy = 0;

    for (const [x, y, f] of stat.rows) {
        const times = stat.freq ? f : 1;
        n += times;
        sx += times * x;
        sxx += times * x * x;
        sy += times * y;
        syy += times * y * y;
        sxy += times * x * y;
        for (let k = 0; k < times; k++) spread.push(x);
    }

    spread.sort((a, b) => a - b);
    const mid = (list) => (list.length % 2
        ? list[(list.length - 1) / 2]
        : (list[list.length / 2 - 1] + list[list.length / 2]) / 2);
    /* Casio splits the data at the median and leaves it out of both halves. */
    const half = Math.floor(spread.length / 2);
    const mx = sx / n, my = sy / n;

    return {
        n, sx, sxx, sy, syy, sxy, mx, my,
        vx: sxx / n - mx * mx, vy: syy / n - my * my,
        s2x: (sxx - n * mx * mx) / (n - 1), s2y: (syy - n * my * my) / (n - 1),
        min: spread[0], max: spread[spread.length - 1],
        q1: mid(spread.slice(0, half)), med: mid(spread), q3: mid(spread.slice(spread.length - half)),
    };
}

const oneSums = () => {
    const s = summary();
    return [['n', s.n], ['x̄', s.mx], ['σ²x', s.vx], ['σx', Math.sqrt(s.vx)],
        ['s²x', s.s2x], ['sx', Math.sqrt(s.s2x)], ['min(x)', s.min], ['Q₁', s.q1],
        ['Med', s.med], ['Q₃', s.q3], ['max(x)', s.max], ['Σx', s.sx], ['Σx²', s.sxx]];
};

const pairSums = () => {
    const s = summary();
    return [['n', s.n], ['x̄', s.mx], ['σ²x', s.vx], ['σx', Math.sqrt(s.vx)],
        ['s²x', s.s2x], ['sx', Math.sqrt(s.s2x)], ['ȳ', s.my], ['σ²y', s.vy],
        ['σy', Math.sqrt(s.vy)], ['s²y', s.s2y], ['sy', Math.sqrt(s.s2y)],
        ['Σx', s.sx], ['Σx²', s.sxx], ['Σy', s.sy], ['Σy²', s.syy], ['Σxy', s.sxy]];
};

/* The least-squares line y = a + bx, and how well it fits. */
const regression = () => {
    const s = summary();
    const varX = s.sxx - s.n * s.mx * s.mx;
    const varY = s.syy - s.n * s.my * s.my;
    const covar = s.sxy - s.n * s.mx * s.my;
    return [['a', s.my - (covar / varX) * s.mx], ['b', covar / varX],
        ['r', covar / Math.sqrt(varX * varY)]];
};

/* The same figures, reachable by name from the worksheet. */
const STATS = {
    n: (s) => s.n, 'x̄': (s) => s.mx, 'ȳ': (s) => s.my,
    'σx': (s) => Math.sqrt(s.vx), 'σy': (s) => Math.sqrt(s.vy),
    sx: (s) => Math.sqrt(s.s2x), sy: (s) => Math.sqrt(s.s2y),
    'Σx²': (s) => s.sxx, 'Σy²': (s) => s.syy, 'Σxy': (s) => s.sxy,
    'Σx': (s) => s.sx, 'Σy': (s) => s.sy,
};

/* ── Table ────────────────────────────────────────────────────
   f(x) and g(x) over a range, worked out a step at a time. Each row sets
   x and reads the definitions back, so anything the worksheet can do a
   column can do. */

const tableCols = () => ['x',
    ...(table.type.includes('f') ? ['f(x)'] : []),
    ...(table.type.includes('g') ? ['g(x)'] : [])];

function showTable() {
    showGrid(tableCols, () => table.rows.map((row) => tableCols().map((name) => row[name])),
        { note: 'TOOLS ▸ Define f(x)', back: CMD.home });
}

function buildTable() {
    const span = (table.to - table.from) / table.step;
    table.rows = [];

    const held = prefs.vars.x;
    const value = (src) => { try { return src ? showNum(evaluate(src)) : ''; } catch { return 'ERROR'; } };
    for (let k = 0; isFinite(span) && k <= Math.min(45, Math.floor(span + 1e-9)); k++) {
        prefs.vars.x = table.from + k * table.step;
        table.rows.push({ x: showNum(prefs.vars.x), 'f(x)': value(table.f), 'g(x)': value(table.g) });
    }
    prefs.vars.x = held;
    showTable();
}

/* Start, End and Step, one after the other. A question opens on an
   empty line with what it is set to in its label, so typing replaces the
   value rather than running on the end of it — and EXE on an empty line
   keeps what was there. */
function askRange() {
    ask(`Start (${typed(table.from)})`, '', (from) => {
        table.from = asNumber(from, table.from);
        ask(`End (${typed(table.to)})`, '', (to) => {
            table.to = asNumber(to, table.to);
            ask(`Step (${typed(table.step)})`, '', (by) => {
                table.step = asNumber(by, table.step) || 1;
                buildTable();
            });
        });
    });
}

/* ── Math Box ─────────────────────────────────────────────────
   Dice and coins, thrown as many times as you ask and then counted. */

const FACES = { 'Dice Roll': 6, 'Coin Toss': 2 };

function startBox(kind) {
    box.kind = kind;
    box.trials = [];
    boxParams();
}

function boxParams() {
    const dice = box.kind === 'Dice Roll';
    const many = (k) => (dice ? (k > 1 ? 'Dice' : 'Die') : (k > 1 ? 'Coins' : 'Coin'));
    calc.grid = null;
    openMenu(box.kind, [
        {
            label: dice ? 'Dice' : 'Coins',
            tag: () => String(box.count),
            into: () => [1, 2, 3].map((k) => ({
                label: `${k} ${many(k)}`, run: () => { box.count = k; boxParams(); },
            })),
        },
        {
            label: 'Attempts',
            tag: () => String(box.tries),
            run: () => ask(`Attempts 1–250 (${box.tries})`, '', (text) => {
                box.tries = Math.max(1, Math.min(250, Math.round(asNumber(text, box.tries)) || 1));
                boxParams();
            }),
        },
        { label: 'Execute', run: runBox },
    ], APP_HOME['Math Box']);
}

function runBox() {
    box.trials = Array.from({ length: box.tries }, () => Array.from(
        { length: box.count }, () => 1 + Math.floor(Math.random() * FACES[box.kind])));
    boxResults();
}

function boxResults() {
    calc.grid = null;
    openMenu('Result Type', [
        { label: 'List', run: boxList },
        {
            label: 'Relative Freq',
            /* Two dice can be counted by their sum or by their difference. */
            run: () => (box.kind === 'Dice Roll' && box.count === 2
                ? openMenu('Relative Freq', ['Sum', 'Difference'].map((by) => ({
                    label: by, run: () => { box.by = by; boxTally(); },
                })))
                : boxTally()),
        },
    ], boxParams);
}

const heads = (roll) => roll.filter((v) => v === 1).length;
const total = (roll) => roll.reduce((sum, v) => sum + v, 0);
const faceOf = (v) => (box.kind === 'Dice Roll' ? String(v) : 'HT'[v - 1]);

/* What one throw counts as on the Relative Freq screen. */
function outcome(roll) {
    if (box.kind === 'Coin Toss') return heads(roll);
    if (box.count === 1) return roll[0];
    return box.by === 'Difference' && box.count === 2
        ? Math.abs(roll[0] - roll[1])
        : total(roll);
}

/* The columns beyond the faces themselves: what two or three of them add
   up to, and how far apart a pair fell. */
const boxExtras = (roll) => {
    if (box.kind === 'Coin Toss') return box.count > 1 ? [String(heads(roll))] : [];
    if (box.count === 2) return [String(total(roll)), String(Math.abs(roll[0] - roll[1]))];
    return box.count === 3 ? [String(total(roll))] : [];
};

function boxList() {
    const dice = box.kind === 'Dice Roll';
    const extras = dice
        ? [['Sum', 'Diff'], ['Sum']][box.count - 2] ?? []
        : (box.count > 1 ? ['Heads'] : []);

    showGrid(() => ['#', dice ? 'Dice' : 'Coins', ...extras],
        () => box.trials.map((roll, n) => [
            String(n + 1), roll.map(faceOf).join(' '), ...boxExtras(roll),
        ]),
        { back: boxResults });
}

function boxTally() {
    const dice = box.kind === 'Dice Roll';
    const [from, to] = dice
        ? (box.count === 1 ? [1, 6]
            : box.count === 2 ? (box.by === 'Difference' ? [0, 5] : [2, 12]) : [3, 18])
        : [0, box.count];
    /* One coin is counted as heads or tails rather than as a number. */
    const single = !dice && box.count === 1;
    const name = single ? 'Face' : dice ? (box.count === 1 ? 'Die' : box.by === 'Difference' && box.count === 2 ? 'Diff' : 'Sum') : 'Heads';

    /* Heads before tails, but everything else in its natural order. */
    const values = single ? [1, 0] : Array.from({ length: to - from + 1 }, (unused, k) => from + k);

    showGrid(() => [name, 'Freq', 'Rel Fr'], () => values.map((v) => {
        const hits = box.trials.filter((roll) => outcome(roll) === v).length;
        return [single ? 'HT'[1 - v] : String(v), String(hits), showNum(hits / box.trials.length)];
    }), { back: boxResults });
}

/* ── Notes ────────────────────────────────────────────────────
   A pad of sheets that outlives the session. They ride in the same
   preferences blob, written back a moment after you stop typing rather
   than on every keystroke.

   A sheet is named by its own first line, so a page has nothing to fill
   in but itself — start typing and the strip above says what it is. */

const pages = prefs.pages ?? [prefs.jotting ?? '']; /* one sheet, before there were many */
delete prefs.jotting;
/* The pad is handed straight back to the preferences, and worked in
   place from here on: a sheet carried over from the old single one is
   then safe on the next write, whether or not it has been opened. */
prefs.pages = pages;
let page = Math.min(Math.max(0, prefs.page ?? 0), pages.length - 1);
let jotted = null;

function pageName(text) {
    const first = text.split('\n').find((line) => line.trim()) ?? '';
    const name = first.trim().replace(/\s+/g, ' ');
    if (!name) return 'Untitled';
    return name.length > 30 ? `${name.slice(0, 29)}…` : name;
}

/* The strip, and the sheet under it. The sheet is only written into when
   the page changes, so typing never fights the caret. */
function drawPad(turned = true) {
    el.pageTitle.textContent = pageName(pages[page]);
    el.pageCount.textContent = `${page + 1}/${pages.length}`;
    if (turned) el.notesSheet.value = pages[page];
}

function keepPad() {
    prefs.page = page;
    clearTimeout(jotted);
    jotted = setTimeout(save, 600);
}

function turnPage(by) {
    page = (page + by + pages.length) % pages.length;
    drawPad();
    keepPad();
    el.notesSheet.focus();
}

function newPage() {
    pages.splice(++page, 0, '');
    drawPad();
    keepPad();
    el.notesSheet.focus();
}

/* Dropping the last sheet leaves a blank one: the pad is never empty. */
function dropPage() {
    pages.splice(page, 1);
    if (!pages.length) pages.push('');
    page = Math.min(page, pages.length - 1);
    drawPad();
    keepPad();
}

function showNotes(on) {
    reveal(el.notes, on, 350);
    el.toolNotes.classList.toggle('is-on', on);
    if (on) { raise(el.notes); el.notesSheet.focus(); }
}

el.notesSheet.addEventListener('input', () => {
    pages[page] = el.notesSheet.value;
    drawPad(false); /* the name follows the first line as it is typed */
    keepPad();
});

$('page-prev').addEventListener('click', () => turnPage(-1));
$('page-next').addEventListener('click', () => turnPage(1));
$('page-new').addEventListener('click', newPage);
$('page-drop').addEventListener('click', dropPage);

drawPad();

/* Esc closes the card you are working in, which is the one on top. */
function topCard() {
    return [...cards.keys()]
        .filter(showing)
        .sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
}

/* ── Background video ─────────────────────────────────────── */

/* Low detail holds the loop on one frame instead of dropping the room
   altogether: nothing is decoded from then on, and the blur behind every
   pane has something fixed to work from. A still needs a frame to be
   still on, so a cold video is started and stopped once it is running. */
function keepPlaying() {
    if (!prefs.still) {
        el.backdrop.play?.().catch(() => { /* retried on the next interaction */ });
        return;
    }
    if (el.backdrop.readyState >= 2) el.backdrop.pause();
    else el.backdrop.play?.().then(() => el.backdrop.pause()).catch(() => {});
}

/* ── Wiring ───────────────────────────────────────────────── */

document.querySelectorAll('.mode').forEach((btn) => {
    btn.addEventListener('click', () => pickMode(btn.dataset.mode));
});

el.start.addEventListener('click', startSession);
el.adjust.addEventListener('click', openSetup);
el.setupSave.addEventListener('click', saveSetup);
el.toggle.addEventListener('click', () => (state.running ? pause() : play()));
el.focus.addEventListener('click', enterZen);
el.zen.addEventListener('click', exitZen);
el.tools.addEventListener('click', () => showTools(!showing(el.toolpanel)));
el.restart.addEventListener('click', restart);

$('open-settings').addEventListener('click', () => openModal(el.settings));

el.toolMath.addEventListener('click', () => showCalc(!showing(el.calc)));
el.toolNotes.addEventListener('click', () => showNotes(!showing(el.notes)));
$('notes-close').addEventListener('click', () => showNotes(false));
$('calc-close').addEventListener('click', () => showCalc(false));
el.calcPad.addEventListener('click', (e) => {
    const key = e.target.closest('.key');
    if (key) tapKey(key.dataset);
});
$('end-session').addEventListener('click', endSession);

el.focusMinutes.addEventListener('input', () => { el.focusOut.textContent = el.focusMinutes.value; });
el.breakMinutes.addEventListener('input', () => { el.breakOut.textContent = el.breakMinutes.value; });

el.dim.addEventListener('input', () => {
    prefs.dim = Number(el.dim.value);
    el.dimOut.textContent = prefs.dim;
    document.documentElement.style.setProperty('--dim', prefs.dim / 100);
});
el.dim.addEventListener('change', save);

el.sound.addEventListener('change', () => { prefs.sound = el.sound.checked; syncSound(); save(); });
el.still.addEventListener('change', () => {
    prefs.still = el.still.checked;
    keepPlaying();
    save();
});
el.trail.addEventListener('change', () => {
    prefs.trail = el.trail.checked;
    document.body.classList.toggle('trail-on', prefs.trail && wantsTrail);
    save();
});

/* While the calculator is up it takes the keyboard, so the timer's own
   shortcuts cannot swallow half of a sum. */
const TYPED_CMD = {
    Enter: 'exe', '=': 'exe', Backspace: 'del', Delete: 'ac',
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Home: 'pgup', End: 'pgdn',
};
/* `/` types the fraction bar, which is what writing 1/2 means. */
const TYPED_INS = { '*': '×', '-': '−' };

function typedAtCalc(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return; /* leave the browser's own shortcuts alone */
    const cmd = TYPED_CMD[e.key];
    const ins = TYPED_INS[e.key] || (/^[0-9.+()^,%!/xyzABCDEF]$/.test(e.key) ? e.key : null);
    if (!cmd && !ins) return;
    e.preventDefault();
    tapKey({ cmd, ins });
}

document.addEventListener('keydown', (e) => {
    const open = document.querySelector('.modal:not([hidden])');
    const card = topCard();
    if (e.key === 'Escape') {
        if (open) closeModal(open);
        else if (card === el.calc && calc.menu.length) tapKey({ cmd: 'back' });
        else if (card) cards.get(card)(false);
        else if (showing(el.toolpanel)) showTools(false);
        else if (showing(el.zen)) exitZen();
        return;
    }
    if (e.target.closest?.('input, textarea')) return; /* typing belongs to the field */
    if (!open && showing(el.calc)) { typedAtCalc(e); return; }
    if (open || !el.home.hidden || !state.mode) return;
    if (e.code === 'Space') { e.preventDefault(); state.running ? pause() : play(); }
    if (e.key.toLowerCase() === 'f') (el.zen.hidden ? enterZen : exitZen)();
});

window.addEventListener('resize', () => {
    moveThumb();
    sizers.forEach((fit) => fit()); /* a shorter window can cap a scaled face */
    placers.forEach((place) => place());
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) { accrue(); save(); } else { keepPlaying(); render(); }
});

window.addEventListener('pagehide', () => { accrue(); save(); });

/* Mobile browsers stop the loop on their own terms; nudge it back. */
el.backdrop.addEventListener('pause', keepPlaying);
document.addEventListener('pointerdown', keepPlaying, { once: true });
keepPlaying();

setInterval(() => { if (state.mode) tick(); }, 250);
setInterval(() => { if (state.running) save(); }, 5000);

applyPrefs();
if (prefs.mode) pickMode(prefs.mode);
render();
