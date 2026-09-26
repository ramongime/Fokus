# Fokus

App de Pomodoro com lista de tarefas, em React Native + Expo (SDK 52), JavaScript/JSX.
UI em português (pt-BR).

## Comandos

```bash
npm install
npx expo start        # Expo Go, emulador ou web
npx expo run:ios      # build nativo (passo a passo em Documentos/)
```

Não há ESLint instalado nas devDependencies, embora exista `eslint.config.js`; para rodar o
lint, instale `eslint` e `eslint-config-expo` antes.

## Estrutura

```
app/                       # rotas do expo-router (uma tela por arquivo)
  _layout.jsx              # Providers + GestureHandlerRootView + Drawer
  index.jsx                # landing, sem header e fora do menu
  pomodoro.jsx             # tela do timer
  tasks/index.jsx          # lista de tarefas
  add-task/index.jsx       # criar tarefa (usa FormTask)
  edit-task/[id].jsx       # editar tarefa (usa FormTask com defaultValue)
components/
  <Componente>/index.jsx   # componentes visuais, recebem dados e callbacks por props
  Icons/index.jsx          # ícones SVG (react-native-svg), exports IconXxx
  context/
    TaskProvider.jsx       # estado das tarefas + AsyncStorage ("fokus-tasks")
    useTaskContext.js
    TimerProvider.jsx      # estado do timer + AsyncStorage ("fokus-timer")
    useTimerContext.js
    timerNotifications.js  # agendar/cancelar notificação local (expo-notifications)
constants/
  pomodoro.js              # modos do timer: id, duração, imagem, texto e notificação
Documentos/                # tutoriais de build iOS
.claude/skills/expo-app-pattern/  # padrão de arquitetura para reutilizar em outros apps
```

## Como funciona

- **Estado global**: cada domínio tem um `XProvider` (estado, persistência e ações) e um
  hook `useXContext` que lança erro fora do Provider. Telas usam só o hook; componentes
  visuais não acessam contexto.
- **Persistência**: o Provider lê o AsyncStorage ao montar e só grava depois de
  `isLoaded`, para não sobrescrever os dados salvos com o estado inicial.
- **Timer**: o `TimerProvider` guarda o horário de término (`endTime`), não um contador. O
  tempo restante é recalculado a partir dele a cada tick e quando o app volta para
  primeiro plano (`AppState`). Por isso o tempo fica certo mesmo com a tela bloqueada,
  quando o JS do app fica suspenso.
- **Notificação**: ao iniciar, uma notificação local é agendada para `endTime` no sistema
  operacional, que a entrega mesmo com o app suspenso ou fechado. Pausar ou trocar de modo
  cancela a notificação. A permissão é pedida na primeira vez que o timer inicia.
- **Navegação**: Drawer do expo-router. Telas de adicionar/editar ficam escondidas do menu
  (`drawerItemStyle: { display: "none" }`) e têm `BackButtonDrawer` no header.

## Convenções

- Estilos com `StyleSheet.create` no fim do arquivo. Cores atuais: fundo `#021123`,
  primária `#B872FF`, superfície `#144480`, cinza `#98A0A8`.
- Variações visuais por prop booleana (`outline`, `active`, `completed`).
- Configurações estáticas como array de objetos `{ id, display, ... }` em `constants/`.
- Novos IDs: `Date.now().toString()`. Tarefas antigas podem ter ID numérico, por isso a
  comparação de ID de tarefa usa `==`.
- Mudanças de dependência nativa: use a versão de `node_modules/expo/bundledNativeModules.json`
  (equivalente a `npx expo install`).

## Pendências conhecidas

- `app/index.jsx` usa `assets/images/home.png`, que não está versionado.
