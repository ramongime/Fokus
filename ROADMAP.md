# Roadmap Arquitetural do Fokus

Este documento registra as diretrizes de evolução técnica e oportunidades arquiteturais estratégicas do Fokus, orientando o aprimoramento contínuo da experiência do usuário, confiabilidade do temporizador e robustez local-first.

---

## 1. Oportunidade Prioritária: Desacoplamento da Reprodução Sonora em Primeiro Plano

> **Status (2026-11)**: primeira etapa entregue. Sem permissão de notificação, com o app aberto, o som do ciclo toca pelo `expo-audio` (`playInAppCycleSound` em `timerNotifications.js`), também no modo silencioso do iPhone. Com permissão, o caminho por notificação segue igual. Falta mover todo o som em primeiro plano para o `expo-audio` (e tirar o banner com o app aberto), o que pede teste em aparelho.

### 1.1 Contexto e Diagnóstico Atual

Atualmente, o disparo audiovisual ao atingir `00:00` é implementado em `components/context/timerNotifications.js` através da função `playCycleSound`:
- A reprodução é realizada delegando ao módulo `expo-notifications` (`scheduleNotificationAsync` com `trigger: null` ou canal específico).
- Antes de emitir o som, o fluxo executa `ensurePermission()` para checar se o usuário concedeu permissões de notificação no sistema operacional (iOS e Android).
- **Problema Crítico de Acoplamento**: Se o usuário negar ou revogar as permissões de notificação do sistema — ou desativar alertas de notificação nas configurações do dispositivo por preferência de privacidade —, o método `ensurePermission()` retorna `false`. Consequentemente, `playCycleSound` encerra silenciosamente sua execução sem emitir som algum.
- **Violação de Diretriz**: Isso quebra a diretriz fundamental do Fokus estabelecida em `.agents/rules/fokus-standards.md`:
  > *"O app nunca pode ficar mudo quando aberto."*
- **Poluição Visual com o App Aberto**: Disparar notificações locais do sistema operacional com o aplicativo ativo em primeiro plano exibe banners ou toasts do SO por cima da interface do timer, degradando a estética minimalista e gerando ruído desnecessário.

---

### 1.2 Arquitetura Alvo Proposta

A solução consiste em **desacoplar estritamente a emissão sonora em primeiro plano do subsistema de notificações do SO**, introduzindo um motor de áudio nativo dedicado:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     CICLO DE CONCLUSÃO (00:00)                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
      [ App em Primeiro Plano ]           [ App em Segundo Plano ]
     (AppState === 'active')             (AppState !== 'active')
                  │                                 │
                  ▼                                 ▼
   ┌─────────────────────────────┐   ┌─────────────────────────────┐
   │    Native Audio Engine      │   │  OS Scheduled Notification  │
   │   (ex.: expo-audio / AV)    │   │     (expo-notifications)    │
   ├─────────────────────────────┤   ├─────────────────────────────┤
   │ • Toca focus.wav/break.wav  │   │ • Dispara alarme agendado   │
   │ • Independente de perm. SO  │   │ • Exact Alarm / Live Act.   │
   │ • Latência ultra-baixa      │   │ • Acorda tela bloqueada     │
   │ • Haptic via Haptics API    │   │ • Som e vibração nativos SO │
   │ • Zero banner na interface  │   │ • Ongoing Notification      │
   └─────────────────────────────┘   └─────────────────────────────┘
```

#### Pilares do Desacoplamento:

1. **Módulo Nativo de Áudio Dedicado (`expo-audio`)**:
   - Integração do `expo-audio` (introduzido no ecossistema Expo moderno / SDK 58) ou `AudioPlayer` dedicado.
   - Configuração de sessão de áudio adequada para produtividade:
     - iOS: `playsInSilentModeIOS: true` para garantir que o toque de conclusão soe mesmo que o botão físico de silêncio esteja ativo (comportamento de despertador/alarme).
     - Android: Uso do canal de áudio `USAGE_ALARM` ou ducking sobre outras mídias (`shouldDuckAndroid: true`).
2. **Independência Total de Permissões de Notificação**:
   - Para tocar áudio e acionar vibração tátil com o app aberto na tela, nenhuma permissão de notificação é necessária.
   - Usuários que bloqueiam notificações podem utilizar o Fokus como um relógio de mesa interativo com garantia absoluta de áudio.
3. **Pré-Carregamento e Latência Zero**:
   - Manter os arquivos `focus.wav` e `break.wav` pré-carregados em memória (`prepareCycleSounds`), evitando atrasos de I/O na transição de estado.
4. **Reserva do `expo-notifications` para Background**:
   - O `expo-notifications` permanece responsável exclusivamente por:
     - Notificações agendadas pré-projetadas (`scheduleTimerNotifications`) com alarmes exatos (`SCHEDULE_EXACT_ALARM`) para quando a tela estiver desligada.
     - Notificação fixa contínua (`Ongoing Notification`) no Android para acompanhamento na barra de status.
     - Live Activities no iOS.

---

### 1.3 Fases de Implementação

| Fase | Escopo | Entregáveis |
| :--- | :--- | :--- |
| **Fase 1** | **Spike Técnico & Benchmarking** | Validação do `expo-audio` no Expo SDK 58, comportamento de áudio em background vs. foreground e compatibilidade com React Native 0.88. |
| **Fase 2** | **Serviço de Áudio Desacoplado** | Criação de `services/audioService.js` (e `audioService.web.js` para Web SPA via HTML5 Audio) com ciclo de vida isolado e API simples (`playCycleAlert(typeId)`). |
| **Fase 3** | **Integração no TimerProvider** | Conectar a transição de ciclo do `TimerProvider` ao novo `audioService` em primeiro plano, eliminando o despacho de notificações instantâneas em foreground. |
| **Fase 4** | **Testes e Validação Cruzada** | Testes automatizados com mocks de áudio dedicados no Jest, validação manual em iOS, Android e Web. |

---

## 2. Próximas Iniciativas no Horizonte

Além da separação do motor de áudio, as seguintes oportunidades técnicas estão mapeadas para versões futuras:

### 2.1 Live Activities Nativas com Dynamic Island (iOS)
- **Objetivo**: Implementar widget nativo em SwiftUI (ActivityKit) permitindo que o tempo restante seja exibido na Dynamic Island e Tela de Bloqueio com renderização nativa de 1 segundo sem despertar a thread JS.
- **Impacto**: Experiência de sistema de ponta no iOS mantendo consumo de bateria nulo.

### 2.2 Quick Settings Tile no Android
- **Objetivo**: Disponibilizar um bloco de Configurações Rápidas (Quick Settings Tile) no Android para iniciar ou pausar um ciclo Pomodoro diretamente da barra superior sem precisar abrir o app.
- **Impacto**: Redução drástica da fricção de uso para ciclos rotineiros de trabalho.

### 2.3 Exportação e Importação de Dados (Portabilidade Local-First) — ✅ entregue
- **Objetivo**: Permitir exportação de todas as tarefas, histórico e configurações em arquivo JSON legível, além de restauração com validação de esquema defensiva. Entregue em Configurações › Seus dados (compartilhar no celular, download na web, restauração colando o texto). Próximo passo possível: seletor de arquivo com `expo-document-picker`.
- **Impacto**: Soberania completa do usuário sobre seus dados de produtividade sem necessidade de nuvem.

### 2.4 Modo Minimalista Zen (Tela OLED Preta Pura)
- **Objetivo**: Modo de exibição imersivo para apoio de mesa, com fundo `#000000` absoluto e brilho atenuado, preservando bateria em telas OLED e mantendo o foco livre de distrações periféricas.
