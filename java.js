// Auto-update copyright year
document.addEventListener("DOMContentLoaded", function () {
  const f = document.querySelector(".footer-text");
  if (f) f.textContent = "\u00a9 " + new Date().getFullYear() + " Ruthvik Anne";
});
