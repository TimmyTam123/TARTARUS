/* Custom Cursor Trail Effect - Single Tapering Triangle */

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
const maxTrailDuration = 250; /* milliseconds */
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
    
    /* Draw single triangle trail */
    if (trailPoints.length > 0) {
        /* Get the tail point (oldest point) */
        const tailPoint = trailPoints[trailPoints.length - 1];
        
        /* Calculate movement direction for proper triangle orientation */
        let dirX = mouseX - tailPoint.x;
        let dirY = mouseY - tailPoint.y;
        const dirDist = Math.sqrt(dirX * dirX + dirY * dirY);
        
        if (dirDist > 0) {
            dirX /= dirDist;
            dirY /= dirDist;
        } else {
            dirX = 1;
            dirY = 0;
        }
        
        /* Perpendicular vectors for triangle sides */
        const perpX = -dirY;
        const perpY = dirX;
        
        /* Triangle has 3 points:
           - Two at cursor (wide base)
           - One at tail (sharp point)
        */
        const triangleWidth = 12; /* width at the cursor */
        
        const topCursorPoint = {
            x: mouseX + perpX * (triangleWidth / 2),
            y: mouseY + perpY * (triangleWidth / 2)
        };
        
        const bottomCursorPoint = {
            x: mouseX - perpX * (triangleWidth / 2),
            y: mouseY - perpY * (triangleWidth / 2)
        };
        
        const tailPointCoord = {
            x: tailPoint.x,
            y: tailPoint.y
        };
        
        /* Calculate alpha based on oldest point */
        const oldestAge = now - tailPoint.timestamp;
        const alpha = 1 - Math.max(0, oldestAge / maxTrailDuration);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(topCursorPoint.x, topCursorPoint.y);
        ctx.lineTo(bottomCursorPoint.x, bottomCursorPoint.y);
        ctx.lineTo(tailPointCoord.x, tailPointCoord.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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
