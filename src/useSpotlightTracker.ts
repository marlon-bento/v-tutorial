/*
========
Composable de rastreamento geométrico do Spotlight, ResizeObserver e atalhos de teclado (src/useSpotlightTracker.ts).
Isola a medição contínua do elemento alvo via requestAnimationFrame durante transições CSS,
a observação de redimensionamento do DOM, os atalhos de teclado (Escape, ArrowRight, ArrowLeft)
e o disparo do cálculo de posicionamento do card flutuante para manter o TutorialProvider.vue enxuto.
========
*/
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from 'vue'
import { useTutorial } from './useTutorial'
import { calcularPosicaoCard } from './positioning'

// Interface das propriedades recebidas do componente TutorialProvider.vue
export interface OpcoesRastreadorSpotlight {
  spotlightPadding?: number
  cardWidth?: number
  mobileSheetOnAuto?: boolean
  autoStart?: boolean
  startDelay?: number
}

/*
Gerencia a medição de coordenadas do elemento alvo, observadores de layout e eventos de janela/teclado.
Recebe: props (objeto reativo de props do TutorialProvider contendo padding, largura do card e opções de início).
Devolve: refs e computeds prontos para o template (cardRef, hasTargetBox, spotlightBox e cardPosition).
Por que é usada: Retira toda a complexidade de loops requestAnimationFrame, ResizeObserver e listeners DOM de dentro do componente visual.
*/
export function useSpotlightTracker(props: OpcoesRastreadorSpotlight) {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    isTransitioning,
    activeBreakpoint,
    isMobileViewport,
    globalOptions,
    startTutorial,
    nextStep,
    prevStep,
    endTutorial,
    resolveStepElements,
    getStepBoundingRect,
  } = useTutorial()

  // Referência ao elemento DOM do card flutuante para leitura dinâmica de altura (offsetHeight)
  const cardRef = ref<HTMLElement | null>(null)

  /*
  Define a referência do elemento HTML do card flutuante a partir do template.
  Recebe: el (Elemento DOM ou instância de componente passada pelo atributo :ref do Vue).
  Devolve: void.
  Por que é usada: Conecta o elemento real do card ao rastreador de altura e ResizeObserver sem disparar avisos de variável não lida no vue-tsc.
  */
  function setCardRef(el: unknown): void {
    cardRef.value = el instanceof HTMLElement ? el : null
  }
  // Caixa delimitadora (DOMRect) atual do(s) elemento(s) alvo do passo ativo
  const targetRect = ref<DOMRect | null>(null)

  // Dimensões atuais da janela de visualização (viewport) em pixels
  const viewportSize = ref({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  // Identificador do frame ativo de requestAnimationFrame para cancelamento seguro
  let rafId: number | null = null

  // Timestamp limite (performance.now) até quando o rastreamento contínuo de transição deve rodar
  let transitionEndTime = 0

  // Instância do ResizeObserver acoplada aos elementos alvo e ao próprio card do tutorial
  let resizeObserver: ResizeObserver | null = null

  // Espaçamento interno (em pixels) ao redor do elemento destacado pelo anel de spotlight
  const effectivePadding = computed(
    () =>
      currentStep.value?.spotlightPadding ??
      props.spotlightPadding ??
      globalOptions.value.spotlightPadding ??
      6
  )

  // Indica se o passo atual possui um elemento alvo visível com dimensões válidas na tela
  const hasTargetBox = computed(() => {
    return (
      !!currentStep.value?.target &&
      currentStep.value.placement !== 'center' &&
      !!targetRect.value &&
      targetRect.value.width > 0 &&
      targetRect.value.height > 0
    )
  })

  // Coordenadas finais do recorte do spotlight e dos 4 escudos já somadas ao padding configurado
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

  // Posição calculada do card e da seta indicadora com prevenção automática de colisão
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

  /*
  Atualiza imediatamente as dimensões da janela e recalcula o DOMRect do elemento alvo atual.
  Recebe: nada.
  Devolve: void.
  Por que é usada: Garante que o spotlight e o card acompanhem o botão destacado em tempo real.
  */
  function measureTargetNow(): void {
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

  /*
  Inicia uma janela temporária de atualização via requestAnimationFrame durante animações ou transições de layout.
  Recebe: durationMs (duração do acompanhamento em milissegundos; padrão 500ms).
  Devolve: void.
  Por que é usada: Mantém 60fps suaves enquanto um menu ou modal desliza, mas desliga o loop (0% CPU) assim que a transição termina.
  */
  function startTransitionTracking(durationMs = 500): void {
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

  /*
  Conecta o ResizeObserver aos elementos alvo do passo atual e ao card flutuante.
  Recebe: nada.
  Devolve: void.
  Por que é usada: Reage automaticamente caso o botão destacado ou o texto interno do card mude de tamanho.
  */
  function attachElementObserver(): void {
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

  /*
  Aciona o rastreamento curto quando ocorrem eventos de scroll, resize ou transições CSS na janela.
  Recebe: nada.
  Devolve: void.
  Por que é usada: Reposiciona o spotlight se o usuário rolar a página ou se uma gaveta lateral animar.
  */
  function handleViewportEvent(): void {
    if (!isActive.value) return
    startTransitionTracking(400)
  }

  /*
  Processa os atalhos de teclado globais do tutorial (Escape, ArrowRight e ArrowLeft).
  Recebe: e (KeyboardEvent disparado na janela).
  Devolve: void.
  Por que é usada: Permite navegação acessível por teclado impedindo que ArrowRight burle passos obrigatórios (wait-click).
  */
  function handleKeydown(e: KeyboardEvent): void {
    if (!isActive.value) return
    if (e.key === 'Escape') {
      endTutorial(true)
    } else if (e.key === 'ArrowRight' && currentStep.value?.mode !== 'wait-click') {
      nextStep()
    } else if (e.key === 'ArrowLeft') {
      prevStep()
    }
  }

  // Reinicia a medição e os observadores sempre que o estado ativo, passo ou breakpoint mudar
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
      }, props.startDelay ?? 400)
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

  return {
    cardRef,
    setCardRef,
    targetRect,
    viewportSize,
    effectivePadding,
    hasTargetBox,
    spotlightBox,
    cardPosition,
    measureTargetNow,
    startTransitionTracking,
  }
}