/*
========
Módulo de responsividade Mobile-First da biblioteca v-tutorial (responsive.ts).
Gerencia os breakpoints no padrão Bootstrap 5 (xs, sm, md, lg, xl, xxl) e aplica a herança
em cascata das propriedades de cada passo conforme a largura atual da tela.
========
*/
import type {
  TutorialBreakpointName,
  TutorialBreakpointsConfig,
  TutorialStep,
  TutorialStepResponsiveOverride,
} from './types'

// Sequência ordenada de breakpoints Mobile-First (min-width)
export const BOOTSTRAP_BREAKPOINT_ORDER: TutorialBreakpointName[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
]

// Valores padrão em pixels idênticos ao Bootstrap 5
export const DEFAULT_BOOTSTRAP_BREAKPOINTS: TutorialBreakpointsConfig = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
}

/*
Calcula qual breakpoint está ativo com base na largura da janela.
Recebe: larguraTela (número em pixels) e config (limiares de cada breakpoint).
Devolve: nome do breakpoint ativo ('xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl').
Por que é usada: Permite reagir dinamicamente ao redimensionamento da janela.
*/
export function calcularBreakpointAtivo(
  larguraTela: number,
  config: TutorialBreakpointsConfig
): TutorialBreakpointName {
  if (larguraTela >= config.xxl) return 'xxl'
  if (larguraTela >= config.xl) return 'xl'
  if (larguraTela >= config.lg) return 'lg'
  if (larguraTela >= config.md) return 'md'
  if (larguraTela >= config.sm) return 'sm'
  return 'xs'
}

/*
Resolve as propriedades de um passo aplicando a cascata Mobile-First (do xs até o breakpoint atual).
Recebe: rawStep (passo original) e currentBp (breakpoint ativo no momento).
Devolve: objeto TutorialStep com as propriedades mescladas para a tela atual.
Por que é usada: Faz com que definições em 'xs' valham para telas pequenas e definições em 'md' valham para 'md', 'lg', 'xl' e 'xxl'.
*/
export function resolverPassoResponsivo(
  rawStep: TutorialStep,
  currentBp: TutorialBreakpointName
): TutorialStep {
  const resolved: TutorialStep = { ...rawStep }
  const maxIdx = BOOTSTRAP_BREAKPOINT_ORDER.indexOf(currentBp)

  const inlineTargetMap: Partial<Record<TutorialBreakpointName, string | string[] | undefined>> = {
    sm: rawStep.targetSm,
    md: rawStep.targetMd,
    lg: rawStep.targetLg,
    xl: rawStep.targetXl,
    xxl: rawStep.targetXxl,
  }

  const inlinePlacementMap: Partial<Record<TutorialBreakpointName, TutorialStep['placement']>> = {
    sm: rawStep.placementSm,
    md: rawStep.placementMd,
    lg: rawStep.placementLg,
    xl: rawStep.placementXl,
    xxl: rawStep.placementXxl,
  }

  for (let i = 0; i <= maxIdx; i++) {
    const bpName = BOOTSTRAP_BREAKPOINT_ORDER[i]
    const bpOverride: TutorialStepResponsiveOverride | undefined = rawStep.breakpoints?.[bpName]

    if (bpOverride) {
      if (bpOverride.disabled !== undefined) resolved.disabled = bpOverride.disabled
      if (bpOverride.target !== undefined) resolved.target = bpOverride.target
      if (bpOverride.title !== undefined) resolved.title = bpOverride.title
      if (bpOverride.content !== undefined) resolved.content = bpOverride.content
      if (bpOverride.mode !== undefined) resolved.mode = bpOverride.mode
      if (bpOverride.placement !== undefined) resolved.placement = bpOverride.placement
      if (bpOverride.hintText !== undefined) resolved.hintText = bpOverride.hintText
      if (bpOverride.spotlightPadding !== undefined)
        resolved.spotlightPadding = bpOverride.spotlightPadding
      if (bpOverride.cardWidth !== undefined) resolved.cardWidth = bpOverride.cardWidth
      if (bpOverride.autoScroll !== undefined) resolved.autoScroll = bpOverride.autoScroll
      if (bpOverride.route !== undefined) resolved.route = bpOverride.route
      if (bpOverride.rollbackRoute !== undefined) resolved.rollbackRoute = bpOverride.rollbackRoute
      if (bpOverride.enterActions !== undefined) resolved.enterActions = bpOverride.enterActions
      if (bpOverride.rollbackActions !== undefined)
        resolved.rollbackActions = bpOverride.rollbackActions
      if (bpOverride.leaveActions !== undefined) resolved.leaveActions = bpOverride.leaveActions
    }

    if (inlineTargetMap[bpName] !== undefined) {
      resolved.target = inlineTargetMap[bpName]
    }
    if (inlinePlacementMap[bpName] !== undefined) {
      resolved.placement = inlinePlacementMap[bpName]
    }
  }

  return resolved
}