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
    newFixtureForm: document.getElementById("newFixtureForm"),
  };

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
    await window.Db.createOpponent({ name, logoFile });
    el.createOpponentMsg.textContent = `Gegner "${name}" gespeichert.`;
    el.newOpponentName.value = "";
    el.newOpponentLogo.value = "";
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

  await loadTeams();
})();
