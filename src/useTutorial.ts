/*
========
Motor de estado, navegação e ações registradas do v-tutorial (useTutorial.ts).
Delega a resolução de DOM para domResolver.ts e a cascata de breakpoints para responsive.ts,
mantendo este arquivo enxuto e focado no controle de fluxo do tutorial.
========
*/
import {
  ref,
  computed,
  nextTick,
  onScopeDispose,
  getCurrentScope,
  type Directive,
  type Ref,
  watch,
} from 'vue'
import type {
  TutorialStep,
  TutorialTargetConfig,
  TutorialContext,
  TutorialDirection,
  TutorialOptions,
  TutorialActionMap,
  TutorialBreakpointName,
  TutorialBreakpointsConfig,
} from './types'
import {
  DEFAULT_BOOTSTRAP_BREAKPOINTS,
  calcularBreakpointAtivo,
  resolverPassoResponsivo,
} from './responsive'
import {
  registeredElements,
  resolveStepElement,
  resolveStepElements,
  getStepBoundingRect,
  aguardarElementoNoDom,
} from './domResolver'

const isActive = ref(false)
const imperativeSteps = ref<TutorialStep[]>([])
const declarativeSteps = ref<TutorialStep[]>([])
const currentStepIndex = ref(0)
const isTransitioning = ref(false)
const lastDirection = ref<TutorialDirection>('start')
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

// Instância bruta do Vue Router armazenada fora do ref profundo para evitar Proxy sobre o router
let rawRouter: TutorialOptions['router'] | undefined = undefined

const globalOptions = ref<TutorialOptions>({
  storageKey: 'v-tutorial-completed',
  autoScroll: true,
  scrollBehavior: 'smooth',
  spotlightPadding: 6,
  cardWidth: 370,
  showArrow: true,
  unstyled: false,
  mobileSheetOnAuto: true,
  breakpoints: { ...DEFAULT_BOOTSTRAP_BREAKPOINTS },
})

const registeredActions = new Map<string, (...args: any[]) => any>()
const finishListeners = new Set<(ctx: TutorialContext) => void>()
const stopListeners = new Set<(ctx: TutorialContext) => void>()
const stepChangeListeners = new Set<(ctx: TutorialContext) => void>()

const mergedBreakpoints = computed<TutorialBreakpointsConfig>(() => ({
  ...DEFAULT_BOOTSTRAP_BREAKPOINTS,
  ...(globalOptions.value.breakpoints || {}),
}))

const activeBreakpoint = computed<TutorialBreakpointName>(() =>
  calcularBreakpointAtivo(viewportWidth.value, mergedBreakpoints.value)
)

const isMobileViewport = computed(() => viewportWidth.value < mergedBreakpoints.value.md)

const rawStepsSource = computed<TutorialStep[]>(() =>
  declarativeSteps.value.length > 0 ? declarativeSteps.value : imperativeSteps.value
)

// Lista de passos resolvida para o breakpoint atual e filtrada contra passos disabled
const steps = computed<TutorialStep[]>(() => {
  const bp = activeBreakpoint.value
  return rawStepsSource.value
    .map((s) => resolverPassoResponsivo(s, bp))
    .filter((s) => !s.disabled)
})

const currentStep = computed<TutorialStep | null>(
  () => steps.value[currentStepIndex.value] || null
)

const totalSteps = computed(() => steps.value.length)
const isFirstStep = computed(() => currentStepIndex.value <= 0)
const isLastStep = computed(
  () => steps.value.length > 0 && currentStepIndex.value === steps.value.length - 1
)

const progress = computed(() => {
  if (!steps.value.length) return 0
  return Math.round(((currentStepIndex.value + 1) / steps.value.length) * 100)
})

const storageKey = computed(
  () => globalOptions.value.storageKey || 'v-tutorial-completed'
)

async function runRegisteredAction(name: string, ...args: any[]) {
  try {
    const fn = registeredActions.get(name)
    if (fn) return await fn(...args)
  } catch (err) {
    console.warn(`[v-tutorial] Erro ao executar ação "${name}":`, err)
  }
}

