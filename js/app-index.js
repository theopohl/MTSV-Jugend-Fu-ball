(async function () {
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
    fixtureSelect: document.getElementById("fixtureSelect"),
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
    loadFixtures();
  }

  el.typeChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) selectType(chip.dataset.type);
  });

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
      state.lastFixture = await window.Db.getLastPlayedFixture(state.team.id, state.fixture.date);
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
        scorers: fixture.scorers || [],
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

  el.downloadBtn.addEventListener("click", () => {
    el.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const teamSlug = state.team ? state.team.slug : "team";
      const md = state.fixture ? state.fixture.matchday || "" : "";
      a.href = url;
      a.download = `mtsv-${teamSlug}-${state.postType}-spieltag${md}.png`;
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
