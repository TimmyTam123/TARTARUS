/* Custom Cursor Trail Effect */

const canvas = document.getElementById('cursor-trail');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* Resize canvas on window resize */
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

/* Trail particles array */
const particles = [];

/* Particle class */
class TrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.alpha = 0.8;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.friction = 0.92;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.alpha -= 0.02;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let mouseX = 0;
let mouseY = 0;
let lastX = 0;
let lastY = 0;

/* Track mouse movement */
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    /* Create trail particles */
    const distance = Math.sqrt((mouseX - lastX) ** 2 + (mouseY - lastY) ** 2);
    if (distance > 3) {
        for (let i = 0; i < 2; i++) {
            particles.push(new TrailParticle(mouseX, mouseY));
        }
        lastX = mouseX;
        lastY = mouseY;
    }
});

/* Animation loop */
function animate() {
    /* Clear canvas with slight fade instead of full clear for trail effect */
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    /* Update and draw particles */
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    /* Draw cursor circle */
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    /* Draw inner dot */
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    requestAnimationFrame(animate);
}

/* Start animation */
animate();
