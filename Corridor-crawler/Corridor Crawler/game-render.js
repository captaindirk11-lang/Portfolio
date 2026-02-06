// game-render.js
// Interpolated sliding visuals, eased camera, fixed trail size, chaser draw, particles, HUD.

(function attachRenderer() {
    if (!window.Game) { setTimeout(attachRenderer, 10); return; }
    const Game = window.Game;
    const ctx = Game.ctx;

    // Particle system
    Game.particles = Game.particles || [];
    Game.spawnParticles = function (x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            Game.particles.push({
                x: x * Game.tileSize + Game.tileSize / 2,
                y: y * Game.tileSize + Game.tileSize / 2,
                dx: Math.cos(ang) * speed, dy: Math.sin(ang) * speed,
                life: 0.3 + Math.random() * 0.5,
                color
            });
        }
    };
    Game.updateParticles = function (dt) {
        Game.particles = Game.particles.filter(p => {
            p.x += p.dx * dt; p.y += p.dy * dt;
            p.dx *= 0.95; p.dy *= 0.95;
            p.life -= dt;
            return p.life > 0;
        });
    };

    // Camera
    const camera = { x: 0, y: 0 };
    function easeOutQuad(t) { return t * (2 - t); }

    function camLerpTarget() {
        const tRaw = Math.min(1, Game.player.moveTimer / Math.max(0.0001, Game.player.moveDuration));
        const t = easeOutQuad(tRaw);
        const px = (Game.player.from.x + (Game.player.to.x - Game.player.from.x) * t) * Game.tileSize + Game.tileSize / 2;
        const py = (Game.player.from.y + (Game.player.to.y - Game.player.from.y) * t) * Game.tileSize + Game.tileSize / 2;
        return { tx: px - Game.viewW / 2, ty: py - Game.viewH / 2 };
    }

    function drawBackground() {
        ctx.fillStyle = Game.theme.bg || "#0b0b0b";
        ctx.fillRect(0, 0, Game.viewW, Game.viewH);
    }

    function camOffset() {
        const target = camLerpTarget();
        camera.x += (target.tx - camera.x) * Game.settings.cameraLerp;
        camera.y += (target.ty - camera.y) * Game.settings.cameraLerp;
        return { camX: camera.x, camY: camera.y };
    }

    function drawDungeon(camX, camY) {
        for (let y = 1; y < Game.dungeon.length - 1; y++) {
            for (let x = 1; x < Game.dungeon[0].length - 1; x++) {
                if (Game.dungeon[y][x] === 0) {
                    const sx = x * Game.tileSize - camX;
                    const sy = y * Game.tileSize - camY;
                    ctx.fillStyle = Game.theme.path;
                    ctx.fillRect(sx, sy, Game.tileSize, Game.tileSize);
                    if (Game.settings.showPathOutline) {
                        ctx.strokeStyle = Game.theme.pathOutline;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(sx + 0.5, sy + 0.5, Game.tileSize - 1, Game.tileSize - 1);
                    }
                }
            }
        }
    }

    function drawCoins(camX, camY) {
        for (const c of Game.coins) {
            c.shimmer = (c.shimmer || 0) + 0.12;
            const sx = c.x * Game.tileSize - camX, sy = c.y * Game.tileSize - camY;
            const r = Game.tileSize / 4 + Math.sin(c.shimmer) * 2;
            const cx = sx + Game.tileSize / 2, cy = sy + Game.tileSize / 2;
            const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
            grad.addColorStop(0, Game.theme.coin); grad.addColorStop(1, "#d4a824");
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
        for (const c of Game.bigCoins) {
            c.shimmer = (c.shimmer || 0) + 0.12;
            const sx = c.x * Game.tileSize - camX, sy = c.y * Game.tileSize - camY;
            const r = Game.tileSize / 3 + Math.sin(c.shimmer) * 3;
            const cx = sx + Game.tileSize / 2, cy = sy + Game.tileSize / 2;
            const grad = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
            grad.addColorStop(0, Game.theme.bigCoin); grad.addColorStop(0.5, Game.theme.coin); grad.addColorStop(1, "#ffd966");
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < 0.002) Game.spawnParticles(c.x, c.y, "#fff", 10);
        }
        for (const p of Game.powerups) {
            p.shimmer = (p.shimmer || 0) + 0.1;
            const sx = p.x * Game.tileSize - camX, sy = p.y * Game.tileSize - camY;
            const cx = sx + Game.tileSize / 2, cy = sy + Game.tileSize / 2;
            ctx.save(); ctx.translate(cx, cy);
            const t = 1 + Math.sin(p.shimmer) * 0.06;
            ctx.scale(t, t);
            ctx.fillStyle = p.type === "speed" ? "#88e" : p.type === "invul" ? "#8ff" : p.type === "magnet" ? "#ff8" : "#8f8";
            ctx.beginPath(); ctx.arc(0, 0, Game.tileSize / 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawSpikes(camX, camY) {
        for (const s of Game.spikes) {
            const sx = s.x * Game.tileSize - camX, sy = s.y * Game.tileSize - camY;
            if (s.state === 0) { ctx.fillStyle = "rgba(120,120,120,0.22)"; ctx.fillRect(sx + 6, sy + 6, Game.tileSize - 12, Game.tileSize - 12); }
            else if (s.state === 1) { ctx.fillStyle = "rgba(255,150,50,0.9)"; ctx.fillRect(sx + 4, sy + 4, Game.tileSize - 8, Game.tileSize - 8); }
            else { ctx.fillStyle = "rgba(200,40,40,1)"; ctx.beginPath(); ctx.moveTo(sx + Game.tileSize / 2, sy + 6); ctx.lineTo(sx + Game.tileSize - 8, sy + Game.tileSize - 6); ctx.lineTo(sx + 8, sy + Game.tileSize - 6); ctx.fill(); }
        }
    }

    // Draw player with easeOutQuad and fixed trail size
    function drawPlayer(camX, camY) {
        const tRaw = Math.min(1, Game.player.moveTimer / Math.max(0.0001, Game.player.moveDuration));
        const t = easeOutQuad(tRaw);
        const interpX = Game.player.from.x + (Game.player.to.x - Game.player.from.x) * t;
        const interpY = Game.player.from.y + (Game.player.to.y - Game.player.from.y) * t;
        const px = interpX * Game.tileSize - camX;
        const py = interpY * Game.tileSize - camY;

        // fixed-size trail (no scaling with combo)
        for (const tr of Game.playerTrail) {
            const tx = tr.x * Game.tileSize - camX;
            const ty = tr.y * Game.tileSize - camY;
            ctx.globalAlpha = Math.max(0, tr.life / 0.45);
            ctx.fillStyle = Game.theme.trail;
            ctx.fillRect(tx + 8, ty + 8, Game.tileSize - 16, Game.tileSize - 16);
            ctx.globalAlpha = 1;
        }

        // player body
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 4, py + 4, Game.tileSize - 8, Game.tileSize - 8);

        // aura separate and moderate
        if (Game.combo > 1) {
            const auraRadius = Game.tileSize / 2 + Math.min(18, Game.combo * 1.6);
            ctx.beginPath();
            ctx.arc(px + Game.tileSize / 2, py + Game.tileSize / 2, auraRadius, 0, Math.PI * 2);
            ctx.strokeStyle = Game.theme.aura;
            ctx.lineWidth = 2 + Math.min(6, Game.combo * 0.15);
            ctx.globalAlpha = 0.22 + Math.sin(performance.now() / 200) * 0.12;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function drawChaser(camX, camY) {
        if (!Game.chaser.active) return;
        const cx = Game.chaser.x * Game.tileSize - camX + Game.tileSize / 2;
        const cy = Game.chaser.y * Game.tileSize - camY + Game.tileSize / 2;
        ctx.beginPath(); ctx.fillStyle = Game.chaser.color; ctx.arc(cx, cy, Math.max(8, Game.tileSize / 4), 0, Math.PI * 2); ctx.fill();
        const ppx = (Game.player.from.x + (Game.player.to.x - Game.player.from.x) * Math.min(1, Game.player.moveTimer / Game.player.moveDuration)) * Game.tileSize - camX + Game.tileSize / 2;
        const ppy = (Game.player.from.y + (Game.player.to.y - Game.player.from.y) * Math.min(1, Game.player.moveTimer / Game.player.moveDuration)) * Game.tileSize - camY + Game.tileSize / 2;
        ctx.globalAlpha = 0.12; ctx.strokeStyle = Game.theme.aura; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ppx, ppy); ctx.lineTo(cx, cy); ctx.stroke(); ctx.globalAlpha = 1;
    }

    function drawRipplesAndParticles(camX, camY) {
        for (const r of Game.ripples) {
            ctx.beginPath();
            const rx = r.x * Game.tileSize - camX + Game.tileSize / 2;
            const ry = r.y * Game.tileSize - camY + Game.tileSize / 2;
            ctx.arc(rx, ry, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = r.color || Game.theme.ripple; ctx.lineWidth = 2;
            ctx.globalAlpha = Math.max(0, 1 - r.radius / 260); ctx.stroke(); ctx.globalAlpha = 1;
        }
        for (const p of Game.particles) {
            ctx.fillStyle = p.color || "#fff";
            ctx.globalAlpha = Math.max(0, p.life / 0.8);
            ctx.fillRect(p.x - camX - 1, p.y - camY - 1, 3, 3);
            ctx.globalAlpha = 1;
        }
    }

    function drawHUD() {
        ctx.fillStyle = "lime"; ctx.font = "16px monospace";
        ctx.fillText(`Floor: ${Game.currentFloor}  Coins: ${Game.coins.length + Game.bigCoins.length}`, 10, 20);
        ctx.fillText(`Score: ${Game.score}  Combo: x${Game.combo}`, 10, 40);
        ctx.fillText(`High Score: ${Game.highScore}`, 10, 60);
        let ix = Game.viewW - 160;
        for (const k of ["speed", "invul", "magnet", "slowTime"]) {
            const pu = Game.activePowerups[k];
            ctx.fillStyle = pu.on ? "#fff" : "rgba(255,255,255,0.16)";
            ctx.fillRect(ix, 12, 28, 28);
            if (pu.on) { ctx.fillStyle = "#000"; ctx.fillText(Math.ceil(pu.dur - pu.t), ix + 6, 32); }
            ix += 36;
        }
    }

    function drawOverlays() {
        if (Game.effects.flashAlpha > 0) {
            ctx.globalAlpha = Math.min(1, Game.effects.flashAlpha);
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, Game.viewW, Game.viewH); ctx.globalAlpha = 1;
        }
        if (Game.effects.vignette > 0) {
            ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(0,0,0,${Game.effects.vignette * 0.6})`; ctx.fillRect(0, 0, Game.viewW, Game.viewH); ctx.restore();
        }
    }

    function draw() {
        drawBackground();
        const { camX, camY } = camOffset();
        drawDungeon(camX, camY);
        drawSpikes(camX, camY);
        drawCoins(camX, camY);
        drawPlayer(camX, camY);
        drawChaser(camX, camY);
        drawRipplesAndParticles(camX, camY);
        drawHUD();
        drawOverlays();
    }

    Game.draw = draw;
    Game.viewW = canvas.width; Game.viewH = canvas.height;
})();