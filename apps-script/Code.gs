/**
 * Rezervační systém smart kol ÚTVS ČVUT – Google Apps Script web app.
 *
 * Běží pod účtem utvs.smartbike@gmail.com a zapisuje rezervace přímo do kalendářů
 * jednotlivých kol. Web (GitHub Pages) s ním komunikuje přes:
 *   GET  ?action=config                  pravidla pro formulář
 *   GET  ?action=day&bike=Bike1&date=…   otevírací doba a obsazené časy daného dne
 *   POST {bike, date, start, duration, name, email}   nová rezervace
 *   GET  ?action=confirm&token=…         potvrzení z e-mailu
 *   GET  ?action=cancel&token=…          dotaz „Opravdu zrušit?“ (odkaz z e-mailu)
 *   GET  ?action=cancel&token=…&sure=1   zrušení
 *   (s &format=json vrací confirm/cancel JSON místo stránky – používá ho potvrzeni.html)
 *
 * Postup nasazení je v README.md (sekce „Rezervace“).
 */

const CONFIG = {
  TIMEZONE: 'Europe/Prague',

  // Kam vedou odkazy „Zpět na web“ ze stránek potvrzení / zrušení.
  SITE_URL: 'https://kubikade.github.io/CTUbike_web/rezervace.html',

  // Stránka potvrzení na webu (potvrzeni.html) – načte se hned a se skriptem mluví na pozadí.
  // Prázdné = odkazy v e-mailu vedou přímo na stránky Apps Scriptu (pomalejší).
  // Vyplň až poté, co web na GitHub Pages běží.
  CONFIRM_PAGE_URL: '',

  // URL nasazené web appky (stejná jako bookingApiUrl v assets/js/config.js). Z ní se skládají
  // odkazy v e-mailech – ScriptApp.getService().getUrl() často vrací neveřejnou /dev adresu.
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbz983Pa_nNEz0crtJDRtOFjHXaNwqQIXgFT6XKx0iqxXlyuzbaOqEr_68nC6ysNkxOGmQ/exec',

  // Název kola → ID jeho kalendáře. Názvy musí odpovídat bikes[].name v assets/js/config.js.
  BIKES: {
    Bike1: '3abb68883906c09a737edb7b2de51e66a85ced4f693d84a620ad1a0058915af7@group.calendar.google.com',
    // Bike2: '…@group.calendar.google.com',
  },

  // Otevírací doba podle dne v týdnu (0 = neděle … 6 = sobota); null = zavřeno.
  OPENING_HOURS: {
    0: null,
    1: ['08:00', '18:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '18:00'],
    4: ['08:00', '18:00'],
    5: ['08:00', '18:00'],
    6: null,
  },

  STEP_MINUTES: 30,            // rezervace začínají a končí na násobcích 30 min
  MAX_BOOKING_MINUTES: 120,    // nejdelší jedna rezervace
  MAX_MINUTES_PER_DAY: 120,    // součet rezervací jednoho e-mailu za den (přes všechna kola)
  MAX_DAYS_AHEAD: 7,           // jak daleko dopředu lze rezervovat
  PENDING_TIMEOUT_MINUTES: 30, // nepotvrzená rezervace po této době propadne

  // Povolené e-mailové domény včetně subdomén (např. fel.cvut.cz). Prázdné pole = jakýkoli e-mail.
  ALLOWED_EMAIL_DOMAINS: ['cvut.cz'],
};

// ===== Vstupní body web appky =====

function doGet(e) {
  const p = (e && e.parameter) || {};
  const isPage = (p.action === 'confirm' || p.action === 'cancel') && p.format !== 'json';
  try {
    switch (p.action) {
      case 'config': return json_(publicConfig_());
      case 'day': return json_(getDay_(p.bike, p.date));
      case 'confirm': return result_(confirm_(p.token), p);
      case 'cancel': return result_(p.sure === '1' ? cancel_(p.token) : cancelPrompt_(p.token), p);
      default: return json_({ ok: false, error: 'Neznámá akce.' });
    }
  } catch (err) {
    return isPage ? page_({ title: 'Chyba', text: err.message }) : json_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    return json_(book_(JSON.parse(e.postData.contents)));
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

// ===== Akce =====

function publicConfig_() {
  return {
    ok: true,
    bikes: Object.keys(CONFIG.BIKES),
    stepMinutes: CONFIG.STEP_MINUTES,
    maxBookingMinutes: CONFIG.MAX_BOOKING_MINUTES,
    maxMinutesPerDay: CONFIG.MAX_MINUTES_PER_DAY,
    maxDaysAhead: CONFIG.MAX_DAYS_AHEAD,
    pendingTimeoutMinutes: CONFIG.PENDING_TIMEOUT_MINUTES,
    allowedEmailDomains: CONFIG.ALLOWED_EMAIL_DOMAINS,
  };
}

function getDay_(bike, dateStr) {
  const cal = calendar_(bike);
  const day = parseDate_(dateStr);
  checkRange_(day);
  const hours = CONFIG.OPENING_HOURS[day.getDay()];
  const dayEnd = at_(day, 24 * 60);
  const busy = cal.getEvents(day, dayEnd).map(function (ev) {
    return { start: clock_(ev.getStartTime(), day, dayEnd), end: clock_(ev.getEndTime(), day, dayEnd) };
  });
  return { ok: true, open: hours ? hours[0] : null, close: hours ? hours[1] : null, busy: busy };
}

function book_(data) {
  // Skryté pole „website“ vyplňují jen roboti – tváříme se, že je vše v pořádku.
  if (data.website) return { ok: true, message: 'Rezervace přijata.' };

  const bike = String(data.bike || '');
  const cal = calendar_(bike);

  const name = String(data.name || '').trim();
  if (name.length < 2 || name.length > 80) throw new Error('Vyplň jméno a příjmení.');

  const email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Neplatný e-mail.');
  if (!emailAllowed_(email)) {
    throw new Error('Rezervovat lze jen s e-mailem z domény ' + CONFIG.ALLOWED_EMAIL_DOMAINS.join(', ') + '.');
  }

  const day = parseDate_(data.date);
  checkRange_(day);
  const hours = CONFIG.OPENING_HOURS[day.getDay()];
  if (!hours) throw new Error('V tento den je zavřeno.');

  const startMin = minutes_(data.start);
  const duration = parseInt(data.duration, 10);
  const step = CONFIG.STEP_MINUTES;
  if (startMin % step || !(duration > 0) || duration % step || duration > CONFIG.MAX_BOOKING_MINUTES) {
    throw new Error('Neplatný začátek nebo délka rezervace.');
  }
  if (startMin < minutes_(hours[0]) || startMin + duration > minutes_(hours[1])) {
    throw new Error('Rezervace musí být v otevírací době (' + hours[0] + '–' + hours[1] + ').');
  }

  const start = at_(day, startMin);
  const end = at_(day, startMin + duration);
  if (start < new Date()) throw new Error('Tento termín už začal nebo proběhl.');

  // Zámek, aby dva lidé současně nezarezervovali stejný čas.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (overlapping_(cal, start, end).length) throw new Error('Termín je už obsazený, vyber prosím jiný.');

    const used = minutesBookedBy_(email, day);
    if (used + duration > CONFIG.MAX_MINUTES_PER_DAY) {
      throw new Error('Denně si můžeš zarezervovat nejvýše ' + CONFIG.MAX_MINUTES_PER_DAY +
        ' min, tento den už máš ' + used + ' min.');
    }

    const token = Utilities.getUuid();
    // Jméno a e-mail jsou jen v popisu události – kalendář je veřejně sdílený pouze jako „volno/obsazeno“.
    const ev = cal.createEvent('Rezervace (čeká na potvrzení)', start, end, {
      description: 'Jméno: ' + name + '\nE-mail: ' + email,
    });
    // Všechna metadata v jednom tagu – každé volání setTag je samostatný (pomalý) zápis do kalendáře.
    setMeta_(ev, { token: token, email: email, status: 'pending', created: Date.now() });

    try {
      sendConfirmationEmail_(email, name, bike, start, end, token);
    } catch (err) {
      ev.deleteEvent();
      throw new Error('Nepodařilo se odeslat potvrzovací e-mail, zkus to prosím znovu.');
    }
  } finally {
    lock.releaseLock();
  }

  return {
    ok: true,
    message: 'Hotovo! Na ' + email + ' jsme poslali e-mail. Rezervaci potvrď do ' +
      CONFIG.PENDING_TIMEOUT_MINUTES + ' minut, jinak propadne.',
  };
}

function confirm_(token) {
  const found = findByToken_(token);
  if (!found) return { title: 'Rezervace nenalezena', text: 'Rezervace mohla propadnout nebo byla zrušena. Vytvoř prosím novou.' };
  const ev = found.event;
  const when = describe_(found.bike, ev.getStartTime(), ev.getEndTime());

  const meta = found.meta;
  if (meta.status === 'pending') {
    if (isExpired_(meta)) {
      ev.deleteEvent();
      return { title: 'Rezervace propadla', text: 'Nebyla potvrzena včas. Vytvoř prosím novou.' };
    }
    meta.status = 'confirmed';
    setMeta_(ev, meta);
    ev.setTitle('Rezervace');
  }
  return { title: 'Rezervace potvrzena', text: when + '. Těšíme se na tebe!', canCancel: true };
}

/**
 * Zrušení je dvoukrokové: poštovní skenery odkazů (např. Microsoft Safe Links) otevírají odkazy
 * z e-mailů automaticky a jednokrokový odkaz by rezervaci zrušil bez vědomí jezdce.
 */
function cancelPrompt_(token) {
  const found = findByToken_(token);
  if (!found) return { title: 'Rezervace nenalezena', text: 'Rezervace už byla zrušena nebo propadla.' };
  const ev = found.event;
  return { title: 'Zrušit rezervaci?', text: describe_(found.bike, ev.getStartTime(), ev.getEndTime()), askCancel: true };
}

function cancel_(token) {
  const found = findByToken_(token);
  if (!found) return { title: 'Rezervace nenalezena', text: 'Rezervace už byla zrušena nebo propadla.' };
  const ev = found.event;
  if (ev.getStartTime() < new Date()) return { title: 'Nelze zrušit', text: 'Rezervace už začala nebo proběhla.' };
  const when = describe_(found.bike, ev.getStartTime(), ev.getEndTime());
  ev.deleteEvent();
  return { title: 'Rezervace zrušena', text: when + ' je znovu volné. Díky za zrušení včas.' };
}

// ===== Údržba =====

/** Spusť jednou ručně v editoru – nastaví pravidelné mazání nepotvrzených rezervací. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'cleanupPending'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanupPending').timeBased().everyMinutes(10).create();
}

function cleanupPending() {
  Object.keys(CONFIG.BIKES).forEach(function (bike) {
    upcomingEvents_(calendar_(bike)).forEach(function (ev) {
      const meta = getMeta_(ev);
      if (meta && meta.status === 'pending' && isExpired_(meta)) ev.deleteEvent();
    });
  });
}

// ===== Pomocné funkce =====

function calendar_(bike) {
  const id = CONFIG.BIKES[bike];
  if (!id) throw new Error('Neznámé kolo.');
  const cal = CalendarApp.getCalendarById(id);
  if (!cal) throw new Error('Kalendář kola ' + bike + ' není dostupný.');
  return cal;
}

function parseDate_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) throw new Error('Neplatné datum.');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function checkRange_(day) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + CONFIG.MAX_DAYS_AHEAD);
  if (day < today || day > last) throw new Error('Rezervovat lze nejvýše ' + CONFIG.MAX_DAYS_AHEAD + ' dní dopředu.');
}

function minutes_(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  if (!m) throw new Error('Neplatný čas.');
  return Number(m[1]) * 60 + Number(m[2]);
}

function at_(day, mins) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, mins);
}

/** Čas HH:mm v rámci dne; události přesahující den se ořízne na 00:00 / 24:00. */
function clock_(d, dayStart, dayEnd) {
  if (d <= dayStart) return '00:00';
  if (d >= dayEnd) return '24:00';
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm');
}

function overlapping_(cal, start, end) {
  return cal.getEvents(start, end).filter(function (ev) {
    return ev.getStartTime() < end && ev.getEndTime() > start;
  });
}

function minutesBookedBy_(email, day) {
  const dayEnd = at_(day, 24 * 60);
  let total = 0;
  Object.keys(CONFIG.BIKES).forEach(function (bike) {
    calendar_(bike).getEvents(day, dayEnd).forEach(function (ev) {
      const meta = getMeta_(ev);
      if (meta && meta.email === email) total += (ev.getEndTime() - ev.getStartTime()) / 60000;
    });
  });
  return total;
}

function emailAllowed_(email) {
  const domains = CONFIG.ALLOWED_EMAIL_DOMAINS;
  if (!domains.length) return true;
  const host = email.split('@')[1];
  return domains.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; });
}

