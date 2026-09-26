/*
 * Gera as imagens do README: capturas das telas (docs/screenshots) e o banner (docs/banner.png).
 *
 * Como funciona: exporta a versão web do app, sobe um servidor local, abre o app num
 * Chromium do tamanho de um iPhone com dados de exemplo e tira as capturas. O banner é
 * uma página HTML montada aqui mesmo com as capturas, fotografada no final.
 *
 * Uso:
 *   npx playwright install chromium   # só na primeira vez
 *   npm run screenshots
 */
import { execSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const webDir = join(root, "dist-web");
const shotsDir = join(root, "docs", "screenshots");
const PORT = 8765;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".ttf": "font/ttf",
};

// Servidor estático simples; rotas desconhecidas caem no index.html (o app é uma SPA)
const serve = () =>
  new Promise((done) => {
    const server = http.createServer((req, res) => {
      let file = join(webDir, decodeURIComponent(req.url.split("?")[0]));
      if (!existsSync(file) || statSync(file).isDirectory()) {
        file = join(webDir, "index.html");
      }
      res.setHeader(
        "Content-Type",
        MIME[extname(file)] ?? "application/octet-stream",
      );
      createReadStream(file).pipe(res);
    });
    server.listen(PORT, () => done(server));
  });

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Dados de exemplo que aparecem nas capturas
const seed = {
  "fokus-tasks": [
    { id: "1", description: "Estudar React Native", pomodoros: 3 },
    { id: "2", description: "Revisar o PR", completed: true, pomodoros: 1 },
    { id: "3", description: "Ler 10 páginas" },
    { id: "4", description: "Beber água 💧" },
  ],
  "fokus-timer": {
    typeId: "focus",
    pausedSeconds: null,
    segments: null,
    processed: 0,
    stats: { date: today(), count: 3 },
    currentTaskId: "1",
  },
};

const captureScreens = async (browser) => {
  const base = `http://localhost:${PORT}`;
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const shot = (name) =>
    page.screenshot({ path: join(shotsDir, `${name}.png`) });
  const open = async (path) => {
    await page.goto(base + path);
    await page.waitForTimeout(1200);
  };

  await page.goto(base);
  await page.evaluate((data) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, seed);

  await open("/");
  await shot("home");

  await open("/pomodoro");
  await page.getByText("Começar").click();
  await page.waitForTimeout(2300);
  await shot("timer");
  await page.getByText("Pausar").click();

  await page.getByText("Estudar React Native").click();
  await page.waitForTimeout(700);
  await shot("escolher-tarefa");

  await open("/pomodoro");
  await page.getByText("Pausa longa").click();
  await page.waitForTimeout(600);
  await shot("pausa-longa");
  await page.getByText("Foco", { exact: true }).click();

  await open("/tasks");
  await shot("tarefas");

  await open("/add-task");
  await page.locator("textarea").fill("Terminar o README do Fokus");
  await shot("nova-tarefa");

  await open("/settings");
  await shot("configuracoes");

  await page.close();
};

const bannerHtml = () => {
  const img = (path) => `file://${join(root, path)}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1280px;height:640px;overflow:hidden;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;
background:radial-gradient(circle at 78% 35%,#3b1d6e 0,transparent 45%),radial-gradient(circle at 15% 90%,#0f3a6b 0,transparent 45%),#021123;
display:flex;align-items:center;padding:0 60px 0 72px;gap:30px;position:relative}
.dots{position:absolute;inset:0;background-image:radial-gradient(#ffffff14 1px,transparent 1px);background-size:22px 22px}
.left{flex:0 0 470px;position:relative;z-index:1}
.logo{height:62px;margin-bottom:34px}
h1{font-size:50px;line-height:1.08;font-weight:800;letter-spacing:-1px}
h1 span{background:linear-gradient(90deg,#B872FF,#00F4BF);-webkit-background-clip:text;color:transparent}
p{margin-top:20px;font-size:21px;color:#98A0A8;line-height:1.45}
.chips{margin-top:28px;display:flex;gap:10px;flex-wrap:wrap}
.chip{border:1.5px solid #144480;background:#14448066;padding:8px 14px;border-radius:999px;font-size:15px}
.phones{flex:1;position:relative;height:640px;z-index:1}
.phone{position:absolute;width:236px;height:510px;border-radius:36px;padding:9px;background:#0b1a33;border:2px solid #2a4a80;box-shadow:0 30px 60px #0009}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:28px;display:block}
.p1{left:-20px;top:95px;transform:rotate(-8deg)}
.p2{left:180px;top:55px;z-index:2;box-shadow:0 40px 80px #000b,0 0 60px #B872FF55}
.p3{left:380px;top:95px;transform:rotate(8deg)}
</style></head><body><div class="dots"></div>
<div class="left"><img class="logo" src="${img("assets/images/logo.png")}">
<h1>Foco de verdade,<br><span>mesmo com a tela bloqueada.</span></h1>
<p>Timer Pomodoro + lista de tarefas feito com React Native e Expo.</p>
<div class="chips"><span class="chip">🍅 Pomodoro</span><span class="chip">🔔 Notificações</span><span class="chip">✅ Tarefas</span></div></div>
<div class="phones">
<div class="phone p1"><img src="${img("docs/screenshots/home.png")}"></div>
<div class="phone p2"><img src="${img("docs/screenshots/timer.png")}"></div>
<div class="phone p3"><img src="${img("docs/screenshots/tarefas.png")}"></div>
</div></body></html>`;
};

const renderBanner = async (browser) => {
  const htmlFile = join(root, "dist-web", "banner.html");
  writeFileSync(htmlFile, bannerHtml());
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(`file://${htmlFile}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(root, "docs", "banner.png") });
  await page.close();
};

console.log("Exportando a versão web...");
rmSync(webDir, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir ${webDir}`, {
  cwd: root,
  stdio: "inherit",
});

mkdirSync(shotsDir, { recursive: true });
const server = await serve();
const browser = await chromium.launch();
try {
  console.log("Tirando as capturas...");
  await captureScreens(browser);
  console.log("Montando o banner...");
  await renderBanner(browser);
  console.log("Pronto: docs/screenshots e docs/banner.png atualizados.");
} finally {
  await browser.close();
  server.close();
  rmSync(webDir, { recursive: true, force: true });
}
