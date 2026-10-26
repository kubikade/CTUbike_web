// Doplní na stránku Rezervace vložený kalendář a odkazy podle config.js.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var bikes = (cfg.bikes || []).filter(function (b) { return b.calendarId; });
  var tz = encodeURIComponent(cfg.timezone || "Europe/Prague");

  var frame = document.getElementById("calendar");
  var bookingRow = document.getElementById("booking-links");
  var subscribeList = document.getElementById("subscribe-links");

  function link(text, href, cls) {
    var a = document.createElement("a");
    a.className = cls;
    a.textContent = text;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  if (!bikes.length) {
    frame.innerHTML = '<div class="calendar-placeholder">Kalendář zatím není připojen.<br>Doplň <code>calendarId</code> v <code>assets/js/config.js</code>.</div>';
    bookingRow.innerHTML = '<a class="btn" aria-disabled="true">Rezervovat termín</a>';
    subscribeList.closest("section").hidden = true;
    return;
  }

  bikes.forEach(function (b) {
    var src = encodeURIComponent(b.calendarId);

    if (b.bookingUrl) {
      bookingRow.appendChild(link("Rezervovat " + b.name, b.bookingUrl, "btn"));
    } else {
      var disabled = document.createElement("a");
      disabled.className = "btn";
      disabled.setAttribute("aria-disabled", "true");
      disabled.textContent = "Rezervovat " + b.name;
      bookingRow.appendChild(disabled);
    }

    var li = document.createElement("li");
    var dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = b.color || "#0065bd";
    li.appendChild(dot);
    li.appendChild(document.createTextNode(b.name + ": "));
    li.appendChild(link("Google kalendář", "https://calendar.google.com/calendar/u/0/r?cid=" + src, ""));
    li.appendChild(document.createTextNode(" · "));
    li.appendChild(link("iCal (Outlook, Apple)", "https://calendar.google.com/calendar/ical/" + src + "/public/basic.ics", ""));
    subscribeList.appendChild(li);
  });

  var mode = window.matchMedia("(max-width: 600px)").matches ? "AGENDA" : "WEEK";
  var params = bikes.map(function (b) {
    return "src=" + encodeURIComponent(b.calendarId) + "&color=" + encodeURIComponent(b.color || "#0065bd");
  }).join("&");
  var iframe = document.createElement("iframe");
  iframe.title = "Obsazenost kol";
  iframe.loading = "lazy";
  iframe.src = "https://calendar.google.com/calendar/embed?" + params +
    "&ctz=" + tz + "&mode=" + mode + "&hl=cs&wkst=2" +
    "&showPrint=0&showTitle=0&showCalendars=" + (bikes.length > 1 ? 1 : 0) + "&showTz=0";
  frame.appendChild(iframe);
})();
