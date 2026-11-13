<!--
========
Provedor visual e Headless do sistema de tutorial (TutorialProvider.vue).
Delega o cálculo geométrico e anti-colisão para positioning.ts, mantendo o componente
focado na renderização dos escudos, spotlight, seta indicadora e Scoped Slots.
========
-->
<template>
  <!-- Renderiza eventuais <VTutorialStep> filhos passados declarativamente -->
  <slot />

  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div
        v-if="isActive && currentStep"
        :class="[
          !isUnstyled && 'v-tutorial-root',
          !isUnstyled && `breakpoint-${activeBreakpoint}`,
          mergedClasses.root,
        ]"
      >
        <!-- SLOT: Botão Global de Sair no Topo Direito -->
        <slot name="exit-button" v-bind="slotContext">
          <button
            type="button"
            :class="[
              !isUnstyled && 'v-tutorial-exit-pill',
              mergedClasses.exitPill,
            ]"
            @click.prevent="endTutorial(true)"
            :title="`${mergedLabels.skipTutorial} (Esc)`"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6l-12 12" />
              <path d="M6 6l12 12" />
            </svg>
            <span>{{ mergedLabels.skipTutorial }}</span>
          </button>
        </slot>

        <!-- CENÁRIO 1: Passo COM elemento destacado (4 escudos + Spotlight Ring) -->
        <template v-if="hasTargetBox">
          <div
            :class="[!isUnstyled && 'sistec-click-shield', mergedClasses.shield]"
            :style="{
              top: '0px',
              left: '0px',
              width: '100vw',
              height: `${spotlightBox.y}px`,
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'sistec-click-shield', mergedClasses.shield]"
            :style="{
              top: `${spotlightBox.y + spotlightBox.height}px`,
              left: '0px',
              width: '100vw',
              bottom: '0px',
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'sistec-click-shield', mergedClasses.shield]"
            :style="{
              top: `${spotlightBox.y}px`,
              left: '0px',
              width: `${spotlightBox.x}px`,
              height: `${spotlightBox.height}px`,
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'sistec-click-shield', mergedClasses.shield]"
            :style="{
              top: `${spotlightBox.y}px`,
              left: `${spotlightBox.x + spotlightBox.width}px`,
              right: '0px',
              height: `${spotlightBox.height}px`,
            }"
          ></div>

          <slot
            name="spotlight"
            v-bind="slotContext"
            :spotlight-box="spotlightBox"
          >
            <div
              :class="[
                !isUnstyled && 'v-tutorial-spotlight-ring',
                !isUnstyled && currentStep.mode === 'wait-click' && 'is-wait-click',
                mergedClasses.spotlight,
              ]"
              :style="{
                top: `${spotlightBox.y}px`,
                left: `${spotlightBox.x}px`,
                width: `${spotlightBox.width}px`,
                height: `${spotlightBox.height}px`,
              }"
            ></div>
          </slot>
        </template>

        <!-- CENÁRIO 2: Passo SEM elemento destacado (Backdrop centralizado) -->
        <div
          v-else
          :class="[!isUnstyled && 'sistec-full-backdrop', mergedClasses.backdrop]"
        ></div>

        <!-- Card Flutuante do Tutorial -->
        <div
          ref="cardRef"
          :class="[
            !isUnstyled && 'v-tutorial-card',
            !isUnstyled && `is-placement-${cardPosition.resolvedPlacement}`,
            mergedClasses.card,
          ]"
          :style="cardPosition.cardStyle"
          role="dialog"
          aria-modal="true"
        >
          <!-- Seta indicadora apontando para o elemento alvo -->
          <div
            v-if="hasTargetBox && shouldShowArrow && cardPosition.arrowStyle"
            :class="[
              !isUnstyled && 'v-tutorial-arrow',
              !isUnstyled && `arrow-${cardPosition.resolvedPlacement}`,
              mergedClasses.arrow,
            ]"
            :style="cardPosition.arrowStyle"
          ></div>

          <slot name="card" v-bind="slotContext">
            <slot name="header" v-bind="slotContext">
              <div
                :class="[
                  !isUnstyled && 'v-tutorial-card-header',
                  mergedClasses.header,
                ]"
              >
                <span
                  :class="[
                    !isUnstyled && 'v-tutorial-step-badge',
                    mergedClasses.badge,
                  ]"
                >
                  {{
                    mergedLabels.stepCounter(
                      currentStepIndex + 1,
                      steps.length
                    )
                  }}
                </span>

                <span
                  v-if="currentStep.mode === 'wait-click'"
                  :class="[
                    !isUnstyled && 'v-tutorial-mode-tag',
                    mergedClasses.modeTag,
                  ]"
                >
                  {{ mergedLabels.interactiveBadge }}
                </span>
              </div>
            </slot>

            <slot name="body" v-bind="slotContext">
              <div
                :class="[
                  !isUnstyled && 'v-tutorial-card-body',
                  mergedClasses.body,
                ]"
              >
                <h3
                  :class="[
                    !isUnstyled && 'v-tutorial-title',
                    mergedClasses.title,
                  ]"
                >
                  {{ currentStep.title }}
                </h3>

                <component
                  :is="currentStep.component"
                  v-if="currentStep.component"
                  v-bind="currentStep.componentProps"
                  :context="slotContext"
                />

                <div
                  v-else-if="currentStep.content"
                  :class="[
                    !isUnstyled && 'v-tutorial-content',
                    mergedClasses.content,
                  ]"
                  v-html="currentStep.content"
                ></div>

                <div
                  id="v-tutorial-step-slot-anchor"
                  :class="[
                    !isUnstyled && 'v-tutorial-content',
                    mergedClasses.content,
                  ]"
                ></div>
              </div>
            </slot>

            <slot
              v-if="
                currentStep.mode === 'wait-click' ||
                currentStep.mode === 'optional-click'
              "
              name="hint"
              v-bind="slotContext"
            >
              <div
                :class="[
                  !isUnstyled && 'v-tutorial-click-banner',
                  mergedClasses.hintBanner,
                ]"
              >
                <svg
                  class="pulse-click-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 12l3 0" />
                  <path d="M12 3l0 3" />
                  <path d="M7.8 7.8l-2.2 -2.2" />
                  <path d="M16.2 7.8l2.2 -2.2" />
                  <path d="M7.8 16.2l-2.2 2.2" />
                  <path d="M12 12l9 3l-4 2l-2 4l-3 -9" />
                </svg>
                <span>
                  {{ currentStep.hintText || mergedLabels.defaultHint }}
                </span>
              </div>
            </slot>

            <slot name="progress" v-bind="slotContext">
              <div
                :class="[
                  !isUnstyled && 'v-tutorial-progress',
                  mergedClasses.progressContainer,
                ]"
              >
                <div
                  :class="[
                    !isUnstyled && 'v-tutorial-progress-bar',
                    mergedClasses.progressBar,
                  ]"
                  :style="{ width: `${progress}%` }"
                ></div>
              </div>
            </slot>

            <slot name="footer" v-bind="slotContext">
              <div
                :class="[
                  !isUnstyled && 'v-tutorial-card-footer',
                  mergedClasses.footer,
                ]"
              >
                <button
                  type="button"
                  :class="[
                    !isUnstyled && 'v-tutorial-btn-skip btn btn-sm btn-outline-danger fw-semibold px-2 py-1',
                    mergedClasses.skipButton,
                  ]"
                  @click.prevent="endTutorial(true)"
                >
                  {{ mergedLabels.skipTutorial }}
                </button>

                <div class="v-tutorial-nav-group d-flex align-items-center gap-2">
                  <button
                    v-if="currentStepIndex > 0"
                    type="button"
                    :class="[
                      !isUnstyled && 'v-tutorial-btn-prev btn btn-sm btn-ghost-secondary d-inline-flex align-items-center gap-1',
                      mergedClasses.prevButton,
                    ]"
                    @click.prevent="prevStep"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M15 6l-6 6l6 6" />
                    </svg>
                    <span>{{ mergedLabels.previous }}</span>
                  </button>

                  <button
                    v-if="currentStep.mode !== 'wait-click'"
                    type="button"
                    :class="[
                      !isUnstyled && 'v-tutorial-btn-next btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-3 fw-bold',
                      mergedClasses.nextButton,
                    ]"
                    @click.prevent="nextStep"
                  >
                    <span>
                      {{
                        isLastStep ? mergedLabels.finish : mergedLabels.next
                      }}
                    </span>
                    <svg
                      v-if="isLastStep"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M5 12l5 5l10 -10" />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 6l6 6l-6 6" />
                    </svg>
                  </button>

                  <span
                    v-else
                    :class="[
                      !isUnstyled && 'sistec-wait-pill',
                      mergedClasses.waitPill,
                    ]"
                  >
                    {{ mergedLabels.waitingClick }}
                  </span>
                </div>
              </div>
            </slot>
          </slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  provide,
  onMounted,
  onUnmounted,
  watch,
} from 'vue'
import { useTutorial } from './useTutorial'
import { calcularPosicaoCard } from './positioning'
import { TUTORIAL_PROVIDER_KEY } from './keys'
import type {
  TutorialStep,
  TutorialLabels,
  TutorialClasses,
  TutorialBreakpointsConfig,
} from './types'