async function runActionMap(actions?: TutorialActionMap) {
  if (!actions) return
  if (Array.isArray(actions)) {
    for (const actionName of actions) {
      await runRegisteredAction(actionName)
    }
    await nextTick()
    return
  }

  for (const [actionName, arg] of Object.entries(actions)) {
    if (Array.isArray(arg)) {
      await runRegisteredAction(actionName, ...arg)
    } else if (arg === undefined) {
      await runRegisteredAction(actionName)
    } else {
      await runRegisteredAction(actionName, arg)
    }
  }
  await nextTick()
}

async function ensureRoute(targetRoute?: string) {
  if (!targetRoute || !rawRouter) return
  try {
    const currentPath = rawRouter.currentRoute?.value?.path
    if (currentPath && currentPath !== targetRoute) {
      await rawRouter.push(targetRoute)
      await nextTick()
    }
  } catch (err) {
    console.warn(`[v-tutorial] Erro ao navegar para rota "${targetRoute}":`, err)
  }
}

function getContext(direction: TutorialDirection = lastDirection.value): TutorialContext {
  return {
    currentStepIndex: currentStepIndex.value,
    currentStep: currentStep.value,
    totalSteps: totalSteps.value,
    progress: progress.value,
    isFirstStep: isFirstStep.value,
    isLastStep: isLastStep.value,
    direction,
    activeBreakpoint: activeBreakpoint.value,
    viewportWidth: viewportWidth.value,
    isMobileViewport: isMobileViewport.value,
    nextStep,
    prevStep,
    goToStep,
    endTutorial,
    restartTutorial,
    runRegisteredAction,
    runActionMap,
  }
}

async function aguardarAlvoDoPasso(step: TutorialStep | null, timeoutMs = 1200) {
  if (!step || !step.target || step.placement === 'center') return null
  const shouldScroll = step.autoScroll ?? globalOptions.value.autoScroll ?? true
  const behavior = globalOptions.value.scrollBehavior || 'smooth'
  return aguardarElementoNoDom(step, shouldScroll, behavior, timeoutMs)
}

async function goToStep(
  indexOrId: number | string,
  direction: TutorialDirection = 'forward'
) {
  const index =
    typeof indexOrId === 'number'
      ? indexOrId
      : steps.value.findIndex((s) => s.id === indexOrId)

  if (index < 0 || index >= steps.value.length) return

  isTransitioning.value = true
  lastDirection.value = direction

  try {
    const leavingStep = steps.value[currentStepIndex.value]
    if (leavingStep && isActive.value && currentStepIndex.value !== index) {
      if (leavingStep.leaveActions) {
        await runActionMap(leavingStep.leaveActions)
      }
      if (leavingStep.afterLeave) {
        await leavingStep.afterLeave(getContext(direction))
      }
    }

    currentStepIndex.value = index
    const targetStep = steps.value[index]
    const ctx = getContext(direction)

    if (direction === 'backward') {
      if (targetStep?.rollbackRoute || targetStep?.route) {
        await ensureRoute(targetStep.rollbackRoute || targetStep.route)
      }
      if (targetStep?.rollbackActions) {
        await runActionMap(targetStep.rollbackActions)
      }
      if (targetStep?.onRollback) {
        await targetStep.onRollback(ctx)
      }
    }

    if (targetStep?.route) {
      await ensureRoute(targetStep.route)
    }
    if (targetStep?.enterActions) {
      await runActionMap(targetStep.enterActions)
    }
    if (targetStep?.beforeEnter) {
      await targetStep.beforeEnter(ctx)
    }

    await nextTick()
    await aguardarAlvoDoPasso(targetStep)
  } catch (err) {
    console.error('[v-tutorial] Erro durante transição de passo:', err)
  } finally {
    isTransitioning.value = false
  }

  const updatedCtx = getContext(direction)
  stepChangeListeners.forEach((cb) => cb(updatedCtx))
}

async function nextStep() {
  if (isTransitioning.value) return
  if (currentStepIndex.value < steps.value.length - 1) {
    await goToStep(currentStepIndex.value + 1, 'forward')
  } else {
    completeTutorial()
  }
}

async function prevStep() {
  if (isTransitioning.value) return
  if (currentStepIndex.value > 0) {
    await goToStep(currentStepIndex.value - 1, 'backward')
  }
}

function registerSteps(customSteps: TutorialStep[]) {
  imperativeSteps.value = customSteps
}

