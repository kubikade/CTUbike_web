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

Kalendáře spravuje účet **utvs.smartbike@gmail.com**. Každé kolo má **vlastní kalendář** (`Bike1`, `Bike2`) a vlastní plán schůzek; hlavní kalendář účtu se nesdílí.

Pro každé kolo:

1. **Vytvoř kalendář:** *Nastavení → Přidat kalendář → Vytvořit nový kalendář* → název `Bike1`.
2. **Zveřejni ho:** *Nastavení kalendáře Bike1 → Oprávnění k přístupu k událostem → Zpřístupnit veřejnosti* → **„Zobrazit pouze informace o volném čase / zaneprázdnění (skrýt podrobnosti)“**. Veřejnost uvidí jen „Obsazeno“, ne jména (GDPR).
3. **ID kalendáře:** *Integrace kalendáře → ID kalendáře* (`…@group.calendar.google.com`) zkopíruj do `bikes[].calendarId` v `assets/js/config.js`.
4. **Plán schůzek:** *Vytvořit → Plán schůzek* → název `Bike1`, délka slotu (např. 60 min), hodiny podle otvíračky, rezervační okno max. 7 dní dopředu.
   - Pokud jde vybrat, ve kterém kalendáři se rezervace vytvářejí, zvol `Bike1`.
   - U *Kontrolovat dostupnost v kalendářích* nech zaškrtnutý jen `Bike1`, jinak by rezervace jednoho kola blokovala druhé.
   - Odkaz na rezervační stránku zkopíruj do `bikes[].bookingUrl`.

Kolo s prázdným `calendarId` se na webu nezobrazí, takže `Bike2` stačí doplnit, až bude potřeba. Web vloží všechny kalendáře do jednoho týdenního pohledu (každé kolo jinou barvou, na mobilu seznam) a ke každému kolu přidá tlačítko pro rezervaci a odkazy na odběr.

> **Pozor:** u bezplatného Gmail účtu může Google vytvářet rezervace z plánu schůzek jen do **hlavního** kalendáře. Pokud v nastavení plánu výběr kalendáře chybí, řešení je ruční: rezervace se objeví v hlavním kalendáři a je potřeba ji přesunout do `Bike1`/`Bike2` (u události *Kalendář → Bike1*), nebo zvážit Microsoft Bookings / Cal.com.

### Alternativy, kdyby Google nestačil

- **Microsoft Bookings** (ČVUT má Microsoft 365) – podobné rezervace s podporou více „zdrojů“ (kol), přihlašování přes ČVUT účet.
- **Cal.com** – open-source, umí víc míst na slot.
- Formulář + ruční zápis do kalendáře – nejjednodušší, ale pracné pro správce.
