const icons = [
    '🍎', '🍌', '🍇', '🍉', '🍓', '🍒',
    '🍍', '🥝', '🥑', '🍆', '🥕', '🌽'
];

let gameInterval;
let startTime;
let elapsedTime = 0;
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let isLocked = false;

let currentMode = 1;
let currentPlayer = 1;
let p1Score = 0;
let p2Score = 0;
let currentDifficulty = 'easy';
let currentScreen = 'mode';

let cpuMemory = new Map();
let opponentActive = false;
const FLIP_ANIMATION_MS = 500;

let pendingExitTarget = null;

const MEMORY_RANKS = {
    elephant: {
        emoji: '🐘',
        title: 'Memoria de elefante',
        note: 'Lo recuerdas todo, hasta lo que no quieres.',
    },
    dolphin: {
        emoji: '🐬',
        title: 'Memoria de delfín',
        note: 'Nadas entre las cartas como si fueran tu océano.',
    },
    turtle: {
        emoji: '🐢',
        title: 'Memoria de tortuga',
        note: 'Llegas con calma, pero llegas seguro.',
    },
    mouse: {
        emoji: '🐭',
        title: 'Memoria de ratón',
        note: 'Tus recuerdos asoman, pero se esconden rápido.',
    },
    goldfish: {
        emoji: '🐠',
        title: 'Memoria de pez dorado',
        note: 'Cada carta es una sorpresa nueva… ¡otra vez!',
    },
};

const TIME_THRESHOLDS = {
    easy: [35, 55, 80],
    medium: [70, 110, 150],
    hard: [110, 170, 230],
};

const SCORE_THRESHOLDS = {
    easy: [0.8, 0.6, 0.4],
    medium: [0.75, 0.55, 0.4],
    hard: [0.7, 0.5, 0.35],
};

function waitForFlipAnimation(cards, timeout = FLIP_ANIMATION_MS) {
    return new Promise((resolve) => {
        let remaining = cards.length;
        const fallback = setTimeout(resolve, timeout + 50);

        const handleEnd = (event) => {
            if (event.propertyName !== 'transform') return;
            event.target.removeEventListener('transitionend', handleEnd);
            remaining -= 1;
            if (remaining === 0) {
                clearTimeout(fallback);
                resolve();
            }
        };

        cards.forEach((card) => card.addEventListener('transitionend', handleEnd));
    });
}

function attachButtonPressEffect(selector) {
    const buttons = document.querySelectorAll(selector);

    buttons.forEach((button) => {
        const removePress = () => button.classList.remove('button-press');
        const handleKeyDown = (event) => {
            if (event.code === 'Space' || event.code === 'Enter') {
                button.classList.add('button-press');
                if (window.soundManager) soundManager.play('button');
            }
        };

        const handleKeyUp = (event) => {
            if (event.code === 'Space' || event.code === 'Enter') {
                removePress();
            }
        };

        button.addEventListener('pointerdown', () => {
            button.classList.add('button-press');
            if (window.soundManager) soundManager.play('button');
        });

        button.addEventListener('pointerup', removePress);
        button.addEventListener('pointerleave', removePress);
        button.addEventListener('keydown', handleKeyDown);
        button.addEventListener('keyup', handleKeyUp);
        button.addEventListener('blur', removePress);
    });
}

function setScreen(screen, { pushHistory = true } = {}) {
    const screenMap = {
        mode: 'mode-menu',
        difficulty: 'difficulty-menu',
        game: 'game'
    };

    const target = screenMap[screen] || screenMap.mode;

    if (currentScreen === 'game' && screen !== 'game') {
        resetTimer();
    }

    Object.values(screenMap).forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;

        if (id === target) {
            element.classList.remove('hidden');
            element.classList.add('active');
        } else {
            element.classList.add('hidden');
            element.classList.remove('active');
        }
    });

    currentScreen = screen;

    if (pushHistory) {
        history.pushState({ screen }, '', `#${screen}`);
    }
}

function selectMode(mode) {
    currentMode = mode;
    setScreen('difficulty');
}

function showModeMenu(pushHistory = true) {
    if (pushHistory && history.state?.screen === 'difficulty') {
        history.back();
    } else {
        setScreen('mode', { pushHistory });
    }
}