function registerDeclarativeStep(step: TutorialStep) {
  const existingIndex = declarativeSteps.value.findIndex((s) => s.id === step.id)
  if (existingIndex >= 0) {
    declarativeSteps.value[existingIndex] = step
  } else {
    declarativeSteps.value.push(step)
  }
}

function updateDeclarativeStep(step: TutorialStep) {
  const existingIndex = declarativeSteps.value.findIndex((s) => s.id === step.id)
  if (existingIndex >= 0) {
    declarativeSteps.value[existingIndex] = step
  }
}

function unregisterDeclarativeStep(id: string) {
  declarativeSteps.value = declarativeSteps.value.filter((s) => s.id !== id)
}

function configureTutorial(options: Partial<TutorialOptions>) {
  if (options.router) {
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

async function startTutorial(customSteps?: TutorialStep[], force = false) {
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
  if (customSteps && customSteps.length > 0) {
    imperativeSteps.value = customSteps
  }
  if (!force && typeof window !== 'undefined' && localStorage.getItem(storageKey.value) === 'true') {
    return
  }
  if (!steps.value.length) return

  isActive.value = true
  currentStepIndex.value = 0
  lastDirection.value = 'start'
  isTransitioning.value = true

  try {
    const first = steps.value[0]
    const ctx = getContext('start')

    if (first?.route) {
      await ensureRoute(first.route)
    }
    if (first?.enterActions) {
      await runActionMap(first.enterActions)
    }
    if (first?.beforeEnter) {
      await first.beforeEnter(ctx)
    }

    await nextTick()
    await aguardarAlvoDoPasso(first)
  } catch (err) {
    console.error('[v-tutorial] Erro ao iniciar tutorial:', err)
  } finally {
    isTransitioning.value = false
  }

  stepChangeListeners.forEach((cb) => cb(getContext('start')))
}

async function restartTutorial() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(storageKey.value)
  }
  await startTutorial(undefined, true)
}

function completeTutorial() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey.value, 'true')
  }
  isTransitioning.value = false
  isActive.value = false
  const ctx = getContext('forward')
  finishListeners.forEach((cb) => cb(ctx))
}

function endTutorial(markAsCompleted = true) {
  if (markAsCompleted && typeof window !== 'undefined') {
    localStorage.setItem(storageKey.value, 'true')
  }
  isTransitioning.value = false
  isActive.value = false
  const ctx = getContext(lastDirection.value)
  stopListeners.forEach((cb) => cb(ctx))
}

