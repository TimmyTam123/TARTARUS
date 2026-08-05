/* Custom Cursor Trail Effect - Smooth Ribbon Trail */

const canvas = document.getElementById('cursor-trail');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* Resize canvas on window resize */
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

/* Trail points array with timestamps and cumulative distance */
const trailPoints = [];
const maxTrailDuration = 180; /* milliseconds */
const maxTrailDistance = 320; /* pixels */
let cursorRadius = 4; /* default cursor radius */
let targetRadius = 4; /* target cursor radius for smooth transition */

let mouseX = 0;
let mouseY = 0;
let lastX = 0;
let lastY = 0;
let lastMoveDX = 0;
let lastMoveDY = 0;
let cumulativeDistance = 0;
const ripples = [];
const moveRippleThreshold = 8;
let lastMoveRippleTime = 0;

function addRipple(x, y, startRadius, maxRadius, fillAlpha, strokeAlpha, speed, fadeSpeed, directionX = 0, directionY = 0, isStationary = false) {
    const dirLength = Math.sqrt(directionX * directionX + directionY * directionY);
    ripples.push({
        x,
        y,
        radius: startRadius,
        maxRadius,
        fillAlpha,
        strokeAlpha,
        speed,
        fadeSpeed,
        directionX: dirLength > 0 ? directionX / dirLength : 0,
        directionY: dirLength > 0 ? directionY / dirLength : 0,
        rotation: dirLength > 0 ? Math.atan2(directionY, directionX) : 0,
        phase: Math.random() * Math.PI * 2,
        isStationary,
        detail: {
            rings: isStationary ? 4 : 3,
            crestStrength: isStationary ? 0.32 : 0.24,
            directionBias: isStationary ? 0 : 1
        }
    });
}

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
}

function interpolateTrailPoints(points) {
    const sampled = [];
    if (points.length === 0) {
        return sampled;
    }

    for (let i = 0; i < points.length - 1; i++) {
        const previous = points[Math.max(0, i - 1)];
        const current = points[i];
        const next = points[i + 1];
        const following = points[Math.min(points.length - 1, i + 2)];

        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.min(24, Math.max(5, Math.floor(distance / 3)));

        for (let step = 0; step < steps; step++) {
            const t = step / steps;
            const point = catmullRom(previous, current, next, following, t);
            sampled.push({
                x: point.x,
                y: point.y,
                timestamp: current.timestamp,
                distanceFromStart: current.distanceFromStart + distance * t
            });
        }
    }

    sampled.push(points[points.length - 1]);
    return sampled;
}

/* Track mouse movement */
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    /* Add point to trail with timestamp and distance */
    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 2) {
        cumulativeDistance += distance;
        trailPoints.push({ 
            x: lastX || mouseX, 
            y: lastY || mouseY, 
            timestamp: Date.now(),
            distanceFromStart: cumulativeDistance
        });
        lastMoveDX = dx / distance;
        lastMoveDY = dy / distance;
        lastX = mouseX;
        lastY = mouseY;
    }

    const now = Date.now();
    if (distance > moveRippleThreshold && now - lastMoveRippleTime > 24) {
        lastMoveRippleTime = now;
        const offset = cursorRadius + 6;
        const rippleX = mouseX + lastMoveDX * offset;
        const rippleY = mouseY + lastMoveDY * offset;
        addRipple(rippleX, rippleY, 20, 72, 0.24, 0.16, 2.0, 0.032, lastMoveDX, lastMoveDY, false);
    }
});

/* Handle button and link hovers */
document.addEventListener('mouseover', (e) => {
    let target = e.target;
    let isButton = false;
    
    /* Check target and parents for button/link */
    while (target && target !== document) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.classList.contains('glass-button')) {
            isButton = true;
            break;
        }
        target = target.parentElement;
    }
    
    if (isButton) {
        targetRadius = 9;
    }
});

