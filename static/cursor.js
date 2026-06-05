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
const maxTrailDuration = 50; /* milliseconds */
const maxTrailDistance = 200; /* pixels */
let cursorRadius = 6; /* default cursor radius */
let targetRadius = 6; /* target cursor radius for smooth transition */

let mouseX = 0;
let mouseY = 0;
let lastX = 0;
let lastY = 0;
let cumulativeDistance = 0;

/* Track mouse movement */
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    /* Add point to trail with timestamp and distance */
    const distance = Math.sqrt((mouseX - lastX) ** 2 + (mouseY - lastY) ** 2);
    if (distance > 2) {
        cumulativeDistance += distance;
        trailPoints.push({ 
            x: lastX || mouseX, 
            y: lastY || mouseY, 
            timestamp: Date.now(),
            distanceFromStart: cumulativeDistance
        });
        lastX = mouseX;
        lastY = mouseY;
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
    
    /* Draw smooth ribbon trail */
    if (trailPoints.length > 1) {
        const ribbonWidth = 8;
        
        /* Create top and bottom curves for the ribbon */
        const topPoints = [];
        const bottomPoints = [];
        
        /* Calculate perpendicular directions and create ribbon sides */
        for (let i = 0; i < trailPoints.length; i++) {
            const point = trailPoints[i];
            
            /* Get direction at this point */
            let dirX, dirY;
            if (i < trailPoints.length - 1) {
                const nextPoint = trailPoints[i + 1];
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
            
            /* Perpendicular vector */
            const perpX = -dirY;
            const perpY = dirX;
            
            /* Calculate alpha based on age */
            const age = now - point.timestamp;
            const alpha = 1 - Math.max(0, age / maxTrailDuration);
            
            topPoints.push({
                x: point.x + perpX * (ribbonWidth / 2),
                y: point.y + perpY * (ribbonWidth / 2),
                alpha: alpha
            });
            
            bottomPoints.push({
                x: point.x - perpX * (ribbonWidth / 2),
                y: point.y - perpY * (ribbonWidth / 2),
                alpha: alpha
            });
        }
        
        /* Add cursor position to complete the ribbon */
        const lastPoint = trailPoints[trailPoints.length - 1];
        let dirX = mouseX - lastPoint.x;
        let dirY = mouseY - lastPoint.y;
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
        
        topPoints.push({
            x: mouseX + perpX * (ribbonWidth / 2),
            y: mouseY + perpY * (ribbonWidth / 2),
            alpha: 1
        });
        bottomPoints.push({
            x: mouseX - perpX * (ribbonWidth / 2),
            y: mouseY - perpY * (ribbonWidth / 2),
            alpha: 1
        });
        
        /* Draw ribbon with gradient */
        for (let i = 0; i < topPoints.length - 1; i++) {
            const alpha1 = topPoints[i].alpha;
            const alpha2 = topPoints[i + 1].alpha;
            
            /* Create smooth gradient between segments */
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha1 * 0.5})`;
            
            ctx.beginPath();
            ctx.moveTo(topPoints[i].x, topPoints[i].y);
            ctx.lineTo(topPoints[i + 1].x, topPoints[i + 1].y);
            ctx.lineTo(bottomPoints[i + 1].x, bottomPoints[i + 1].y);
            ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    /* Draw cursor circle */
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, cursorRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    /* Draw inner dot */
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, cursorRadius / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    requestAnimationFrame(animate);
}

/* Start animation */
animate();
