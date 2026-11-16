/*
========
Utilitários compartilhados para os testes automatizados da biblioteca v-tutorial (tests/helpers.ts).
Centraliza a criação de elementos DOM com dimensões simuladas para o happy-dom, mocks do Vue Router
e a limpeza completa do estado reativo e de ações registradas entre cada teste.
========
*/
import { vi } from 'vitest'
import {
  useTutorial,
  registeredElements,
  registeredActions,
  DEFAULT_BOOTSTRAP_BREAKPOINTS,
} from '../src/index'

/*
Simula dimensões visíveis em um elemento HTML dentro do ambiente happy-dom.
Recebe: el (HTMLElement) e rectParcial (coordenadas opcionais x, y, width, height).
Devolve: void.
Por que é usada: Como o happy-dom não possui renderização gráfica real, getBoundingClientRect retorna zeros por padrão.
*/
export function definirDimensoesMock(
  el: HTMLElement,
  rectParcial: { x?: number; y?: number; width?: number; height?: number } = {}
): void {
  const x = rectParcial.x ?? 20
  const y = rectParcial.y ?? 40
  const width = rectParcial.width ?? 120
  const height = rectParcial.height ?? 44

  el.getBoundingClientRect = () =>
    ({
      x,
      y,
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height,
      toJSON: () => {},
    }) as DOMRect
}

/*
Cria um elemento HTML no document.body já configurado com dimensões visíveis ou ocultas para os testes.
Recebe: opcoes (tag, id, className, tutorialId, visivel e coordenadas do retângulo).
Devolve: HTMLElement anexado ao body.
Por que é usada: Evita repetição de boilerplate de criação e anexação de botões e containers nos testes de DOM.
*/
export function criarElementoAlvoNoDom(opcoes: {
  tag?: string
  id?: string
  className?: string
  tutorialId?: string
  visivel?: boolean
  x?: number
  y?: number
  width?: number
  height?: number
} = {}): HTMLElement {
  const el = document.createElement(opcoes.tag || 'button')
  if (opcoes.id) el.id = opcoes.id
  if (opcoes.className) el.className = opcoes.className
  if (opcoes.tutorialId) el.setAttribute('data-tutorial-id', opcoes.tutorialId)

  document.body.appendChild(el)

  if (opcoes.visivel !== false) {
    definirDimensoesMock(el, {
      x: opcoes.x,
      y: opcoes.y,
      width: opcoes.width,
      height: opcoes.height,
    })
  } else {
    definirDimensoesMock(el, { x: 0, y: 0, width: 0, height: 0 })
  }

  return el
}

/*
Cria um mock de instância do Vue Router com histórico de navegação e suporte a simulação de falha.
Recebe: rotaInicial (string) e erroAoNavegar (Error opcional para simular falha em navigation guard).
Devolve: objeto compatível com a interface de router do TutorialOptions e histórico de rotas visitadas.
Por que é usada: Permite testar navegação declarativa (route / rollbackRoute) e falhas de rota sem depender do pacote vue-router.
*/
export function criarRouterMock(rotaInicial = '/', erroAoNavegar?: Error) {
  const historicoRotas: string[] = [rotaInicial]
  const currentRoute = { value: { path: rotaInicial } }

  const push = vi.fn(async (novaRota: string) => {
    if (erroAoNavegar) {
      throw erroAoNavegar
    }
    currentRoute.value.path = novaRota
    historicoRotas.push(novaRota)
  })

  return {
    router: {
      currentRoute,
      push,
    },
    historicoRotas,
  }
}

/*
Restaura o estado global do composable useTutorial, das ações registradas, do DOM e do localStorage.
Recebe: nada.
Devolve: void.
Por que é usada: Garante isolamento total entre os testes que compartilham o estado singleton.
*/
export function resetarEstadoGlobalTutorial(): void {
  try {
    localStorage.clear()
  } catch {
    // Ignora caso o teste anterior tenha substituído localStorage por mock com falha
  }

  document.body.innerHTML = ''
  registeredElements.clear()
  registeredActions.clear()

  if (typeof window !== 'undefined') {
    window.innerWidth = 1024
    window.innerHeight = 768
    window.dispatchEvent(new Event('resize'))
  }

  const { endTutorial, registerSteps, configureTutorial } = useTutorial()
  endTutorial(false)
  registerSteps([])
  configureTutorial({
    storageKey: 'v-tutorial-completed',
    autoScroll: true,
    scrollBehavior: 'smooth',
    spotlightPadding: 6,
    cardWidth: 370,
    showArrow: true,
    unstyled: false,
    actionTimeout: 120,
    mobileSheetOnAuto: true,
    breakpoints: { ...DEFAULT_BOOTSTRAP_BREAKPOINTS },
    router: undefined,
  })
}