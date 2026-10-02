// One active card at a time. A mouse hover (after a short intent delay), keyboard
// focus or a tap moves the active state. All motion lives in CSS transitions,
// so a reversal mid-animation reverses from wherever the card currently is.
// No motion is driven from JS, so prefers-reduced-motion is handled entirely in styles.css.

const HOVER_INTENT_MS = 80; // stops a diagonal sweep across the grid from flashing open every card

for (const grid of document.querySelectorAll("[data-card-grid]")) {
  const cards = [...grid.querySelectorAll("[data-card]")];
  let hoverTimer;

  const activate = (card) => {
    for (const c of cards) {
      const on = c === card;
      c.toggleAttribute("data-active", on);
      c.querySelector(".card__trigger").setAttribute("aria-expanded", String(on));
      // Removed from the tab order and the accessibility tree while collapsed.
      // Re-enabled right away, so the link is usable before the reveal finishes.
      c.querySelector(".card__details").inert = !on;
    }
  };

  for (const card of cards) {
    card.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        // Hovering must not collapse the card that holds keyboard focus. Its link
        // would go inert and the focus would be lost.
        const active = cards.find((c) => c.hasAttribute("data-active"));
        if (active !== card && active?.querySelector(".card__details:focus-within")) return;
        activate(card);
      }, HOVER_INTENT_MS);
    });
    card.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
    card.addEventListener("focusin", () => activate(card));
    card.querySelector(".card__trigger").addEventListener("click", () => activate(card));
  }
}
