/* Tartarus — the Graph tool
   A Desmos in glass. A list of expressions on one side, the plane on the
   other, and one small parser between them: every row is read once into a
   function of a scope, then drawn either by sampling a column of pixels
   (`y = …`) or by tracing the line where the two sides balance (anything
   else) — so a parabola and a circle come from the same line of typing.

   It leans on timer.js for the things every card shares: `prefs` and
   `save`, `reveal` and `showing`, `raise`, `draggable`, and the `cards`
   map that Esc reads. Loaded after it, so all of them are in hand — and
   the three scripts share the one page scope, so nothing named here may
   repeat a name from either of the others. */

const graph = {
    card: $('graph'), list: $('graph-list'), add: $('graph-add'),
    plot: $('graph-plot'), plane: $('graph-plane'), at: $('graph-at'),
    tool: $('tool-graph'),
};

const paper = graph.plane.getContext('2d');

/* Six inks, bright enough to read as light over the backdrop. The timer's
   own green is left alone, so a curve is never mistaken for the clock.
   A row holds either one of these by number, or a colour of its own that
   was picked for it — so the six can be restyled without stranding the
   rows that took one. */
const INKS = ['#6fb2ff', '#ff7f74', '#8ad98f', '#c79bff', '#ffb15e', '#5fd8cf'];

const inkOf = (row) => (typeof row.color === 'string' ? row.color : INKS[row.color % INKS.length]);

/* ── Reading an expression ────────────────────────────────────
   Radians throughout, as a graph is drawn: the calculator's Angle Unit
   belongs to its own worksheet, not to this plane. */

const CONST = { pi: Math.PI, tau: 2 * Math.PI, e: Math.E };

const FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    csc: (x) => 1 / Math.sin(x), sec: (x) => 1 / Math.cos(x), cot: (x) => 1 / Math.tan(x),
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign,
    exp: Math.exp, ln: Math.log, log: Math.log10,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    min: Math.min, max: Math.max, mod: (a, b) => ((a % b) + b) % b,
};

/* The keypad's own signs are taken alongside the typed ones, so a sum
   copied out of the calculator still reads. */
const PLAIN = [[/[−–—]/g, '-'], [/[×·∙]/g, '*'], [/[÷∕]/g, '/'], [/√/g, 'sqrt'],
    [/π/g, 'pi'], [/²/g, '^2'], [/³/g, '^3']];

/* ── LaTeX ────────────────────────────────────────────────────
   Desmos keeps its expressions as LaTeX, so a line copied out of one
   should read here as it does there. Rather than teach the parser a
   second grammar, the backslashes are written out into the plain form
   first: `\frac{1}{2}` becomes `((1)/(2))`, braces become brackets, and
   a Greek name becomes the letter itself — which the reader below takes
   as a variable like any other.

   It runs on every line, LaTeX or not, so `x^{2}` works whether or not
   anything else in the line was written the long way. */

const GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
    eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
    rho: 'ρ', sigma: 'σ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    pi: 'pi', tau: 'tau', /* these two are numbers here, not letters */
};

/* Braces group without being written: `x^{2}` is x squared, not x to the
   bracket. They become a bracket of their own — ⟨ ⟩ — which the reader
   below treats exactly as ( ), and the setting leaves undrawn. */
const OPEN = '\u27e8';
const SHUT = '\u27e9';

/* What stands after a command: a braced group, or the one character that
   follows it — `\frac12` is a half, as LaTeX has it. */
function braced(src, at) {
    let i = at;
    while (/\s/.test(src[i])) i++;
    if (src[i] !== '{') return { body: src[i] ?? '', end: i + 1 };
    let depth = 0;
    for (let j = i; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && !--depth) return { body: src.slice(i + 1, j), end: j + 1 };
    }
    return { body: src.slice(i + 1), end: src.length };
}

function plainly(src) {
    let out = '';
    for (let i = 0; i < src.length;) {
        const c = src[i];
        if (c !== '\\') {
            out += c === '{' ? OPEN : c === '}' ? SHUT : c;
            i++;
            continue;
        }

        const word = /^[a-zA-Z]+/.exec(src.slice(i + 1))?.[0] ?? '';
        i += 1 + (word.length || 1);

        if (word === 'frac' || word === 'dfrac' || word === 'tfrac') {
            const top = braced(src, i);
            const bottom = braced(src, top.end);
            out += `${OPEN}${OPEN}${plainly(top.body)}${SHUT}/${OPEN}${plainly(bottom.body)}${SHUT}${SHUT}`;
            i = bottom.end;
        } else if (word === 'sqrt') {
            let root = null;
            let at = i;
            while (/\s/.test(src[at])) at++;
            if (src[at] === '[') {
                const shut = src.indexOf(']', at);
                root = src.slice(at + 1, shut);
                at = shut + 1;
            }
            const of = braced(src, at);
            out += root
                ? `${OPEN}${OPEN}${plainly(of.body)}${SHUT}^${OPEN}1/${OPEN}${plainly(root)}${SHUT}${SHUT}${SHUT}`
                : `sqrt(${plainly(of.body)})`;
            i = of.end;
        } else if (word === 'left' || word === 'right' || word === 'operatorname' || !word) {
            /* nothing of their own to say */
        } else if (word === 'cdot' || word === 'times') out += '*';
        else if (word === 'div') out += '/';
        else out += GREEK[word] ?? word; /* \sin is sin; \theta is θ */
    }
    return out;
}

