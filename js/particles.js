// Particle Canvas System
(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const COUNT = 120;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    // Also support touch position for mobile
    window.addEventListener('touchmove', e => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', () => { mouse.x = -9999; mouse.y = -9999; });

    class Particle {
        constructor() { this.spawn(true); }
        spawn(init) {
            this.x = Math.random() * W;
            this.y = init ? Math.random() * H : -5;
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = (Math.random() - 0.5) * 0.35;
            this.r = Math.random() * 1.2 + 0.4;
            this.alpha = Math.random() * 0.30 + 0.25;
        }
        update() {
            // Mouse repulsion
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110 && dist > 0) {
                const f = (110 - dist) / 110;
                this.vx += (dx / dist) * f * 0.09;
                this.vy += (dy / dist) * f * 0.09;
            }
            // Friction + speed cap
            this.vx *= 0.988;
            this.vy *= 0.988;
            const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (spd > 2) { this.vx = this.vx / spd * 2; this.vy = this.vy / spd * 2; }

            this.x += this.vx;
            this.y += this.vy;

            // Regenerate from a random edge when off-screen
            if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) {
                const edge = Math.floor(Math.random() * 4);
                if (edge === 0) { this.x = Math.random() * W; this.y = -5; this.vx = (Math.random() - 0.5) * 0.35; this.vy = Math.random() * 0.3 + 0.1; }
                else if (edge === 1) { this.x = W + 5; this.y = Math.random() * H; this.vx = -(Math.random() * 0.3 + 0.1); this.vy = (Math.random() - 0.5) * 0.35; }
                else if (edge === 2) { this.x = Math.random() * W; this.y = H + 5; this.vx = (Math.random() - 0.5) * 0.35; this.vy = -(Math.random() * 0.3 + 0.1); }
                else { this.x = -5; this.y = Math.random() * H; this.vx = Math.random() * 0.3 + 0.1; this.vy = (Math.random() - 0.5) * 0.35; }
                this.r = Math.random() * 1.2 + 0.4;
                this.alpha = Math.random() * 0.30 + 0.25;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(30, 41, 59, ${this.alpha})`;
            ctx.fill();
        }
    }

    function drawLines(pts) {
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x;
                const dy = pts[i].y - pts[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.strokeStyle = `rgba(30, 41, 59, ${(1 - dist / 100) * 0.35})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    resize();
    const particles = Array.from({ length: COUNT }, () => new Particle());

    function loop() {
        // Only animate if the login screen is visible to save CPU
        const loginScreen = document.getElementById('login-screen');
        if (!loginScreen || loginScreen.classList.contains('hidden')) {
            requestAnimationFrame(loop);
            return;
        }

        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines(particles);
        requestAnimationFrame(loop);
    }

    loop();
})();
