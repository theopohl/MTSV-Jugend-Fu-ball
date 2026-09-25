-- ============================================================================
-- MTSV Hohenwestedt Jugend – Migration: automatisches Aufräumen + last_result
--
-- Einmalig auf der bestehenden Supabase-Datenbank ausführen:
-- Supabase-Dashboard -> SQL Editor -> dieses Skript einfügen -> Run.
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden. Diese Statements
-- sind zusätzlich (in derselben Form) in schema.sql für Neu-Installationen
-- enthalten.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. last_result: letztes Ergebnis pro Team als JSON
--
-- Damit die Ankündigungs-Caption weiter auf das letzte Ergebnis Bezug nehmen
-- kann ("Nach dem 3:1 gegen X…"), auch nachdem die zugehörige "gespielt"-
-- Fixture unten automatisch nach 3 Tagen gelöscht wurde. Wird von
-- js/db.js saveResult() bei jedem gespeicherten Ergebnis mit aktualisiert.
-- Form: {"own_goals":3,"opp_goals":1,"opponent_name":"TSV Beispiel",
--        "date":"2026-09-20","matchday":5,"is_home":true}
-- ----------------------------------------------------------------------------
alter table teams add column if not exists last_result jsonb;

-- ----------------------------------------------------------------------------
-- 2. Aufräum-Funktion: alte Spiele automatisch löschen
--
-- - "geplant": gelöscht, sobald date mehr als 1 Tag in der Vergangenheit
--   liegt und nie ein Ergebnis eingetragen wurde (sonst wäre der Status ja
--   "gespielt").
-- - "gespielt": gelöscht, sobald date mehr als 3 Tage in der Vergangenheit
--   liegt. Der Rückblick-Text lebt über teams.last_result weiter (siehe
--   oben), geht also NICHT verloren.
-- ----------------------------------------------------------------------------
create or replace function cleanup_old_fixtures()
returns void as $$
begin
  delete from fixtures
    where status = 'geplant' and date <= (current_date - interval '1 day');
  delete from fixtures
    where status = 'gespielt' and date <= (current_date - interval '3 days');
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Täglicher Aufruf per pg_cron (03:00 Uhr Datenbank-Zeit)
--
-- WICHTIG: pg_cron muss im Supabase-Dashboard aktiviert sein, sonst wird der
-- Job unten übersprungen (kein Fehler, nur ein "notice" im Log):
-- Supabase-Dashboard -> Database -> Extensions -> "pg_cron" aktivieren.
-- Danach dieses Skript (bzw. nur diesen Block) erneut ausführen.
--
-- Ein clientseitiges Sicherheitsnetz läuft zusätzlich bei jedem App-Start
-- (js/db.js cleanupOldFixtures(), aufgerufen aus app-index.js/app-trainer.js)
-- – falls dieser Cron-Job aus irgendeinem Grund nicht läuft, holt die App
-- das beim nächsten Öffnen trotzdem nach.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'cleanup-old-fixtures') then
      perform cron.unschedule('cleanup-old-fixtures');
    end if;
    perform cron.schedule('cleanup-old-fixtures', '0 3 * * *', 'select cleanup_old_fixtures();');
  else
    raise notice 'pg_cron ist nicht aktiviert – Cron-Job übersprungen. Aktivieren unter Database > Extensions im Supabase-Dashboard, danach dieses Skript erneut ausführen.';
  end if;
end $$;
