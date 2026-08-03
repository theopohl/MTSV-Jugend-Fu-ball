// Dünne Zugriffsschicht auf Supabase (Tabellen + Storage).
// Erwartet window.sb (siehe supabase-client.js).

window.Db = (function () {
  const sb = () => window.sb;

  async function unwrap(promise) {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  }

  // ---- teams ---------------------------------------------------------------

  async function getTeams() {
    return unwrap(sb().from("teams").select("*").order("name"));
  }

  async function getTeamBySlug(slug) {
    const rows = await unwrap(
      sb().from("teams").select("*").eq("slug", slug).limit(1)
    );
    return rows[0] || null;
  }

  async function updateTeam(teamId, patch) {
    return unwrap(sb().from("teams").update(patch).eq("id", teamId));
  }

  // ---- opponents -------------------------------------------------------------

  async function getOpponents() {
    return unwrap(sb().from("opponents").select("*").order("name"));
  }

  async function createOpponent({ name, logoFile }) {
    let logo_url = null;
    if (logoFile) {
      logo_url = await uploadOpponentLogo(name, logoFile);
    }
    const rows = await unwrap(
      sb().from("opponents").insert({ name, logo_url }).select()
    );
    return rows[0];
  }

  async function uploadOpponentLogo(opponentName, file) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${slugify(opponentName)}-${Date.now()}.${ext}`;
    await unwrap(
      sb().storage.from("opponent-logos").upload(path, file, { upsert: true })
    );
    return sb().storage.from("opponent-logos").getPublicUrl(path).data.publicUrl;
  }

  async function updateOpponentLogo(opponentId, opponentName, file) {
    const logo_url = await uploadOpponentLogo(opponentName, file);
    const rows = await unwrap(
      sb().from("opponents").update({ logo_url }).eq("id", opponentId).select()
    );
    return rows[0];
  }

  // ---- team photos ------------------------------------------------------------

  async function getTeamPhotos(teamId) {
    return unwrap(
      sb()
        .from("team_photos")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
    );
  }

  async function uploadTeamPhoto(teamId, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${teamId}/${Date.now()}.${ext}`;
    await unwrap(
      sb().storage.from("team-photos").upload(path, file, { upsert: true })
    );
    const url = sb().storage.from("team-photos").getPublicUrl(path).data.publicUrl;
    const rows = await unwrap(
      sb().from("team_photos").insert({ team_id: teamId, url }).select()
    );
    return rows[0];
  }

  async function deleteTeamPhoto(photoId) {
    return unwrap(sb().from("team_photos").delete().eq("id", photoId));
  }

  // ---- fixtures ----------------------------------------------------------------

  const FIXTURE_SELECT = "*, opponent:opponents(*)";

  async function getFixtures(teamId) {
    return unwrap(
      sb()
        .from("fixtures")
        .select(FIXTURE_SELECT)
        .eq("team_id", teamId)
        .order("date", { ascending: true })
    );
  }

  async function getNextFixture(teamId) {
    const rows = await unwrap(
      sb()
        .from("fixtures")
        .select(FIXTURE_SELECT)
        .eq("team_id", teamId)
        .eq("status", "geplant")
        .order("date", { ascending: true })
        .limit(1)
    );
    return rows[0] || null;
  }

  async function getLastPlayedFixture(teamId, beforeDate) {
    let q = sb()
      .from("fixtures")
      .select(FIXTURE_SELECT)
      .eq("team_id", teamId)
      .eq("status", "gespielt")
      .order("date", { ascending: false })
      .limit(1);
    if (beforeDate) q = q.lt("date", beforeDate);
    const rows = await unwrap(q);
    return rows[0] || null;
  }

  async function getFixtureById(id) {
    const rows = await unwrap(
      sb().from("fixtures").select(FIXTURE_SELECT).eq("id", id).limit(1)
    );
    return rows[0] || null;
  }

  async function createFixture(fixture) {
    const rows = await unwrap(
      sb().from("fixtures").insert(fixture).select(FIXTURE_SELECT)
    );
    return rows[0];
  }

  async function updateFixture(id, patch) {
    const rows = await unwrap(
      sb().from("fixtures").update(patch).eq("id", id).select(FIXTURE_SELECT)
    );
    return rows[0];
  }

  async function bulkCreateFixtures(rows) {
    return unwrap(sb().from("fixtures").insert(rows).select(FIXTURE_SELECT));
  }

  async function saveResult(fixtureId, { own_goals, opp_goals, scorers, note }) {
    return updateFixture(fixtureId, {
      own_goals,
      opp_goals,
      scorers: scorers || [],
      note: note || null,
      status: "gespielt",
    });
  }

  function slugify(s) {
    return (s || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return {
    getTeams,
    getTeamBySlug,
    updateTeam,
    getOpponents,
    createOpponent,
    uploadOpponentLogo,
    updateOpponentLogo,
    getTeamPhotos,
    uploadTeamPhoto,
    deleteTeamPhoto,
    getFixtures,
    getNextFixture,
    getLastPlayedFixture,
    getFixtureById,
    createFixture,
    updateFixture,
    bulkCreateFixtures,
    saveResult,
    slugify,
  };
})();
