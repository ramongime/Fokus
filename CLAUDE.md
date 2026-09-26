# Fokus

App de Pomodoro com lista de tarefas, em React Native + Expo (SDK 52), JavaScript/JSX.
UI em português (pt-BR).

## Comandos

```bash
npm install
npx expo start        # Expo Go, emulador ou web
npx expo run:ios      # build nativo (passo a passo em Documentos/)
npm test              # Jest (jest-expo); testes em *.test.js ao lado do código
npm run lint          # ESLint (eslint-config-expo); precisa passar sem avisos
npm run format        # Prettier em app/, components/, constants/ e scripts/
npm run screenshots   # regenera docs/banner.png e docs/screenshots (Playwright)
```

O CI (`.github/workflows/ci.yml`) roda `npm ci`, lint, testes e o bundle Android a cada push
na `main` e em PRs. Rode lint e testes antes de commitar.

```bash
npx playwright install chromium   # uma vez, antes do primeiro npm run screenshots
```

## Estrutura

```
app/                       # rotas do expo-router (uma tela por arquivo)
  _layout.jsx              # Providers + GestureHandlerRootView + Drawer
  index.jsx                # landing, sem header e fora do menu
  pomodoro.jsx             # tela do timer (tarefa do foco, contador do dia)
  history.jsx              # histórico da semana (gráfico, tempo focado, sequência)
  settings.jsx             # configurações (ciclos e durações)
  tasks/index.jsx          # lista de tarefas
  add-task/index.jsx       # criar tarefa (usa FormTask)
  edit-task/[id].jsx       # editar tarefa (usa FormTask com defaultValue)
components/
  <Componente>/index.jsx   # componentes visuais, recebem dados e callbacks por props
  Icons/index.jsx          # ícones SVG (react-native-svg), exports IconXxx
  context/
    TaskProvider.jsx       # estado das tarefas + AsyncStorage ("fokus-tasks")
    useTaskContext.js
    SettingsProvider.jsx   # configurações + AsyncStorage ("fokus-settings")
    useSettingsContext.js
    TimerProvider.jsx      # timer, ciclos, contador do dia + AsyncStorage ("fokus-timer")
    useTimerContext.js
    timerLogic.js          # funções puras do timer, testadas em timerLogic.test.js
    historyLogic.js        # histórico por dia, semana e sequência (historyLogic.test.js)
    timerNotifications.js  # agendar/cancelar notificações locais (expo-notifications)
constants/
  theme.js                 # cores (colors), tamanhos de fonte (fontSizes) e raios (radii)
  settings.js              # configurações padrão e limites
  pomodoro.js              # modos do timer: id, imagem, texto e notificação
Documentos/                # tutoriais de build iOS
docs/                      # banner e screenshots usados no README
.claude/skills/expo-app-pattern/  # padrão de arquitetura para reutilizar em outros apps
```

## Como funciona

- **Estado global**: cada domínio tem um `XProvider` (estado, persistência e ações) e um
  hook `useXContext` que lança erro fora do Provider. Telas usam só o hook; componentes
  visuais não acessam contexto.
- **Persistência**: o Provider lê o AsyncStorage ao montar e só grava depois de
  `isLoaded`, para não sobrescrever os dados salvos com o estado inicial.
- **Ordem dos Providers** (`_layout.jsx`): `SettingsProvider` > `TasksProvider` > `TimerProvider`,
  porque o timer lê as configurações e soma pomodoros nas tarefas.
- **Timer**: ao dar play, `buildPlan` monta os ciclos com horário de término
  (`segments: [{ typeId, endTime }]`): só o atual, ou os próximos 8 se "Emendar ciclos" estiver
  ligado. O tempo exibido e o ciclo atual são derivados de `Date.now()` a cada tick e quando o
  app volta para primeiro plano (`AppState`), então tudo continua certo com a tela bloqueada ou
  o app fechado. Ciclos que terminaram são contabilizados uma vez só (`processed` + ref): somam
  no histórico (`history`) e, se for foco, na tarefa escolhida (`pomodoros`).