const props = withDefaults(
  defineProps<{
    steps?: TutorialStep[]
    storageKey?: string
    autoStart?: boolean
    startDelay?: number
    unstyled?: boolean
    showArrow?: boolean
    mobileSheetOnAuto?: boolean
    breakpoints?: Partial<TutorialBreakpointsConfig>
    spotlightPadding?: number
    cardWidth?: number
    labels?: TutorialLabels
    classes?: TutorialClasses
  }>(),
  {
    autoStart: false,
    startDelay: 400,
    unstyled: undefined,
    showArrow: undefined,
    mobileSheetOnAuto: undefined,
  }
)

const emit = defineEmits<{
  (e: 'finish'): void
  (e: 'stop'): void
  (e: 'step-change', step: TutorialStep | null, index: number): void
}>()

const {
  isActive,
  steps,
  currentStepIndex,
  currentStep,
  isTransitioning,
  progress,
  isFirstStep,
  isLastStep,
  activeBreakpoint,
  isMobileViewport,
  globalOptions,
  configureTutorial,
  registerSteps,
  startTutorial,
  restartTutorial,
  nextStep,
  prevStep,
  goToStep,
  endTutorial,
  resolveStepElements,
  getStepBoundingRect,
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  onFinish,
  onStop,
  onStepChange,
  getContext,
} = useTutorial()

