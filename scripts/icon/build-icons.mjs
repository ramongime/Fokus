// Gera os ícones do app (icon, adaptive-icon, splash-icon, favicon) a partir de SVG,
// usando as cores de constants/theme.js. Rode: node scripts/icon/build-icons.mjs
// Requer: npx playwright install chromium
import { writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { chromium } from "playwright";

const c = {
  background: "#021123",
  surface: "#144480",
  primary: "#B872FF",
  success: "#00F4BF",
  text: "#FFFFFF",
};

// Símbolo: anel de timer (progresso em 3/4) com o alvo do Fokus no centro.
// scale < 1 encolhe o símbolo para caber na área segura (adaptive icon / splash).
const symbol = (scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <circle cx="512" cy="512" r="330" fill="none" stroke="${c.surface}" stroke-width="64"/>
    <path d="M 512 182 A 330 330 0 1 1 182 512" fill="none"
      stroke="${c.primary}" stroke-width="64" stroke-linecap="round"/>
    <g fill="none" stroke="${c.text}" stroke-linecap="round">
      <circle cx="512" cy="512" r="118" stroke-width="40"/>
      <path stroke-width="36" d="M 512 300 V 352 M 512 672 V 724 M 300 512 H 352 M 672 512 H 724"/>
    </g>
    <circle cx="512" cy="512" r="38" fill="${c.success}"/>
  </g>`;

const defs = `
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.4" r="0.75">
      <stop offset="0" stop-color="#0A2A55"/>
      <stop offset="1" stop-color="${c.background}"/>
    </radialGradient>
  </defs>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${defs}${body}</svg>`;

const icons = {
  // iOS / geral: fundo cheio (iOS aplica o arredondamento)
  "icon.png": svg(
    `<rect width="1024" height="1024" fill="url(#bg)"/>${symbol(0.92)}`,
  ),
  // Android: fundo vem de app.json; símbolo dentro da área segura (~66%)
  "adaptive-icon.png": svg(symbol(0.62)),
  // Splash: só o símbolo, fundo vem do plugin expo-splash-screen
  "splash-icon.png": svg(symbol(1)),
  "favicon.png": svg(
    `<rect width="1024" height="1024" rx="220" fill="url(#bg)"/>${symbol(0.92)}`,
  ),
};

writeFileSync(
  new URL("../../assets/images/icon.svg", import.meta.url),
  icons["icon.png"],
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
for (const [file, markup] of Object.entries(icons)) {
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup}</body></html>`,
  );
  const size = file === "favicon.png" ? 48 : 1024;
  await page.setViewportSize({ width: 1024, height: 1024 });
  const buf = await page.locator("svg").screenshot({ omitBackground: true });
  const out = new URL(`../../assets/images/${file}`, import.meta.url);
  if (size === 1024) {
    writeFileSync(out, buf);
  } else {
    // Reduz via canvas para o favicon
    const small = await page.evaluate(
      async ({ b64, size }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = cv.height = size;
        cv.getContext("2d").drawImage(img, 0, 0, size, size);
        return cv.toDataURL("image/png").split(",")[1];
      },
      { b64: buf.toString("base64"), size },
    );
    writeFileSync(out, Buffer.from(small, "base64"));
  }
  console.log("ok", file);
}
await browser.close();
