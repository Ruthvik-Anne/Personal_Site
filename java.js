document.addEventListener("DOMContentLoaded", function () {
  const footer = document.querySelector(".footer-text");
  if (footer) footer.textContent = "© " + new Date().getFullYear() + " Ruthvik Anne";

  const host = document.getElementById("bg-fixed");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!host || reduceMotion.matches) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  host.appendChild(canvas);

  const particles = [];
  const count = 28;
  const pointer = { x: 0.5, y: 0.28, active: false };
  let width = 0;
  let height = 0;
  let rafId = 0;

  function resize() {
    width = canvas.width = window.innerWidth * devicePixelRatio;
    height = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function seed() {
    particles.length = 0;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.9 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const px = p.x / width;
      const py = p.y / height;
      const dx = (pointer.x - px) * width;
      const dy = (pointer.y - py) * height;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const pull = pointer.active ? Math.min(16_000 / (dist * dist), 0.06) : 0.01;
      const driftX = Math.cos(p.phase + performance.now() * 0.00035) * 0.015;
      const driftY = Math.sin(p.phase + performance.now() * 0.00042) * 0.012;

      p.vx += dx * pull * 0.0007 + driftX;
      p.vy += dy * pull * 0.0007 + driftY;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * devicePixelRatio;
      p.y += p.vy * devicePixelRatio;

      if (p.x < -40) p.x = width + 40;
      if (p.x > width + 40) p.x = -40;
      if (p.y < -40) p.y = height + 40;
      if (p.y > height + 40) p.y = -40;
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 210 * devicePixelRatio) {
          ctx.strokeStyle = `rgba(201, 173, 120, ${0.08 * (1 - dist / (210 * devicePixelRatio))})`;
          ctx.lineWidth = 1 * devicePixelRatio;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18 * devicePixelRatio);
      glow.addColorStop(0, "rgba(201, 173, 120, 0.24)");
      glow.addColorStop(0.45, "rgba(111, 136, 154, 0.12)");
      glow.addColorStop(1, "rgba(111, 136, 154, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    rafId = window.requestAnimationFrame(step);
  }

  function setPointer(event) {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / window.innerHeight;
    pointer.active = true;
  }

  function resetPointer() {
    pointer.active = false;
    pointer.x = 0.5;
    pointer.y = 0.28;
  }

  resize();
  seed();
  step();

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(rafId);
    resize();
    seed();
    step();
  });

  window.addEventListener("pointermove", setPointer, { passive: true });
  window.addEventListener("pointerleave", resetPointer, { passive: true });
});
