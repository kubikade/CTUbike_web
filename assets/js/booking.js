// Rezervační formulář – komunikuje s Apps Script web appkou (config.js → bookingApiUrl).
(function () {
  var cfg = window.SITE_CONFIG || {};
  var api = cfg.bookingApiUrl;

  var form = document.getElementById("booking-form");
  var f = {
    bike: document.getElementById("f-bike"),
    date: document.getElementById("f-date"),
    start: document.getElementById("f-start"),
    duration: document.getElementById("f-duration"),
    name: document.getElementById("f-name"),
    email: document.getElementById("f-email"),
    website: document.getElementById("f-website"),
  };
  var submit = form.querySelector("button[type=submit]");
  var status = document.getElementById("form-status");
  var timeline = document.getElementById("timeline");
  var rulesList = document.getElementById("rules");

  var rules = null;
  var day = null;

  function setStatus(text, kind) {
    status.textContent = text || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function setEnabled(on) {
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = !on; });
  }

  if (!api) {
    setEnabled(false);
    setStatus("Rezervační systém zatím není připojen (bookingApiUrl v config.js).", "error");
    return;
  }

  function call(params, body) {
    var url = api + "?" + new URLSearchParams(params || {}).toString();
    // Bez hlavičky Content-Type (= text/plain), aby prohlížeč neposílal CORS preflight, který Apps Script neumí.
    var opts = body ? { method: "POST", body: JSON.stringify(body) } : {};
    return fetch(url, opts)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || "Neznámá chyba.");
        return d;
      });
  }

  function toMin(s) { var p = s.split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function hhmm(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function isoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function durationLabel(m) { return m < 60 ? m + " min" : String(m / 60).replace(".", ",") + " h"; }

  function isFree(from, to) {
    return day.busy.every(function (b) { return toMin(b.end) <= from || toMin(b.start) >= to; });
  }

  function option(value, label, disabled) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    o.disabled = !!disabled;
    return o;
  }

  function renderRules() {
    rulesList.innerHTML = "";
    [
      "Rezervace po " + rules.stepMinutes + " minutách, jedna rezervace nejvýše " + durationLabel(rules.maxBookingMinutes) + ".",
      "Celkem nejvýše " + durationLabel(rules.maxMinutesPerDay) + " denně na osobu.",
      "Rezervovat lze nejvýše " + rules.maxDaysAhead + " dní dopředu.",
      rules.allowedEmailDomains.length
        ? "Rezervace jen s e-mailem ČVUT (" + rules.allowedEmailDomains.map(function (d) { return "@" + d; }).join(", ") + ", včetně fakultních)."
        : null,
      "Rezervaci je potřeba do " + rules.pendingTimeoutMinutes + " minut potvrdit odkazem z e-mailu, jinak propadne.",
      "Nemůžeš přijít? Zruš rezervaci odkazem v e-mailu, ať může jet někdo jiný.",
    ].filter(Boolean).forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      rulesList.appendChild(li);
    });
  }

  function renderTimeline() {
    timeline.innerHTML = "";
    if (!day.open) {
      timeline.innerHTML = '<p class="timeline-closed">V tento den je zavřeno.</p>';
      return;
    }
    var open = toMin(day.open), close = toMin(day.close), span = close - open;
    var bar = document.createElement("div");
    bar.className = "timeline-bar";
    day.busy.forEach(function (b) {
      var s = Math.max(toMin(b.start), open), e = Math.min(toMin(b.end), close);
      if (e <= s) return;
      var seg = document.createElement("span");
      seg.className = "timeline-busy";
      seg.style.left = ((s - open) / span * 100) + "%";
      seg.style.width = ((e - s) / span * 100) + "%";
      seg.title = "Obsazeno " + b.start + "–" + b.end;
      bar.appendChild(seg);
    });
    var labels = document.createElement("div");
    labels.className = "timeline-labels";
    for (var h = Math.ceil(open / 60); h * 60 <= close; h += 2) {
      var l = document.createElement("span");
      l.textContent = h + ":00";
      l.style.left = ((h * 60 - open) / span * 100) + "%";
      labels.appendChild(l);
    }
    timeline.appendChild(bar);
    timeline.appendChild(labels);
  }

  function renderDurations() {
    var prev = f.duration.value;
    f.duration.innerHTML = "";
    if (!f.start.value) return;
    var s = toMin(f.start.value), close = toMin(day.close);
    for (var d = rules.stepMinutes; d <= rules.maxBookingMinutes; d += rules.stepMinutes) {
      if (s + d > close || !isFree(s, s + d)) break;
      f.duration.appendChild(option(d, durationLabel(d) + " (do " + hhmm(s + d) + ")"));
    }
    if (prev && f.duration.querySelector('option[value="' + prev + '"]')) f.duration.value = prev;
  }

  function renderStarts() {
    var prev = f.start.value;
    f.start.innerHTML = "";
    if (!day.open) {
      f.start.appendChild(option("", "Zavřeno", true));
      f.duration.innerHTML = "";
      return;
    }
    var now = new Date();
    var nowMin = f.date.value === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : -1;
    var open = toMin(day.open), close = toMin(day.close), step = rules.stepMinutes;
    var firstFree = null;
    for (var m = open; m + step <= close; m += step) {
      var free = m > nowMin && isFree(m, m + step);
      f.start.appendChild(option(hhmm(m), hhmm(m) + (free ? "" : " – obsazeno"), !free));
      if (free && firstFree === null) firstFree = hhmm(m);
    }
    if (!firstFree) {
      f.start.insertBefore(option("", "Žádný volný termín", true), f.start.firstChild);
      f.start.value = "";
    } else {
      var prevOpt = prev && f.start.querySelector('option[value="' + prev + '"]');
      f.start.value = prevOpt && !prevOpt.disabled ? prev : firstFree;
    }
    renderDurations();
  }

  function loadDay() {
    if (!f.bike.value || !f.date.value) return;
    setStatus("Načítám obsazenost…", "busy");
    submit.disabled = true;
    return call({ action: "day", bike: f.bike.value, date: f.date.value })
      .then(function (d) {
        day = d;
        renderTimeline();
        renderStarts();
        setStatus("");
        submit.disabled = !f.start.value;
      })
      .catch(function (err) { setStatus(err.message, "error"); });
  }

  setEnabled(false);
  setStatus("Načítám…");
  call({ action: "config" })
    .then(function (r) {
      rules = r;
      renderRules();
      r.bikes.forEach(function (b) { f.bike.appendChild(option(b, b)); });
      var today = new Date();
      var last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + r.maxDaysAhead);
      f.date.min = isoDate(today);
      f.date.max = isoDate(last);
      f.date.value = isoDate(today);
      setEnabled(true);
      return loadDay().then(function () {
        // Dnes už nic volného (např. večer po zavírací době) → nabídni rovnou zítřek.
        if (!f.start.value && r.maxDaysAhead > 0) {
          f.date.value = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
          return loadDay();
        }
      });
    })
    .catch(function (err) { setStatus("Rezervace se nepodařilo načíst: " + err.message, "error"); });

  f.bike.addEventListener("change", loadDay);
  f.date.addEventListener("change", loadDay);
  f.start.addEventListener("change", function () {
    renderDurations();
    submit.disabled = !f.start.value;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var booked = { start: f.start.value, end: hhmm(toMin(f.start.value) + Number(f.duration.value)) };
    setEnabled(false);
    setStatus("Ukládám rezervaci a posílám potvrzovací e-mail, chvilku to trvá…", "busy");
    call(null, {
      bike: f.bike.value,
      date: f.date.value,
      start: f.start.value,
      duration: Number(f.duration.value),
      name: f.name.value,
      email: f.email.value,
      website: f.website.value,
    })
      .then(function (r) {
        // Obsazenost doplníme lokálně – nové načtení ze serveru by trvalo další sekundy.
        day.busy.push(booked);
        setEnabled(true);
        renderTimeline();
        renderStarts();
        submit.disabled = !f.start.value;
        setStatus(r.message, "ok");
      })
      .catch(function (err) {
        setEnabled(true);
        setStatus(err.message, "error");
      });
  });
})();
