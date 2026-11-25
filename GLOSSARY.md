# GLOSSARY.md

# Fokus

Aplicativo de gerenciamento de tempo e tarefas baseado na técnica Pomodoro, voltado para foco profundo, disciplina diária e trabalho offline resiliente.

## Ciclos e Temporização

**Ciclo de Foco (Pomodoro)**:
Bloco contínuo e cronometrado de tempo dedicado à realização de uma atividade sem interrupções externas.
_Avoid_: Tempo total, tarefa, cronômetro geral

**Pausa Curta**:
Período breve de descanso intercalado imediatamente após um ciclo de foco para recuperação cognitiva imediata.
_Avoid_: Pausa longa, intervalo livre, encerramento de sessão

**Pausa Longa**:
Intervalo estendido de repouso oferecido após a conclusão de uma série estipulada de ciclos de foco consecutivos para restauração mental profunda.
_Avoid_: Pausa curta, fim do expediente, folga

**Intervalo de Pausa Longa**:
Meta de quantidade de ciclos de foco que devem ser completados para que uma pausa longa seja acionada no lugar de uma pausa curta.
_Avoid_: Duração da pausa, tempo total de trabalho

**Emendar Ciclos (Ciclos Contínuos)**:
Modo operacional de encadeamento automático no qual os períodos de trabalho e descanso se sucedem sem necessidade de acionamento manual do usuário.
_Avoid_: Reprodução contínua, timer infinito, piloto automático

**Série de Focos**:
Sequência de ciclos de foco contada até a pausa longa ("Foco · 2 de 4"). Continua depois da meia-noite se o último foco terminou há até 2 horas; depois disso, recomeça no dia novo.
_Avoid_: Contador do dia, sequência (streak), plano de ciclos

**Plano de Ciclos**:
Sequência ordenada e pré-projetada de etapas de foco e descanso estruturada para guiar uma sessão contínua de trabalho.
_Avoid_: Lista de tarefas, agendamento de calendário, alarme avulso

**Segmento Planejado**:
Fração individual de tempo dentro do plano de ciclos com tipo de atividade e horário de conclusão previamente calculados.
_Avoid_: Tarefa avulsa, intervalo flexível

**Projeção de Término**:
Determinação exata do instante no tempo em que um segmento ou ciclo deve ser concluído, servindo como referência horária para o encerramento do bloco.
_Avoid_: Contagem regressiva local, atraso acumulado

**Transição de Ciclo**:
Passagem automática do temporizador para o ciclo subsequente recomendado (ex.: de foco para pausa curta) imediatamente ao zerar (00:00), posicionando o próximo segmento pausado e pronto para início (salvo com Emendar Ciclos ativo).
_Avoid_: Reset forçado, reinício automático indesejado, zeramento cego

**Pular Fase**:
Ação manual do usuário que encerra a fase atual sem concluí-la e posiciona o temporizador, pausado e com a duração cheia, na fase que viria a seguir na série. Um foco pulado não conta como ciclo de foco concluído.
_Avoid_: Trocar aba, concluir ciclo, transição de ciclo

## Gestão de Tarefas

**Tarefa**:
Item concreto de trabalho cadastrado pelo usuário com descrição, estado de conclusão e contagem de ciclos já realizados.
_Avoid_: Ciclo de foco, projeto, compromisso de agenda

**Tarefa do Foco**:
Tarefa única e prioritária selecionada para receber a dedicação e o crédito de conclusão durante o ciclo de foco em andamento.
_Avoid_: Tarefa pendente, tarefa geral, backlog

**Pomodoros Concluídos**:
Contador cumulativo de blocos de foco dedicados e finalizados com sucesso no âmbito de uma tarefa específica.
_Avoid_: Minutos corridos, pontuação

## Estatísticas e Histórico

