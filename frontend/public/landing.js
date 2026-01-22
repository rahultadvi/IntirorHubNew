// ===============================
// PRICING CARDS INTERACTION LOGIC
// ===============================

const cards = [
  document.getElementById("solo-main"),
  document.getElementById("Team_main"),
  document.getElementById("business-main")
];

// active card highlight
function setActive(card) {
  cards.forEach(c => c.classList.remove("active-card"));
  card.classList.add("active-card");
}

// click sound / micro feedback (optional UX)
function clickFeedback(card) {
  card.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(0.96)" },
      { transform: "scale(1)" }
    ],
    {
      duration: 180,
      easing: "ease-out"
    }
  );
}

// ripple effect
function createRipple(e, card) {
  const ripple = document.createElement("span");
  ripple.className = "ripple";

  const rect = card.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = e.clientX - rect.left - size / 2 + "px";
  ripple.style.top = e.clientY - rect.top - size / 2 + "px";

  card.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}

// attach events
cards.forEach(card => {
  card.addEventListener("click", (e) => {
    setActive(card);
    clickFeedback(card);
    createRipple(e, card);
  });

  // keyboard support
  card.setAttribute("tabindex", "0");
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      card.click();
    }
  });
});
