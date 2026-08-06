(async function () {
  const state = {
    teams: [],
    team: null,
    nextFixture: null,
    upcoming: [],
    photos: [],
    scorers: [],
  };

  const el = {
    teamChips: document.getElementById("teamChips"),
    nextMatchInfo: document.getElementById("nextMatchInfo"),
    resultCard: document.getElementById("resultCard"),
    ownGoals: document.getElementById("ownGoals"),
    oppGoals: document.getElementById("oppGoals"),
    scorerRows: document.getElementById("scorerRows"),
    addScorerBtn: document.getElementById("addScorerBtn"),
    resultNote: document.getElementById("resultNote"),
    saveResultBtn: document.getElementById("saveResultBtn"),
    saveResultMsg: document.getElementById("saveResultMsg"),
    upcomingList: document.getElementById("upcomingList"),
    photoUpload: document.getElementById("photoUpload"),
    teamPhotoGrid: document.getElementById("teamPhotoGrid"),
    opponentChipList: document.getElementById("opponentChipList"),
    refreshOpponentsBtn: document.getElementById("refreshOpponentsBtn"),
    opponentNameField: document.getElementById("opponentNameField"),
    opponentLogoLabel: document.getElementById("opponentLogoLabel"),
    opponentLogoPreviewField: document.getElementById("opponentLogoPreviewField"),
    opponentLogoPreview: document.getElementById("opponentLogoPreview"),
    opponentLogoPreviewEmpty: document.getElementById("opponentLogoPreviewEmpty"),
    newOpponentName: document.getElementById("newOpponentName"),
    newOpponentLogo: document.getElementById("newOpponentLogo"),
    createOpponentBtn: document.getElementById("createOpponentBtn"),
    createOpponentMsg: document.getElementById("createOpponentMsg"),
    newFixtureForm: document.getElementById("newFixtureForm"),
    newFixtureType: document.getElementById("newFixtureType"),
    newFixtureMatchdayField: document.getElementById("newFixtureMatchdayField"),
    newFixtureOpponentChips: document.getElementById("newFixtureOpponentChips"),
    newFixtureOpponentInput: document.getElementById("newFixtureOpponentInput"),
  };

  const NEW_OPPONENT_VALUE = "__new__";
  let opponentsCache = null;
  let selectedOpponentId = NEW_OPPONENT_VALUE;
  let selectedFixtureOpponentId = NEW_OPPONENT_VALUE;

  async function ensureOpponentsCache() {
    if (!opponentsCache) opponentsCache = await window.Db.getOpponents();
    return opponentsCache;
  }

  async function getOrCreateOpponent(name) {
    await ensureOpponentsCache();
    const trimmed = name.trim();
    let existing = opponentsCache.find(
      (o) => o.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const created = await window.Db.createOpponent({ name: trimmed });
    opponentsCache.push(created);
    return created;
  }

  // ---- Gegner anlegen / Logo pflegen ------------------------------------

  async function loadOpponentSelect(selectId) {
    opponentsCache = await window.Db.getOpponents();
    selectedOpponentId =
      selectId && opponentsCache.some((o) => o.id === selectId) ? selectId : NEW_OPPONENT_VALUE;
    renderOpponentChips();
    updateOpponentFormMode();
    renderFixtureOpponentChips();
  }

  // ---- Gegner-Auswahl im "Neues Spiel anlegen"-Formular ------------------

  function renderFixtureOpponentChips() {
    if (!el.newFixtureOpponentChips) return;
    el.newFixtureOpponentChips.innerHTML = "";

    const newChip = document.createElement("div");
    newChip.className = "chip" + (selectedFixtureOpponentId === NEW_OPPONENT_VALUE ? " active" : "");
    newChip.textContent = "+ neuer Gegner";
    newChip.addEventListener("click", () => selectFixtureOpponent(NEW_OPPONENT_VALUE));
    el.newFixtureOpponentChips.appendChild(newChip);

    (opponentsCache || []).forEach((o) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (o.id === selectedFixtureOpponentId ? " active" : "");
      chip.textContent = o.name;
      chip.addEventListener("click", () => selectFixtureOpponent(o.id));
      el.newFixtureOpponentChips.appendChild(chip);
    });
  }

  function selectFixtureOpponent(id) {
    selectedFixtureOpponentId = id;
    renderFixtureOpponentChips();
    const isNew = id === NEW_OPPONENT_VALUE;
    el.newFixtureOpponentInput.style.display = isNew ? "" : "none";
    el.newFixtureOpponentInput.required = isNew;
    if (isNew) el.newFixtureOpponentInput.value = "";
  }

  function renderOpponentChips() {
    el.opponentChipList.innerHTML = "";

    const newChip = document.createElement("div");
    newChip.className = "chip" + (selectedOpponentId === NEW_OPPONENT_VALUE ? " active" : "");
    newChip.textContent = "+ neuer Gegner";
    newChip.addEventListener("click", () => selectOpponent(NEW_OPPONENT_VALUE));
    el.opponentChipList.appendChild(newChip);

    opponentsCache.forEach((o) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (o.id === selectedOpponentId ? " active" : "");
      chip.textContent = o.name;
      chip.addEventListener("click", () => selectOpponent(o.id));
      el.opponentChipList.appendChild(chip);
    });
  }

  function selectOpponent(id) {
    selectedOpponentId = id;
    renderOpponentChips();
    updateOpponentFormMode();
  }

  function updateOpponentFormMode() {
    const isNew = selectedOpponentId === NEW_OPPONENT_VALUE;
    el.opponentNameField.style.display = isNew ? "" : "none";
    el.opponentLogoLabel.textContent = isNew ? "Logo (optional)" : "Logo hinzufügen/ersetzen (optional)";
    el.createOpponentBtn.textContent = isNew ? "Gegner speichern" : "Logo speichern";
    el.newOpponentName.value = "";
    el.newOpponentLogo.value = "";
    el.createOpponentMsg.textContent = "";

    el.opponentLogoPreviewField.style.display = isNew ? "none" : "";
    if (!isNew) {
      const opponent = (opponentsCache || []).find((o) => o.id === selectedOpponentId);
      const logoUrl = opponent ? opponent.logo_url : null;
      el.opponentLogoPreview.src = logoUrl || "";
      el.opponentLogoPreview.style.display = logoUrl ? "" : "none";
      el.opponentLogoPreviewEmpty.style.display = logoUrl ? "none" : "";
    }
  }

  el.refreshOpponentsBtn.addEventListener("click", async () => {
    el.refreshOpponentsBtn.disabled = true;
    try {
      const current = selectedOpponentId;
      await loadOpponentSelect(current !== NEW_OPPONENT_VALUE ? current : null);
    } finally {
      el.refreshOpponentsBtn.disabled = false;
    }
  });

  function paramTeamSlug() {
    return new URLSearchParams(location.search).get("team");
  }

  async function loadTeams() {
    state.teams = await window.Db.getTeams();
    const presetSlug = paramTeamSlug();
    el.teamChips.innerHTML = "";
    state.teams.forEach((team) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = team.name;
      chip.dataset.teamId = team.id;
      chip.addEventListener("click", () => selectTeam(team));
      el.teamChips.appendChild(chip);
    });

    const preset = presetSlug && state.teams.find((t) => t.slug === presetSlug);
    await selectTeam(preset || state.teams[0]);
  }

  async function selectTeam(team) {
    state.team = team;
    [...el.teamChips.children].forEach((c) =>
      c.classList.toggle("active", c.dataset.teamId === team.id)
    );
    await refreshNextMatch();
    await refreshUpcoming();
    await refreshPhotos();
    // Gegner sind mannschaftsübergreifend – Liste bei jedem Wechsel frisch halten.
    await loadOpponentSelect(selectedOpponentId !== NEW_OPPONENT_VALUE ? selectedOpponentId : null);
  }

  async function refreshNextMatch() {
    state.nextFixture = await window.Db.getNextFixture(state.team.id);
    if (!state.nextFixture) {
      el.nextMatchInfo.textContent = "Kein geplantes Spiel gefunden.";
      el.resultCard.style.display = "none";
      return;
    }
    const f = state.nextFixture;
    const opponentName = f.opponent ? f.opponent.name : "(kein Gegner)";
    const ort = f.is_home ? f.venue || state.team.default_venue : `Auswärts bei ${opponentName}`;
    el.nextMatchInfo.innerHTML = `
      <strong>${window.Caption.matchLine(f)} · ${opponentName}</strong><br/>
      ${window.Caption.formatDateLong(f.date)} · ${window.Caption.formatTime(f.kickoff)} Uhr<br/>
      ${ort}
    `;
    el.resultCard.style.display = "";
    resetScorerRows();
    el.ownGoals.value = 0;
    el.oppGoals.value = 0;
    el.resultNote.value = "";
  }

  function resetScorerRows() {
    state.scorers = [];
    renderScorerRows();
  }

  function renderScorerRows() {
    el.scorerRows.innerHTML = "";
    state.scorers.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "scorer-row";
      row.innerHTML = `
        <input type="text" placeholder="Name oder Nr." data-idx="${i}" data-field="name" value="${s.name || ""}" />
        <input type="number" placeholder="Minute" min="1" max="130" style="max-width:90px;" data-idx="${i}" data-field="minute" value="${s.minute || ""}" />
        <button type="button" data-remove="${i}">✕</button>
      `;
      el.scorerRows.appendChild(row);
    });

    el.scorerRows.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const field = e.target.dataset.field;
        state.scorers[idx][field] = field === "minute" ? Number(e.target.value) : e.target.value;
      });
    });
    el.scorerRows.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        state.scorers.splice(Number(e.target.dataset.remove), 1);
        renderScorerRows();
      });
    });
  }

  el.addScorerBtn.addEventListener("click", () => {
    state.scorers.push({ name: "", minute: "" });
    renderScorerRows();
  });

  el.saveResultBtn.addEventListener("click", async () => {
    if (!state.nextFixture) return;
    el.saveResultBtn.disabled = true;
    try {
      const scorers = state.scorers.filter((s) => s.name && s.minute);
      await window.Db.saveResult(state.nextFixture.id, {
        own_goals: Number(el.ownGoals.value),
        opp_goals: Number(el.oppGoals.value),
        scorers,
        note: el.resultNote.value,
      });
      el.saveResultMsg.textContent = "Ergebnis gespeichert. Der Post kann jetzt im Generator erzeugt werden.";
      await refreshNextMatch();
      await refreshUpcoming();
    } catch (err) {
      console.error(err);
      el.saveResultMsg.textContent = "Fehler beim Speichern: " + err.message;
    } finally {
      el.saveResultBtn.disabled = false;
    }
  });

  async function refreshUpcoming() {
    const all = await window.Db.getFixtures(state.team.id);
    state.upcoming = all.filter((f) => f.status === "geplant");
    el.upcomingList.innerHTML = "";
    if (!state.upcoming.length) {
      el.upcomingList.innerHTML = '<p class="hint">Keine kommenden Spiele.</p>';
      return;
    }
    state.upcoming.forEach((f) => {
      const item = document.createElement("div");
      item.className = "fixture-item";
      const opponentName = f.opponent ? f.opponent.name : "(kein Gegner)";
      item.innerHTML = `
        <div>
          <strong>${window.Caption.matchLine(f)} · ${opponentName}</strong>
          <div class="meta">${f.date || ""} ${f.kickoff || ""} · ${f.is_home ? "Heim" : "Auswärts"}</div>
        </div>
        <div>
          <span class="status-badge geplant">geplant</span>
          <button type="button" class="danger" data-del="${f.id}">Löschen</button>
        </div>
      `;
      el.upcomingList.appendChild(item);
    });
    el.upcomingList.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        if (!confirm("Dieses Spiel wirklich löschen?")) return;
        await window.sb.from("fixtures").delete().eq("id", e.target.dataset.del);
        await refreshUpcoming();
        await refreshNextMatch();
      });
    });
  }

  async function refreshPhotos() {
    state.photos = await window.Db.getTeamPhotos(state.team.id);
    el.teamPhotoGrid.innerHTML = "";
    state.photos.forEach((p) => {
      const div = document.createElement("div");
      div.className = "photo";
      div.innerHTML = `<img src="${p.url}" alt="" />`;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.className = "danger";
      del.style.cssText = "position:absolute;top:4px;right:4px;padding:2px 8px;";
      del.addEventListener("click", async (e) => {
        e.stopPropagation();
        await window.Db.deleteTeamPhoto(p.id);
        await refreshPhotos();
      });
      div.appendChild(del);
      el.teamPhotoGrid.appendChild(div);
    });
  }

  el.photoUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !state.team) return;
    await window.Db.uploadTeamPhoto(state.team.id, file);
    e.target.value = "";
    await refreshPhotos();
  });

  el.createOpponentBtn.addEventListener("click", async () => {
    el.createOpponentBtn.disabled = true;
    try {
      if (selectedOpponentId === NEW_OPPONENT_VALUE) {
        const name = el.newOpponentName.value.trim();
        if (!name) {
          el.createOpponentMsg.textContent = "Bitte einen Namen eingeben.";
          return;
        }
        await ensureOpponentsCache();
        const duplicate = opponentsCache.find(
          (o) => o.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
          await loadOpponentSelect(duplicate.id);
          el.createOpponentMsg.textContent = `Gegner "${name}" existiert bereits – bitte aus der Liste auswählen.`;
          return;
        }
        const logoFile = el.newOpponentLogo.files[0] || null;
        const created = await window.Db.createOpponent({ name, logoFile });
        await loadOpponentSelect(created.id);
        el.createOpponentMsg.textContent = `Gegner "${name}" gespeichert.`;
      } else {
        const opponent = opponentsCache.find((o) => o.id === selectedOpponentId);
        const logoFile = el.newOpponentLogo.files[0] || null;
        if (!logoFile) {
          el.createOpponentMsg.textContent = "Bitte zuerst ein Logo auswählen.";
          return;
        }
        await window.Db.updateOpponentLogo(opponent.id, opponent.name, logoFile);
        await loadOpponentSelect(opponent.id);
        el.createOpponentMsg.textContent = `Logo für "${opponent.name}" aktualisiert.`;
      }
    } catch (err) {
      console.error(err);
      el.createOpponentMsg.textContent = "Fehler: " + err.message;
    } finally {
      el.createOpponentBtn.disabled = false;
    }
  });

  function updateNewFixtureTypeMode() {
    const isLiga = el.newFixtureType.value === "liga";
    el.newFixtureMatchdayField.style.display = isLiga ? "" : "none";
    el.newFixtureMatchdayField.querySelector("input").required = isLiga;
  }
  el.newFixtureType.addEventListener("change", updateNewFixtureTypeMode);
  updateNewFixtureTypeMode();
  selectFixtureOpponent(NEW_OPPONENT_VALUE);

  el.newFixtureForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.team) return;
    const fd = new FormData(el.newFixtureForm);
    const opponent =
      selectedFixtureOpponentId !== NEW_OPPONENT_VALUE
        ? opponentsCache.find((o) => o.id === selectedFixtureOpponentId)
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
    el.newFixtureForm.reset();
    updateNewFixtureTypeMode();
    selectFixtureOpponent(NEW_OPPONENT_VALUE);
    await refreshUpcoming();
    await refreshNextMatch();
    // Falls dabei per Freitext ein neuer Gegner entstanden ist: Liste aktuell
    // halten und den (neu angelegten oder wiederverwendeten) Gegner im
    // "Gegner anlegen"-Bereich vorauswählen.
    await loadOpponentSelect(opponent.id);
  });

  await loadTeams();
})();