document.addEventListener('mouseout', (e) => {
    let target = e.target;
    let isButton = false;
    
    /* Check target and parents for button/link */
    while (target && target !== document) {
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.classList.contains('glass-button')) {
            isButton = true;
            break;
        }
        target = target.parentElement;
    }
    
    if (isButton) {
        targetRadius = 6;
    }
});

document.addEventListener('mousedown', (e) => {
    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isStationary = distance < 8;
    const offset = isStationary ? 0 : cursorRadius + 6;
    const rippleX = e.clientX + (isStationary ? 0 : dx / distance * offset);
    const rippleY = e.clientY + (isStationary ? 0 : dy / distance * offset);
    addRipple(rippleX, rippleY, isStationary ? 22 : 24, isStationary ? 110 : 120, 0.36, 0.22, 2.4, 0.045, dx, dy, isStationary);
});

document.addEventListener('mouseup', (e) => {
    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isStationary = distance < 8;
    const offset = isStationary ? 0 : cursorRadius + 6;
    const rippleX = e.clientX + (isStationary ? 0 : dx / distance * offset);
    const rippleY = e.clientY + (isStationary ? 0 : dy / distance * offset);
    addRipple(rippleX, rippleY, isStationary ? 18 : 16, isStationary ? 78 : 68, 0.26, 0.16, 1.8, 0.038, dx, dy, isStationary);
});