function lex(src) {
    const line = PLAIN.reduce((out, [sign, plain]) => out.replace(sign, plain), src);
    const t = [];
    for (let i = 0; i < line.length;) {
        const rest = line.slice(i);
        const num = /^(\d+\.?\d*|\.\d+)/.exec(rest);
        /* Greek stands alone: θ is one letter, where `theta` would be
           five multiplied together. */
        const word = /^[\u03b1-\u03c9]/.exec(rest) ?? /^[A-Za-z]+/.exec(rest);
        if (/\s/.test(line[i])) i++;
        else if (num) { t.push({ k: 'num', v: Number(num[0]) }); i += num[0].length; }
        else if (word) { t.push({ k: 'name', v: word[0] }); i += word[0].length; }
        else { t.push({ k: line[i] }); i++; }
    }
    return t;
}

/* Source in, a function of a scope out. Everything is read once, so a
   curve costs one closure call per pixel rather than a fresh parse.

   Precedence climbs add → mul → unary → juxt → power → primary, so
   `-x^2` is −(x²), `2x` and `3(x+1)` multiply, and `sin 2x` takes the
   whole product the way it is written by hand. */
function compile(src) {
    const t = lex(src);
    let i = 0;
    let bars = 0; /* inside |…|, so a closing bar is not read as an opening one */

    const k = (v) => () => v;
    const eat = (kind) => (t[i]?.k === kind ? (i++, true) : false);
    const need = (kind) => { if (!eat(kind)) throw 'Syntax'; };

    /* Anything that can start a value, and so be multiplied by implicitly */
    const opens = () => {
        const tok = t[i];
        return !!tok && (tok.k === 'num' || tok.k === 'name' || tok.k === '(' || tok.k === OPEN
            || (tok.k === '|' && !bars));
    };

    const add = () => {
        let a = mul();
        for (;;) {
            if (eat('+')) { const b = mul(); const p = a; a = (w) => p(w) + b(w); }
            else if (eat('-')) { const b = mul(); const p = a; a = (w) => p(w) - b(w); }
            else return a;
        }
    };

    const mul = () => {
        let a = unary();
        for (;;) {
            if (eat('*')) { const b = unary(); const p = a; a = (w) => p(w) * b(w); }
            else if (eat('/')) { const b = unary(); const p = a; a = (w) => p(w) / b(w); }
            else return a;
        }
    };

    const unary = () => {
        if (eat('-')) { const a = unary(); return (w) => -a(w); }
        return juxt();
    };

    /* Written side by side is written multiplied. */
    const juxt = () => {
        let a = power();
        while (opens()) { const b = power(); const p = a; a = (w) => p(w) * b(w); }
        return a;
    };

    const power = () => {
        const a = primary();
        if (eat('^')) { const b = unary(); return (w) => a(w) ** b(w); }
        return a;
    };

    const primary = () => {
        const tok = t[i];
        if (!tok) throw 'Syntax';
        if (tok.k === 'num') { i++; return k(tok.v); }
        if (eat('(')) { const a = add(); need(')'); return a; }
        if (eat(OPEN)) { const a = add(); need(SHUT); return a; }
        if (eat('|')) { bars++; const a = add(); bars--; need('|'); return (w) => Math.abs(a(w)); }
        if (tok.k === 'name') { i++; return named(tok.v); }
        throw 'Syntax';
    };

    const args = () => {
        need('(');
        const list = [add()];
        while (eat(',')) list.push(add());
        need(')');
        return list;
    };

    /* A name is a function if it is followed by its brackets — or by a
       value, as `sin 2x` is written. A letter given a definition further
       down the list is looked up as it is called, so the order of the
       rows never matters; a letter with no definition simply multiplies,
       which is what `a(x+1)` means. Anything longer is a run of letters
       multiplied together: `xy` is x times y. */
    const named = (word) => {
        if (FN[word]) {
            const fn = FN[word];
            if (t[i]?.k === '(') { const list = args(); return (w) => fn(...list.map((a) => a(w))); }
            const a = juxt();
            return (w) => fn(a(w));
        }
        if (word in CONST) return k(CONST[word]);
        if (word.length === 1 && t[i]?.k === '(') {
            const list = args();
            return (w) => {
                const def = defs[word];
                return def ? def(list.map((a) => a(w)), w) : look(w, word) * list[0](w);
            };
        }
        const letters = [...word];
        return (w) => letters.reduce((out, name) => out * look(w, name), 1);
    };

    const value = add();
    if (i < t.length) throw 'Syntax'; /* a stray bracket or a dangling operator */
    return value;
}

