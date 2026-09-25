(async function () {
  // Sicherheitsnetz fürs automatische Aufräumen (Haupt-Job läuft serverseitig
  // per pg_cron, siehe supabase/migration_cleanup.sql). Bewusst nicht
  // awaited: darf den App-Start nicht verzögern, Fehler werden nur geloggt.
  window.Db.cleanupOldFixtures().catch((err) =>
    console.warn("Aufräumen alter Spiele fehlgeschlagen:", err)
  );

  const state = {
    teams: [],
    team: null,
    postType: "ankuendigung",
    fixtures: [],
    fixture: null,
    lastFixture: null,
    opponents: [],
    photos: [],
    selectedPhotoUrl: null,
  };

  const el = {
    teamChips: document.getElementById("teamChips"),
    typeChips: document.getElementById("typeChips"),
    fixtureSelectField: document.getElementById("fixtureSelectField"),
    fixtureSelect: document.getElementById("fixtureSelect"),
    weekendField: document.getElementById("weekendField"),
    weekendDate: document.getElementById("weekendDate"),
    announceOptions: document.getElementById("announceOptions"),
    photoGrid: document.getElementById("photoGrid"),
    randomPhotoBtn: document.getElementById("randomPhotoBtn"),
    noPhotoBtn: document.getElementById("noPhotoBtn"),
    canvas: document.getElementById("previewCanvas"),
    downloadBtn: document.getElementById("downloadBtn"),
    copyCaptionBtn: document.getElementById("copyCaptionBtn"),
    captionOutput: document.getElementById("captionOutput"),
    singleFixtureForm: document.getElementById("singleFixtureForm"),
    bulkImportInput: document.getElementById("bulkImportInput"),
    bulkImportBtn: document.getElementById("bulkImportBtn"),
    bulkImportResult: document.getElementById("bulkImportResult"),
  };

  el.canvas.width = window.Renderer.W;
  el.canvas.height = window.Renderer.H;

  // ---- Wochenübersicht: Datumshilfen ------------------------------------

  function parseDateLocal(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function nextSaturday() {
    const d = new Date();
    const diff = (6 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // Freitag–Sonntag der Woche, in der der übergebene Tag liegt (egal welcher
  // Wochentag ausgewählt wurde).
  function weekendRangeFor(dateStr) {
    const d = parseDateLocal(dateStr);
    const day = d.getDay(); // 0=So .. 6=Sa
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { friday: toISODate(friday), sunday: toISODate(sunday) };
  }

  const MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];

  function formatWeekendLabel(fridayStr, sundayStr) {
    const f = parseDateLocal(fridayStr);
    const s = parseDateLocal(sundayStr);
    if (f.getMonth() === s.getMonth()) {
      return `${f.getDate()}.–${s.getDate()}. ${MONTHS[f.getMonth()]}`;
    }
    return `${f.getDate()}. ${MONTHS[f.getMonth()]} – ${s.getDate()}. ${MONTHS[s.getMonth()]}`;
  }

  function weekdayLabel(dateStr) {
    return parseDateLocal(dateStr).toLocaleDateString("de-DE", { weekday: "long" }).toUpperCase();
  }

  async function loadTeams() {
    state.teams = await window.Db.getTeams();
    el.teamChips.innerHTML = "";
    state.teams.forEach((team, i) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (i === 0 ? " active" : "");
      chip.textContent = team.name;
      chip.dataset.teamId = team.id;
      chip.addEventListener("click", () => selectTeam(team));
      el.teamChips.appendChild(chip);
    });
    if (state.teams.length) await selectTeam(state.teams[0]);
  }

  async function selectTeam(team) {
    state.team = team;
    [...el.teamChips.children].forEach((c) =>
      c.classList.toggle("active", c.dataset.teamId === team.id)
    );
    state.opponents = await window.Db.getOpponents();
    state.photos = await window.Db.getTeamPhotos(team.id);
    renderPhotoGrid();
    await loadFixtures();
  }

  function selectType(type) {
    state.postType = type;
    [...el.typeChips.children].forEach((c) =>
      c.classList.toggle("active", c.dataset.type === type)
    );
    el.announceOptions.style.display = type === "ankuendigung" ? "" : "none";

    const isWeekly = type === "wochenuebersicht" || type === "wochenrueckblick";
    el.teamChips.style.display = isWeekly ? "none" : "";
    el.fixtureSelectField.style.display = isWeekly ? "none" : "";
    el.weekendField.style.display = isWeekly ? "" : "none";

    if (isWeekly) {
      if (!el.weekendDate.value) el.weekendDate.value = toISODate(nextSaturday());
      renderWeeklyOverview();
    } else {
      loadFixtures();
    }
  }

  el.typeChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) selectType(chip.dataset.type);
  });

  el.weekendDate.addEventListener("change", () => {
    if (state.postType === "wochenuebersicht" || state.postType === "wochenrueckblick") {
      renderWeeklyOverview();
    }
  });

  // ---- Wochenübersicht (geplant) / Wochenrückblick (gespielt): Sammel-Post
  // aller Teams für ein Wochenende -----------------------------------------

  async function renderWeeklyOverview() {
    if (!el.weekendDate.value) el.weekendDate.value = toISODate(nextSaturday());
    const { friday, sunday } = weekendRangeFor(el.weekendDate.value);
    const isRueckblick = state.postType === "wochenrueckblick";
    const wantStatus = isRueckblick ? "gespielt" : "geplant";

    if (!state.teams.length) state.teams = await window.Db.getTeams();
    const perTeamFixtures = await Promise.all(state.teams.map((t) => window.Db.getFixtures(t.id)));

    const games = [];
    state.teams.forEach((team, i) => {
      perTeamFixtures[i]
        .filter((f) => f.status === wantStatus && f.date >= friday && f.date <= sunday)
        .forEach((f) => {
          games.push({
            teamName: team.name,
            // Reihenfolge innerhalb eines Tages: A- bis D-Jugend (Team-
            // Reihenfolge aus getTeams(), alphabetisch sortiert), nicht die
            // Anstoßzeit.
            teamOrder: i,
            opponentName: f.opponent ? f.opponent.name : "",
            opponentLogo: f.opponent ? f.opponent.logo_url : null,
            date: f.date,
            kickoff: f.kickoff,
            isHome: f.is_home,
            ownGoals: f.own_goals,
            oppGoals: f.opp_goals,
          });
        });
    });
    games.sort((a, b) => (a.date === b.date ? a.teamOrder - b.teamOrder : a.date.localeCompare(b.date)));

    const renderGames = games.map((g) => ({
      teamName: g.teamName,
      opponentName: g.opponentName,
      opponentLogo: g.opponentLogo,
      dayLabel: weekdayLabel(g.date),
      kickoff: window.Caption.formatTime(g.kickoff),
      isHome: g.isHome,
      ownGoals: g.ownGoals,
      oppGoals: g.oppGoals,
    }));

    await window.Renderer.render(el.canvas, state.postType, { games: renderGames });
    el.captionOutput.value = isRueckblick
      ? window.Caption.buildWochenrueckblick({
          weekendLabel: formatWeekendLabel(friday, sunday),
          games: renderGames,
        })
      : window.Caption.buildWochenuebersicht({
          weekendLabel: formatWeekendLabel(friday, sunday),
          games: renderGames,
        });
  }

  async function loadFixtures() {
    if (!state.team) return;
    const all = await window.Db.getFixtures(state.team.id);
    const wantStatus = state.postType === "ankuendigung" ? "geplant" : "gespielt";
    state.fixtures = all.filter((f) => f.status === wantStatus);

    el.fixtureSelect.innerHTML = "";
    state.fixtures.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      const opponentName = f.opponent ? f.opponent.name : "(kein Gegner)";
      opt.textContent = `Spieltag ${f.matchday || "?"} · ${opponentName} · ${f.date || ""}`;
      el.fixtureSelect.appendChild(opt);
    });

    if (!state.fixtures.length) {
      state.fixture = null;
      renderPreview();
      return;
    }

    // Sinnvolle Vorauswahl: nächstes geplantes bzw. letztes gespieltes Spiel
    const defaultFixture =
      state.postType === "ankuendigung"
        ? state.fixtures[0]
        : state.fixtures[state.fixtures.length - 1];
    el.fixtureSelect.value = defaultFixture.id;
    await selectFixture(defaultFixture.id);
  }

  el.fixtureSelect.addEventListener("change", (e) => selectFixture(e.target.value));

  async function selectFixture(fixtureId) {
    state.fixture = state.fixtures.find((f) => f.id === fixtureId) || null;
    if (state.postType === "ankuendigung" && state.fixture) {
      // Zuerst das gespeicherte letzte Ergebnis vom Team verwenden (bleibt
      // erhalten, auch nachdem die zugehörige Fixture automatisch gelöscht
      // wurde) – Live-Query nur als Fallback, falls es das (noch) nicht gibt.
      state.lastFixture =
        state.team.last_result ||
        (await window.Db.getLastPlayedFixture(state.team.id, state.fixture.date));
    } else {
      state.lastFixture = null;
    }
    renderPreview();
  }

  function renderPhotoGrid() {
    el.photoGrid.innerHTML = "";
    state.photos.forEach((p) => {
      const div = document.createElement("div");
      div.className = "photo" + (p.url === state.selectedPhotoUrl ? " selected" : "");
      div.innerHTML = `<img src="${p.url}" alt="" />`;
      div.addEventListener("click", () => {
        state.selectedPhotoUrl = p.url;
        renderPhotoGrid();
        renderPreview();
      });
      el.photoGrid.appendChild(div);
    });
  }

  el.randomPhotoBtn.addEventListener("click", () => {
    if (!state.photos.length) return;
    const random = state.photos[Math.floor(Math.random() * state.photos.length)];
    state.selectedPhotoUrl = random.url;
    renderPhotoGrid();
    renderPreview();
  });

  el.noPhotoBtn.addEventListener("click", () => {
    state.selectedPhotoUrl = null;
    renderPhotoGrid();
    renderPreview();
  });

  function buildRenderData() {
    const team = state.team;
    const fixture = state.fixture;
    if (!team || !fixture) return null;
    const competition = fixture.competition || team.competition;

    if (state.postType === "ergebnis") {
      return {
        teamName: team.name,
        competition,
        ownGoals: fixture.own_goals,
        oppGoals: fixture.opp_goals,
        opponentLogo: fixture.opponent ? fixture.opponent.logo_url : null,
        // Gegnername fehlte hier bisher komplett – wird für den
        // Duell-Block (Logo + Name unten) gebraucht.
        opponentName: fixture.opponent ? fixture.opponent.name : "",
        scorers: fixture.scorers || [],
        // Bestimmt, ob im Duell-Block das eigene Team links (Heimspiel)
        // oder rechts (Auswärtsspiel) steht – Reihenfolge wie tatsächlich
        // gespielt wurde.
        isHome: fixture.is_home,
      };
    }

    return {
      teamName: team.name,
      competition,
      opponentName: fixture.opponent ? fixture.opponent.name : "",
      opponentLogo: fixture.opponent ? fixture.opponent.logo_url : null,
      dateLine: window.Caption.formatDateLong(fixture.date),
      timeLine: window.Caption.formatTime(fixture.kickoff),
      venueLine: fixture.is_home ? fixture.venue || team.default_venue : `Bei ${fixture.opponent ? fixture.opponent.name : ""}`,
      matchday: fixture.matchday,
      teamPhoto: state.selectedPhotoUrl,
      isHome: fixture.is_home,
    };
  }

  async function renderPreview() {
    const data = buildRenderData();
    if (!data) {
      const ctx = el.canvas.getContext("2d");
      ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
      el.captionOutput.value = "Kein passendes Spiel gefunden.";
      return;
    }
    await window.Renderer.render(el.canvas, state.postType, data);

    if (state.postType === "ergebnis") {
      el.captionOutput.value = window.Caption.buildErgebnis({
        teamName: state.team.name,
        fixture: state.fixture,
      });
    } else {
      el.captionOutput.value = window.Caption.buildAnkuendigung({
        teamName: state.team.name,
        fixture: state.fixture,
        lastFixture: state.lastFixture,
      });
    }
  }

  // Löschen alter/erledigter Spiele passiert jetzt zeitbasiert automatisch
  // (siehe js/db.js cleanupOldFixtures + supabase/migration_cleanup.sql) –
  // der Download lädt hier nur noch die Datei herunter, ohne zu fragen oder
  // etwas zu löschen.
  el.downloadBtn.addEventListener("click", () => {
    el.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      let filename;
      if (state.postType === "wochenuebersicht" || state.postType === "wochenrueckblick") {
        filename = `mtsv-${state.postType}-${el.weekendDate.value || "termine"}.png`;
      } else {
        const teamSlug = state.team ? state.team.slug : "team";
        const md = state.fixture ? state.fixture.matchday || "" : "";
        filename = `mtsv-${teamSlug}-${state.postType}-spieltag${md}.png`;
      }
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  });

  el.copyCaptionBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el.captionOutput.value);
      el.copyCaptionBtn.textContent = "Kopiert!";
      setTimeout(() => (el.copyCaptionBtn.textContent = "Bildtext kopieren"), 1500);
    } catch (err) {
      el.captionOutput.select();
      document.execCommand("copy");
    }
  });

  // ---- Spielplan-Import -------------------------------------------------

  async function getOrCreateOpponent(name) {
    const trimmed = name.trim();
    let existing = state.opponents.find(
      (o) => o.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const created = await window.Db.createOpponent({ name: trimmed });
    state.opponents.push(created);
    return created;
  }

  el.singleFixtureForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.team) return;
    const fd = new FormData(el.singleFixtureForm);
    const opponent = await getOrCreateOpponent(fd.get("opponent"));
    const isHome = fd.get("isHome") === "true";
    await window.Db.createFixture({
      team_id: state.team.id,
      matchday: Number(fd.get("matchday")),
      opponent_id: opponent.id,
      date: fd.get("date"),
      kickoff: fd.get("kickoff"),
      venue: fd.get("venue") || (isHome ? state.team.default_venue : opponent.name),
      is_home: isHome,
      competition: state.team.competition,
      status: "geplant",
    });
    el.singleFixtureForm.reset();
    await loadFixtures();
  });

  function parseBulkRows(text) {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const sep = line.includes("\t") ? "\t" : ",";
        return line.split(sep).map((s) => s.trim());
      });
  }

  el.bulkImportBtn.addEventListener("click", async () => {
    if (!state.team) return;
    const rows = parseBulkRows(el.bulkImportInput.value);
    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const [matchday, opponentName, date, kickoff, venue, homeAway] = row;
        const opponent = await getOrCreateOpponent(opponentName);
        const isHome = (homeAway || "H").toUpperCase().startsWith("H");
        await window.Db.createFixture({
          team_id: state.team.id,
          matchday: Number(matchday),
          opponent_id: opponent.id,
          date,
          kickoff,
          venue: venue || (isHome ? state.team.default_venue : opponentName),
          is_home: isHome,
          competition: state.team.competition,
          status: "geplant",
        });
        ok++;
      } catch (err) {
        console.error("Import-Fehler:", row, err);
        failed++;
      }
    }
    el.bulkImportResult.textContent = `${ok} Spiele importiert${failed ? `, ${failed} fehlgeschlagen` : ""}.`;
    el.bulkImportInput.value = "";
    await loadFixtures();
  });

  await loadTeams();
})();
