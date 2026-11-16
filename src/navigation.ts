/*
========
Motor de navegação de passos, sincronização de rotas e controle de fluxo (src/navigation.ts).
Orquestra o início, avanço, retorno com rollback (rota e ações), pulo direto de passos,
encapsulamento de funções nativas (wrapTutorialAction) e reação a mudanças de breakpoint.
========
*/
import { nextTick, watch } from 'vue'
import type {
  TutorialStep,
  TutorialContext,
  TutorialDirection,
} from './types'
import { aguardarElementoNoDom } from './domResolver'
import {
  isActive,
  imperativeSteps,
  currentStepIndex,
  isTransitioning,
  lastDirection,
  viewportWidth,
  globalOptions,
  activeBreakpoint,
  isMobileViewport,
  rawStepsSource,
  steps,
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  progress,
  storageKey,
  finishListeners,
  stopListeners,
  stepChangeListeners,
  obterRouterConfigurado,
} from './state'
import {
  lerStorageConcluido,
  atualizarStorageConcluido,
  validarConfiguracaoPasso,
} from './storage'
import { runRegisteredAction, runActionMap } from './actions'

/*
Garante que a aplicação esteja na rota exigida pelo passo antes de renderizar o foco.
Recebe: targetRoute (caminho da rota desejada) e idPassoContexto (identificador opcional do passo para diagnóstico).
Devolve: Promise<void>.
Por que é usada: Navega automaticamente via Vue Router e alerta caso o desenvolvedor tenha esquecido de injetar a instância do router.
*/
export async function ensureRoute(
  targetRoute?: string,
  idPassoContexto?: string
): Promise<void> {
  if (!targetRoute) return

  const idPasso = idPassoContexto || currentStep.value?.id || 'desconhecido'
  const rawRouter = obterRouterConfigurado()

  if (!rawRouter) {
    console.warn(
      `[v-tutorial] O passo "${idPasso}" tentou navegar para a rota "${targetRoute}", mas nenhuma instância do Vue Router foi configurada. ` +
        `Passe o router em app.use(TutorialPlugin, { router }) ou configureTutorial({ router }).`
    )
    return
  }

  try {
    const currentPath = rawRouter.currentRoute?.value?.path
    if (currentPath && currentPath !== targetRoute) {
      await rawRouter.push(targetRoute)
      await nextTick()
    }
  } catch (err) {
    console.warn(
      `[v-tutorial] Falha ao navegar para a rota "${targetRoute}" no passo "${idPasso}". ` +
        `Verifique se a rota existe no Vue Router e se não foi bloqueada por um navigation guard. Detalhes:`,
      err
    )
  }
}

/*
Aguarda a presença e visibilidade do elemento alvo do passo no DOM aplicando as opções de scroll.
Recebe: step (passo a ser focado) e timeoutMs (tempo limite em milissegundos).
Devolve: Promise<HTMLElement | null>.
Por que é usada: Conecta as configurações de autoScroll do passo/plugin ao resolvedor de DOM.
*/
export async function aguardarAlvoDoPasso(
  step: TutorialStep | null,
  timeoutMs = 1200
): Promise<HTMLElement | null> {
  if (!step || !step.target || step.placement === 'center') return null
  const shouldScroll = step.autoScroll ?? globalOptions.value.autoScroll ?? true
  const behavior = globalOptions.value.scrollBehavior || 'smooth'
  return aguardarElementoNoDom(step, shouldScroll, behavior, timeoutMs)
}

