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

  const LAYOUT = {
    flag: { rightMargin: 91, width: 55, top: 0, height: 207 },
    presenter: {
      centerX: 540,
      labelY: 88,
      labelSize: 23,
      brandY: 168,
      brandSize: 66,
    },
    chip: {
      left: 64,
      top: 250,
      height: 54,
      paddingX: 28,
      fontSize: 25,
    },
    logoBoxResult: { x: 302, y: 857, w: 476, h: 179, radius: 26, padding: 26, gap: 40 },
    logoBoxAnnounce: { x: 64, y: 1050, w: 316, h: 179, radius: 26, padding: 24, gap: 0 },
    score: { centerX: 540, centerY: 585, fontSize: 230 },
    scorers: { centerX: 540, y: 1255, fontSize: 34 },
    headline: { x: 64, bottom: 900, fontSize: 92, lineHeight: 96, skewDeg: -11 },
    matchInfoRight: { gap: 40 },
    matchday: { centerX: 540, y: 1300, fontSize: 26 },
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

  function drawFlagCorner(ctx) {
    const c = COLORS();
    const { rightMargin, width, top, height } = LAYOUT.flag;
    const x = W - rightMargin - width;
    const bandH = height / 3;
    ctx.fillStyle = c.flagGreen;
    ctx.fillRect(x, top, width, bandH);
    ctx.fillStyle = c.flagWhite;
    ctx.fillRect(x, top + bandH, width, bandH);
    ctx.fillStyle = c.flagRed;
    ctx.fillRect(x, top + bandH * 2, width, bandH);
  }

  function drawPresenter(ctx, label, brand) {
    const { centerX, labelY, labelSize, brandY, brandSize } = LAYOUT.presenter;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `600 ${labelSize}px ${FONTS.condensed}`;
    ctx.textBaseline = "alphabetic";
    drawLetterSpaced(ctx, label.toUpperCase(), centerX, labelY, 2.5, "center");

    ctx.font = `900 ${brandSize}px ${FONTS.black}`;
    ctx.textAlign = "center";
    ctx.fillText(brand.toUpperCase(), centerX, brandY);
    ctx.textAlign = "left";
  }

  function drawChip(ctx, text) {
    const { left, top, height, paddingX, fontSize } = LAYOUT.chip;
    ctx.font = `600 ${fontSize}px ${FONTS.condensed}`;
    const upper = text.toUpperCase();
    const letterSpacing = 1.5;
    const widths = [...upper].map((ch) => ctx.measureText(ch).width);
    const textWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * (upper.length - 1);
    const w = textWidth + paddingX * 2;

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRectPath(ctx, left, top, w, height, height / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    const textY = top + height / 2 + fontSize * 0.35;
    drawLetterSpaced(ctx, upper, left + paddingX, textY, letterSpacing, "left");
    return w;
  }

  function fitContain(img, slotW, slotH) {
    const scale = Math.min(slotW / img.width, slotH / img.height);
    return { w: img.width * scale, h: img.height * scale };
  }

  function drawLogoBox(ctx, box, mtsvImg, opponentImg) {
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    roundRectPath(ctx, box.x, box.y, box.w, box.h, box.radius);
    ctx.fill();
    ctx.clip();

    const slotW = (box.w - box.padding * 2 - box.gap) / 2;
    const slotH = box.h - box.padding * 2;

    const leftSlotX = box.x + box.padding;
    const rightSlotX = leftSlotX + slotW + box.gap;
    const slotY = box.y + box.padding;

    if (mtsvImg) {
      const size = fitContain(mtsvImg, slotW, slotH);
      const dx = leftSlotX + (slotW - size.w) / 2;
      const dy = slotY + (slotH - size.h) / 2;
      ctx.drawImage(mtsvImg, dx, dy, size.w, size.h);
    }
    if (opponentImg) {
      const size = fitContain(opponentImg, slotW, slotH);
      const dx = rightSlotX + (slotW - size.w) / 2;
      const dy = slotY + (slotH - size.h) / 2;
      ctx.drawImage(opponentImg, dx, dy, size.w, size.h);
    } else {
      ctx.fillStyle = "#C9D2CC";
      ctx.font = `600 20px ${FONTS.condensed}`;
      ctx.textAlign = "center";
      ctx.fillText("GEGNER-LOGO", rightSlotX + slotW / 2, slotY + slotH / 2 + 7);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Ergebnis-Post
  // -------------------------------------------------------------------------

  async function renderErgebnis(ctx, data) {
    const c = COLORS();
    const jersey = await loadImage(window.APP_CONFIG.jerseyBg);
    ctx.drawImage(jersey, 0, 0, W, H);

    drawFlagCorner(ctx);
    drawPresenter(ctx, "Das Ergebnis wird präsentiert von", window.APP_CONFIG.club.presenter);

    const chipText = data.competition
      ? `${data.teamName} · ${data.competition}`
      : data.teamName;
    drawChip(ctx, chipText);

    // Spielstand
    const s = LAYOUT.score;
    ctx.fillStyle = c.cream;
    ctx.font = `900 ${s.fontSize}px ${FONTS.black}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${data.ownGoals}:${data.oppGoals}`, s.centerX, s.centerY);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Logo-Box
    const mtsvImg = await loadImage(window.APP_CONFIG.club.logo);
    const opponentImg = data.opponentLogo ? await loadImage(data.opponentLogo) : null;
    drawLogoBox(ctx, LAYOUT.logoBoxResult, mtsvImg, opponentImg);

    // Torschützen
    if (data.scorers && data.scorers.length) {
      const parts = data.scorers.map((sc) => `${sc.minute}' ${sc.name.toUpperCase()}`);
      const line = parts.join("   |   ");
      ctx.fillStyle = c.cream;
      ctx.font = `900 ${LAYOUT.scorers.fontSize}px ${FONTS.condensed}`;
      ctx.textAlign = "center";
      ctx.fillText(line, LAYOUT.scorers.centerX, LAYOUT.scorers.y);
      ctx.textAlign = "left";
    }
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
    } else {
      ctx.fillStyle = "#123322";
      ctx.fillRect(0, 0, W, H);
      // Kreuzraster-Platzhaltermuster
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
    gradient.addColorStop(0, "rgba(6,26,17,0.15)");
    gradient.addColorStop(0.55, "rgba(6,26,17,0.55)");
    gradient.addColorStop(1, "rgba(6,26,17,0.94)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  function drawHeadline(ctx, text) {
    const h = LAYOUT.headline;
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${h.fontSize}px ${FONTS.condensed}`;
    ctx.textAlign = "left";

    const words = text.toUpperCase().split(" ");
    const maxWidth = W - h.x - 60;
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

    const totalHeight = lines.length * h.lineHeight;
    let y = h.bottom - totalHeight + h.lineHeight * 0.8;

    const skew = Math.tan((h.skewDeg * Math.PI) / 180);
    for (const l of lines) {
      ctx.save();
      ctx.transform(1, 0, skew, 1, 0, 0);
      // Skew um den Textursprung: x-Position anpassen, da transform global wirkt
      const adjX = h.x - skew * y;
      ctx.fillText(l, adjX, y);
      ctx.restore();
      y += h.lineHeight;
    }
    ctx.restore();
  }

  async function renderAnkuendigung(ctx, data) {
    const c = COLORS();
    const photoImg = data.teamPhoto ? await loadImage(data.teamPhoto) : null;
    drawAnnounceBackground(ctx, photoImg);

    drawFlagCorner(ctx);
    drawPresenter(ctx, "Der Spieltag wird präsentiert von", window.APP_CONFIG.club.presenter);
    drawChip(ctx, data.teamName);

    drawHeadline(ctx, data.competition || "Spieltag");

    // Logo-Box unten links
    const box = LAYOUT.logoBoxAnnounce;
    const mtsvImg = await loadImage(window.APP_CONFIG.club.logo);
    const opponentImg = data.opponentLogo ? await loadImage(data.opponentLogo) : null;
    drawLogoBox(ctx, box, mtsvImg, opponentImg);

    // Textblock rechts neben der Box
    const textX = box.x + box.w + 32;
    const rowH = box.h / 3;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";

    ctx.font = `900 40px ${FONTS.condensed}`;
    ctx.fillText((data.opponentName || "").toUpperCase(), textX, box.y + rowH * 1 - 6);

    ctx.font = `600 26px ${FONTS.condensed}`;
    drawLetterSpaced(
      ctx,
      `${data.dateLine || ""} · ${data.timeLine || ""}`.toUpperCase(),
      textX,
      box.y + rowH * 2 - 2,
      1
    );

    drawLetterSpaced(ctx, (data.venueLine || "").toUpperCase(), textX, box.y + rowH * 3 - 2, 1);

    // Spieltag-Nr unten
    ctx.fillStyle = c.cream;
    ctx.font = `600 ${LAYOUT.matchday.fontSize}px ${FONTS.condensed}`;
    ctx.textAlign = "center";
    drawLetterSpaced(
      ctx,
      `SPIELTAG ${data.matchday || ""}`,
      LAYOUT.matchday.centerX,
      LAYOUT.matchday.y,
      3,
      "center"
    );
    ctx.textAlign = "left";
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
