// ============================================================================
// Konfiguration – hier deine eigenen Werte eintragen.
// Diese Datei enthält KEINE Geheimnisse, die geschützt werden müssten:
// Der Supabase "anon key" ist bewusst öffentlich (siehe README).
// ============================================================================

window.APP_CONFIG = {
  // Aus Supabase: Project Settings -> API
  supabaseUrl: "https://kffjoqatpqhdzynnrhwv.supabase.co",
  supabaseAnonKey: "sb_publishable_5l2MRLQj0_9fe_IEYa8xFw_RJPeMgSK",

  // Gemeinsamer Zugangscode für Trainer- und Admin-Seite (frei wählbar).
  // Siehe README "Grenzen des Passcode-Schutzes".
  passcode: "mtsv2026",

  // Vereins- und Design-Konstanten
  club: {
    name: "MTSV Hohenwestedt",
    logo: "assets/mtsv-logo.png",
    presenter: "POHL",
    defaultVenue: "Sportpark Wilhelmshöhe",
  },

  jerseyBg: "assets/jersey-bg.png",

  colors: {
    jerseyGreen: "#0F3B26",
    cream: "#E9EFE9",
    mtsvGreen: "#2B7A3C",
    mtsvRed: "#C0392B",
    flagGreen: "#2F9457",
    flagWhite: "#F3F3F3",
    flagRed: "#B32B2B",
  },
};