function startGame(cardCount) {
    resetTimer();

    document.getElementById('game-over').classList.add('hidden');
    resetMemoryRank();
    setScreen('game');

    const board = document.getElementById('board');
    board.innerHTML = '';
    board.className = 'game-board'; // Reset class

    // Set grid class based on card count
    if (cardCount === 12) board.classList.add('grid-12');
    else if (cardCount === 18) board.classList.add('grid-18');
    else if (cardCount === 24) board.classList.add('grid-24');

    totalPairs = cardCount / 2;
    currentDifficulty = getDifficulty(cardCount);
    matchedPairs = 0;
    flippedCards = [];
    isLocked = false;
    cpuMemory.clear();
    opponentActive = false;

    // Generate deck
    let deck = icons.slice(0, totalPairs);
    deck = [...deck, ...deck]; // Duplicate for pairs
    deck.sort(() => Math.random() - 0.5); // Shuffle

    // Create cards
    deck.forEach((icon, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.icon = icon;
        card.dataset.index = String(index);

        card.innerHTML = `
            <div class="card-face card-back">?</div>
            <div class="card-face card-front">${icon}</div>
        `;

        card.addEventListener('click', () => flipCard(card));
        board.appendChild(card);
    });

    // Mode specific setup
    if (currentMode === 1) {
        document.getElementById('timer-container').classList.remove('hidden');
        document.getElementById('scoreboard').classList.add('hidden');
        startTimer();
    } else if (currentMode === 2) {
        document.getElementById('timer-container').classList.add('hidden');
        document.getElementById('scoreboard').classList.remove('hidden');
        p1Score = 0;
        p2Score = 0;
        currentPlayer = 1;
        updateScoreUI();
        setScoreboardLabels('J1', 'J2');
    } else if (currentMode === 3) {
        document.getElementById('timer-container').classList.add('hidden');
        document.getElementById('scoreboard').classList.remove('hidden');
        p1Score = 0;
        p2Score = 0;
        currentPlayer = 1;
        updateScoreUI();
        setScoreboardLabels('Tú', 'CPU');
    } else if (currentMode === 4) {
        document.getElementById('timer-container').classList.add('hidden');
        document.getElementById('scoreboard').classList.remove('hidden');
        p1Score = 0;
        p2Score = 0;
        currentPlayer = 1;
        updateScoreUI();
        setScoreboardLabels('Tú', 'IA');
    }
}

function flipCard(card) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if ((currentMode === 3 || currentMode === 4) && currentPlayer === 2 && !opponentActive) return;

    card.classList.add('flipped');
    if (window.soundManager) soundManager.play('flip');
    flippedCards.push(card);
    rememberCard(card);

    if (flippedCards.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    isLocked = true;
    const [card1, card2] = flippedCards;

    if (card1.dataset.icon === card2.dataset.icon) {
        card1.classList.add('matched');
        card2.classList.add('matched');
        if (window.soundManager) soundManager.play('match');
        cpuMemory.delete(card1.dataset.icon);
        matchedPairs++;
        flippedCards = [];
        isLocked = false;

        if (currentMode === 2) {
            if (currentPlayer === 1) p1Score++;
            else p2Score++;
            updateScoreUI();
        } else if (currentMode === 3 || currentMode === 4) {
            if (currentPlayer === 1) p1Score++;
            else p2Score++;
            updateScoreUI();
            if (currentPlayer === 2 && matchedPairs !== totalPairs) {
                const opponentTurn = currentMode === 3 ? cpuTakeTurn : aiTakeTurn;
                setTimeout(opponentTurn, 500);
            }
        }

        if (matchedPairs === totalPairs) {
            endGame();
        }
    } else {
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            flippedCards = [];
            isLocked = false;

            if (currentMode === 2) {
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                updateScoreUI();
            } else if (currentMode === 3 || currentMode === 4) {
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                updateScoreUI();
                if (currentPlayer === 2) {
                    const opponentTurn = currentMode === 3 ? cpuTakeTurn : aiTakeTurn;
                    setTimeout(opponentTurn, 500);
                }
            }
        }, 1000);
    }
}

function updateScoreUI() {
    document.getElementById('p1-score').textContent = p1Score;
    document.getElementById('p2-score').textContent = p2Score;

    if (currentPlayer === 1) {
        document.getElementById('p1-box').classList.add('active-turn');
        document.getElementById('p2-box').classList.remove('active-turn');
    } else {
        document.getElementById('p1-box').classList.remove('active-turn');
        document.getElementById('p2-box').classList.add('active-turn');
    }
}

function setScoreboardLabels(p1Label, p2Label) {
    document.getElementById('p1-label').textContent = p1Label;
    document.getElementById('p2-label').textContent = p2Label;
}

function startTimer() {
    elapsedTime = 0;
    startTime = Date.now();
    gameInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
}

