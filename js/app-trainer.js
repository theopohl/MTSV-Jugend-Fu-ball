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
    newOpponentName: document.getElementById("newOpponentName"),
    newOpponentLogo: document.getElementById("newOpponentLogo"),
    createOpponentBtn: document.getElementById("createOpponentBtn"),
    createOpponentMsg: document.getElementById("createOpponentMsg"),
    opponentChipList: document.getElementById("opponentChipList"),
    refreshOpponentsBtn: document.getElementById("refreshOpponentsBtn"),
    opponentLogoPreviewField: document.getElementById("opponentLogoPreviewField"),
    opponentLogoPreview: document.getElementById("opponentLogoPreview"),
    opponentLogoPreviewEmpty: document.getElementById("opponentLogoPreviewEmpty"),
    opponentNamesList: document.getElementById("opponentNamesList"),
    opponentLogoLabel: document.getElementById("opponentLogoLabel"),
    newFixtureForm: document.getElementById("newFixtureForm"),
  };

  // selectedOpponentId === null bedeutet "+ neuer Gegner" ist aktiv.
  state.selectedOpponentId = null;

  let opponentsCache = null;

  async function getOrCreateOpponent(name) {
    if (!opponentsCache) opponentsCache = await window.Db.getOpponents();
    const trimmed = name.trim();
    let existing = opponentsCache.find(
      (o) => o.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const created = await window.Db.createOpponent({ name: trimmed });
    opponentsCache.push(created);
    return created;
  }

  // ---- Gegner-Verwaltung: Liste, Auswahl per Klick, Logo ersetzen --------
  //
  // Vorher fehlte diese komplette Verdrahtung: die Gegner-Kästchen in der
  // Seite reagierten auf keinen Klick, und "Gegner speichern" hat IMMER
  // einen neuen Gegner-Datensatz angelegt statt einen bestehenden zu
  // aktualisieren. Dadurch landete ein neu hochgeladenes Logo an einem
  // zweiten, ungenutzten Gegner-Eintrag, während die Spiele im Spielplan
  // weiterhin auf den alten (logo-losen) Eintrag zeigten – deshalb tauchte
  // das Logo nie auf dem fertigen Post auf.

  async function refreshOpponentsCache() {
    opponentsCache = await window.Db.getOpponents();
    return opponentsCache;
  }

  function renderOpponentDatalist() {
    if (!el.opponentNamesList) return;
    el.opponentNamesList.innerHTML = "";
    (opponentsCache || []).forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.name;
      el.opponentNamesList.appendChild(opt);
    });
  }

  function renderOpponentChips() {
    if (!el.opponentChipList) return;
    el.opponentChipList.innerHTML = "";

    const newChip = document.createElement("div");
    newChip.className = "chip" + (state.selectedOpponentId === null ? " active" : "");
    newChip.textContent = "+ neuer Gegner";
    newChip.addEventListener("click", () => selectOpponent(null));
    el.opponentChipList.appendChild(newChip);

    (opponentsCache || []).forEach((o) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (state.selectedOpponentId === o.id ? " active" : "");
      chip.textContent = o.name;
      chip.addEventListener("click", () => selectOpponent(o.id));
      el.opponentChipList.appendChild(chip);
    });
  }

  function selectOpponent(opponentId) {
    state.selectedOpponentId = opponentId;
    const opponent = (opponentsCache || []).find((o) => o.id === opponentId) || null;

    if (opponent) {
      // Vorhandenen Gegner ausgewählt: Name-Feld zeigt ihn an und ist
      // gesperrt (damit man aus Versehen keinen neuen, ähnlich benannten
      // Gegner erzeugt), Logo-Upload ersetzt sein Logo.
      el.newOpponentName.value = opponent.name;
      el.newOpponentName.disabled = true;
      if (el.opponentLogoLabel) el.opponentLogoLabel.textContent = "Logo ersetzen (optional)";
      if (el.opponentLogoPreviewField) el.opponentLogoPreviewField.style.display = "";
      if (opponent.logo_url) {
        el.opponentLogoPreview.src = opponent.logo_url;
        el.opponentLogoPreview.style.display = "";
        if (el.opponentLogoPreviewEmpty) el.opponentLogoPreviewEmpty.style.display = "none";
      } else {
        el.opponentLogoPreview.style.display = "none";
        if (el.opponentLogoPreviewEmpty) el.opponentLogoPreviewEmpty.style.display = "";
      }
    } else {
      // "+ neuer Gegner": Felder leeren und freigeben.
      el.newOpponentName.value = "";
      el.newOpponentName.disabled = false;
      if (el.opponentLogoLabel) el.opponentLogoLabel.textContent = "Logo (optional)";
      if (el.opponentLogoPreviewField) el.opponentLogoPreviewField.style.display = "none";
    }
    el.newOpponentLogo.value = "";
    el.createOpponentMsg.textContent = "";
    renderOpponentChips();
  }

  async function initOpponentSection() {
    await refreshOpponentsCache();
    renderOpponentDatalist();
    renderOpponentChips();
    selectOpponent(null);
  }

  if (el.refreshOpponentsBtn) {
    el.refreshOpponentsBtn.addEventListener("click", async () => {
      await refreshOpponentsCache();
      renderOpponentDatalist();
      renderOpponentChips();
    });
  }

  // Tippt man einen Namen, der zu einem vorhandenen Gegner passt, wird der
  // automatisch als "ausgewählt" erkannt (wie im Hinweistext beschrieben).
  el.newOpponentName.addEventListener("input", () => {
    if (el.newOpponentName.disabled) return;
    const typed = el.newOpponentName.value.trim().toLowerCase();
    const match = (opponentsCache || []).find((o) => o.name.toLowerCase() === typed);
    state.selectedOpponentId = match ? match.id : null;
    renderOpponentChips();
    if (match) {
      if (el.opponentLogoLabel) el.opponentLogoLabel.textContent = "Logo ersetzen (optional)";
      if (el.opponentLogoPreviewField) el.opponentLogoPreviewField.style.display = "";
      if (match.logo_url) {
        el.opponentLogoPreview.src = match.logo_url;
        el.opponentLogoPreview.style.display = "";
        if (el.opponentLogoPreviewEmpty) el.opponentLogoPreviewEmpty.style.display = "none";
      } else {
        el.opponentLogoPreview.style.display = "none";
        if (el.opponentLogoPreviewEmpty) el.opponentLogoPreviewEmpty.style.display = "";
      }
    } else if (el.opponentLogoPreviewField) {
      el.opponentLogoPreviewField.style.display = "none";
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
      <strong>Spieltag ${f.matchday || "?"} · ${opponentName}</strong><br/>
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

  // Torschützen-Zeilen: Name, Minute UND jetzt zusätzlich eine Auswahl, für
  // welches Team getroffen wurde. Ohne dieses Feld konnte die Grafik nicht
  // wissen, wer für wen getroffen hat – der Post zeigte Torschützen dann an
  // der falschen Mannschaft an. "own" = eigenes Team, "gegner" = Gegner.
  function renderScorerRows() {
    const opponentName = state.nextFixture && state.nextFixture.opponent
      ? state.nextFixture.opponent.name
      : "Gegner";

    el.scorerRows.innerHTML = "";
    state.scorers.forEach((s, i) => {
      const team = s.team || "own";
      const row = document.createElement("div");
      row.className = "scorer-row";
      row.innerHTML = `
        <select data-idx="${i}" data-field="team" style="max-width:150px;">
          <option value="own" ${team === "own" ? "selected" : ""}>${state.team ? state.team.name : "Eigenes Team"}</option>
          <option value="gegner" ${team === "gegner" ? "selected" : ""}>${opponentName}</option>
        </select>
        <input type="text" placeholder="Name oder Nr." data-idx="${i}" data-field="name" value="${s.name || ""}" />
        <input type="number" placeholder="Minute" min="1" max="130" style="max-width:90px;" data-idx="${i}" data-field="minute" value="${s.minute || ""}" />
        <button type="button" data-remove="${i}">✕</button>
      `;
      el.scorerRows.appendChild(row);
    });

    el.scorerRows.querySelectorAll("input, select").forEach((input) => {
      const eventName = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventName, (e) => {
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
    // Neue Zeile bekommt standardmäßig "eigenes Team" als Vorauswahl.
    state.scorers.push({ name: "", minute: "", team: "own" });
    renderScorerRows();
  });

  el.saveResultBtn.addEventListener("click", async () => {
    if (!state.nextFixture) return;
    el.saveResultBtn.disabled = true;
    try {
      const scorers = state.scorers
        .filter((s) => s.name && s.minute)
        .map((s) => ({ ...s, team: s.team || "own" }));
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
          <strong>Spieltag ${f.matchday || "?"} · ${opponentName}</strong>
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
    const name = el.newOpponentName.value.trim();
    if (!name) return;
    const logoFile = el.newOpponentLogo.files[0] || null;

    el.createOpponentBtn.disabled = true;
    try {
      if (state.selectedOpponentId) {
        // Vorhandenen Gegner aktualisieren statt einen zweiten anzulegen.
        if (logoFile) {
          await window.Db.updateOpponentLogo(state.selectedOpponentId, name, logoFile);
          el.createOpponentMsg.textContent = `Logo für "${name}" aktualisiert.`;
        } else {
          el.createOpponentMsg.textContent = `"${name}" ist bereits vorhanden – kein neues Logo ausgewählt.`;
        }
      } else {
        const existing = (opponentsCache || []).find(
          (o) => o.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          // Sicherheitsnetz: Name entspricht doch einem vorhandenen Gegner.
          if (logoFile) {
            await window.Db.updateOpponentLogo(existing.id, name, logoFile);
            el.createOpponentMsg.textContent = `Logo für "${name}" aktualisiert.`;
          } else {
            el.createOpponentMsg.textContent = `"${name}" ist bereits vorhanden.`;
          }
        } else {
          await window.Db.createOpponent({ name, logoFile });
          el.createOpponentMsg.textContent = `Gegner "${name}" angelegt.`;
        }
      }
      await refreshOpponentsCache();
      renderOpponentDatalist();
      selectOpponent(null);
    } catch (err) {
      console.error(err);
      el.createOpponentMsg.textContent = "Fehler beim Speichern: " + err.message;
    } finally {
      el.createOpponentBtn.disabled = false;
    }
  });

  el.newFixtureForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.team) return;
    const fd = new FormData(el.newFixtureForm);
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
    el.newFixtureForm.reset();
    await refreshUpcoming();
    await refreshNextMatch();
  });

  await initOpponentSection();
  await loadTeams();
})();
