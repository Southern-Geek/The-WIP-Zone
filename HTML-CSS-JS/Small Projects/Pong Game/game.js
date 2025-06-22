const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const PADDLE_MARGIN = 18;
const BALL_RADIUS = 10;
const PLAYER_COLOR = "#4FC3F7";
const AI_COLOR = "#FF7043";
const BALL_COLOR = "#FFFDE7";
const NET_COLOR = "#FFEB3B";
const NET_WIDTH = 4;
const NET_SEGMENT = 24;

// State
let playerY = (canvas.height - PADDLE_HEIGHT) / 2;
let aiY = (canvas.height - PADDLE_HEIGHT) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeed = 6;
let ballVelX = ballSpeed * (Math.random() < 0.5 ? -1 : 1);
let ballVelY = (Math.random() - 0.5) * 8;
let playerScore = 0;
let aiScore = 0;

// Mouse input: update playerY
canvas.addEventListener('mousemove', function (evt) {
    const rect = canvas.getBoundingClientRect();
    const mouseY = evt.clientY - rect.top;
    playerY = mouseY - PADDLE_HEIGHT / 2;
    // Clamp paddle within the canvas
    playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, playerY));
});

// Draw net
function drawNet() {
    ctx.fillStyle = NET_COLOR;
    for (let y = 0; y < canvas.height; y += NET_SEGMENT * 2) {
        ctx.fillRect(canvas.width / 2 - NET_WIDTH / 2, y, NET_WIDTH, NET_SEGMENT);
    }
}

// Draw paddles
function drawPaddle(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
}

// Draw ball
function drawBall(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.closePath();
}

// Draw scores
function drawScore() {
    ctx.font = "36px Arial";
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillText(playerScore, canvas.width * 0.25, 48);
    ctx.fillStyle = AI_COLOR;
    ctx.fillText(aiScore, canvas.width * 0.75, 48);
}

// AI movement (simple tracking)
function updateAI() {
    const center = aiY + PADDLE_HEIGHT / 2;
    if (center < ballY - 12) {
        aiY += 5;
    } else if (center > ballY + 12) {
        aiY -= 5;
    }
    // Clamp AI paddle within canvas
    aiY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiY));
}

// Collision detection
function collidePaddle(px, py, bx, by) {
    return (
        bx + BALL_RADIUS > px &&
        bx - BALL_RADIUS < px + PADDLE_WIDTH &&
        by + BALL_RADIUS > py &&
        by - BALL_RADIUS < py + PADDLE_HEIGHT
    );
}

// Reset ball after a score
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeed = 6;
    ballVelX = ballSpeed * (Math.random() < 0.5 ? -1 : 1);
    ballVelY = (Math.random() - 0.5) * 8;
}

// Game update loop
function update() {
    // Move ball
    ballX += ballVelX;
    ballY += ballVelY;

    // Wall collision (top/bottom)
    if (ballY - BALL_RADIUS < 0) {
        ballY = BALL_RADIUS;
        ballVelY *= -1;
    } else if (ballY + BALL_RADIUS > canvas.height) {
        ballY = canvas.height - BALL_RADIUS;
        ballVelY *= -1;
    }

    // Paddle collision (player)
    if (collidePaddle(PADDLE_MARGIN, playerY, ballX, ballY)) {
        ballX = PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS;
        ballVelX *= -1;
        // Add some effect based on where it hits the paddle
        let deltaY = ballY - (playerY + PADDLE_HEIGHT / 2);
        ballVelY = deltaY * 0.28;
        ballSpeed *= 1.05;
        ballVelX = Math.sign(ballVelX) * ballSpeed;
    }

    // Paddle collision (AI)
    if (collidePaddle(canvas.width - PADDLE_MARGIN - PADDLE_WIDTH, aiY, ballX, ballY)) {
        ballX = canvas.width - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS;
        ballVelX *= -1;
        let deltaY = ballY - (aiY + PADDLE_HEIGHT / 2);
        ballVelY = deltaY * 0.28;
        ballSpeed *= 1.05;
        ballVelX = Math.sign(ballVelX) * ballSpeed;
    }

    // Score check
    if (ballX - BALL_RADIUS < 0) {
        aiScore++;
        resetBall();
    } else if (ballX + BALL_RADIUS > canvas.width) {
        playerScore++;
        resetBall();
    }

    // Update AI paddle position
    updateAI();
}

// Drawing everything
function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Net
    drawNet();

    // Paddles
    drawPaddle(PADDLE_MARGIN, playerY, PLAYER_COLOR);
    drawPaddle(canvas.width - PADDLE_MARGIN - PADDLE_WIDTH, aiY, AI_COLOR);

    // Ball
    drawBall(ballX, ballY);

    // Score
    drawScore();
}

// Main game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();