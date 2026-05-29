/* Timer Functionality */

let timerInterval = null;
let totalSeconds = 0;
let isRunning = false;

const timerDisplay = document.getElementById('timer-display');
const pauseBtn = document.getElementById('pause-btn');
const settingsBtn = document.querySelector('.settings-button');
const settingsMenu = document.getElementById('settings-menu');
const settingsOverlay = document.getElementById('settings-overlay');

/* Format seconds to HH:MM:SS */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* Update timer display */
function updateDisplay() {
    timerDisplay.textContent = formatTime(totalSeconds);
}

/* Start timer */
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        pauseBtn.classList.add('paused');
        pauseBtn.querySelector('.button-icon').textContent = '▶';
        
        timerInterval = setInterval(() => {
            totalSeconds++;
            updateDisplay();
        }, 1000);
    }
}

/* Pause timer */
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        pauseBtn.classList.remove('paused');
        pauseBtn.querySelector('.button-icon').textContent = '⏸';
        clearInterval(timerInterval);
    }
}

/* Toggle pause/play */
pauseBtn.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

/* Settings menu functionality */
function openSettingsMenu() {
    settingsMenu.style.display = 'flex';
    settingsOverlay.style.display = 'block';
    
    /* Trigger reflow to ensure display change is applied */
    settingsMenu.offsetHeight;
    
    /* Fade in */
    settingsOverlay.style.opacity = '1';
    settingsMenu.style.opacity = '1';
}

function closeSettingsMenu() {
    /* Fade out */
    settingsOverlay.style.opacity = '0';
    settingsMenu.style.opacity = '0';
    
    /* After fade out, hide elements */
    setTimeout(() => {
        settingsMenu.style.display = 'none';
        settingsOverlay.style.display = 'none';
    }, 300);
}

settingsBtn.addEventListener('click', openSettingsMenu);

settingsOverlay.addEventListener('click', closeSettingsMenu);

/* Close menu when clicking a settings button */
document.querySelectorAll('.settings-menu-button').forEach(btn => {
    btn.addEventListener('click', () => {
        closeSettingsMenu();
    });
});

/* Auto-start timer on page load */
window.addEventListener('load', () => {
    startTimer();
});