- **Histórico**: `history` no `fokus-timer` é `{ "AAAA-MM-DD": { count, minutes } }`, com os
  últimos 90 dias. O dia é o do fim do foco e os minutos vêm de `startTime`/`endTime` do ciclo.
  O antigo `stats` (`{ date, count }`, só de hoje) é convertido ao carregar. A tela de
  histórico deriva semana, totais e sequência com `historyLogic.js`.
- **Fim do plano**: o timer para no próximo modo sugerido (pausa longa a cada
  `longBreakInterval` focos do dia).
- **Durações**: vêm das configurações; `pausedSeconds = null` significa "duração cheia", então
  mudar a configuração reflete na hora quando o timer não foi iniciado.
- **Notificação**: uma por ciclo planejado, agendada no sistema operacional. Pausar ou trocar de
  modo cancela todas. A permissão é pedida no primeiro play.
- **Vibração**: com a tela bloqueada o JS não roda, então quem vibra é a notificação. No
  Android há dois canais (`cycles`, com vibração, e `cycles-quiet`), porque um canal não muda
  depois de criado; o canal antigo `timer` é apagado. Com o app aberto e sem notificações
  agendadas (permissão negada ou web), o app vibra com `Vibration` (`shouldVibrateInApp`).
- **Boas-vindas**: `app/index.jsx` aparece só até o primeiro "Quero iniciar!"
  (`settings.hasSeenWelcome`); depois redireciona direto para `/pomodoro`.
- **Navegação**: Drawer do expo-router. Telas de adicionar/editar ficam escondidas do menu
  (`drawerItemStyle: { display: "none" }`) e têm `BackButtonDrawer` no header.

## Android e iOS

- Identificador `com.ramongime.fokus` nos dois (`ios.bundleIdentifier`, `android.package`).
- Projetos nativos são gerados pelo `expo prebuild` (`/ios` e `/android` estão no `.gitignore`).
- Permissões Android: `VIBRATE` e `SCHEDULE_EXACT_ALARM` no `app.json`; notificações vêm do
  `expo-notifications`. Armazenamento e `SYSTEM_ALERT_WINDOW` do template estão em
  `android.blockedPermissions`, porque o app não usa.
- `eslint-config-expo` está em `expo.install.exclude`: é só do lint e usa a versão 9 de
  propósito (a 8, do SDK 52, não tem configuração flat).

## Ícone

O símbolo de alvo do logo está em `assets/images/icon.svg`. `icon.png`, `adaptive-icon.png`,
`splash-icon.png` e `favicon.png` foram gerados a partir dele, sobre o azul `#021123`
(o mesmo fundo da tela de abertura e do ícone adaptativo no `app.json`).

## Convenções

- Estilos com `StyleSheet.create` no fim do arquivo, usando sempre `colors`, `fontSizes`
  e `radii` de `constants/theme.js`; nada de hex solto nos componentes.
- Código formatado com Prettier (aspas duplas, ponto e vírgula).
- Comentários explicam o porquê. Arquivos de lógica (`timerLogic.js`, `TimerProvider.jsx`,
  `timerNotifications.js`, `SettingsProvider.jsx`) têm um bloco no topo com o papel do
  arquivo; funções exportadas de `timerLogic.js` têm uma linha dizendo o que fazem.
- Ações destrutivas pedem confirmação com `ConfirmModal` (o `Alert` nativo não funciona na web).
- `Pressable` só com ícone precisa de `accessibilityRole` e `accessibilityLabel`.
- Quando a UI mudar, rode `npm run screenshots` para atualizar as imagens do README.
- Variações visuais por prop booleana (`outline`, `active`, `completed`).
- Configurações estáticas como array de objetos `{ id, display, ... }` em `constants/`.
- IDs são strings (`Date.now().toString()`) e comparados com `===`. O `TaskProvider`
  converte para string os IDs numéricos de tarefas salvas em versões antigas.
- Mudanças de dependência nativa: use a versão de `node_modules/expo/bundledNativeModules.json`
  (equivalente a `npx expo install`).

## Web

`app.json` usa `web.output: "single"` (SPA). Com `"static"`, a pré-renderização gera erros de
hidratação, porque tarefas e timer vêm do armazenamento local só no cliente.
