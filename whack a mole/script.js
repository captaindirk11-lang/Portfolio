// Game script for simple whack-a-mole style interaction
document.addEventListener('DOMContentLoaded', () => {
    const targets = Array.from(document.querySelectorAll('.target'));
    const gameboard = document.getElementById('gameboard');
    const playArea = document.getElementById('playArea');
    const scoreEl = document.getElementById('score');
    const multiplierEl = document.getElementById('multiplier');
    const timerBar = document.getElementById('timerBar');
    const targetNameEl = document.getElementById('targetName');
    const directiveThumb = document.getElementById('directiveThumb');
    const livesEl = document.getElementById('lives');
    const timerEl = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const gameOverEl = document.getElementById('gameOver');
    const finalScoreEl = document.getElementById('finalScore');
    const playAgainBtn = document.getElementById('playAgain');

    if (!gameboard || !playArea || targets.length === 0) return;

    // audio
    const audio = {
        hover1: new Audio('audio/hover1.mp3'),
        hover2: new Audio('audio/hover2.mp3'),
        hover3: new Audio('audio/hover3.mp3'),
        yes: new Audio('audio/yes.mp3'),
        no: new Audio('audio/no.mp3'),
        soundscape: new Audio('audio/soundscape.mp3')
    };
    audio.soundscape.loop = true;
    audio.soundscape.volume = 0.2;
    // Do not autoplay the soundscape on load. It will start when the player presses Start.

    let score = 0;
    let streak = 0;
    let multiplier = 1;
    let activeIndex = -1;
    let spawnInterval = 2200; // ms between spawn cycles (plus revealDelay)
    let activeDuration = 3500; // ms how long a spawned target stays active before being missed (3.5 seconds)
    let timerId = null;
    let revealDelay = 700; // time (ms) to show directive before target appears
    let lives = 3;
    let timeLeft = 60; // seconds
    let countdownId = null;
    let running = false;

    function randomPositionFor(el) {
        const pad = 16; // keep targets away from edges of playArea
        const rect = playArea.getBoundingClientRect();
        const w = Math.max(0, rect.width - el.offsetWidth - pad * 2);
        const h = Math.max(0, rect.height - el.offsetHeight - pad * 2);
        const x = Math.floor(Math.random() * w) + pad;
        const y = Math.floor(Math.random() * h) + pad;
        // convert to coordinates relative to playArea (absolute positioning inside playArea)
        return { x, y };
    }

    function activate(index) {
        if (activeIndex >= 0) deactivate(activeIndex);
        const el = targets[index];
        const pos = randomPositionFor(el);
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        el.classList.add('active');
        activeIndex = index;
        const name = el.dataset.name || el.alt || ('Object ' + (index + 1));
        if (targetNameEl) targetNameEl.textContent = name;
        if (directiveThumb && el.src) directiveThumb.src = el.src;
        // visually highlight the directive target
        targets.forEach(t => t.classList.remove('highlight'));
        el.classList.add('highlight');
    }

    function deactivateAllDecoys() {
        targets.forEach(t => {
            if (t.classList.contains('decoy')) {
                t.classList.remove('decoy', 'active');
            }
        });
    }

    function deactivate(index) {
        const el = targets[index];
        if (!el) return;
        el.classList.remove('active');
        if (activeIndex === index) activeIndex = -1;
    }


    // current directive index (the correct object to click)
    let directiveIndex = -1;
    let directiveRounds = 0; // how many rounds this directive has been active

    function showMissEffect() {
        playArea.classList.add('miss');
        setTimeout(() => playArea.classList.remove('miss'), 250);
    }

    function updateMultiplier() {
        if (multiplierEl) {
            multiplierEl.textContent = multiplier > 1 ? `x${multiplier}` : '';
        }
    }

    function updateTimerBar() {
        if (timerBar) {
            timerBar.style.width = (timeLeft / 60 * 100) + '%';
        }
    }

    function spawn() {
        // Only change directive every 3 rounds
        if (directiveRounds <= 0 || directiveIndex === -1) {
            let idx = Math.floor(Math.random() * targets.length);
            // avoid picking the same as last time if possible
            if (targets.length > 1 && idx === directiveIndex) {
                idx = (idx + 1) % targets.length;
            }
            directiveIndex = idx;
            directiveRounds = 3;
            // Show directive text/thumb
            const name = targets[directiveIndex].dataset.name || targets[directiveIndex].alt || ('Object ' + (directiveIndex + 1));
            if (targetNameEl) targetNameEl.textContent = name;
            if (directiveThumb && targets[directiveIndex].src) directiveThumb.src = targets[directiveIndex].src;
        } else {
            directiveRounds--;
        }
        // remove any highlight briefly then re-add on reveal
        targets.forEach(t => t.classList.remove('highlight'));
        // After reveal delay, show the actual target
        setTimeout(() => {
            const idx = directiveIndex;
            // If game stopped or directive changed, don't activate
            if (!running || directiveIndex !== idx) return;
            // clear previous decoys
            deactivateAllDecoys();
            activate(idx);
            // schedule deactivation (timeout shorter than interval)
            // decoys: only 20% chance, only 1 decoy, never overlap main target
            const maxDecoys = Math.min(1, targets.length - 1);
            if (maxDecoys > 0 && Math.random() < 0.2) {
                const pool = targets.map((_, i) => i).filter(i => i !== idx);
                const di = pool[Math.floor(Math.random() * pool.length)];
                const dec = targets[di];
                const p = randomPositionFor(dec);
                dec.style.left = p.x + 'px';
                dec.style.top = p.y + 'px';
                dec.classList.add('active', 'decoy');
                setTimeout(() => {
                    if (dec.classList.contains('decoy')) dec.classList.remove('decoy', 'active');
                }, activeDuration);
            }

            setTimeout(() => {
                if (activeIndex === idx) {
                    // missed: quietly deactivate and remove highlight, lose a life
                    deactivate(idx);
                    targets[idx].classList.remove('highlight');
                    // remove any decoys
                    deactivateAllDecoys();
                    loseLife();
                }
            }, activeDuration);
        }, revealDelay);
    }

    // (old start() removed — use startGame/pauseGame instead)

    targets.forEach((t, i) => {
        // ensure targets are positioned absolutely
        t.style.position = 'absolute';

        t.addEventListener('mouseenter', () => {
            // map hover sounds by name for clarity
            const name = (t.dataset.name || t.alt || '').toLowerCase();
            let s = null;
            if (name.includes('jonah')) s = audio.hover1;
            else if (name.includes('bryson')) s = audio.hover2;
            else if (name.includes('dirk')) s = audio.hover3;
            else s = [audio.hover1, audio.hover2, audio.hover3][i % 3];
            if (s) { s.currentTime = 0; s.play().catch(() => { }); }
        });

        t.addEventListener('click', (e) => {
            // Only handle clicks when running
            if (!running) return;
            const isActive = t.classList.contains('active');
            const isDecoy = t.classList.contains('decoy');
            const isDirective = (i === directiveIndex);
            if (isActive && !isDecoy && isDirective) {
                // correct
                streak++;
                multiplier = 1 + Math.floor(streak / 5);
                score += multiplier;
                if (scoreEl) scoreEl.textContent = score;
                updateMultiplier();
                audio.yes.currentTime = 0;
                audio.yes.play().catch(() => { });
                t.classList.remove('active');
                activeIndex = -1;
                directiveIndex = -1;
                if (targetNameEl) targetNameEl.textContent = '—';
                targets.forEach(tt => tt.classList.remove('highlight'));
                // increase difficulty gently every 5 correct hits, but never too fast or too short
                if (score > 0 && score % 5 === 0) {
                    if (spawnInterval > 1200) spawnInterval = Math.max(1200, spawnInterval - 150);
                    if (activeDuration > 2500) activeDuration = Math.max(2500, activeDuration - 200);
                }
            } else {
                // wrong object clicked (decoy, inactive, or wrong target): deduct points and play 'no'
                streak = 0;
                multiplier = 1;
                updateMultiplier();
                score = Math.max(0, score - 1);
                if (scoreEl) scoreEl.textContent = score;
                audio.no.currentTime = 0;
                audio.no.play().catch(() => { });
                showMissEffect();
                loseLife();
            }
            e.stopPropagation();
        });
    });

    // clicking empty board is a miss (only when running)
    gameboard.addEventListener('click', () => {
        if (!running) return;
        streak = 0;
        multiplier = 1;
        updateMultiplier();
        audio.no.currentTime = 0;
        audio.no.play().catch(() => { });
        showMissEffect();
        score = Math.max(0, score - 1);
        if (scoreEl) scoreEl.textContent = score;
        loseLife();
    });

    function loseLife() {
        lives = Math.max(0, lives - 1);
        if (livesEl) livesEl.textContent = lives;
        if (lives <= 0) endGame();
    }

    function startCountdown() {
        if (countdownId) clearInterval(countdownId);
        countdownId = setInterval(() => {
            if (!running) return;
            timeLeft -= 1;
            if (timerEl) timerEl.textContent = timeLeft;
            updateTimerBar();
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function resetGame() {
        // reset all state
        score = 0; streak = 0; multiplier = 1;
        if (scoreEl) scoreEl.textContent = score;
        updateMultiplier();
        spawnInterval = 1200; revealDelay = 700; lives = 3; timeLeft = 60;
        if (livesEl) livesEl.textContent = lives; if (timerEl) timerEl.textContent = timeLeft;
        updateTimerBar();
        directiveIndex = -1; activeIndex = -1; targets.forEach(t => { t.classList.remove('active', 'highlight'); });
        if (finalScoreEl) finalScoreEl.textContent = score;
        // hide game over overlay (both class and inline style to be robust)
        if (gameOverEl) {
            gameOverEl.classList.add('hidden');
            try { gameOverEl.style.display = 'none'; } catch (e) { }
        }
        // stop the soundscape
        try { audio.soundscape.pause(); audio.soundscape.currentTime = 0; } catch (e) { }
    }

    function startGame() {
        if (running) return;
        running = true;
        startBtn.disabled = true; pauseBtn.disabled = false; restartBtn.disabled = false;
        startCountdown();
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => { if (running) spawn(); }, spawnInterval + revealDelay);
        // ensure gameOver overlay hidden when starting
        if (gameOverEl) { gameOverEl.classList.add('hidden'); try { gameOverEl.style.display = 'none'; } catch (e) { } }
        // start soundscape
        try { audio.soundscape.play().catch(() => { }); } catch (e) { }
        // immediately spawn one directive
        spawn();
    }

    function pauseGame() {
        running = false;
        startBtn.disabled = false; pauseBtn.disabled = true;
        // pause soundscape
        try { audio.soundscape.pause(); } catch (e) { }
    }

    function endGame() {
        running = false;
        if (timerId) clearInterval(timerId);
        if (countdownId) clearInterval(countdownId);
        if (finalScoreEl) finalScoreEl.textContent = score;
        // stop soundscape
        try { audio.soundscape.pause(); audio.soundscape.currentTime = 0; } catch (e) { }
        if (gameOverEl) {
            gameOverEl.classList.remove('hidden');
            try { gameOverEl.style.display = 'flex'; } catch (e) { }
        }
    }

    // wire controls
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
    if (restartBtn) restartBtn.addEventListener('click', () => { resetGame(); startGame(); if (gameOverEl) gameOverEl.classList.add('hidden'); });
    if (playAgainBtn) playAgainBtn.addEventListener('click', () => { resetGame(); startGame(); if (gameOverEl) gameOverEl.classList.add('hidden'); });

    // initialize UI state
    resetGame();
    pauseBtn.disabled = true;
    restartBtn.disabled = true;

    // responsive: restart spawn when resized — keep interval aligned with revealDelay
    window.addEventListener('resize', () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = setInterval(() => { if (running) spawn(); }, spawnInterval + revealDelay);
        }
    });
});

