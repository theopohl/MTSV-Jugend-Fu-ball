// ============================================================================
// Konfiguration – hier deine eigenen Werte eintragen.
// Diese Datei enthält KEINE Geheimnisse, die geschützt werden müssten:
// Der Supabase "anon key" ist bewusst öffentlich (siehe README).
// ============================================================================

window.APP_CONFIG = {
  // Aus Supabase: Project Settings -> API
  supabaseUrl: "https://kffjoqatpqhdzynnrhwv.supabase.co",
  supabaseAnonKey: "sb_publishable_5l2MRLQj0_9fe_IEYa8xFw_RJPeMgSK",

  // Zugangscode für die Trainer-Seite (trainer.html), frei wählbar.
  // WICHTIG: Nur eine leichte, optische Zugangssperre im Browser, kein
  // echter Schutz – siehe README "Grenzen des Passcode-Schutzes". Wer den
  // Supabase anon/publishable Key kennt, kommt trotzdem über die API an
  // die Daten.
  passcode: "mtsv2026",

  // Eigener, separater Zugangscode für die Generator-Seite (index.html).
  // Trennt Trainer- und Generator-Zugang nur optisch im Browser (siehe
  // oben) – wer nur den normalen "passcode" kennt, kommt hiermit NICHT in
  // den Generator. Für eine echte Rechtetrennung bräuchte es
  // Supabase-Auth-Logins statt eines gemeinsamen Passcodes.
  adminPasscode: "mtsv-admin-2026",

  // Vereins- und Design-Konstanten
  club: {
    name: "MTSV Hohenwestedt",
    logo: "assets/mtsv-logo.png",
    // Sponsor-Logo als Bild (kein getippter Text mehr) für die Sponsorleiste.
    presenterLogo: "assets/pohl-logo.png",
    defaultVenue: "Sportpark Wilhelmshöhe",
  },

  jerseyBg: "assets/jersey-bg.png",

  colors: {
    jerseyGreen: "#0F3B26",
    cream: "#E9EFE9",
    sponsorBarDark: "#081E14",
  },
};
