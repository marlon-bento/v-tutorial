/*
========
Suíte de testes de resolução de elementos DOM, diretiva v-tutorial e scroll (tests/domResolver.spec.ts).
Testa a busca de alvos visíveis, agrupamento de múltiplos elementos (getStepBoundingRect),
montagem tardia via v-if e todos os cenários de erro de DOM (seletores CSS inválidos,
elementos inexistentes após timeout, elementos ocultos com display:none e diretiva sem ID).
========
*/
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import {
  useTutorial,
  vTutorial,
  verificarElementoVisivel,
  resolverSeletorUnico,
  resolveStepElements,
  getStepBoundingRect,
  aguardarElementoNoDom,
  rolarParaElementoSeNecessario,
  registeredElements,
} from '../src/index'
import {
  resetarEstadoGlobalTutorial,
  criarElementoAlvoNoDom,
  definirDimensoesMock,
} from './helpers'

describe('Escopo: Resolução de DOM, Diretiva v-tutorial e Erros de Alvo (domResolver.ts)', () => {
  beforeEach(() => {
    resetarEstadoGlobalTutorial()
  })

  it('Deve validar se um elemento é visível (presente no body e com largura/altura maiores que zero)', () => {
    expect(verificarElementoVisivel(null)).toBe(false)

    const elementoForaDoBody = document.createElement('div')
    definirDimensoesMock(elementoForaDoBody, { width: 100, height: 40 })
    expect(verificarElementoVisivel(elementoForaDoBody)).toBe(false)

    const elementoOculto = criarElementoAlvoNoDom({ id: 'oculto', visivel: false })
    expect(verificarElementoVisivel(elementoOculto)).toBe(false)

    const elementoVisivel = criarElementoAlvoNoDom({ id: 'visivel', visivel: true })
    expect(verificarElementoVisivel(elementoVisivel)).toBe(true)
  })

  it('Deve priorizar o elemento visível quando existem dois nós com o mesmo seletor (ex: menu mobile oculto e desktop visível)', () => {
    const botaoMobileOculto = criarElementoAlvoNoDom({
      className: 'btn-salvar',
      visivel: false,
    })
    const botaoDesktopVisivel = criarElementoAlvoNoDom({
      className: 'btn-salvar',
      visivel: true,
      x: 300,
      y: 120,
    })

    const encontrado = resolverSeletorUnico('.btn-salvar')
    expect(encontrado).toBe(botaoDesktopVisivel)
    expect(encontrado).not.toBe(botaoMobileOculto)
  })

  it('Deve calcular o DOMRect unificado englobando múltiplos elementos alvo no mesmo passo', () => {
    criarElementoAlvoNoDom({
      id: 'campo-usuario',
      x: 50,
      y: 100,
      width: 200,
      height: 40,
    })
    criarElementoAlvoNoDom({
      id: 'campo-senha',
      x: 50,
      y: 160,
      width: 250,
      height: 40,
    })

    const passoMultiAlvo = {
      id: 'passo-login',
      title: 'Preencha os campos',
      mode: 'info' as const,
      target: ['#campo-usuario', '#campo-senha'],
    }

    const elementos = resolveStepElements(passoMultiAlvo)
    expect(elementos).toHaveLength(2)

    const rectCombinado = getStepBoundingRect(passoMultiAlvo)
    expect(rectCombinado).not.toBeNull()
    expect(rectCombinado?.left).toBe(50)
    expect(rectCombinado?.top).toBe(100)
    expect(rectCombinado?.width).toBe(250)
    expect(rectCombinado?.height).toBe(100)
  })

  it('Deve encontrar um elemento com v-tutorial mesmo quando o componente .vue monta com atraso (v-if)', async () => {
    const ComponenteTardio = defineComponent({
      directives: { tutorial: vTutorial },
      setup() {
        const mostrarBotao = ref(false)
        setTimeout(() => {
          mostrarBotao.value = true
        }, 80)
        return { mostrarBotao }
      },
      template: `
        <div>
          <button v-if="mostrarBotao" v-tutorial="'botao-tardio'" id="btn-real">
            Salvar Triagem
          </button>
        </div>
      `,
    })

    const wrapper = mount(ComponenteTardio, { attachTo: document.body })

    setTimeout(() => {
      const btn = document.getElementById('btn-real')
      if (btn) definirDimensoesMock(btn)
    }, 90)

    const { startTutorial, currentStep, resolveStepElement } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-tardio',
          target: 'botao-tardio',
          title: 'Botão tardio',
          mode: 'wait-click',
        },
      ],
      true
    )

    expect(currentStep.value?.id).toBe('passo-tardio')
    expect(resolveStepElement(currentStep.value)?.id).toBe('btn-real')

    wrapper.unmount()
  })

  it('[CENÁRIO DE ERRO] Deve emitir aviso claro e retornar null quando o seletor CSS informado no target é inválido', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const resultado = resolverSeletorUnico('#[seletor-css-invalido')

    expect(resultado).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Seletor CSS inválido informado no target: "#[seletor-css-invalido"')
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve emitir aviso detalhado quando o elemento alvo não é encontrado no DOM após o timeout', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const passoInexistente = {
      id: 'passo-fantasma',
      title: 'Botão que não existe',
      mode: 'info' as const,
      target: '.seletor-que-nao-existe',
    }

    const el = await aguardarElementoNoDom(passoInexistente, false, 'smooth', 60)

    expect(el).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Passo "passo-fantasma" ("Botão que não existe"): o elemento alvo ".seletor-que-nao-existe" não foi encontrado no DOM após aguardar 60ms'
      )
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve emitir aviso específico quando o elemento existe no DOM mas permanece oculto (width/height = 0)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    criarElementoAlvoNoDom({
      id: 'botao-escondido',
      visivel: false,
    })

    const passoOculto = {
      id: 'passo-oculto',
      title: 'Item dentro de modal fechado',
      mode: 'wait-click' as const,
      target: '#botao-escondido',
    }

    const el = await aguardarElementoNoDom(passoOculto, false, 'smooth', 60)

    expect(el).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Passo "passo-oculto" ("Item dentro de modal fechado"): o elemento alvo "#botao-escondido" existe no DOM, mas permanece oculto (largura ou altura igual a 0)'
      )
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve lidar com falha no scrollIntoView fazendo fallback seguro sem quebrar a execução', async () => {
    const elForaDaTela = criarElementoAlvoNoDom({
      id: 'btn-rodape-distante',
      x: 20,
      y: 2500,
      width: 120,
      height: 40,
    })

    let chamadas = 0
    elForaDaTela.scrollIntoView = vi.fn((arg?: any) => {
      chamadas++
      if (arg && typeof arg === 'object') {
        throw new Error('Navegador antigo não suporta Smooth Scroll options')
      }
    })

    await expect(
      rolarParaElementoSeNecessario(elForaDaTela, true, 'smooth')
    ).resolves.toBeUndefined()
    expect(chamadas).toBe(2)
  })

  it('[CENÁRIO DE ERRO] Deve avisar quando a diretiva v-tutorial ou registerTarget recebe ID vazio e limpar registros antigos ao atualizar', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { registerTarget } = useTutorial()

    const elemento = criarElementoAlvoNoDom({ id: 'alvo-teste' })
    registerTarget(elemento, '')

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Falha ao registrar elemento alvo em registerTarget: o "id" informado está vazio')
    )

    // Testa montagem com valor vazio e atualização dinâmica da diretiva
    const idDinamico = ref<string | undefined>('')
    const ComponenteDiretiva = defineComponent({
      directives: { tutorial: vTutorial },
      setup() {
        return { idDinamico }
      },
      template: `<button v-tutorial="idDinamico">Botão</button>`,
    })

    const wrapper = mount(ComponenteDiretiva, { attachTo: document.body })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('A diretiva v-tutorial foi montada com valor vazio')
    )

    idDinamico.value = 'id-inicial'
    await wrapper.vm.$nextTick()
    expect(registeredElements.has('id-inicial')).toBe(true)

    // Ao trocar o ID, o ID anterior deve ser removido do mapa para não deixar referência órfã
    idDinamico.value = 'id-atualizado'
    await wrapper.vm.$nextTick()
    expect(registeredElements.has('id-inicial')).toBe(false)
    expect(registeredElements.has('id-atualizado')).toBe(true)

    // Ao limpar o binding para undefined, deve remover o registro e o atributo data-tutorial-id
    idDinamico.value = undefined
    await wrapper.vm.$nextTick()
    expect(registeredElements.has('id-atualizado')).toBe(false)

    wrapper.unmount()
    warnSpy.mockRestore()
  })
})