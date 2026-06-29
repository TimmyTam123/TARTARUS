/* Timer Functionality - Multi-Mode */

let timerInterval = null;
let startTime = null;
let pausedTime = 0; /* in milliseconds */
let isRunning = false;
let currentMode = null;

/* Pomodoro state */
let studyMinutes = 25;
let breakMinutes = 5;
let isStudyPhase = true;
let pomodoroStartTime = null;

/* Countdown state */
let targetSeconds = 0;
let countdownStartTime = null;

/* Mode selection */
const timerModeSelector = document.getElementById('timer-mode-selector');
const modeButtons = document.querySelectorAll('.mode-button-segmented');
const enterButton = document.getElementById('enter-button');

const timerDisplay = document.getElementById('timer-display');
const pauseBtn = document.getElementById('pause-btn');
const settingsBtn = document.querySelector('.settings-button');

/* Pomodoro settings */
const pomodoroSettingsOverlay = document.getElementById('pomodoro-settings-overlay');
const pomodoroSettings = document.getElementById('pomodoro-settings');
const pomodoroSettingsClose = document.getElementById('pomodoro-settings-close');
const studyMinutesSlider = document.getElementById('study-minutes');
const breakMinutesSlider = document.getElementById('break-minutes');
const studyValue = document.getElementById('study-value');
const breakValue = document.getElementById('break-value');
const confirmPomodoro = document.getElementById('confirm-pomodoro');

/* Countdown settings */
const countdownSettingsOverlay = document.getElementById('countdown-settings-overlay');
const countdownSettings = document.getElementById('countdown-settings');
const countdownSettingsClose = document.getElementById('countdown-settings-close');
const targetHours = document.getElementById('target-hours');
const targetMinutes = document.getElementById('target-minutes');
const targetSecondsInput = document.getElementById('target-seconds');
const confirmCountdown = document.getElementById('confirm-countdown');

const title = document.getElementById('title');

/* Format seconds to HH:MM:SS */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* Mode selection handlers */
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        selectTimerMode(mode);
    });
});

function selectTimerMode(mode) {
    currentMode = mode;
    
    /* Update active button styling */
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });
    
    /* Show the Start button immediately after a mode is chosen. */
    enterButton.style.display = 'inline-flex';
    enterButton.style.opacity = '1';
    
    /* Open the matching setup panel immediately so the mode choice feels responsive. */
    if (mode === 'pomodoro') {
        showPomodoroSettings();
    } else if (mode === 'countdown') {
        showCountdownSettings();
    }
}

/* Pomodoro settings */
function showPomodoroSettings() {
    pomodoroSettings.style.display = 'flex';
    pomodoroSettings.style.visibility = 'visible';
    pomodoroSettings.style.pointerEvents = 'auto';
    pomodoroSettingsOverlay.style.display = 'block';
    pomodoroSettingsOverlay.style.visibility = 'visible';
    pomodoroSettingsOverlay.style.pointerEvents = 'auto';
    pomodoroSettings.classList.add('is-visible');
    pomodoroSettingsOverlay.classList.add('is-visible');
    /* Trigger reflow to ensure display change is applied */
    pomodoroSettings.offsetHeight;
    pomodoroSettingsOverlay.style.opacity = '1';
    pomodoroSettings.style.opacity = '1';
}

function closePomodoroSettings() {
    pomodoroSettingsOverlay.style.opacity = '0';
    pomodoroSettings.style.opacity = '0';
    pomodoroSettings.classList.remove('is-visible');
    pomodoroSettingsOverlay.classList.remove('is-visible');
    setTimeout(() => {
        pomodoroSettings.style.display = 'none';
        pomodoroSettings.style.visibility = 'hidden';
        pomodoroSettingsOverlay.style.display = 'none';
        pomodoroSettingsOverlay.style.visibility = 'hidden';
    }, 300);
}

studyMinutesSlider.addEventListener('input', () => {
    studyMinutes = parseInt(studyMinutesSlider.value);
    studyValue.textContent = studyMinutes;
});

breakMinutesSlider.addEventListener('input', () => {
    breakMinutes = parseInt(breakMinutesSlider.value);
    breakValue.textContent = breakMinutes;
});

confirmPomodoro.addEventListener('click', () => {
    closePomodoroSettings();
    setTimeout(() => {
        transitionToTimer();
    }, 350);
});

pomodoroSettingsClose.addEventListener('click', () => {
    closePomodoroSettings();
});

pomodoroSettingsOverlay.addEventListener('click', closePomodoroSettings);

