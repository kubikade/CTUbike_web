// Jediné místo, kde se nastavuje napojení na Google kalendáře.
// Postup, jak hodnoty získat, je v README.md.
window.SITE_CONFIG = {
  timezone: "Europe/Prague",

  // Každé kolo má vlastní veřejný kalendář (vytvořený pod účtem utvs.smartbike@gmail.com)
  // a vlastní rezervační stránku. Kolo s prázdným calendarId se na webu nezobrazí.
  bikes: [
    {
      name: "Bike1",
      // Nastavení kalendáře → Integrace kalendáře → ID kalendáře, např. "abc123...@group.calendar.google.com"
      calendarId: "",
      // Odkaz na rezervační stránku (plán schůzek), např. "https://calendar.app.google/XXXXXXXX"
      bookingUrl: "",
      color: "#0065bd",
    },
    {
      name: "Bike2",
      calendarId: "",
      bookingUrl: "",
      color: "#e37222",
    },
  ],
};
