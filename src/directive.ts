/*
========
Módulo da diretiva v-tutorial, registro imperativo de alvos e captura global de cliques (src/directive.ts).
Gerencia o ciclo de vida da diretiva v-tutorial nos elementos HTML, a função registerTarget
e o listener global em fase de captura (capture: true) que intercepta cliques nos elementos
destacados durante os modos wait-click e optional-click.
========
*/
import { watch, type Directive, type Ref } from 'vue'
import type { TutorialTargetConfig } from './types'
import { registeredElements, resolveStepElements } from './domResolver'
import { isActive, isTransitioning, currentStep } from './state'
import { getContext, nextStep } from './navigation'

/*
Registra programaticamente um elemento HTML ou Ref de template como alvo identificável do tutorial.
Recebe: elOrRef (HTMLElement direto ou Ref<HTMLElement | null>) e configOrId (string com ID ou objeto TutorialTargetConfig).
Devolve: void.
Por que é usada: Alternativa programática à diretiva v-tutorial para componentes que preferem registrar refs no script setup.
*/
export function registerTarget(
  elOrRef: HTMLElement | Ref<HTMLElement | null>,
  configOrId: string | TutorialTargetConfig
): void {
  const config: TutorialTargetConfig =
    typeof configOrId === 'string' ? { id: configOrId } : configOrId

  if (!config?.id || !String(config.id).trim()) {
    console.warn(
      '[v-tutorial] Falha ao registrar elemento alvo em registerTarget: o "id" informado está vazio. ' +
        'Informe uma string não vazia ou um objeto { id: "meu-alvo" }.'
    )
    return
  }

  const register = (el: HTMLElement | null) => {
    if (el) {
      el.setAttribute('data-tutorial-id', config.id)
      registeredElements.set(config.id, { el, config })
    } else {
      registeredElements.delete(config.id)
    }
  }

  if (elOrRef && typeof elOrRef === 'object' && 'value' in elOrRef) {
    watch(elOrRef, (val) => register(val), { immediate: true })
  } else {
    register(elOrRef as HTMLElement | null)
  }
}

/*
Intercepta cliques na janela em fase de captura quando o tutorial está ativo para detectar interação com o elemento alvo.
Recebe: event (MouseEvent disparado pelo clique do usuário).
Devolve: Promise<void>.
Por que é usada: Permite bloquear o clique nativo se preventNativeClick=true, disparar hooks onTargetClick/afterClick e avançar automaticamente em wait-click ou optional-click.
*/
export async function handleGlobalCaptureClick(
  event: MouseEvent
): Promise<void> {
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

  try {
    if (registered?.config.onTutorialClick) {
      await registered.config.onTutorialClick(event, ctx)
    }

    if (step.onTargetClick) {
      await step.onTargetClick(event, ctx)
    }
  } catch (err) {
    console.error(
      `[v-tutorial] Erro ao executar o callback de clique no elemento alvo do passo "${step.id}" ("${step.title}"). ` +
        `Verifique as funções onTargetClick ou onTutorialClick. Detalhes:`,
      err
    )
  }

  if (step.mode === 'wait-click' || step.mode === 'optional-click') {
    isTransitioning.value = true
    const delay = step.afterClickDelay ?? 280
    setTimeout(async () => {
      try {
        if (step.afterClick) {
          await step.afterClick(getContext('forward'))
        }
      } catch (err) {
        console.error(
          `[v-tutorial] Erro no hook afterClick do passo "${step.id}" ("${step.title}"). ` +
            `O tutorial avançará para o próximo passo mesmo assim. Detalhes:`,
          err
        )
      } finally {
        isTransitioning.value = false
      }
      await nextStep()
    }, delay)
  }
}

// Registra o listener global de clique em fase de captura (capture: true) no navegador
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleGlobalCaptureClick, true)
}

// Diretiva Vue (v-tutorial) para marcação declarativa de elementos alvo no template
export const vTutorial: Directive<
  HTMLElement,
  string | TutorialTargetConfig | undefined
> = {
  mounted(el, binding) {
    if (!binding.value) {
      console.warn(
        '[v-tutorial] A diretiva v-tutorial foi montada com valor vazio. Informe uma string não vazia (ex: v-tutorial="\'meu-botao\'") ou um objeto { id: \'meu-botao\' }.'
      )
      return
    }
    const config: TutorialTargetConfig =
      typeof binding.value === 'string' ? { id: binding.value } : binding.value

    if (!config?.id || !String(config.id).trim()) {
      console.warn(
        '[v-tutorial] A diretiva v-tutorial recebeu uma configuração sem "id" válido. Informe uma string não vazia ou um objeto { id: "meu-botao" }.'
      )
      return
    }
    el.setAttribute('data-tutorial-id', config.id)
    registeredElements.set(config.id, { el, config })
  },
  updated(el, binding) {
    const prevId = el.getAttribute('data-tutorial-id')

    if (!binding.value) {
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

    if (!config?.id || !String(config.id).trim()) {
      console.warn(
        '[v-tutorial] A diretiva v-tutorial foi atualizada com um "id" inválido ou vazio.'
      )
      return
    }
    if (prevId && prevId !== config.id) {
      const current = registeredElements.get(prevId)
      if (current?.el === el) {
        registeredElements.delete(prevId)
      }
    }
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