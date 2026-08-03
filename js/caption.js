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

  // Textbausteine mit mehreren gleichwertigen Formulierungs-Varianten, damit
  // nicht jeder Post gleich klingt. Struktur/Emojis/Zeilenreihenfolge und
  // Hashtags bleiben fest – es wird pro Aufruf nur eine Variante zufällig
  // gewählt.
  function pickVariant(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const ANNOUNCE_INTRO_VARIANTS = {
    keinSpiel: [
      "Die nächste Aufgabe wartet.",
      "Der nächste Spieltag steht an.",
      "Jetzt geht's weiter im Spielbetrieb.",
    ],
    sieg: (og, pg, opponentName) => [
      `Nach dem ${og}:${pg}-Sieg gegen ${opponentName} wollen wir nachlegen.`,
      `Nach dem starken ${og}:${pg} gegen ${opponentName} soll es im gleichen Stil weitergehen.`,
      `Der ${og}:${pg}-Erfolg gegen ${opponentName} macht Lust auf mehr.`,
    ],
    remis: (og, pg, opponentName) => [
      `Nach dem ${og}:${pg} gegen ${opponentName} greifen wir wieder an.`,
      `Nach dem Unentschieden (${og}:${pg}) gegen ${opponentName} soll diesmal mehr drin sein.`,
      `Das ${og}:${pg} gegen ${opponentName} war knapp – jetzt wollen wir nachlegen.`,
    ],
    niederlage: (og, pg, opponentName) => [
      `Nach der ${og}:${pg}-Niederlage gegen ${opponentName} wollen wir zurückschlagen.`,
      `Das ${og}:${pg} gegen ${opponentName} soll schnell vergessen werden.`,
      `Nach dem ${og}:${pg} gegen ${opponentName} wollen wir es diesmal besser machen.`,
    ],
  };

  function announceIntro(lastFixture) {
    if (!lastFixture || !lastFixture.opponent) {
      return pickVariant(ANNOUNCE_INTRO_VARIANTS.keinSpiel);
    }
    const { own_goals: og, opp_goals: pg } = lastFixture;
    const opponentName = lastFixture.opponent.name;
    const kind = resultKind(og, pg);
    return pickVariant(ANNOUNCE_INTRO_VARIANTS[kind](og, pg, opponentName));
  }

  const ANNOUNCE_OUTRO_VARIANTS = [
    "Kommt vorbei und unterstützt unsere Mannschaft! 💚",
    "Wir freuen uns auf euch am Spielfeldrand! 💚",
    "Kommt vorbei und feuert uns an! 💚",
  ];

  function announceOutro() {
    return pickVariant(ANNOUNCE_OUTRO_VARIANTS);
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
      announceOutro(),
      "",
      baseHashtags(teamName),
    ].join("\n");
  }

  const RESULT_SENTENCE_VARIANTS = {
    sieg: (teamName) => [
      `Ein Sieg für unsere ${teamName}! 💪`,
      `Drei Punkte für unsere ${teamName}! 💪`,
      `Stark gemacht, ${teamName}! 💪`,
    ],
    remis: () => [
      "Ein Unentschieden – ein Punkt bleibt in Hohenwestedt.",
      "Remis – knapp, aber ein Punkt ist eingetütet.",
      "Geteilte Punkte heute – weiter geht's beim nächsten Mal.",
    ],
    niederlage: () => [
      "Diesmal hat es nicht gereicht – Kopf hoch, weiter geht's!",
      "Keine Punkte heute, aber der nächste Spieltag kommt bestimmt.",
      "Nicht der Tag von uns – nächstes Mal wird's besser.",
    ],
  };

  function resultSentence(kind, teamName) {
    return pickVariant(RESULT_SENTENCE_VARIANTS[kind](teamName));
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
