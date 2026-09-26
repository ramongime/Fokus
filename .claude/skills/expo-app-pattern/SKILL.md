---
name: expo-app-pattern
description: Padrão de arquitetura do Ramon para apps mobile em React Native + Expo (extraído do projeto Fokus). Use ao criar um app Expo novo, adicionar uma tela, um CRUD, um Context/Provider, persistência local com AsyncStorage, navegação com expo-router (Drawer) ou componentes visuais (botões, cards, formulários, ícones SVG) em projetos React Native do Ramon. Também cobre configurações do usuário, lógica pura com testes (jest-expo), modais de confirmação, acessibilidade, CI e geração de screenshots. Triggers: "novo app", "nova tela", "novo CRUD", "expo", "react native", "expo-router", "drawer", "context", "provider", "AsyncStorage", "configurações", "testes", "padrão do Fokus".
---

# Padrão de app Expo (base: Fokus)

Esta skill descreve como os apps React Native do Ramon são estruturados. Siga este padrão
ao criar ou estender um app, a menos que o projeto já tenha convenções diferentes; nesse
caso, siga o projeto e aponte a divergência.

O padrão vem do app Fokus (Pomodoro + lista de tarefas). Onde o Fokus tinha bugs ou
atalhos de curso, esta skill já traz a versão corrigida, marcada com **(corrigido)**.

## Stack

| Item | Escolha |
|---|---|
| Framework | Expo (SDK atual, `npx create-expo-app@latest`) |
| Linguagem | JavaScript + JSX (`.jsx` para componentes/telas, `.js` para hooks e utilitários) |
| Navegação | `expo-router` com rotas por arquivo em `app/`; menu lateral com `expo-router/drawer` |
| Estado global | React Context: um `XProvider` + um hook `useXContext` por domínio |
| Persistência | `@react-native-async-storage/async-storage`, dentro do Provider |
| Estilo | `StyleSheet.create` no fim de cada arquivo; cores vindas de `constants/theme.js` |
| Ícones | SVG próprios com `react-native-svg` em `components/Icons`; `@expo/vector-icons` para ícones genéricos (ex.: voltar) |
| Idioma da UI | Português (pt-BR) |
| Testes | Jest com `jest-expo`; arquivos `*.test.js` ao lado do código |
| Qualidade | ESLint (`eslint-config-expo`) + Prettier; CI no GitHub Actions |

## Estrutura de pastas

```
app/
  _layout.jsx            # Providers + GestureHandlerRootView + Drawer
  index.jsx              # tela inicial / landing (sem header, fora do menu)
  <feature>.jsx          # tela simples (ex.: pomodoro.jsx)
  <recurso>/index.jsx    # lista do recurso (ex.: tasks/index.jsx)
  add-<recurso>/index.jsx
  edit-<recurso>/[id].jsx
components/
  <NomeComponente>/index.jsx   # um componente por pasta, PascalCase
  Icons/index.jsx              # todos os ícones SVG, exports nomeados IconXxx
  ConfirmModal/index.jsx       # confirmação no visual do app (o Alert nativo não funciona na web)
  context/
    <Recurso>Provider.jsx
    use<Recurso>Context.js
    SettingsProvider.jsx       # configurações do usuário
    <dominio>Logic.js          # regras puras do domínio, sem React
    <dominio>Logic.test.js
constants/
  theme.js               # cores, tamanhos de fonte, raios (corrigido: no Fokus eram hex soltos)
  settings.js            # configurações padrão e limites (min/max)
scripts/
  screenshots.mjs        # gera as imagens do README com Playwright
.github/workflows/ci.yml # lint + testes + bundle a cada push/PR
assets/images/, assets/fonts/
Documentos/              # tutoriais de build e anotações do projeto
```

## Regras principais

1. **Telas ficam finas.** Uma tela em `app/` pega dados do hook de contexto, monta a UI com
   componentes e navega com `router.navigate(...)`. Lógica de dados fica no Provider.
2. **Um Provider por domínio**, exportando o estado e as ações (`addX`, `updateX`,
   `deleteX`, `toggleX...`). O hook `useXContext` lança erro se usado fora do Provider.
   Detalhes e template: `references/state-and-persistence.md`.
3. **Formulário reutilizado para criar e editar.** Um componente `FormX` recebe
   `onFormSubmit` e `defaultValue`; a tela `add-x` e a tela `edit-x/[id]` só mudam o que
   passam para ele. Veja `references/screens-and-navigation.md`.
4. **Listas usam `FlatList`** com `keyExtractor`, `ItemSeparatorComponent`,
   `ListHeaderComponent`, `ListFooterComponent` (botão de adicionar) e
   `ListEmptyComponent` (mensagem amigável).
5. **Componentes de UI são burros**: recebem dados e callbacks por props
   (`onPressEdit`, `onPressDelete`, `onToggleComplete`), não acessam contexto.
6. **Variações visuais por prop booleana** (`outline`, `active`, `completed`) combinadas
   com array de estilos: `style={[styles.button, outline && styles.outlineButton]}`.
7. **Telas secundárias no Drawer** (add/edit) ficam escondidas do menu com
   `drawerItemStyle: { display: "none" }` e ganham um `BackButtonDrawer` no `headerLeft`.
8. **Dados estáticos de configuração** (ex.: os modos do Pomodoro) ficam num array de
   objetos `{ id, display, ... }` no topo do arquivo e a UI é gerada com `.map`.
