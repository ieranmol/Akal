/* AKAL cookie consent: Google Analytics loads only after the visitor opts in. */
(function () {
  "use strict";
  var GA_ID = "G-LJQP4QNNTB";
  var KEY = "akal-consent";

  function getChoice() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { /* storage blocked: choice lasts for this page view */ }
  }

  function loadAnalytics() {
    if (window.__akalGA) return;
    window.__akalGA = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function clearAnalyticsCookies() {
    var host = window.location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_ga/.test(name)) {
        ["", "; domain=" + host, "; domain=." + host].forEach(function (d) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d;
        });
      }
    });
  }

  function closeBanner() {
    var b = document.getElementById("akal-consent");
    if (b) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.getElementById("akal-consent")) return;
    var b = document.createElement("div");
    b.id = "akal-consent";
    b.className = "akal-consent";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-live", "polite");
    b.setAttribute("aria-label", "Cookie choice");
    b.innerHTML =
      '<p class="akal-consent-text">We would like to use Google Analytics cookies to understand how visitors use this site. ' +
      'They stay off unless you accept. You can change your choice any time under Cookie Settings in the footer. ' +
      '<a href="/privacy/">Privacy Policy</a></p>' +
      '<div class="akal-consent-actions">' +
      '<button type="button" class="akal-consent-btn" data-choice="denied">Decline</button>' +
      '<button type="button" class="akal-consent-btn" data-choice="granted">Accept</button>' +
      "</div>";
    b.addEventListener("click", function (e) {
      var choice = e.target && e.target.getAttribute && e.target.getAttribute("data-choice");
      if (!choice) return;
      setChoice(choice);
      closeBanner();
      if (choice === "granted") {
        loadAnalytics();
      } else {
        clearAnalyticsCookies();
        if (window.__akalGA) window.location.reload();
      }
    });
    document.body.appendChild(b);
  }

  window.akalConsent = { open: showBanner };

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-cookie-settings]") : null;
    if (!t) return;
    e.preventDefault();
    showBanner();
  });

  var choice = getChoice();
  if (choice === "granted") {
    loadAnalytics();
  } else if (choice !== "denied") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }
})();