/* A letter nobody has given a value leaves the curve blank rather than
   drawing a line through zero. */
const look = (where, name) => (name in where ? where[name] : NaN);

/* ── Setting a line ───────────────────────────────────────────
   What a row shows when it is not being typed in: the same line, set as
   maths. It walks the very tokens the reader walks, so what is drawn and
   what is plotted can never come apart — a fraction is stacked over its
   bar, a power is raised, a root is given its overline, and a name known
   to be a function stands upright while a letter leans.

   Nothing here may throw: a half-typed line still has to show something,
   so a sign it cannot place is simply printed where it stands. */

const SIGNS = { '-': '−', '*': '·', '+': '+', '=': '=', ',': ',', '<': '<', '>': '>' };

function typeset(src) {
    const t = lex(plainly(src));
    let i = 0;

    const eat = (k) => (t[i]?.k === k ? (i++, true) : false);
    const opens = () => {
        const tok = t[i];
        return !!tok && (tok.k === 'num' || tok.k === 'name' || tok.k === '('
            || tok.k === OPEN || tok.k === '|');
    };

    const box = (cls, ...kids) => {
        const node = document.createElement('span');
        if (cls) node.className = cls;
        node.append(...kids);
        return node;
    };

    const line = () => {
        const out = box('mth__row', term());
        for (;;) {
            const tok = t[i];
            if (!tok || !(tok.k in SIGNS) || tok.k === '*') return out;
            i++;
            out.append(box('mth__op', SIGNS[tok.k]), term());
        }
    };

    const term = () => {
        let out = juxt();
        for (;;) {
            if (eat('*')) out = box('mth__row', out, box('mth__op', '·'), juxt());
            else if (eat('/')) out = box('mth__frac', box('mth__top', out), box('mth__bot', juxt()));
            else return out;
        }
    };

    const juxt = () => {
        let out = power();
        while (opens()) out = box('mth__row', out, power());
        return out;
    };

    const power = () => {
        const a = atom();
        if (!eat('^')) return a;
        const up = document.createElement('sup');
        up.append(power()); /* the exponent of an exponent goes up again */
        return box('mth__row', a, up);
    };

    const named = (word) => {
        if (word === 'sqrt' && t[i]?.k === '(') {
            i++;
            const of = line();
            eat(')');
            return box('mth__root', box('mth__sign', '√'), box('mth__of', of));
        }
        if (FN[word]) {
            const name = box('mth__fn', word);
            if (t[i]?.k !== '(') return name; /* `sin x` — the value follows */
            i++;
            const of = line();
            eat(')');
            return box('mth__row', name, box('mth__grp', '(', of, ')'));
        }
        if (word === 'pi') return box('mth__var', 'π');
        if (word === 'tau') return box('mth__var', 'τ');
        if (word.length === 1) return box('mth__var', word);
        return box('mth__row', ...[...word].map((letter) => box('mth__var', letter)));
    };

    const atom = () => {
        const tok = t[i];
        if (!tok) return box('mth__var', '');
        if (tok.k === 'num') { i++; return box('mth__num', String(tok.v)); }
        if (tok.k === 'name') { i++; return named(tok.v); }
        if (eat('(')) { const of = line(); eat(')'); return box('mth__grp', '(', of, ')'); }
        if (eat(OPEN)) { const of = line(); eat(SHUT); return of; } /* grouped, not bracketed */
        if (eat('|')) { const of = line(); eat('|'); return box('mth__grp', '|', of, '|'); }
        i++;
        /* A grouping bracket left hanging by a half-typed line is drawn as
           nothing, the way a closed one would be. */
        if (tok.k === OPEN || tok.k === SHUT) return box('');
        return box('mth__op', SIGNS[tok.k] ?? tok.k); /* a sign with nothing to bind */
    };

    const out = document.createDocumentFragment();
    while (i < t.length) {
        const was = i;
        out.append(line());
        if (i === was) i++; /* never stall on something unreadable */
    }
    return out;
}

/* ── What a row means ─────────────────────────────────────────
   The same line can be a curve, a definition or a number with a slider;
   which one it is falls out of what stands either side of the `=`. */

/* The first `sign` that is not inside brackets, or −1. */
function outside(src, sign) {
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
        if (src[i] === '(' || src[i] === OPEN) depth++;
        else if (src[i] === ')' || src[i] === SHUT) depth--;
        else if (src[i] === sign && !depth) return i;
    }
    return -1;
}

/* A letter, Greek or plain: θ names a value or takes one as readily as
   a does, now that it arrives as a letter of its own. */
const LETTER = '[a-zA-Z\u03b1-\u03c9]';
const DEF = new RegExp(`^(${LETTER})\\(\\s*(${LETTER})\\s*(?:,\\s*(${LETTER})\\s*)?\\)$`);
const ALONE = new RegExp(`^${LETTER}$`);

