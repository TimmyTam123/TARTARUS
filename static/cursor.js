/* Tartarus — cursor trail
   A glass bead that leaves a tapering ribbon and pushes ripples ahead of
   itself. Only runs where there is a real pointer to replace, and only
   while the trail is switched on in Settings. */

const canvas = document.getElementById('cursor-trail');
const ctx = canvas.getContext('2d');

const TRAIL_MS = 180;      /* how long a ribbon segment survives */
const TRAIL_PX = 320;      /* and how far behind the cursor it reaches */
const RIBBON_W = 12;

const trail = [];
const ripples = [];

let mouseX = 0, mouseY = 0, lastX = 0, lastY = 0;
let dirX = 0, dirY = 0, travelled = 0;
let radius = 4, targetRadius = 4;
let lastRippleAt = 0;
let idle = false;

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resize();
window.addEventListener('resize', resize);

function addRipple(x, y, { start, max, alpha, speed, fade, stationary }) {
    ripples.push({
        x, y, radius: start, max, alpha, speed, fade, stationary,
        rotation: stationary ? 0 : Math.atan2(dirY, dirX),
        rings: stationary ? 4 : 3,
    });
}

/* ── Input ────────────────────────────────────────────────── */

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 2) return;

    travelled += distance;
    trail.push({ x: lastX || mouseX, y: lastY || mouseY, at: Date.now(), from: travelled });
    dirX = dx / distance;
    dirY = dy / distance;
    lastX = mouseX;
    lastY = mouseY;
    idle = false;

    const now = Date.now();
    if (distance > 8 && now - lastRippleAt > 24) {
        lastRippleAt = now;
        const offset = radius + 6;
        addRipple(mouseX + dirX * offset, mouseY + dirY * offset,
            { start: 20, max: 72, alpha: 0.24, speed: 2, fade: 0.032, stationary: false });
    }
});

/* Grow the bead over anything clickable. */
document.addEventListener('mouseover', (e) => {
    targetRadius = e.target.closest?.('button, a, input, label') ? 9 : 4;
});

function press(e, size) {
    const stationary = Math.hypot(mouseX - lastX, mouseY - lastY) < 8;
    const offset = stationary ? 0 : radius + 6;
    addRipple(e.clientX + dirX * offset, e.clientY + dirY * offset, { ...size, stationary });
    idle = false;
}

document.addEventListener('mousedown', (e) => press(e, { start: 24, max: 118, alpha: 0.36, speed: 2.4, fade: 0.045 }));
document.addEventListener('mouseup', (e) => press(e, { start: 17, max: 72, alpha: 0.26, speed: 1.8, fade: 0.038 }));

/* ── Curve sampling ───────────────────────────────────────── */

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
}

function sample(points) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
        const previous = points[Math.max(0, i - 1)];
        const current = points[i];
        const next = points[i + 1];
        const following = points[Math.min(points.length - 1, i + 2)];
        const steps = Math.min(24, Math.max(5, Math.floor(Math.hypot(next.x - current.x, next.y - current.y) / 3)));

        for (let step = 0; step < steps; step++) {
            const point = catmullRom(previous, current, next, following, step / steps);
            out.push({ x: point.x, y: point.y, at: current.at });
        }
    }
    if (points.length) out.push(points[points.length - 1]);
    return out;
}

/* ── Drawing ──────────────────────────────────────────────── */

function drawRibbon(now) {
    const points = sample(trail);
    if (points.length < 2) return;

    const offset = radius + 4;
    const top = [];
    const bottom = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const next = points[i + 1] || { x: mouseX, y: mouseY };
        let nx = next.x - point.x;
        let ny = next.y - point.y;
        const length = Math.hypot(nx, ny) || 1;
        nx /= length;
        ny /= length;

        const age = 1 - Math.min(1, (now - point.at) / TRAIL_MS);
        const taper = Math.pow(i / Math.max(1, points.length - 1), 2.2);
        const half = (RIBBON_W * (0.75 + age * 0.25) * taper + 0.5) / 2;
        const x = point.x - dirX * offset;
        const y = point.y - dirY * offset;

        top.push({ x: x - ny * half, y: y + nx * half });
        bottom.push({ x: x + ny * half, y: y - nx * half });
    }

    const gradient = ctx.createLinearGradient(top[0].x, top[0].y, mouseX, mouseY);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.18)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.14)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.04)');

    const edge = (points) => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach((p) => ctx.lineTo(p.x, p.y));
    };

    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    top.forEach((p) => ctx.lineTo(p.x, p.y));
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i].x, bottom[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.3;
    edge(top);
    ctx.stroke();
    edge(bottom);
    ctx.stroke();
}

function drawRipple(ripple) {
    const progress = ripple.radius / ripple.max;
    const alpha = ripple.alpha * (1 - progress);
    const rx = ripple.radius * (ripple.stationary ? 1.15 : 1.4);
    const ry = ripple.radius * (ripple.stationary ? 1.15 : 0.64);

    ctx.save();
    ctx.translate(ripple.x, ripple.y);
    ctx.rotate(ripple.rotation);

    const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    fill.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.16})`);
    fill.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.08})`);
    fill.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < ripple.rings; ring++) {
        const scale = 0.65 + ring * 0.12 - progress * 0.08;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.18 * (1 - ring / (ripple.rings + 1))})`;
        ctx.lineWidth = 1.2 - ring * 0.18;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * scale, ry * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(rx * 0.6, -ry * 0.35, rx * 0.35, ry * 0.15, 0.2, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawBead() {
    const r = radius + 5;
    ctx.save();
    ctx.translate(mouseX, mouseY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function frame() {
    requestAnimationFrame(frame);
    if (!document.body.classList.contains('trail-on')) return;

    const now = Date.now();

    for (let i = trail.length - 1; i >= 0; i--) {
        if (now - trail[i].at > TRAIL_MS || travelled - trail[i].from > TRAIL_PX) trail.splice(i, 1);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += ripple.speed;
        ripple.alpha -= ripple.fade;
        if (ripple.radius > ripple.max || ripple.alpha <= 0.01) ripples.splice(i, 1);
    }

    radius += (targetRadius - radius) * 0.15;

    /* Nothing moving and nothing to settle: leave the last frame alone. */
    const settled = !trail.length && !ripples.length && Math.abs(targetRadius - radius) < 0.05;
    if (settled && idle) return;
    idle = settled;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRibbon(now);
    ripples.forEach(drawRipple);
    drawBead();
}

frame();
