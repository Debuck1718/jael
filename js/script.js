﻿/* ==========================================================================
   JAEL'S EMPIRE — Site scripts
   Scroll reveal, active nav highlighting, scroll progress,
   back-to-top control, and contact form feedback.
   ========================================================================== */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ======================================================================
     SCROLL REVEAL
     Fades sections in as they enter the viewport. Falls back to showing
     everything immediately when IntersectionObserver is unavailable.
     ====================================================================== */

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ======================================================================
     STAGGERED CARD ENTRANCE
     Brand cards animate in one after another rather than all at once.
     ====================================================================== */

  function initCardStagger() {
    var cards = document.querySelectorAll(".brands .card");

    cards.forEach(function (card, i) {
      card.style.transitionDelay = i * 120 + "ms";
    });
  }

  /* ======================================================================
     HEADER STATE + SCROLL PROGRESS + BACK TO TOP
     All driven by the same scroll handler so we only listen once.
     ====================================================================== */

  function initScrollUI() {
    var header = document.querySelector("header");
    var progress = document.getElementById("scrollProgress");
    var toTop = document.getElementById("toTop");

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;

      if (header) {
        header.classList.toggle("is-stuck", y > 30);
      }

      if (progress) {
        var docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
        progress.style.width = pct + "%";
      }

      if (toTop) {
        toTop.classList.toggle("is-visible", y > 600);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      });
    }
  }

  /* ======================================================================
     ACTIVE NAV LINK
     Highlights the nav item matching whichever section is on screen.

     Note on the observer options: a high `threshold` combined with a
     negative `rootMargin` makes the trigger region smaller than the
     threshold requires, so the callback never fires at all. We use
     threshold 0 and instead pick the most-visible section on each pass.
     ====================================================================== */

  function initActiveNav() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('nav a[href^="#"]')
    );
    if (!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      byId[id] = el;
      sections.push(el);
    });

    if (!sections.length) return;

    // Live visibility ratio per section, updated by the observer.
    var ratios = {};

    function applyActive() {
      var bestId = null;
      var bestRatio = 0;

      Object.keys(ratios).forEach(function (id) {
        if (ratios[id] > bestRatio) {
          bestRatio = ratios[id];
          bestId = id;
        }
      });

      // Nothing meaningfully on screen yet (top of page) -> default to first.
      if (bestId === null || bestRatio < 0.15) {
        bestId = Object.keys(byId)[0];
      }

      links.forEach(function (link) {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === "#" + bestId
        );
      });
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios[entry.target.id] = entry.isIntersecting
            ? entry.intersectionRatio
            : 0;
        });
        applyActive();
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: "-10% 0px -10% 0px" }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });

    // Establish an initial state before the first scroll.
    ratios[Object.keys(byId)[0]] = 1;
    applyActive();
  }

  /* ======================================================================
     CONTACT FORM
     No backend is wired up yet, so we prevent submission, give the user
     inline confirmation instead of a jarring alert(), then reset.
     ====================================================================== */

  function initContactForm() {
    var form = document.querySelector(".contact-form");
    if (!form) return;

    var button = form.querySelector('button[type="submit"]');
    var originalLabel = button ? button.textContent : "";

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (button) {
        button.textContent = "Message Sent ✓";
        button.disabled = true;
      }

      form.reset();

      window.setTimeout(function () {
        if (button) {
          button.textContent = originalLabel;
          button.disabled = false;
        }
      }, 3000);
    });
  }

  /* ======================================================================
     BOOT
     ====================================================================== */

  function init() {
    initReveal();
    initCardStagger();
    initScrollUI();
    initActiveNav();
    initContactForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
