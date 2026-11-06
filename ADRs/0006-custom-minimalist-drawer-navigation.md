# 0006. Custom Minimalist Drawer Navigation

**Status**: Accepted  
**Date**: 2026-11-06  

## Context

The navigation drawer in Fokus previously used the default React Navigation drawer styling with plain text links and system hamburger icon, presenting a generic and misaligned appearance. The user requested a modern, minimalist redesign with high visual polish.

We evaluated two primary navigation paradigms:
1. **Persistent Bottom Tab Bar**:
   - *Pros*: Single-tap route switching with high discoverability.
   - *Cons*: Consistently consumes 60–80px of vertical screen real estate, cluttering the countdown timer screen, adding distraction, and breaking the immersive, calm headspace needed during a focus cycle.
2. **Custom Minimalist Side Drawer**:
   - *Pros*: Preserves an unobstructed, zero-distraction timer canvas. The navigation remains hidden until invoked, and the drawer canvas offers structured space for secondary contextual indicators (live cycle status, daily focus goal progress).
   - *Cons*: Requires a custom drawer content component and custom toggle button.

## Decision

We decided to retain the side drawer navigation paradigm and implement a bespoke, dark-minimalist drawer (`CustomDrawerContent`) and toggle button (`MenuToggleButton`):

```
+------------------------------------------+
|  [Logo Fokus]        (•) Ciclo ativo     |  <- Bloco 1: Header & Status
+------------------------------------------+
|  NAVEGAÇÃO                               |
|  [clock]       Timer                 >   |  <- Bloco 2: Nav Items
|  [check-sq]    Tarefas                   |     (Feather icons,
|  [bar-chart]   Histórico                 |      active pill)
|  [sliders]     Configurações             |
+------------------------------------------+
|  Meta Diária              2/4 focos      |  <- Bloco 3: Footer & Meta
|  [=======>            ]     (50%)        |     (Progress bar &
|  v1.0.0 • Fokus Minimalist               |      versão)
+------------------------------------------+
```

### Architectural Principles & Decoupling

1. **Pure Component Decoupling (`CLAUDE.md` Compliance)**:
   - `CustomDrawerContent` and `MenuToggleButton` reside in `components/` and are pure, prop-driven components.
   - `CustomDrawerContent` does NOT call domain context hooks (`useTimerContext`, `useSettingsContext`) directly.
   - An internal `DrawerNavigator` in `app/_layout.jsx` consumes context hooks and passes state down (`todayCount`, `dailyGoal`, `timerRunning`).
2. **3-Block Layout Structure**:
   - **Header**: Fokus logo with live status pill reflecting the active timer running state.
   - **Navigation Group**: Routes mapped with Feather outline icons (`clock`, `check-square`, `bar-chart-2`, `sliders`), filtering out nested utility routes marked with `display: 'none'` (`index`, `add-task/index`, `edit-task/[id]`).
   - **Footer**: Progress bar calculating `todayCount / dailyGoal` percentage alongside app versioning.
3. **Design System & Theme Tokens**:
   - Palette derived strictly from `constants/theme.js` (`colors.background`, `colors.surface`, `colors.surfaceTranslucent`, `colors.text`, `radii.sm`, `radii.pill`).
   - Width locked to 290px for balanced screen proportions on mobile devices.
4. **Minimalist Menu Toggle**:
   - Bespoke `MenuToggleButton` with 38x38 squircle geometry, `colors.surfaceTranslucent` background, 1px border, and 12px hitSlop for accessible interaction.

## Consequences

- The Pomodoro timer canvas remains completely unobstructed during focus sessions.
- Navigation provides clear visual hierarchy and real-time session feedback.
- Clean architectural decoupling simplifies unit testing using standard mock descriptors.
