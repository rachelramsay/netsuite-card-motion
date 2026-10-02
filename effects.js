// Options page only. It drives the effect picker and feeds pointer position to
// the spotlight, border-glow and tilt options as --mx/--my and --rx/--ry.

const grid = document.querySelector("[data-card-grid]");
const picker = document.querySelector("[data-effect-picker]");
const note = document.querySelector("[data-effect-note]");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const TILT_MAX_DEG = 4;

const setEffect = (value) => {
  grid.dataset.effect = value;
  const input = picker.querySelector(`input[value="${value}"]`);
  if (!input) return;
  input.checked = true;
  note.textContent = input.closest("label").dataset.note;
  history.replaceState(null, "", `#${value}`);
  for (const card of grid.querySelectorAll("[data-card]")) resetTilt(card);
};

const resetTilt = (card) => {
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
};

picker.addEventListener("change", (e) => setEffect(e.target.value));
setEffect(location.hash.slice(1) || "none");

let frame;
grid.addEventListener("pointermove", (e) => {
  const card = e.target.closest("[data-card]");
  if (!card) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.setProperty("--mx", `${x * 100}%`);
    card.style.setProperty("--my", `${y * 100}%`);
    if (grid.dataset.effect === "tilt" && !reducedMotion.matches) {
      card.style.setProperty("--rx", `${(0.5 - y) * TILT_MAX_DEG * 2}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * TILT_MAX_DEG * 2}deg`);
    }
  });
});
for (const card of grid.querySelectorAll("[data-card]")) {
  card.addEventListener("pointerleave", () => resetTilt(card));
}
reducedMotion.addEventListener("change", () => {
  for (const card of grid.querySelectorAll("[data-card]")) resetTilt(card);
});
