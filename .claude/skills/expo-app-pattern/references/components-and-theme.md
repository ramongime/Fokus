# Componentes e tema

## Convenções de componente

- Uma pasta por componente: `components/NomeComponente/index.jsx`.
- Componentes de UI: export nomeado com arrow function
  (`export const FokusButton = (...) => ...`).
  Componentes maiores (form, item de lista) podem usar `export default function`.
  Dentro de um mesmo projeto, escolha um estilo e mantenha.
- Props desestruturadas na assinatura.
- `StyleSheet.create` no fim do arquivo, com a constante chamada `styles`.
- Sem acesso a contexto dentro de componentes de UI; tudo vem por props.

## Componentes base do padrão

| Componente | Props | Comportamento |
|---|---|---|
| `PrimaryButton` (no Fokus: `FokusButton`) | `title`, `onPress`, `icon?`, `outline?` | Pílula (raio 32), cor primária; `outline` deixa transparente com borda e texto na cor primária. Ícone à esquerda do texto, `gap: 12`. |
| `ActionButton` | `display`, `active`, `onPress` | Botão de alternância (abas/modos). Quando `active`, fundo `colors.surface` e raio 8. |
| `XItem` (card de lista) | dados + `onToggleComplete`, `onPressEdit`, `onPressDelete` | Linha com check à esquerda, texto `flex: 1`, lápis e lixeira à direita. Estilo extra quando concluído (array de estilos). |
| `FormX` | `onFormSubmit`, `defaultValue = ""` | Título "Adicionar"/"Editar" conforme `defaultValue`; ignora submit vazio; limpa após salvar. |
| `BackButtonDrawer` | `backHref` | `Ionicons` `arrow-back`, 24px, `marginLeft: 16`. |
| `Timer`/displays | valor numérico | Formatação com `toLocaleTimeString('pt-BR', ...)` ou `Intl`. |

## Ícones

Todos em `components/Icons/index.jsx`, exports nomeados `IconPlay`, `IconPlus`,
`IconTrash`... feitos com `Svg`/`Path`/`Circle` de `react-native-svg`. Ícones que mudam
de estado recebem prop (`IconCheck checked`). Use cores do tema no `fill`.

## Tema (`constants/theme.js`)

O Fokus repetia os hex em todos os arquivos. No padrão, centralize:

```js
export const colors = {
  background: "#021123",        // fundo das telas, header e drawer
  surface: "#144480",           // botão ativo, bordas de cards
  surfaceTranslucent: "#14448080",
  primary: "#B872FF",           // botões principais
  success: "#00F4BF",           // check marcado
  successDark: "#0F725C",       // card concluído
  muted: "#98A0A8",             // cards, textos secundários, rodapé
  text: "#FFFFFF",
  textOnPrimary: "#021123",
};

export const fontSizes = { sm: 12.5, md: 18, lg: 26, xl: 54 };
export const radii = { sm: 8, lg: 32 };
```

A paleta acima é a do Fokus; em outro app, troque os valores e mantenha as chaves, para
que os componentes continuem funcionando sem mudança.

## Layout

- Larguras relativas: `"80%"` ou `"90%"` para o bloco principal.
- Espaçamento com `gap` (8, 16, 32, 40), em vez de margens em cada filho.
- Tipografia: título 26, texto de corpo/botão 18, legenda 12.5, número grande 54 bold.
