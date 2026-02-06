// game-core.js
// Single straight-path core with single chaser, input queue, chaser spawn delay and 2s spawn protection
// Compact ~500-550 line version.

window.onload = () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.tabIndex = 0;
    canvas.style.outline = "none";

    // Optional audio element ids (placeholders)
    const coinSound = document.getElementById("coinSound");
    const whooshSound = document.getElementById("whooshSound");
    const powerSound = document.getElementById("powerSound");
    const bigCoinSound = document.getElementById("bigCoinSound");

    const Game = window.Game = {
        canvas, ctx,
        tileSize: 32,
        viewW: canvas.width, viewH: canvas.height,

        // grid growth
        BASE_COLS: 13, BASE_ROWS: 13, FLOOR_GROW_PER: 2,
        cols: 13, rows: 13,

        // world
        dungeon: [], path: [], coins: [], bigCoins: [], powerups: [], spikes: [],
        particles: [], ripples: [], playerTrail: [],

        // Sliding player state
        player: {
            x: 0, y: 0,
            from: { x: 0, y: 0 }, to: { x: 0, y: 0 },
            moveTimer: 0,
            moveDuration: 0.09,
            sliding: false,
            dir: [0, 0]
        },

        // queued direction: single item input queue; null if empty
        queuedDir: null,

        // powerups (kept as structure for compatibility)
        activePowerups: {
            speed: { on: false, t: 0, dur: 0 },
            invul: { on: false, t: 0, dur: 0 },
            magnet: { on: false, t: 0, dur: 0 },
            slowTime: { on: false, t: 0, dur: 0 }
        },

        // single chaser
        chaser: {
            active: false, x: 0, y: 0,
            baseInterval: 0.18, stepInterval: 0.18, stepTimer: 0,
            minInterval: 0.06, color: "#ff5577", interpX: 0, interpY: 0,
            spawnDelay: 2.2, spawnTimer: 0, hasSpawned: false
        },

        // spawn protection so player isn't killed immediately when chaser appears
        spawnProtection: {
            on: false,
            t: 0,
            dur: 2.0
        },

        settings: { cameraLerp: 0.12 },
        currentFloor: 1, score: 0, combo: 1, comboTimer: 0, highScore: 0,
        theme: {}, effects: { flashAlpha: 0, vignette: 0, preChaserCue: false },

        // renderer hooks (to be overridden)
        spawnParticles: () => { }, updateParticles: () => { },
        triggerRipple: () => { }, updateRipples: () => { }, draw: () => { }
    };

    // Input
    let keysDown = {};
    const codes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyT"];
    window.addEventListener("keydown", e => {
        if (!codes.includes(e.code)) return;
        e.preventDefault();
        keysDown[e.code] = true;

        // map movement keys to directions
        const dir = keyToDir(e.code);
        if (dir) {
            if (Game.player.sliding) {
                if (!Game.queuedDir) Game.queuedDir = dir;
            } else {
                startSlide(dir[0], dir[1]);
            }
        }

        if (document.activeElement !== canvas) canvas.focus();
    }, { passive: false });

    window.addEventListener("keyup", e => {
        if (!codes.includes(e.code)) return;
        e.preventDefault();
        keysDown[e.code] = false;
    }, { passive: false });

    window.addEventListener("blur", () => { keysDown = {}; });

    function keyToDir(code) {
        switch (code) {
            case "ArrowUp": case "KeyW": return [0, -1];
            case "ArrowDown": case "KeyS": return [0, 1];
            case "ArrowLeft": case "KeyA": return [-1, 0];
            case "ArrowRight": case "KeyD": return [1, 0];
            default: return null;
        }
    }

    // RNG
    function mulberry32(a) { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    let rngSeed = 987654321; let rng = mulberry32(rngSeed);
    function reseed(s) { rng = mulberry32(s); }

    // theme
    function hsl(h, s, l) { return `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`; }
    function generateTheme(f) {
        const hue = (f * 47) % 360;
        Game.theme = { hue, bg: hsl(hue, 20, 12), path: hsl(hue, 30, 38), pathOutline: hsl(hue, 25, 22), trail: hsl(hue + 180, 100, 50), coin: hsl(hue + 50, 90, 60), bigCoin: hsl(hue + 40, 100, 85), ripple: hsl(hue + 180, 100, 50), aura: hsl(hue + 180, 100, 50) };
    }

    function inBounds(x, y) { return x >= 1 && x < Game.cols - 1 && y >= 1 && y < Game.rows - 1; }
    function isWalkable(x, y) { return inBounds(x, y) && Game.dungeon[y][x] === 0; }

    // ---- SINGLE PATH GENERATOR ----
    function generateSinglePath(w, h) {
        const grid = Array.from({ length: h }, () => Array(w).fill(1));
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
        const sx = Math.floor(w / 2), sy = h - 2;
        const stack = [{ x: sx, y: sy }];
        grid[sy][sx] = 0;

        while (stack.length) {
            const cur = stack[stack.length - 1];
            const neighbors = [];
            for (const [dx, dy] of shuffle(dirs.slice())) {
                const nx = cur.x + dx * 2; const ny = cur.y + dy * 2;
                if (ny > 0 && ny < h - 1 && nx > 0 && nx < w - 1 && grid[ny][nx] === 1) {
                    let openCount = 0;
                    for (const [adx, ady] of dirs) {
                        const ax = nx + adx, ay = ny + ady;
                        if (ax >= 0 && ax < w && ay >= 0 && ay < h && grid[ay][ax] === 0) openCount++;
                    }
                    if (openCount <= 1) neighbors.push({ nx, ny, bx: cur.x + dx, by: cur.y + dy });
                }
            }
            if (neighbors.length === 0) {
                stack.pop();
                continue;
            }
            const choice = neighbors[Math.floor(rng() * neighbors.length)];
            grid[choice.by][choice.bx] = 0;
            grid[choice.ny][choice.nx] = 0;
            stack.push({ x: choice.nx, y: choice.ny });
        }

        // Extract the single longest corridor path from the start (farthest walk)
        function getWalkNeighbors(x, y) {
            const out = [];
            if (y - 1 >= 0 && grid[y - 1][x] === 0) out.push({ x, y: y - 1 });
            if (y + 1 < h && grid[y + 1][x] === 0) out.push({ x, y: y + 1 });
            if (x - 1 >= 0 && grid[y][x - 1] === 0) out.push({ x: x - 1, y });
            if (x + 1 < w && grid[y][x + 1] === 0) out.push({ x: x + 1, y });
            return out;
        }

        function bfsFarthest(start) {
            let q = [start], seen = new Set([start.x + "," + start.y]), parent = new Map(), last = start;
            while (q.length) {
                const cur = q.shift(); last = cur;
                for (const n of getWalkNeighbors(cur.x, cur.y)) {
                    const k = n.x + "," + n.y;
                    if (!seen.has(k)) { seen.add(k); parent.set(k, cur); q.push(n); }
                }
            }
            let route = [], k = last;
            while (k) {
                route.push({ x: k.x, y: k.y });
                const p = parent.get(k.x + "," + k.y);
                k = p || null;
            }
            route.reverse();
            return route;
        }

        const start = { x: sx, y: sy };
        const routeA = bfsFarthest(start);
        const routeB = bfsFarthest(routeA[routeA.length - 1]);
        const corridor = routeB;

        // Ensure resulting grid only has corridor tiles open (close any side branches)
        const solid = Array.from({ length: h }, () => Array(w).fill(1));
        corridor.forEach(c => { solid[c.y][c.x] = 0; });
        // Also open the exact connecting between corridor tiles to keep adjacency consistent
        for (let i = 0; i < corridor.length - 1; i++) {
            const a = corridor[i], b = corridor[i + 1];
            const mx = (a.x + b.x) / 2 | 0, my = (a.y + b.y) / 2 | 0;
            solid[my][mx] = 0;
        }

        return { grid: solid, corridor };
    }

    // Floor generation uses single path
    function generateFloor() {
        Game.cols = Game.BASE_COLS + (Game.currentFloor - 1) * Game.FLOOR_GROW_PER;
        Game.rows = Game.BASE_ROWS + (Game.currentFloor - 1) * Game.FLOOR_GROW_PER;
        if (Game.cols % 2 === 0) Game.cols++;
        if (Game.rows % 2 === 0) Game.rows++;

        reseed(rngSeed + Game.currentFloor * 1337);
        const { grid, corridor } = generateSinglePath(Game.cols, Game.rows);

        Game.dungeon = grid;
        Game.path = corridor;

        // place player at path start
        Game.player.x = Game.path[0].x;
        Game.player.y = Game.path[0].y;
        Game.player.from = { x: Game.player.x, y: Game.player.y };
        Game.player.to = { x: Game.player.x, y: Game.player.y };
        Game.player.sliding = false;
        Game.player.moveTimer = 0;

        // reset pickups / spikes
        Game.coins = []; Game.bigCoins = []; Game.powerups = []; Game.spikes = []; Game.particles = []; Game.ripples = []; Game.playerTrail = [];

        // place coins along the single corridor only
        const spacing = 3, bigEvery = 6;
        let placed = 0;
        for (let i = 1; i < Game.path.length; i += spacing) {
            const px = Game.path[i].x, py = Game.path[i].y;
            placed++;
            if (placed % bigEvery === 0) Game.bigCoins.push({ x: px, y: py, shimmer: rng() * Math.PI * 2, value: 50 });
            else Game.coins.push({ x: px, y: py, shimmer: rng() * Math.PI * 2, value: 10 });
        }

        // single chaser spawn (placed near center of path)
        Game.chaser.active = Game.currentFloor >= 2;
        const chaserIndex = Math.min(Math.floor(Game.path.length / 2), Game.path.length - 1);
        Game.chaser.x = Game.path[chaserIndex].x;
        Game.chaser.y = Game.path[chaserIndex].y;
        Game.chaser.stepTimer = 0;
        Game.chaser.baseInterval = Game.chaser.baseInterval || 0.18;
        Game.chaser.minInterval = Game.chaser.minInterval || 0.06;
        const floorsAfter2 = Math.max(0, Game.currentFloor - 2);
        const scale = Math.pow(0.92, floorsAfter2);
        Game.chaser.stepInterval = Math.max(Game.chaser.minInterval, Game.chaser.baseInterval * scale);

        Game.combo = 1; Game.comboTimer = 0;
        generateTheme(Game.currentFloor);

        Game.effects.transitionAlpha = 1; Game.effects.flashAlpha = 0;
    }

    // safe audio play
    function safePlay(sound, rate = 1) { if (!sound) return; try { sound.pause(); sound.playbackRate = rate; sound.currentTime = 0; sound.play().catch(() => { }); } catch (_) { } }

    // ---- Sliding behaviour ----

    // slideTarget not needed externally because corridor is continuous; we step tile-by-tile until blocked
    function startSlide(dx, dy) {
        if (Game.player.sliding) return false;
        const nx = Game.player.x + dx, ny = Game.player.y + dy;
        if (!isWalkable(nx, ny)) return false;
        Game.player.sliding = true;
        Game.player.dir = [dx, dy];
        Game.player.from = { x: Game.player.x, y: Game.player.y };
        Game.player.to = { x: nx, y: ny };
        Game.player.moveTimer = 0;
        safePlay(whooshSound, Game.activePowerups.speed.on ? 1.25 : 1.0);
        return true;
    }

    function stopSlide() {
        Game.player.sliding = false;
        Game.player.dir = [0, 0];
        Game.player.moveTimer = 0;
        Game.player.from = { x: Game.player.x, y: Game.player.y };
        Game.player.to = { x: Game.player.x, y: Game.player.y };
    }

    // ---- BFS pathfinder (unchanged) ----
    function bfsPath(sx, sy, tx, ty) {
        if (!isWalkable(sx, sy) || !isWalkable(tx, ty)) return [];
        if (sx === tx && sy === ty) return [];
        const w = Game.cols, h = Game.rows;
        const q = [{ x: sx, y: sy }];
        const seen = new Set([sx + "," + sy]);
        const parent = new Map();
        const neighbors = (x, y) => {
            const out = [];
            if (y - 1 >= 0 && Game.dungeon[y - 1][x] === 0) out.push({ x, y: y - 1 });
            if (y + 1 < h && Game.dungeon[y + 1][x] === 0) out.push({ x, y: y + 1 });
            if (x - 1 >= 0 && Game.dungeon[y][x - 1] === 0) out.push({ x: x - 1, y });
            if (x + 1 < w && Game.dungeon[y][x + 1] === 0) out.push({ x: x + 1, y });
            return out;
        };
        while (q.length) {
            const cur = q.shift();
            if (cur.x === tx && cur.y === ty) break;
            for (const nb of neighbors(cur.x, cur.y)) {
                const key = nb.x + "," + nb.y;
                if (!seen.has(key)) { seen.add(key); parent.set(key, cur); q.push(nb); }
            }
        }
        const targetKey = tx + "," + ty;
        if (!parent.has(targetKey)) return [];
        const path = []; let curKey = targetKey;
        while (curKey) {
            const [cx, cy] = curKey.split(",").map(Number);
            path.push({ x: cx, y: cy });
            const p = parent.get(curKey);
            curKey = p ? (p.x + "," + p.y) : null;
            if (p && p.x === sx && p.y === sy) break;
        }
        path.reverse();
        if (path.length && path[0].x === sx && path[0].y === sy) path.shift();
        return path;
    }

    // ---- Chaser (single) ----
    function updateChaser(dt) {
        if (!Game.chaser.active) return;
        Game.chaser.stepTimer += dt;

        let effectiveInterval = Game.chaser.stepInterval;
        if (!effectiveInterval || effectiveInterval <= 0) effectiveInterval = Game.chaser.minInterval || 0.06;
        if (Game.activePowerups.slowTime && Game.activePowerups.slowTime.on) effectiveInterval *= 1.4;

        const MAX_STEPS_PER_FRAME = 5;
        let steps = 0;
        while (Game.chaser.stepTimer >= effectiveInterval && steps < MAX_STEPS_PER_FRAME) {
            Game.chaser.stepTimer -= effectiveInterval;
            steps++;

            // compute BFS along single corridor; next step is straightforward
            const path = bfsPath(Game.chaser.x, Game.chaser.y, Game.player.x, Game.player.y);
            if (!path || path.length === 0) break;
            const next = path[0];
            if (isWalkable(next.x, next.y)) {
                Game.chaser.x = next.x; Game.chaser.y = next.y;
            }

            // catch
            const playerIsVulnerable = !(Game.activePowerups.invul && Game.activePowerups.invul.on) && !Game.spawnProtection.on;
            if (Game.chaser.x === Game.player.x && Game.chaser.y === Game.player.y && playerIsVulnerable) {
                Game.combo = 1; Game.comboTimer = 0; Game.effects.flashAlpha = 0.6; Game.score = Math.max(0, Game.score - 25);
                const start = Game.path[0];
                // respawn player and chaser to start
                Game.player.x = start.x; Game.player.y = start.y;
                Game.player.from = { x: start.x, y: start.y }; Game.player.to = { x: start.x, y: start.y }; Game.player.sliding = false;
                Game.chaser.x = start.x; Game.chaser.y = start.y; Game.chaser.stepTimer = 0;
                Game.triggerRipple(start.x, start.y, "#ff4444");
                break;
            }
        }

        if (steps >= MAX_STEPS_PER_FRAME) {
            Game.chaser.stepTimer = Math.min(Game.chaser.stepTimer, effectiveInterval);
        }

        Game.chaser.interpX = Game.chaser.x; Game.chaser.interpY = Game.chaser.y;
    }

    // ---- Spikes / pickups simplified ----
    function updateSpikes(dt) {
        for (const s of Game.spikes) {
            s.timer += dt;
            if (s.state === 0 && s.timer > 3 + rng() * 4) { s.state = 1; s.timer = 0; }
            else if (s.state === 1 && s.timer > 0.8) { s.state = 2; s.timer = 0; }
            else if (s.state === 2 && s.timer > 1.2) { s.state = 0; s.timer = 0; }
            if (s.state === 2 && s.x === Game.player.x && s.y === Game.player.y && !Game.activePowerups.invul.on) {
                Game.combo = 1; Game.comboTimer = 0; Game.effects.flashAlpha = 0.6; Game.score = Math.max(0, Game.score - 10);
                const start = Game.path[0];
                Game.player.x = start.x; Game.player.y = start.y; Game.player.from = { x: start.x, y: start.y }; Game.player.to = { x: start.x, y: start.y }; Game.player.sliding = false;
                Game.chaser.x = start.x; Game.chaser.y = start.y; Game.chaser.stepTimer = 0;
                Game.triggerRipple(start.x, start.y, "#ff5555");
            }
        }
    }

    function collectPickupsOnCommit() {
        // powerups
        Game.powerups = Game.powerups.filter(p => {
            if (Math.round(p.x) === Game.player.x && Math.round(p.y) === Game.player.y) { /*applyPowerup(p)*/; return false; }
            return true;
        });
        // coins
        Game.coins = Game.coins.filter(c => {
            if (Math.round(c.x) === Game.player.x && Math.round(c.y) === Game.player.y) {
                Game.score += (c.value || 10) * Game.combo; Game.combo++; Game.comboTimer = 2; Game.spawnParticles(c.x, c.y, Game.theme.coin); Game.triggerRipple(c.x, c.y, Game.theme.coin); safePlay(coinSound, 1 + Game.combo * 0.05);
                return false;
            }
            return true;
        });
        Game.bigCoins = Game.bigCoins.filter(c => {
            if (Math.round(c.x) === Game.player.x && Math.round(c.y) === Game.player.y) {
                Game.score += (c.value || 50) * Game.combo; Game.combo += 2; Game.comboTimer = 2.6; Game.spawnParticles(c.x, c.y, Game.theme.bigCoin); Game.triggerRipple(c.x, c.y, Game.theme.bigCoin); safePlay(bigCoinSound, 1);
                return false;
            }
            return true;
        });
    }

    function updatePowerups(dt) {
        const p = Game.activePowerups;
        for (const k of Object.keys(p)) {
            if (p[k].on) {
                p[k].t += dt;
                if (p[k].t >= p[k].dur) { p[k].on = false; p[k].t = 0; if (k === "speed") Game.player.moveDuration = 0.09; }
            }
        }
    }

    function updateCombo(dt) { if (Game.comboTimer > 0) { Game.comboTimer -= dt; if (Game.comboTimer <= 0) Game.combo = 1; } }

    // ---- Main update loop adapted for sliding with input queue ----
    let lastTime = performance.now();

    function update(now) {
        const dt = Math.min(0.12, (now - lastTime) / 1000);
        lastTime = now;

        // If not sliding, allow immediate start via held keys too
        if (!Game.player.sliding) {
            // check held keys to begin auto-slide (so holding key also works)
            if (keysDown["ArrowUp"] || keysDown["KeyW"]) startSlide(0, -1);
            else if (keysDown["ArrowDown"] || keysDown["KeyS"]) startSlide(0, 1);
            else if (keysDown["ArrowLeft"] || keysDown["KeyA"]) startSlide(-1, 0);
            else if (keysDown["ArrowRight"] || keysDown["KeyD"]) startSlide(1, 0);
        }

        // sliding progression: commit tile-by-tile automatically until blocked
        if (Game.player.sliding) {
            Game.player.moveTimer += dt;
            if (Game.player.moveTimer > Game.player.moveDuration * 3) Game.player.moveTimer = Game.player.moveDuration;
            const t = Math.min(1, Game.player.moveTimer / Math.max(0.0001, Game.player.moveDuration));
            if (t >= 1) {
                // commit step
                Game.player.x = Game.player.to.x; Game.player.y = Game.player.to.y;
                Game.player.moveTimer = 0;

                collectPickupsOnCommit();

                const s = Game.spikes.find(sp => sp.x === Game.player.x && sp.y === Game.player.y && sp.state === 2);
                if (s && !Game.activePowerups.invul.on) {
                    Game.combo = 1; Game.comboTimer = 0; Game.effects.flashAlpha = 0.6; Game.score = Math.max(0, Game.score - 10);
                    const start = Game.path[0];
                    Game.player.x = start.x; Game.player.y = start.y; Game.player.from = { x: start.x, y: start.y }; Game.player.to = { x: start.x, y: start.y }; Game.player.sliding = false;
                    Game.chaser.x = start.x; Game.chaser.y = start.y; Game.chaser.stepTimer = 0;
                    Game.triggerRipple(start.x, start.y, "#ff5555");
                    Game.queuedDir = null;
                } else {
                    Game.playerTrail.push({ x: Game.player.x, y: Game.player.y, life: 0.36 });

                    // Attempt to apply queued direction first
                    let appliedQueued = false;
                    if (Game.queuedDir) {
                        const qdx = Game.queuedDir[0], qdy = Game.queuedDir[1];
                        const qnx = Game.player.x + qdx, qny = Game.player.y + qdy;
                        if (isWalkable(qnx, qny)) {
                            // apply queued direction: start next step in that direction
                            Game.player.from = { x: Game.player.x, y: Game.player.y };
                            Game.player.to = { x: qnx, y: qny };
                            Game.player.dir = [qdx, qdy];
                            Game.queuedDir = null;
                            appliedQueued = true;
                        } else {
                            // queued direction blocked: clear queue (you could keep it, but we clear so user needs to press again)
                            Game.queuedDir = null;
                        }
                    }

                    if (!appliedQueued) {
                        // If queued direction wasn't applied, try to continue current slide direction
                        const dx = Game.player.dir[0], dy = Game.player.dir[1];
                        const nx = Game.player.x + dx, ny = Game.player.y + dy;
                        if (isWalkable(nx, ny)) {
                            Game.player.from = { x: Game.player.x, y: Game.player.y };
                            Game.player.to = { x: nx, y: ny };
                        } else {
                            // blocked — stop sliding
                            stopSlide();
                        }
                    }
                }
            }
        }

        // --- handle chaser spawn delay and spawn protection ---
        if (!Game.chaser.hasSpawned) {
            if (Game.chaser.spawnTimer > 0) {
                if (Game.chaser.spawnTimer > 0) {
                    Game.chaser.spawnTimer -= dt;
                    // optional: small cue (vignette flash or UI) while waiting
                    if (Game.chaser.spawnTimer < 0.6 && !Game.effects.preChaserCue) { Game.effects.preChaserCue = true; /* renderer can read this */ }
                } else {
                    // spawn now
                    Game.chaser.hasSpawned = true;
                    Game.chaser.active = true;
                    Game.chaser.stepTimer = 0;

                    // grant spawn protection to the player to avoid immediate kill
                    Game.spawnProtection.on = true;
                    Game.spawnProtection.t = 0;

                    // cue visuals/audio
                    Game.effects.vignette = 0.9;
                    if (typeof Game.triggerRipple === "function") Game.triggerRipple(Game.chaser.x, Game.chaser.y, Game.theme.ripple);
                    safePlay(powerSound, 1.0);
                    Game.effects.preChaserCue = false;
                }
            }
        }

        // tick spawn-protection timer
        if (Game.spawnProtection.on) {
            Game.spawnProtection.t += dt;
            if (Game.spawnProtection.t >= Game.spawnProtection.dur) {
                Game.spawnProtection.on = false;
                Game.spawnProtection.t = 0;
                Game.effects.preChaserCue = false;
            }
        }

        // update systems (chaser uses playerIsVulnerable internally)
        updateChaser(dt);
        updateSpikes(dt);
        updatePowerups(dt);
        updateCombo(dt);

        Game.effects.flashAlpha = Math.max(0, Game.effects.flashAlpha - dt * 2.4);
        Game.effects.vignette = Math.max(0, Game.effects.vignette - dt * 0.6);

        Game.updateParticles(dt);
        Game.updateRipples(dt);

        // floor clear
        if (Game.coins.length === 0 && Game.bigCoins.length === 0 && Game.powerups.length === 0) {
            Game.score += 100 * Game.combo;
            Game.combo = 1;
            Game.currentFloor++;
            if (Game.score > Game.highScore) Game.highScore = Game.score;
            Game.triggerRipple(Game.player.x, Game.player.y, Game.theme.ripple);
            Game.effects.vignette = 0.9;
            generateFloor();
        }

        Game.draw();
        requestAnimationFrame(update);
    }

    // renderer stubs (renderer should override these)
    Game.spawnParticles = function (x, y, color, count = 8) { };
    Game.updateParticles = function (dt) { };
    Game.triggerRipple = function (x, y, color) { Game.ripples.push({ x, y, radius: 0, color }); };
    Game.updateRipples = function (dt) { Game.ripples.forEach(r => r.radius += dt * 120); Game.ripples = Game.ripples.filter(r => r.radius < 260); };

    // start when renderer attached
    const startCheck = setInterval(() => {
        if (typeof Game.draw === "function" && Game.draw !== (() => { })) {
            clearInterval(startCheck);
            generateFloor();
            lastTime = performance.now();
            requestAnimationFrame(update);
        }
    }, 10);

    // debug helpers
    Game._debug = {
        resetPlayerTo: (x, y) => { Game.player.x = x; Game.player.y = y; Game.player.from = { x, y }; Game.player.to = { x, y }; Game.player.sliding = false; },
        setSeed: (s) => { rngSeed = s; reseed(s); }
    };
};