function sense(text) {
    const src = plainly(text).trim();
    if (!src) return null;

    const cut = outside(src, '=');
    if (cut < 0) {
        const pt = point(src);
        if (pt) return { kind: 'point', x: compile(pt[0]), y: compile(pt[1]) };
        return { kind: 'y', of: compile(src) };
    }

    const lhs = src.slice(0, cut).trim();
    const rhs = src.slice(cut + 1).trim();
    if (lhs === 'y') return { kind: 'y', of: compile(rhs) };
    if (lhs === 'x') return { kind: 'x', of: compile(rhs) };

    const def = DEF.exec(lhs);
    if (def) return { kind: 'def', name: def[1], takes: [def[2], def[3]].filter(Boolean), of: compile(rhs) };
    if (ALONE.test(lhs)) return { kind: 'dial', name: lhs, of: compile(rhs) };

    /* Everything else is the line where the two sides balance. */
    const left = compile(lhs);
    const right = compile(rhs);
    return { kind: 'level', of: (w) => left(w) - right(w) };
}

/* `(1, 2)` — a pair, split on the comma that is not inside anything. */
function point(src) {
    if (!src.startsWith('(') || !src.endsWith(')')) return null;
    const inner = src.slice(1, -1);
    const cut = outside(inner, ',');
    return cut < 0 ? null : [inner.slice(0, cut), inner.slice(cut + 1)];
}

/* ── The rows ─────────────────────────────────────────────────
   What was typed, the ink it is drawn in, and whether the line is up.
   Everything else about a row is worked out again on every reading. */

const rows = (prefs.plot?.rows ?? [{ text: '', color: 0, on: true }])
    .map((row) => ({ text: '', color: 0, on: true, ...row }));

const scope = {}; /* the letters every row is read against */
const defs = {};  /* and the definitions it can call */
let curves = [];
let deep = 0;     /* how far inside a definition we are, so one that names
                     itself gives up rather than the tab */

function analyse() {
    curves = [];
    Object.keys(scope).forEach((name) => delete scope[name]);
    Object.keys(defs).forEach((name) => delete defs[name]);

    rows.forEach((row) => {
        row.bad = false;
        row.dial = null;
        let it = null;
        try { it = sense(row.text); } catch { row.bad = true; return; }
        if (!it) return;

        if (it.kind === 'def') {
            defs[it.name] = (given, where) => {
                if (deep > 16) return NaN;
                const inner = Object.create(where); /* the caller's letters, plus its own */
                it.takes.forEach((name, n) => { inner[name] = given[n] ?? NaN; });
                deep++;
                const out = it.of(inner);
                deep--;
                return out;
            };
            return;
        }

        if (it.kind === 'dial') {
            /* The row owns its number once it has one: the slider writes
               it back into the line, so what is typed and what is drawn
               are never two different things. */
            row.value = row.value ?? it.of(scope);
            if (!Number.isFinite(row.value)) { row.bad = true; return; }
            row.dial = it.name;
            scope[it.name] = row.value;
            return;
        }

        curves.push({ ...it, ink: inkOf(row), on: row.on });
    });

    mark();
    queue();
    keep();
}

/* ── The list ─────────────────────────────────────────────────
   Built when a row is added or dropped; a row being typed in is left
   alone, so the caret stays where it was put. */

function build() {
    graph.list.replaceChildren(...rows.map((row) => {
        const line = document.createElement('li');
        line.className = 'expr';
        line.style.setProperty('--c', inkOf(row));

        const ink = document.createElement('button');
        ink.className = 'expr__ink';
        ink.type = 'button';
        ink.title = 'Ink';
        ink.setAttribute('aria-label', "This line's ink");
        ink.addEventListener('click', () => openTray(row, ink));

        const field = document.createElement('input');
        field.className = 'expr__line';
        field.value = row.text;
        field.spellcheck = false;
        field.placeholder = 'y = x²';
        field.setAttribute('aria-label', 'Expression');

        /* Typed as text, read as maths: the line being worked in is the
           one that shows its writing, and every other one shows what that
           writing means. */
        const math = document.createElement('div');
        math.className = 'expr__math';
        math.tabIndex = 0;
        math.setAttribute('aria-hidden', 'true');

        const setLine = () => {
            math.replaceChildren(typeset(row.text));
            line.classList.toggle('is-math', !!row.text.trim());
        };

        const typing = (on) => {
            line.classList.toggle('is-typing', on);
            if (on) field.focus();
            else setLine();
        };

        math.addEventListener('pointerdown', (e) => { e.preventDefault(); typing(true); });
        math.addEventListener('focus', () => typing(true));
        /* The caret is what says a row is being worked in — however it got
           there. Without this, the first letter typed into an empty row set
           its writing, and the setting took the field out from under it. */
        field.addEventListener('focus', () => line.classList.add('is-typing'));
        field.addEventListener('blur', () => typing(false));

        field.addEventListener('input', () => {
            row.text = field.value;
            row.value = null; /* a number typed over wins back its slider */
            setLine(); /* kept in step even while it is out of sight */
            analyse();
        });
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addRow(rows.indexOf(row) + 1); }
        });

        const drop = document.createElement('button');
        drop.className = 'expr__drop';
        drop.type = 'button';
        drop.setAttribute('aria-label', 'Delete this line');
        drop.innerHTML = '<svg class="icon"><use href="#i-close"></use></svg>';
        drop.addEventListener('click', () => dropRow(row));

        const dial = document.createElement('input');
        dial.type = 'range';
        dial.className = 'slider expr__dial';
        dial.step = 'any';
        dial.hidden = true;
        dial.setAttribute('aria-label', 'Value');
        dial.addEventListener('input', () => {
            row.value = Number(dial.value);
            row.text = `${row.dial} = ${Number(row.value.toFixed(4))}`;
            field.value = row.text;
            setLine();
            analyse();
        });

        line.append(ink, field, math, drop, dial);
        row.node = line;
        row.field = field;
        row.knob = dial;
        row.setLine = setLine;
        setLine();
        return line;
    }));
    analyse();
}