if (props.storageKey || props.breakpoints || props.mobileSheetOnAuto !== undefined) {
  configureTutorial({
    ...(props.storageKey ? { storageKey: props.storageKey } : {}),
    ...(props.breakpoints ? { breakpoints: props.breakpoints } : {}),
    ...(props.mobileSheetOnAuto !== undefined
      ? { mobileSheetOnAuto: props.mobileSheetOnAuto }
      : {}),
  })
}

provide(TUTORIAL_PROVIDER_KEY, {
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  activeStepId: computed(() => currentStep.value?.id || null),
})

onFinish(() => emit('finish'))
onStop(() => emit('stop'))
onStepChange((ctx) => emit('step-change', ctx.currentStep, ctx.currentStepIndex))

const isUnstyled = computed(
  () => props.unstyled ?? globalOptions.value.unstyled ?? false
)

const shouldShowArrow = computed(
  () => props.showArrow ?? globalOptions.value.showArrow ?? true
)

const mergedLabels = computed(() => ({
  skipTutorial:
    props.labels?.skipTutorial ??
    globalOptions.value.labels?.skipTutorial ??
    'Pular tutorial',
  previous:
    props.labels?.previous ??
    globalOptions.value.labels?.previous ??
    'Anterior',
  next:
    props.labels?.next ??
    globalOptions.value.labels?.next ??
    'Próximo',
  finish:
    props.labels?.finish ??
    globalOptions.value.labels?.finish ??
    'Concluir',
  waitingClick:
    props.labels?.waitingClick ??
    globalOptions.value.labels?.waitingClick ??
    'Aguardando clique...',
  interactiveBadge:
    props.labels?.interactiveBadge ??
    globalOptions.value.labels?.interactiveBadge ??
    'Interativo',
  defaultHint:
    props.labels?.defaultHint ??
    globalOptions.value.labels?.defaultHint ??
    'Clique no item destacado na tela para continuar!',
  stepCounter:
    props.labels?.stepCounter ??
    globalOptions.value.labels?.stepCounter ??
    ((current: number, total: number) => `Passo ${current} de ${total}`),
}))

const mergedClasses = computed<TutorialClasses>(() => ({
  ...globalOptions.value.classes,
  ...props.classes,
}))

