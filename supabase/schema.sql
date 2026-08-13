-- ============================================================================
-- MTSV Hohenwestedt Jugend – Instagram-Post-Generator
-- Supabase-Schema: Tabellen, Storage-Buckets, RLS-Policies, Seed-Daten
--
-- Anwendung: Im Supabase-Projekt -> SQL Editor -> dieses Skript einfügen -> Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabellen
-- ----------------------------------------------------------------------------

create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- z.B. "B-Jugend"
  slug          text not null unique,           -- z.B. "b-jugend" (für ?team=...)
  competition   text not null default '',       -- z.B. "Landesliga-Quali"
  hashtag       text not null default '',       -- z.B. "#BJugend"
  default_venue text not null default 'Sportpark Wilhelmshöhe',
  created_at    timestamptz not null default now()
);

create table if not exists opponents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  created_at timestamptz not null default now()
);

create table if not exists fixtures (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams(id) on delete cascade,
  type         text not null default 'liga'
               check (type in ('liga', 'testspiel', 'pokal')), -- Ligaspiele zählen als Spieltag, Test-/Pokalspiele nicht
  matchday     int,                                    -- Spieltag-Nr. (nur bei type='liga' relevant)
  opponent_id  uuid references opponents(id) on delete set null,
  date         date,                                   -- Spieltermin
  kickoff      time,                                    -- Anstoßzeit
  venue        text,                                    -- überschreibt default_venue
  is_home      boolean not null default true,
  competition  text,                                    -- überschreibt teams.competition falls gesetzt
  status       text not null default 'geplant'
               check (status in ('geplant', 'gespielt')),
  own_goals    int,
  opp_goals    int,
  scorers      jsonb not null default '[]'::jsonb,       -- [{name, minute}]
  note         text,
  updated_at   timestamptz not null default now()
);

-- Migration für bereits bestehende Installationen (create table if not exists
-- greift dort nicht mehr): Spalte "type" ergänzen, alle bereits eingetragenen
-- Spiele gelten als normale Ligaspiele.
alter table fixtures add column if not exists type text not null default 'liga';
alter table fixtures drop constraint if exists fixtures_type_check;
alter table fixtures add constraint fixtures_type_check
  check (type in ('liga', 'testspiel', 'pokal'));

create table if not exists team_photos (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  url        text not null,
  created_at timestamptz not null default now()
);

create index if not exists fixtures_team_id_idx on fixtures (team_id);
create index if not exists fixtures_status_idx on fixtures (team_id, status, date);
create index if not exists team_photos_team_id_idx on team_photos (team_id);

-- updated_at automatisch nachführen
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists fixtures_set_updated_at on fixtures;
create trigger fixtures_set_updated_at
  before update on fixtures
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Storage-Buckets (öffentlich lesbar, damit Bilder im Canvas geladen werden können)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('opponent-logos', 'opponent-logos', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Wichtig: Diese App hat KEIN echtes Nutzer-Login (Supabase Auth). Der Zugriff
-- läuft über den öffentlichen "anon"-Key + einen gemeinsamen Passcode, der nur
-- clientseitig in der Web-App abgefragt wird (siehe README, Abschnitt
-- "Grenzen des Passcode-Schutzes"). Wer den anon-Key kennt, kann die Tabellen
-- direkt per REST-API lesen/schreiben. Für ein Vereins-Tool ohne sensible
-- Daten (nur Spielpläne/Ergebnisse/Fotos) ist das ein bewusster Kompromiss.
-- ----------------------------------------------------------------------------

alter table teams enable row level security;
alter table opponents enable row level security;
alter table fixtures enable row level security;
alter table team_photos enable row level security;

drop policy if exists "teams_all" on teams;
create policy "teams_all" on teams for all
  using (true) with check (true);

drop policy if exists "opponents_all" on opponents;
create policy "opponents_all" on opponents for all
  using (true) with check (true);

drop policy if exists "fixtures_all" on fixtures;
create policy "fixtures_all" on fixtures for all
  using (true) with check (true);

drop policy if exists "team_photos_all" on team_photos;
create policy "team_photos_all" on team_photos for all
  using (true) with check (true);

-- Storage-Policies: öffentliches Lesen, Schreiben/Löschen für den anon-Key
drop policy if exists "team_photos_read" on storage.objects;
create policy "team_photos_read" on storage.objects for select
  using (bucket_id = 'team-photos');

drop policy if exists "team_photos_write" on storage.objects;
create policy "team_photos_write" on storage.objects for insert
  with check (bucket_id = 'team-photos');

drop policy if exists "team_photos_delete" on storage.objects;
create policy "team_photos_delete" on storage.objects for delete
  using (bucket_id = 'team-photos');

drop policy if exists "opponent_logos_read" on storage.objects;
create policy "opponent_logos_read" on storage.objects for select
  using (bucket_id = 'opponent-logos');

drop policy if exists "opponent_logos_write" on storage.objects;
create policy "opponent_logos_write" on storage.objects for insert
  with check (bucket_id = 'opponent-logos');

drop policy if exists "opponent_logos_delete" on storage.objects;
create policy "opponent_logos_delete" on storage.objects for delete
  using (bucket_id = 'opponent-logos');

-- ----------------------------------------------------------------------------
-- Seed: die vier Jugend-Mannschaften
-- ----------------------------------------------------------------------------

insert into teams (name, slug, competition, hashtag, default_venue)
values
  ('A-Jugend', 'a-jugend', 'Landesliga-Quali', '#AJugend', 'Sportpark Wilhelmshöhe'),
  ('B-Jugend', 'b-jugend', 'Landesliga-Quali', '#BJugend', 'Sportpark Wilhelmshöhe'),
  ('C-Jugend', 'c-jugend', 'Landesliga-Quali', '#CJugend', 'Sportpark Wilhelmshöhe'),
  ('D-Jugend', 'd-jugend', 'Verbandsliga-Quali', '#DJugend', 'Sportpark Wilhelmshöhe')
on conflict (slug) do nothing;