function upcomingEvents_(cal) {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 3600 * 1000);
  const to = new Date(now.getTime() + (CONFIG.MAX_DAYS_AHEAD + 2) * 24 * 3600 * 1000);
  return cal.getEvents(from, to);
}

function findByToken_(token) {
  if (!/^[0-9a-f-]{36}$/.test(token || '')) return null;
  const bikes = Object.keys(CONFIG.BIKES);
  for (let i = 0; i < bikes.length; i++) {
    const events = upcomingEvents_(calendar_(bikes[i]));
    for (let j = 0; j < events.length; j++) {
      const meta = getMeta_(events[j]);
      if (meta && meta.token === token) return { bike: bikes[i], event: events[j], meta: meta };
    }
  }
  return null;
}

/** Metadata rezervace (token, e-mail, stav, čas vytvoření); null u událostí, které nevytvořil skript. */
function getMeta_(ev) {
  const raw = ev.getTag('data');
  return raw ? JSON.parse(raw) : null;
}

function setMeta_(ev, meta) {
  ev.setTag('data', JSON.stringify(meta));
}

function isExpired_(meta) {
  return Date.now() - meta.created > CONFIG.PENDING_TIMEOUT_MINUTES * 60000;
}

function describe_(bike, start, end) {
  return bike + ', ' + Utilities.formatDate(start, CONFIG.TIMEZONE, 'd. M. yyyy H:mm') +
    '–' + Utilities.formatDate(end, CONFIG.TIMEZONE, 'H:mm');
}