async function handleGlobalCaptureClick(event: MouseEvent) {
  if (!isActive.value || isTransitioning.value) return
  const step = currentStep.value
  if (!step || !step.target || step.placement === 'center') return

  const targetElements = resolveStepElements(step)
  const clickedNode = event.target as Node | null
  if (!clickedNode || !targetElements.length) return

  const matchedEl = targetElements.find((el) => el.contains(clickedNode))
  if (!matchedEl) return

  const targetIdAttr = matchedEl.getAttribute('data-tutorial-id') || ''
  const registered = registeredElements.get(targetIdAttr)
  const shouldPreventNative =
    step.preventNativeClick ?? registered?.config.preventNativeClick ?? false

  if (shouldPreventNative) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  const ctx = getContext('forward')

  if (registered?.config.onTutorialClick) {
    await registered.config.onTutorialClick(event, ctx)
  }

  if (step.onTargetClick) {
    await step.onTargetClick(event, ctx)
  }

  if (step.mode === 'wait-click' || step.mode === 'optional-click') {
    isTransitioning.value = true
    const delay = step.afterClickDelay ?? 280
    setTimeout(async () => {
      try {
        if (step.afterClick) {
          await step.afterClick(getContext('forward'))
        }
      } finally {
        isTransitioning.value = false
      }
      await nextStep()
    }, delay)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', handleGlobalCaptureClick, true)
  window.addEventListener(
    'resize',
    () => {
      viewportWidth.value = window.innerWidth
    },
    { passive: true }
  )
}

watch(activeBreakpoint, async () => {
  if (!isActive.value || isTransitioning.value) return
  if (currentStepIndex.value >= steps.value.length) {
    currentStepIndex.value = Math.max(0, steps.value.length - 1)
  }
  const step = currentStep.value
  if (step?.enterActions) {
    await runActionMap(step.enterActions)
  }
  await aguardarAlvoDoPasso(step, 600)
})

export function useTutorial(options?: Partial<TutorialOptions>) {
  if (options) {
    configureTutorial(options)
  }

  function registerTarget(
    elOrRef: HTMLElement | Ref<HTMLElement | null>,
    configOrId: string | TutorialTargetConfig
  ) {
    const config: TutorialTargetConfig =
      typeof configOrId === 'string' ? { id: configOrId } : configOrId

    const register = (el: HTMLElement | null) => {
      if (el) {
        el.setAttribute('data-tutorial-id', config.id)
        registeredElements.set(config.id, { el, config })
      } else {
        registeredElements.delete(config.id)
      }
    }

    if ('value' in elOrRef) {
      watch(elOrRef, (val) => register(val), { immediate: true })
    } else {
      register(elOrRef)
    }
  }

  function wrapTutorialAction<T extends (...args: any[]) => any>(
    stepOrTargetId: string,
    nativeFn: T,
    wrapOptions?: {
      tutorialFn?: (...args: Parameters<T>) => any
      preventNativeWhenActive?: boolean
      autoAdvance?: boolean
    }
  ) {
    return async (...args: Parameters<T>) => {
      if (isActive.value) {
        const targets = Array.isArray(currentStep.value?.target)
          ? currentStep.value?.target
          : [currentStep.value?.target]

        const isCurrentTarget =
          currentStep.value?.id === stepOrTargetId ||
          targets.includes(stepOrTargetId)

        if (wrapOptions?.tutorialFn) {
          await wrapOptions.tutorialFn(...args)
        }

        if (!wrapOptions?.preventNativeWhenActive) {
          await nativeFn(...args)
        }

        if (isCurrentTarget && (wrapOptions?.autoAdvance ?? true)) {
          await nextStep()
        }
        return
      }
      return nativeFn(...args)
    }
  }

  function registerAction(name: string, fn: (...args: any[]) => any) {
    registeredActions.set(name, fn)
  }

  function onFinish(cb: (ctx: TutorialContext) => void) {
    finishListeners.add(cb)
    if (getCurrentScope()) {
      onScopeDispose(() => finishListeners.delete(cb))
    }
    return () => finishListeners.delete(cb)
  }

  function onStop(cb: (ctx: TutorialContext) => void) {
    stopListeners.add(cb)
    if (getCurrentScope()) {
      onScopeDispose(() => stopListeners.delete(cb))
    }
    return () => stopListeners.delete(cb)
  }

  function onStepChange(cb: (ctx: TutorialContext) => void) {
    stepChangeListeners.add(cb)
    if (getCurrentScope()) {
      onScopeDispose(() => stepChangeListeners.delete(cb))
    }
    return () => stepChangeListeners.delete(cb)
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

export const vTutorial: Directive<
  HTMLElement,
  string | TutorialTargetConfig | undefined
> = {
  mounted(el, binding) {
    if (!binding.value) return
    const config: TutorialTargetConfig =
      typeof binding.value === 'string' ? { id: binding.value } : binding.value

    if (!config?.id) return
    el.setAttribute('data-tutorial-id', config.id)
    registeredElements.set(config.id, { el, config })
  },
  updated(el, binding) {
    if (!binding.value) {
      const prevId = el.getAttribute('data-tutorial-id')
      if (prevId) {
        const current = registeredElements.get(prevId)
        if (current?.el === el) {
          registeredElements.delete(prevId)
        }
        el.removeAttribute('data-tutorial-id')
      }
      return
    }
    const config: TutorialTargetConfig =
      typeof binding.value === 'string' ? { id: binding.value } : binding.value

    if (!config?.id) return
    el.setAttribute('data-tutorial-id', config.id)
    registeredElements.set(config.id, { el, config })
  },
  unmounted(el, binding) {
    const id =
      typeof binding.value === 'string'
        ? binding.value
        : binding.value?.id || el.getAttribute('data-tutorial-id')
    if (id) {
      const current = registeredElements.get(id)
      if (current?.el === el) {
        registeredElements.delete(id)
      }
    }
  },
}