/* Animation loop */
function animate() {
    /* Clear canvas completely */
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const now = Date.now();
    
    /* Smooth cursor radius transition */
    cursorRadius += (targetRadius - cursorRadius) * 0.15;
    
    /* Remove old points based on time and distance */
    for (let i = 0; i < trailPoints.length; i++) {
        const point = trailPoints[i];
        const age = now - point.timestamp;
        const distanceFromEnd = cumulativeDistance - point.distanceFromStart;
        
        if (age > maxTrailDuration || distanceFromEnd > maxTrailDistance) {
            trailPoints.splice(i, 1);
            i--;
        }
    }
    
    /* Draw smooth liquid glass ribbon trail */
    const sampledPoints = interpolateTrailPoints(trailPoints);

    if (sampledPoints.length > 0) {
        const leadOffset = cursorRadius + 4;
        const lastPoint = sampledPoints[sampledPoints.length - 1];
        const dx = mouseX - lastPoint.x;
        const dy = mouseY - lastPoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.001) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            sampledPoints.push({
                x: mouseX - dirX * leadOffset,
                y: mouseY - dirY * leadOffset,
                timestamp: now,
                distanceFromStart: cumulativeDistance
            });
        } else if (lastMoveDX || lastMoveDY) {
            sampledPoints.push({
                x: mouseX - lastMoveDX * leadOffset,
                y: mouseY - lastMoveDY * leadOffset,
                timestamp: now,
                distanceFromStart: cumulativeDistance
            });
        }
    }

    if (sampledPoints.length > 1) {
        const ribbonWidth = 12;

        /* Create top and bottom curves for the ribbon */
        const topPoints = [];
        const bottomPoints = [];

        for (let i = 0; i < sampledPoints.length; i++) {
            const point = sampledPoints[i];

            let dirX, dirY;
            if (i < sampledPoints.length - 1) {
                const nextPoint = sampledPoints[i + 1];
                dirX = nextPoint.x - point.x;
                dirY = nextPoint.y - point.y;
            } else {
                dirX = mouseX - point.x;
                dirY = mouseY - point.y;
            }

            const dirDist = Math.sqrt(dirX * dirX + dirY * dirY);
            if (dirDist > 0) {
                dirX /= dirDist;
                dirY /= dirDist;
            } else {
                dirX = 1;
                dirY = 0;
            }

            const perpX = -dirY;
            const perpY = dirX;
            const age = now - point.timestamp;
            const alpha = 1 - Math.max(0, age / maxTrailDuration);
            const progress = i / Math.max(1, sampledPoints.length - 1);
            const taper = Math.pow(progress, 2.2);
            const width = ribbonWidth * (0.75 + alpha * 0.25) * taper + 0.5;

            topPoints.push({
                x: point.x + perpX * (width / 2),
                y: point.y + perpY * (width / 2),
                alpha: alpha
            });
            bottomPoints.push({
                x: point.x - perpX * (width / 2),
                y: point.y - perpY * (width / 2),
                alpha: alpha
            });
        }

        const trailGradient = ctx.createLinearGradient(sampledPoints[0].x, sampledPoints[0].y, mouseX, mouseY);
        trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        trailGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.18)');
        trailGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.14)');
        trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.04)');

        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 1; i < topPoints.length; i++) {
            ctx.lineTo(topPoints[i].x, topPoints[i].y);
        }
        for (let i = bottomPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(topPoints[0].x, topPoints[0].y);
        for (let i = 1; i < topPoints.length; i++) {
            ctx.lineTo(topPoints[i].x, topPoints[i].y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bottomPoints[0].x, bottomPoints[0].y);
        for (let i = 1; i < bottomPoints.length; i++) {
            ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
    
    /* Draw active ripples */
    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += ripple.speed;
        ripple.fillAlpha = Math.max(0, ripple.fillAlpha - ripple.fadeSpeed);
        ripple.strokeAlpha = Math.max(0, ripple.strokeAlpha - ripple.fadeSpeed * 0.9);

        if (ripple.radius > ripple.maxRadius || ripple.fillAlpha <= 0.01) {
            ripples.splice(i, 1);
            continue;
        }

        const normalized = ripple.radius / ripple.maxRadius;
        const alpha = ripple.fillAlpha * (1 - normalized);
        const ringCount = ripple.detail.rings;
        const baseRadiusX = ripple.radius * (ripple.isStationary ? 1.15 : 1.4);
        const baseRadiusY = ripple.radius * (ripple.isStationary ? 1.15 : 0.64);
        const angle = ripple.isStationary ? 0 : ripple.rotation;
        const motionBias = ripple.detail.directionBias;

        ctx.save();
        ctx.translate(ripple.x, ripple.y);
        ctx.rotate(angle);

        const liquidGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadiusX);
        liquidGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.16})`);
        liquidGradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.08})`);
        liquidGradient.addColorStop(0.85, `rgba(255, 255, 255, ${alpha * 0.02})`);
        liquidGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = liquidGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadiusX, baseRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < ringCount; ring++) {
            const ringProgress = 1 - ring / (ringCount + 1);
            const ringAlpha = alpha * (0.18 * ringProgress);
            const ringWidthX = baseRadiusX * (0.65 + ring * 0.12 - normalized * 0.08);
            const ringWidthY = baseRadiusY * (0.65 + ring * 0.12 - normalized * 0.08);
            const ringThickness = 1.2 - ring * 0.18;

            ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
            ctx.lineWidth = ringThickness;
            ctx.beginPath();
            ctx.ellipse(0, 0, ringWidthX, ringWidthY, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        const highlightAlpha = alpha * 0.35;
        const highlightX = baseRadiusX * 0.6;
        const highlightY = baseRadiusY * 0.35;
        ctx.strokeStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(highlightX, -highlightY, baseRadiusX * 0.35, baseRadiusY * 0.15, 0.2, 0, Math.PI);
        ctx.stroke();

        if (!ripple.isStationary && motionBias > 0.1) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const frontScale = 1.05 + Math.sin(ripple.phase + normalized * Math.PI * 2) * 0.04;
            ctx.ellipse(0, 0, baseRadiusX * frontScale, baseRadiusY * 0.85, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* Draw cursor glass body as a smooth circle */
    ctx.save();
    ctx.translate(mouseX, mouseY);

    const circleRadius = cursorRadius + 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, circleRadius - 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    
    requestAnimationFrame(animate);
}

/* Start animation */
animate();