/* ── Choosing an ink ──────────────────────────────────────────
   The dot beside a row opens the six, a colour of the row's own, and the
   switch that takes the line off the plane — everything about how a row
   is drawn, in the one place the row already points at. */

let tray = null;

function shutTray() {
    tray?.remove();
    tray = null;
}

function openTray(row, dot) {
    const open = tray?.dataset.row === String(rows.indexOf(row));
    shutTray();
    if (open) return; /* the same dot again closes it */

    tray = document.createElement('div');
    tray.className = 'inks glass';
    tray.dataset.row = String(rows.indexOf(row));

    INKS.forEach((ink, n) => {
        const one = document.createElement('button');
        one.type = 'button';
        one.className = `inks__one${row.color === n ? ' is-at' : ''}`;
        one.style.setProperty('--c', ink);
        one.setAttribute('aria-label', `Ink ${n + 1}`);
        one.addEventListener('click', () => { row.color = n; shutTray(); build(); });
        tray.append(one);
    });

    /* Any other colour, from whatever the browser offers. The row keeps
       it as itself rather than as a place in the six. */
    const own = document.createElement('label');
    own.className = `inks__own${typeof row.color === 'string' ? ' is-at' : ''}`;
    own.title = 'Another colour';
    const pick = document.createElement('input');
    pick.type = 'color';
    pick.value = inkOf(row);
    pick.setAttribute('aria-label', 'Another colour');
    pick.addEventListener('input', () => {
        row.color = pick.value;
        row.node.style.setProperty('--c', pick.value);
        analyse();
    });
    pick.addEventListener('change', () => { shutTray(); build(); });
    own.append(pick);
    tray.append(own);

    const off = document.createElement('button');
    off.type = 'button';
    off.className = 'inks__off';
    off.append(row.on ? 'Hide this line' : 'Show this line');
    off.addEventListener('click', () => { row.on = !row.on; shutTray(); analyse(); });
    tray.append(off);

    graph.card.append(tray);
    sit(tray, dot);
}

/* Under the dot it belongs to, and inside the card whatever the room. */
function sit(box, dot) {
    const card = graph.card.getBoundingClientRect();
    const at = dot.getBoundingClientRect();
    const size = box.getBoundingClientRect();
    const left = Math.min(at.left - card.left, card.width - size.width - 6);
    const top = at.bottom - card.top + 5;
    box.style.left = `${Math.max(6, left)}px`;
    box.style.top = `${Math.min(top, card.height - size.height - 6)}px`;
}

/* It shuts on the next thing done anywhere else, and on Esc before the
   card itself does. */
document.addEventListener('pointerdown', (e) => {
    if (tray && !e.target.closest('.inks, .expr__ink')) shutTray();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tray) { shutTray(); e.stopPropagation(); }
}, true);

/* The flags a row wears once it has been read: its ink, whether it took,
   and the slider a plain letter earns. */
function mark() {
    rows.forEach((row) => {
        row.node.classList.toggle('is-off', !row.on);
        row.node.classList.toggle('is-bad', !!row.bad);
        row.node.style.setProperty('--c', inkOf(row));
        row.knob.hidden = !row.dial;
        if (!row.dial) return;
        /* Ten either way, unless the number typed asks for more room. */
        row.knob.min = Math.min(-10, row.value);
        row.knob.max = Math.max(10, row.value);
        row.knob.value = row.value;
    });
}

function addRow(at = rows.length) {
    rows.splice(at, 0, { text: '', color: next(), on: true });
    build();
    rows[at].field.focus();
}

function dropRow(row) {
    rows.splice(rows.indexOf(row), 1);
    if (!rows.length) rows.push({ text: '', color: next(), on: true });
    build();
}

/* The next ink nobody is using, or the next one round. A row wearing a
   colour of its own is not holding one of the six. */
function next() {
    const taken = rows.map((row) => (typeof row.color === 'number' ? row.color % INKS.length : -1));
    const free = INKS.findIndex((ink, n) => !taken.includes(n));
    return free < 0 ? rows.length % INKS.length : free;
}

