/*
========
Definições de tipos e interfaces do sistema de tutorial interativo (types.ts).
Inclui o motor responsivo Mobile-First em cascata estilo Bootstrap (xs, sm, md, lg, xl, xxl),
modos de interação, atalhos declarativos de rotas/ações e contextos reativos.
========
*/
import type { Component, ComputedRef } from 'vue'

export type TutorialStepMode =
  | 'wait-click' // Obrigatório clicar no elemento destacado (esconde o botão Próximo)
  | 'optional-click' // Exibe o botão Próximo, mas clicar no elemento também avança
  | 'info' // Apenas explicativo (exibe o botão Próximo)

export type TutorialDirection = 'start' | 'forward' | 'backward'

export type TutorialPlacement =
  | 'auto'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'bottom-sheet'
  | 'top-sheet'

// Breakpoints padrão do Bootstrap 5 (Mobile-First: min-width)
export type TutorialBreakpointName = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

export type TutorialBreakpointsConfig = Record<TutorialBreakpointName, number>

// Mapa declarativo de ações registradas: { nomeDaAcao: argumento } ou array ['nomeDaAcao']
export type TutorialActionMap = Record<string, any> | string[]

// Propriedades que podem ser sobrescritas em cascata em cada breakpoint (xs -> sm -> md -> lg -> xl -> xxl)
export interface TutorialStepResponsiveOverride {
  /** Se true neste breakpoint, o passo é ignorado/pulado automaticamente neste tamanho de tela */
  disabled?: boolean
  target?: string | string[]
  title?: string
  content?: string
  mode?: TutorialStepMode
  placement?: TutorialPlacement
  hintText?: string
  spotlightPadding?: number
  cardWidth?: number
  autoScroll?: boolean
  route?: string
  rollbackRoute?: string
  enterActions?: TutorialActionMap
  rollbackActions?: TutorialActionMap
  leaveActions?: TutorialActionMap
}

// Textos customizáveis do componente para internacionalização ou personalização
export interface TutorialLabels {
  skipTutorial?: string
  previous?: string
  next?: string
  finish?: string
  waitingClick?: string
  interactiveBadge?: string
  defaultHint?: string
  stepCounter?: (current: number, total: number) => string
}

// Classes customizáveis para estilização externa
export interface TutorialClasses {
  root?: string
  backdrop?: string
  shield?: string
  spotlight?: string
  card?: string
  arrow?: string
  header?: string
  badge?: string
  modeTag?: string
  body?: string
  title?: string
  content?: string
  hintBanner?: string
  progressContainer?: string
  progressBar?: string
  footer?: string
  skipButton?: string
  prevButton?: string
  nextButton?: string
  waitPill?: string
}

// Opções de configuração global ou por instância do tutorial
export interface TutorialOptions {
  storageKey?: string
  autoScroll?: boolean
  scrollBehavior?: ScrollBehavior
  spotlightPadding?: number
  cardWidth?: number
  showArrow?: boolean
  unstyled?: boolean
  /** Tempo máximo em ms para aguardar o registro de uma ação tardia via registerAction (padrão: 800ms) */
  actionTimeout?: number
  /** Limiares em pixels para os breakpoints Mobile-First (padrão Bootstrap 5) */
  breakpoints?: Partial<TutorialBreakpointsConfig>
  /** Se true, em telas xs/sm o placement="auto" ancora o card no topo ou rodapé para não cobrir o alvo */
  mobileSheetOnAuto?: boolean
  labels?: TutorialLabels
  classes?: TutorialClasses
  router?: {
    currentRoute: { value: { path: string } }
    push: (to: string) => Promise<any> | any
  }
}

// Contexto fornecido para hooks de ciclo de vida e Scoped Slots
export interface TutorialContext {
  currentStepIndex: number
  currentStep: TutorialStep | null
  totalSteps: number
  progress: number
  isFirstStep: boolean
  isLastStep: boolean
  direction: TutorialDirection
  activeBreakpoint: TutorialBreakpointName
  viewportWidth: number
  isMobileViewport: boolean
  nextStep: () => Promise<void>
  prevStep: () => Promise<void>
  goToStep: (indexOrId: number | string, direction?: TutorialDirection) => Promise<void>
  endTutorial: (markAsCompleted?: boolean) => void
  restartTutorial: () => Promise<void>
  runRegisteredAction: (actionName: string, ...args: any[]) => Promise<any>
  runActionMap: (actions?: TutorialActionMap) => Promise<void>
}

// Configuração de um elemento alvo registrado via diretiva v-tutorial ou registerTarget
export interface TutorialTargetConfig {
  id: string
  preventNativeClick?: boolean
  onTutorialClick?: (event: MouseEvent, ctx: TutorialContext) => void | Promise<void>
}

// Estrutura completa de um passo do tutorial (com suporte a cascata responsiva estilo Bootstrap)
export interface TutorialStep {
  id: string
  /** Alvo base (xs >= 0px): ID registrado no v-tutorial, seletor CSS ou array de seletores */
  target?: string | string[]
  title: string
  content?: string
  component?: Component
  componentProps?: Record<string, any>
  mode: TutorialStepMode
  placement?: TutorialPlacement
  hintText?: string
  preventNativeClick?: boolean
  afterClickDelay?: number
  autoScroll?: boolean
  spotlightPadding?: number
  cardWidth?: number
  disabled?: boolean
  route?: string
  rollbackRoute?: string
  enterActions?: TutorialActionMap
  rollbackActions?: TutorialActionMap
  leaveActions?: TutorialActionMap

  /** Objeto de sobrescrita Mobile-First por breakpoint (xs -> sm -> md -> lg -> xl -> xxl) */
  breakpoints?: Partial<Record<TutorialBreakpointName, TutorialStepResponsiveOverride>>

  /** Atalhos diretos Mobile-First de target por breakpoint */
  targetSm?: string | string[]
  targetMd?: string | string[]
  targetLg?: string | string[]
  targetXl?: string | string[]
  targetXxl?: string | string[]

  /** Atalhos diretos Mobile-First de placement por breakpoint */
  placementSm?: TutorialPlacement
  placementMd?: TutorialPlacement
  placementLg?: TutorialPlacement
  placementXl?: TutorialPlacement
  placementXxl?: TutorialPlacement

  beforeEnter?: (ctx: TutorialContext) => void | Promise<void>
  onRollback?: (ctx: TutorialContext) => void | Promise<void>
  onTargetClick?: (event: MouseEvent, ctx: TutorialContext) => void | Promise<void>
  afterClick?: (ctx: TutorialContext) => void | Promise<void>
  afterLeave?: (ctx: TutorialContext) => void | Promise<void>
}

// Contrato de Provide/Inject entre <TutorialProvider> e <VTutorialStep>
export interface TutorialProviderInjection {
  registerDeclarativeStep: (step: TutorialStep) => void
  updateDeclarativeStep: (step: TutorialStep) => void
  unregisterDeclarativeStep: (id: string) => void
  activeStepId: ComputedRef<string | null>
}