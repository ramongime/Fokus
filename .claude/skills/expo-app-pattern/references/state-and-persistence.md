# Estado global e persistência

## Anatomia

Cada domínio de dados (tarefas, hábitos, gastos...) tem dois arquivos em
`components/context/`:

- `<Recurso>Provider.jsx`: cria o Context, guarda o estado com `useState`, carrega e salva
  no AsyncStorage e expõe as ações.
- `use<Recurso>Context.js`: hook que lê o Context e lança erro se ele não existir.

As telas nunca chamam `AsyncStorage` nem `useContext` diretamente; usam só o hook.

## Ciclo de persistência

1. Ao montar: lê `AsyncStorage.getItem(STORAGE_KEY)`, faz `JSON.parse` e marca
   `isLoaded = true`.
2. A cada mudança do estado, **só depois de `isLoaded`**, grava `JSON.stringify(estado)`.
   Sem essa trava, o array vazio inicial sobrescreveria os dados salvos.
3. A chave segue o formato `"<app>-<recurso>"`, ex.: `"fokus-tasks"`.

## Regras das ações

- Sempre use a forma funcional do setter: `setItems((old) => ...)`.
- Nunca mute itens: crie objetos novos com spread.
- IDs são strings únicas: `Date.now().toString()`.
- Compare ids com `===`.
- Nomes: `addX`, `updateX`, `deleteX`, `toggleXCompleted` (ou verbo equivalente).

## Template

Veja `../templates/ResourceProvider.jsx` e `../templates/useResourceContext.js`. Troque
`Resource`/`resource` pelo nome do domínio e ajuste os campos do item.

## Quando o domínio crescer

Se o Provider passar de ~150 linhas ou precisar de lógica derivada pesada, extraia as
funções puras (ex.: `toggleCompleted(items, id)`) para `components/context/<recurso>.utils.js`
e teste com jest-expo. Só considere trocar Context por outra lib (Zustand, etc.) se houver
problema real de performance ou vários domínios interdependentes.
