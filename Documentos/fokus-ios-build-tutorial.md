# Tutorial: Build e instalação local do app iOS no iPhone (do zero)

Este documento lista comandos e passos para configurar ambiente, criar/instalar um app iOS localmente num iPhone físico e explicar para que serve cada passo. As instruções cobrem os fluxos mais comuns: Expo (managed) e React Native CLI (bare). Use as seções que se aplicam ao seu projeto.

> Observação: para instalar builds em um iPhone físico é necessário Xcode no macOS, um Apple ID (para desenvolvimento) e, para distribuição/TestFlight, uma conta Apple Developer paga.

---

## Sumário rápido

1. Pré-requisitos (instalar Xcode, Node, CocoaPods, etc.)
2. Preparar o projeto (clonar, instalar dependências)
3. Rodar em modo desenvolvimento (Expo Go / Metro)
4. Build e instalação local (Xcode / expo run:ios / react-native run-ios)
5. Gerar Release/.ipa e TestFlight
6. Atualizar apenas JS (dev server / OTA)
7. Definir ícone (thumb) do app
8. Comandos úteis e resolução de problemas
9. Como gerar PDF a partir deste arquivo

---

## 1) Pré-requisitos (o que instalar e por que)

- Xcode (App Store)
  - Por que: compila o binário iOS e gerencia assinaturas (code signing, provisioning profiles).
  - Passos/Comandos úteis:
    - Abra Xcode uma vez para aceitar a licença: `open /Applications/Xcode.app`
    - Garanta que ferramentas de linha de comando estão configuradas: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
    - (Opcional) Execute primeiro lançamento: `sudo xcodebuild -runFirstLaunch`

- Node.js (nvm recomendado)
  - Por que: executa Metro, scripts npm/yarn, e ferramentas JS.
  - Exemplo com nvm:
    - Instalar nvm: `curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`
    - Instalar Node LTS: `nvm install --lts && nvm use --lts`

- CocoaPods (para projetos com pasta `ios/` e Pods)
  - Por que: gerencia dependências nativas do iOS.
  - Instalar: `sudo gem install cocoapods` ou `brew install cocoapods`

- (Opcional) Watchman (recomendado para RN): `brew install watchman`

- (Se usar Expo) Expo CLI/EAS
  - Por que: facilita o fluxo Expo e builds OTA.
  - Instalar (opcional): `npm install -g expo-cli` e `npm install -g eas-cli` (ou usar `npx expo`/`npx eas` sem instalar globalmente).

---

## 2) Preparar o projeto (do zero)

Supondo que o código esteja em um repositório remoto (substitua `<repo>` e `<pasta>`):

```bash
# clonar
git clone <repo> foco-app
cd foco-app

# instalar dependências JS
npm install
# ou: yarn
```

Se o projeto tiver pasta `ios/` (RN / expo prebuild):

```bash
cd ios
pod install
cd ..
```

O que cada passo faz:
- `npm install` instala todas as dependências JS listadas no package.json.
- `pod install` gera o workspace do Xcode e instala pods nativos necessários.

---

## 3) Rodar em modo desenvolvimento (mais rápido, para ver mudanças JS)

Opções comuns:

A) Expo managed (mais simples quando o projeto é Expo):

```bash
# inicia Metro/Expo dev server
npm run start
# ou
npx expo start
```
- Explicação: abre o painel do Metro/Expo; para o iPhone, instale o app Expo Go e escaneie o QR code (ou use Tunnel) para carregar seu JS sem reinstalar o app.

B) React Native CLI / Expo prebuild (com dispositivo conectado via cabo):

```bash
# inicia Metro (servidor JS)
npx react-native start
# em outro terminal, instala o app no dispositivo (debug)
# descubra o nome do dispositivo com xcrun xctrace list devices
npx react-native run-ios --device "Nome do Dispositivo"
```
- Explicação: `run-ios` compila e instala uma build de desenvolvimento no dispositivo, conectada ao Metro para updates JS rápidos.

Importante: Para apenas mudanças JS, muitas vezes basta abrir o menu de desenvolvimento no app (sacudir o dispositivo) e escolher Reload/Fast Refresh.

---

## 4) Build e instalação local (Release) — passos detalhados

Quando há mudanças nativas ou deseja testar o app como Release (sem Metro):

Opção 1 — Usando Xcode (GUI, recomendado se tiver problemas de signing):

1. Abra o workspace do iOS no Xcode:
   - `open ios/YourApp.xcworkspace` (use `.xcworkspace` se houver Pods)
2. Conecte o iPhone por USB, desbloqueie e confirme "Confiar neste computador".
3. Em Xcode, selecione o target do app (fokus) e vá em Signing & Capabilities:
   - Adicione sua Apple ID em Xcode → Preferences → Accounts se ainda não estiver adicionada.
   - Selecione um Team e marque "Automatically manage signing".
   - Ajuste o Bundle Identifier (por exemplo `com.seunome.fokus`).
4. Escolha o dispositivo físico na barra de dispositivos e altere a configuração para `Release` (ou `Debug` para builds de desenvolvimento) e clique em Run (play) para instalar.

- O que isso faz: Xcode compila o binário, gera e embute o bundle JS (em Release, o JS é empacotado) e instala no dispositivo, aplicando as provisioning profiles corretas.

Opção 2 — Linha de comando (expo / react-native):

Para Expo (projeto com `expo`):

