// Canvas-Renderer für Instagram-Posts (1080x1350).
// Zeichnet die zwei Vorlagen "ankuendigung" und "ergebnis" exakt nach den
// Referenzbildern assets/referenz-spieltag.png und assets/referenz-ergebnis.png.

window.Renderer = (function () {
  const W = 1080;
  const H = 1350;

  const FONTS = {
    black: '"Archivo Black"',
    condensed: '"Saira Condensed"',
  };

  const WEEKDAYS_SHORT = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
  const MONTHS = [
    "JANUAR",
    "FEBRUAR",
    "MÄRZ",
    "APRIL",
    "MAI",
    "JUNI",
    "JULI",
    "AUGUST",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DEZEMBER",
  ];

  const LAYOUT = {
    tag: {
      x: 0.06 * W,
      y: 0.055 * H,
      barWidth: 8,
      barHeight: 32,
      barRadius: 4,
      gap: 14,
      fontSize: 25,
      letterSpacing: 1.5,
    },
    sponsorBar: {
      height: 0.072 * H,
      borderHeight: 2,
    },
    duel: {
      boxSize: 150,
      radius: 26,
      leftCenterX: 0.3 * W,
      rightCenterX: 0.7 * W,
      vsFontSize: 60,
      nameFontSize: 30,
      nameGapBelow: 34,
    },
    ergebnis: {
      scoreCenterY: 0.31 * H,
      scoreFontSize: 230,
      resultWordCenterY: 0.475 * H,
      resultWordFontSize: 54,
      scorersCenterY: 0.598 * H,
      scorersFontSize: 34,
      scorersLineHeight: 44,
      dividerTopY: 0.575 * H,
      dividerBottomY: 0.618 * H,
      duelCenterY: 0.78 * H,
    },
    ankuendigung: {
      smallLineCenterY: 0.415 * H,
      smallLineFontSize: 26,
      headlineStartY: 0.515 * H,
      headlineMinFontSize: 40,
      headlineMaxFontSize: 150,
      venueCenterY: 0.685 * H,
      venueFontSize: 28,
      duelCenterY: 0.8 * H,
    },
  };

  const COLORS = () => window.APP_CONFIG.colors;

  function createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    return canvas;
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden: " + src));
      img.src = src;
    });
  }

  async function fontsReady() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.load(`900 100px ${FONTS.black}`);
      await document.fonts.load(`900 100px ${FONTS.condensed}`);
      await document.fonts.load(`700 100px ${FONTS.condensed}`);
      await document.fonts.load(`600 100px ${FONTS.condensed}`);
      await document.fonts.ready;
    }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function measureLetterSpaced(ctx, text, spacing) {
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    return widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  }

  function drawLetterSpaced(ctx, text, x, y, spacing, align = "left") {
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let startX = x;
    if (align === "center") startX = x - total / 2;
    else if (align === "right") startX = x - total;
    let cx = startX;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cx, y);
      cx += widths[i] + spacing;
    }
    ctx.textAlign = prevAlign;
    return total;
  }

  function fitContain(img, slotW, slotH) {
    const scale = Math.min(slotW / img.width, slotH / img.height);
    return { w: img.width * scale, h: img.height * scale };
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Wie wrapText, garantiert aber maximal `maxLines` Zeilen: überzählige
  // Zeilen werden in die letzte Zeile gequetscht statt (wie bei purem
  // ctx.fillText mit lines.slice(0, 2)) stillschweigend zu verschwinden.
  function wrapTextMaxLines(ctx, text, maxWidth, maxLines) {
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return lines;
    const head = lines.slice(0, maxLines - 1);
    head.push(lines.slice(maxLines - 1).join(" "));
    return head;
  }

  function resultKind(own, opp) {
    if (own > opp) return "sieg";
    if (own < opp) return "niederlage";
    return "remis";
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // Test- und Pokalspiele zählen nicht als Liga-Spieltag: keine Spieltag-Nr.
  // in der kleinen Zeile, und als Fallback-Überschrift/-Tag, falls kein
  // Wettbewerb hinterlegt ist.
  function typeLabel(type) {
    if (type === "testspiel") return "Testspiel";
    if (type === "pokal") return "Pokalspiel";
    return null;
  }

  function isLigaType(type) {
    return type !== "testspiel" && type !== "pokal";
  }

  function formatSmallLine(matchday, dateStr, timeStr, type) {
    const d = parseDate(dateStr);
    const dateBit = d ? `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}` : "";
    const timeBit = timeStr ? `${timeStr.slice(0, 5)} UHR` : "";
    const matchBit = isLigaType(type) ? `SPIELTAG ${matchday || "?"}` : null;
    return [matchBit, dateBit, timeBit].filter(Boolean).join(" · ");
  }

  // -------------------------------------------------------------------------
  // Gemeinsame Bausteine: Mannschafts-Tag, Sponsorleiste, Duell-Block
  // -------------------------------------------------------------------------

  function drawTeamTag(ctx, text) {
    const t = LAYOUT.tag;
    ctx.fillStyle = "#FFFFFF";
    roundRectPath(ctx, t.x, t.y, t.barWidth, t.barHeight, t.barRadius);
    ctx.fill();

    ctx.font = `700 ${t.fontSize}px ${FONTS.condensed}`;
    const textY = t.y + t.barHeight / 2 + t.fontSize * 0.35;
    drawLetterSpaced(ctx, text.toUpperCase(), t.x + t.barWidth + t.gap, textY, t.letterSpacing, "left");
  }

  function drawSponsorBar(ctx, logoImg) {
    const c = COLORS();
    const bar = LAYOUT.sponsorBar;
    const barY = H - bar.height;

    ctx.fillStyle = c.cream;
    ctx.fillRect(0, barY, W, bar.borderHeight);
    ctx.fillStyle = c.sponsorBarDark;
    ctx.fillRect(0, barY + bar.borderHeight, W, bar.height - bar.borderHeight);

    const centerY = barY + bar.borderHeight + (bar.height - bar.borderHeight) / 2;
    const label = "PRÄSENTIERT VON";
    const labelSpacing = 1.5;
    const labelFontSize = 22;
    ctx.font = `600 ${labelFontSize}px ${FONTS.condensed}`;
    const labelWidth = measureLetterSpaced(ctx, label, labelSpacing);

    const logoH = (bar.height - bar.borderHeight) * 0.4;
    const logoGap = 14;
    const logoW = logoImg ? (logoImg.width / logoImg.height) * logoH : 0;
    const totalWidth = labelWidth + (logoImg ? logoGap + logoW : 0);
    let cursorX = (W - totalWidth) / 2;

    ctx.fillStyle = "#FFFFFF";
    const textY = centerY + labelFontSize * 0.35;
    drawLetterSpaced(ctx, label, cursorX, textY, labelSpacing, "left");
    cursorX += labelWidth;

    if (logoImg) {
      cursorX += logoGap;
      ctx.drawImage(logoImg, cursorX, centerY - logoH / 2, logoW, logoH);
    }
  }

  function drawDuelSquare(ctx, x, y, size, img) {
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    roundRectPath(ctx, x, y, size, size, LAYOUT.duel.radius);
    ctx.fill();
    ctx.clip();
    if (img) {
      const padding = size * 0.14;
      const slot = size - padding * 2;
      const fitted = fitContain(img, slot, slot);
      const dx = x + (size - fitted.w) / 2;
      const dy = y + (size - fitted.h) / 2;
      ctx.drawImage(img, dx, dy, fitted.w, fitted.h);
    } else {
      ctx.fillStyle = "#C9D2CC";
      ctx.font = `600 18px ${FONTS.condensed}`;
      ctx.textAlign = "center";
      ctx.fillText("LOGO", x + size / 2, y + size / 2 + 6);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  function drawFittedLabel(ctx, text, centerX, y, maxWidth) {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    let fontSize = LAYOUT.duel.nameFontSize;
    ctx.font = `700 ${fontSize}px ${FONTS.condensed}`;
    while (ctx.measureText(text).width > maxWidth && fontSize > 14) {
      fontSize -= 1;
      ctx.font = `700 ${fontSize}px ${FONTS.condensed}`;
    }
    ctx.fillText(text, centerX, y);
    ctx.textAlign = "left";
  }

  function drawDuelBlock(ctx, centerY, mtsvImg, opponentImg, opponentName) {
    const c = COLORS();
    const d = LAYOUT.duel;
    const half = d.boxSize / 2;

    drawDuelSquare(ctx, d.leftCenterX - half, centerY - half, d.boxSize, mtsvImg);
    drawDuelSquare(ctx, d.rightCenterX - half, centerY - half, d.boxSize, opponentImg);

    ctx.fillStyle = c.cream;
    ctx.font = `900 ${d.vsFontSize}px ${FONTS.black}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", W / 2, centerY);
    ctx.textBaseline = "alphabetic";

    const nameY = centerY + half + d.nameGapBelow;
    const nameMaxWidth = d.boxSize + 30;
    drawFittedLabel(ctx, "MTSV", d.leftCenterX, nameY, nameMaxWidth);
    drawFittedLabel(ctx, (opponentName || "").toUpperCase(), d.rightCenterX, nameY, nameMaxWidth);
    ctx.textAlign = "left";
  }

  // -------------------------------------------------------------------------
  // Ergebnis-Post
  // -------------------------------------------------------------------------

  // Minute und Name je Seite als kleine, ausgerichtete Tabelle zeichnen:
  // die Minute steht rechtsbündig in einer festen Spalte, der Name beginnt
  // danach immer an derselben X-Position – bei mehreren Torschützen bleibt
  // die Liste dadurch sauber ausgerichtet statt als ein loser Textblock.
  function drawScorerColumn(ctx, items, anchorX, side, centerY, lineHeight) {
    if (!items.length) return;

    const minuteTexts = items.map((s) => `${s.minute}'`);
    const nameTexts = items.map((s) => (s.name || "").toUpperCase());
    const minuteColWidth = Math.max(...minuteTexts.map((t) => ctx.measureText(t).width));
    const maxNameWidth = Math.max(...nameTexts.map((t) => ctx.measureText(t).width));
    const gutter = 12;
    const blockWidth = minuteColWidth + gutter + maxNameWidth;

    const minuteRightX = side === "left" ? anchorX - blockWidth + minuteColWidth : anchorX + minuteColWidth;
    const nameLeftX = minuteRightX + gutter;

    const totalH = items.length * lineHeight;
    let y = centerY - totalH / 2 + lineHeight * 0.75;
    items.forEach((s, i) => {
      ctx.textAlign = "right";
      ctx.fillText(minuteTexts[i], minuteRightX, y);
      ctx.textAlign = "left";
      ctx.fillText(nameTexts[i], nameLeftX, y);
      y += lineHeight;
    });
  }

  function drawScorers(ctx, scorers, L) {
    const c = COLORS();
    const mid = Math.ceil(scorers.length / 2);
    const leftItems = scorers.slice(0, mid);
    const rightItems = scorers.slice(mid);
    const lineHeight = L.scorersLineHeight;

    ctx.font = `900 ${L.scorersFontSize}px ${FONTS.condensed}`;
    ctx.fillStyle = c.cream;

    drawScorerColumn(ctx, leftItems, W * 0.47, "left", L.scorersCenterY, lineHeight);
    drawScorerColumn(ctx, rightItems, W * 0.53, "right", L.scorersCenterY, lineHeight);
    ctx.textAlign = "left";

    const maxRows = Math.max(leftItems.length, rightItems.length);
    const specHalf = (L.dividerBottomY - L.dividerTopY) / 2;
    const dividerHalf = Math.max((maxRows * lineHeight) / 2, specHalf);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, L.scorersCenterY - dividerHalf);
    ctx.lineTo(W / 2, L.scorersCenterY + dividerHalf);
    ctx.stroke();
  }

  async function renderErgebnis(ctx, data) {
    const c = COLORS();
    const L = LAYOUT.ergebnis;
    const jersey = await loadImage(window.APP_CONFIG.jerseyBg);
    ctx.drawImage(jersey, 0, 0, W, H);

    const tagSuffix = data.competition || typeLabel(data.type);
    const tagText = tagSuffix ? `${data.teamName} · ${tagSuffix}` : data.teamName;
    drawTeamTag(ctx, tagText);

    ctx.fillStyle = c.cream;
    ctx.font = `900 ${L.scoreFontSize}px ${FONTS.black}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${data.ownGoals}:${data.oppGoals}`, W / 2, L.scoreCenterY);

    const kind = resultKind(data.ownGoals, data.oppGoals);
    const word = kind === "sieg" ? "SIEG" : kind === "niederlage" ? "NIEDERLAGE" : "UNENTSCHIEDEN";
    ctx.font = `900 ${L.resultWordFontSize}px ${FONTS.black}`;
    ctx.fillText(word, W / 2, L.resultWordCenterY);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    if (data.scorers && data.scorers.length) {
      drawScorers(ctx, data.scorers, L);
    }

    const mtsvImg = await loadImage(window.APP_CONFIG.club.logo);
    const opponentImg = data.opponentLogo ? await loadImage(data.opponentLogo) : null;
    drawDuelBlock(ctx, L.duelCenterY, mtsvImg, opponentImg, data.opponentName);

    const presenterLogo = window.APP_CONFIG.club.presenterLogo
      ? await loadImage(window.APP_CONFIG.club.presenterLogo)
      : null;
    drawSponsorBar(ctx, presenterLogo);
  }

  // -------------------------------------------------------------------------
  // Ankündigungs-Post
  // -------------------------------------------------------------------------

  function drawPlaceholderBackground(ctx) {
    ctx.fillStyle = "#123322";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const step = 34;
    for (let i = -H; i < W + H; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, H);
      ctx.lineTo(i + H, 0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.font = `600 26px ${FONTS.condensed}`;
    ctx.textAlign = "center";
    drawLetterSpaced(ctx, "MANNSCHAFTSFOTO", W / 2, 490, 3, "center");
    ctx.restore();
  }

  function drawAnnounceBackground(ctx, photoImg) {
    if (photoImg) {
      const scale = Math.max(W / photoImg.width, H / photoImg.height);
      const dw = photoImg.width * scale;
      const dh = photoImg.height * scale;
      ctx.drawImage(photoImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      drawPlaceholderBackground(ctx);
    }

    // Leichter grüner Filter über das ganze Bild.
    ctx.fillStyle = "rgba(22,86,50,0.30)";
    ctx.fillRect(0, 0, W, H);

    // Dunkler Verlauf nach unten für Lesbarkeit (bis ca. 90% Deckkraft).
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "rgba(6,20,13,0)");
    gradient.addColorStop(0.55, "rgba(6,20,13,0.45)");
    gradient.addColorStop(1, "rgba(6,20,13,0.90)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  // Passt die Schriftgröße der Wettbewerbs-Überschrift an die Textlänge an:
  // kurze Namen (z. B. "SH-Pokal") werden GROSS gezeichnet, um die Breite
  // gut auszufüllen, lange Namen (z. B. "Landesliga-Quali") entsprechend
  // verkleinert – nie ein festes Schriftmaß. Ein Wort läuft einzeilig,
  // zwei Wörter (bzw. am Bindestrich getrennt) oder zu langer Text auf
  // maximal zwei Zeilen.
  function fitHeadline(ctx, words, maxWidth, minSize, maxSize, maxBlockHeight) {
    for (let fontSize = maxSize; fontSize >= minSize; fontSize -= 2) {
      ctx.font = `900 ${fontSize}px ${FONTS.condensed}`;
      const lines = words.length <= 2 && words.length > 0 ? words : wrapText(ctx, words.join(" "), maxWidth);
      if (lines.length > 2) continue;
      const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
      const blockHeight = lines.length * fontSize * 1.07;
      if (widest <= maxWidth && blockHeight <= maxBlockHeight) {
        return { fontSize, lines };
      }
    }
    ctx.font = `900 ${minSize}px ${FONTS.condensed}`;
    const lines =
      words.length <= 2 && words.length > 0
        ? words
        : wrapTextMaxLines(ctx, words.join(" "), maxWidth, 2);
    return { fontSize: minSize, lines };
  }

  function drawHeadline(ctx, text, L) {
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";

    // "Zweizeilig": Wettbewerbsnamen wie "Landesliga-Quali" werden am
    // Bindestrich/Leerzeichen in zwei große Zeilen aufgeteilt (Bindestrich
    // fällt dabei weg), statt als ein kleinerer Einzeiler zu laufen.
    const maxWidth = W * 0.9;
    // Verfügbare Höhe bis zur Ort-Zeile darf nicht überschritten werden,
    // sonst überlappt eine zweizeilige Überschrift mit dem Text darunter.
    const maxBlockHeight = (L.venueCenterY - L.headlineStartY) * 0.82;
    const words = text.toUpperCase().replace(/-/g, " ").split(" ").filter(Boolean);
    const { fontSize, lines } = fitHeadline(
      ctx,
      words,
      maxWidth,
      L.headlineMinFontSize,
      L.headlineMaxFontSize,
      maxBlockHeight
    );

    const lineHeight = fontSize * 1.07;
    let y = L.headlineStartY + fontSize * 0.8;
    lines.slice(0, 2).forEach((line) => {
      ctx.fillText(line, W / 2, y);
      y += lineHeight;
    });
    ctx.restore();
  }

  async function renderAnkuendigung(ctx, data) {
    const c = COLORS();
    const L = LAYOUT.ankuendigung;
    const photoImg = data.teamPhoto ? await loadImage(data.teamPhoto) : null;
    drawAnnounceBackground(ctx, photoImg);

    drawTeamTag(ctx, data.teamName);

    const smallLine = formatSmallLine(data.matchday, data.date, data.kickoff, data.type);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${L.smallLineFontSize}px ${FONTS.condensed}`;
    ctx.textAlign = "center";
    drawLetterSpaced(ctx, smallLine, W / 2, L.smallLineCenterY, 1.5, "center");
    ctx.textAlign = "left";

    drawHeadline(ctx, data.competition || typeLabel(data.type) || "Spieltag", L);

    ctx.fillStyle = c.cream;
    ctx.font = `600 ${L.venueFontSize}px ${FONTS.condensed}`;
    ctx.textAlign = "center";
    drawLetterSpaced(ctx, (data.venueLine || "").toUpperCase(), W / 2, L.venueCenterY, 1.5, "center");
    ctx.textAlign = "left";

    const mtsvImg = await loadImage(window.APP_CONFIG.club.logo);
    const opponentImg = data.opponentLogo ? await loadImage(data.opponentLogo) : null;
    drawDuelBlock(ctx, L.duelCenterY, mtsvImg, opponentImg, data.opponentName);

    const presenterLogo = window.APP_CONFIG.club.presenterLogo
      ? await loadImage(window.APP_CONFIG.club.presenterLogo)
      : null;
    drawSponsorBar(ctx, presenterLogo);
  }

  // -------------------------------------------------------------------------

  async function render(canvas, type, data) {
    await fontsReady();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    if (type === "ergebnis") {
      await renderErgebnis(ctx, data);
    } else {
      await renderAnkuendigung(ctx, data);
    }
  }

  return { W, H, createCanvas, render };
})();
