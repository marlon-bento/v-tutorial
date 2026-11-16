/*
========
Módulo central de estado reativo, opções globais e registro de passos (src/state.ts).
Armazena os refs e computeds compartilhados (singleton) do tutorial, a instância bruta do
Vue Router, as filas de passos imperativos e declarativos e os conjuntos de listeners
de ciclo de vida (onFinish, onStop e onStepChange).
========
*/
import {
  ref,
  computed,
  onScopeDispose,
  getCurrentScope,
} from 'vue'
import type {
  TutorialStep,
  TutorialContext,
  TutorialDirection,
  TutorialOptions,
  TutorialBreakpointName,
  TutorialBreakpointsConfig,
} from './types'
import {
  DEFAULT_BOOTSTRAP_BREAKPOINTS,
  calcularBreakpointAtivo,
  resolverPassoResponsivo,
} from './responsive'

// Indica se o tutorial está ativo e visível na tela no momento
export const isActive = ref(false)

// Lista de passos registrados via código imperativo (startTutorial / registerSteps) ou prop :steps
export const imperativeSteps = ref<TutorialStep[]>([])

// Lista de passos registrados via componente declarativo <VTutorialStep> no template
export const declarativeSteps = ref<TutorialStep[]>([])

// Índice numérico (base 0) do passo ativo na lista filtrada pelo breakpoint atual
export const currentStepIndex = ref(0)

// Bloqueia cliques e navegações concorrentes enquanto uma transição de passo está em andamento
export const isTransitioning = ref(false)

// Direção do último movimento de navegação ('start' | 'forward' | 'backward')
export const lastDirection = ref<TutorialDirection>('start')

// Largura atual da janela em pixels para cálculo reativo dos breakpoints
export const viewportWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1024
)

// Instância bruta do Vue Router mantida fora de ref profundo para evitar Proxy sobre o router
let rawRouter: TutorialOptions['router'] | undefined = undefined

// Configurações globais do plugin de tutorial com valores padrão seguros
export const globalOptions = ref<TutorialOptions>({
  storageKey: 'v-tutorial-completed',
  autoScroll: true,
  scrollBehavior: 'smooth',
  spotlightPadding: 6,
  cardWidth: 370,
  showArrow: true,
  unstyled: false,
  actionTimeout: 800,
  mobileSheetOnAuto: true,
  breakpoints: { ...DEFAULT_BOOTSTRAP_BREAKPOINTS },
})

// Conjunto de callbacks executados quando o usuário conclui o último passo do tutorial
export const finishListeners = new Set<(ctx: TutorialContext) => void>()

// Conjunto de callbacks executados quando o usuário interrompe ou pula o tutorial
export const stopListeners = new Set<(ctx: TutorialContext) => void>()

// Conjunto de callbacks executados sempre que o passo ativo muda
export const stepChangeListeners = new Set<(ctx: TutorialContext) => void>()

// Limiares de breakpoints mesclando o padrão Bootstrap 5 com eventuais customizações globais
export const mergedBreakpoints = computed<TutorialBreakpointsConfig>(() => ({
  ...DEFAULT_BOOTSTRAP_BREAKPOINTS,
  ...(globalOptions.value.breakpoints || {}),
}))

// Nome do breakpoint ativo no momento ('xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl')
export const activeBreakpoint = computed<TutorialBreakpointName>(() =>
  calcularBreakpointAtivo(viewportWidth.value, mergedBreakpoints.value)
)

// Indica se a tela atual está abaixo do breakpoint 'md' (modo mobile/celular)
export const isMobileViewport = computed(
  () => viewportWidth.value < mergedBreakpoints.value.md
)

// Fonte bruta de passos priorizando os declarativos (<VTutorialStep>) sobre os imperativos
export const rawStepsSource = computed<TutorialStep[]>(() =>
  declarativeSteps.value.length > 0
    ? declarativeSteps.value
    : imperativeSteps.value
)

// Lista final de passos com a cascata Mobile-First aplicada e passos desabilitados filtrados
export const steps = computed<TutorialStep[]>(() => {
  const bp = activeBreakpoint.value
  return rawStepsSource.value
    .map((s) => resolverPassoResponsivo(s, bp))
    .filter((s) => !s.disabled)
})

// Objeto do passo atual já resolvido para o breakpoint ativo ou null se inativo/vazio
export const currentStep = computed<TutorialStep | null>(
  () => steps.value[currentStepIndex.value] || null
)

// Quantidade total de passos habilitados para o tamanho de tela atual
export const totalSteps = computed(() => steps.value.length)

// Indica se o passo ativo é o primeiro da fila (índice 0)
export const isFirstStep = computed(() => currentStepIndex.value <= 0)

// Indica se o passo ativo é o último da fila habilitada
export const isLastStep = computed(
  () =>
    steps.value.length > 0 &&
    currentStepIndex.value === steps.value.length - 1
)

// Porcentagem inteira de conclusão do tutorial (de 0 a 100) para a barra de progresso
export const progress = computed(() => {
  if (!steps.value.length) return 0
  return Math.round(((currentStepIndex.value + 1) / steps.value.length) * 100)
})