const slotContext = computed(() => ({
  ...getContext(),
  step: currentStep.value,
  stepIndex: currentStepIndex.value,
  totalSteps: steps.value.length,
  progress: progress.value,
  isFirstStep: isFirstStep.value,
  isLastStep: isLastStep.value,
  nextStep,
  prevStep,
  goToStep,
  endTutorial,
  restartTutorial,
}))

const cardRef = ref<HTMLElement | null>(null)
const targetRect = ref<DOMRect | null>(null)
const viewportSize = ref({
  w: typeof window !== 'undefined' ? window.innerWidth : 1024,
  h: typeof window !== 'undefined' ? window.innerHeight : 768,
})

let rafId: number | null = null
let transitionEndTime = 0
let resizeObserver: ResizeObserver | null = null

const effectivePadding = computed(
  () =>
    currentStep.value?.spotlightPadding ??
    props.spotlightPadding ??
    globalOptions.value.spotlightPadding ??
    6
)

const hasTargetBox = computed(() => {
  return (
    !!currentStep.value?.target &&
    currentStep.value.placement !== 'center' &&
    !!targetRect.value &&
    targetRect.value.width > 0 &&
    targetRect.value.height > 0
  )
})

const spotlightBox = computed(() => {
  if (!targetRect.value) return { x: 0, y: 0, width: 0, height: 0 }
  const pad = effectivePadding.value
  return {
    x: Math.max(2, targetRect.value.left - pad),
    y: Math.max(2, targetRect.value.top - pad),
    width: targetRect.value.width + pad * 2,
    height: targetRect.value.height + pad * 2,
  }
})

const cardPosition = computed(() =>
  calcularPosicaoCard({
    hasTargetBox: hasTargetBox.value,
    spotlightBox: spotlightBox.value,
    viewportW: viewportSize.value.w,
    viewportH: viewportSize.value.h,
    maxCardW:
      currentStep.value?.cardWidth ??
      props.cardWidth ??
      globalOptions.value.cardWidth ??
      370,
    cardHeight: cardRef.value?.offsetHeight || 245,
    requestedPlacement: currentStep.value?.placement || 'auto',
    isMobileViewport: isMobileViewport.value,
    useMobileSheet:
      props.mobileSheetOnAuto ?? globalOptions.value.mobileSheetOnAuto ?? true,
  })
)

function measureTargetNow() {
  if (!isActive.value) return
  viewportSize.value = {
    w: window.innerWidth,
    h: window.innerHeight,
  }
  if (!currentStep.value?.target || currentStep.value.placement === 'center') {
    targetRect.value = null
    return
  }
  targetRect.value = getStepBoundingRect(currentStep.value)
}

function startTransitionTracking(durationMs = 500) {
  transitionEndTime = performance.now() + durationMs
  if (rafId !== null) return

  const tick = (now: number) => {
    measureTargetNow()
    if (isActive.value && now < transitionEndTime) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = null
    }
  }
  rafId = requestAnimationFrame(tick)
}

function attachElementObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (typeof ResizeObserver === 'undefined' || !isActive.value) return

  resizeObserver = new ResizeObserver(() => {
    startTransitionTracking(350)
  })

  const elements = resolveStepElements(currentStep.value)
  elements.forEach((el) => resizeObserver?.observe(el))

  if (cardRef.value) {
    resizeObserver.observe(cardRef.value)
  }
}

function handleViewportEvent() {
  if (!isActive.value) return
  startTransitionTracking(400)
}

function handleKeydown(e: KeyboardEvent) {
  if (!isActive.value) return
  if (e.key === 'Escape') {
    endTutorial(true)
  } else if (e.key === 'ArrowRight' && currentStep.value?.mode !== 'wait-click') {
    nextStep()
  } else if (e.key === 'ArrowLeft') {
    prevStep()
  }
}

