# Build e execução

## Desenvolvimento

```bash
npm install
npx expo start          # abre no Expo Go, emulador ou web
npx expo lint
```

## Build nativo local (iPhone físico)

O Fokus tem o passo a passo completo em `Documentos/fokus-full-build-commands.md` e
`Documentos/fokus-ios-build-tutorial.md`. Resumo:

1. Pré-requisitos: Xcode (aberto uma vez, licenças aceitas), Apple ID no Xcode,
   Node via nvm, CocoaPods, iPhone conectado e confiado.
2. Limpeza completa quando algo quebrar:
   `rm -rf node_modules && npm install`, `watchman watch-del-all`, `rm -rf /tmp/metro-*`,
   `npx expo prebuild --clean`.
3. Build no aparelho: `npx expo run:ios --device` (ou `--configuration Release`).
4. Android: `npx expo run:android`.

As pastas `/ios` e `/android` são geradas e ficam no `.gitignore`.

## Documentação do projeto

Cada app novo deve ter uma pasta `Documentos/` com os comandos de build que funcionaram
naquele projeto, escritos em português, no formato "comando + porquê".
