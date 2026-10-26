# Smart kola ÚTVS ČVUT

Statický web (rozcestník) pro smart trenažéry **Wahoo KICKR Bike Pro** v posilovně ÚTVS ČVUT na Karlově náměstí.
Čisté HTML + CSS, bez build kroku – hostované na GitHub Pages.

```
index.html          rozcestník
navod.html          návod: Wahoo app → posed → ROUVY → po jízdě
rezervace.html      vložený Google kalendář + rezervace
assets/css/style.css
assets/js/config.js   ← ID kalendáře a rezervační odkaz (jediné místo k úpravě)
assets/js/calendar.js
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

## Rezervace přes Google kalendář

Google umí obojí, co potřebujeme:

- **Veřejný kalendář** – lze vložit do webu (iframe) a kdokoli si ho může přidat k odběru (Google / iCal URL pro Outlook a Apple).
- **Plán schůzek (Appointment schedule)** – rezervační stránka s volnými sloty, kde si člověk sám vybere termín; rezervace se objeví v kalendáři a rezervující dostane e-mail s pozvánkou a odkazem na zrušení.

### Doporučené nastavení

1. **Založ samostatný Google účet pro gym** (např. `utvs.kola@gmail.com`), ne osobní. Rezervace pak nejsou vázané na jednoho člověka a správu lze předat.
2. *Google Calendar → Vytvořit → Plán schůzek*:
   - délka slotu (např. 60 min), dostupné hodiny podle otvíračky gymu,
   - *Rezervační okno*: max. 7 dní dopředu, min. např. 1 h předem,
   - povinné údaje: jméno, e-mail (ideálně i poznámka „číslo kola“).
   - Odkaz na rezervační stránku zkopíruj do `bookingUrl` v `assets/js/config.js`.
3. **Více kol:** základní (bezplatná) verze plánu schůzek umožňuje 1 rezervaci na slot. Nejjednodušší je **jeden plán schůzek na každé kolo** („Kolo 1“, „Kolo 2“…). U každého pak vypni *Kontrolovat dostupnost v kalendářích*, jinak by rezervace kola 1 zablokovala stejný čas u kola 2. Na stránce pak stačí odkaz na každý plán (lze rozšířit `config.js`).
4. **Zveřejnění kalendáře:** *Nastavení kalendáře → Oprávnění k přístupu → Zpřístupnit veřejnosti* a zvol **„Zobrazit pouze informace o volném čase / zaneprázdnění (skrýt podrobnosti)“**. Veřejnost tak uvidí jen „Obsazeno“, ne jména (GDPR).
5. *Nastavení kalendáře → Integrace kalendáře → ID kalendáře* zkopíruj do `calendarId` v `assets/js/config.js`.
   (Pro primární kalendář účtu je ID přímo e-mailová adresa účtu.)

Web pak automaticky zobrazí týdenní pohled (na mobilu seznam) a tlačítka pro odběr.

### Alternativy, kdyby Google nestačil

- **Microsoft Bookings** (ČVUT má Microsoft 365) – podobné rezervace s podporou více „zdrojů“ (kol), přihlašování přes ČVUT účet.
- **Cal.com** – open-source, umí víc míst na slot.
- Formulář + ruční zápis do kalendáře – nejjednodušší, ale pracné pro správce.
