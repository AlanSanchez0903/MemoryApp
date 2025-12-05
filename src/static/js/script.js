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

function selectMode(mode) {
    if (mode === 3) {
        alert("This mode is currently under maintenance. Please check back in a future update!");
        return;
    }

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
    matchedPairs = 0;
    flippedCards = [];
    isLocked = false;

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
    }
}

function flipCard(card) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');
    flippedCards.push(card);

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
        matchedPairs++;
        flippedCards = [];
        isLocked = false;

        if (currentMode === 2) {
            if (currentPlayer === 1) p1Score++;
            else p2Score++;
            updateScoreUI();
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
        gameOverTitle.textContent = "You Won!";
        gameOverMsg.innerHTML = `Time: <span id="final-time">${finalTime}</span>`;
    } else if (currentMode === 2) {
        if (p1Score > p2Score) {
            gameOverTitle.textContent = "Player 1 Wins!";
        } else if (p2Score > p1Score) {
            gameOverTitle.textContent = "Player 2 Wins!";
        } else {
            gameOverTitle.textContent = "It's a Draw!";
        }
        gameOverMsg.innerHTML = `P1: ${p1Score} - P2: ${p2Score}`;
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
