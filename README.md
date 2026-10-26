# Smart kola ÚTVS ČVUT

Statický web (rozcestník) pro smart trenažéry **Wahoo KICKR Bike Pro** v posilovně ÚTVS ČVUT na Karlově náměstí.
Čisté HTML + CSS, bez build kroku – hostované na GitHub Pages.

```
index.html          rozcestník
navod.html          návod: Wahoo app → posed → ROUVY → po jízdě
rezervace.html      rezervační formulář + vložený Google kalendář
assets/css/style.css
assets/js/config.js   ← ID kalendářů a URL rezervačního API (jediné místo k úpravě webu)
assets/js/calendar.js vložený kalendář a odkazy na odběr
assets/js/booking.js  rezervační formulář
apps-script/          backend rezervací (Google Apps Script), kopíruje se ručně do script.google.com
```

Místa, která je potřeba doplnit, jsou na webu označená rámečkem **TODO** (`class="todo"`).

## Lokální náhled

Stačí otevřít `index.html` v prohlížeči, nebo:

```bash
python -m http.server 8000
```

## Nasazení na GitHub Pages

1. Vytvoř repozitář na GitHubu (např. `utvs-smart-bikes`) a pushni do větve `main`.
2. *Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`*.
3. Web poběží na `https://<uživatel-nebo-organizace>.github.io/<repo>/`.

## Rezervace (Google Apps Script)

```
Web (GitHub Pages)  ──fetch──▶  Apps Script web app  ──▶  kalendáře Bike1, Bike2
 rezervace.html                  apps-script/Code.gs        (účet utvs.smartbike@gmail.com)
 assets/js/booking.js            běží pod účtem gymu
```

- Jezdec vybere na webu kolo, den, začátek a **libovolnou délku** (po 30 min, max. 2 h).
- Skript zkontroluje pravidla a volný termín a zapíše událost **přímo do kalendáře kola**.
- Přijde mu e-mail s odkazem **Potvrdit** (do 30 min, jinak rezervace propadne) a **Zrušit**.
- Veřejný kalendář na webu ukazuje jen „Obsazeno“. Jméno a e-mail jsou v popisu události, který vidí jen správce.
- Správce může čas zablokovat ručně: stačí v kalendáři kola vytvořit libovolnou událost (např. „Servis“). Celodenní událost zablokuje celý den.

Pravidla (otevírací doba, délky, limit na den, povolené domény e-mailů) jsou v `CONFIG` na začátku `apps-script/Code.gs`.

### 1. Kalendáře kol

Pro každé kolo pod účtem **utvs.smartbike@gmail.com**:

1. *Nastavení → Přidat kalendář → Vytvořit nový kalendář* → `Bike1`.
2. *Oprávnění k přístupu k událostem → Zpřístupnit veřejnosti* → **„Zobrazit pouze informace o volném čase / zaneprázdnění (skrýt podrobnosti)“**.
   ⚠️ Nikdy nepřepínej na „zobrazit všechny podrobnosti“, zveřejnila by se jména a e-maily.
3. *Integrace kalendáře → ID kalendáře* zapiš do:
   - `CONFIG.BIKES` v `apps-script/Code.gs`,
   - `bikes[].calendarId` v `assets/js/config.js` (stejný název kola).

### 2. Nasazení skriptu

1. Přihlas se jako **utvs.smartbike@gmail.com** a otevři [script.google.com](https://script.google.com) → **Nový projekt**, pojmenuj ho např. `Rezervace kol`.
2. Obsah souboru `Code.gs` nahraď obsahem `apps-script/Code.gs` z repozitáře.
3. *Nastavení projektu (ozubené kolo)* → zaškrtni **Zobrazovat v editoru soubor manifestu appsscript.json** → v editoru přepiš `appsscript.json` obsahem `apps-script/appsscript.json` (nastaví časové pásmo Praha).
4. V editoru vyber funkci **`setup`** a klikni **Spustit**. Google si vyžádá oprávnění:
   *Zkontrolovat oprávnění → účet → Rozšířené → Přejít na Rezervace kol (nebezpečné) → Povolit.*
   Varování je normální, skript běží pod vlastním účtem a Google ho neověřoval. `setup` nastaví mazání nepotvrzených rezervací každých 10 minut.
5. **Nasadit → Nové nasazení** → typ **Webová aplikace**:
   - *Spustit jako:* **Já** (utvs.smartbike@gmail.com)
   - *Kdo má přístup:* **Kdokoli**
6. Zkopíruj **URL webové aplikace** (končí na `/exec`) do:
   - `bookingApiUrl` v `assets/js/config.js`,
   - `CONFIG.WEB_APP_URL` v `Code.gs` (z ní se skládají odkazy Potvrdit / Zrušit v e-mailech) → ulož a nasaď novou verzi (viz níže).

7. Až web poběží na GitHub Pages, vyplň v `Code.gs` `CONFIG.CONFIRM_PAGE_URL` = `https://kubikade.github.io/CTUbike_web/potvrzeni.html` a nasaď novou verzi. Odkazy v e-mailu pak otevřou rychlou stránku webu místo pomalé stránky Apps Scriptu.

**Kontrola:** otevři v prohlížeči `<URL>/exec?action=config`. Měl by se zobrazit JSON s `"ok":true`.

### Změny skriptu později

Po úpravě kódu: *Nasadit → Spravovat nasazení → (tužka) → Verze: Nová verze → Nasadit*. URL zůstane stejná.
Pozor: *Nové nasazení* by vytvořilo novou URL a web by přestal fungovat, dokud ji nezměníš v `config.js`.

### Limity

Bezplatný Gmail účet může odeslat ~100 e-mailů denně, to je ~100 rezervací za den. Pro dvě kola to stačí.