function getElapsedSeconds() {
    const totalElapsed = elapsedTime + (startTime ? Date.now() - startTime : 0);
    return Math.floor(totalElapsed / 1000);
}

function pauseTimer() {
    if (currentMode !== 1) return;
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    if (startTime) {
        elapsedTime += Date.now() - startTime;
        startTime = null;
    }
}

function resumeTimer() {
    if (currentMode !== 1) return;
    if (gameInterval) return;
    startTime = Date.now();
    gameInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
}

function resetTimer() {
    clearInterval(gameInterval);
    gameInterval = null;
    startTime = null;
    elapsedTime = 0;
    document.getElementById('time').textContent = '00:00';
}

function updateTimerDisplay() {
    const totalElapsed = elapsedTime + (startTime ? Date.now() - startTime : 0);
    const elapsedSeconds = Math.floor(totalElapsed / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    document.getElementById('time').textContent = `${minutes}:${seconds}`;
}

function resetMemoryRank() {
    const memoryRank = document.getElementById('memory-rank');
    if (memoryRank) {
        memoryRank.textContent = '';
        memoryRank.classList.add('hidden');
    }
}

function calculateMemoryRank() {
    if (!totalPairs) return null;

    if (currentMode === 1) {
        const thresholds = TIME_THRESHOLDS[currentDifficulty] || TIME_THRESHOLDS.medium;
        const seconds = getElapsedSeconds();

        let tier;
        if (seconds <= thresholds[0]) tier = 'elephant';
        else if (seconds <= thresholds[1]) tier = 'dolphin';
        else if (seconds <= thresholds[2]) tier = 'turtle';
        else if (seconds >= thresholds[2] + 60) tier = 'goldfish';
        else tier = 'mouse';

        return MEMORY_RANKS[tier];
    }

    const thresholds = SCORE_THRESHOLDS[currentDifficulty] || SCORE_THRESHOLDS.medium;
    const ratio = totalPairs ? p1Score / totalPairs : 0;

    let tier;
    if (ratio >= thresholds[0]) tier = 'elephant';
    else if (ratio >= thresholds[1]) tier = 'dolphin';
    else if (ratio >= thresholds[2]) tier = 'turtle';
    else if (ratio <= 0.2) tier = 'goldfish';
    else tier = 'mouse';

    return MEMORY_RANKS[tier];
}

function formatMemoryRank() {
    const rank = calculateMemoryRank();
    if (!rank) return '';
    return `${rank.emoji} ${rank.title}: ${rank.note}`;
}

function endGame() {
    clearInterval(gameInterval);
    const gameOverTitle = document.getElementById('game-over-title');
    const gameOverMsg = document.getElementById('game-over-msg');

    if (currentMode === 1) {
        const finalTime = document.getElementById('time').textContent;
        gameOverTitle.textContent = "¡Ganaste!";
        gameOverMsg.innerHTML = `Tiempo: <span id="final-time">${finalTime}</span>`;
    } else if (currentMode === 2) {
        if (p1Score > p2Score) {
            gameOverTitle.textContent = "¡Jugador 1 gana!";
        } else if (p2Score > p1Score) {
            gameOverTitle.textContent = "¡Jugador 2 gana!";
        } else {
            gameOverTitle.textContent = "¡Empate!";
        }
        gameOverMsg.innerHTML = `J1: ${p1Score} - J2: ${p2Score}`;
    } else if (currentMode === 3) {
        if (p1Score > p2Score) {
            gameOverTitle.textContent = "¡Ganaste!";
        } else if (p2Score > p1Score) {
            gameOverTitle.textContent = "¡La CPU gana!";
        } else {
            gameOverTitle.textContent = "¡Empate!";
        }
        gameOverMsg.innerHTML = `Tú: ${p1Score} - CPU: ${p2Score}`;
    } else if (currentMode === 4) {
        if (p1Score > p2Score) {
            gameOverTitle.textContent = "¡Ganaste!";
        } else if (p2Score > p1Score) {
            gameOverTitle.textContent = "¡La IA gana!";
        } else {
            gameOverTitle.textContent = "¡Empate!";
        }
        gameOverMsg.innerHTML = `Tú: ${p1Score} - IA: ${p2Score}`;
    }

    const memoryRank = document.getElementById('memory-rank');
    if (memoryRank) {
        const message = formatMemoryRank();
        memoryRank.textContent = message;
        memoryRank.classList.toggle('hidden', !message);
    }

    setTimeout(() => {
        document.getElementById('game-over').classList.remove('hidden');
    }, 500);
}

function restartGame() {
    document.getElementById('game-over').classList.add('hidden');
    const cardCount = totalPairs > 0 ? totalPairs * 2 : 12;
    startGame(cardCount);
}

function returnToMenu() {
    document.getElementById('game-over').classList.add('hidden');
    resetTimer();
    setScreen('mode');
}

function showMenu() {
    if (currentScreen === 'game') {
        promptExitConfirmation('difficulty');
        return;
    }

    if (history.state?.screen === 'game') {
        history.back();
    } else {
        setScreen('difficulty');
    }
}

function handleBackAction() {
    if (currentScreen === 'game') {
        promptExitConfirmation('difficulty');
    } else {
        showMenu();
    }
}

function getDifficulty(cardCount) {
    if (cardCount === 12) return 'easy';
    if (cardCount === 18) return 'medium';
    return 'hard';
}

function rememberCard(card) {
    if (card.classList.contains('matched')) return;
    const icon = card.dataset.icon;
    if (!cpuMemory.has(icon)) {
        cpuMemory.set(icon, new Set());
    }
    cpuMemory.get(icon).add(card);
}

function cpuTakeTurn(forceSmart = false) {
    if (matchedPairs === totalPairs) return;
    opponentActive = true;
    isLocked = false;

    const [firstCard, secondCard] = pickCpuCards(forceSmart);
    if (!firstCard || !secondCard) {
        opponentActive = false;
        return;
    }

    setTimeout(() => {
        flipCard(firstCard);
        setTimeout(() => {
            flipCard(secondCard);
            opponentActive = false;
        }, 700);
    }, 600);
}

function pickCpuCards(forceSmart = false) {
    const knowledgeChance = forceSmart
        ? 1
        : currentDifficulty === 'easy'
            ? 0.4
            : currentDifficulty === 'medium'
                ? 0.7
                : 1;
    const availableCards = Array.from(document.querySelectorAll('.card')).filter(card => !card.classList.contains('matched'));

    const knownPairs = [];
    cpuMemory.forEach((cards, icon) => {
        const unseen = Array.from(cards).filter(card => !card.classList.contains('matched'));
        if (unseen.length >= 2) knownPairs.push(unseen.slice(0, 2));
    });

    if (knownPairs.length && Math.random() <= knowledgeChance) {
        const pair = knownPairs[Math.floor(Math.random() * knownPairs.length)];
        return pair;
    }

    let firstCard = null;
    const knownSingles = [];
    cpuMemory.forEach((cards) => {
        const unseen = Array.from(cards).filter(card => !card.classList.contains('matched'));
        if (unseen.length === 1) knownSingles.push(unseen[0]);
    });

    if (knownSingles.length && Math.random() <= knowledgeChance) {
        firstCard = knownSingles[Math.floor(Math.random() * knownSingles.length)];
    }

    if (!firstCard) {
        const hidden = availableCards.filter(card => !card.classList.contains('flipped'));
        firstCard = hidden[Math.floor(Math.random() * hidden.length)];
    }

    let secondCard = null;
    const knownMatch = cpuMemory.get(firstCard.dataset.icon);
    if (knownMatch && Math.random() <= knowledgeChance) {
        const candidates = Array.from(knownMatch).filter(card => card !== firstCard && !card.classList.contains('matched'));
        if (candidates.length) {
            secondCard = candidates[Math.floor(Math.random() * candidates.length)];
        }
    }

    if (!secondCard) {
        const hiddenOptions = availableCards.filter(card => card !== firstCard && !card.classList.contains('flipped'));
        secondCard = hiddenOptions[Math.floor(Math.random() * hiddenOptions.length)];
    }

    return [firstCard, secondCard];
}

async function aiTakeTurn() {
    if (matchedPairs === totalPairs) return;
    opponentActive = true;
    isLocked = false;

    const suggestedIndexes = await requestAiMove();
    const suggestedCards = mapIndexesToCards(suggestedIndexes);
    const fallbackCards = pickCpuCards(true);
    const [firstCard, secondCard] = suggestedCards.length === 2 ? suggestedCards : fallbackCards;

    if (!firstCard || !secondCard) {
        opponentActive = false;
        return;
    }

    setTimeout(() => {
        flipCard(firstCard);
        setTimeout(() => {
            flipCard(secondCard);
            opponentActive = false;
        }, 700);
    }, 600);
}

async function requestAiMove() {
    if (!window.aiConfig?.apiEnabled) return [];

    try {
        const response = await fetch('/api/ai-move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: buildAiState() }),
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json();
        if (Array.isArray(payload.cards) && payload.cards.length === 2) {
            return payload.cards.map((value) => parseInt(value, 10)).filter((value) => !Number.isNaN(value));
        }
    } catch (error) {
        console.warn('Error requesting AI move, using fallback strategy.', error);
    }

    return [];
}

function buildAiState() {
    const cards = Array.from(document.querySelectorAll('.card'));
    return {
        difficulty: currentDifficulty,
        totalPairs,
        scores: { player: p1Score, opponent: p2Score },
        board: cards.map((card) => ({
            index: parseInt(card.dataset.index, 10),
            status: card.classList.contains('matched')
                ? 'matched'
                : card.classList.contains('flipped')
                    ? 'flipped'
                    : 'hidden',
            icon: card.classList.contains('matched') || card.classList.contains('flipped') ? card.dataset.icon : null,
        })),
        memory: serializeCpuMemory(),
    };
}

function serializeCpuMemory() {
    const memory = {};
    cpuMemory.forEach((cards, icon) => {
        const indexes = Array.from(cards)
            .map((card) => parseInt(card.dataset.index, 10))
            .filter((value) => !Number.isNaN(value));
        if (indexes.length) {
            memory[icon] = indexes;
        }
    });
    return memory;
}

function mapIndexesToCards(indexes) {
    if (!Array.isArray(indexes)) return [];
    const cardMap = new Map(
        Array.from(document.querySelectorAll('.card')).map((card) => [parseInt(card.dataset.index, 10), card]),
    );

    return indexes
        .map((index) => cardMap.get(index))
        .filter((card) => card && !card.classList.contains('matched') && !card.classList.contains('flipped'));
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ screen: 'mode' }, '', '#mode');
    setScreen('mode', { pushHistory: false });

    window.addEventListener('popstate', (event) => {
        const targetScreen = event.state?.screen || 'mode';
        if (currentScreen === 'game' && targetScreen !== 'game') {
            promptExitConfirmation(targetScreen);
            history.pushState({ screen: 'game' }, '', '#game');
            return;
        }

        setScreen(targetScreen, { pushHistory: false });
    });

    attachButtonPressEffect('#mode-menu button');
    attachButtonPressEffect('#difficulty-menu button');
    attachButtonPressEffect('.header button');
    attachButtonPressEffect('#game-over button');
    attachButtonPressEffect('#settings-modal button');
    attachButtonPressEffect('#exit-confirm button');
    attachButtonPressEffect('#settings-trigger');

    const exitConfirm = document.getElementById('exit-confirm');
    if (exitConfirm) {
        document.getElementById('exit-confirm-yes')?.addEventListener('click', confirmExitLevel);
        document.getElementById('exit-confirm-no')?.addEventListener('click', cancelExitLevel);
    }

    const audioToggle = document.getElementById('audio-toggle');
    const musicSelect = document.getElementById('music-select');
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');

    if (audioToggle && musicSlider && sfxSlider && musicSelect && window.soundManager) {
        audioToggle.checked = soundManager.enabled;
        musicSlider.value = soundManager.musicVolume;
        sfxSlider.value = soundManager.sfxVolume;
        musicSelect.value = String(soundManager.currentMusicIndex ?? 0);

        audioToggle.addEventListener('change', (event) => {
            soundManager.setEnabled(event.target.checked);
        });

        musicSlider.addEventListener('input', (event) => {
            soundManager.setMusicVolume(parseFloat(event.target.value));
        });

        sfxSlider.addEventListener('input', (event) => {
            soundManager.setSfxVolume(parseFloat(event.target.value));
        });

        musicSelect.addEventListener('change', (event) => {
            const newIndex = parseInt(event.target.value, 10);
            if (!Number.isNaN(newIndex)) {
                soundManager.selectMusic(newIndex);
            }
        });
    }

    document.addEventListener('pointerdown', () => soundManager.ensureMusicPlaying(), { once: true });
});

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function promptExitConfirmation(targetScreen) {
    pendingExitTarget = targetScreen;
    pauseTimer();
    document.getElementById('exit-confirm').classList.remove('hidden');
}

function confirmExitLevel() {
    const target = pendingExitTarget || 'difficulty';
    pendingExitTarget = null;
    document.getElementById('exit-confirm').classList.add('hidden');
    resetTimer();
    setScreen(target);
}

function cancelExitLevel() {
    pendingExitTarget = null;
    document.getElementById('exit-confirm').classList.add('hidden');
    resumeTimer();
}
