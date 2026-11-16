/*
========
Fachada pública do composable useTutorial (src/useTutorial.ts).
Reúne e expõe de forma coesa o estado reativo (state.ts), o motor de ações remotas (actions.ts),
o controle de navegação e rotas (navigation.ts), os resolvedores de DOM (domResolver.ts)
e a diretiva v-tutorial (directive.ts), mantendo 100% de compatibilidade na API pública.
========
*/
import type { TutorialOptions } from './types'
import {
  resolveStepElement,
  resolveStepElements,
  getStepBoundingRect,
} from './domResolver'
import {
  isActive,
  steps,
  currentStepIndex,
  currentStep,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  isTransitioning,
  lastDirection,
  activeBreakpoint,
  viewportWidth,
  isMobileViewport,
  mergedBreakpoints,
  storageKey,
  globalOptions,
  configureTutorial,
  registerSteps,
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  onFinish,
  onStop,
  onStepChange,
} from './state'
import {
  registeredActions,
  registerAction,
  runRegisteredAction,
  runActionMap,
} from './actions'
import {
  startTutorial,
  restartTutorial,
  nextStep,
  prevStep,
  goToStep,
  endTutorial,
  completeTutorial,
  wrapTutorialAction,
  getContext,
} from './navigation'
import { registerTarget, vTutorial } from './directive'

// Reexporta a diretiva e o mapa de ações para manter total compatibilidade com importações diretas
export { vTutorial, registeredActions }

/*
Fornece acesso reativo ao estado, métodos de navegação, registro de ações e eventos do tutorial.
Recebe: options (objeto parcial opcional TutorialOptions para configurar o tutorial na inicialização).
Devolve: objeto contendo todas as propriedades reativas e funções de controle do v-tutorial.
Por que é usada: Ponto central de integração para componentes Vue controlarem o tour ou registrarem ações.
*/
export function useTutorial(options?: Partial<TutorialOptions>) {
  if (options) {
    configureTutorial(options)
  }

  return {
    isActive,
    steps,
    currentStepIndex,
    currentStep,
    totalSteps,
    progress,
    isFirstStep,
    isLastStep,
    isTransitioning,
    lastDirection,
    activeBreakpoint,
    viewportWidth,
    isMobileViewport,
    mergedBreakpoints,
    storageKey,
    globalOptions,
    configureTutorial,
    registerSteps,
    registerDeclarativeStep,
    updateDeclarativeStep,
    unregisterDeclarativeStep,
    startTutorial,
    restartTutorial,
    nextStep,
    prevStep,
    goToStep,
    endTutorial,
    completeTutorial,
    resolveStepElement,
    resolveStepElements,
    getStepBoundingRect,
    registerTarget,
    wrapTutorialAction,
    registerAction,
    runRegisteredAction,
    runActionMap,
    onFinish,
    onStop,
    onStepChange,
    getContext,
  }
}