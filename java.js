document.addEventListener("DOMContentLoaded", function () {
  const footer = document.querySelector(".footer-text");
  if (footer) footer.textContent = "\u00a9 " + new Date().getFullYear() + " Ruthvik Anne";

  const host = document.getElementById("bg-fixed");
  if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  host.appendChild(canvas);

  let width = 0;
  let height = 0;

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.width = window.innerWidth * scale;
    height = canvas.height = window.innerHeight * scale;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function draw(time) {
    const scale = canvas.width / window.innerWidth;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = scale;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.13)";

    for (let index = 0; index < 3; index += 1) {
      const y = (130 + index * 92 + Math.sin(time * 0.00012 + index) * 14) * scale;
      ctx.beginPath();
      ctx.moveTo(-40 * scale, y);
      ctx.bezierCurveTo(
        width * 0.3,
        y - (32 + index * 8) * scale,
        width * 0.7,
        y + (32 + index * 8) * scale,
        width + 40 * scale,
        y - 8 * scale
      );
      ctx.stroke();
    }

    window.requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.requestAnimationFrame(draw);
});

