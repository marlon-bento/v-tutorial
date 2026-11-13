<!--
========
Componente declarativo de passo de tutorial (TutorialStep.vue).
Suporta configuração Mobile-First em cascata estilo Bootstrap via objeto :breakpoints="{ md: { ... } }"
ou via props diretas (target-sm, target-md, target-lg, placement-md, etc.).
========
-->
<template>
  <Teleport
    v-if="isCurrentStep && canTeleportSlot && $slots.default"
    to="#v-tutorial-step-slot-anchor"
  >
    <slot :context="getContext()" />
  </Teleport>
</template>

<script setup lang="ts">
import {
  inject,
  computed,
  watch,
  onMounted,
  onUnmounted,
  ref,
  nextTick,
  type Component,
} from 'vue'
import { TUTORIAL_PROVIDER_KEY } from './keys'
import { useTutorial } from './useTutorial'
import type {
  TutorialStep,
  TutorialStepMode,
  TutorialPlacement,
  TutorialContext,
  TutorialActionMap,
  TutorialBreakpointName,
  TutorialStepResponsiveOverride,
} from './types'

const props = withDefaults(
  defineProps<{
    id?: string
    target?: string | string[]
    title: string
    content?: string
    component?: Component
    componentProps?: Record<string, any>
    mode?: TutorialStepMode
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
    /** Mapa responsivo Mobile-First: { xs, sm, md, lg, xl, xxl } */
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
  }>(),
  {
    mode: 'info',
    placement: 'auto',
    disabled: false,
  }
)

const provider = inject(TUTORIAL_PROVIDER_KEY, null)
const {
  currentStep,
  registerDeclarativeStep,
  updateDeclarativeStep,
  unregisterDeclarativeStep,
  getContext,
} = useTutorial()

const stepId = props.id || `tutorial-step-${Math.random().toString(36).substring(2, 9)}`
const canTeleportSlot = ref(false)

const isCurrentStep = computed(() => {
  const activeId = provider?.activeStepId.value ?? currentStep.value?.id
  return activeId === stepId
})

function buildStepObject(): TutorialStep {
  return {
    id: stepId,
    target: props.target,
    title: props.title,
    content: props.content,
    component: props.component,
    componentProps: props.componentProps,
    mode: props.mode,
    placement: props.placement,
    hintText: props.hintText,
    preventNativeClick: props.preventNativeClick,
    afterClickDelay: props.afterClickDelay,
    autoScroll: props.autoScroll,
    spotlightPadding: props.spotlightPadding,
    cardWidth: props.cardWidth,
    disabled: props.disabled,
    route: props.route,
    rollbackRoute: props.rollbackRoute,
    enterActions: props.enterActions,
    rollbackActions: props.rollbackActions,
    leaveActions: props.leaveActions,
    breakpoints: props.breakpoints,
    targetSm: props.targetSm,
    targetMd: props.targetMd,
    targetLg: props.targetLg,
    targetXl: props.targetXl,
    targetXxl: props.targetXxl,
    placementSm: props.placementSm,
    placementMd: props.placementMd,
    placementLg: props.placementLg,
    placementXl: props.placementXl,
    placementXxl: props.placementXxl,
    beforeEnter: props.beforeEnter,
    onRollback: props.onRollback,
    onTargetClick: props.onTargetClick,
    afterClick: props.afterClick,
    afterLeave: props.afterLeave,
  }
}

watch(
  isCurrentStep,
  async (ativo) => {
    if (ativo) {
      await nextTick()
      canTeleportSlot.value = !!document.getElementById('v-tutorial-step-slot-anchor')
    } else {
      canTeleportSlot.value = false
    }
  },
  { immediate: true }
)

watch(
  () => [
    props.target,
    props.targetSm,
    props.targetMd,
    props.targetLg,
    props.targetXl,
    props.targetXxl,
    props.title,
    props.content,
    props.mode,
    props.placement,
    props.placementSm,
    props.placementMd,
    props.placementLg,
    props.placementXl,
    props.placementXxl,
    props.hintText,
    props.disabled,
    props.route,
    props.rollbackRoute,
    props.breakpoints,
  ],
  () => {
    const stepObj = buildStepObject()
    if (provider) {
      provider.updateDeclarativeStep(stepObj)
    } else {
      updateDeclarativeStep(stepObj)
    }
  }
)

onMounted(() => {
  const stepObj = buildStepObject()
  if (provider) {
    provider.registerDeclarativeStep(stepObj)
  } else {
    registerDeclarativeStep(stepObj)
  }
})

onUnmounted(() => {
  if (provider) {
    provider.unregisterDeclarativeStep(stepId)
  } else {
    unregisterDeclarativeStep(stepId)
  }
})
</script>