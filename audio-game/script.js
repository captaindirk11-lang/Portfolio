let playerSpoke = 0;
let goalSpoke = 3;
let foeSpoke = 6;
let creepSpoke = 9;
let gameOver = false;

document.getElementById("startButton").addEventListener("click", () => {
    document.getElementById("startButton").style.display = "none";
    startNewRound();
});

window.addEventListener("keydown", (event) => {
    if (gameOver) return;

    let moved = false;

    if (event.key === "ArrowRight") {
        playerSpoke = (playerSpoke + 1) % 10;
        foeSpoke = moveToward(goalSpoke, foeSpoke);
        creepSpoke = moveToward(playerSpoke, creepSpoke);
        moved = true;
    }

    if (event.key === "ArrowLeft") {
        playerSpoke = (playerSpoke - 1 + 10) % 10;
        foeSpoke = moveToward(goalSpoke, foeSpoke);
        creepSpoke = moveToward(playerSpoke, creepSpoke);
        moved = true;
    }

    if (event.key === "ArrowUp") {
        goalSpoke = moveToward(playerSpoke, goalSpoke);
        moved = true;
    }

    if (event.key === "ArrowDown") {
        goalSpoke = moveAway(playerSpoke, goalSpoke);
        moved = true;
    }

    if (moved) {
        checkGameState();
        renderGrid();
        playSpatialSounds();
    }
});

function moveToward(target, current) {
    if (current === target) return current;
    const clockwise = (current + 1) % 10;
    const counterClockwise = (current - 1 + 10) % 10;
    const distClockwise = (clockwise - target + 10) % 10;
    const distCounter = (counterClockwise - target + 10) % 10;
    return distClockwise < distCounter ? clockwise : counterClockwise;
}

function moveAway(target, current) {
    if (current === target) return current;
    const clockwise = (current + 1) % 10;
    const counterClockwise = (current - 1 + 10) % 10;
    const distClockwise = (clockwise - target + 10) % 10;
    const distCounter = (counterClockwise - target + 10) % 10;
    return distClockwise > distCounter ? clockwise : counterClockwise;
}

function checkGameState() {
    if (playerSpoke === creepSpoke) {
        alert("You were caught by the creep! Restarting...");
        startNewRound();
    } else if (foeSpoke === goalSpoke) {
        alert("The foe reached the goal first! You failed.");
        startNewRound();
    } else if (playerSpoke === goalSpoke) {
        alert("You reached the goal first! Next level...");
        startNewRound();
    }
}

function startNewRound() {
    playerSpoke = Math.floor(Math.random() * 10);
    goalSpoke = (playerSpoke + 3) % 10;
    foeSpoke = (playerSpoke + 6) % 10;
    creepSpoke = (playerSpoke + 9) % 10;
    gameOver = false;
    renderGrid();
    playSpatialSounds();
}

function renderGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    const centerX = grid.offsetWidth / 2;
    const centerY = grid.offsetHeight / 2;
    const radius = 100;

    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const dot = document.createElement("div");
        dot.className = "dot";
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;

        if (i === playerSpoke) dot.classList.add("player");
        if (i === goalSpoke) dot.classList.add("goal");
        if (i === foeSpoke) dot.classList.add("foe");
        if (i === creepSpoke) dot.classList.add("creep");

        grid.appendChild(dot);
    }
}

function playSpatialSounds() {
    // Placeholder for future sound logic
}