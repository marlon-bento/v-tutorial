/*
========
Módulo de resolução de elementos DOM e controle de scroll do v-tutorial (domResolver.ts).
Localiza elementos via diretiva v-tutorial ou seletores CSS, priorizando nós visíveis,
calculando a caixa delimitadora unificada (DOMRect) para um ou múltiplos alvos e emitindo
avisos detalhados quando seletores são inválidos ou elementos permanecem ocultos/ausentes.
========
*/
import type { TutorialStep, TutorialTargetConfig } from './types'

// Mapa global de elementos registrados via diretiva v-tutorial ou registerTarget
export const registeredElements = new Map<
  string,
  { el: HTMLElement; config: TutorialTargetConfig }
>()

/*
Formata o identificador do alvo (string ou lista de seletores) para exibição legível nos logs de aviso.
Recebe: target (string, array de strings ou undefined).
Devolve: string formatada representando o(s) seletor(es).
Por que é usada: Facilita a leitura das mensagens de diagnóstico quando um passo possui múltiplos seletores.
*/
export function formatarAlvoParaLog(target?: string | string[]): string {
  if (!target) return '(sem target)'
  return Array.isArray(target) ? target.join(', ') : target
}

/*
Verifica se um elemento HTML está presente no documento e possui dimensões visíveis na tela.
Recebe: el (HTMLElement ou null).
Devolve: booleano indicando se o elemento está visível.
Por que é usada: Evita focar em elementos ocultos com display:none (ex: menu desktop oculto no mobile).
*/
export function verificarElementoVisivel(el: HTMLElement | null): el is HTMLElement {
  if (!el || typeof document === 'undefined' || !document.body.contains(el)) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/*
Resolve um único identificador ou seletor CSS para seu respectivo HTMLElement visível no DOM.
Recebe: targetSelector (string com ID do v-tutorial ou seletor CSS).
Devolve: HTMLElement encontrado ou null.
Por que é usada: Unifica a busca por diretiva, atributo data-tutorial-id, ID ou seletor CSS e avisa sobre seletores malformados.
*/
export function resolverSeletorUnico(targetSelector: string): HTMLElement | null {
  if (!targetSelector || !targetSelector.trim() || typeof document === 'undefined') return null

  const registered = registeredElements.get(targetSelector)
  if (registered && verificarElementoVisivel(registered.el)) {
    return registered.el
  }

  try {
    const byDataAttrList = Array.from(
      document.querySelectorAll(`[data-tutorial-id="${targetSelector.replace(/"/g, '\\"')}"]`)
    ) as HTMLElement[]
    const visibleDataAttr = byDataAttrList.find((el) => verificarElementoVisivel(el))
    if (visibleDataAttr) return visibleDataAttr
  } catch {
    // Segue para resolução por ID ou seletor CSS
  }

  const cleanId = targetSelector.replace(/^#/, '')
  const byId = document.getElementById(cleanId)
  if (verificarElementoVisivel(byId)) return byId

  try {
    const nodeList = Array.from(document.querySelectorAll(targetSelector)) as HTMLElement[]
    const visibleMatch = nodeList.find((el) => verificarElementoVisivel(el))
    if (visibleMatch) return visibleMatch
    return (nodeList[0] as HTMLElement) || null
  } catch {
    console.warn(
      `[v-tutorial] Seletor CSS inválido informado no target: "${targetSelector}". ` +
        `Verifique a sintaxe do seletor CSS ou confirme se o elemento utiliza v-tutorial="'${targetSelector}'".`
    )
    return null
  }
}

/*
Resolve todos os elementos HTML vinculados ao passo atual (suporta string única ou array de seletores).
Recebe: step (passo a ser avaliado).
Devolve: array de HTMLElements encontrados no DOM.
Por que é usada: Permite destacar múltiplos elementos juntos no mesmo passo.
*/
export function resolveStepElements(step: TutorialStep | null): HTMLElement[] {
  if (!step || !step.target || step.placement === 'center') return []

  const targets = Array.isArray(step.target) ? step.target : [step.target]
  const found: HTMLElement[] = []

  for (const selector of targets) {
    const el = resolverSeletorUnico(selector)
    if (el) found.push(el)
  }

  return found
}

/*
Resolve o elemento principal visível do passo atual.
Recebe: step (passo atual).
Devolve: HTMLElement ou null.
Por que é usada: Fornece o elemento de referência para auto-scroll e observadores.
*/
export function resolveStepElement(step: TutorialStep | null): HTMLElement | null {
  const elements = resolveStepElements(step)
  const visible = elements.find((el) => verificarElementoVisivel(el))
  return visible || elements[0] || null
}

/*
Calcula o DOMRect unificado que engloba todos os elementos alvo visíveis do passo atual.
Recebe: step (passo atual).
Devolve: DOMRect combinado ou null caso nenhum elemento esteja visível.
Por que é usada: Define as coordenadas exatas do Spotlight e dos 4 escudos de clique.
*/
export function getStepBoundingRect(step: TutorialStep | null): DOMRect | null {
  const elements = resolveStepElements(step)
  if (!elements.length) return null

  const rects = elements
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)

  if (!rects.length) return null
  if (rects.length === 1) return rects[0]

  const minLeft = Math.min(...rects.map((r) => r.left))
  const minTop = Math.min(...rects.map((r) => r.top))
  const maxRight = Math.max(...rects.map((r) => r.right))
  const maxBottom = Math.max(...rects.map((r) => r.bottom))

  return new DOMRect(minLeft, minTop, maxRight - minLeft, maxBottom - minTop)
}

/*
Realiza scroll suave até o elemento caso ele esteja fora da área visível da janela.
Recebe: el (HTMLElement alvo), autoScrollAtivo (booleano) e scrollBehavior ('smooth' | 'auto').
Devolve: Promise<void>.
Por que é usada: Garante que elementos abaixo da dobra da página entrem na tela antes de medir o foco.
*/
export async function rolarParaElementoSeNecessario(
  el: HTMLElement,
  autoScrollAtivo: boolean,
  scrollBehavior: ScrollBehavior = 'smooth'
): Promise<void> {
  if (!autoScrollAtivo || typeof window === 'undefined') return

  const rect = el.getBoundingClientRect()
  const margin = 70
  const isInViewport =
    rect.top >= margin &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight - margin &&
    rect.right <= window.innerWidth

  if (!isInViewport && typeof el.scrollIntoView === 'function') {
    try {
      el.scrollIntoView({
        behavior: scrollBehavior,
        block: 'center',
        inline: 'nearest',
      })
      await new Promise((r) => setTimeout(r, 220))
    } catch {
      try {
        el.scrollIntoView()
      } catch {
        // Ignora caso o ambiente de teste não implemente scrollIntoView
      }
    }
  }
}

/*
Aguarda até que o elemento do passo exista no DOM e tenha dimensões maiores que zero.
Recebe: step (passo alvo), autoScrollAtivo (booleano), scrollBehavior e timeoutMs.
Devolve: Promise<HTMLElement | null>.
Por que é usada: Sincroniza o spotlight com modais v-if e trocas de rota assíncronas e emite avisos claros em caso de falha.
*/
export async function aguardarElementoNoDom(
  step: TutorialStep | null,
  autoScrollAtivo: boolean,
  scrollBehavior: ScrollBehavior = 'smooth',
  timeoutMs = 1200
): Promise<HTMLElement | null> {
  if (!step || !step.target || step.placement === 'center') return null
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const el = resolveStepElement(step)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        await rolarParaElementoSeNecessario(el, autoScrollAtivo, scrollBehavior)
        return el
      }
    }
    await new Promise((r) => setTimeout(r, 40))
  }

  const elementoFinal = resolveStepElement(step)
  const alvoTexto = formatarAlvoParaLog(step.target)

  if (!elementoFinal) {
    console.warn(
      `[v-tutorial] Passo "${step.id}" ("${step.title}"): o elemento alvo "${alvoTexto}" não foi encontrado no DOM após aguardar ${timeoutMs}ms. ` +
        `Verifique se o seletor CSS ou diretiva v-tutorial está correto e se o componente foi renderizado na tela.`
    )
  } else if (!verificarElementoVisivel(elementoFinal)) {
    console.warn(
      `[v-tutorial] Passo "${step.id}" ("${step.title}"): o elemento alvo "${alvoTexto}" existe no DOM, mas permanece oculto (largura ou altura igual a 0) após ${timeoutMs}ms. ` +
        `Verifique se o elemento está com "display: none" ou dentro de um menu/modal fechado.`
    )
  }

  return elementoFinal
}