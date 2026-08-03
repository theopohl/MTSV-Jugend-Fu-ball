// Erzeugt die festen deutschen Bildtext-Vorlagen (kein KI-Aufruf).

window.Caption = (function () {
  const WEEKDAYS = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];
  const MONTHS = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function weekdayShort(dateStr) {
    const d = parseDate(dateStr);
    return d ? WEEKDAYS[d.getDay()] : "";
  }

  function formatDateShort(dateStr) {
    // "Samstag, 25.04."
    const d = parseDate(dateStr);
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${WEEKDAYS[d.getDay()]}, ${dd}.${mm}.`;
  }

  function formatDateLong(dateStr) {
    // "Samstag · 25. April"
    const d = parseDate(dateStr);
    if (!d) return "";
    return `${WEEKDAYS[d.getDay()]} · ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  }

  function formatTime(timeStr) {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  }

  function resultKind(own, opp) {
    if (own > opp) return "sieg";
    if (own < opp) return "niederlage";
    return "remis";
  }

  function teamHashtag(teamName) {
    return teamName.replace(/-/g, "").replace(/\s+/g, "");
  }

  function baseHashtags(teamName) {
    return `#MTSVHohenwestedt #${teamHashtag(teamName)} #Jugendfussball #Amateurfussball #Hohenwestedt`;
  }

  function announceIntro(lastFixture) {
    if (!lastFixture || !lastFixture.opponent) {
      return "Die nächste Aufgabe wartet.";
    }
    const { own_goals: og, opp_goals: pg } = lastFixture;
    const opponentName = lastFixture.opponent.name;
    const kind = resultKind(og, pg);
    if (kind === "sieg") {
      return `Nach dem ${og}:${pg}-Sieg gegen ${opponentName} wollen wir nachlegen.`;
    }
    if (kind === "remis") {
      return `Nach dem ${og}:${pg} gegen ${opponentName} greifen wir wieder an.`;
    }
    return `Nach der ${og}:${pg}-Niederlage gegen ${opponentName} wollen wir zurückschlagen.`;
  }

  function buildAnkuendigung({ teamName, fixture, lastFixture }) {
    const opponentName = fixture.opponent ? fixture.opponent.name : "";
    const venue = fixture.venue || "";
    const ortLine = fixture.is_home
      ? `Heimspiel · ${venue}`
      : `Auswärts bei ${opponentName}`;

    return [
      `⚽️ SPIELTAG | MTSV Hohenwestedt ${teamName}`,
      "",
      announceIntro(lastFixture),
      "",
      `📅 ${formatDateShort(fixture.date)} · ${formatTime(fixture.kickoff)} Uhr`,
      `📍 ${ortLine}`,
      `🏆 ${fixture.competition || ""} · Spieltag ${fixture.matchday || ""}`,
      "",
      "Kommt vorbei und unterstützt unsere Mannschaft! 💚",
      "",
      baseHashtags(teamName),
    ].join("\n");
  }

  function resultSentence(kind, teamName) {
    if (kind === "sieg") return `Ein Sieg für unsere ${teamName}! 💪`;
    if (kind === "remis") return "Ein Unentschieden – ein Punkt bleibt in Hohenwestedt.";
    return "Diesmal hat es nicht gereicht – Kopf hoch, weiter geht's!";
  }

  function buildErgebnis({ teamName, fixture }) {
    const opponentName = fixture.opponent ? fixture.opponent.name : "";
    const kind = resultKind(fixture.own_goals, fixture.opp_goals);

    const scorersLine =
      fixture.scorers && fixture.scorers.length
        ? fixture.scorers.map((s) => `${s.minute}' ${s.name}`).join(", ")
        : "";
    const extra = [scorersLine, fixture.note].filter(Boolean).join("\n");

    const lines = [
      `🏁 ENDSTAND | MTSV Hohenwestedt ${teamName}`,
      "",
      `MTSV ${fixture.own_goals}:${fixture.opp_goals} ${opponentName}`,
      `🏆 ${fixture.competition || ""} · Spieltag ${fixture.matchday || ""}`,
      "",
    ];
    if (extra) {
      lines.push(extra, "");
    }
    lines.push(resultSentence(kind, teamName), "", baseHashtags(teamName));
    return lines.join("\n");
  }

  return {
    formatDateShort,
    formatDateLong,
    formatTime,
    weekdayShort,
    resultKind,
    buildAnkuendigung,
    buildErgebnis,
  };
})();
