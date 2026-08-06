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

  const NEW_OPPONENT_VALUE = "__new__";
  let selectedFixtureOpponentId = NEW_OPPONENT_VALUE;

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
    singleFixtureType: document.getElementById("singleFixtureType"),
    singleFixtureMatchdayField: document.getElementById("singleFixtureMatchdayField"),
    singleFixtureOpponentChips: document.getElementById("singleFixtureOpponentChips"),
    singleFixtureOpponentInput: document.getElementById("singleFixtureOpponentInput"),
    bulkImportInput: document.getElementById("bulkImportInput"),
    bulkImportBtn: document.getElementById("bulkImportBtn"),
    bulkImportResult: document.getElementById("bulkImportResult"),
    quickPostList: document.getElementById("quickPostList"),
    quickPostStatus: document.getElementById("quickPostStatus"),
    quickPostFallbackWrap: document.getElementById("quickPostFallbackWrap"),
    quickPostFallbackText: document.getElementById("quickPostFallbackText"),
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
    renderQuickPostButtons();
  }

  // ---- Schnell-Post -------------------------------------------------------

  function renderQuickPostButtons() {
    el.quickPostList.innerHTML = "";
    state.teams.forEach((team) => {
      const row = document.createElement("div");
      row.className = "quick-post-row";

      const label = document.createElement("div");
      label.className = "quick-post-team";
      label.textContent = team.name;
      row.appendChild(label);

      const announceBtn = document.createElement("button");
      announceBtn.type = "button";
      announceBtn.textContent = "Ankündigung – nächstes Spiel";
      announceBtn.addEventListener("click", () =>
        runQuickPost(team, "ankuendigung", announceBtn)
      );
      row.appendChild(announceBtn);

      const resultBtn = document.createElement("button");
      resultBtn.type = "button";
      resultBtn.className = "secondary";
      resultBtn.textContent = "Ergebnis – letztes Spiel";
      resultBtn.addEventListener("click", () =>
        runQuickPost(team, "ergebnis", resultBtn)
      );
      row.appendChild(resultBtn);

      el.quickPostList.appendChild(row);
    });
  }

  function setQuickPostStatus(message, kind) {
    el.quickPostStatus.textContent = message;
    el.quickPostStatus.className = "quick-post-status" + (kind ? ` ${kind}` : "");
  }

  function hideQuickPostFallback() {
    el.quickPostFallbackWrap.style.display = "none";
    el.quickPostFallbackText.value = "";
  }

  function showQuickPostFallback(text) {
    el.quickPostFallbackText.value = text;
    el.quickPostFallbackWrap.style.display = "";
    el.quickPostFallbackText.focus();
    el.quickPostFallbackText.select();
  }

  async function runQuickPost(team, postType, triggerBtn) {
    const typeLabel = postType === "ankuendigung" ? "Ankündigung" : "Ergebnis";
    const originalLabel = triggerBtn.textContent;
    const allButtons = [...el.quickPostList.querySelectorAll("button")];

    setQuickPostStatus("", null);
    hideQuickPostFallback();
    allButtons.forEach((b) => (b.disabled = true));
    triggerBtn.textContent = "Erstelle …";

    try {
      const fixture =
        postType === "ankuendigung"
          ? await window.Db.getNextFixture(team.id)
          : await window.Db.getLastPlayedFixture(team.id);

      if (!fixture) {
        setQuickPostStatus(
          postType === "ankuendigung"
            ? `Kein geplantes Spiel für ${team.name}.`
            : `Kein gespieltes Spiel für ${team.name}.`,
          "error"
        );
        return;
      }

      let lastFixture = null;
      let photoUrl = null;
      if (postType === "ankuendigung") {
        lastFixture = await window.Db.getLastPlayedFixture(team.id, fixture.date);
        const photos = await window.Db.getTeamPhotos(team.id);
        if (photos.length) {
          photoUrl = photos[Math.floor(Math.random() * photos.length)].url;
        }
      }

      const data = buildRenderData(team, postType, fixture, { teamPhoto: photoUrl });
      const canvas = window.Renderer.createCanvas();
      await window.Renderer.render(canvas, postType, data);

      const caption =
        postType === "ergebnis"
          ? window.Caption.buildErgebnis({ teamName: team.name, fixture })
          : window.Caption.buildAnkuendigung({ teamName: team.name, fixture, lastFixture });

      await downloadCanvasPng(canvas, team, postType, fixture);
      const copied = await copyTextToClipboard(caption);

      const opponentName = fixture.opponent ? fixture.opponent.name : "unbekannter Gegner";
      const copyNote = copied ? "Text kopiert" : "Text unten zum Kopieren bereit";
      setQuickPostStatus(
        `${typeLabel} ${team.name} fertig – Bild heruntergeladen, ${copyNote} (${opponentName}, ${fixture.date}).`,
        "success"
      );

      if (!copied) {
        showQuickPostFallback(caption);
      }
    } catch (err) {
      console.error("Schnell-Post-Fehler:", err);
      setQuickPostStatus(`Fehler beim Erstellen für ${team.name} – bitte erneut versuchen.`, "error");
    } finally {
      allButtons.forEach((b) => (b.disabled = false));
      triggerBtn.textContent = originalLabel;
    }
  }

  async function selectTeam(team) {
    state.team = team;
    [...el.teamChips.children].forEach((c) =>
      c.classList.toggle("active", c.dataset.teamId === team.id)
    );
    state.opponents = await window.Db.getOpponents();
    state.photos = await window.Db.getTeamPhotos(team.id);
    renderPhotoGrid();
    renderFixtureOpponentChips();
    await loadFixtures();
  }

  // ---- Gegner-Auswahl im "Einzelnes Spiel"-Formular -----------------------

  function renderFixtureOpponentChips() {
    el.singleFixtureOpponentChips.innerHTML = "";

    const newChip = document.createElement("div");
    newChip.className = "chip" + (selectedFixtureOpponentId === NEW_OPPONENT_VALUE ? " active" : "");
    newChip.textContent = "+ neuer Gegner";
    newChip.addEventListener("click", () => selectFixtureOpponent(NEW_OPPONENT_VALUE));
    el.singleFixtureOpponentChips.appendChild(newChip);

    state.opponents.forEach((o) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (o.id === selectedFixtureOpponentId ? " active" : "");
      chip.textContent = o.name;
      chip.addEventListener("click", () => selectFixtureOpponent(o.id));
      el.singleFixtureOpponentChips.appendChild(chip);
    });
  }

  function selectFixtureOpponent(id) {
    selectedFixtureOpponentId = id;
    renderFixtureOpponentChips();
    const isNew = id === NEW_OPPONENT_VALUE;
    el.singleFixtureOpponentInput.style.display = isNew ? "" : "none";
    el.singleFixtureOpponentInput.required = isNew;
    if (isNew) el.singleFixtureOpponentInput.value = "";
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
      opt.textContent = `${window.Caption.matchLine(f)} · ${opponentName} · ${f.date || ""}`;
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

  function buildRenderData(team, postType, fixture, extra = {}) {
    if (!team || !fixture) return null;
    const competition = fixture.competition || team.competition;

    if (postType === "ergebnis") {
      return {
        teamName: team.name,
        competition,
        type: fixture.type,
        opponentName: fixture.opponent ? fixture.opponent.name : "",
        ownGoals: fixture.own_goals,
        oppGoals: fixture.opp_goals,
        opponentLogo: fixture.opponent ? fixture.opponent.logo_url : null,
        scorers: fixture.scorers || [],
      };
    }

    return {
      teamName: team.name,
      competition,
      type: fixture.type,
      opponentName: fixture.opponent ? fixture.opponent.name : "",
      opponentLogo: fixture.opponent ? fixture.opponent.logo_url : null,
      date: fixture.date,
      kickoff: fixture.kickoff,
      venueLine: fixture.is_home ? fixture.venue || team.default_venue : `Bei ${fixture.opponent ? fixture.opponent.name : ""}`,
      matchday: fixture.matchday,
      teamPhoto: "teamPhoto" in extra ? extra.teamPhoto : state.selectedPhotoUrl,
    };
  }

  function downloadCanvasPng(canvas, team, postType, fixture) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const teamSlug = team ? team.slug : "team";
        const md = fixture ? fixture.matchday || "" : "";
        a.href = url;
        a.download = `mtsv-${teamSlug}-${postType}-spieltag${md}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, "image/png");
    });
  }

  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function renderPreview() {
    const data = buildRenderData(state.team, state.postType, state.fixture);
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
    downloadCanvasPng(el.canvas, state.team, state.postType, state.fixture);
  });

  el.copyCaptionBtn.addEventListener("click", async () => {
    const copied = await copyTextToClipboard(el.captionOutput.value);
    if (!copied) {
      el.captionOutput.select();
      document.execCommand("copy");
    }
    el.copyCaptionBtn.textContent = "Kopiert!";
    setTimeout(() => (el.copyCaptionBtn.textContent = "Bildtext kopieren"), 1500);
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

  function updateSingleFixtureTypeMode() {
    const isLiga = el.singleFixtureType.value === "liga";
    el.singleFixtureMatchdayField.style.display = isLiga ? "" : "none";
    el.singleFixtureMatchdayField.querySelector("input").required = isLiga;
  }
  el.singleFixtureType.addEventListener("change", updateSingleFixtureTypeMode);
  updateSingleFixtureTypeMode();
  selectFixtureOpponent(NEW_OPPONENT_VALUE);

  el.singleFixtureForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.team) return;
    const fd = new FormData(el.singleFixtureForm);
    const opponent =
      selectedFixtureOpponentId !== NEW_OPPONENT_VALUE
        ? state.opponents.find((o) => o.id === selectedFixtureOpponentId)
        : await getOrCreateOpponent(fd.get("opponent"));
    const isHome = fd.get("isHome") === "true";
    const type = fd.get("type") || "liga";
    await window.Db.createFixture({
      team_id: state.team.id,
      type,
      matchday: type === "liga" && fd.get("matchday") ? Number(fd.get("matchday")) : null,
      opponent_id: opponent.id,
      date: fd.get("date"),
      kickoff: fd.get("kickoff"),
      venue: fd.get("venue") || (isHome ? state.team.default_venue : opponent.name),
      is_home: isHome,
      competition: type === "liga" ? state.team.competition : null,
      status: "geplant",
    });
    el.singleFixtureForm.reset();
    updateSingleFixtureTypeMode();
    selectFixtureOpponent(NEW_OPPONENT_VALUE);
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

  const BULK_TYPE_MAP = { liga: "liga", testspiel: "testspiel", pokal: "pokal" };

  function parseBulkType(raw) {
    const key = (raw || "").trim().toLowerCase();
    return BULK_TYPE_MAP[key] || "liga";
  }

  el.bulkImportBtn.addEventListener("click", async () => {
    if (!state.team) return;
    const rows = parseBulkRows(el.bulkImportInput.value);
    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const [matchday, opponentName, date, kickoff, venue, homeAway, typeRaw] = row;
        const type = parseBulkType(typeRaw);
        const opponent = await getOrCreateOpponent(opponentName);
        const isHome = (homeAway || "H").toUpperCase().startsWith("H");
        await window.Db.createFixture({
          team_id: state.team.id,
          type,
          matchday: type === "liga" && matchday ? Number(matchday) : null,
          opponent_id: opponent.id,
          date,
          kickoff,
          venue: venue || (isHome ? state.team.default_venue : opponentName),
          is_home: isHome,
          competition: type === "liga" ? state.team.competition : null,
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
    renderFixtureOpponentChips();
    await loadFixtures();
  });

  await loadTeams();
})();
