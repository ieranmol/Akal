/* AKAL Engineering — project inquiry form submission
   Posts to a Google Apps Script web app, which appends the row to a
   Google Sheet and emails the team.

   SETUP: paste the web app URL from your Apps Script deployment below.
   It ends in /exec (not /dev). This URL is a public endpoint, not a
   secret, but it is also the only thing standing between the form and
   your sheet, so keep the honeypot and validation in place. */
(function () {
  "use strict";

  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzxxPMM0UQfBWxU2l8l04fEUsvxtwraB2Lf461R83vmxYVZE9NBizTiS3wWyFCwB3_F/exec";

  var form = document.getElementById("akf");
  if (!form) return;

  var btn    = document.getElementById("akf-submit");
  var errEl  = document.getElementById("akf-err");
  var okBox  = document.getElementById("akf-ok");
  var badBox = document.getElementById("akf-bad");

  var REQUIRED = ["name", "company", "email", "message"];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setInvalid(field, yes) {
    if (field) field.setAttribute("aria-invalid", yes ? "true" : "false");
  }

  function validate() {
    var problems = [];
    REQUIRED.forEach(function (n) {
      var f = form.elements[n];
      var empty = !f || !String(f.value).trim();
      setInvalid(f, empty);
      if (empty) problems.push(n);
    });

    var em = form.elements.email;
    if (em && em.value.trim() && !EMAIL_RE.test(em.value.trim())) {
      setInvalid(em, true);
      problems.push("email-format");
    }

    if (!problems.length) return null;
    if (problems.length === 1 && problems[0] === "email-format") {
      return "That email address does not look right. Please check it.";
    }
    return "Please complete the required fields.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    okBox.classList.remove("show");
    badBox.classList.remove("show");

    var problem = validate();
    if (problem) {
      errEl.textContent = problem;
      var firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }
    errEl.textContent = "";

    if (ENDPOINT.indexOf("PASTE_YOUR") === 0) {
      badBox.classList.add("show");
      console.error("AKAL form: ENDPOINT is not configured in assets/js/akal-form.js");
      return;
    }

    var data = new URLSearchParams();
    ["name", "company", "email", "phone", "industry", "service",
     "stage", "timeline", "message", "website"].forEach(function (n) {
      var f = form.elements[n];
      data.append(n, f ? String(f.value).trim() : "");
    });
    data.append("page", location.href);

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending\u2026";

    function succeed(viaFallback) {
      form.querySelector(".akf-grid").style.display = "none";
      form.querySelector(".akf-actions").style.display = "none";
      okBox.classList.add("show");
      okBox.scrollIntoView({ behavior: "smooth", block: "center" });
      if (viaFallback) console.info("AKAL form: delivered via no-CORS fallback.");
    }
    function fail(err) {
      console.error("AKAL form:", err);
      badBox.classList.add("show");
    }
    function done() {
      btn.disabled = false;
      btn.textContent = original;
    }

    /* Fallback for when the browser cannot read the response.
       Apps Script redirects through script.googleusercontent.com, and if
       the deployment is not public that redirect carries no CORS headers,
       so fetch rejects even though the POST itself is deliverable. A form
       POST into a hidden iframe is an ordinary navigation, not a CORS
       request, so it goes through regardless. We cannot read the reply,
       but the iframe load event confirms the round trip completed. */
    function postViaIframe() {
      return new Promise(function (resolve, reject) {
        var frameName = "akf-sink-" + Date.now();
        var iframe = document.createElement("iframe");
        iframe.name = frameName;
        iframe.style.cssText = "position:absolute;width:0;height:0;border:0;left:-9999px;";
        document.body.appendChild(iframe);

        var relay = document.createElement("form");
        relay.method = "POST";
        relay.action = ENDPOINT;
        relay.target = frameName;
        relay.style.display = "none";
        data.forEach(function (value, key) {
          var input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          relay.appendChild(input);
        });
        document.body.appendChild(relay);

        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true; cleanup(); reject(new Error("fallback timed out"));
        }, 20000);

        function cleanup() {
          clearTimeout(timer);
          if (relay.parentNode) relay.parentNode.removeChild(relay);
          setTimeout(function () {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 1000);
        }

        iframe.addEventListener("load", function () {
          if (settled) return;
          settled = true; cleanup(); resolve();
        });
        relay.submit();
      });
    }

    var controller = ("AbortController" in window) ? new AbortController() : null;
    var timeout = setTimeout(function () { if (controller) controller.abort(); }, 15000);

    fetch(ENDPOINT, {
      method: "POST",
      body: data,
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: r.ok }; });
      })
      .then(function (res) {
        clearTimeout(timeout);
        if (res && res.ok) { succeed(false); done(); return; }
        /* The script answered and rejected the payload. Retrying would
           not help, so surface it rather than falling back. */
        throw new Error(res && res.error ? res.error : "rejected by script");
      })
      .catch(function (err) {
        clearTimeout(timeout);
        var rejected = err && /rejected by script|missing required|invalid email|message too long/.test(err.message || "");
        if (rejected) { fail(err); done(); return; }

        console.warn("AKAL form: direct request failed (" +
                     (err && err.message) + "), trying fallback.");
        postViaIframe()
          .then(function () { succeed(true); })
          .catch(fail)
          .finally(done);
      });
  });

  /* Clear the invalid state as soon as someone starts fixing it */
  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true") {
      setInvalid(e.target, false);
      errEl.textContent = "";
    }
  });
})();
