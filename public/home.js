const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");

const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 80);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

function setupFeaturedSlider(root) {
  const slides = [...root.querySelectorAll(".featured-slide")];
  const dotsRoot = root.querySelector(".slider-dots");
  let current = 0;
  let timer;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Show featured image ${index + 1}`);
    dot.addEventListener("click", () => show(index, true));
    dotsRoot.append(dot);
    return dot;
  });

  function show(index, restart = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === current));
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === current);
      dot.setAttribute("aria-selected", String(dotIndex === current));
    });
    if (restart) start();
  }

  function start() {
    clearInterval(timer);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = window.setInterval(() => show(current + 1), 5200);
    }
  }

  root.querySelector(".featured-prev")?.addEventListener("click", () => show(current - 1, true));
  root.querySelector(".featured-next")?.addEventListener("click", () => show(current + 1, true));
  root.addEventListener("mouseenter", () => clearInterval(timer));
  root.addEventListener("mouseleave", start);
  show(0);
  start();
}

document.querySelectorAll("[data-slider='featured']").forEach(setupFeaturedSlider);

const testimonialCards = [...document.querySelectorAll(".testimonial-card")];
let testimonialIndex = 0;
let testimonialTimer;

function showTestimonial(index, restart = false) {
  testimonialIndex = (index + testimonialCards.length) % testimonialCards.length;
  testimonialCards.forEach((card, cardIndex) => card.classList.toggle("active", cardIndex === testimonialIndex));
  if (restart) startTestimonials();
}

function startTestimonials() {
  clearInterval(testimonialTimer);
  if (testimonialCards.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    testimonialTimer = window.setInterval(() => showTestimonial(testimonialIndex + 1), 6500);
  }
}

document.querySelector(".testimonial-prev")?.addEventListener("click", () => showTestimonial(testimonialIndex - 1, true));
document.querySelector(".testimonial-next")?.addEventListener("click", () => showTestimonial(testimonialIndex + 1, true));
showTestimonial(0);
startTestimonials();

const counters = document.querySelectorAll("[data-count]");
const animateCounter = (element) => {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || "";
  const startedAt = performance.now();
  const duration = 1400;
  const tick = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });
  counters.forEach((counter) => observer.observe(counter));
}
