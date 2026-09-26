# Telas e navegação

## Layout raiz (`app/_layout.jsx`)

Ordem de aninhamento:

```jsx
<ResourceProvider>              // um ou mais Providers, por fora de tudo
  <GestureHandlerRootView style={{ flex: 1 }}>   // exigido pelo Drawer
    <Drawer screenOptions={...}>                  // cores do tema no header e no menu
      <Drawer.Screen ... />
    </Drawer>
  </GestureHandlerRootView>
</ResourceProvider>
```

`screenOptions` padrão (usando o tema):

```js
{
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  drawerStyle: { backgroundColor: colors.background },
  drawerLabelStyle: { color: colors.text },
}
```

## Tipos de tela no Drawer

| Tela | Opções |
|---|---|
| `index` (landing) | `headerShown: false`, `drawerItemStyle: { display: "none" }` |
| Tela principal (ex.: `pomodoro`, `tasks/index`) | `drawerLabel: "Nome no menu"`, `title: ""` |
| `add-x/index`, `edit-x/[id]` | `drawerItemStyle: { display: "none" }`, `title: ""`, `headerLeft: () => <BackButtonDrawer backHref="/x" />` |

O `name` do `Drawer.Screen` é o caminho do arquivo sem extensão (`"tasks/index"`,
`"edit-task/[id]"`).

## Navegação

- Use `router.navigate("/rota")` de `expo-router`.
- Parâmetros dinâmicos: `router.navigate(`/edit-x/${item.id}`)` e, na tela,
  `const { id } = useLocalSearchParams();`.
- Depois de salvar em add/edit, volte para a lista com `router.navigate("/x")`.

## Telas de CRUD

- **Lista**: `FlatList` com header (título), separador de 8px, footer com `FokusButton`
  outline "Adicionar novo...", e `ListEmptyComponent` com texto cinza convidando a criar
  o primeiro item.
- **Adicionar**: só chama `addX` e navega. Toda a UI está em `FormX`.
- **Editar**: busca o item pelo id; se não achar, mostra uma mensagem de "não encontrado";
  se achar, renderiza `FormX` com `defaultValue`.

Templates prontos em `../templates/screens/`.

## Landing e telas de conteúdo

- Fundo escuro do tema, conteúdo centralizado com `gap` generoso (16–40).
- Telas com conteúdo alto usam `SafeAreaView` (de `react-native-safe-area-context`) +
  `ScrollView` com `contentContainerStyle`.
- Card de ações: fundo translúcido (`colors.surfaceTranslucent`), borda de 2px, raio 32,
  largura 80%.
