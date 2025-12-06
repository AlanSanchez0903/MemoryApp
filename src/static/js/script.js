const icons = [
    '🍎', '🍌', '🍇', '🍉', '🍓', '🍒',
    '🍍', '🥝', '🥑', '🍆', '🥕', '🌽'
];

let gameInterval;
let startTime;
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let isLocked = false;

let currentMode = 1;
let currentPlayer = 1;
let p1Score = 0;
let p2Score = 0;
let currentDifficulty = 'easy';

let cpuMemory = new Map();
let cpuActive = false;
const FLIP_ANIMATION_MS = 500;

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

function selectMode(mode) {
    currentMode = mode;
    document.getElementById('mode-menu').classList.add('hidden');
    document.getElementById('difficulty-menu').classList.remove('hidden');
}

function showModeMenu() {
    document.getElementById('difficulty-menu').classList.add('hidden');
    document.getElementById('mode-menu').classList.remove('hidden');
}

function startGame(cardCount) {
    document.getElementById('difficulty-menu').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    document.getElementById('game-over').classList.add('hidden');

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
    cpuActive = false;

    // Generate deck
    let deck = icons.slice(0, totalPairs);
    deck = [...deck, ...deck]; // Duplicate for pairs
    deck.sort(() => Math.random() - 0.5); // Shuffle

    // Create cards
    deck.forEach(icon => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.icon = icon;

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
    }
}

function flipCard(card) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (currentMode === 3 && currentPlayer === 2 && !cpuActive) return;

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
        } else if (currentMode === 3) {
            if (currentPlayer === 1) p1Score++;
            else p2Score++;
            updateScoreUI();
            if (currentPlayer === 2 && matchedPairs !== totalPairs) {
                setTimeout(cpuTakeTurn, 500);
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
            } else if (currentMode === 3) {
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                updateScoreUI();
                if (currentPlayer === 2) {
                    setTimeout(cpuTakeTurn, 500);
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
    startTime = Date.now();
    gameInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        document.getElementById('time').textContent = `${minutes}:${seconds}`;
    }, 1000);
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
    }

    setTimeout(() => {
        document.getElementById('game-over').classList.remove('hidden');
    }, 500);
}

function showMenu() {
    clearInterval(gameInterval);
    document.getElementById('game').classList.add('hidden');
    document.getElementById('difficulty-menu').classList.remove('hidden');
    document.getElementById('time').textContent = '00:00';
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

function cpuTakeTurn() {
    if (matchedPairs === totalPairs) return;
    cpuActive = true;
    isLocked = false;

    const [firstCard, secondCard] = pickCpuCards();
    if (!firstCard || !secondCard) {
        cpuActive = false;
        return;
    }

    setTimeout(() => {
        flipCard(firstCard);
        setTimeout(() => {
            flipCard(secondCard);
            cpuActive = false;
        }, 700);
    }, 600);
}

function pickCpuCards() {
    const knowledgeChance = currentDifficulty === 'easy' ? 0.4 : currentDifficulty === 'medium' ? 0.7 : 1;
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    attachButtonPressEffect('#mode-menu button');
    attachButtonPressEffect('#difficulty-menu button');
    attachButtonPressEffect('.header button');
    attachButtonPressEffect('#game-over button');
    attachButtonPressEffect('#settings-modal button');
    attachButtonPressEffect('#settings-trigger');

    const audioToggle = document.getElementById('audio-toggle');
    const musicSelect = document.getElementById('music-select');
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');

    if (audioToggle && musicSlider && sfxSlider && musicSelect && window.soundManager) {
        audioToggle.checked = soundManager.enabled;
        musicSlider.value = soundManager.musicVolume;
        sfxSlider.value = soundManager.sfxVolume;
        musicSelect.value = String(soundManager.currentMusicIndex ?? 0);

        soundManager.ensureMusicPlaying();

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