watch(
  () => props.steps,
  (newSteps) => {
    if (newSteps && newSteps.length > 0) {
      registerSteps(newSteps)
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => [
    isActive.value,
    isTransitioning.value,
    currentStepIndex.value,
    activeBreakpoint.value,
    currentStep.value?.target,
    currentStep.value?.placement,
  ],
  () => {
    if (!isActive.value) {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      resizeObserver?.disconnect()
      return
    }
    measureTargetNow()
    attachElementObserver()
    startTransitionTracking(600)
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleViewportEvent, { passive: true })
  window.addEventListener('scroll', handleViewportEvent, {
    passive: true,
    capture: true,
  })
  window.addEventListener('transitionrun', handleViewportEvent, {
    passive: true,
    capture: true,
  })
  window.addEventListener('animationstart', handleViewportEvent, {
    passive: true,
    capture: true,
  })

  if (props.autoStart) {
    setTimeout(() => {
      startTutorial()
    }, props.startDelay)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleViewportEvent)
  window.removeEventListener('scroll', handleViewportEvent, true)
  window.removeEventListener('transitionrun', handleViewportEvent, true)
  window.removeEventListener('animationstart', handleViewportEvent, true)
  if (rafId) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
})
</script>

<style lang="scss">
.v-tutorial-root {
  --v-tutorial-primary: var(--tblr-primary, #206bc4);
  --v-tutorial-bg: var(--tblr-bg-surface, #ffffff);
  --v-tutorial-bg-secondary: var(--tblr-bg-surface-secondary, #f8fafc);
  --v-tutorial-text: var(--tblr-body-color, #1e293b);
  --v-tutorial-muted: var(--tblr-secondary, #64748b);
  --v-tutorial-border: var(--tblr-border-color-translucent, rgba(15, 23, 42, 0.12));
  --v-tutorial-danger: var(--tblr-danger, #d63939);
  --v-tutorial-backdrop: rgba(10, 14, 23, 0.68);
  --v-tutorial-radius: 16px;
  --v-tutorial-z-index: 10040;

  position: fixed;
  inset: 0;
  z-index: var(--v-tutorial-z-index);
  pointer-events: none;
  font-family: inherit;
}

[data-bs-theme='dark'] .v-tutorial-root,
.dark .v-tutorial-root {
  --v-tutorial-bg: var(--tblr-bg-surface, #1e293b);
  --v-tutorial-bg-secondary: var(--tblr-bg-surface-secondary, #0f172a);
  --v-tutorial-text: var(--tblr-body-color, #f8fafc);
  --v-tutorial-muted: var(--tblr-secondary, #94a3b8);
  --v-tutorial-border: var(--tblr-border-color-translucent, rgba(255, 255, 255, 0.12));
}

.sistec-full-backdrop {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: var(--v-tutorial-backdrop);
  pointer-events: auto;
  z-index: calc(var(--v-tutorial-z-index) + 1);
}

.sistec-click-shield {
  position: fixed;
  z-index: calc(var(--v-tutorial-z-index) + 1);
  pointer-events: auto;
  background: transparent;
}

.v-tutorial-spotlight-ring {
  position: fixed;
  border-radius: 12px;
  border: 3px solid var(--v-tutorial-primary);
  box-shadow: 0 0 0 9999px var(--v-tutorial-backdrop),
    0 0 0 4px color-mix(in srgb, var(--v-tutorial-primary), transparent 70%),
    0 0 28px color-mix(in srgb, var(--v-tutorial-primary), transparent 35%);
  pointer-events: none !important;
  transition: top 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    left 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: calc(var(--v-tutorial-z-index) + 2);

  &.is-wait-click {
    animation: spotlightPulse 1.5s infinite ease-in-out;
  }
}

@keyframes spotlightPulse {
  0%,
  100% {
    box-shadow: 0 0 0 9999px var(--v-tutorial-backdrop),
      0 0 0 4px color-mix(in srgb, var(--v-tutorial-primary), transparent 65%),
      0 0 25px color-mix(in srgb, var(--v-tutorial-primary), transparent 35%);
  }
  50% {
    box-shadow: 0 0 0 9999px var(--v-tutorial-backdrop),
      0 0 0 9px color-mix(in srgb, var(--v-tutorial-primary), transparent 85%),
      0 0 35px color-mix(in srgb, var(--v-tutorial-primary), transparent 15%);
  }
}

.v-tutorial-card {
  position: fixed;
  max-width: calc(100vw - 24px);
  background: var(--v-tutorial-bg);
  color: var(--v-tutorial-text);
  border: 1px solid color-mix(in srgb, var(--v-tutorial-primary), var(--v-tutorial-border) 55%);
  border-radius: var(--v-tutorial-radius);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.42);
  pointer-events: auto;
  z-index: calc(var(--v-tutorial-z-index) + 15);
  overflow: visible;
  transition: top 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    left 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    bottom 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.v-tutorial-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--v-tutorial-bg);
  border-color: color-mix(in srgb, var(--v-tutorial-primary), var(--v-tutorial-border) 55%);
  border-style: solid;
  border-width: 0;
  pointer-events: none;
  z-index: -1;

  &.arrow-right {
    left: -6px;
    transform: translateY(-50%) rotate(45deg);
    border-left-width: 1px;
    border-bottom-width: 1px;
  }

  &.arrow-left {
    right: -6px;
    transform: translateY(-50%) rotate(45deg);
    border-right-width: 1px;
    border-top-width: 1px;
  }

  &.arrow-bottom {
    top: -6px;
    transform: translateX(-50%) rotate(45deg);
    border-left-width: 1px;
    border-top-width: 1px;
  }

  &.arrow-top {
    bottom: -6px;
    transform: translateX(-50%) rotate(45deg);
    border-right-width: 1px;
    border-bottom-width: 1px;
  }
}

.v-tutorial-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1.1rem;
  background: color-mix(in srgb, var(--v-tutorial-primary), transparent 90%);
  border-bottom: 1px solid var(--v-tutorial-border);
  border-radius: calc(var(--v-tutorial-radius) - 1px) calc(var(--v-tutorial-radius) - 1px) 0 0;
}

.v-tutorial-step-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--v-tutorial-primary);
  background: color-mix(in srgb, var(--v-tutorial-primary), transparent 84%);
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
}

.v-tutorial-mode-tag {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--v-tutorial-muted);
}

.v-tutorial-card-body {
  padding: 1rem 1.1rem;
}

.v-tutorial-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--v-tutorial-text);
}

.v-tutorial-content {
  font-size: 0.88rem;
  line-height: 1.48;
  color: var(--v-tutorial-muted);
}

.v-tutorial-click-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--v-tutorial-primary);
  background: color-mix(in srgb, var(--v-tutorial-primary), transparent 90%);
  border-top: 1px dashed color-mix(in srgb, var(--v-tutorial-primary), transparent 65%);
}

.pulse-click-icon {
  flex-shrink: 0;
  animation: iconBounce 1.1s infinite ease-in-out;
}

@keyframes iconBounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
}