9. **Timers ficam num Provider e guardam o horário de término**, não um contador: o tempo
   restante é `endTime - Date.now()`, recalculado num `setInterval` e ao voltar para
   primeiro plano (`AppState`). Ao iniciar, agende uma notificação local com
   `expo-notifications` (trigger `DATE`) para `endTime`; cancele ao pausar ou trocar de
   modo. Assim o timer sobrevive à tela bloqueada e ao app fechado. Para vibrar, use o
   canal da notificação no Android (`enableVibrate` + `vibrationPattern`, um canal por
   variação, já que canais não mudam depois de criados) e `Vibration` do React Native só
   como reserva com o app aberto. Referência:
   `TimerProvider.jsx` e `timerNotifications.js` do Fokus.
10. **Formulários** usam `KeyboardAvoidingView` (`padding` no iOS, `height` no Android) +
    `TouchableWithoutFeedback onPress={Keyboard.dismiss}`.
11. **Regras de negócio em funções puras** (`<dominio>Logic.js`): recebem dados e o `now`,
    devolvem um resultado, sem ler relógio, storage ou contexto. O Provider só guarda
    estado e chama essas funções. Cada função exportada ganha um comentário curto do que
    recebe e devolve, com exemplo, e é testada em `<dominio>Logic.test.js`.
12. **Configurações do usuário** num `SettingsProvider`: padrões e limites em
    `constants/settings.js`, e todo valor salvo ou alterado passa por um `normalizeSettings`
    que completa com os padrões e aplica os limites. A tela de configurações usa
    `SettingRow` (rótulo + descrição) com `Switch` ou `Stepper` (−/+).
13. **Providers que dependem de outros** ficam dentro deles no `_layout.jsx` (ex.:
    `SettingsProvider` > `TasksProvider` > `TimerProvider`) e só processam dados quando
    todos os `isLoaded` estão `true`, senão uma escrita pode ser sobrescrita pelo carregamento.
14. **Ações destrutivas pedem confirmação** com `ConfirmModal` (estado `itemToDelete` na
    tela), em vez de `Alert.alert`, que não funciona na versão web.
15. **Acessibilidade**: todo `Pressable` só com ícone recebe `accessibilityRole` e
    `accessibilityLabel` com o nome do item (ex.: `Excluir "Estudar"`); checkboxes usam
    `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`; abas usam `tab` +
    `selected`.
16. **Comentários explicam o porquê**, não o quê: um bloco no topo dos arquivos de lógica
    (papel do arquivo e fluxo) e comentários nas partes não óbvias. Telas e componentes
    simples ficam sem comentário.

Componentes, tema e ícones: `references/components-and-theme.md`.

## Fluxo para adicionar um CRUD novo

1. Crie `components/context/<Recurso>Provider.jsx` e `use<Recurso>Context.js` a partir de
   `templates/ResourceProvider.jsx` e `templates/useResourceContext.js`.
2. Envolva o app com o Provider em `app/_layout.jsx`.
3. Crie `components/<Recurso>Item/index.jsx` (card) e `components/Form<Recurso>/index.jsx`.
4. Crie as telas `app/<recurso>/index.jsx`, `app/add-<recurso>/index.jsx` e
   `app/edit-<recurso>/[id].jsx` a partir de `templates/screens/`.
5. Registre as três telas no `Drawer` (lista visível, add/edit escondidas com botão voltar).
6. Se houver regra de negócio, coloque em `<dominio>Logic.js` com testes.
7. Rode `npm run lint` e `npm test`, e teste no Expo Go.

## Correções em relação ao Fokus original

Ao aplicar o padrão, use sempre a versão corrigida:

- **IDs únicos**: o Fokus usava `id: oldState.length + 1`, que repete IDs depois de uma
  exclusão. Use `Date.now().toString()` (ou `expo-crypto` `randomUUID()`).
- **Imutabilidade**: o Fokus fazia `t.completed = !t.completed` dentro do `map`, mutando o
  objeto. Retorne um objeto novo: `t.id === id ? { ...t, completed: !t.completed } : t`.
- **Comparação de id**: rotas entregam `id` como string; guarde ids como string e compare
  com `===`, em vez de `==`.
- **Persistência**: o efeito de salvar deve depender de `[tasks, isLoaded]`, e erros de
  leitura/escrita devem ao menos ir para `console.warn`, não ficar em `catch` vazio.
- **Cores centralizadas** em `constants/theme.js` em vez de hex repetido em cada arquivo.
- **Sem `console.log` de debug** nem código comentado sobrando nos commits.
- **`scheme` do app.json**: troque o `myapp` padrão pelo slug do app.

## Qualidade e documentação

- `package.json` tem os scripts `lint` (`eslint .`), `format` (Prettier), `test` (`jest`),
  `test:watch` e `screenshots`.
- No `eslint.config.js`, ignore `.claude/*` e habilite `globals.jest` para `**/*.test.js`.
- Versão web com `web.output: "single"` no `app.json`: com `"static"`, dados que só existem
  no cliente (AsyncStorage) geram erros de hidratação.
- CI em `.github/workflows/ci.yml`: `npm ci`, `npm run lint`, `npm test` e
  `npx expo export --platform android`.
- README com banner e capturas geradas por `npm run screenshots` (Playwright abre a versão
  web com dados de exemplo). Referência: `scripts/screenshots.mjs` do Fokus.
- `CLAUDE.md` na raiz descrevendo estrutura, fluxo de dados e convenções.

## Build

Para build local de iOS/Android e EAS, veja `references/build.md`.