**Histórico de 1 Ano**:
Registro cumulativo de produtividade que consolida diariamente o número de ciclos finalizados e os minutos focados (no total e por tarefa) em uma janela contínua de até 365 dias.
_Avoid_: Log bruto, backup permanente, estatística volátil

**Tempo Focado**:
Volume total de minutos efetivamente dedicados a blocos de foco finalizados com sucesso dentro de um dia ou semana.
_Avoid_: Tempo decorrido com app aberto, tempo ocioso, horas de trabalho totais

**Sequência (Streak)**:
Número de dias consecutivos em que o usuário concluiu ao menos um ciclo de foco completo, mantendo a disciplina diária.
_Avoid_: Total de pomodoros, frequência semanal, pontuação de hábito

**Contador do Dia**:
Total consolidado de ciclos de foco finalizados com sucesso na data corrente do usuário.
_Avoid_: Sequência, meta diária de foco

**Meta Diária de Foco**:
Quantidade configurável de ciclos de foco que o usuário pretende concluir em um dia, acompanhada no histórico mensal.
_Avoid_: Contador do dia, sequência

**Tempo por Tarefa**:
Focos e minutos de cada tarefa num período do histórico. Focos sem tarefa aparecem como "Sem tarefa"; tarefas apagadas, como "Tarefa excluída".
_Avoid_: Focos da tarefa (o total acumulado na própria tarefa)

**Backup**:
Arquivo JSON com configurações, tarefas e histórico, exportado e restaurado pelo próprio usuário em Configurações › Seus dados. Restaurar substitui as configurações e soma tarefas e histórico sem duplicar.
_Avoid_: Sincronização, nuvem, conta

## Sistema e Alertas

**Widget da Tela Inicial**:
Cartão compacto nativo exibido na tela inicial do iOS e Android com a fase atual, o temporizador e o progresso da meta diária.
_Avoid_: Live Activity, notificação contínua

**Atividade ao Vivo (Live Activity)**:
Apresentação em tempo real planejada para o temporizador ativo na Dynamic Island e na Tela de Bloqueio do iOS, permitindo acompanhar a contagem regressiva sem abrir o aplicativo.
_Avoid_: Widget de tela inicial, push remoto, alerta pop-up

**Notificação Fixa (Ongoing Notification)**:
Aviso persistente exibido na barra de status e na central de notificações do Android durante um ciclo em andamento, mantendo o horário de conclusão acessível sem interrupções sonoras contínuas.
_Avoid_: Notificação descartável, alarme invasivo, toast efêmero

**Alarme de Conclusão de Ciclo**:
Alerta audiovisual e háptico disparado no exato instante em que a contagem atinge 00:00, atuando tanto em primeiro plano (com reprodução sonora imediata e vibração) quanto em segundo plano (em plataformas móveis com suporte a notificações agendadas).
_Avoid_: Bipe contínuo, som de clique, notificação genérica sem áudio

**Sons Distintos de Ciclo**:
Configuração auditiva que diferencia a conclusão de um ciclo de foco da conclusão de uma pausa por meio de assinaturas acústicas ou harmônicas próprias.
_Avoid_: Sons personalizados, toques do sistema, ringtone

**Canal de Notificação**:
Configuração do sistema operacional para entrega de avisos visuais, sonoros e táteis que demarcam o término de ciclos de trabalho ou repouso.
_Avoid_: Som interno do aplicativo, grupo de tarefas

**Modo Silencioso com Vibração**:
Perfil de alerta que suprime sinais acústicos sonoros, emitindo estritamente pulsações táteis para sinalizar as trocas de ciclo com discrição.
_Avoid_: Não perturbe geral, modo mudo sem vibração

**Janela de Alerta em Primeiro Plano**:
Intervalo temporal máximo de tolerância após o término de um segmento em que o alarme sonoro e o aviso tátil em primeiro plano ainda são disparados como oportunos.
_Avoid_: Alarme atrasado, repetição de alerta, janela de vibração isolada
