// Stránka potvrzení / zrušení rezervace (odkaz z e-mailu: potvrzeni.html?action=confirm|cancel&token=…).
// Načte se okamžitě z GitHub Pages a s Apps Scriptem mluví na pozadí.
(function () {
  var api = (window.SITE_CONFIG || {}).bookingApiUrl;
  var params = new URLSearchParams(location.search);
  var action = params.get("action");
  var token = params.get("token") || "";

  var title = document.getElementById("r-title");
  var text = document.getElementById("r-text");
  var actions = document.getElementById("r-actions");

  function show(t, msg, kind) {
    title.textContent = t;
    document.title = t + " · Smart kola ÚTVS ČVUT";
    text.textContent = msg;
    text.className = "form-status" + (kind ? " " + kind : "");
  }

  function call(extra) {
    var q = new URLSearchParams({ action: action, token: token, format: "json" });
    Object.keys(extra || {}).forEach(function (k) { q.set(k, extra[k]); });
    return fetch(api + "?" + q.toString())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || "Neznámá chyba.");
        return d;
      });
  }

  function render(d) {
    show(d.title, d.text);
    actions.innerHTML = "";
    if (d.askCancel) {
      var btn = document.createElement("button");
      btn.className = "btn danger";
      btn.type = "button";
      btn.textContent = "Ano, zrušit rezervaci";
      btn.addEventListener("click", function () {
        btn.disabled = true;
        show("Ruším rezervaci…", "Chvilku to trvá…", "busy");
        call({ sure: "1" }).then(render).catch(fail);
      });
      actions.appendChild(btn);
    }
    if (d.canCancel) {
      var a = document.createElement("a");
      a.className = "btn secondary";
      a.href = "potvrzeni.html?action=cancel&token=" + encodeURIComponent(token);
      a.textContent = "Zrušit rezervaci";
      actions.appendChild(a);
    }
  }

  function fail(err) { show("Něco se nepovedlo", err.message, "error"); }

  if (!api || (action !== "confirm" && action !== "cancel") || !token) {
    show("Neplatný odkaz", "Odkaz je neúplný. Zkopíruj prosím celý odkaz z e-mailu.", "error");
    return;
  }

  show(action === "confirm" ? "Potvrzuji rezervaci…" : "Načítám rezervaci…", "Chvilku to trvá…", "busy");
  call().then(render).catch(fail);
})();