.v-tutorial-progress {
  height: 4px;
  width: 100%;
  background: var(--v-tutorial-border);
}

.v-tutorial-progress-bar {
  height: 100%;
  background: var(--v-tutorial-primary);
  transition: width 0.3s ease;
}

.v-tutorial-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1.1rem;
  background: color-mix(in srgb, var(--v-tutorial-bg-secondary), transparent 35%);
  border-top: 1px solid var(--v-tutorial-border);
  border-radius: 0 0 calc(var(--v-tutorial-radius) - 1px) calc(var(--v-tutorial-radius) - 1px);

  button {
    margin: 0 !important;
  }
}

.v-tutorial-nav-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.v-tutorial-btn-skip,
.v-tutorial-btn-prev,
.v-tutorial-btn-next {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.v-tutorial-btn-skip {
  background: transparent;
  color: var(--v-tutorial-danger);
  border: 1px solid color-mix(in srgb, var(--v-tutorial-danger), transparent 50%);

  &:hover {
    background: var(--v-tutorial-danger);
    color: #fff;
  }
}

.v-tutorial-btn-prev {
  background: transparent;
  color: var(--v-tutorial-muted);
  border: 1px solid transparent;

  &:hover {
    background: color-mix(in srgb, var(--v-tutorial-muted), transparent 88%);
    color: var(--v-tutorial-text);
  }
}

.v-tutorial-btn-next {
  background: var(--v-tutorial-primary);
  color: #fff;
  border: 1px solid var(--v-tutorial-primary);
  padding: 0.35rem 0.9rem;
  font-weight: 700;

  &:hover {
    filter: brightness(1.08);
  }
}

.sistec-wait-pill {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--v-tutorial-primary);
  background: color-mix(in srgb, var(--v-tutorial-primary), transparent 88%);
  border: 1px solid color-mix(in srgb, var(--v-tutorial-primary), transparent 65%);
  padding: 0.28rem 0.7rem;
  border-radius: 8px;
}

.v-tutorial-exit-pill {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: calc(var(--v-tutorial-z-index) + 20);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  background: var(--v-tutorial-danger);
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 24px rgba(214, 57, 57, 0.55);
  cursor: pointer;
  margin: 0 !important;
  transition: transform 0.15s ease, background-color 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(0.92);
  }
}

.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}
</style>