/* Countdown settings */
function showCountdownSettings() {
    countdownSettings.style.display = 'flex';
    countdownSettings.style.visibility = 'visible';
    countdownSettings.style.pointerEvents = 'auto';
    countdownSettingsOverlay.style.display = 'block';
    countdownSettingsOverlay.style.visibility = 'visible';
    countdownSettingsOverlay.style.pointerEvents = 'auto';
    countdownSettings.classList.add('is-visible');
    countdownSettingsOverlay.classList.add('is-visible');
    /* Trigger reflow to ensure display change is applied */
    countdownSettings.offsetHeight;
    countdownSettingsOverlay.style.opacity = '1';
    countdownSettings.style.opacity = '1';
}

function closeCountdownSettings() {
    countdownSettingsOverlay.style.opacity = '0';
    countdownSettings.style.opacity = '0';
    countdownSettings.classList.remove('is-visible');
    countdownSettingsOverlay.classList.remove('is-visible');
    setTimeout(() => {
        countdownSettings.style.display = 'none';
        countdownSettings.style.visibility = 'hidden';
        countdownSettingsOverlay.style.display = 'none';
        countdownSettingsOverlay.style.visibility = 'hidden';
    }, 300);
}

confirmCountdown.addEventListener('click', () => {
    const h = parseInt(targetHours.value) || 0;
    const m = parseInt(targetMinutes.value) || 0;
    const s = parseInt(targetSecondsInput.value) || 0;
    targetSeconds = h * 3600 + m * 60 + s;
    closeCountdownSettings();
    setTimeout(() => {
        transitionToTimer();
    }, 350);
});

countdownSettingsClose.addEventListener('click', () => {
    closeCountdownSettings();
});

countdownSettingsOverlay.addEventListener('click', closeCountdownSettings);

function transitionToTimer() {
    const homeSection = document.getElementById('home-section');
    const timerSection = document.getElementById('timer-section');

    homeSection.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    timerSection.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    homeSection.style.opacity = '0';

    setTimeout(() => {
        homeSection.style.display = 'none';
        homeSection.style.opacity = '1';

        timerSection.style.display = 'flex';
        timerSection.offsetHeight;
        timerSection.style.opacity = '1';

        initializeTimer();
    }, 600);
}

/* Enter button transition to timer */
enterButton.addEventListener('click', (e) => {
    e.preventDefault();
    closePomodoroSettings();
    closeCountdownSettings();
    transitionToTimer();
});

/* Initialize timer based on mode */
function initializeTimer() {
    if (currentMode === 'stopwatch') {
        initializeStopwatch();
    } else if (currentMode === 'pomodoro') {
        initializePomodoro();
    } else if (currentMode === 'countdown') {
        initializeCountdown();
    }
}

/* Daily Stopwatch */
function initializeStopwatch() {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('stopwatch') || '{}');
    
    if (stored.date !== today) {
        /* New day, reset */
        pausedTime = 0;
        localStorage.setItem('stopwatch', JSON.stringify({ date: today, time: 0 }));
    } else {
        /* Continue from previous */
        pausedTime = (stored.time || 0) * 1000;
    }
    
    updateDisplay();
    startTimer();
}

/* Pomodoro */
function initializePomodoro() {
    isStudyPhase = true;
    pausedTime = 0;
    updateDisplay();
    startTimer();
}

function getPomodoroDisplay() {
    const phaseSeconds = isStudyPhase ? studyMinutes * 60 : breakMinutes * 60;
    const elapsed = getElapsedSeconds();
    const remaining = Math.max(0, phaseSeconds - elapsed);
    return remaining;
}

/* Countdown */
function initializeCountdown() {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('countdown') || '{}');
    
    if (stored.date !== today) {
        /* New day, reset */
        pausedTime = 0;
        localStorage.setItem('countdown', JSON.stringify({ date: today, time: 0 }));
    } else {
        /* Continue from previous */
        pausedTime = (stored.time || 0) * 1000;
    }
    
    updateDisplay();
    startTimer();
}

function getCountdownDisplay() {
    const elapsed = getElapsedSeconds();
    const remaining = Math.max(0, targetSeconds - elapsed);
    return remaining;
}

/* Calculate elapsed time */
function getElapsedSeconds() {
    let elapsedMs = pausedTime;
    if (isRunning && startTime) {
        elapsedMs += Date.now() - startTime;
    }
    return Math.floor(elapsedMs / 1000);
}