function actionUrl_(action, token) {
  return CONFIG.WEB_APP_URL + '?action=' + action + '&token=' + encodeURIComponent(token);
}

/** Odkaz do e-mailu: na rychlou stránku webu, pokud je nastavená, jinak přímo na Apps Script. */
function emailUrl_(action, token) {
  if (!CONFIG.CONFIRM_PAGE_URL) return actionUrl_(action, token);
  return CONFIG.CONFIRM_PAGE_URL + '?action=' + action + '&token=' + encodeURIComponent(token);
}

function sendConfirmationEmail_(email, name, bike, start, end, token) {
  const when = describe_(bike, start, end);
  const confirmUrl = emailUrl_('confirm', token);
  const cancelUrl = emailUrl_('cancel', token);
  // target=_blank: některé poštovní klienty jinak otevírají odkaz uvnitř okna s e-mailem, kde stránka nefunguje.
  const link = ' target="_blank" rel="noopener"';
  const btn = 'display:inline-block;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;';
  MailApp.sendEmail({
    to: email,
    name: 'Smart kola ÚTVS ČVUT',
    subject: 'Potvrď rezervaci: ' + when,
    body: 'Ahoj ' + name + ',\n\nrezervace: ' + when + '\n\nPotvrď ji do ' + CONFIG.PENDING_TIMEOUT_MINUTES +
      ' minut: ' + confirmUrl + '\nZrušit: ' + cancelUrl + '\n',
    htmlBody:
      '<div style="font-family:system-ui,sans-serif;font-size:16px;color:#1a1f2b">' +
      '<p>Ahoj ' + escape_(name) + ',</p>' +
      '<p>děkujeme za rezervaci <strong>' + escape_(when) + '</strong>.</p>' +
      '<p>Potvrď ji prosím do ' + CONFIG.PENDING_TIMEOUT_MINUTES + ' minut, jinak propadne:</p>' +
      '<p><a href="' + confirmUrl + '"' + link + ' style="' + btn + 'background:#0065bd;color:#fff">Potvrdit rezervaci</a></p>' +
      '<p style="color:#5b6474;font-size:14px">Nemůžeš přijít? <a href="' + cancelUrl + '"' + link + '>Zrušit rezervaci</a> ' +
      '(odkaz si schovej, platí i po potvrzení).</p>' +
      '<p style="color:#5b6474;font-size:13px">Tlačítko nefunguje? Zkopíruj tento odkaz do nové záložky prohlížeče:<br>' +
      '<span style="word-break:break-all">' + escape_(confirmUrl) + '</span></p>' +
      '</div>',
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function result_(r, p) {
  if (p.format === 'json') return json_(Object.assign({ ok: true }, r));
  return page_(r, p.token);
}

function page_(r, token) {
  const html =
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#1a1f2b">' +
    '<h1 style="color:#0065bd;font-size:26px">' + escape_(r.title) + '</h1>' +
    '<p style="font-size:17px;line-height:1.6">' + escape_(r.text) + '</p>' +
    (r.askCancel ? '<p><a href="' + escape_(actionUrl_('cancel', token) + '&sure=1') + '" target="_top" style="display:inline-block;' +
      'padding:10px 18px;border-radius:8px;background:#c62828;color:#fff;text-decoration:none;font-weight:600">Ano, zrušit rezervaci</a></p>' : '') +
    (r.canCancel ? '<p><a href="' + escape_(actionUrl_('cancel', token)) + '" target="_top">Zrušit rezervaci</a></p>' : '') +
    '<p><a href="' + CONFIG.SITE_URL + '" target="_top">← Zpět na rezervace</a></p>' +
    '</div>';
  // ALLOWALL: některé webmaily (např. Horde) otevírají odkazy uvnitř rámu se zprávou;
  // bez toho by Google stránku v rámu odmítl zobrazit a kliknutí by „nic nedělalo“.
  return HtmlService.createHtmlOutput(html)
    .setTitle(r.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escape_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
