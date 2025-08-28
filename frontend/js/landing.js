// Smooth scroll to features
document.querySelector(".btn-outline").addEventListener("click", function (e) {
  e.preventDefault();
  document.querySelector("#features").scrollIntoView({ behavior: "smooth" });
});

// Add animation delay to cards for sequential appearance
document.querySelectorAll(".card").forEach((card, index) => {
  card.style.animationDelay = `${index * 0.1}s`;
});

// Redirect if user is already authenticated
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("alpha_token")) {
    setTimeout(() => {
      window.location.href = "./pages/console.html";
    }, 2000);
  } else {
    setTimeout(() => {
      window.location.href = "./pages/auth.html";
    }, 2000);
  }
});