/*
Constrói o objeto de contexto reativo repassado para hooks de ciclo de vida e Scoped Slots.
Recebe: direction (direção da transição atual: 'start' | 'forward' | 'backward').
Devolve: objeto TutorialContext completo.
Por que é usada: Fornece estado de leitura e métodos de controle para callbacks customizados e templates Headless.
*/
export function getContext(
  direction: TutorialDirection = lastDirection.value
): TutorialContext {
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

/*
Navega diretamente para um passo específico pelo seu índice numérico ou pelo seu ID.
Recebe: indexOrId (número do índice ou string do ID) e direction ('forward' | 'backward' | 'start').
Devolve: Promise<void>.
Por que é usada: Executa a transição completa entre dois passos (leaveActions, rollback, route, enterActions, beforeEnter e espera de DOM).
*/
export async function goToStep(
  indexOrId: number | string,
  direction: TutorialDirection = 'forward'
): Promise<void> {
  const index =
    typeof indexOrId === 'number'
      ? indexOrId
      : steps.value.findIndex((s) => s.id === indexOrId)

  if (index < 0 || index >= steps.value.length) {
    const passosAtivos =
      steps.value.map((s, idx) => `${idx}: "${s.id}"`).join(', ') ||
      'nenhum passo disponível'
    console.warn(
      `[v-tutorial] Não foi possível navegar para o passo "${indexOrId}": índice ou ID não encontrado no breakpoint ativo "${activeBreakpoint.value}". ` +
        `Passos habilitados no momento (${steps.value.length}): [${passosAtivos}].`
    )
    return
  }

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
    validarConfiguracaoPasso(targetStep)
    const ctx = getContext(direction)

    if (direction === 'backward') {
      if (targetStep?.rollbackRoute || targetStep?.route) {
        await ensureRoute(
          targetStep.rollbackRoute || targetStep.route,
          targetStep.id
        )
      }
      if (targetStep?.rollbackActions) {
        await runActionMap(targetStep.rollbackActions)
      }
      if (targetStep?.onRollback) {
        await targetStep.onRollback(ctx)
      }
    }

    if (targetStep?.route) {
      await ensureRoute(targetStep.route, targetStep.id)
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
    const idDestino = steps.value[index]?.id || String(indexOrId)
    console.error(
      `[v-tutorial] Erro durante a transição (${direction}) para o passo "${idDestino}". ` +
        `Verifique os hooks de ciclo de vida (beforeEnter, afterLeave, onRollback) deste passo. Detalhes:`,
      err
    )
  } finally {
    isTransitioning.value = false
  }

  const updatedCtx = getContext(direction)
  stepChangeListeners.forEach((cb) => cb(updatedCtx))
}

/*
Avança para o próximo passo habilitado ou conclui o tutorial se já estiver no último passo.
Recebe: nada.
Devolve: Promise<void>.
Por que é usada: Acionada pelo botão "Próximo", tecla ArrowRight ou após um clique válido em modo wait-click/optional-click.
*/
export async function nextStep(): Promise<void> {
  if (isTransitioning.value) return
  if (currentStepIndex.value < steps.value.length - 1) {
    await goToStep(currentStepIndex.value + 1, 'forward')
  } else {
    completeTutorial()
  }
}

/*
Retorna para o passo anterior habilitado acionando a rotina de rollback de rota e ações.
Recebe: nada.
Devolve: Promise<void>.
Por que é usada: Acionada pelo botão "Anterior" ou pela tecla ArrowLeft para desfazer passos com segurança.
*/
export async function prevStep(): Promise<void> {
  if (isTransitioning.value) return
  if (currentStepIndex.value > 0) {
    await goToStep(currentStepIndex.value - 1, 'backward')
  }
}

/*
Inicia a execução do tutorial a partir do primeiro passo habilitado para o breakpoint atual.
Recebe: customSteps (array opcional de passos imperativos) e force (se true, ignora a flag do localStorage).
Devolve: Promise<void>.
Por que é usada: Dá partida na máquina de estados, valida a fila inicial, navega para a rota do passo 1 e aguarda o alvo no DOM.
*/
export async function startTutorial(
  customSteps?: TutorialStep[],
  force = false
): Promise<void> {
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
  if (customSteps && customSteps.length > 0) {
    imperativeSteps.value = customSteps
  }
  if (!force && lerStorageConcluido(storageKey.value)) {
    return
  }
  if (!steps.value.length) {
    if (rawStepsSource.value.length === 0) {
      console.warn(
        '[v-tutorial] Não foi possível iniciar o tutorial: nenhum passo foi registrado. ' +
          'Passe um array de passos em startTutorial(steps), na prop :steps do <TutorialProvider> ou declare componentes <VTutorialStep>.'
      )
    } else {
      console.warn(
        `[v-tutorial] Não foi possível iniciar o tutorial: todos os ${rawStepsSource.value.length} passos cadastrados estão desabilitados (disabled: true) para o breakpoint atual "${activeBreakpoint.value}".`
      )
    }
    return
  }

  isActive.value = true
  currentStepIndex.value = 0
  lastDirection.value = 'start'
  isTransitioning.value = true

  try {
    const first = steps.value[0]
    validarConfiguracaoPasso(first)
    const ctx = getContext('start')

    if (first?.route) {
      await ensureRoute(first.route, first.id)
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
    const idPrimeiro = steps.value[0]?.id || '0'
    console.error(
      `[v-tutorial] Erro ao iniciar o tutorial no primeiro passo "${idPrimeiro}". ` +
        `Verifique a rota inicial, enterActions ou o hook beforeEnter. Detalhes:`,
      err
    )
  } finally {
    isTransitioning.value = false
  }

  stepChangeListeners.forEach((cb) => cb(getContext('start')))
}

/*
Limpa o registro de conclusão no localStorage e reinicia o tutorial imediatamente do primeiro passo.
Recebe: nada.
Devolve: Promise<void>.
Por que é usada: Ideal para botões de "Rever Tutorial" em menus de ajuda ou modais de configurações.
*/
export async function restartTutorial(): Promise<void> {
  atualizarStorageConcluido(storageKey.value, false)
  await startTutorial(undefined, true)
}

/*
Finaliza o tutorial marcando-o como concluído no localStorage e disparando os listeners de conclusão.
Recebe: nada.
Devolve: void.
Por que é usada: Executada quando o usuário avança a partir do último passo do tour.
*/
export function completeTutorial(): void {
  atualizarStorageConcluido(storageKey.value, true)
  isTransitioning.value = false
  isActive.value = false
  const ctx = getContext('forward')
  finishListeners.forEach((cb) => cb(ctx))
}

/*
Encerra o tutorial imediatamente (ex: botão Pular ou tecla Escape) e dispara os listeners de parada.
Recebe: markAsCompleted (booleano indicando se deve gravar como concluído no localStorage; padrão true).
Devolve: void.
Por que é usada: Permite fechar o tour a qualquer momento controlando se ele deve ou não reaparecer no próximo acesso.
*/
export function endTutorial(markAsCompleted = true): void {
  if (markAsCompleted) {
    atualizarStorageConcluido(storageKey.value, true)
  }
  isTransitioning.value = false
  isActive.value = false
  const ctx = getContext(lastDirection.value)
  stopListeners.forEach((cb) => cb(ctx))
}

/*
Encapsula uma função nativa do componente para interceptar ou substituir sua execução quando o tutorial estiver ativo.
Recebe: stepOrTargetId (ID do passo ou do alvo), nativeFn (função original) e wrapOptions (opções de substituição e avanço).
Devolve: função assíncrona encapsulada com a mesma assinatura de parâmetros da original.
Por que é usada: Evita que cliques durante o treinamento executem ações destrutivas (como deletar um registro ou submeter um formulário real).
*/
export function wrapTutorialAction<T extends (...args: any[]) => any>(
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

// Mantém viewportWidth sincronizado quando a janela do navegador é redimensionada
if (typeof window !== 'undefined') {
  window.addEventListener(
    'resize',
    () => {
      viewportWidth.value = window.innerWidth
    },
    { passive: true }
  )
}

// Reage a mudanças de breakpoint redimensionando a fila ativa ou encerrando caso todos os passos fiquem desabilitados
watch(activeBreakpoint, async () => {
  if (!isActive.value || isTransitioning.value) return
  if (steps.value.length === 0) {
    console.warn(
      `[v-tutorial] Todos os passos ficaram desabilitados após redimensionar a tela para o breakpoint "${activeBreakpoint.value}". Encerrando o tutorial.`
    )
    endTutorial(false)
    return
  }
  if (currentStepIndex.value >= steps.value.length) {
    currentStepIndex.value = Math.max(0, steps.value.length - 1)
  }
  const step = currentStep.value
  if (step?.enterActions) {
    await runActionMap(step.enterActions)
  }
  await aguardarAlvoDoPasso(step, 600)
})