// Chave utilizada no localStorage para persistir que o usuário já finalizou o tutorial
export const storageKey = computed(
  () => globalOptions.value.storageKey || 'v-tutorial-completed'
)

/*
Retorna a instância bruta do Vue Router configurada no plugin.
Recebe: nada.
Devolve: instância do router compatível com TutorialOptions['router'] ou undefined.
Por que é usada: Permite que o módulo de navegação acesse o router sem expor a variável mutável diretamente.
*/
export function obterRouterConfigurado(): TutorialOptions['router'] | undefined {
  return rawRouter
}

/*
Mescla novas opções globais de configuração do tutorial e armazena a instância do Vue Router.
Recebe: options (objeto parcial TutorialOptions com configurações customizadas).
Devolve: void.
Por que é usada: Centraliza a configuração feita via app.use(TutorialPlugin), <TutorialProvider> ou useTutorial(options).
*/
export function configureTutorial(options: Partial<TutorialOptions>): void {
  if ('router' in options) {
    rawRouter = options.router
  }
  const { router: _ignoredRouter, ...restOptions } = options
  globalOptions.value = {
    ...globalOptions.value,
    ...restOptions,
    breakpoints: {
      ...globalOptions.value.breakpoints,
      ...restOptions.breakpoints,
    },
    labels: {
      ...globalOptions.value.labels,
      ...restOptions.labels,
    },
    classes: {
      ...globalOptions.value.classes,
      ...restOptions.classes,
    },
  }
}

/*
Substitui a lista de passos imperativos registrados na memória.
Recebe: customSteps (array de objetos TutorialStep).
Devolve: void.
Por que é usada: Permite carregar uma fila de passos via código ou pela prop :steps do <TutorialProvider>.
*/
export function registerSteps(customSteps: TutorialStep[]): void {
  imperativeSteps.value = customSteps
}

/*
Registra ou sobrescreve um passo declarativo originado de um componente <VTutorialStep>.
Recebe: step (objeto TutorialStep construído a partir das props do componente).
Devolve: void.
Por que é usada: Monta automaticamente a fila de passos conforme os componentes filhos são renderizados no template.
*/
export function registerDeclarativeStep(step: TutorialStep): void {
  const existingIndex = declarativeSteps.value.findIndex((s) => s.id === step.id)
  if (existingIndex >= 0) {
    declarativeSteps.value[existingIndex] = step
  } else {
    declarativeSteps.value.push(step)
  }
}

/*
Atualiza as propriedades de um passo declarativo já registrado na fila.
Recebe: step (objeto TutorialStep atualizado).
Devolve: void.
Por que é usada: Mantém o card sincronizado em tempo real quando props reativas mudam no <VTutorialStep>.
*/
export function updateDeclarativeStep(step: TutorialStep): void {
  const existingIndex = declarativeSteps.value.findIndex((s) => s.id === step.id)
  if (existingIndex >= 0) {
    declarativeSteps.value[existingIndex] = step
  }
}

/*
Remove um passo declarativo da fila quando seu componente <VTutorialStep> é desmontado.
Recebe: id (identificador único do passo).
Devolve: void.
Por que é usada: Garante que passos removidos via v-if saiam imediatamente da contagem e do fluxo do tour.
*/
export function unregisterDeclarativeStep(id: string): void {
  declarativeSteps.value = declarativeSteps.value.filter((s) => s.id !== id)
}

/*
Registra um listener acionado quando o tutorial é concluído até o último passo.
Recebe: cb (função callback que recebe o TutorialContext).
Devolve: função de limpeza para remover o listener manualmente.
Por que é usada: Permite reagir ao término completo do treinamento e remove o listener automaticamente no onScopeDispose.
*/
export function onFinish(cb: (ctx: TutorialContext) => void): () => void {
  finishListeners.add(cb)
  if (getCurrentScope()) {
    onScopeDispose(() => finishListeners.delete(cb))
  }
  return () => finishListeners.delete(cb)
}

/*
Registra um listener acionado quando o tutorial é interrompido ou fechado antes do fim.
Recebe: cb (função callback que recebe o TutorialContext).
Devolve: função de limpeza para remover o listener manualmente.
Por que é usada: Permite rastrear abandonos ou fechamentos via tecla Escape / botão Pular.
*/
export function onStop(cb: (ctx: TutorialContext) => void): () => void {
  stopListeners.add(cb)
  if (getCurrentScope()) {
    onScopeDispose(() => stopListeners.delete(cb))
  }
  return () => stopListeners.delete(cb)
}

/*
Registra um listener acionado a cada mudança de passo do tutorial.
Recebe: cb (função callback que recebe o TutorialContext atualizado).
Devolve: função de limpeza para remover o listener manualmente.
Por que é usada: Sincroniza eventos externos e emite o evento @step-change no <TutorialProvider>.
*/
export function onStepChange(cb: (ctx: TutorialContext) => void): () => void {
  stepChangeListeners.add(cb)
  if (getCurrentScope()) {
    onScopeDispose(() => stepChangeListeners.delete(cb))
  }
  return () => stepChangeListeners.delete(cb)
}