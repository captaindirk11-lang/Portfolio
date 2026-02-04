window.onload = function () {
    console.log("=== VISUALIZER INITIALIZING ===");

    // DOM
    const file = document.getElementById("thefile");
    const audio = document.getElementById("audio");
    const canvas = document.getElementById("canvas");

    console.log("DOM Elements Check:");
    console.log("- File input:", file ? "✓" : "✗ MISSING");
    console.log("- Audio element:", audio ? "✓" : "✗ MISSING");
    console.log("- Canvas element:", canvas ? "✓" : "✗ MISSING");

    if (!file || !audio || !canvas) {
        console.error("Missing DOM elements: need #thefile, #audio, #canvas");
        alert("ERROR: Required elements not found in HTML!");
        return;
    }
    const ctx = canvas.getContext("2d");
    console.log("Canvas context:", ctx ? "✓" : "✗ FAILED");

    // Audio state variables (must be declared early)
    let audioContext = null;
    let mediaSrc = null;
    let analyser = null;
    let waveArray = null;
    let freqArray = null;
    const FFT = 1024;

    // Custom player controls
    const customPlayer = document.getElementById("customPlayer");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const playIcon = playPauseBtn.querySelector(".play-icon");
    const pauseIcon = playPauseBtn.querySelector(".pause-icon");
    const currentTimeDisplay = document.getElementById("currentTime");
    const durationDisplay = document.getElementById("duration");
    const seekBar = document.getElementById("seekBar");
    const seekProgress = document.getElementById("seekProgress");
    const seekHandle = document.getElementById("seekHandle");
    const volumeBtn = document.getElementById("volumeBtn");
    const volumeBar = document.getElementById("volumeBar");
    const volumeProgress = document.getElementById("volumeProgress");
    const volumeHandle = document.getElementById("volumeHandle");
    const volumeValue = document.getElementById("volumeValue");
    const statusText = document.querySelector(".status-text");
    const waveformCanvas = document.getElementById("waveformCanvas");
    const waveformCtx = waveformCanvas ? waveformCanvas.getContext("2d") : null;

    // Waveform canvas sizing
    if (waveformCanvas) {
        waveformCanvas.width = waveformCanvas.offsetWidth;
        waveformCanvas.height = waveformCanvas.offsetHeight;
    }

    // Audio player state
    let isSeeking = false;
    let isVolumeChanging = false;
    let previousVolume = 1.0;

    // Format time helper
    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update status text
    function updateStatus(text) {
        if (statusText) {
            statusText.textContent = text;
        }
    }

    // Create or resume audio context & analyser safely
    async function ensureAudioContext() {
        if (audioContext && analyser) return;
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (!mediaSrc) {
                mediaSrc = audioContext.createMediaElementSource(audio);
            }
            if (!analyser) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = FFT;
                waveArray = new Uint8Array(analyser.fftSize);
                freqArray = new Uint8Array(analyser.frequencyBinCount);
                mediaSrc.connect(analyser);
                analyser.connect(audioContext.destination);
            }
            // resume if suspended (autoplay policies)
            if (audioContext.state === "suspended") await audioContext.resume();
        } catch (err) {
            console.error("AudioContext initialization failed:", err);
        }
    }

    // Play/Pause button
    if (playPauseBtn) {
        playPauseBtn.addEventListener("click", async () => {
            console.log("Play/Pause button clicked. Audio paused:", audio.paused);

            if (audio.paused) {
                try {
                    console.log("Attempting to play...");
                    await ensureAudioContext();
                    await audio.play();
                    console.log("Play successful");
                } catch (err) {
                    console.error("Play failed:", err);
                    if (err.name !== 'AbortError') {
                        updateStatus("ERROR - PLAYBACK FAILED");
                    }
                }
            } else {
                console.log("Pausing audio");
                audio.pause();
            }
        });
    }

    // Audio event listeners
    audio.addEventListener("play", () => {
        if (playIcon) playIcon.style.display = "none";
        if (pauseIcon) pauseIcon.style.display = "inline";
        updateStatus("AUDIO SYSTEM ACTIVE");
    });

    audio.addEventListener("pause", () => {
        if (playIcon) playIcon.style.display = "inline";
        if (pauseIcon) pauseIcon.style.display = "none";
        updateStatus("AUDIO SYSTEM PAUSED");
    });

    audio.addEventListener("ended", () => {
        if (playIcon) playIcon.style.display = "inline";
        if (pauseIcon) pauseIcon.style.display = "none";
        updateStatus("AUDIO PLAYBACK COMPLETE");
    });

    audio.addEventListener("loadedmetadata", () => {
        if (durationDisplay) {
            durationDisplay.textContent = formatTime(audio.duration);
        }
        updateStatus("AUDIO FILE LOADED - READY");
    });

    audio.addEventListener("timeupdate", () => {
        if (!isSeeking) {
            const progress = (audio.currentTime / audio.duration) * 100;
            if (seekProgress) seekProgress.style.width = progress + "%";
            if (seekHandle) seekHandle.style.left = progress + "%";
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(audio.currentTime);
            }
        }
        // Update waveform preview
        updateWaveformPreview();
    });

    // Seek bar interaction
    if (seekBar) {
        seekBar.addEventListener("mousedown", (e) => {
            isSeeking = true;
            updateSeek(e);
        });

        document.addEventListener("mousemove", (e) => {
            if (isSeeking) {
                updateSeek(e);
            }
        });

        document.addEventListener("mouseup", () => {
            isSeeking = false;
        });
    }

    function updateSeek(e) {
        if (!seekBar || !audio.duration) return;
        const rect = seekBar.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        if (seekProgress) seekProgress.style.width = percentage + "%";
        if (seekHandle) seekHandle.style.left = percentage + "%";
        audio.currentTime = (percentage / 100) * audio.duration;
    }

    // Volume control
    if (volumeBtn) {
        volumeBtn.addEventListener("click", () => {
            if (audio.volume > 0) {
                previousVolume = audio.volume;
                audio.volume = 0;
            } else {
                audio.volume = previousVolume;
            }
            updateVolumeDisplay();
        });
    }

    if (volumeBar) {
        volumeBar.addEventListener("mousedown", (e) => {
            isVolumeChanging = true;
            updateVolume(e);
        });

        document.addEventListener("mousemove", (e) => {
            if (isVolumeChanging) {
                updateVolume(e);
            }
        });

        document.addEventListener("mouseup", () => {
            isVolumeChanging = false;
        });
    }

    function updateVolume(e) {
        if (!volumeBar) return;
        const rect = volumeBar.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        audio.volume = percentage;
        updateVolumeDisplay();
    }

    function updateVolumeDisplay() {
        const percentage = audio.volume * 100;
        if (volumeProgress) volumeProgress.style.width = percentage + "%";
        if (volumeHandle) volumeHandle.style.left = percentage + "%";
        if (volumeValue) volumeValue.textContent = Math.round(percentage);
    }

    // Initialize volume display
    updateVolumeDisplay();

    // Waveform preview (throttled for performance)
    let lastWaveformUpdate = 0;
    const WAVEFORM_UPDATE_INTERVAL = 50; // Update every 50ms instead of every frame

    function updateWaveformPreview() {
        if (!waveformCtx || !analyser) return;

        // Throttle updates to reduce lag
        const now = Date.now();
        if (now - lastWaveformUpdate < WAVEFORM_UPDATE_INTERVAL) return;
        lastWaveformUpdate = now;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        waveformCtx.fillStyle = "rgba(0, 0, 0, 0.3)";
        waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

        const theme = themes[currentTheme];
        waveformCtx.lineWidth = 2;
        waveformCtx.strokeStyle = theme.primary;
        waveformCtx.shadowBlur = 10;
        waveformCtx.shadowColor = theme.primary;

        waveformCtx.beginPath();

        const sliceWidth = waveformCanvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * waveformCanvas.height) / 2;

            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        waveformCtx.stroke();
        waveformCtx.shadowBlur = 0;
    }

    // Theme system
    const themes = {
        cyan: {
            primary: '#0ff',
            primaryRgb: '0, 255, 255',
            secondary: '#0af',
            dark: 'rgba(0, 20, 40, 0.8)',
            hueBase: 180
        },
        purple: {
            primary: '#b24bf3',
            primaryRgb: '178, 75, 243',
            secondary: '#8b1fff',
            dark: 'rgba(40, 0, 60, 0.8)',
            hueBase: 280
        },
        green: {
            primary: '#0f0',
            primaryRgb: '0, 255, 0',
            secondary: '#0c0',
            dark: 'rgba(0, 40, 0, 0.8)',
            hueBase: 120
        },
        red: {
            primary: '#f33',
            primaryRgb: '255, 51, 51',
            secondary: '#f00',
            dark: 'rgba(60, 0, 0, 0.8)',
            hueBase: 0
        },
        gold: {
            primary: '#fc0',
            primaryRgb: '255, 204, 0',
            secondary: '#fa0',
            dark: 'rgba(40, 30, 0, 0.8)',
            hueBase: 45
        },
        blue: {
            primary: '#4af',
            primaryRgb: '68, 170, 255',
            secondary: '#08f',
            dark: 'rgba(0, 20, 60, 0.8)',
            hueBase: 210
        }
    };

    let currentTheme = 'cyan';

    // Apply theme to CSS variables and update waveform color
    function applyTheme(themeName) {
        const theme = themes[themeName];
        if (!theme) return;

        currentTheme = themeName;
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-rgb', theme.primaryRgb);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-dark', theme.dark);

        // Update HUD scheme in visualizer to match
        const hudIndex = Object.keys(themes).indexOf(themeName);
        if (hudIndex >= 0 && hudIndex < HUD_SCHEMES.length) {
            currentHUDScheme = hudIndex;
        }

        // Update waveform color
        if (waveformCtx) {
            waveformCtx.strokeStyle = theme.primary;
            waveformCtx.shadowColor = theme.primary;
        }

        // Update theme button active states
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            }
        });
    }

    // Theme switcher event listeners
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.dataset.theme);
        });
    });

    // HUD color schemes (must be defined BEFORE applyTheme is called)
    let currentHUDScheme = 0;
    const HUD_SCHEMES = [
        { name: 'Cyan', primary: [0, 255, 255], secondary: [0, 200, 255] },
        { name: 'Green', primary: [0, 255, 100], secondary: [50, 255, 150] },
        { name: 'Amber', primary: [255, 180, 0], secondary: [255, 140, 0] },
        { name: 'Purple', primary: [200, 100, 255], secondary: [150, 50, 255] },
        { name: 'Red', primary: [255, 50, 50], secondary: [255, 100, 100] }
    ];

    // Initialize default theme
    applyTheme('cyan');

    // Visualizer state variables
    let hueCycle = 0;
    let glitchTimer = 0;
    let starfield = [];
    let particles = [];
    const MAX_PARTICLES = 75; // particle cap for performance
    let rotation = 0;
    let previousBass = 0;

    // Advanced audio analysis system
    const audioSystem = {
        subBass: 0,      // 20-60 Hz - deep rumble
        bass: 0,         // 60-250 Hz - kick/bass
        lowMid: 0,       // 250-500 Hz - warmth
        mid: 0,          // 500-2000 Hz - vocals/body
        highMid: 0,      // 2000-4000 Hz - presence
        treble: 0,       // 4000-8000 Hz - clarity
        sparkle: 0,      // 8000+ Hz - air/shimmer
        beatDetected: false,
        beatThreshold: 0.25,
        lastBeatTime: 0,
        energy: 0,       // overall energy level
    };

    // Performance: cached time values
    let currentTime = 0;
    let deltaTime = 0;
    let lastFrameTime = 0;

    // VCR Oscilloscope effects
    let phosphorCanvas = null; // for phosphor decay trail effect
    let phosphorCtx = null;
    let scanlineOffset = 0; // animated scanline position

    // VU Meters state
    let vuMeterLPeak = 0;
    let vuMeterRPeak = 0;
    let vuMeterLDecay = 0;
    let vuMeterRDecay = 0;

    // Spectrum analyzer bars
    const spectrumBars = 16; // number of frequency bars
    let spectrumPeaks = new Array(spectrumBars).fill(0);
    let spectrumPeakDecay = new Array(spectrumBars).fill(0);

    // Camera effects - spaceship drift
    let zoomLevel = 1.0;
    let targetZoom = 1.0;
    let driftX = 0;
    let driftY = 0;
    let driftRotation = 0;
    let perspectiveWarp = 0;

    // Inertial dampening & physics
    let actualRoll = 0;
    let actualPitch = 0;
    let actualYaw = 0;
    let targetRoll = 0;
    let targetPitch = 0;
    let targetYaw = 0;
    let microVibrationX = 0;
    let microVibrationY = 0;

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let mouseDown = false;
    let mouseDragStartX = 0;
    let mouseDragStartY = 0;
    let gestureForceX = 0;
    let gestureForceY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let mouseVelocityX = 0;
    let mouseVelocityY = 0;
    let mouseTrails = []; // velocity-based trails
    const MAX_TRAILS = 20;
    let cursorHueShift = 0; // color shifting based on position

    // Mouse look system
    let mouseLookX = 0;
    let mouseLookY = 0;
    const MOUSE_LOOK_RANGE = 15; // max camera offset in pixels

    // Target lock system
    let targetLocks = [];
    const MAX_TARGET_LOCKS = 5;

    // Boost mode
    let boostMode = false;
    let boostIntensity = 0;

    // Overhead control panel
    let showScanlines = true;
    let showRadar = true;
    let showSpectrum = true;
    let showSystemPanel = true;
    let controlPanelButtons = [];
    let hoveredButton = null;

    function initControlPanel() {
        const panelY = 15;
        const buttonWidth = 80;
        const buttonHeight = 25;
        const spacing = 10;
        let startX = canvas.width / 2 - ((buttonWidth + spacing) * 4) / 2;

        controlPanelButtons = [
            { x: startX, y: panelY, w: buttonWidth, h: buttonHeight, label: 'SCANLINES', action: 'toggleScanlines', active: showScanlines },
            { x: startX + (buttonWidth + spacing), y: panelY, w: buttonWidth, h: buttonHeight, label: 'RADAR', action: 'toggleRadar', active: showRadar },
            { x: startX + (buttonWidth + spacing) * 2, y: panelY, w: buttonWidth, h: buttonHeight, label: 'SPECTRUM', action: 'toggleSpectrum', active: showSpectrum },
            { x: startX + (buttonWidth + spacing) * 3, y: panelY, w: buttonWidth, h: buttonHeight, label: 'SYSTEMS', action: 'toggleSystems', active: showSystemPanel }
        ];
    }

    // Performance monitoring
    let showFPS = false;
    let fps = 0;
    let frameCount = 0;
    let lastFPSUpdate = 0;
    let adaptiveQuality = true;

    // Audio fade-in
    let audioFadeIn = 0;

    // Shockwave system
    let shockwaves = [];

    // Thruster particles
    let thrusterParticles = [];
    const MAX_THRUSTER_PARTICLES = 50;

    // Distant ships
    let distantShips = [];

    // Chromatic aberration
    let chromaticIntensity = 0;

    // Futuristic ship flight elements
    let distanceTraveled = 0;
    let warpSpeed = 0;
    let targetWarpSpeed = 0;
    let galacticCoords = { x: 1000, y: 500, z: 250 };
    let asteroids = [];
    let spaceDebris = [];
    let nebulaClouds = [];
    let distantPlanets = [];
    let energyFields = [];
    let wormholeIntensity = 0;
    let hyperspaceActive = false;
    let hyperspaceIntensity = 0;
    let warningFlash = 0;
    let cockpitDust = [];
    let screenFlicker = 0;
    let autopilotDrift = { x: 0, y: 0 };
    let bankingTilt = 0;
    let targetBankingTilt = 0;

    // Enhanced space elements
    let planetRotation = 0;
    let solarFlares = [];
    let surfaceHotspots = [];
    let shootingStars = [];
    let comets = [];
    let spaceStations = [];
    let wormholePortals = [];
    let binaryStars = [];

    // Advanced visual effects
    let screenShake = { x: 0, y: 0, intensity: 0 };
    let screenCracks = [];
    let lensFlares = [];
    let godRayIntensity = 0;
    let emInterference = 0;
    let holographicGlitch = 0;
    let motionBlurTrails = [];
    let iceCrystals = [];
    let cosmicDust = [];
    let darkMatterClouds = [];
    let timeDistortion = 0;

    // Ship systems
    let shipFuel = 100;
    let shipHull = 100;
    let shipTemperature = 20;
    let powerDistribution = { shields: 33, engines: 33, weapons: 34 };
    let scanProgress = 0;
    let scanningTarget = null;

    // UI elements
    let alerts = [];
    let missionLog = [];
    let waypoints = [];

    function initPhosphorCanvas() {
        phosphorCanvas = document.createElement("canvas");
        phosphorCanvas.width = canvas.width;
        phosphorCanvas.height = canvas.height;
        phosphorCtx = phosphorCanvas.getContext("2d");
    }

    // Mouse event handlers
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

        // Check if hovering over control panel buttons
        hoveredButton = null;
        for (const btn of controlPanelButtons) {
            if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
                mouseY >= btn.y && mouseY <= btn.y + btn.h) {
                hoveredButton = btn;
                canvas.style.cursor = 'pointer';
                break;
            }
        }
        if (!hoveredButton) {
            canvas.style.cursor = 'default';
        }

        // Mouse look - calculate camera offset
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        mouseLookX = ((mouseX - centerX) / centerX) * MOUSE_LOOK_RANGE;
        mouseLookY = ((mouseY - centerY) / centerY) * MOUSE_LOOK_RANGE;

        // Calculate velocity for trails
        mouseVelocityX = mouseX - prevMouseX;
        mouseVelocityY = mouseY - prevMouseY;
        const speed = Math.sqrt(mouseVelocityX * mouseVelocityX + mouseVelocityY * mouseVelocityY);

        // Add velocity trail if moving fast enough
        if (speed > 3) {
            mouseTrails.push({
                x: mouseX,
                y: mouseY,
                life: 30,
                speed: speed,
                hue: (hueCycle + speed * 5) % 360
            });
            if (mouseTrails.length > MAX_TRAILS) mouseTrails.shift();
        }

        // Color shifting based on position
        cursorHueShift = ((mouseX / canvas.width) * 360) % 360;

        if (mouseDown) {
            // Calculate gesture force while dragging
            gestureForceX = (mouseX - mouseDragStartX) * 0.1;
            gestureForceY = (mouseY - mouseDragStartY) * 0.1;
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        mouseDown = true;
        const rect = canvas.getBoundingClientRect();
        mouseDragStartX = e.clientX - rect.left;
        mouseDragStartY = e.clientY - rect.top;

        // Check if clicking on control panel button
        for (const btn of controlPanelButtons) {
            if (mouseDragStartX >= btn.x && mouseDragStartX <= btn.x + btn.w &&
                mouseDragStartY >= btn.y && mouseDragStartY <= btn.y + btn.h) {
                // Execute button action
                if (btn.action === 'toggleScanlines') {
                    showScanlines = !showScanlines;
                    btn.active = showScanlines;
                } else if (btn.action === 'toggleRadar') {
                    showRadar = !showRadar;
                    btn.active = showRadar;
                } else if (btn.action === 'toggleSpectrum') {
                    showSpectrum = !showSpectrum;
                    btn.active = showSpectrum;
                } else if (btn.action === 'toggleSystems') {
                    showSystemPanel = !showSystemPanel;
                    btn.active = showSystemPanel;
                }
                return; // Don't do other click actions
            }
        }

        // Trigger screen shake on click
        shakeDecay = 10;

        // Spawn particles at cursor on click
        const clickHue = (hueCycle + cursorHueShift) % 360;
        spawnParticles(mouseX, mouseY, 15, 0.8, clickHue);

        // Add target lock at click position
        if (targetLocks.length < MAX_TARGET_LOCKS) {
            targetLocks.push({
                x: mouseX,
                y: mouseY,
                time: Date.now(),
                life: 3000, // 3 seconds
                scale: 0
            });
        }
    });

    canvas.addEventListener('mouseup', () => {
        mouseDown = false;
        // Gradually reduce gesture force
        gestureForceX *= 0.5;
        gestureForceY *= 0.5;
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Spacebar - boost mode toggle
        if (e.code === 'Space') {
            e.preventDefault();
            boostMode = !boostMode;
        }
        // F key - FPS counter toggle
        if (e.key === 'f' || e.key === 'F') {
            showFPS = !showFPS;
        }
        // Q key - toggle adaptive quality
        if (e.key === 'q' || e.key === 'Q') {
            adaptiveQuality = !adaptiveQuality;
        }
        // Number keys 1-5 - HUD color schemes
        if (e.key >= '1' && e.key <= '5') {
            currentHUDScheme = parseInt(e.key) - 1;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        mouseDown = false;
    });

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
        initPhosphorCanvas(); // reinit phosphor canvas on resize
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // helpers - 3D starfield for flying through space effect
    function initStarfield(count = 120) {
        starfield = [];
        for (let i = 0; i < count; i++) {
            starfield.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 1500, // depth
                speed: 0.5 + Math.random() * 1.5,
                size: Math.random() * 2,
                hue: Math.random() * 60 + 180, // blue-cyan stars
            });
        }
    }
    initStarfield();

    // Initialize distant ships
    function initDistantShips() {
        for (let i = 0; i < 2; i++) {
            distantShips.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.5, // upper half
                z: 500 + Math.random() * 1000,
                speed: 0.2 + Math.random() * 0.3,
                size: 2 + Math.random() * 3,
                hue: 180 + Math.random() * 60
            });
        }
    }
    initDistantShips();

    // Initialize asteroids
    function initAsteroids() {
        for (let i = 0; i < 5; i++) {
            asteroids.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 2000 + 500,
                speed: 0.3 + Math.random() * 0.5,
                size: 10 + Math.random() * 30,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02
            });
        }
    }
    initAsteroids();

    // Initialize space debris
    function initSpaceDebris() {
        for (let i = 0; i < 15; i++) {
            spaceDebris.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 1500,
                speed: 0.8 + Math.random() * 1.2,
                size: 1 + Math.random() * 3,
                type: Math.floor(Math.random() * 3)
            });
        }
    }
    initSpaceDebris();

    // Initialize nebula clouds
    function initNebulaClouds() {
        for (let i = 0; i < 3; i++) {
            nebulaClouds.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 2500 + 1000,
                speed: 0.1 + Math.random() * 0.2,
                size: 200 + Math.random() * 300,
                hue: Math.random() * 360,
                opacity: 0.1 + Math.random() * 0.2
            });
        }
    }
    initNebulaClouds();

    // Initialize distant planets
    function initDistantPlanets() {
        for (let i = 0; i < 2; i++) {
            distantPlanets.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height / 2 - canvas.height / 4,
                z: Math.random() * 3000 + 2000,
                speed: 0.05 + Math.random() * 0.1,
                size: 50 + Math.random() * 100,
                hue: Math.random() * 360
            });
        }
    }
    initDistantPlanets();

    // Initialize cockpit dust particles
    function initCockpitDust() {
        for (let i = 0; i < 30; i++) {
            cockpitDust.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random(),
                driftX: (Math.random() - 0.5) * 0.2,
                driftY: (Math.random() - 0.5) * 0.2,
                size: 0.5 + Math.random() * 1.5,
                opacity: 0.1 + Math.random() * 0.3
            });
        }
    }
    initCockpitDust();

    // Initialize surface hotspots for planet
    function initSurfaceHotspots() {
        for (let i = 0; i < 8; i++) {
            surfaceHotspots.push({
                angle: Math.random() * Math.PI * 2,
                intensity: 0,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    initSurfaceHotspots();

    // Initialize binary stars
    function initBinaryStars() {
        for (let i = 0; i < 3; i++) {
            binaryStars.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 1500,
                speed: 0.5 + Math.random() * 1.5,
                size: 2 + Math.random() * 2,
                hue: Math.random() * 60 + 180,
                orbit: Math.random() * Math.PI * 2,
                orbitSpeed: 0.02 + Math.random() * 0.03,
                distance: 3 + Math.random() * 5
            });
        }
    }
    initBinaryStars();

    // Initialize comets
    function initComets() {
        for (let i = 0; i < 2; i++) {
            comets.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 2000 + 500,
                speed: 0.8 + Math.random() * 1.2,
                size: 3 + Math.random() * 4,
                hue: 40 + Math.random() * 20,
                tail: []
            });
        }
    }
    initComets();

    // Initialize space stations
    function initSpaceStations() {
        spaceStations.push({
            x: Math.random() * canvas.width - canvas.width / 2,
            y: Math.random() * canvas.height / 2 - canvas.height / 4,
            z: 800 + Math.random() * 400,
            speed: 0.1,
            size: 30,
            rotation: 0,
            rotationSpeed: 0.01,
            lights: [0, 0.5, 1, 1.5].map((t, i) => ({
                phase: t,
                blink: 0,
                on: false,
                hue: [180, 200, 160, 220][i],
                x: [0.7, -0.7, 0, 0][i],
                y: [0, 0, 0.7, -0.7][i]
            }))
        });
    }
    initSpaceStations();

    // Initialize ice crystals
    function initIceCrystals() {
        for (let i = 0; i < 40; i++) {
            iceCrystals.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 1000 + 200,
                speed: 0.3 + Math.random() * 0.5,
                size: 1 + Math.random() * 2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.05
            });
        }
    }
    initIceCrystals();

    // Initialize cosmic dust
    function initCosmicDust() {
        for (let i = 0; i < 60; i++) {
            cosmicDust.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 800 + 100,
                speed: 0.2 + Math.random() * 0.3,
                size: 0.5 + Math.random() * 1,
                opacity: 0.3 + Math.random() * 0.4,
                hue: 200 + Math.random() * 60
            });
        }
    }
    initCosmicDust();

    // Initialize dark matter clouds
    function initDarkMatter() {
        for (let i = 0; i < 5; i++) {
            darkMatterClouds.push({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * 3000 + 1000,
                speed: 0.1 + Math.random() * 0.2,
                size: 100 + Math.random() * 150,
                shimmer: Math.random() * Math.PI * 2
            });
        }
    }
    initDarkMatter();

    // Initialize waypoints
    function initWaypoints() {
        waypoints.push({
            x: 500,
            y: 0,
            z: 2000,
            label: "SECTOR ALPHA",
            active: true
        });
    }
    initWaypoints();
    initControlPanel();

    // File input handler
    file.addEventListener("change", async function (e) {
        console.log("=== FILE CHANGE EVENT TRIGGERED ===");
        const files = this.files;
        console.log("Files object:", files);
        console.log("Files length:", files ? files.length : "null");

        if (!files || !files.length) {
            console.warn("No files selected");
            return;
        }

        console.log("File selected:", files[0].name);
        console.log("File type:", files[0].type);
        console.log("File size:", files[0].size, "bytes");

        audio.src = URL.createObjectURL(files[0]);
        console.log("Audio src set to:", audio.src);

        audio.load(); // Ensure audio is loaded
        console.log("Audio load() called");

        updateStatus("LOADING AUDIO FILE...");

        // Set up audio context before playing
        try {
            console.log("Calling ensureAudioContext...");
            await ensureAudioContext();
            console.log("Audio context initialized successfully");
            console.log("- audioContext:", audioContext);
            console.log("- mediaSrc:", mediaSrc);
            console.log("- analyser:", analyser);
        } catch (err) {
            console.error("Failed to initialize audio context:", err);
            updateStatus("ERROR - AUDIO SYSTEM FAILED");
            alert("Audio system failed to initialize: " + err.message);
            return;
        }

        try {
            console.log("Attempting to play audio...");
            await audio.play();
            console.log("Audio playing successfully");
        } catch (err) {
            // autoplay might be blocked; user will need to press play
            console.warn("audio.play() blocked; user must click play:", err);
            updateStatus("READY - CLICK PLAY TO START");
        }
    });

    console.log("File input event listener attached");
    console.log("=== VISUALIZER INITIALIZATION COMPLETE ===");

    class Particle {
        constructor(x, y, angle, speed, size, hue, life = 100) {
            this.x = x; this.y = y;
            this.prevX = x; this.prevY = y;
            this.angle = angle; this.speed = speed;
            this.size = size; this.life = life; this.maxLife = life; this.hue = hue;
            this.active = true;
        }
        reset(x, y, angle, speed, size, hue, life) {
            this.x = x; this.y = y;
            this.prevX = x; this.prevY = y;
            this.angle = angle; this.speed = speed;
            this.size = size; this.life = life; this.maxLife = life; this.hue = hue;
            this.active = true;
        }
        update() {
            this.prevX = this.x; this.prevY = this.y;

            // Cursor gravity field - attract/repel based on distance
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 200 && distance > 0) {
                const force = mouseDown ? 0.5 : -0.3; // attract when dragging, repel otherwise
                const forceX = (dx / distance) * force;
                const forceY = (dy / distance) * force;
                this.x += forceX;
                this.y += forceY;
            }

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life -= 1;
            if (this.life <= 0) this.active = false;
        }
        draw(ctx) {
            const alpha = this.life / this.maxLife;
            ctx.fillStyle = `hsla(${this.hue},100%,70%,${alpha})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `hsla(${this.hue},100%,70%,${0.15 * alpha})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.prevX, this.prevY); ctx.lineTo(this.x, this.y); ctx.stroke();
        }
    }

    // Performance: particle pooling system
    function spawnParticles(x, y, count, intensity, hue) {
        if (particles.length >= MAX_PARTICLES) return; // performance cap

        for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 2) * (0.5 + intensity * 2);
            const size = 0.8 + Math.random() * 2.2;
            const life = 60 + Math.random() * 60;

            // Try to reuse dead particle
            let reused = false;
            for (let j = 0; j < particles.length; j++) {
                if (!particles[j].active) {
                    particles[j].reset(x, y, angle, speed, size, hue, life);
                    reused = true;
                    break;
                }
            }

            if (!reused) {
                particles.push(new Particle(x, y, angle, speed, size, hue, life));
            }
        }
    }

    // Advanced audio analysis: extract frequency bands
    function analyzeAudio(freqArray) {
        const nyquist = audioContext.sampleRate / 2;
        const binWidth = nyquist / freqArray.length;

        function getFreqRange(startHz, endHz) {
            const startBin = Math.floor(startHz / binWidth);
            const endBin = Math.floor(endHz / binWidth);
            return avgRange(freqArray, startBin, endBin) / 255;
        }

        audioSystem.subBass = getFreqRange(20, 60);
        audioSystem.bass = getFreqRange(60, 250);
        audioSystem.lowMid = getFreqRange(250, 500);
        audioSystem.mid = getFreqRange(500, 2000);
        audioSystem.highMid = getFreqRange(2000, 4000);
        audioSystem.treble = getFreqRange(4000, 8000);
        audioSystem.sparkle = getFreqRange(8000, 20000);

        // Overall energy calculation
        let totalEnergy = 0;
        for (let i = 0; i < freqArray.length; i++) totalEnergy += freqArray[i];
        audioSystem.energy = totalEnergy / (freqArray.length * 255);

        // Beat detection based on bass + sub-bass
        const now = currentTime;
        const beatStrength = (audioSystem.subBass + audioSystem.bass) / 2;
        if (beatStrength > audioSystem.beatThreshold && (now - audioSystem.lastBeatTime) > 200) {
            audioSystem.beatDetected = true;
            audioSystem.lastBeatTime = now;
        } else {
            audioSystem.beatDetected = false;
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

    function drawLattice(ctxLocal, centerX, centerY, WIDTH, HEIGHT, radiusOffset, thickness, hueShift, frequencyBand, invertPhase = false) {
        ctxLocal.save();
        const points = [];
        const r = Math.min(WIDTH, HEIGHT) / 2 - radiusOffset;
        const jitterStrength = 0; // disabled for smooth rendering
        const step = 15; // increased step for better performance
        for (let i = 0; i < 360; i += step) {
            const phase = invertPhase ? -i : i;
            const angle = i * Math.PI / 180;
            const offset = Math.sin(currentTime * 0.002 + phase) * 20 * frequencyBand;
            const jx = (Math.random() - 0.5) * jitterStrength;
            const jy = (Math.random() - 0.5) * jitterStrength;
            const x = centerX + Math.cos(angle) * (r + offset) + jx;
            const y = centerY + Math.sin(angle) * (r + offset) + jy;
            points.push({ x, y });
        }
        ctxLocal.beginPath();
        for (let k = 0; k < points.length; k++) {
            if (frequencyBand > 0.65 && k % 8 === 0) { ctxLocal.moveTo(points[k].x, points[k].y); continue; }
            if (k === 0) ctxLocal.moveTo(points[k].x, points[k].y); else ctxLocal.lineTo(points[k].x, points[k].y);
        }
        ctxLocal.closePath();
        const latticeHue = (hueCycle + hueShift) % 360;
        ctxLocal.strokeStyle = `hsla(${latticeHue},100%,${invertPhase ? 50 : 60}%,${0.28 + frequencyBand * 0.5})`;
        ctxLocal.lineWidth = thickness;
        ctxLocal.shadowBlur = 18 + frequencyBand * 20;
        ctxLocal.shadowColor = `hsl(${latticeHue},100%,70%)`;
        ctxLocal.stroke();
        ctxLocal.restore();
    }

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

        // Performance: cache time calculations
        currentTime = Date.now();
        deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

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

        // HUD color scheme
        const scheme = HUD_SCHEMES[currentHUDScheme];
        const hudColor = `rgb(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]})`;
        const hudColorSecondary = `rgb(${scheme.secondary[0]},${scheme.secondary[1]},${scheme.secondary[2]})`;

        // AUDIO REACTIVE SYSTEM: Analyze all frequency bands
        analyzeAudio(freqArray);

        // ========== AUDIO-REACTIVE SCREEN SHAKE ==========
        const bassShake = audioSystem.bass * 8;
        const beatShake = audioSystem.beatDetected ? 12 : 0;
        screenShake.intensity = bassShake + beatShake;
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;

        // Decay screen shake
        screenShake.intensity *= 0.85;

        // ========== PERFORMANCE & POLISH ==========

        // FPS counter
        frameCount++;
        if (currentTime - lastFPSUpdate > 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFPSUpdate = currentTime;
        }

        // Adaptive quality based on FPS
        const lowFPS = fps < 30 && fps > 0;
        const particleLimit = adaptiveQuality && lowFPS ? MAX_PARTICLES / 2 : MAX_PARTICLES;

        // Audio fade-in
        if (audioFadeIn < 1.0) {
            audioFadeIn = Math.min(1.0, audioFadeIn + 0.02);
        }

        // Smooth boost mode transition
        const targetBoost = boostMode ? 1.0 : 0.0;
        boostIntensity += (targetBoost - boostIntensity) * 0.1;

        // ========== FUTURISTIC SHIP FLIGHT SYSTEMS ==========

        // Warp speed calculation
        targetWarpSpeed = 3 + audioSystem.energy * 8 + audioSystem.bass * 5 + boostIntensity * 10;
        warpSpeed += (targetWarpSpeed - warpSpeed) * 0.1;

        // Distance traveled accumulation
        distanceTraveled += warpSpeed * 0.1;

        // Galactic coordinates drift
        galacticCoords.x += warpSpeed * 0.01 + audioSystem.treble * 0.5;
        galacticCoords.y += warpSpeed * 0.005 + audioSystem.mid * 0.3;
        galacticCoords.z += warpSpeed * 0.008 + audioSystem.bass * 0.4;

        // Banking turns based on stereo audio (simulated with high-mid frequencies)
        targetBankingTilt = (audioSystem.highMid - 0.5) * 0.03;
        bankingTilt += (targetBankingTilt - bankingTilt) * 0.05;

        // Autopilot drift
        autopilotDrift.x = Math.sin(currentTime * 0.0002) * 2;
        autopilotDrift.y = Math.cos(currentTime * 0.0003) * 1.5;

        // Warning flash on extreme energy
        if (audioSystem.energy > 0.9) {
            warningFlash = Math.min(1, warningFlash + 0.1);
        } else {
            warningFlash *= 0.9;
        }

        // Screen flicker
        if (audioSystem.energy > 0.85 && Math.random() < 0.1) {
            screenFlicker = 0.3;
        } else {
            screenFlicker *= 0.8;
        }

        // ========== SHIP SYSTEMS UPDATES ==========

        // Fuel consumption based on warp speed
        shipFuel = Math.max(0, shipFuel - (warpSpeed * 0.005 + boostIntensity * 0.02));
        if (shipFuel < 100 && warpSpeed < 5) {
            shipFuel = Math.min(100, shipFuel + 0.01); // Slow regeneration
        }

        // Temperature increases with activity
        const targetTemp = 20 + warpSpeed * 5 + audioSystem.energy * 30 + boostIntensity * 25;
        shipTemperature += (targetTemp - shipTemperature) * 0.05;

        // Hull damage on extreme bass hits
        if (audioSystem.beatDetected && audioSystem.bass > 0.9 && Math.random() < 0.1) {
            shipHull = Math.max(0, shipHull - Math.random() * 5);
            // Add screen crack
            if (screenCracks.length < 5) {
                screenCracks.push({
                    x: Math.random() * WIDTH,
                    y: Math.random() * HEIGHT,
                    size: 50 + Math.random() * 100,
                    alpha: 0.3 + Math.random() * 0.4,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }
        // Hull slow repair
        if (shipHull < 100 && audioSystem.energy < 0.3) {
            shipHull = Math.min(100, shipHull + 0.02);
        }

        // God ray intensity based on core activity
        godRayIntensity = audioSystem.energy * 0.8 + audioSystem.bass * 0.4;

        // EM Interference
        emInterference = audioSystem.sparkle * 0.6 + (Math.random() - 0.5) * 0.2;

        // Holographic glitch
        if (Math.random() < 0.02 || (audioSystem.beatDetected && audioSystem.treble > 0.8)) {
            holographicGlitch = 0.5 + Math.random() * 0.5;
        } else {
            holographicGlitch *= 0.9;
        }

        // Time distortion near massive objects (ferrofluid core)
        timeDistortion = audioSystem.bass * 0.3;

        // Alerts system
        if (Math.random() < 0.002) {
            const alertTypes = [
                { text: "PROXIMITY ALERT", color: "rgba(255, 100, 0, 1)", duration: 120 },
                { text: "UNKNOWN SIGNATURE", color: "rgba(0, 255, 255, 1)", duration: 150 },
                { text: "ENERGY SPIKE DETECTED", color: "rgba(255, 255, 0, 1)", duration: 100 },
                { text: "SCANNING...", color: "rgba(0, 255, 100, 1)", duration: 180 }
            ];
            const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
            alerts.push({ ...alert, life: alert.duration, maxLife: alert.duration });
        }
        if (shipHull < 40 && Math.random() < 0.01) {
            alerts.push({ text: `HULL INTEGRITY: ${Math.floor(shipHull)}%`, color: "rgba(255, 0, 0, 1)", life: 100, maxLife: 100 });
        }
        if (shipTemperature > 80 && Math.random() < 0.01) {
            alerts.push({ text: "THRUSTERS OVERHEATING", color: "rgba(255, 150, 0, 1)", life: 120, maxLife: 120 });
        }

        // Update alerts
        for (let i = alerts.length - 1; i >= 0; i--) {
            alerts[i].life--;
            if (alerts[i].life <= 0) {
                alerts.splice(i, 1);
            }
        }

        // Hyperspace jump on extreme bass peaks
        if (audioSystem.bass > 0.95 && !hyperspaceActive) {
            hyperspaceActive = true;
            hyperspaceIntensity = 1.0;
        }
        if (hyperspaceActive) {
            hyperspaceIntensity *= 0.95;
            if (hyperspaceIntensity < 0.05) {
                hyperspaceActive = false;
            }
        }

        // Wormhole effect on beats
        if (audioSystem.beatDetected) {
            wormholeIntensity = audioSystem.bass * 0.8;
        } else {
            wormholeIntensity *= 0.92;
        }

        // ========== SPACESHIP DRIFT EFFECTS (Destiny 2 Style) ==========

        // Gentle floating motion - slow oscillation to simulate drifting in space
        const driftSpeed = 0.0003; // very slow drift
        driftX = Math.sin(currentTime * driftSpeed) * 8 + Math.cos(currentTime * driftSpeed * 0.7) * 5;
        driftY = Math.cos(currentTime * driftSpeed * 1.3) * 6 + Math.sin(currentTime * driftSpeed * 0.5) * 4;

        // Destiny 2-style ship roll and pitch with INERTIAL DAMPENING
        targetRoll = (Math.sin(currentTime * driftSpeed * 1.5) * 0.015 + Math.cos(currentTime * driftSpeed * 0.8) * 0.01) * audioFadeIn;
        targetPitch = (Math.sin(currentTime * driftSpeed * 0.9) * 3) * audioFadeIn;
        targetYaw = (Math.sin(currentTime * driftSpeed * 0.6) * 0.008) * audioFadeIn; // gentle yaw

        // Apply inertial dampening - smooth lag
        const damping = 0.08;
        actualRoll += (targetRoll - actualRoll) * damping;
        actualPitch += (targetPitch - actualPitch) * damping;
        actualYaw += (targetYaw - actualYaw) * damping;

        // Micro-vibrations at high energy
        if (audioSystem.energy > 0.7) {
            microVibrationX = (Math.random() - 0.5) * audioSystem.energy * 2;
            microVibrationY = (Math.random() - 0.5) * audioSystem.energy * 2;
        } else {
            microVibrationX *= 0.8;
            microVibrationY *= 0.8;
        }

        // Final angles with mouse look influence
        const rollAngle = actualRoll + actualYaw + mouseLookX * 0.0005;
        const pitchOffset = actualPitch + mouseLookY * 0.3;

        // Chromatic aberration on bass hits
        chromaticIntensity = audioSystem.bass * 3;

        // Very subtle zoom breathing (like gentle approach/retreat)
        const boostZoom = boostIntensity * 0.15; // boost adds zoom
        targetZoom = 1.0 + Math.sin(currentTime * driftSpeed * 2) * 0.01 + audioSystem.energy * 0.01 + boostZoom;
        zoomLevel += (targetZoom - zoomLevel) * 0.05;

        // Update global animation params based on audio
        hueCycle = (hueCycle + 0.1 + audioSystem.energy * 0.3) % 360;
        rotation += 0.001 + audioSystem.treble * 0.03; // treble controls rotation

        // ========== UPDATE SYSTEMS ==========

        // Update target locks
        for (let i = targetLocks.length - 1; i >= 0; i--) {
            const lock = targetLocks[i];
            const age = currentTime - lock.time;
            if (age > lock.life) {
                targetLocks.splice(i, 1);
            } else {
                lock.scale = Math.min(1, age / 200); // animate in
            }
        }

        // Update shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const wave = shockwaves[i];
            wave.radius += wave.speed;
            wave.life--;
            if (wave.life <= 0) {
                shockwaves.splice(i, 1);
            }
        }

        // Spawn thruster particles on bass hits - DISABLED (distracting)
        /*
        if (audioSystem.bass > 0.6 && thrusterParticles.length < MAX_THRUSTER_PARTICLES) {
            // Left thruster
            thrusterParticles.push({
                x: WIDTH * 0.15,
                y: HEIGHT - 50,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 3 + 2,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 2 + Math.random() * 3,
                hue: 180 + Math.random() * 40
            });
            // Right thruster
            thrusterParticles.push({
                x: WIDTH * 0.85,
                y: HEIGHT - 50,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 3 + 2,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 2 + Math.random() * 3,
                hue: 180 + Math.random() * 40
            });
        }
        */

        // Update thruster particles - DISABLED
        /*
        for (let i = thrusterParticles.length - 1; i >= 0; i--) {
            const p = thrusterParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                thrusterParticles.splice(i, 1);
            }
        }
        */

        // Update distant ships
        for (const ship of distantShips) {
            ship.z -= ship.speed;
            if (ship.z <= 0) {
                ship.z = 1500;
                ship.x = Math.random() * WIDTH;
                ship.y = Math.random() * HEIGHT * 0.5;
            }
        }

        // Update asteroids
        for (const asteroid of asteroids) {
            asteroid.z -= asteroid.speed * warpSpeed * 0.3;
            asteroid.rotation += asteroid.rotationSpeed;
            if (asteroid.z <= 0) {
                asteroid.z = 2500;
                asteroid.x = Math.random() * WIDTH - WIDTH / 2;
                asteroid.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update space debris
        for (const debris of spaceDebris) {
            debris.z -= debris.speed * warpSpeed * 0.5;
            if (debris.z <= 0) {
                debris.z = 1500;
                debris.x = Math.random() * WIDTH - WIDTH / 2;
                debris.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update nebula clouds
        for (const cloud of nebulaClouds) {
            cloud.z -= cloud.speed * warpSpeed * 0.1;
            if (cloud.z <= 0) {
                cloud.z = 3500;
                cloud.x = Math.random() * WIDTH - WIDTH / 2;
                cloud.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update distant planets
        for (const planet of distantPlanets) {
            planet.z -= planet.speed * warpSpeed * 0.05;
            if (planet.z <= 0) {
                planet.z = 5000;
                planet.x = Math.random() * WIDTH - WIDTH / 2;
                planet.y = Math.random() * HEIGHT / 2 - HEIGHT / 4;
            }
        }

        // Update cockpit dust
        for (const dust of cockpitDust) {
            dust.x += dust.driftX + autopilotDrift.x * 0.5;
            dust.y += dust.driftY + autopilotDrift.y * 0.5;

            // Wrap around
            if (dust.x < 0) dust.x = WIDTH;
            if (dust.x > WIDTH) dust.x = 0;
            if (dust.y < 0) dust.y = HEIGHT;
            if (dust.y > HEIGHT) dust.y = 0;
        }

        // Update planet rotation
        planetRotation += 0.0005 + audioSystem.treble * 0.002;

        // Update surface hotspots
        for (const hotspot of surfaceHotspots) {
            hotspot.intensity = Math.sin(currentTime * 0.003 + hotspot.phase) * 0.5 + 0.5;
            if (audioSystem.beatDetected && audioSystem.bass > 0.6) {
                hotspot.intensity = Math.max(hotspot.intensity, audioSystem.bass);
            }
            hotspot.intensity = Math.max(0, Math.min(1, hotspot.intensity));
        }

        // Solar flares on extreme bass
        if (audioSystem.beatDetected && audioSystem.bass > 0.8 && solarFlares.length < 3) {
            solarFlares.push({
                angle: Math.random() * Math.PI * 2,
                life: 40,
                maxLife: 40,
                intensity: audioSystem.bass,
                arcHeight: 0.3 + Math.random() * 0.5
            });
        }

        // Update solar flares
        for (let i = solarFlares.length - 1; i >= 0; i--) {
            solarFlares[i].life--;
            if (solarFlares[i].life <= 0) {
                solarFlares.splice(i, 1);
            }
        }

        // Spawn shooting stars occasionally
        if (Math.random() < 0.005 && shootingStars.length < 3) {
            shootingStars.push({
                x: Math.random() * WIDTH - WIDTH / 2,
                y: -HEIGHT / 2,
                z: Math.random() * 500 + 200,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 8 + 5,
                life: 30,
                maxLife: 30,
                size: 1 + Math.random() * 2
            });
        }

        // Update shooting stars
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const star = shootingStars[i];
            star.x += star.vx;
            star.y += star.vy;
            star.life--;
            if (star.life <= 0 || star.y > HEIGHT / 2) {
                shootingStars.splice(i, 1);
            }
        }

        // Update binary stars
        for (const binary of binaryStars) {
            binary.z -= binary.speed * warpSpeed;
            binary.orbit += binary.orbitSpeed;
            if (binary.z <= 0) {
                binary.z = 1500;
                binary.x = Math.random() * WIDTH - WIDTH / 2;
                binary.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update comets
        for (const comet of comets) {
            comet.z -= comet.speed * warpSpeed * 0.4;

            // Add tail position
            if (comet.tail.length < 20) {
                comet.tail.push({ x: comet.x, y: comet.y, z: comet.z });
            } else {
                comet.tail.shift();
                comet.tail.push({ x: comet.x, y: comet.y, z: comet.z });
            }

            if (comet.z <= 0) {
                comet.z = 2500;
                comet.x = Math.random() * WIDTH - WIDTH / 2;
                comet.y = Math.random() * HEIGHT - HEIGHT / 2;
                comet.tail = [];
            }
        }

        // Update space stations
        for (const station of spaceStations) {
            station.z -= station.speed * warpSpeed * 0.2;
            station.rotation += station.rotationSpeed;

            // Update lights
            for (const light of station.lights) {
                light.on = Math.sin(currentTime * 0.005 + light.phase) > 0;
            }

            if (station.z <= 0) {
                station.z = 1200;
                station.x = Math.random() * WIDTH - WIDTH / 2;
                station.y = Math.random() * HEIGHT / 2 - HEIGHT / 4;
            }
        }

        // Update ice crystals
        for (const crystal of iceCrystals) {
            crystal.z -= crystal.speed * warpSpeed * 0.3;
            crystal.rotation += crystal.rotationSpeed;
            if (crystal.z <= 0) {
                crystal.z = 1200;
                crystal.x = Math.random() * WIDTH - WIDTH / 2;
                crystal.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update cosmic dust (follows ship wake)
        for (const dust of cosmicDust) {
            dust.z -= dust.speed * warpSpeed * 0.6;
            // Add slight swirl effect
            const angle = currentTime * 0.001 + dust.z * 0.01;
            dust.x += Math.sin(angle) * 0.5;
            dust.y += Math.cos(angle) * 0.5;
            if (dust.z <= 0) {
                dust.z = 900;
                dust.x = Math.random() * WIDTH - WIDTH / 2;
                dust.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update dark matter clouds
        for (const cloud of darkMatterClouds) {
            cloud.z -= cloud.speed * warpSpeed * 0.15;
            cloud.shimmer += 0.02;
            if (cloud.z <= 0) {
                cloud.z = 4000;
                cloud.x = Math.random() * WIDTH - WIDTH / 2;
                cloud.y = Math.random() * HEIGHT - HEIGHT / 2;
            }
        }

        // Update motion blur trails
        if (warpSpeed > 8 || boostIntensity > 0.5) {
            if (motionBlurTrails.length < 10 && Math.random() < 0.3) {
                motionBlurTrails.push({
                    x: Math.random() * WIDTH,
                    y: Math.random() * HEIGHT,
                    life: 20,
                    alpha: 0.2 + Math.random() * 0.3
                });
            }
        }
        for (let i = motionBlurTrails.length - 1; i >= 0; i--) {
            motionBlurTrails[i].life--;
            if (motionBlurTrails[i].life <= 0) {
                motionBlurTrails.splice(i, 1);
            }
        }

        // Mouse trails disabled
        // Update mouse trails
        for (let i = mouseTrails.length - 1; i >= 0; i--) {
            mouseTrails[i].life -= 1;
            if (mouseTrails[i].life <= 0) {
                mouseTrails.splice(i, 1);
            }
        }

        // nebula offscreen and draw scaled - driven by mid frequencies
        const t = currentTime * 0.0002;
        paintNebulaToOffscreen(t, hueCycle, audioSystem.mid);

        // ========== APPLY SCREEN SHAKE ==========
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);

        // Deep space background - MUST BE DRAWN FIRST
        const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, WIDTH);
        bgGradient.addColorStop(0, `hsl(230,${20 + audioSystem.energy * 20}%,${5 + audioSystem.bass * 8}%)`);
        bgGradient.addColorStop(1, `hsl(240,${30 + audioSystem.energy * 15}%,${2 + audioSystem.bass * 5}%)`);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Motion blur trails
        for (const trail of motionBlurTrails) {
            const alpha = (trail.life / 20) * trail.alpha;
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.fillRect(trail.x - 2, 0, 4, HEIGHT);
        }

        // Hyperspace tunnel effect
        if (hyperspaceIntensity > 0) {
            ctx.save();
            ctx.globalAlpha = hyperspaceIntensity * 0.6;
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < 5; i++) {
                const tunnelRadius = (i / 5) * Math.min(WIDTH, HEIGHT) * 0.5;
                const gradient = ctx.createRadialGradient(centerX, centerY, tunnelRadius * 0.8, centerX, centerY, tunnelRadius);
                gradient.addColorStop(0, "rgba(100, 200, 255, 0)");
                gradient.addColorStop(0.5, `rgba(150, 220, 255, ${hyperspaceIntensity * 0.3})`);
                gradient.addColorStop(1, "rgba(200, 240, 255, 0)");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, tunnelRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 3D STARFIELD - Flying through space
        // Apply inverse ship movement to create cockpit view effect  
        ctx.save();
        ctx.translate(centerX, centerY - pitchOffset); // inverse pitch
        ctx.rotate(-rollAngle - bankingTilt); // inverse roll + banking
        ctx.translate(0, 0); // starfield center

        for (let i = 0; i < starfield.length; i++) {
            const star = starfield[i];

            // Move star toward camera (decrease z)
            star.z -= star.speed * warpSpeed;

            // Reset star when it passes camera
            if (star.z <= 0) {
                star.z = 1500;
                star.x = Math.random() * canvas.width - canvas.width / 2;
                star.y = Math.random() * canvas.height - canvas.height / 2;
            }

            // Project 3D to 2D
            const perspective = 300 / star.z;
            const projX = star.x * perspective;
            const projY = star.y * perspective;
            const starSize = (1 - star.z / 1500) * star.size * 3;

            // Spectrum-based star color zones
            const zoneIndex = Math.floor((star.z / 1500) * 7);
            const spectrumValues = [audioSystem.sparkle, audioSystem.treble, audioSystem.highMid, audioSystem.mid, audioSystem.lowMid, audioSystem.bass, audioSystem.subBass];
            const spectrumBoost = spectrumValues[zoneIndex] || 0;
            const starHue = star.hue + spectrumBoost * 30;

            // Star twinkling
            const twinkle = Math.sin(currentTime * 0.01 + i) * 0.2 + 0.8;

            // Draw star with motion trail
            const alpha = (1 - star.z / 1500) * (0.4 + audioSystem.sparkle * 0.6) * twinkle;

            // Trail
            const prevZ = star.z + star.speed * warpSpeed;
            const prevPerspective = 300 / prevZ;
            const prevX = star.x * prevPerspective;
            const prevY = star.y * prevPerspective;

            ctx.strokeStyle = `hsla(${starHue},70%,80%,${alpha * 0.5})`;
            ctx.lineWidth = starSize * 0.5;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(projX, projY);
            ctx.stroke();

            // Star point
            ctx.fillStyle = `hsla(${starHue},90%,90%,${alpha})`;
            ctx.shadowBlur = starSize * 3;
            ctx.shadowColor = `hsl(${starHue},100%,80%)`;
            ctx.beginPath();
            ctx.arc(projX, projY, starSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw binary stars
        for (const binary of binaryStars) {
            const perspective = 300 / binary.z;
            const baseX = binary.x * perspective;
            const baseY = binary.y * perspective;

            // Calculate orbital positions
            const orbitX = Math.cos(binary.orbit) * binary.distance * perspective;
            const orbitY = Math.sin(binary.orbit) * binary.distance * perspective;

            const star1X = baseX + orbitX;
            const star1Y = baseY + orbitY;
            const star2X = baseX - orbitX;
            const star2Y = baseY - orbitY;

            const starSize = (1 - binary.z / 1500) * 3;
            const alpha = (1 - binary.z / 1500) * 0.7;

            // Draw connecting lens flare
            ctx.strokeStyle = `hsla(200,100%,80%,${alpha * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(star1X, star1Y);
            ctx.lineTo(star2X, star2Y);
            ctx.stroke();

            // Star 1 (blue)
            ctx.fillStyle = `hsla(200,100%,80%,${alpha})`;
            ctx.shadowBlur = starSize * 4;
            ctx.shadowColor = `hsl(200,100%,80%)`;
            ctx.beginPath();
            ctx.arc(star1X, star1Y, starSize, 0, Math.PI * 2);
            ctx.fill();

            // Star 2 (red)
            ctx.fillStyle = `hsla(10,100%,70%,${alpha})`;
            ctx.shadowBlur = starSize * 4;
            ctx.shadowColor = `hsl(10,100%,70%)`;
            ctx.beginPath();
            ctx.arc(star2X, star2Y, starSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw shooting stars
        for (const star of shootingStars) {
            const perspective = 300 / star.z;
            const x = star.x * perspective;
            const y = star.y * perspective;

            // Create motion streak
            const tailLength = 30;
            const tailX = x - star.vx * tailLength;
            const tailY = y - star.vy * tailLength;

            const alpha = (star.life / 30) * 0.8;

            const gradient = ctx.createLinearGradient(x, y, tailX, tailY);
            gradient.addColorStop(0, `hsla(50,100%,90%,${alpha})`);
            gradient.addColorStop(1, `hsla(50,100%,90%,0)`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(50,100%,80%)`;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Bright head
            ctx.fillStyle = `hsla(50,100%,100%,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw comets
        for (const comet of comets) {
            if (comet.z <= 0) continue;
            const perspective = 300 / comet.z;
            const headX = comet.x * perspective;
            const headY = comet.y * perspective;
            const cometSize = Math.max(0.1, comet.size * (1 - comet.z / 1500));
            const alpha = (1 - comet.z / 1500) * 0.7;
            if (alpha <= 0 || cometSize <= 0) continue;

            // Draw tail particles
            for (let i = comet.tail.length - 1; i >= 0; i--) {
                const tailPos = comet.tail[i];
                if (!tailPos || tailPos.z <= 0) continue;

                const tailPerspective = 300 / tailPos.z;
                const tailX = tailPos.x * tailPerspective;
                const tailY = tailPos.y * tailPerspective;
                const tailAlpha = alpha * (i / comet.tail.length) * 0.5;
                const tailSize = cometSize * (i / comet.tail.length) * 2;

                ctx.fillStyle = `hsla(${comet.hue},80%,70%,${tailAlpha})`;
                ctx.shadowBlur = tailSize * 2;
                ctx.shadowColor = `hsl(${comet.hue},100%,80%)`;
                ctx.beginPath();
                ctx.arc(tailX, tailY, tailSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw comet head
            const outerSize = Math.max(1, cometSize * 2);
            const headGradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, outerSize);
            headGradient.addColorStop(0, `hsla(${comet.hue},100%,90%,${alpha})`);
            headGradient.addColorStop(0.5, `hsla(${comet.hue},90%,70%,${alpha * 0.7})`);
            headGradient.addColorStop(1, `hsla(${comet.hue},80%,50%,0)`);

            ctx.fillStyle = headGradient;
            ctx.shadowBlur = cometSize * 4;
            ctx.shadowColor = `hsl(${comet.hue},100%,80%)`;
            ctx.beginPath();
            ctx.arc(headX, headY, outerSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw space stations
        for (const station of spaceStations) {
            const perspective = 300 / station.z;
            const stationX = station.x * perspective;
            const stationY = station.y * perspective;
            const stationSize = station.size * (1 - station.z / 1500);
            const alpha = (1 - station.z / 1500) * 0.6;

            ctx.save();
            ctx.translate(stationX, stationY);
            ctx.rotate(station.rotation);

            // Main structure
            ctx.strokeStyle = `hsla(180,50%,60%,${alpha})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(180,50%,60%)`;

            // Ring structure
            ctx.beginPath();
            ctx.arc(0, 0, stationSize, 0, Math.PI * 2);
            ctx.stroke();

            // Cross beams
            ctx.beginPath();
            ctx.moveTo(-stationSize, 0);
            ctx.lineTo(stationSize, 0);
            ctx.moveTo(0, -stationSize);
            ctx.lineTo(0, stationSize);
            ctx.stroke();

            // Blinking lights
            for (const light of station.lights) {
                const lightAlpha = light.on ? alpha : alpha * 0.2;
                ctx.fillStyle = `hsla(${light.hue},100%,70%,${lightAlpha})`;
                ctx.shadowBlur = light.on ? 15 : 5;
                ctx.shadowColor = `hsl(${light.hue},100%,70%)`;
                ctx.beginPath();
                ctx.arc(light.x * stationSize, light.y * stationSize, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Draw distant ships
        for (const ship of distantShips) {
            const perspective = 300 / ship.z;
            const shipX = (ship.x - WIDTH / 2) * perspective;
            const shipY = (ship.y - HEIGHT / 2) * perspective;
            const shipSize = ship.size * (1 - ship.z / 1500);
            const shipAlpha = (1 - ship.z / 1500) * 0.8;

            ctx.fillStyle = `hsla(${ship.hue},70%,60%,${shipAlpha})`;
            ctx.shadowBlur = shipSize * 2;
            ctx.shadowColor = `hsl(${ship.hue},100%,70%)`;

            // Simple ship silhouette
            ctx.beginPath();
            ctx.moveTo(shipX, shipY - shipSize);
            ctx.lineTo(shipX - shipSize * 0.7, shipY + shipSize);
            ctx.lineTo(shipX + shipSize * 0.7, shipY + shipSize);
            ctx.closePath();
            ctx.fill();
        }

        // Draw distant planets
        for (const planet of distantPlanets) {
            const perspective = 300 / planet.z;
            const planetX = planet.x * perspective;
            const planetY = planet.y * perspective;
            const planetSize = planet.size * (1 - planet.z / 5000);
            const planetAlpha = (1 - planet.z / 5000) * 0.4;

            const planetGradient = ctx.createRadialGradient(planetX, planetY, 0, planetX, planetY, planetSize);
            planetGradient.addColorStop(0, `hsla(${planet.hue},60%,50%,${planetAlpha})`);
            planetGradient.addColorStop(0.7, `hsla(${planet.hue},50%,30%,${planetAlpha * 0.7})`);
            planetGradient.addColorStop(1, `hsla(${planet.hue},40%,20%,0)`);

            ctx.fillStyle = planetGradient;
            ctx.beginPath();
            ctx.arc(planetX, planetY, planetSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw nebula clouds (with lighter composite for visibility)
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const cloud of nebulaClouds) {
            const perspective = 300 / cloud.z;
            const cloudX = cloud.x * perspective;
            const cloudY = cloud.y * perspective;
            const cloudSize = cloud.size * (1 - cloud.z / 3500);
            const cloudAlpha = (1 - cloud.z / 3500) * cloud.opacity;

            const nebulaGradient = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudSize);
            nebulaGradient.addColorStop(0, `hsla(${cloud.hue},80%,60%,${cloudAlpha * 0.6})`);
            nebulaGradient.addColorStop(0.5, `hsla(${cloud.hue},70%,50%,${cloudAlpha * 0.4})`);
            nebulaGradient.addColorStop(1, `hsla(${cloud.hue},60%,40%,0)`);

            ctx.fillStyle = nebulaGradient;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw asteroids
        for (const asteroid of asteroids) {
            const perspective = 300 / asteroid.z;
            const asteroidX = asteroid.x * perspective;
            const asteroidY = asteroid.y * perspective;
            const asteroidSize = asteroid.size * (1 - asteroid.z / 2500);
            const asteroidAlpha = (1 - asteroid.z / 2500) * 0.7;

            ctx.save();
            ctx.translate(asteroidX, asteroidY);
            ctx.rotate(asteroid.rotation);
            ctx.fillStyle = `rgba(120, 100, 80, ${asteroidAlpha})`;
            ctx.strokeStyle = `rgba(80, 70, 60, ${asteroidAlpha})`;
            ctx.lineWidth = 1;

            // Draw irregular asteroid shape
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = asteroidSize * (0.7 + Math.random() * 0.3);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Draw space debris
        for (const debris of spaceDebris) {
            const perspective = 300 / debris.z;
            const debrisX = debris.x * perspective;
            const debrisY = debris.y * perspective;
            const debrisSize = debris.size * (1 - debris.z / 1500);
            const debrisAlpha = (1 - debris.z / 1500) * 0.6;

            ctx.fillStyle = `rgba(150, 150, 150, ${debrisAlpha})`;
            ctx.shadowBlur = debrisSize;
            ctx.shadowColor = `rgba(200, 200, 200, ${debrisAlpha})`;

            if (debris.type === 0) {
                // Square debris
                ctx.fillRect(debrisX - debrisSize / 2, debrisY - debrisSize / 2, debrisSize, debrisSize);
            } else if (debris.type === 1) {
                // Triangle debris
                ctx.beginPath();
                ctx.moveTo(debrisX, debrisY - debrisSize);
                ctx.lineTo(debrisX - debrisSize, debrisY + debrisSize);
                ctx.lineTo(debrisX + debrisSize, debrisY + debrisSize);
                ctx.closePath();
                ctx.fill();
            } else {
                // Circle debris
                ctx.beginPath();
                ctx.arc(debrisX, debrisY, debrisSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw dark matter clouds
        for (const cloud of darkMatterClouds) {
            if (cloud.z <= 0) continue;
            const perspective = 300 / cloud.z;
            const cloudX = cloud.x * perspective;
            const cloudY = cloud.y * perspective;
            const cloudSize = cloud.size * (1 - cloud.z / 4000);
            const shimmerAlpha = (Math.sin(cloud.shimmer) * 0.3 + 0.5) * (1 - cloud.z / 4000) * 0.15;

            const darkGradient = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudSize);
            darkGradient.addColorStop(0, `rgba(10, 5, 20, ${shimmerAlpha * 0.8})`);
            darkGradient.addColorStop(0.5, `rgba(15, 10, 30, ${shimmerAlpha * 0.5})`);
            darkGradient.addColorStop(1, `rgba(5, 0, 15, 0)`);

            ctx.fillStyle = darkGradient;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
            ctx.fill();

            // Subtle shimmer edge
            ctx.strokeStyle = `rgba(80, 60, 150, ${shimmerAlpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, cloudSize * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw ice crystals
        for (const crystal of iceCrystals) {
            if (crystal.z <= 0) continue;
            const perspective = 300 / crystal.z;
            const crystalX = crystal.x * perspective;
            const crystalY = crystal.y * perspective;
            const crystalSize = crystal.size * (1 - crystal.z / 1200);
            const alpha = (1 - crystal.z / 1200) * 0.6;

            ctx.save();
            ctx.translate(crystalX, crystalY);
            ctx.rotate(crystal.rotation);

            // Draw hexagonal crystal
            ctx.strokeStyle = `rgba(200, 230, 255, ${alpha})`;
            ctx.fillStyle = `rgba(180, 220, 255, ${alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * crystalSize;
                const y = Math.sin(angle) * crystalSize;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Draw cosmic dust
        for (const dust of cosmicDust) {
            if (dust.z <= 0) continue;
            const perspective = 300 / dust.z;
            const dustX = dust.x * perspective;
            const dustY = dust.y * perspective;
            const dustSize = dust.size * (1 - dust.z / 900);
            const alpha = (1 - dust.z / 900) * dust.opacity;

            ctx.fillStyle = `hsla(${dust.hue},60%,70%,${alpha})`;
            ctx.shadowBlur = dustSize * 3;
            ctx.shadowColor = `hsl(${dust.hue},80%,80%)`;
            ctx.beginPath();
            ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // VELOCITY-BASED MOUSE TRAILS - colorful motion streaks
        ctx.save();
        for (let i = 0; i < mouseTrails.length; i++) {
            const trail = mouseTrails[i];
            const alpha = trail.life / 30;
            const size = (trail.speed / 10) * alpha;

            ctx.fillStyle = `hsla(${trail.hue},100%,60%,${alpha * 0.6})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${trail.hue},100%,60%)`;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // talking lips (time-domain) - mid frequencies control amplitude
        // Apply inverse ship movement for cockpit view
        ctx.save();
        ctx.translate(centerX, centerY - pitchOffset);
        ctx.rotate(-rollAngle);
        ctx.translate(-centerX, 0);
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        const lipAmplitude = 100 + audioSystem.mid * 80;
        const skipStep = audioSystem.energy > 0.6 ? 8 : 4; // performance: skip points at high energy

        ctx.beginPath();
        for (let i = 0; i < waveArray.length; i += skipStep) {
            const x = (i / waveArray.length) * WIDTH;
            const v = waveArray[i] / 128.0;
            const y = (v - 1) * lipAmplitude - 20;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(hueCycle + 180) % 360},100%,60%,${0.75 + audioSystem.mid * 0.25})`;
        ctx.lineWidth = 4 + audioSystem.mid * 4;
        ctx.shadowBlur = 10 + audioSystem.mid * 8;
        ctx.shadowColor = "#fff";
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < waveArray.length; i += skipStep) {
            const x = (i / waveArray.length) * WIDTH;
            const v = waveArray[i] / 128.0;
            const y = -(v - 1) * lipAmplitude + 20;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(hueCycle + 200) % 360},100%,50%,${0.75 + audioSystem.mid * 0.25})`;
        ctx.lineWidth = 4 + audioSystem.mid * 4;
        ctx.shadowBlur = 10 + audioSystem.mid * 8;
        ctx.shadowColor = "#fff";
        ctx.stroke();
        ctx.restore();

        // PLANET CORE - Fixed in center of view
        const baseRadius = 140;
        const bassResponse = (audioSystem.bass + audioSystem.subBass * 1.5) / 2;
        const oscillation = Math.sin(currentTime * 0.003) * 15;

        const radius = baseRadius + bassResponse * 50 + oscillation;

        const planetHue = 120 + audioSystem.mid * 40; // green-blue planet tones

        const coreX = centerX; // Fixed in center
        const coreY = centerY; // Fixed in center

        // Ferrofluid core - organic waveform-driven shape
        // Apply inverse ship movement for cockpit view
        ctx.save();
        ctx.translate(centerX, centerY - pitchOffset);
        ctx.rotate(-rollAngle + planetRotation); // Add planet rotation
        ctx.translate(0, 0);

        const coreHue = 120 + audioSystem.mid * 40;

        // Draw ferrofluid blob with waveform spikes
        ctx.save();
        ctx.beginPath();
        const ferroStep = Math.max(8, Math.floor(waveArray.length / 64));
        for (let i = 0; i < waveArray.length; i += ferroStep) {
            const angle = (i / waveArray.length) * Math.PI * 2;
            const v = waveArray[i] / 128.0;
            const r = radius + (v - 1) * (50 + bassResponse * 40);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Ferrofluid gradient fill
        const ferroGradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.2);
        ferroGradient.addColorStop(0, `hsl(${coreHue},100%,70%)`);
        ferroGradient.addColorStop(0.5, `hsl(${coreHue},90%,50%)`);
        ferroGradient.addColorStop(1, `hsl(${coreHue - 20},80%,30%)`);
        ctx.fillStyle = ferroGradient;
        ctx.fill();

        // Draw surface hotspots
        for (const hotspot of surfaceHotspots) {
            const hotspotX = Math.cos(hotspot.angle) * radius;
            const hotspotY = Math.sin(hotspot.angle) * radius;
            const hotspotSize = Math.max(1, hotspot.intensity * 15);
            const hotspotAlpha = hotspot.intensity * 0.8;
            if (hotspotSize <= 0 || hotspotAlpha <= 0) continue;

            const hotspotGradient = ctx.createRadialGradient(hotspotX, hotspotY, 0, hotspotX, hotspotY, hotspotSize);
            hotspotGradient.addColorStop(0, `hsla(30,100%,80%,${hotspotAlpha})`);
            hotspotGradient.addColorStop(0.5, `hsla(20,100%,60%,${hotspotAlpha * 0.6})`);
            hotspotGradient.addColorStop(1, `hsla(10,100%,40%,0)`);

            ctx.fillStyle = hotspotGradient;
            ctx.beginPath();
            ctx.arc(hotspotX, hotspotY, hotspotSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw solar flares
        for (const flare of solarFlares) {
            const flareBase = Math.cos(flare.angle) * radius;
            const flareBaseY = Math.sin(flare.angle) * radius;
            const flareLength = flare.arcHeight * radius;
            const flareAlpha = flare.intensity * (flare.life / 40);

            // Arc path
            ctx.strokeStyle = `hsla(30,100%,80%,${flareAlpha})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsl(30,100%,80%)`;

            ctx.beginPath();
            ctx.moveTo(flareBase, flareBaseY);

            // Create arc with control points
            const controlDist = flareLength * 0.6;
            const perpAngle = flare.angle + Math.PI / 2;
            const controlX = flareBase + Math.cos(perpAngle) * controlDist;
            const controlY = flareBaseY + Math.sin(perpAngle) * controlDist;
            const endX = flareBase + Math.cos(flare.angle) * flareLength * 0.3;
            const endY = flareBaseY + Math.sin(flare.angle) * flareLength * 0.3;

            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            ctx.stroke();

            // Flare tip glow
            ctx.fillStyle = `hsla(50,100%,90%,${flareAlpha})`;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(endX, endY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner glow
        ctx.shadowBlur = 15 + audioSystem.energy * 15;
        ctx.shadowColor = `hsl(${coreHue},100%,60%)`;
        ctx.fill();

        // Atmospheric glow layers
        const atmLayers = 3;
        for (let i = 0; i < atmLayers; i++) {
            const layerRadius = radius * (1.1 + i * 0.15);
            const layerAlpha = (0.15 - i * 0.04) * (1 + audioSystem.mid * 0.5);

            const atmGradient = ctx.createRadialGradient(0, 0, radius, 0, 0, layerRadius);
            atmGradient.addColorStop(0, `hsla(${coreHue + 10},70%,60%,${layerAlpha})`);
            atmGradient.addColorStop(1, `hsla(${coreHue + 20},60%,50%,0)`);

            ctx.fillStyle = atmGradient;
            ctx.beginPath();
            ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // God rays from core
        if (godRayIntensity > 0.1) {
            const rayCount = 12;
            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2 + currentTime * 0.0005;
                const rayLength = radius * 2 + godRayIntensity * 100;
                const endX = Math.cos(angle) * rayLength;
                const endY = Math.sin(angle) * rayLength;

                const rayGradient = ctx.createLinearGradient(0, 0, endX, endY);
                rayGradient.addColorStop(0, `hsla(${coreHue},100%,70%,${godRayIntensity * 0.3})`);
                rayGradient.addColorStop(0.5, `hsla(${coreHue},90%,60%,${godRayIntensity * 0.15})`);
                rayGradient.addColorStop(1, `hsla(${coreHue},80%,50%,0)`);

                ctx.strokeStyle = rayGradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        ctx.restore();

        // Ferrofluid particle bursts on bass drops
        if (audioSystem.beatDetected && audioSystem.bass > 0.7) {
            const burstCount = Math.floor(audioSystem.bass * 8);
            for (let i = 0; i < burstCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                const particleSize = 2 + Math.random() * 3;
                const particleLife = 30 + Math.random() * 40;

                // Create burst particle
                if (particles.length < particleLimit) {
                    spawnParticles(0, 0, 1, speed, coreHue + Math.random() * 60 - 30);
                }
            }

            // Create shockwave on beat
            shockwaves.push({
                x: 0,
                y: 0,
                radius: radius,
                speed: 5 + audioSystem.bass * 5,
                life: 40,
                maxLife: 40,
                hue: coreHue
            });
        }

        ctx.restore();

        // SPACESHIP SCANNER RINGS - orbital scan patterns
        ctx.save();
        ctx.translate(coreX - centerX, coreY - centerY); // Relative to ship movement
        ctx.translate(centerX, centerY - pitchOffset);
        ctx.rotate(-rollAngle);
        ctx.translate(0, 0);

        // Draw shockwaves
        for (const wave of shockwaves) {
            const alpha = wave.life / wave.maxLife;
            ctx.strokeStyle = `hsla(${wave.hue},80%,60%,${alpha * 0.6})`;
            ctx.lineWidth = 3 + alpha * 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${wave.hue},100%,60%)`;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.strokeStyle = `hsla(${wave.hue},90%,80%,${alpha * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.strokeStyle = `rgba(0,255,255,${0.25 + audioSystem.lowMid * 0.25})`;
        const rippleStep = Math.max(8, Math.floor(waveArray.length / 64));
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let j = 0; j < waveArray.length; j += rippleStep) {
                const angle = (j / waveArray.length) * Math.PI * 2;
                const v = waveArray[j] / 128.0;
                const r = radius * 0.3 + i * 15 + (v - 1) * (6 + audioSystem.lowMid * 8);
                const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
                if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(0,255,255,0.5)";
            ctx.stroke();
        }
        ctx.restore();

        // SPACESHIP TARGETING RETICLE - energy beams
        ctx.save();
        ctx.translate(coreX, coreY);
        ctx.beginPath();
        const spikeStep = Math.max(4, Math.floor(waveArray.length / 128));
        for (let i = 0; i < waveArray.length; i += spikeStep) {
            const angle = (i / waveArray.length) * Math.PI * 2;
            const v = waveArray[i] / 128.0;
            const r = radius + (v - 1) * (50 + bassResponse * 40);
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(0,255,255,${0.8 + bassResponse * 0.2})`;
        ctx.lineWidth = 1.5 + bassResponse * 1.5;
        ctx.shadowBlur = 40 + bassResponse * 25;
        ctx.shadowColor = "rgba(0,255,255,0.8)";
        ctx.stroke();
        ctx.restore();

        // SPACESHIP SENSOR ARRAY - energy beams scanning around planet
        const beamRadius = radius + 100;
        ctx.save();
        ctx.translate(coreX, coreY);
        const beamStep = audioSystem.treble > 0.6 ? 8 : 4;
        for (let i = 0; i < waveArray.length; i += beamStep) {
            if (audioSystem.treble > 0.7 && (i % 12 === 0)) continue; // energy fluctuation
            const angle = (i / waveArray.length) * Math.PI * 2 + rotation;
            const v = waveArray[i] / 128.0;
            const r = beamRadius + (v - 1) * (30 + audioSystem.highMid * 25);
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            const alpha = 0.65 + audioSystem.highMid * 0.35;
            ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
            ctx.lineWidth = i % 2 === 0 ? 2.5 : 1;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(0,200,255,0.6)";
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * beamRadius, Math.sin(angle) * beamRadius);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.restore();

        // aura ripples - energy drives speed, sparkle drives brightness
        const rippleCount = 3; // reduced from 4 for performance
        let rippleEdge = 0;
        for (let i = 0; i < rippleCount; i++) {
            const maxRadius = Math.min(WIDTH, HEIGHT) / 2;
            const speed = 0.04 + audioSystem.energy * 0.3;
            const rippleRadius = ((currentTime * speed + i * 400) % maxRadius);
            rippleEdge = rippleRadius;
            const alpha = Math.max(0, (1 - rippleRadius / maxRadius));
            const brightness = 0.25 + audioSystem.sparkle * 0.5;
            const width = 1.5 + audioSystem.energy * 2.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${alpha * brightness})`;
            ctx.lineWidth = width;
            ctx.stroke();
        }

        // particle spawning - beat detection triggers bursts
        if (audioSystem.beatDetected) {
            const burstCount = Math.floor(15 + audioSystem.energy * 20);
            spawnParticles(coreX, coreY, burstCount, audioSystem.bass, coreHue);
        }

        // continuous particle emission at ripple edge - sparkle frequencies
        const spawnChance = 0.15 + audioSystem.sparkle * 0.6;
        if (Math.random() < spawnChance && particles.length < MAX_PARTICLES) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 1.2 + audioSystem.energy * 0.8;
            const size = Math.random() * 2.5 + audioSystem.sparkle * 1.2;
            const x = centerX + Math.cos(angle) * rippleEdge;
            const y = centerY + Math.sin(angle) * rippleEdge;
            const hue = (coreHue + 180 + Math.random() * 60 + cursorHueShift * 0.5) % 360; // cursor affects particle color
            const life = 50 + Math.random() * 70;

            // Reuse or create particle
            let spawned = false;
            for (let j = 0; j < particles.length; j++) {
                if (!particles[j].active) {
                    particles[j].reset(x, y, angle, speed, size, hue, life);
                    spawned = true;
                    break;
                }
            }
            if (!spawned && particles.length < MAX_PARTICLES) {
                particles.push(new Particle(x, y, angle, speed, size, hue, life));
            }
        }

        // particles update/draw - optimized loop
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.active) {
                p.update();
                p.draw(ctx);
            }
        }

        // Draw thruster particles - DISABLED (distracting)
        /*
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const p of thrusterParticles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `hsla(${p.hue},100%,60%,${alpha})`;
            ctx.shadowBlur = p.size * 3;
            ctx.shadowColor = `hsl(${p.hue},100%,70%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        */

        // lattices - smooth rendering without glitch
        drawLattice(ctx, centerX, centerY, WIDTH, HEIGHT, 0, 2.5, 40, audioSystem.treble, false);
        drawLattice(ctx, centerX, centerY, WIDTH, HEIGHT, 12, 1.2, 200, audioSystem.sparkle, true);

        // ========== ENGINE HUM VISUALIZATION - Side bars ==========
        ctx.save();
        ctx.globalAlpha = 0.8 * audioFadeIn;

        // Left engine bar
        const leftBarX = 20;
        const leftBarY = HEIGHT * 0.3;
        const engineBarWidth = 15;
        const barHeight = HEIGHT * 0.4;

        const bassLevel = audioSystem.bass + audioSystem.subBass * 0.5;
        const leftHeight = barHeight * bassLevel;

        const leftGradient = ctx.createLinearGradient(leftBarX, leftBarY + barHeight, leftBarX, leftBarY + barHeight - leftHeight);
        leftGradient.addColorStop(0, hudColor);
        leftGradient.addColorStop(1, hudColorSecondary);

        ctx.fillStyle = leftGradient;
        ctx.fillRect(leftBarX, leftBarY + barHeight - leftHeight, engineBarWidth, leftHeight);

        // Border
        ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.5)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(leftBarX, leftBarY, engineBarWidth, barHeight);

        // Right engine bar
        const rightBarX = WIDTH - 35;
        const rightHeight = barHeight * bassLevel;

        const rightGradient = ctx.createLinearGradient(rightBarX, leftBarY + barHeight, rightBarX, leftBarY + barHeight - rightHeight);
        rightGradient.addColorStop(0, hudColor);
        rightGradient.addColorStop(1, hudColorSecondary);

        ctx.fillStyle = rightGradient;
        ctx.fillRect(rightBarX, leftBarY + barHeight - rightHeight, engineBarWidth, rightHeight);

        ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.5)`;
        ctx.strokeRect(rightBarX, leftBarY, engineBarWidth, barHeight);

        ctx.restore();

        // ============ VCR OSCILLOSCOPE EFFECTS ============

        // Phosphor trails disabled to prevent image repetition

        // 2. SPACESHIP WAVEFORM HUD - Tech display panel
        const hudY = HEIGHT * 0.15;
        const hudHeight = 80;
        const hudWidth = WIDTH * 0.9;
        const hudX = WIDTH * 0.05;

        ctx.save();
        // Ensure clean state
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;

        // Tech grid lines
        ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const x = hudX + (i / 10) * hudWidth;
            ctx.beginPath();
            ctx.moveTo(x, hudY - hudHeight / 2);
            ctx.lineTo(x, hudY + hudHeight / 2);
            ctx.stroke();
        }

        // Center reference line
        ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.moveTo(hudX, hudY);
        ctx.lineTo(hudX + hudWidth, hudY);
        ctx.stroke();

        // Tech panel borders
        ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hudX - 5, hudY - hudHeight / 2 - 5, hudWidth + 10, hudHeight + 10);

        // Draw waveform display
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(0, 255, 255, 0.8)";

        const hudStep = Math.max(2, Math.floor(waveArray.length / hudWidth));
        for (let i = 0; i < waveArray.length; i += hudStep) {
            const x = hudX + (i / waveArray.length) * hudWidth;
            const v = (waveArray[i] / 128.0 - 1);
            const y = hudY + v * (hudHeight * 0.4);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
        ctx.restore();

        // 3. NAVIGATION COMPUTER - Coordinate system display (overlays planet)
        const navSize = 120;
        const navX = coreX; // centered on planet
        const navY = coreY; // centered on planet

        ctx.save();
        // Ensure clean state
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        ctx.translate(navX, navY);

        // Navigation ring
        ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, navSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Coordinate grid
        ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.moveTo(-navSize / 2, 0);
        ctx.lineTo(navSize / 2, 0);
        ctx.moveTo(0, -navSize / 2);
        ctx.lineTo(0, navSize / 2);
        ctx.stroke();

        // Navigation pattern (audio-reactive coordinates)
        ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();

        const navStep = Math.max(4, Math.floor(waveArray.length / 64));
        for (let i = 0; i < waveArray.length; i += navStep) {
            const leftIdx = i;
            const rightIdx = (i + Math.floor(waveArray.length / 4)) % waveArray.length;

            const x = ((waveArray[leftIdx] / 128.0) - 1) * (navSize * 0.4);
            const y = ((waveArray[rightIdx] / 128.0) - 1) * (navSize * 0.4);

            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();

        // CRT scan lines disabled to prevent flickering

        // ============ ADVANCED RETRO EFFECTS ============

        // 6. POWER SYSTEMS DISPLAY - Spaceship energy levels (moved to top-right)
        const powerWidth = 150;
        const powerHeight = 20;
        const powerX = WIDTH - powerWidth - 30;
        const powerY1 = 90; // Top-right, below velocity display
        const powerY2 = 120; // Stack vertically

        // Calculate power levels from frequency bands
        const powerLevel1 = (audioSystem.bass + audioSystem.mid) / 2;
        const powerLevel2 = (audioSystem.lowMid + audioSystem.highMid) / 2;

        // Peak hold with decay
        if (powerLevel1 > vuMeterLPeak) {
            vuMeterLPeak = powerLevel1;
            vuMeterLDecay = 30;
        } else if (vuMeterLDecay > 0) {
            vuMeterLDecay--;
        } else {
            vuMeterLPeak *= 0.95;
        }

        if (powerLevel2 > vuMeterRPeak) {
            vuMeterRPeak = powerLevel2;
            vuMeterRDecay = 30;
        } else if (vuMeterRDecay > 0) {
            vuMeterRDecay--;
        } else {
            vuMeterRPeak *= 0.95;
        }

        // Draw Power Level 1 - "THRUSTERS"
        ctx.save();
        // Ensure clean state
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;

        // Always draw the frame and label (not dependent on audio)
        ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(powerX, powerY1, powerWidth, powerHeight);

        // Label
        ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
        ctx.font = "10px 'Courier New', monospace";
        ctx.fillText("THRUSTERS", powerX, powerY1 - 5);

        // Segmented tech bar - always show at least a minimum
        const segments = 20;
        const displayLevel1 = Math.max(powerLevel1, 0.15); // minimum 15% display
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
        for (let i = 0; i < segments; i++) {
            const segWidth = (powerWidth - segments) / segments;
            const x = powerX + i * (segWidth + 1);
            const ratio = i / segments;

            if (ratio < displayLevel1) {
                // Cyan gradient
                let alpha = ratio < 0.7 ? 0.9 : ratio < 0.9 ? 1.0 : 1.0;
                ctx.fillStyle = `rgba(0, ${Math.floor(200 + ratio * 55)}, 255, ${alpha})`;
                ctx.fillRect(x, powerY1 + 2, segWidth, powerHeight - 4);
            }
        }

        // Peak indicator
        ctx.shadowBlur = 0;
        const peakX1 = powerX + vuMeterLPeak * powerWidth;
        ctx.fillStyle = "rgba(255, 100, 0, 0.9)";
        ctx.fillRect(peakX1 - 2, powerY1, 2, powerHeight);

        // Draw Power Level 2 - "SHIELDS"
        ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(powerX, powerY2, powerWidth, powerHeight);

        ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
        ctx.font = "10px 'Courier New', monospace";
        ctx.fillText("SHIELDS", powerX, powerY2 - 5);

        const displayLevel2 = Math.max(powerLevel2, 0.15); // minimum 15% display
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
        for (let i = 0; i < segments; i++) {
            const segWidth = (powerWidth - segments) / segments;
            const x = powerX + i * (segWidth + 1);
            const ratio = i / segments;

            if (ratio < displayLevel2) {
                let alpha = ratio < 0.7 ? 0.9 : ratio < 0.9 ? 1.0 : 1.0;
                ctx.fillStyle = `rgba(0, ${Math.floor(200 + ratio * 55)}, 255, ${alpha})`;
                ctx.fillRect(x, powerY2 + 2, segWidth, powerHeight - 4);
            }
        }

        ctx.shadowBlur = 0;
        const peakX2 = powerX + vuMeterRPeak * powerWidth;
        ctx.fillStyle = "rgba(255, 100, 0, 0.9)";
        ctx.fillRect(peakX2 - 2, powerY2, 2, powerHeight);

        // Ensure visibility and reset all state
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();

        // 7. FREQUENCY SCANNER - Vertical spectrum display
        if (showSpectrum) {
            const scannerWidth = 250;
            const scannerHeight = 120;
            const scannerX = WIDTH - scannerWidth - 30;
            const scannerY = HEIGHT - scannerHeight - 20;
            const barWidth = (scannerWidth / spectrumBars) - 2;

            ctx.save();
            // Ensure clean state
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = "source-over";
            ctx.shadowBlur = 0;
            // Tech frame - always visible
            ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(scannerX - 5, scannerY - 5, scannerWidth + 10, scannerHeight + 10);

            // Label - always visible
            ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
            ctx.font = "10px 'Courier New', monospace";
            ctx.fillText("FREQUENCY SCANNER", scannerX, scannerY - 10);

            // Draw frequency bars
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(0, 255, 255, 0.6)";
            for (let i = 0; i < spectrumBars; i++) {
                const binStart = Math.floor((i / spectrumBars) * freqArray.length * 0.5);
                const binEnd = Math.floor(((i + 1) / spectrumBars) * freqArray.length * 0.5);
                const barLevel = avgRange(freqArray, binStart, binEnd) / 255;

                // Peak detection with decay
                if (barLevel > spectrumPeaks[i]) {
                    spectrumPeaks[i] = barLevel;
                    spectrumPeakDecay[i] = 20;
                } else if (spectrumPeakDecay[i] > 0) {
                    spectrumPeakDecay[i]--;
                } else {
                    spectrumPeaks[i] *= 0.92;
                }

                const barHeight = barLevel * scannerHeight;
                const x = scannerX + i * (barWidth + 2);
                const y = scannerY + scannerHeight - barHeight;

                // Cyan gradient
                const gradient = ctx.createLinearGradient(x, scannerY + scannerHeight, x, y);
                gradient.addColorStop(0, "rgba(0, 150, 200, 0.8)");
                gradient.addColorStop(0.5, "rgba(0, 200, 255, 0.9)");
                gradient.addColorStop(1, "rgba(100, 255, 255, 1.0)");

                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, barHeight);

                // Peak indicator
                ctx.shadowBlur = 0;
                const peakY = scannerY + scannerHeight - (spectrumPeaks[i] * scannerHeight);
                ctx.fillStyle = "rgba(255, 100, 0, 0.9)";
                ctx.fillRect(x, peakY - 2, barWidth, 2);
            }

            // Ensure visibility and reset all state
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = "source-over";
            ctx.restore();
        }

        // ========== TARGET LOCK INDICATORS ==========
        ctx.save();
        for (const lock of targetLocks) {
            const age = currentTime - lock.time;
            const alpha = (1 - age / lock.life) * lock.scale;
            const size = 30 * lock.scale;

            ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},${alpha})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10 * alpha;
            ctx.shadowColor = hudColor;

            // Crosshair
            ctx.beginPath();
            ctx.moveTo(lock.x - size, lock.y);
            ctx.lineTo(lock.x + size, lock.y);
            ctx.moveTo(lock.x, lock.y - size);
            ctx.lineTo(lock.x, lock.y + size);
            ctx.stroke();

            // Corner brackets
            const cornerSize = size * 0.7;
            ctx.beginPath();
            // Top-left
            ctx.moveTo(lock.x - size, lock.y - size + cornerSize);
            ctx.lineTo(lock.x - size, lock.y - size);
            ctx.lineTo(lock.x - size + cornerSize, lock.y - size);
            // Top-right
            ctx.moveTo(lock.x + size - cornerSize, lock.y - size);
            ctx.lineTo(lock.x + size, lock.y - size);
            ctx.lineTo(lock.x + size, lock.y - size + cornerSize);
            // Bottom-right
            ctx.moveTo(lock.x + size, lock.y + size - cornerSize);
            ctx.lineTo(lock.x + size, lock.y + size);
            ctx.lineTo(lock.x + size - cornerSize, lock.y + size);
            // Bottom-left
            ctx.moveTo(lock.x - size + cornerSize, lock.y + size);
            ctx.lineTo(lock.x - size, lock.y + size);
            ctx.lineTo(lock.x - size, lock.y + size - cornerSize);
            ctx.stroke();

            // Rotating ring
            ctx.beginPath();
            ctx.arc(lock.x, lock.y, size * 0.5, age * 0.005, age * 0.005 + Math.PI);
            ctx.stroke();
        }
        ctx.restore();

        // Cockpit Dust Particles
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const dust of cockpitDust) {
            ctx.fillStyle = `rgba(200, 200, 220, ${dust.opacity * dust.z})`;
            ctx.beginPath();
            ctx.arc(dust.x, dust.y, dust.size * (0.5 + dust.z), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Screen Flicker Effect
        if (screenFlicker > 0) {
            ctx.save();
            ctx.globalAlpha = screenFlicker;
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.restore();
        }

        // Warning Lights
        if (warningFlash > 0.1) {
            ctx.save();
            ctx.globalAlpha = warningFlash;
            ctx.fillStyle = "rgba(255, 50, 50, 0.8)";
            ctx.font = "bold 18px 'Courier New', monospace";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(255, 50, 50, 1)";
            ctx.fillText("! WARNING !", centerX - 60, 40);

            // Warning indicator boxes
            ctx.strokeStyle = "rgba(255, 50, 50, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 80, 20, 20, 20);
            ctx.strokeRect(centerX + 60, 20, 20, 20);
            ctx.fillStyle = "rgba(255, 50, 50, 0.5)";
            ctx.fillRect(centerX - 80, 20, 20, 20);
            ctx.fillRect(centerX + 60, 20, 20, 20);
            ctx.restore();
        }

        // ========== HUD GLARE ON ENERGY SPIKES ==========
        if (audioSystem.energy > 0.8) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = (audioSystem.energy - 0.8) * 0.3;
            const glareGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, WIDTH);
            glareGradient.addColorStop(0, hudColor);
            glareGradient.addColorStop(0.3, `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.1)`);
            glareGradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glareGradient;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.restore();
        }

        // ========== CHROMATIC ABERRATION ON BASS ==========
        if (chromaticIntensity > 0.5) {
            ctx.save();
            ctx.globalAlpha = chromaticIntensity * 0.15;
            ctx.globalCompositeOperation = "lighter";

            // Red channel offset
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fillRect(microVibrationX * 2, microVibrationY * 2, WIDTH, HEIGHT);

            // Blue channel offset
            ctx.fillStyle = "rgba(0, 100, 255, 0.3)";
            ctx.fillRect(-microVibrationX * 2, -microVibrationY * 2, WIDTH, HEIGHT);
            ctx.restore();
        }

        // ========== COCKPIT FRAME / VIGNETTE ==========
        ctx.save();
        const vignetteGradient = ctx.createRadialGradient(centerX, centerY, WIDTH * 0.3, centerX, centerY, WIDTH * 0.7);
        vignetteGradient.addColorStop(0, "rgba(0,0,0,0)");
        vignetteGradient.addColorStop(0.7, "rgba(0,0,0,0.1)");
        vignetteGradient.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Cockpit frame corners
        ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.3)`;
        ctx.lineWidth = 3;
        const frameSize = 50;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(0, frameSize);
        ctx.lineTo(0, 0);
        ctx.lineTo(frameSize, 0);
        // Top-right
        ctx.moveTo(WIDTH - frameSize, 0);
        ctx.lineTo(WIDTH, 0);
        ctx.lineTo(WIDTH, frameSize);
        // Bottom-right
        ctx.moveTo(WIDTH, HEIGHT - frameSize);
        ctx.lineTo(WIDTH, HEIGHT);
        ctx.lineTo(WIDTH - frameSize, HEIGHT);
        // Bottom-left
        ctx.moveTo(frameSize, HEIGHT);
        ctx.lineTo(0, HEIGHT);
        ctx.lineTo(0, HEIGHT - frameSize);
        ctx.stroke();
        ctx.restore();

        // ========== EM INTERFERENCE EFFECT ==========
        if (emInterference > 0.1) {
            ctx.save();
            ctx.globalAlpha = emInterference * 0.3;
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * WIDTH;
                const y = Math.random() * HEIGHT;
                ctx.strokeStyle = `hsl(${180 + Math.random() * 60}, 80%, 70%)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ========== HOLOGRAPHIC GLITCH ==========
        if (holographicGlitch > 0.1) {
            ctx.save();
            ctx.globalAlpha = holographicGlitch * 0.4;
            const glitchHeight = 5 + Math.random() * 20;
            const glitchY = Math.random() * HEIGHT;
            ctx.fillStyle = `rgba(0, 255, 255, 0.3)`;
            ctx.fillRect(0, glitchY, WIDTH, glitchHeight);

            // Horizontal glitch lines
            for (let i = 0; i < 3; i++) {
                const lineY = Math.random() * HEIGHT;
                ctx.fillRect(0, lineY, WIDTH, 2);
            }
            ctx.restore();
        }

        // ========== SCREEN CRACKS ==========
        for (const crack of screenCracks) {
            ctx.save();
            ctx.strokeStyle = `rgba(200, 220, 255, ${crack.alpha})`;
            ctx.lineWidth = 2;

            for (let i = 0; i < 5; i++) {
                const angle = crack.angle + (Math.random() - 0.5) * 0.5;
                const length = crack.size * (0.5 + Math.random() * 0.5);
                const endX = crack.x + Math.cos(angle) * length;
                const endY = crack.y + Math.sin(angle) * length;

                ctx.beginPath();
                ctx.moveTo(crack.x, crack.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Branch cracks
                if (Math.random() < 0.5) {
                    const branchAngle = angle + (Math.random() - 0.5) * 1;
                    const branchLen = length * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX + Math.cos(branchAngle) * branchLen, endY + Math.sin(branchAngle) * branchLen);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Close screen shake transform
        ctx.restore();

        // ========== FUTURISTIC SHIP HUD ELEMENTS ==========

        // Speed/Velocity Indicator
        ctx.save();
        ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.9)`;
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.shadowBlur = 10;
        ctx.shadowColor = hudColor;
        const speedText = `VELOCITY: ${Math.floor(warpSpeed * 100)} m/s`;
        ctx.fillText(speedText, WIDTH - 280, 50);

        ctx.font = "12px 'Courier New', monospace";
        ctx.fillStyle = `rgba(${scheme.secondary[0]},${scheme.secondary[1]},${scheme.secondary[2]},0.8)`;
        ctx.fillText(`BOOST: ${boostMode ? 'ACTIVE' : 'STANDBY'}`, WIDTH - 280, 70);
        ctx.restore();

        // Distance Meter
        ctx.save();
        ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.8)`;
        ctx.font = "14px 'Courier New', monospace";
        ctx.shadowBlur = 8;
        ctx.shadowColor = hudColor;
        ctx.fillText(`DIST: ${Math.floor(distanceTraveled).toLocaleString()} km`, 30, 80);
        ctx.restore();

        // Galactic Coordinates
        ctx.save();
        ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.8)`;
        ctx.font = "12px 'Courier New', monospace";
        ctx.shadowBlur = 6;
        ctx.shadowColor = hudColor;
        ctx.fillText(`COORDS: ${Math.floor(galacticCoords.x)} / ${Math.floor(galacticCoords.y)} / ${Math.floor(galacticCoords.z)}`, 30, 100);
        ctx.restore();

        // Holographic Scanlines
        if (showScanlines) {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.5)`;
            ctx.lineWidth = 1;
            for (let y = 0; y < HEIGHT; y += 4) {
                ctx.beginPath();
                ctx.moveTo(0, y + (currentTime * 0.02) % 4);
                ctx.lineTo(WIDTH, y + (currentTime * 0.02) % 4);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Radar Display
        if (showRadar) {
            const radarX = 120;
            const radarY = HEIGHT - 120;
            const radarRadius = 90;

            ctx.save();

            // Radar background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(radarX, radarY, radarRadius, 0, Math.PI * 2);
            ctx.fill();

            // Radar border
            ctx.strokeStyle = hudColor;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = hudColor;
            ctx.stroke();

            // Range rings
            ctx.strokeStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.3)`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            for (let r = radarRadius / 3; r < radarRadius; r += radarRadius / 3) {
                ctx.beginPath();
                ctx.arc(radarX, radarY, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Cross hairs
            ctx.beginPath();
            ctx.moveTo(radarX - radarRadius, radarY);
            ctx.lineTo(radarX + radarRadius, radarY);
            ctx.moveTo(radarX, radarY - radarRadius);
            ctx.lineTo(radarX, radarY + radarRadius);
            ctx.stroke();

            // Sweeping radar arm
            const sweepAngle = (currentTime * 0.002) % (Math.PI * 2);
            ctx.strokeStyle = hudColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(radarX, radarY);
            ctx.lineTo(
                radarX + Math.cos(sweepAngle) * radarRadius,
                radarY + Math.sin(sweepAngle) * radarRadius
            );
            ctx.stroke();

            // Sweep gradient trail
            const sweepGradient = ctx.createRadialGradient(radarX, radarY, 0, radarX, radarY, radarRadius);
            sweepGradient.addColorStop(0, `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.4)`);
            sweepGradient.addColorStop(1, `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0)`);
            ctx.fillStyle = sweepGradient;
            ctx.beginPath();
            ctx.moveTo(radarX, radarY);
            ctx.arc(radarX, radarY, radarRadius, sweepAngle - 0.5, sweepAngle);
            ctx.lineTo(radarX, radarY);
            ctx.fill();

            ctx.globalAlpha = 1;

            // Plot environmental objects on radar
            const radarRange = 2000;

            // Asteroids
            ctx.fillStyle = `rgba(${scheme.secondary[0]},${scheme.secondary[1]},${scheme.secondary[2]},0.9)`;
            for (const asteroid of asteroids) {
                const dx = asteroid.x;
                const dz = asteroid.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < radarRange) {
                    const radarDist = (dist / radarRange) * radarRadius;
                    const angle = Math.atan2(dz, dx);
                    const rx = radarX + Math.cos(angle) * radarDist;
                    const ry = radarY + Math.sin(angle) * radarDist;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Debris
            ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.6)`;
            for (const debris of debrisField) {
                const dx = debris.x;
                const dz = debris.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < radarRange) {
                    const radarDist = (dist / radarRange) * radarRadius;
                    const angle = Math.atan2(dz, dx);
                    const rx = radarX + Math.cos(angle) * radarDist;
                    const ry = radarY + Math.sin(angle) * radarDist;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Other ships (highlighted)
            ctx.fillStyle = hudColor;
            ctx.shadowBlur = 6;
            ctx.shadowColor = hudColor;
            for (const ship of otherShips) {
                const dx = ship.x;
                const dz = ship.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < radarRange) {
                    const radarDist = (dist / radarRange) * radarRadius;
                    const angle = Math.atan2(dz, dx);
                    const rx = radarX + Math.cos(angle) * radarDist;
                    const ry = radarY + Math.sin(angle) * radarDist;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 3, 0, Math.PI * 2);
                    ctx.fill();

                    // Ship indicator triangle
                    ctx.beginPath();
                    ctx.moveTo(rx, ry - 5);
                    ctx.lineTo(rx - 3, ry + 3);
                    ctx.lineTo(rx + 3, ry + 3);
                    ctx.closePath();
                    ctx.stroke();
                }
            }

            // Space stations (large markers)
            for (const station of spaceStations) {
                const dx = station.x;
                const dz = station.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < radarRange) {
                    const radarDist = (dist / radarRange) * radarRadius;
                    const angle = Math.atan2(dz, dx);
                    const rx = radarX + Math.cos(angle) * radarDist;
                    const ry = radarY + Math.sin(angle) * radarDist;

                    ctx.strokeStyle = hudColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(rx - 7, ry);
                    ctx.lineTo(rx + 7, ry);
                    ctx.moveTo(rx, ry - 7);
                    ctx.lineTo(rx, ry + 7);
                    ctx.stroke();
                }
            }

            ctx.shadowBlur = 0;

            // Player indicator (center)
            ctx.fillStyle = hudColor;
            ctx.strokeStyle = hudColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(radarX, radarY - 6);
            ctx.lineTo(radarX - 4, radarY + 4);
            ctx.lineTo(radarX + 4, radarY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Radar label
            ctx.fillStyle = hudColor;
            ctx.font = "bold 12px 'Courier New', monospace";
            ctx.shadowBlur = 6;
            ctx.shadowColor = hudColor;
            ctx.textAlign = "center";
            ctx.fillText("RADAR", radarX, radarY + radarRadius + 20);
            ctx.textAlign = "left";

            ctx.restore();
        }

        // ========== FPS COUNTER ==========
        if (showFPS) {
            ctx.save();
            ctx.fillStyle = fps < 30 ? "rgba(255, 100, 100, 0.9)" : "rgba(100, 255, 100, 0.9)";
            ctx.font = "16px 'Courier New', monospace";
            ctx.fillText(`FPS: ${fps}`, 10, 30);
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "12px 'Courier New', monospace";
            ctx.fillText(`HUD: ${HUD_SCHEMES[currentHUDScheme].name}`, 10, 50);
            ctx.fillText(`Boost: ${boostMode ? 'ON' : 'OFF'}`, 10, 65);
            ctx.fillText(`Quality: ${adaptiveQuality ? 'AUTO' : 'FIXED'}`, 10, 80);
            ctx.fillText(`Particles: ${particles.length}/${particleLimit}`, 10, 95);
            ctx.restore();
        }

        // ========== SHIP SYSTEMS DISPLAY ==========
        if (showSystemPanel) {
            ctx.save();
            const sysX = 30;
            const sysY = HEIGHT - 220;

            // System panel background
            ctx.fillStyle = "rgba(0, 20, 40, 0.7)";
            ctx.strokeStyle = hudColor;
            ctx.lineWidth = 2;
            ctx.fillRect(sysX - 10, sysY - 10, 200, 180);
            ctx.strokeRect(sysX - 10, sysY - 10, 200, 180);

            ctx.font = "12px 'Courier New', monospace";
            ctx.fillStyle = hudColor;
            ctx.fillText("SHIP SYSTEMS", sysX, sysY);

            // Hull Integrity
            const hullColor = shipHull > 60 ? "rgba(0, 255, 100, 0.9)" : shipHull > 30 ? "rgba(255, 200, 0, 0.9)" : "rgba(255, 50, 50, 0.9)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(`HULL: ${Math.floor(shipHull)}%`, sysX, sysY + 25);
            ctx.fillStyle = hullColor;
            ctx.fillRect(sysX + 80, sysY + 15, shipHull * 1, 10);
            ctx.strokeStyle = hudColor;
            ctx.strokeRect(sysX + 80, sysY + 15, 100, 10);

            // Fuel
            const fuelColor = shipFuel > 40 ? "rgba(0, 200, 255, 0.9)" : "rgba(255, 150, 0, 0.9)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(`FUEL: ${Math.floor(shipFuel)}%`, sysX, sysY + 45);
            ctx.fillStyle = fuelColor;
            ctx.fillRect(sysX + 80, sysY + 35, shipFuel * 1, 10);
            ctx.strokeStyle = hudColor;
            ctx.strokeRect(sysX + 80, sysY + 35, 100, 10);

            // Temperature
            const tempColor = shipTemperature > 80 ? "rgba(255, 100, 0, 0.9)" : shipTemperature > 60 ? "rgba(255, 200, 0, 0.9)" : "rgba(100, 200, 255, 0.9)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(`TEMP: ${Math.floor(shipTemperature)}°C`, sysX, sysY + 65);
            ctx.fillStyle = tempColor;
            const tempBar = Math.min(100, shipTemperature);
            ctx.fillRect(sysX + 80, sysY + 55, tempBar * 1, 10);
            ctx.strokeStyle = hudColor;
            ctx.strokeRect(sysX + 80, sysY + 55, 100, 10);

            // Power Distribution
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText("POWER DIST:", sysX, sysY + 85);
            ctx.font = "10px 'Courier New', monospace";
            ctx.fillText(`SHD:${powerDistribution.shields}%`, sysX, sysY + 100);
            ctx.fillText(`ENG:${powerDistribution.engines}%`, sysX, sysY + 113);
            ctx.fillText(`WPN:${powerDistribution.weapons}%`, sysX, sysY + 126);

            // Mini power bars
            ctx.fillStyle = "rgba(0, 150, 255, 0.8)";
            ctx.fillRect(sysX + 80, sysY + 92, powerDistribution.shields * 0.6, 6);
            ctx.fillStyle = "rgba(0, 255, 100, 0.8)";
            ctx.fillRect(sysX + 80, sysY + 105, powerDistribution.engines * 0.6, 6);
            ctx.fillStyle = "rgba(255, 100, 0, 0.8)";
            ctx.fillRect(sysX + 80, sysY + 118, powerDistribution.weapons * 0.6, 6);

            ctx.restore();
        }

        // ========== ALERT NOTIFICATIONS ==========
        ctx.save();
        let alertY = 130; // Start below coords
        for (const alert of alerts) {
            const alpha = (alert.life / alert.maxLife) * 0.9;
            const flashAlpha = Math.sin(currentTime * 0.01) * 0.3 + 0.7;

            // Alert box
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
            ctx.fillRect(20, alertY - 20, 300, 30);

            ctx.strokeStyle = alert.color.replace('1)', `${alpha * flashAlpha})`);
            ctx.lineWidth = 2;
            ctx.strokeRect(20, alertY - 20, 300, 30);

            // Alert text
            ctx.fillStyle = alert.color.replace('1)', `${alpha})`);
            ctx.font = "bold 14px 'Courier New', monospace";
            ctx.fillText(alert.text, 30, alertY);

            alertY += 40;
        }
        ctx.restore();

        // ========== BOOST MODE INDICATOR ==========
        if (boostIntensity > 0.01) {
            ctx.save();
            ctx.globalAlpha = boostIntensity * 0.8;
            ctx.fillStyle = "rgba(255, 150, 0, 0.8)";
            ctx.font = "bold 24px 'Courier New', monospace";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(255, 150, 0, 1)";
            const boostText = "BOOST MODE";
            const textWidth = ctx.measureText(boostText).width;
            ctx.fillText(boostText, centerX - textWidth / 2, 50);
            ctx.restore();
        }

        // ========== OVERHEAD CONTROL PANEL ==========
        ctx.save();

        // Panel background bar
        ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
        ctx.fillRect(0, 0, WIDTH, 50);

        // Panel frame
        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, WIDTH, 50);

        // Decorative side panels
        ctx.fillStyle = "rgba(0, 10, 20, 0.9)";
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillRect(WIDTH - 100, 0, 100, 50);
        ctx.strokeRect(0, 0, 100, 50);
        ctx.strokeRect(WIDTH - 100, 0, 100, 50);

        // Status indicators on left
        ctx.font = "10px 'Courier New', monospace";
        ctx.fillStyle = "rgba(0, 255, 100, 0.8)";
        ctx.fillText("PWR: ONLINE", 10, 15);
        ctx.fillStyle = audioSystem.energy > 0.7 ? "rgba(255, 100, 0, 0.9)" : "rgba(0, 200, 255, 0.8)";
        ctx.fillText(`SIG: ${Math.floor(audioSystem.energy * 100)}%`, 10, 30);
        ctx.fillStyle = hudColor;
        ctx.fillText(`MODE: ${boostMode ? 'BOOST' : 'NORMAL'}`, 10, 45);

        // Status indicators on right
        ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
        const dateStr = new Date().toLocaleDateString();
        ctx.fillText(dateStr, WIDTH - 95, 15);
        ctx.fillText(`FPS: ${fps}`, WIDTH - 95, 30);

        // Draw control buttons
        for (const btn of controlPanelButtons) {
            const isHovered = hoveredButton === btn;
            const glowIntensity = btn.active ? 1.0 : 0.3;

            // Button background
            if (isHovered) {
                ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},0.3)`;
            } else {
                ctx.fillStyle = btn.active ? "rgba(0, 30, 50, 0.8)" : "rgba(20, 20, 30, 0.6)";
            }
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

            // Button border with glow
            ctx.strokeStyle = btn.active ? hudColor : "rgba(100, 100, 120, 0.5)";
            ctx.lineWidth = isHovered ? 3 : 2;
            if (btn.active) {
                ctx.shadowBlur = isHovered ? 15 : 8;
                ctx.shadowColor = hudColor;
            }
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.shadowBlur = 0;

            // Button label
            ctx.font = "11px 'Courier New', monospace";
            ctx.fillStyle = btn.active ? hudColor : "rgba(150, 150, 150, 0.7)";
            const textWidth = ctx.measureText(btn.label).width;
            ctx.fillText(btn.label, btn.x + (btn.w - textWidth) / 2, btn.y + 17);

            // Active indicator light
            if (btn.active) {
                const pulseAlpha = Math.sin(currentTime * 0.005) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(${scheme.primary[0]},${scheme.primary[1]},${scheme.primary[2]},${pulseAlpha})`;
                ctx.beginPath();
                ctx.arc(btn.x + btn.w - 8, btn.y + 8, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Divider lines
        ctx.strokeStyle = hudColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(100, 10);
        ctx.lineTo(100, 40);
        ctx.moveTo(WIDTH - 100, 10);
        ctx.lineTo(WIDTH - 100, 40);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.restore();

        if (mouseDown) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw force vector
            ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(mouseDragStartX, mouseDragStartY);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
            ctx.restore();
        }
    }

    renderFrame(); // start the loop immediately (will show a fallback background until analyser exists)
    console.log("Render loop started");
};