/* ── The plane ────────────────────────────────────────────────
   A centre and a scale, rather than four edges: zooming about a point is
   then the same sum whether it came from a wheel, two fingers or a key. */

const view = { cx: 0, cy: 0, ppu: 0, ...(prefs.plot?.view ?? {}) };
let wide = 0;
let tall = 0;
let type = 11; /* the label size, in step with the fluid root */

const px = (x) => (x - view.cx) * view.ppu + wide / 2;
const py = (y) => tall / 2 - (y - view.cy) * view.ppu;
const ux = (p) => view.cx + (p - wide / 2) / view.ppu;
const uy = (p) => view.cy - (p - tall / 2) / view.ppu;

function measure() {
    const box = graph.plot.getBoundingClientRect();
    if (!box.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    wide = Math.round(box.width);
    tall = Math.round(box.height);
    graph.plane.width = wide * dpr;
    graph.plane.height = tall * dpr;
    paper.setTransform(dpr, 0, 0, dpr, 0, 0);
    type = Math.round(0.62 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (!view.ppu) home();
}

function home() {
    view.cx = 0;
    view.cy = 0;
    view.ppu = Math.max(8, Math.min(wide, tall) / 13); /* about ±6 either way */
}

/* Zoom so the point under the pointer stays under it. */
function zoomAt(x, y, by) {
    const [wasX, wasY] = [ux(x), uy(y)];
    view.ppu = Math.min(1e7, Math.max(1e-5, view.ppu * by));
    view.cx += wasX - ux(x);
    view.cy += wasY - uy(y);
}

/* ── Drawing ──────────────────────────────────────────────── */

let queued = false;

function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; redraw(); });
}

function redraw() {
    if (!wide || graph.card.hidden) return;
    paper.clearRect(0, 0, wide, tall);
    grid();
    curves.forEach((curve) => curve.on && ink(curve));
}

/* A gridline about every 74 pixels, landing on 1, 2 or 5 times a power of
   ten — the steps a hand-drawn axis uses. */
function stepFor(pixels) {
    const raw = pixels / view.ppu;
    const size = 10 ** Math.floor(Math.log10(raw));
    const n = raw / size;
    return (n > 5 ? 10 : n > 2 ? 5 : n > 1 ? 2 : 1) * size;
}

function grid() {
    const major = stepFor(74);

    const lines = (step, tone) => {
        paper.beginPath();
        paper.strokeStyle = tone;
        paper.lineWidth = 1;
        for (let x = Math.ceil(ux(0) / step) * step; x <= ux(wide); x += step) {
            const at = Math.round(px(x)) + 0.5;
            paper.moveTo(at, 0);
            paper.lineTo(at, tall);
        }
        for (let y = Math.ceil(uy(tall) / step) * step; y <= uy(0); y += step) {
            const at = Math.round(py(y)) + 0.5;
            paper.moveTo(0, at);
            paper.lineTo(wide, at);
        }
        paper.stroke();
    };

    lines(major / 5, 'rgba(255, 255, 255, 0.05)');
    lines(major, 'rgba(255, 255, 255, 0.12)');
    axes(major);
}

/* The axes hold to the edge once the origin has been dragged past it, so
   the numbers stay on the plane rather than off the side of it. */
function axes(step) {
    const ax = Math.round(Math.min(Math.max(px(0), 0), wide - 1)) + 0.5;
    const ay = Math.round(Math.min(Math.max(py(0), 0), tall - 1)) + 0.5;

    paper.beginPath();
    paper.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    paper.lineWidth = 1;
    paper.moveTo(0, ay);
    paper.lineTo(wide, ay);
    paper.moveTo(ax, 0);
    paper.lineTo(ax, tall);
    paper.stroke();

    paper.fillStyle = 'rgba(255, 255, 255, 0.42)';
    paper.font = `${type}px ${getComputedStyle(graph.at).fontFamily}`;
    paper.textAlign = 'center';
    paper.textBaseline = 'top';
    const zero = (v) => Math.abs(v) < step * 1e-9; /* the origin is written once, below */
    for (let x = Math.ceil(ux(0) / step) * step; x <= ux(wide); x += step) {
        if (!zero(x)) paper.fillText(label(x), px(x), Math.min(ay + 4, tall - type - 3));
    }

    paper.textAlign = 'right';
    paper.textBaseline = 'middle';
    for (let y = Math.ceil(uy(tall) / step) * step; y <= uy(0); y += step) {
        if (!zero(y)) paper.fillText(label(y), Math.max(ax - 5, type * 1.6), py(y));
    }

    /* And only while the origin is on the plane: against a held axis it
       would name a corner it does not sit in. */
    if (px(0) > 0 && px(0) < wide && py(0) > 0 && py(0) < tall) {
        paper.textBaseline = 'top';
        paper.fillText('0', ax - 4, ay + 3);
    }
}

