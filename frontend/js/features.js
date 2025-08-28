// Smooth scroll for sidebar links
document.querySelectorAll(".features-sidebar a").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    const targetElement = document.querySelector(targetId);

    // Update active state
    document.querySelectorAll(".features-sidebar a").forEach((a) => {
      a.classList.remove("active");
    });
    this.classList.add("active");

    // Scroll to section
    targetElement.scrollIntoView({ behavior: "smooth" });
  });
});

// Update active link on scroll
const sections = document.querySelectorAll(".features-content section");
const navLinks = document.querySelectorAll(".features-sidebar a");

window.addEventListener("scroll", () => {
  let current = "";
  const scrollPosition = window.scrollY + 100;

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;

    if (
      scrollPosition >= sectionTop &&
      scrollPosition < sectionTop + sectionHeight
    ) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href").substring(1) === current) {
      link.classList.add("active");
    }
  });
});

// Set initial active link based on scroll position
window.dispatchEvent(new Event("scroll"));
