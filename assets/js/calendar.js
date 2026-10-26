// Doplní na stránku Rezervace vložený kalendář a odkazy podle config.js.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var id = cfg.calendarId;
  var tz = encodeURIComponent(cfg.timezone || "Europe/Prague");

  var frame = document.getElementById("calendar");
  var booking = document.getElementById("booking-link");
  var subscribeGoogle = document.getElementById("subscribe-google");
  var subscribeIcs = document.getElementById("subscribe-ics");

  if (cfg.bookingUrl) {
    booking.href = cfg.bookingUrl;
  } else {
    booking.removeAttribute("href");
    booking.setAttribute("aria-disabled", "true");
    booking.title = "Rezervační odkaz zatím není nastaven (config.js)";
  }

  if (!id) {
    frame.innerHTML = '<div class="calendar-placeholder">Kalendář zatím není připojen.<br>Doplň <code>calendarId</code> v <code>assets/js/config.js</code>.</div>';
    subscribeGoogle.hidden = true;
    subscribeIcs.hidden = true;
    return;
  }

  var src = encodeURIComponent(id);
  var mode = window.matchMedia("(max-width: 600px)").matches ? "AGENDA" : "WEEK";
  var iframe = document.createElement("iframe");
  iframe.title = "Obsazenost kol";
  iframe.loading = "lazy";
  iframe.src = "https://calendar.google.com/calendar/embed?src=" + src +
    "&ctz=" + tz + "&mode=" + mode + "&hl=cs&wkst=2" +
    "&showPrint=0&showTitle=0&showCalendars=0&showTz=0";
  frame.appendChild(iframe);

  subscribeGoogle.href = "https://calendar.google.com/calendar/u/0/r?cid=" + src;
  subscribeIcs.href = "https://calendar.google.com/calendar/ical/" + src + "/public/basic.ics";
})();
