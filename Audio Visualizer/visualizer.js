window.onload = function () {
    // DOM
    const file = document.getElementById("thefile");
    const audio = document.getElementById("audio");
    const canvas = document.getElementById("canvas");
    if (!file || !audio || !canvas) {
        console.error("Missing DOM elements: need #thefile, #audio, #canvas");
        return;
    }
    const ctx = canvas.getContext("2d");

    // state
    let audioContext = null;
    let mediaSrc = null;
    let analyser = null;
    let waveArray = null;
    let freqArray = null;
    const FFT = 1024;

    let hueCycle = 0;
    let glitchTimer = 0;
    let starfield = [];
    let particles = [];
    let rotation = 0;
    let previousBass = 0;

    // small offscreen nebula texture to avoid huge ImageData allocation
    const nebulaSize = 128;
    const nebulaCanvas = document.createElement("canvas");
    nebulaCanvas.width = nebulaSize;
    nebulaCanvas.height = nebulaSize;
    const nebulaCtx = nebulaCanvas.getContext("2d");

    // ensure canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = Math.floor(window.innerHeight * 0.8);
        initStarfield(80);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // helpers
    function initStarfield(count = 80) {
        starfield = [];
        for (let i = 0; i < count; i++) {
            starfield.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: 0.2 + Math.random() * 0.5,
                size: Math.random() * 2,
                hue: Math.random() * 360,
            });
        }
    }
    initStarfield();

    class Particle {
        constructor(x, y, angle, speed, size, hue, life = 100) {
            this.x = x; this.y = y;
            this.prevX = x; this.prevY = y;
            this.angle = angle; this.speed = speed;
            this.size = size; this.life = life; this.hue = hue;
        }
        update() {
            this.prevX = this.x; this.prevY = this.y;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life -= 1;
        }
        draw(ctx) {
            ctx.fillStyle = `hsla(${this.hue},100%,70%,${this.life / 100})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `hsla(${this.hue},100%,70%,${0.15 * (this.life / 100)})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.prevX, this.prevY); ctx.lineTo(this.x, this.y); ctx.stroke();
        }
    }

    function spawnParticles(x, y, count, intensity, hue) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 2) * (0.5 + intensity * 2);
            const size = 0.8 + Math.random() * 2.2;
            particles.push(new Particle(x, y, angle, speed, size, hue, 60 + Math.random() * 60));
        }
    }

    function hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) r = g = b = l;
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    }

    function avgRange(arr, start, end) {
        start = Math.max(0, start); end = Math.min(arr.length, end);
        if (end <= start) return 0;
        let sum = 0; for (let i = start; i < end; i++) sum += arr[i];
        return sum / (end - start);
    }
    function avgRangeEnd(arr, count) {
        count = Math.min(count, arr.length);
        let sum = 0; for (let i = arr.length - count; i < arr.length; i++) sum += arr[i];
        return sum / count;
    }

    function drawLattice(ctxLocal, centerX, centerY, WIDTH, HEIGHT, radiusOffset, thickness, hueShift, trebleIntensity, invertPhase = false) {
        ctxLocal.save();
        const points = [];
        const r = Math.min(WIDTH, HEIGHT) / 2 - radiusOffset;
        const jitterStrength = (glitchTimer > 0 ? 10 : 0) + trebleIntensity * 6;
        const step = 10; // reduce steps to lighten CPU
        for (let i = 0; i < 360; i += step) {
            const phase = invertPhase ? -i : i;
            const angle = i * Math.PI / 180;
            const offset = Math.sin(Date.now() * 0.002 + phase) * 20 * trebleIntensity;
            const jx = (Math.random() - 0.5) * jitterStrength;
            const jy = (Math.random() - 0.5) * jitterStrength;
            const x = centerX + Math.cos(angle) * (r + offset) + jx;
            const y = centerY + Math.sin(angle) * (r + offset) + jy;
            points.push({ x, y });
        }
        ctxLocal.beginPath();
        for (let k = 0; k < points.length; k++) {
            if (trebleIntensity > 0.65 && k % 12 === 0) { ctxLocal.moveTo(points[k].x, points[k].y); continue; }
            if (k === 0) ctxLocal.moveTo(points[k].x, points[k].y); else ctxLocal.lineTo(points[k].x, points[k].y);
        }
        ctxLocal.closePath();
        const latticeHue = (hueCycle + hueShift) % 360;
        ctxLocal.strokeStyle = `hsla(${latticeHue},100%,${invertPhase ? 50 : 60}%,${0.28 + trebleIntensity * 0.5})`;
        ctxLocal.lineWidth = thickness;
        ctxLocal.shadowBlur = 18 + trebleIntensity * 20;
        ctxLocal.shadowColor = `hsl(${latticeHue},100%,70%)`;
        ctxLocal.stroke();
        ctxLocal.restore();
    }

    // Create or resume audio context & analyser safely
    async function ensureAudioContext() {
        if (audioContext && analyser) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            mediaSrc = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = FFT;
            waveArray = new Uint8Array(analyser.fftSize);
            freqArray = new Uint8Array(analyser.frequencyBinCount);
            mediaSrc.connect(analyser);
            analyser.connect(audioContext.destination);
            // resume if suspended (autoplay policies)
            if (audioContext.state === "suspended") await audioContext.resume();
        } catch (err) {
            console.error("AudioContext initialization failed:", err);
        }
    }

    // File input handler
    file.addEventListener("change", async function () {
        const files = this.files;
        if (!files || !files.length) return;
        audio.src = URL.createObjectURL(files[0]);
        try {
            await audio.play(); // modern promise API
        } catch (err) {
            // autoplay might be blocked; user will need to press play
            console.warn("audio.play() blocked; user must click play:", err);
        }
        await ensureAudioContext();
    });

    // Nebula paint into small offscreen texture (cheap)
    function paintNebulaToOffscreen(t, hueCycleLocal, midIntensity) {
        const W = nebulaSize, H = nebulaSize;
        const imageData = nebulaCtx.createImageData(W, H);
        const data = imageData.data;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                const nx = x / W, ny = y / H;
                const noise = Math.sin((nx + t) * 10) + Math.sin((ny - t) * 10);
                const brightness = (noise + 2) / 4;
                const alpha = brightness * 0.12 + midIntensity * 0.22;
                const hue = (hueCycleLocal + x * 0.5 + y * 0.25) % 360;
                const rgb = hslToRgb(hue / 360, 0.6, 0.5);
                data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = Math.floor(alpha * 255);
            }
        }
        nebulaCtx.putImageData(imageData, 0, 0);
    }

    // main loop
    function renderFrame() {
        requestAnimationFrame(renderFrame);

        if (!analyser) {
            // still draw a subtle background so the canvas isn't blank
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        try {
            analyser.getByteTimeDomainData(waveArray);
            analyser.getByteFrequencyData(freqArray);
        } catch (err) {
            console.error("Analyser read failed:", err);
            return;
        }

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2;

        // audio metrics
        const bass = avgRange(freqArray, 0, 20);
        const intensity = bass / 255;
        const treble = avgRangeEnd(freqArray, 50);
        const trebleIntensity = treble / 255;
        const mid = avgRange(freqArray, 200, 400);
        const midIntensity = mid / 255;

        hueCycle = (hueCycle + 0.15) % 360;
        glitchTimer = Math.max(0, glitchTimer - 1);
        rotation += 0.002 + trebleIntensity * 0.02;

        // nebula offscreen and draw scaled
        const t = Date.now() * 0.0002;
        paintNebulaToOffscreen(t, hueCycle, midIntensity);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(nebulaCanvas, 0, 0, WIDTH, HEIGHT);
        ctx.restore();

        // gradient wash
        const bgGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        bgGradient.addColorStop(0, `hsl(${(hueCycle + 120) % 360},40%,${15 + midIntensity * 25}%)`);
        bgGradient.addColorStop(1, `hsl(${(hueCycle + 240) % 360},40%,${10 + midIntensity * 20}%)`);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // starfield
        starfield.forEach(star => {
            star.y += star.speed * 0.3;
            if (star.y > HEIGHT) { star.y = 0; star.x = Math.random() * WIDTH; }
            const alpha = 0.2 + trebleIntensity * 0.4;
            ctx.fillStyle = `hsla(${star.hue},100%,80%,${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // talking lips (time-domain)
        ctx.save();
        ctx.translate(0, centerY);
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < waveArray.length; i++) {
            const x = (i / waveArray.length) * WIDTH;
            const v = waveArray[i] / 128.0;
            const y = (v - 1) * 120 - 20;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(hueCycle + 180) % 360},100%,60%,0.8)`;
        ctx.lineWidth = 6; ctx.shadowBlur = 25; ctx.shadowColor = "#fff"; ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < waveArray.length; i++) {
            const x = (i / waveArray.length) * WIDTH;
            const v = waveArray[i] / 128.0;
            const y = -(v - 1) * 120 + 20;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(hueCycle + 200) % 360},100%,50%,0.8)`;
        ctx.lineWidth = 6; ctx.shadowBlur = 25; ctx.shadowColor = "#fff"; ctx.stroke();
        ctx.restore();

        // core
        const baseRadius = 140;
        const radius = baseRadius + intensity * 40;
        const coreHueBase = (Date.now() * 0.05) % 360;
        const coreHue = (coreHueBase + midIntensity * 25) % 360;
        const radial = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 0.6);
        radial.addColorStop(0, `hsl(${coreHue},100%,70%)`);
        radial.addColorStop(1, `hsl(${(coreHue + 60) % 360},100%,20%)`);
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // waveform ripples
        ctx.save(); ctx.translate(centerX, centerY); ctx.strokeStyle = "rgba(255,255,255,0.15)";
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            for (let j = 0; j < waveArray.length; j++) {
                const angle = (j / waveArray.length) * Math.PI * 2;
                const v = waveArray[j] / 128.0;
                const r = radius * 0.3 + i * 10 + (v - 1) * 8;
                const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
                if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
        }
        ctx.restore();

        // spiky sun outline
        ctx.save(); ctx.translate(centerX, centerY); ctx.beginPath();
        for (let i = 0; i < waveArray.length; i++) {
            const angle = (i / waveArray.length) * Math.PI * 2;
            const v = waveArray[i] / 128.0;
            const r = radius + (v - 1) * (60 + intensity * 30);
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 + intensity * 1.2;
        ctx.shadowBlur = 50 + intensity * 20; ctx.shadowColor = "#fff"; ctx.stroke();
        ctx.restore();

        // rotating corona bars
        const barRadius = radius + 100;
        ctx.save(); ctx.translate(centerX, centerY);
        for (let i = 0; i < waveArray.length; i++) {
            if (trebleIntensity > 0.6 && (i % 6 === 0)) continue;
            const angle = (i / waveArray.length) * Math.PI * 2 + rotation;
            const v = waveArray[i] / 128.0;
            const r = barRadius + (v - 1) * 40;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            const hue = (coreHue + 180 + (i % 60)) % 360;
            const alpha = 0.7 - trebleIntensity * 0.3;
            ctx.strokeStyle = `hsla(${hue},100%,60%,${alpha})`;
            ctx.lineWidth = i % 2 === 0 ? 4 : 1.5;
            ctx.beginPath(); ctx.moveTo(Math.cos(angle) * barRadius, Math.sin(angle) * barRadius); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.restore();

        // aura ripples + particle edge spawn
        const rippleCount = 4;
        let rippleEdge = 0;
        for (let i = 0; i < rippleCount; i++) {
            const maxRadius = Math.min(WIDTH, HEIGHT) / 2;
            const speed = 0.05 + intensity * 0.25;
            const rippleRadius = ((Date.now() * speed + i * 300) % maxRadius);
            rippleEdge = rippleRadius;
            const alpha = Math.max(0, (1 - rippleRadius / maxRadius));
            const brightness = 0.3 + intensity * 0.4;
            const width = 2 + intensity * 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${alpha * brightness})`;
            ctx.lineWidth = width; ctx.stroke();
        }

        const spawnChance = 0.2 + intensity * 0.5;
        if (Math.random() < spawnChance) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5 + intensity * 0.8;
            const size = Math.random() * 3 + intensity * 0.8;
            const x = centerX + Math.cos(angle) * rippleEdge;
            const y = centerY + Math.sin(angle) * rippleEdge;
            const hue = (coreHue + 180 + Math.random() * 60) % 360;
            particles.push(new Particle(x, y, angle, speed, size, hue));
        }

        // particles update/draw
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i]; p.update(); p.draw(ctx);
            if (p.life <= 0) particles.splice(i, 1);
        }

        // lattices
        if (trebleIntensity > 0.8 && glitchTimer === 0) glitchTimer = 12;
        drawLattice(ctx, centerX, centerY, WIDTH, HEIGHT, 0, 3, 40, trebleIntensity, false);
        drawLattice(ctx, centerX, centerY, WIDTH, HEIGHT, 12, 1.5, 200, trebleIntensity, true);

        // vignette
        const vignetteRadius = WIDTH / 3 + midIntensity * 60;
        const vignette = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vignetteRadius);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, `rgba(0,0,0,${0.6 + midIntensity * 0.2})`);
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // bass-triggered burst
        if (intensity > 0.22 && previousBass <= 0.22) spawnParticles(centerX, centerY, 28, intensity, coreHue);
        previousBass = intensity;
    }

    renderFrame(); // start the loop immediately (will show a fallback background until analyser exists)
};