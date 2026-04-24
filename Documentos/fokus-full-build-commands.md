# Fokus — Full Rebuild e Full Build (comandos)

Este documento contém os comandos passo a passo para fazer um Full Rebuild (limpar tudo e compilar do zero) e um Full Build (build normal) no macOS para instalar no iPhone físico.

> Execute estes comandos no terminal do macOS. Substitua caminhos e nomes de esquema/dispositivo quando necessário.

---

## Pré‑requisitos

- Xcode instalado (abra Xcode pelo menos uma vez para aceitar termos)
- Apple ID configurado no Xcode (Preferences → Accounts)
- Node.js (nvm recomendado) e npm/yarn
- CocoaPods (`brew install cocoapods` se necessário)
- iPhone conectado por USB, desbloqueado e com "Confiar neste computador" aceito

---

## Full Rebuild (limpeza completa e build Release)

1) Abrir Xcode uma vez (aceitar licenças):

```bash
open /Applications/Xcode.app
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

Porque: garante ferramentas de linha de comando configuradas.

2) Ir para a raiz do projeto:

```bash
cd /Users/ramongimenes/Pessoal/fokus
```

3) Remover caches e node_modules (limpeza profunda):

```bash
# Remove node modules e reinstala (opcional: mantenha package-lock.json se preferir)
rm -rf node_modules package-lock.json
npm install

# Limpar cache do watchman (se instalado)
watchman watch-del-all || true

# Limpar Metro cache
rm -rf /tmp/metro-* || true
```

Porque: remove dependências locais e caches que podem causar builds inconsistentes.

4) Limpar/atualizar pods e DerivedData:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

# Limpar DerivedData do Xcode (opcional mas recomendado)
rm -rf ~/Library/Developer/Xcode/DerivedData/fokus-* || true
```

Porque: força reinstalação de dependências nativas e limpa artefatos Xcode.

5) (Opcional) Gerar bundle JS manualmente (útil se quiser embutir antes de compilar):

```bash
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --assets-dest ios
```

6) Build Release e instalar no iPhone conectado (substitua o nome do dispositivo se for diferente):

```bash
npm run ios -- --device "IPhone de Ramon" --configuration Release
```

Porque: compila o binário Release, embute o bundle JS e instala no dispositivo físico.

7) Se preferir usar o Xcode (GUI):

- Abrir `ios/fokus.xcworkspace`
- Selecionar target `fokus` → Signing & Capabilities → selecionar Team e habilitar "Automatically manage signing"
- Selecionar o dispositivo físico e `Release` → clicar no botão Run (ou Product → Archive para gerar .ipa)


---

## Full Build (build normal sem limpeza profunda)

1) No root do projeto:

```bash
cd /Users/ramongimenes/Pessoal/fokus
npm install
cd ios && pod install || true
cd ..

# Rodar build Release e instalar
npm run ios -- --device "IPhone de Ramon" --configuration Release
```

Porque: passo mais rápido para quando não há necessidade de limpar caches.

---

## Notas importantes

- Erros de provisioning: se o Xcode reclamar "No profiles for 'com...'": abra o workspace no Xcode e habilite Automatic signing (Signing & Capabilities) e selecione seu Team.
- Se o build falhar por causa de pods, execute `cd ios && pod install --repo-update`.
- Para builds com Expo (managed) use `expo run:ios` ou `eas build` conforme seu fluxo; este documento assume que já existe pasta `ios`.

---

## Comando de conversão Markdown -> PDF (se quiser gerar localmente):

```bash
# usando pandoc
pandoc -f markdown -o ~/Downloads/fokus-full-build-commands.pdf ~/Downloads/fokus-full-build-commands.md
# se não tiver pandoc: brew install pandoc
```

---

Fim.