/* Twelve figures is enough to keep 0.3 from printing as 0.30000000000000004,
   and the ends of the scale go to powers of ten. */
function label(v) {
    const size = Math.abs(v);
    if (size >= 1e5 || (size && size < 1e-4)) return v.toExponential(0).replace('e', 'e');
    return String(Number(v.toPrecision(12))).replace('-', '−');
}

function ink(curve) {
    paper.save();
    paper.strokeStyle = curve.ink;
    paper.fillStyle = curve.ink;
    paper.lineWidth = Math.max(1.6, type / 6);
    paper.lineJoin = 'round';
    paper.lineCap = 'round';
    /* The one flourish: a line lit rather than painted, like everything
       else on this glass. */
    paper.shadowColor = curve.ink;
    paper.shadowBlur = type / 2;

    if (curve.kind === 'point') dot(curve);
    else if (curve.kind === 'level') level(curve);
    else sampled(curve);

    paper.restore();
}

/* `y = f(x)` takes one value to the pixel column, and `x = f(y)` one to
   the row — then goes back over every step and cuts it in half wherever
   the curve strays from the straight line drawn across it. A peak that
   falls between two columns is found rather than flattened, so a wave
   zoomed out to a few pixels a period keeps an even crest instead of a
   ragged one. A quarter of a pixel is near enough to call straight, and
   six cuts is as far as a step is taken — sixty-four extra readings
   where the curve is bending hard, and none at all where it is not. */
const CLOSE = 0.25;
const CUTS = 6;

function sampled(curve) {
    const across = curve.kind === 'y';
    const span = across ? wide : tall;
    const free = across ? 'x' : 'y';
    const over = (across ? tall : wide) * 2; /* a step longer than this is a pole */
    const where = Object.create(scope);

    /* The plane point at a pixel along the run, or nothing where the
       curve has no value there. Anything wildly off the plane is pinned:
       it is only ever drawn as a direction to leave in. */
    const spot = (p) => {
        where[free] = across ? ux(p) : uy(p);
        const out = curve.of(where);
        if (!Number.isFinite(out)) return null;
        const v = Math.min(1e6, Math.max(-1e6, across ? py(out) : px(out)));
        return across ? [p, v] : [v, p];
    };

    /* How far the middle reading strays from the line between its ends */
    const stray = (a, m, b) => Math.abs(m[0] - (a[0] + b[0]) / 2) + Math.abs(m[1] - (a[1] + b[1]) / 2);

    let last = null;
    const put = (at) => {
        if (last) paper.lineTo(at[0], at[1]);
        else paper.moveTo(at[0], at[1]);
        last = at;
    };

    const walk = (pa, a, pb, b, left) => {
        const jump = across ? Math.abs(b[1] - a[1]) : Math.abs(b[0] - a[0]);
        if (jump > over) { last = null; put(b); return; } /* a pole: a gap, not a stroke */
        if (!left) { put(b); return; }

        const pm = (pa + pb) / 2;
        const m = spot(pm);
        if (!m) { last = null; put(b); return; } /* the curve stops inside the step */
        if (stray(a, m, b) < CLOSE) { put(b); return; }

        walk(pa, a, pm, m, left - 1);
        walk(pm, m, pb, b, left - 1);
    };

    paper.beginPath();
    let prev = null;
    for (let p = 0; p <= span; p++) {
        const now = spot(p);
        if (!now) { last = null; prev = null; continue; }
        if (!prev) put(now);
        else walk(p - 1, prev, p, now, CUTS);
        prev = now;
    }
    paper.stroke();
}

/* Anything not written as `y = …` is drawn as the line where the two
   sides balance: the plane is walked as a coarse grid, and the crossing
   traced through each square it runs into. The whole contour is one path,
   so the glow is laid down once rather than per segment.

   The squares are small enough that a circle comes out round: a step of
   the line is at most a square's diagonal, so it is the square that
   decides whether the ring reads as drawn or as a polygon. */
const CELL = 4;
const CORNERS = [[0, 1], [1, 2], [2, 3], [3, 0]];
const CROSSES = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
    [[2, 3]], [[2, 0]], [[0, 1], [2, 3]], [[2, 1]], [[1, 3]], [[1, 0]], [[0, 3]], []];

