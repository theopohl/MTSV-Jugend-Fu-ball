// Erwartet, dass supabase-js (UMD) vorher per <script> aus dem CDN geladen wurde
// und dass config.js vorher geladen wurde (liefert window.APP_CONFIG).

window.sb = (function () {
  const cfg = window.APP_CONFIG;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return client;
})();
