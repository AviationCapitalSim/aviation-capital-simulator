function startTrial() {
  alert("Welcome Captain! You’ve started your free 7-day trial with 700 credits.");
}
// Efecto premium: cambiar header al hacer scroll
window.addEventListener("scroll", () => {
  const header = document.querySelector(".acs-header");
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
