// Jediné místo, kde se nastavuje napojení webu na kalendáře a rezervace.
// Postup, jak hodnoty získat, je v README.md.
window.SITE_CONFIG = {
  timezone: "Europe/Prague",

  // URL nasazené Apps Script web appky (končí na /exec), viz apps-script/Code.gs.
  bookingApiUrl: "",

  // Každé kolo má vlastní veřejný kalendář (pod účtem utvs.smartbike@gmail.com).
  // Kolo s prázdným calendarId se v kalendáři na webu nezobrazí.
  // Názvy musí odpovídat CONFIG.BIKES v apps-script/Code.gs.
  bikes: [
    {
      name: "Bike1",
      // Nastavení kalendáře → Integrace kalendáře → ID kalendáře
      calendarId: "3abb68883906c09a737edb7b2de51e66a85ced4f693d84a620ad1a0058915af7@group.calendar.google.com",
      color: "#0065bd",
    },
    {
      name: "Bike2",
      calendarId: "",
      color: "#e37222",
    },
  ],
};
