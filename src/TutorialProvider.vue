<!--
========
Provedor visual e Headless do sistema de tutorial (src/TutorialProvider.vue).
Delega o rastreamento de DOM/ResizeObserver para useSpotlightTracker.ts e os estilos para
tutorial.scss, mantendo o componente focado na estrutura visual dos 4 escudos, spotlight,
seta indicadora e Scoped Slots customizáveis.
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
        <!-- SLOT OPCIONAL: Permite que o desenvolvedor adicione um controle externo se desejar -->
        <slot name="exit-button" v-bind="slotContext" />

        <!-- CENÁRIO 1: Passo COM elemento destacado (4 escudos + Spotlight Ring) -->
        <template v-if="hasTargetBox">
          <div
            :class="[!isUnstyled && 'v-tutorial-click-shield', mergedClasses.shield]"
            :style="{
              top: '0px',
              left: '0px',
              width: '100vw',
              height: `${spotlightBox.y}px`,
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'v-tutorial-click-shield', mergedClasses.shield]"
            :style="{
              top: `${spotlightBox.y + spotlightBox.height}px`,
              left: '0px',
              width: '100vw',
              bottom: '0px',
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'v-tutorial-click-shield', mergedClasses.shield]"
            :style="{
              top: `${spotlightBox.y}px`,
              left: '0px',
              width: `${spotlightBox.x}px`,
              height: `${spotlightBox.height}px`,
            }"
          ></div>
          <div
            :class="[!isUnstyled && 'v-tutorial-click-shield', mergedClasses.shield]"
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
          :class="[!isUnstyled && 'v-tutorial-full-backdrop', mergedClasses.backdrop]"
        ></div>

        <!-- Card Flutuante do Tutorial -->
        <div
          :ref="setCardRef"
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
                      !isUnstyled && 'v-tutorial-wait-pill',
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
import { computed, provide, watch } from 'vue'
import { useTutorial } from './useTutorial'
import { useSpotlightTracker } from './useSpotlightTracker'
import { TUTORIAL_PROVIDER_KEY } from './keys'
import type {
  TutorialStep,
  TutorialLabels,
  TutorialClasses,
  TutorialBreakpointsConfig,
} from './types'

// Propriedades de configuração aceitas pelo componente <TutorialProvider>
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

// Eventos de ciclo de vida emitidos pelo componente para o template pai
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
  progress,
  isFirstStep,
  isLastStep,
  activeBreakpoint,
  globalOptions,
  configureTutorial,
  registerSteps,
  restartTutorial,
  nextStep,
  prevStep,
  goToStep,
  endTutorial,
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  onFinish,
  onStop,
  onStepChange,
  getContext,
} = useTutorial()

// Aplica configurações globais caso tenham sido passadas via props no Provider
if (props.storageKey || props.breakpoints || props.mobileSheetOnAuto !== undefined) {
  configureTutorial({
    ...(props.storageKey ? { storageKey: props.storageKey } : {}),
    ...(props.breakpoints ? { breakpoints: props.breakpoints } : {}),
    ...(props.mobileSheetOnAuto !== undefined
      ? { mobileSheetOnAuto: props.mobileSheetOnAuto }
      : {}),
  })
}

// Fornece métodos de registro automático para os componentes filhos <VTutorialStep>
provide(TUTORIAL_PROVIDER_KEY, {
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  activeStepId: computed(() => currentStep.value?.id || null),
})

// Conecta os listeners internos aos emits do componente Vue
onFinish(() => emit('finish'))
onStop(() => emit('stop'))
onStepChange((ctx) => emit('step-change', ctx.currentStep, ctx.currentStepIndex))

// Define se o componente deve operar em modo Headless (sem classes visuais padrão)
const isUnstyled = computed(
  () => props.unstyled ?? globalOptions.value.unstyled ?? false
)

// Define se a seta triangular apontando para o alvo deve ser exibida
const shouldShowArrow = computed(
  () => props.showArrow ?? globalOptions.value.showArrow ?? true
)

// Textos da interface mesclando props locais, configuração global e padrões em português
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

// Classes CSS extras mesclando as opções globais com as props do componente
const mergedClasses = computed<TutorialClasses>(() => ({
  ...globalOptions.value.classes,
  ...props.classes,
}))

// Contexto completo entregue para todos os Scoped Slots do <TutorialProvider>
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

// Inicializa o rastreador geométrico do Spotlight, ResizeObserver e atalhos de teclado
const {
  setCardRef,
  hasTargetBox,
  spotlightBox,
  cardPosition,
} = useSpotlightTracker(props)

// Sincroniza a fila imperativa caso o desenvolvedor passe um array na prop :steps
watch(
  () => props.steps,
  (newSteps) => {
    if (newSteps && newSteps.length > 0) {
      registerSteps(newSteps)
    }
  },
  { immediate: true, deep: true }
)
</script>

<style lang="scss">
@use './tutorial.scss';
</style>