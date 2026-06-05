/* Timer Functionality */

let timerInterval = null;
let startTime = null;
let pausedTime = 0; /* in milliseconds */
let isRunning = false;

const timerDisplay = document.getElementById('timer-display');
const pauseBtn = document.getElementById('pause-btn');
const settingsBtn = document.querySelector('.settings-button');
const settingsMenu = document.getElementById('settings-menu');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsPanel = document.getElementById('settings-panel');
const settingsPanelOverlay = document.getElementById('settings-panel-overlay');
const settingsPanelClose = document.getElementById('settings-panel-close');

/* Format seconds to HH:MM:SS */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* Calculate elapsed time from start */
function getElapsedSeconds() {
    let elapsedMs = pausedTime;
    if (isRunning && startTime) {
        elapsedMs += Date.now() - startTime;
    }
    return Math.floor(elapsedMs / 1000);
}

/* Update timer display */
function updateDisplay() {
    timerDisplay.textContent = formatTime(getElapsedSeconds());
}

/* Start timer */
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startTime = Date.now();
        pauseBtn.classList.add('paused');
        pauseBtn.querySelector('.button-icon').textContent = '⏸';
        
        timerInterval = setInterval(() => {
            updateDisplay();
        }, 100);
    }
}

/* Pause timer */
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        pauseBtn.classList.remove('paused');
        pauseBtn.querySelector('.button-icon').textContent = '▶';
        pausedTime += Date.now() - startTime;
        startTime = null;
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

/* Settings panel functionality */
function openSettingsPanel() {
    settingsPanel.style.display = 'flex';
    settingsPanelOverlay.style.display = 'block';
    
    /* Trigger reflow to ensure display change is applied */
    settingsPanel.offsetHeight;
    
    /* Fade in */
    settingsPanelOverlay.style.opacity = '1';
    settingsPanel.style.opacity = '1';
}

function closeSettingsPanel() {
    /* Fade out */
    settingsPanelOverlay.style.opacity = '0';
    settingsPanel.style.opacity = '0';
    
    /* After fade out, hide elements */
    setTimeout(() => {
        settingsPanel.style.display = 'none';
        settingsPanelOverlay.style.display = 'none';
    }, 300);
}

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

settingsPanelClose.addEventListener('click', closeSettingsPanel);

settingsPanelOverlay.addEventListener('click', closeSettingsPanel);

/* Settings sidebar navigation */
document.querySelectorAll('.settings-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        /* Remove active from all */
        document.querySelectorAll('.settings-sidebar-item').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        
        /* Add active to clicked */
        item.classList.add('active');
        document.querySelector(`[data-section="${section}"].settings-section`).classList.add('active');
    });
});

/* Close menu when clicking a settings button */
document.querySelectorAll('.settings-menu-button').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        /* Trigger fade effect for Option 1 */
        if (index === 0) {
            closeSettingsMenu();
            triggerFadeToBlack();
        } else if (index === 1) {
            /* Option 2 opens settings panel */
            closeSettingsMenu();
            openSettingsPanel();
        } else if (index === 2) {
            /* Option 3 returns to start page */
            closeSettingsMenu();
            returnToStart();
        }
    });
});

/* Fade to black effect for Option 1 */
function triggerFadeToBlack() {
    const fadeOverlay = document.getElementById('fade-overlay');
    const timerUI = document.getElementById('timer-section');
    const exampleText = document.getElementById('example-text-container');
    
    /* Fade to black */
    fadeOverlay.style.display = 'block';
    fadeOverlay.offsetHeight; /* Trigger reflow */
    fadeOverlay.style.opacity = '1';
    
    /* Hide timer UI and show example text */
    setTimeout(() => {
        timerUI.style.display = 'none';
        exampleText.style.display = 'flex';
        fadeOverlay.offsetHeight; /* Trigger reflow */
        fadeOverlay.style.opacity = '0';
    }, 500);
    
    /* Hide fade overlay after transition */
    setTimeout(() => {
        fadeOverlay.style.display = 'none';
    }, 1000);
}

/* Return to start page - Option 3 */
function returnToStart() {
    const fadeOverlay = document.getElementById('fade-overlay');
    const timerUI = document.getElementById('timer-section');
    const exampleText = document.getElementById('example-text-container');
    const homeSection = document.getElementById('home-section');
    
    /* Fade to black */
    fadeOverlay.style.display = 'block';
    fadeOverlay.offsetHeight; /* Trigger reflow */
    fadeOverlay.style.opacity = '1';
    
    /* Hide timer and example text, show home */
    setTimeout(() => {
        timerUI.style.display = 'none';
        exampleText.style.display = 'none';
        homeSection.style.display = 'flex';
        homeSection.style.opacity = '1';
        fadeOverlay.offsetHeight; /* Trigger reflow */
        fadeOverlay.style.opacity = '0';
    }, 500);
    
    /* Hide fade overlay after transition */
    setTimeout(() => {
        fadeOverlay.style.display = 'none';
        /* Reset timer */
        pauseTimer();
        pausedTime = 0;
        updateDisplay();
    }, 1000);
}
