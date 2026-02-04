// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animate skill bars when they come into view
const observerOptions = {
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.skill-progress').forEach(bar => {
                bar.style.width = bar.style.width;
            });
        }
    });
}, observerOptions);

document.querySelectorAll('.skill-card').forEach(card => {
    observer.observe(card);
});

// Animated pixel stars background
const canvas = document.getElementById('bg-stars');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = 80;
    const STAR_COLOR = '#00ffe7';
    const STAR_SIZE = 2;
    const STAR_SPEED = 0.2;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = 400;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: STAR_SIZE + Math.random() * 1.5,
                speed: STAR_SPEED + Math.random() * 0.5
            });
        }
    }
    createStars();

    function animateStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
            ctx.fillStyle = STAR_COLOR;
            ctx.shadowColor = STAR_COLOR;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.x = Math.random() * canvas.width;
                star.y = 0;
            }
        }
        requestAnimationFrame(animateStars);
    }
    animateStars();
}

// Typewriter effect for hero section
const typewriter = document.getElementById('typewriter');
if (typewriter) {
    const text = 'Dirk Shoemaker';
    let i = 0;
    function type() {
        if (i < text.length) {
            typewriter.textContent += text.charAt(i);
            i++;
            setTimeout(type, 120);
        }
    }
    type();
}

// Sound Effects Integration
const clickSound = new Audio('assets/audio/click.wav');
const hoverSound = new Audio('assets/audio/hover.wav');
const navSound = new Audio('assets/audio/nav.wav');

// Set volume (0.0 to 1.0)
clickSound.volume = 0.25;
hoverSound.volume = 0.18;
navSound.volume = 0.22;

// Play sound helper (clone for overlapping sounds)
function playSound(audio) {
    const sfx = audio.cloneNode();
    sfx.play().catch(() => {
        // Ignore errors if audio files don't exist
    });
}

// Add sound effects to interactive elements
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('mouseenter', () => playSound(hoverSound));
});

document.querySelectorAll('button, .cta-button').forEach(button => {
    button.addEventListener('click', () => playSound(clickSound));
    button.addEventListener('mouseenter', () => playSound(hoverSound));
});

document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => playSound(hoverSound));
});