/* Update timer display */
function updateDisplay() {
    if (currentMode === 'stopwatch') {
        timerDisplay.textContent = formatTime(getElapsedSeconds());
    } else if (currentMode === 'pomodoro') {
        timerDisplay.textContent = formatTime(getPomodoroDisplay());
    } else if (currentMode === 'countdown') {
        timerDisplay.textContent = formatTime(getCountdownDisplay());
    }
    title.textContent = timerDisplay.textContent; /* Update the title with the current timer value */
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
            checkTimerComplete();
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
        
        /* Save state */
        saveTimerState();
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

/* Check if timer phase is complete */
function checkTimerComplete() {
    if (currentMode === 'pomodoro') {
        const phaseSeconds = isStudyPhase ? studyMinutes * 60 : breakMinutes * 60;
        const elapsed = getElapsedSeconds();
        
        if (elapsed >= phaseSeconds) {
            /* Switch phases */
            isStudyPhase = !isStudyPhase;
            pausedTime = 0;
            startTime = Date.now();
        }
    } else if (currentMode === 'countdown') {
        const remaining = getCountdownDisplay();
        if (remaining <= 0) {
            pauseTimer();
        }
    }
}

/* Save timer state to localStorage */
function saveTimerState() {
    if (currentMode === 'stopwatch') {
        const today = new Date().toDateString();
        const seconds = getElapsedSeconds();
        localStorage.setItem('stopwatch', JSON.stringify({ date: today, time: seconds }));
    } else if (currentMode === 'countdown') {
        const today = new Date().toDateString();
        const seconds = getElapsedSeconds();
        localStorage.setItem('countdown', JSON.stringify({ date: today, time: seconds }));
    }
}

/* Save state periodically */
setInterval(() => {
    if (isRunning) {
        saveTimerState();
    }
}, 5000);

/* Quick menu on settings button */
const settingsMenu = document.getElementById('settings-menu');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsPanel = document.getElementById('settings-panel');
const settingsPanelOverlay = document.getElementById('settings-panel-overlay');
const settingsPanelClose = document.getElementById('settings-panel-close');

function openSettingsMenu() {
    settingsMenu.style.display = 'flex';
    settingsOverlay.style.display = 'block';
    settingsMenu.offsetHeight;
    settingsOverlay.style.opacity = '1';
    settingsMenu.style.opacity = '1';
}

function closeSettingsMenu() {
    settingsOverlay.style.opacity = '0';
    settingsMenu.style.opacity = '0';
    setTimeout(() => {
        settingsMenu.style.display = 'none';
        settingsOverlay.style.display = 'none';
    }, 300);
}

settingsBtn.addEventListener('click', openSettingsMenu);
settingsOverlay.addEventListener('click', closeSettingsMenu);
settingsPanelClose.addEventListener('click', closeSettingsPanel);
settingsPanelOverlay.addEventListener('click', closeSettingsPanel);

function closeSettingsPanel() {
    settingsPanelOverlay.style.opacity = '0';
    settingsPanel.style.opacity = '0';
    setTimeout(() => {
        settingsPanel.style.display = 'none';
        settingsPanelOverlay.style.display = 'none';
    }, 300);
}

function openSettingsPanel() {
    settingsPanel.style.display = 'flex';
    settingsPanelOverlay.style.display = 'block';
    settingsPanel.offsetHeight;
    settingsPanelOverlay.style.opacity = '1';
    settingsPanel.style.opacity = '1';
}

document.querySelectorAll('.settings-menu-button').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        if (index === 0) {
            closeSettingsMenu();
            triggerFadeToBlack();
        } else if (index === 1) {
            closeSettingsMenu();
            openSettingsPanel();
        } else if (index === 2) {
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
    
    fadeOverlay.style.display = 'block';
    fadeOverlay.offsetHeight;
    fadeOverlay.style.opacity = '1';
    
    setTimeout(() => {
        timerUI.style.display = 'none';
        exampleText.style.display = 'flex';
        fadeOverlay.offsetHeight;
        fadeOverlay.style.opacity = '0';
    }, 500);
    
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
    
    pauseTimer();
    saveTimerState();
    
    fadeOverlay.style.display = 'block';
    fadeOverlay.offsetHeight;
    fadeOverlay.style.opacity = '1';
    
    setTimeout(() => {
        timerUI.style.display = 'none';
        exampleText.style.display = 'none';
        homeSection.style.display = 'flex';
        homeSection.style.opacity = '1';
        fadeOverlay.offsetHeight;
        fadeOverlay.style.opacity = '0';
        
        /* Reset mode selection UI */
        modeButtons.forEach(btn => btn.classList.remove('active'));
        enterButton.style.display = 'none';
        
        currentMode = null;
        pausedTime = 0;
        isRunning = false;
    }, 500);
    
    setTimeout(() => {
        fadeOverlay.style.display = 'none';
    }, 1000);
}

/* Settings sidebar navigation */
document.querySelectorAll('.settings-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        document.querySelectorAll('.settings-sidebar-item').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        
        item.classList.add('active');
        document.querySelector(`[data-section="${section}"].settings-section`).classList.add('active');
    });
});