```bash
# build e instala no iPhone conectado (usa xcode por baixo dos panos)
npm run ios -- --device "Nome do Dispositivo" --configuration Release
# (ou) npx expo run:ios --device "Nome do Dispositivo" --configuration Release
```

Para React Native CLI:

```bash
# garante pods instalados
cd ios && pod install && cd ..
# build e instala
npx react-native run-ios --device "Nome do Dispositivo" --configuration Release
```

Se houver erro de provisioning (mensagem: "No profiles for 'com.example' were found..."), abra o Xcode e habilite Automatic signing ou rode com permissão para atualizar profiles:

```bash
# exemplo avançado: permite que xcodebuild crie profiles automaticamente
xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -sdk iphoneos -allowProvisioningUpdates
```

---

## 5) Gerar .ipa e subir para TestFlight (resumo)

Usando Xcode (GUI):
1. Em Xcode selecione Generic iOS Device como destino.
2. Product → Archive.
3. Quando o Organizer abrir, selecione o archive e clique em "Distribute App" → App Store Connect → Upload.

Usando EAS (Expo):

```bash
# precisa configurar eas.json e estar logado no expo
eas build -p ios --profile production
# depois: eas submit -p ios --path ./path/to/your.ipa
```

---

## 6) Atualizar apenas o JS (sem reinstalar) — dev server e OTA

- Se o app estiver usando Metro / Dev build: iniciar servidor JS e dar Reload no app (sacudir → Reload).

```bash
# inicia servidor Metro
npx react-native start
# ou, com Expo
npx expo start
```

- Se quiser atualização OTA em produção (sem App Store), usar soluções como `expo-updates`/EAS Update ou CodePush (App Center): isso exige configuração adicional e builds que integrem runtime de updates.

---

## 7) Definir ícone do app (thumb) — passos rápidos

A) Expo managed:

No `app.json` ou `app.config.js` adicione/atualize:

```json
"expo": {
  "icon": "./assets/icon.png",
  "ios": {
    "bundleIdentifier": "com.seunome.fokus",
    "icon": "./assets/icon.png"
  }
}
```

- Depois baixe as imagens nas resoluções recomendadas (pelo menos 1024x1024 para App Store). Para testes locais no dispositivo, basta que `assets/icon.png` exista; o build nativo copia esse icon para o projeto iOS.

B) Manual via Xcode (qualquer projeto iOS):

1. Abra `ios/YourApp/Images.xcassets` → `AppIcon`.
2. Arraste as imagens nas resoluções apropriadas (Xcode mostra slots: 20pt, 29pt, 40pt, 60pt etc., em @1/@2/@3).
3. Recompile o app no Xcode e instale no dispositivo.

- Para que serve: o app icon é o que aparece na tela inicial do iPhone ("thumb"). Substituir os assets e recompilar é necessário para que o OS mostre o novo ícone.

---

## 8) Comandos úteis e troubleshooting

- Mostrar dispositivos conectados:

```bash
xcrun xctrace list devices
# ou
xcrun instruments -s devices
```

- Encontrar o nome do dispositivo para usar com `--device "Nome"`.

- Erro comum: "No profiles for 'com.xxx' were found"
  - Solução: Abra Xcode → Signing & Capabilities → habilite "Automatically manage signing" e selecione seu Team/Apple ID.

- Se o build travar por pods/etc:

```bash
cd ios
pod install --repo-update
cd ..
```

- Gerar manualmente o bundle JS (apenas se precisar embutir manualmente):

```bash
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios
```

---

## 9) Como gerar um PDF a partir deste arquivo (opções)

1. Usando pandoc (se instalado):

```bash
pandoc foco-ios-build-tutorial.md -o foco-ios-build-tutorial.pdf
```

2. Abrir o `.md` no VSCode e usar Print → Save as PDF.
3. Abrir no navegador (ex.: usar uma extensão para visualizar Markdown) e imprimir para PDF.

---

## Resumo dos comandos essenciais (rápido)

# Pré-reqs (macOS)
open /Applications/Xcode.app
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
sudo gem install cocoapods

# Preparar projeto
git clone <repo>
cd <repo>
npm install
cd ios && pod install && cd ..

# Rodar dev server (JS only)
npm run start
# Expo: npx expo start
# React Native: npx react-native start

# Rodar em dispositivo conectado (dev)
# Expo (prebuilt)
npm run ios -- --device "Nome do Dispositivo"
# RN CLI
npx react-native run-ios --device "Nome do Dispositivo"

# Rodar Release no dispositivo
npx react-native run-ios --device "Nome do Dispositivo" --configuration Release
# ou usar Xcode: abrir .xcworkspace e executar com Release selecionado

# Criar bundle manual (se necessário)
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios

# Listar dispositivos
xcrun xctrace list devices

# Arquivar e subir para TestFlight (via Xcode GUI)
# ou usar EAS (Expo)
eas build -p ios --profile production

---

Se quiser, posso gerar também um PDF diretamente (se você preferir) — preciso que informe se prefere PDF gerado aqui e que ferramentas podem ser usadas no seu Mac (ex.: `pandoc` está instalado?) ou posso fornecer instruções para gerar localmente.

Boa sorte — consulte esta checklist passo a passo e me fale qual fluxo você prefere (Expo managed, Expo+EAS, ou React Native CLI) que posso adaptar o tutorial ainda mais especificamente ao seu projeto.
