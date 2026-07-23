/* AKAL Engineering — shared site behavior */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sticky header: solidify on scroll ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("solid");
    else header.classList.remove("solid");
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.classList.remove("open");
      });
    });
  }

  /* ---- Reveal on scroll (also drives .divider draw-on) ---- */
  var revealTargets = document.querySelectorAll(".reveal, .reveal-group, .divider");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---- Animated stat counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var isDecimal = target % 1 !== 0;
    if (reduceMotion) {
      el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
      return;
    }
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = (isDecimal ? value.toFixed(1) : Math.floor(value)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---- Active nav link by current page (folder-based clean URLs) ---- */
  var segments = window.location.pathname.split("/").filter(Boolean);
  var path = segments.length ? segments[segments.length - 1] : "home";
  document.querySelectorAll(".primary-nav a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === path) a.classList.add("active");
  });

  /* ---- Scroll-spy for in-page section links (index/services) ---- */
  var spySections = document.querySelectorAll("[data-spy]");
  var spyLinks = document.querySelectorAll(".primary-nav a[data-spy-link], .subnav a[data-spy-link]");
  if (spySections.length && spyLinks.length && "IntersectionObserver" in window) {
    var spyIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute("id");
            spyLinks.forEach(function (l) {
              l.classList.toggle("active", l.getAttribute("data-spy-link") === id);
            });
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    spySections.forEach(function (s) { spyIO.observe(s); });
  }
})();