function level(curve) {
    const cols = Math.ceil(wide / CELL);
    const downs = Math.ceil(tall / CELL);
    const where = Object.create(scope);
    const height = new Float64Array((cols + 1) * (downs + 1));

    for (let j = 0; j <= downs; j++) {
        where.y = uy(j * CELL);
        for (let i = 0; i <= cols; i++) {
            where.x = ux(i * CELL);
            height[j * (cols + 1) + i] = curve.of(where);
        }
    }

    paper.beginPath();
    for (let j = 0; j < downs; j++) {
        for (let i = 0; i < cols; i++) {
            const corner = j * (cols + 1) + i;
            const v = [height[corner], height[corner + 1],
                height[corner + cols + 2], height[corner + cols + 1]];
            if (v.some((n) => !Number.isFinite(n))) continue;

            const code = (v[0] > 0) | ((v[1] > 0) << 1) | ((v[2] > 0) << 2) | ((v[3] > 0) << 3);
            if (!CROSSES[code].length) continue;

            const x = [i * CELL, (i + 1) * CELL];
            const y = [j * CELL, (j + 1) * CELL];
            const spot = [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]];
            const cut = (edge) => {
                const [a, b] = CORNERS[edge];
                const t = v[a] / (v[a] - v[b]);
                return [spot[a][0] + (spot[b][0] - spot[a][0]) * t,
                    spot[a][1] + (spot[b][1] - spot[a][1]) * t];
            };

            CROSSES[code].forEach(([from, to]) => {
                paper.moveTo(...cut(from));
                paper.lineTo(...cut(to));
            });
        }
    }
    paper.stroke();
}

function dot(curve) {
    const where = Object.create(scope);
    const x = curve.x(where);
    const y = curve.y(where);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    paper.beginPath();
    paper.arc(px(x), py(y), Math.max(3, type / 2.6), 0, 2 * Math.PI);
    paper.fill();
}

/* ── Moving about ─────────────────────────────────────────────
   One finger drags the plane, two pinch it, the wheel zooms about the
   pointer. The card itself is picked up by its head, so none of this
   takes the whole card with it. */

const touches = new Map();

function span() {
    const [a, b] = [...touches.values()];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

graph.plane.addEventListener('pointerdown', (e) => {
    /* The finger is written down before the capture is asked for: a
       refused capture must not be what loses the gesture. */
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    graph.plane.setPointerCapture(e.pointerId);
});

graph.plane.addEventListener('pointermove', (e) => {
    const box = graph.plane.getBoundingClientRect();
    say(e.clientX - box.left, e.clientY - box.top);
    if (!touches.has(e.pointerId)) return;

    if (touches.size > 1) {
        const was = span();
        touches.set(e.pointerId, [e.clientX, e.clientY]);
        const now = span();
        view.cx -= (now.x - was.x) / view.ppu;
        view.cy += (now.y - was.y) / view.ppu;
        if (was.d > 0) zoomAt(now.x - box.left, now.y - box.top, now.d / was.d);
    } else {
        const [x, y] = touches.get(e.pointerId);
        touches.set(e.pointerId, [e.clientX, e.clientY]);
        view.cx -= (e.clientX - x) / view.ppu;
        view.cy += (e.clientY - y) / view.ppu;
    }
    queue();
    keep();
});

const lift = (e) => touches.delete(e.pointerId);
graph.plane.addEventListener('pointerup', lift);
graph.plane.addEventListener('pointercancel', lift);
graph.plane.addEventListener('pointerleave', () => { graph.at.textContent = ''; });

graph.plane.addEventListener('wheel', (e) => {
    e.preventDefault();
    const box = graph.plane.getBoundingClientRect();
    zoomAt(e.clientX - box.left, e.clientY - box.top, Math.exp(-e.deltaY * 0.002));
    queue();
    keep();
}, { passive: false });

/* Where the pointer is, in the plane's own numbers. */
function say(x, y) {
    const step = stepFor(74) / 50; /* about the width of a pixel, rounded kindly */
    const near = (v) => label(Math.round(v / step) * step);
    graph.at.textContent = `(${near(ux(x))}, ${near(uy(y))})`;
}

/* ── Keeping it ───────────────────────────────────────────────
   The rows and the view ride in the same preferences blob as the notes
   sheet, written back a moment after the last change rather than on
   every frame of a drag. */

let kept = null;

function keep() {
    clearTimeout(kept);
    kept = setTimeout(() => {
        prefs.plot = {
            rows: rows.map(({ text, color, on }) => ({ text, color, on })),
            view: { ...view },
        };
        save();
    }, 600);
}

/* ── Wiring ───────────────────────────────────────────────── */

function showGraph(on) {
    reveal(graph.card, on, 350);
    graph.tool.classList.toggle('is-on', on);
    if (!on) return;
    raise(graph.card);
    measure();
    redraw();
}

draggable(graph.card, 'graph', '.card__head');
resizable(graph.card, 'graph');
cards.set(graph.card, showGraph);

graph.tool.addEventListener('click', () => showGraph(!showing(graph.card)));
$('graph-close').addEventListener('click', () => showGraph(false));
graph.add.addEventListener('click', () => addRow());

$('graph-in').addEventListener('click', () => { zoomAt(wide / 2, tall / 2, 1.5); queue(); keep(); });
$('graph-out').addEventListener('click', () => { zoomAt(wide / 2, tall / 2, 1 / 1.5); queue(); keep(); });
$('graph-home').addEventListener('click', () => { home(); queue(); keep(); });

/* The card is laid out the moment it is shown and every time it is
   resized; the plane is redrawn to whatever room it lands in. */
new ResizeObserver(() => { measure(); redraw(); }).observe(graph.plot);

build();
