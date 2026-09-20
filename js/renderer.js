// Canvas-Renderer für Instagram-Posts (1080x1350).
// Design: Mannschafts-Tag oben links (dünner Balken + Text), großer
// zentrierter Wettbewerb, Duell-Block (Logos + "VS") und Sponsorleiste mit
// echtem POHL-Logo unten. Kein Flaggen-Eck, kein getippter Presenter-Text
// oben mehr – das ist die "alte", vor einigen Wochen festgelegte Optik.

window.Renderer = (function () {
  const W = 1080;
  const H = 1350;

  const FONTS = {
    black: '"Archivo Black"',
    condensed: '"Saira Condensed"',
  };

  const LAYOUT = {
    teamTag: {
      x: 64,
      y: 100,
      barW: 12,
      fontSize: 60,
      gapAfterBar: 28,
    },
    metaLine: { centerX: 540, y: 512, fontSize: 30 },
    headline: { centerX: 540, y: 720, maxFontSize: 92, minFontSize: 46, maxWidthRatio: 0.86 },
    venueLine: { centerX: 540, y: 875, fontSize: 34 },
    score: { centerX: 540, centerY: 420, fontSize: 280 },
    outcome: { centerX: 540, y: 641, fontSize: 56 },
    scorers: {
      centerY: 807,
      rowGap: 46,
      fontSize: 32,
      crestSize: 34,
      colGapFromCenter: 24,
      dividerHalfHeight: 29,
    },
    matchup: {
      centerX: 540,
      centerY: 1080,
      boxSize: 168,
      gapFromCenter: 240,
      nameOffsetY: 34,
      nameFontSize: 32,
      vsFontSize: 60,
    },
    sponsorBar: {
      height: 97,
      labelFontSize: 25,
      logoHeightRatio: 0.4,
      gapBetween: 24,
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

  async function safeLoadImage(src) {
    if (!src) return null;
    try {
      return await loadImage(src);
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  async function fontsReady() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.load(`900 100px ${FONTS.black}`);
      await document.fonts.load(`900 100px ${FONTS.condensed}`);
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

  // ---- Mannschafts-Tag oben links: dünner weißer Balken + fetter Text ----
  function drawTeamTag(ctx, text) {
    const t = LAYOUT.teamTag;
    ctx.font = `700 ${t.fontSize}px ${FONTS.condensed}`;
    const upper = text.toUpperCase();
    const barH = t.fontSize * 1.05;
    ctx.fillStyle = "#FFFFFF";
    roundRectPath(ctx, t.x, t.y, t.barW, barH, t.barW / 2);
    ctx.fill();
    const textY = t.y + barH * 0.82;
    drawLetterSpaced(ctx, upper, t.x + t.barW + t.gapAfterBar, textY, 1.5, "left");
  }

  // ---- Kleine Meta-Zeile (Spieltag/Datum/Uhrzeit) ----
  function drawMetaLine(ctx, text) {
    const m = LAYOUT.metaLine;
    ctx.font = `700 ${m.fontSize}px ${FONTS.condensed}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    drawLetterSpaced(ctx, text.toUpperCase(), m.centerX, m.y, 2, "center");
  }

  // ---- Große, zentrierte Überschrift (Wettbewerb), auto-fit, 1-2 Zeilen ----
  function drawBigHeadline(ctx, text) {
    const h = LAYOUT.headline;
    const maxWidth = W * h.maxWidthRatio;
    const upper = (text || "").toUpperCase();

    function widthAt(size, str) {
      ctx.font = `900 ${size}px ${FONTS.black}`;
      return ctx.measureText(str).width;
    }

    let size = h.maxFontSize;
    while (size > h.minFontSize && widthAt(size, upper) > maxWidth) size -= 2;

    if (widthAt(size, upper) <= maxWidth || !upper.includes(" ")) {
      ctx.font = `900 ${size}px ${FONTS.black}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(upper, h.centerX, h.y);
      ctx.textAlign = "left";
      return;
    }

    const words = upper.split(" ");
    const bestSplit = Math.ceil(words.length / 2);
    const line1 = words.slice(0, bestSplit).join(" ");
    const line2 = words.slice(bestSplit).join(" ");

    size = h.maxFontSize;
    while (size > h.minFontSize && (widthAt(size, line1) > maxWidth || widthAt(size, line2) > maxWidth)) {
      size -= 2;
    }
    ctx.font = `900 ${size}px ${FONTS.black}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    const lineHeight = size * 1.02;
    ctx.fillText(line1, h.centerX, h.y - lineHeight * 0.55);
    ctx.fillText(line2, h.centerX, h.y - lineHeight * 0.55 + lineHeight);
    ctx.textAlign = "left";
  }

  // ---- "BEI: GEGNER" bzw. Heim-Ort-Zeile ----
  function drawVenueLine(ctx, venueLine) {
    const v = LAYOUT.venueLine;
    let text = (venueLine || "").trim();
    text = text.replace(/^bei\s+/i, "Bei: ");
    ctx.font = `700 ${v.fontSize}px ${FONTS.condensed}`;
    ctx.fillStyle = "#FFFFFF";
    drawLetterSpaced(ctx, text.toUpperCase(), v.centerX, v.y, 1.5, "center");
  }

  // ---- Duell-Block: zwei Wappen + "VS" + Namen darunter ----
  function drawMatchup(ctx, leftImg, leftName, rightImg, rightName) {
    const m = LAYOUT.matchup;
    const s = m.boxSize;
    const leftX = m.centerX - m.gapFromCenter - s / 2;
    const rightX = m.centerX + m.gapFromCenter - s / 2;
    const boxY = m.centerY - s / 2;

    [leftX, rightX].forEach((bx, i) => {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      roundRectPath(ctx, bx, boxY, s, s, s * 0.14);
      ctx.fill();
      ctx.clip();
      const img = i === 0 ? leftImg : rightImg;
      if (img) {
        const pad = s * 0.14;
        const fit = fitContain(img, s - pad * 2, s - pad * 2);
        ctx.drawImage(img, bx + (s - fit.w) / 2, boxY + (s - fit.h) / 2, fit.w, fit.h);
      } else {
        // Sichtbarer Platzhalter statt einer stillen, leeren Box – so ist
        // im Bild sofort erkennbar, dass für dieses Team (noch) kein Logo
        // hinterlegt ist, statt dass die Fläche unauffällig leer bleibt.
        ctx.fillStyle = "#C9D2CC";
        ctx.font = `700 18px ${FONTS.condensed}`;
        ctx.textAlign = "center";
        ctx.fillText("KEIN LOGO", bx + s / 2, boxY + s / 2 + 6);
        ctx.fillStyle = "#FFFFFF";
      }
      ctx.restore();
    });

    ctx.font = `900 ${m.vsFontSize}px ${FONTS.black}`;
    ctx.fillStyle = COLORS().cream || "#E9EFE9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", m.centerX, m.centerY);
    ctx.textBaseline = "alphabetic";

    ctx.font = `700 ${m.nameFontSize}px ${FONTS.condensed}`;
    ctx.fillStyle = "#FFFFFF";
    const nameY = boxY + s + m.nameOffsetY;
    ctx.fillText((leftName || "").toUpperCase(), leftX + s / 2, nameY);
    ctx.fillText((rightName || "").toUpperCase(), rightX + s / 2, nameY);
    ctx.textAlign = "left";
  }

  // ---- Sponsorleiste unten mit echtem POHL-Logo ----
  async function drawSponsorBar(ctx) {
    const b = LAYOUT.sponsorBar;
    const c = COLORS();
    const y0 = H - b.height;
    ctx.fillStyle = c.sponsorBarDark || "#081E14";
    ctx.fillRect(0, y0, W, b.height);
    ctx.fillStyle = c.cream || "#E9EFE9";
    ctx.fillRect(0, y0, W, 2);

    const label = "PRÄSENTIERT VON";
    ctx.font = `700 ${b.labelFontSize}px ${FONTS.condensed}`;
    const widths = [...label].map((ch) => ctx.measureText(ch).width);
    const labelWidth = widths.reduce((a, v) => a + v, 0) + 2 * (label.length - 1);

    const logoSrc = window.APP_CONFIG.club.presenterLogo;
    const logoImg = await safeLoadImage(logoSrc);
    let logoW = 0;
    let logoH = 0;
    if (logoImg) {
      logoH = b.height * b.logoHeightRatio;
      logoW = (logoImg.width / logoImg.height) * logoH;
    }

    const totalWidth = labelWidth + (logoImg ? b.gapBetween + logoW : 0);
    const startX = W / 2 - totalWidth / 2;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const textY = y0 + b.height / 2 + b.labelFontSize * 0.32;
    drawLetterSpaced(ctx, label, startX, textY, 2, "left");

    if (logoImg) {
      const logoX = startX + labelWidth + b.gapBetween;
      const logoY = y0 + (b.height - logoH) / 2;
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    }
  }

  function scorerIsOwnTeam(sc) {
    const t = (sc.team || "").toString().toLowerCase();
    if (["opp", "opponent", "gegner", "away", "auswaerts", "auswärts"].includes(t)) {
      return false;
    }
    return true;
  }

  function drawSmallCrest(ctx, img, cx, cy, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.clip();
    if (img) {
      const fit = fitContain(img, size * 0.86, size * 0.86);
      ctx.drawImage(img, cx - fit.w / 2, cy - fit.h / 2, fit.w, fit.h);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Ergebnis-Post
  // -------------------------------------------------------------------------

  async function renderErgebnis(ctx, data) {
    const c = COLORS();
    const jersey = await safeLoadImage(window.APP_CONFIG.jerseyBg);
    if (jersey) {
      ctx.drawImage(jersey, 0, 0, W, H);
    } else {
      ctx.fillStyle = c.jerseyGreen || "#0F3B26";
      ctx.fillRect(0, 0, W, H);
    }

    const chipText = data.competition ? `${data.teamName} · ${data.competition}` : data.teamName;
    drawTeamTag(ctx, chipText);

    const s = LAYOUT.score;
    ctx.fillStyle = c.cream || "#E9EFE9";
    ctx.font = `900 ${s.fontSize}px ${FONTS.black}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Reihenfolge wie beim Duell-Block: Heim-Tore links, Auswärts-Tore
    // rechts – unabhängig davon, ob "eigenes Team" Heim oder Auswärts war.
    const leftGoals = data.isHome ? data.ownGoals : data.oppGoals;
    const rightGoals = data.isHome ? data.oppGoals : data.ownGoals;
    ctx.fillText(`${leftGoals}:${rightGoals}`, s.centerX, s.centerY);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    let outcome = "UNENTSCHIEDEN";
    if (data.ownGoals > data.oppGoals) outcome = "SIEG";
    else if (data.ownGoals < data.oppGoals) outcome = "NIEDERLAGE";
    ctx.font = `900 ${LAYOUT.outcome.fontSize}px ${FONTS.black}`;
    ctx.fillStyle = c.cream || "#E9EFE9";
    ctx.textAlign = "center";
    ctx.fillText(outcome, LAYOUT.outcome.centerX, LAYOUT.outcome.y);
    ctx.textAlign = "left";

    const mtsvImg = await safeLoadImage(window.APP_CONFIG.club.logo);
    const opponentImg = await safeLoadImage(data.opponentLogo);

    if (data.scorers && data.scorers.length) {
      const sc = LAYOUT.scorers;
      const ownScorers = data.scorers.filter(scorerIsOwnTeam);
      const oppScorers = data.scorers.filter((s2) => !scorerIsOwnTeam(s2));
      // Gleiche Heim/Auswärts-Logik wie beim Spielstand: links = Heim,
      // rechts = Auswärts.
      const leftScorers = data.isHome ? ownScorers : oppScorers;
      const rightScorers = data.isHome ? oppScorers : ownScorers;

      // Dünner Trennstrich zwischen den beiden Team-Spalten, wie im
      // Original-Design von vor einigen Wochen.
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, sc.centerY - sc.dividerHalfHeight);
      ctx.lineTo(W / 2, sc.centerY + sc.dividerHalfHeight);
      ctx.stroke();

      ctx.font = `900 ${sc.fontSize}px ${FONTS.condensed}`;
      ctx.fillStyle = c.cream || "#E9EFE9";

      const rowCount = Math.max(leftScorers.length, rightScorers.length, 1);
      const startY = sc.centerY - ((rowCount - 1) * sc.rowGap) / 2;

      leftScorers.forEach((entry, i) => {
        const y = startY + i * sc.rowGap;
        const label = `${entry.minute}' ${entry.name.toUpperCase()}`;
        ctx.textAlign = "right";
        ctx.fillText(label, W / 2 - 20, y + sc.fontSize * 0.35);
      });

      rightScorers.forEach((entry, i) => {
        const y = startY + i * sc.rowGap;
        const label = `${entry.minute}' ${entry.name.toUpperCase()}`;
        ctx.textAlign = "left";
        ctx.fillText(label, W / 2 + 20, y + sc.fontSize * 0.35);
      });
      ctx.textAlign = "left";
    }

    // Duell-Block: beim Ergebnis steht das eigene Team links, der Gegner
    // rechts (wie im Referenzbild "4:4" – MTSV links, Gegner rechts).
    // Duell-Block: Reihenfolge wie tatsächlich gespielt – Heimmannschaft
    // links, Auswärtsmannschaft rechts (unabhängig davon, ob das eigene
    // Team oder der Gegner Heimrecht hatte).
    if (data.isHome) {
      drawMatchup(ctx, mtsvImg, "MTSV", opponentImg, data.opponentName);
    } else {
      drawMatchup(ctx, opponentImg, data.opponentName, mtsvImg, "MTSV");
    }
    await drawSponsorBar(ctx);
  }

  // -------------------------------------------------------------------------
  // Ankündigungs-Post
  // -------------------------------------------------------------------------

  function drawAnnounceBackground(ctx, photoImg) {
    if (photoImg) {
      const scale = Math.max(W / photoImg.width, H / photoImg.height);
      const dw = photoImg.width * scale;
      const dh = photoImg.height * scale;
      ctx.drawImage(photoImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.fillStyle = "rgba(22,86,50,0.30)";
      ctx.fillRect(0, 0, W, H);
    } else {
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

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "rgba(6,26,17,0.25)");
    gradient.addColorStop(0.45, "rgba(6,26,17,0.55)");
    gradient.addColorStop(1, "rgba(6,26,17,0.92)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  async function renderAnkuendigung(ctx, data) {
    const photoImg = await safeLoadImage(data.teamPhoto);
    drawAnnounceBackground(ctx, photoImg);

    drawTeamTag(ctx, data.teamName);

    const metaParts = [];
    if (data.matchday) metaParts.push(`Spieltag ${data.matchday}`);
    if (data.dateLine) metaParts.push(data.dateLine);
    if (data.timeLine) metaParts.push(`${data.timeLine} Uhr`);
    drawMetaLine(ctx, metaParts.join(" · "));

    drawBigHeadline(ctx, data.competition || "Spieltag");

    drawVenueLine(ctx, data.venueLine);

    const mtsvImg = await safeLoadImage(window.APP_CONFIG.club.logo);
    const opponentImg = await safeLoadImage(data.opponentLogo);
    // Duell-Block: gleiche Heim/Auswärts-Logik wie beim Ergebnis.
    if (data.isHome) {
      drawMatchup(ctx, mtsvImg, "MTSV", opponentImg, data.opponentName);
    } else {
      drawMatchup(ctx, opponentImg, data.opponentName, mtsvImg, "MTSV");
    }

    await drawSponsorBar(ctx);
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
