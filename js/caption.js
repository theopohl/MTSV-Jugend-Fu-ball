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

  // Test- und Pokalspiele zählen nicht als Liga-Spieltag – dort erscheint
  // statt "Spieltag N" die Spielart selbst.
  function typeLabel(type) {
    if (type === "testspiel") return "Testspiel";
    if (type === "pokal") return "Pokalspiel";
    return null;
  }

  function matchLine(fixture) {
    const right = typeLabel(fixture.type) || `Spieltag ${fixture.matchday || ""}`;
    return fixture.competition ? `${fixture.competition} · ${right}` : right;
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

  const ANNOUNCE_HEADER_VARIANTS = (teamName) => [
    `⚽️ Nächstes Spiel für unsere ${teamName}!`,
    `⚽️ Unsere ${teamName} ist wieder gefordert.`,
    `⚽️ Nächstes Spiel für die ${teamName} steht an.`,
  ];

  function announceHeader(teamName) {
    return pickVariant(ANNOUNCE_HEADER_VARIANTS(teamName));
  }

  const ANNOUNCE_INTRO_VARIANTS = {
    keinSpiel: [
      "Auf geht's – nächstes Spiel, nächste Chance.",
      "Zeit für die nächsten drei Punkte.",
      "Die nächste Gelegenheit, Punkte mitzunehmen.",
    ],
    sieg: (og, pg, opponentName) => [
      `Nach dem ${og}:${pg} gegen ${opponentName} sind wir heiß auf mehr.`,
      `Weiter so! Nach dem Sieg gegen ${opponentName} (${og}:${pg}) soll der nächste Erfolg her.`,
      `Nach dem ${og}:${pg} zuletzt gegen ${opponentName} geht's mit Rückenwind weiter.`,
    ],
    remis: (og, pg, opponentName) => [
      `Letztes Mal gab's ein ${og}:${pg} gegen ${opponentName} – heute soll mehr drin sein.`,
      `Nach dem Remis gegen ${opponentName} (${og}:${pg}) wollen wir diesmal die volle Punktzahl.`,
      `Das ${og}:${pg} gegen ${opponentName} war knapp. Jetzt wird nachgelegt.`,
    ],
    niederlage: (og, pg, opponentName) => [
      `Die Pleite gegen ${opponentName} (${og}:${pg}) ist abgehakt – jetzt zählt nur das nächste Spiel.`,
      `Nach dem ${og}:${pg} gegen ${opponentName} heißt's: Kopf hoch und weiter.`,
      `Das wollen wir nach dem ${og}:${pg} gegen ${opponentName} besser machen.`,
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
    "Kommt vorbei, wir freuen uns auf euch! 💚",
    "Anfeuern erwünscht – wir sehen uns am Platz! 💚",
    "Support ist immer willkommen, schaut gerne vorbei! 💚",
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
      announceHeader(teamName),
      "",
      announceIntro(lastFixture),
      "",
      `📅 ${formatDateShort(fixture.date)} · ${formatTime(fixture.kickoff)} Uhr`,
      `📍 ${ortLine}`,
      `🏆 ${matchLine(fixture)}`,
      "",
      announceOutro(),
      "",
      baseHashtags(teamName),
    ].join("\n");
  }

  const RESULT_HEADER_VARIANTS = (teamName) => [
    `🏁 Endstand für unsere ${teamName}`,
    `🏁 Abpfiff – das war's für unsere ${teamName}`,
    `🏁 Das Spiel unserer ${teamName} ist vorbei`,
  ];

  function resultHeader(teamName) {
    return pickVariant(RESULT_HEADER_VARIANTS(teamName));
  }

  const RESULT_SENTENCE_VARIANTS = {
    sieg: (teamName) => [
      `Verdienter Sieg für unsere ${teamName}! 💪`,
      `Da geht's mit einem Lächeln nach Hause. 💪`,
      `Klasse Leistung, weiter so! 💪`,
    ],
    remis: () => [
      "Ein Punkt ist mitgenommen – geht in Ordnung.",
      "Remis heute, nächstes Mal soll's der Sieg werden.",
      "Schade um die liegen gelassenen Chancen, aber okay so.",
    ],
    niederlage: () => [
      "Heute hat's nicht gereicht, aber Kopf hoch!",
      "Bitter, aber nächste Woche geht's weiter.",
      "Nicht unser Tag – nächstes Mal wird's besser.",
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
      resultHeader(teamName),
      "",
      `MTSV ${fixture.own_goals}:${fixture.opp_goals} ${opponentName}`,
      `🏆 ${matchLine(fixture)}`,
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
    typeLabel,
    matchLine,
    buildAnkuendigung,
    buildErgebnis,
  };
})();
