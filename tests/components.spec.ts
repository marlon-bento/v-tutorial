/*
========
Suíte de testes dos componentes Vue <TutorialProvider> e <VTutorialStep> (tests/components.spec.ts).
Valida o registro declarativo de passos no template, sincronização reativa de props,
teleporte de conteúdo de slot, atalhos de teclado (Escape, ArrowRight, ArrowLeft) e modo Headless UI.
========
*/
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { TutorialProvider, VTutorialStep, useTutorial } from '../src/index'
import { resetarEstadoGlobalTutorial, criarElementoAlvoNoDom } from './helpers'

describe('Escopo: Componentes <TutorialProvider> e <VTutorialStep> (TutorialProvider.vue / TutorialStep.vue)', () => {
  beforeEach(() => {
    resetarEstadoGlobalTutorial()
  })

  it('Deve registrar passos declarativos via <VTutorialStep>, teleportar o slot padrão e atualizar props reativamente', async () => {
    const tituloReativo = ref('Bem-vindo ao Sistema')
    const mostrarSegundoPasso = ref(true)

    const AppDeclarativo = defineComponent({
      components: { TutorialProvider, VTutorialStep },
      setup() {
        return { tituloReativo, mostrarSegundoPasso }
      },
      template: `
        <TutorialProvider>
          <VTutorialStep id="passo-decl-1" :title="tituloReativo" mode="info" placement="center">
            <p id="paragrafo-teleportado">Texto vindo do slot do passo 1</p>
          </VTutorialStep>

          <VTutorialStep
            v-if="mostrarSegundoPasso"
            id="passo-decl-2"
            title="Segundo Passo"
            mode="info"
            placement="center"
          />
        </TutorialProvider>
      `,
    })

    const wrapper = mount(AppDeclarativo, { attachTo: document.body })
    const { startTutorial, steps, currentStep } = useTutorial()

    await startTutorial(undefined, true)
    await nextTick()
    await nextTick()

    expect(steps.value).toHaveLength(2)
    expect(currentStep.value?.title).toBe('Bem-vindo ao Sistema')
    expect(document.getElementById('paragrafo-teleportado')?.textContent).toBe(
      'Texto vindo do slot do passo 1'
    )

    // Altera o título reativamente e verifica se o passo atual reflete a mudança no DOM
    tituloReativo.value = 'Título Atualizado em Tempo Real'
    await nextTick()
    expect(currentStep.value?.title).toBe('Título Atualizado em Tempo Real')
    expect(document.body.querySelector('.v-tutorial-title')?.textContent).toBe(
      'Título Atualizado em Tempo Real'
    )

    // Desmonta o segundo passo via v-if e verifica se foi removido da fila declarativa
    mostrarSegundoPasso.value = false
    await nextTick()
    expect(steps.value).toHaveLength(1)

    wrapper.unmount()
  })

  it('Deve navegar com ArrowRight/ArrowLeft, bloquear ArrowRight em modo wait-click e fechar com Escape', async () => {
    criarElementoAlvoNoDom({ id: 'alvo-obrigatorio' })

    const AppTeclado = defineComponent({
      components: { TutorialProvider, VTutorialStep },
      template: `
        <TutorialProvider>
          <VTutorialStep id="p1" title="Passo Informativo" mode="info" placement="center" />
          <VTutorialStep id="p2" title="Passo Obrigatório" mode="wait-click" target="#alvo-obrigatorio" />
        </TutorialProvider>
      `,
    })

    const wrapper = mount(AppTeclado, { attachTo: document.body })
    const { startTutorial, currentStep, isActive } = useTutorial()

    await startTutorial(undefined, true)
    expect(currentStep.value?.id).toBe('p1')

    // ArrowRight deve avançar do passo 1 (info) para o passo 2 (wait-click)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await new Promise((r) => setTimeout(r, 40))
    await nextTick()
    expect(currentStep.value?.id).toBe('p2')

    // No passo 2 (wait-click), ArrowRight NÃO pode burlar o clique obrigatório
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await new Promise((r) => setTimeout(r, 40))
    expect(currentStep.value?.id).toBe('p2')
    expect(isActive.value).toBe(true)

    // ArrowLeft deve permitir voltar ao passo 1
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await new Promise((r) => setTimeout(r, 40))
    await nextTick()
    expect(currentStep.value?.id).toBe('p1')

    // Escape deve encerrar o tutorial imediatamente
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(isActive.value).toBe(false)

    wrapper.unmount()
  })

  it('Deve suportar modo Headless (:unstyled="true") e renderização customizada via Scoped Slot #card', async () => {
    const AppHeadless = defineComponent({
      components: { TutorialProvider, VTutorialStep },
      template: `
        <TutorialProvider :unstyled="true">
          <VTutorialStep id="headless-1" title="Título Headless" mode="info" placement="center" />

          <template #card="{ step, stepIndex, totalSteps, nextStep }">
            <div id="meu-card-headless">
              <span id="contador-headless">{{ stepIndex + 1 }}/{{ totalSteps }}</span>
              <h2 id="titulo-headless">{{ step?.title }}</h2>
              <button id="btn-avancar-headless" @click="nextStep">Avançar Custom</button>
            </div>
          </template>
        </TutorialProvider>
      `,
    })

    const wrapper = mount(AppHeadless, { attachTo: document.body })
    const { startTutorial, isActive } = useTutorial()

    await startTutorial(undefined, true)
    await nextTick()

    expect(document.querySelector('.v-tutorial-root')).toBeNull()
    expect(document.getElementById('titulo-headless')?.textContent).toBe('Título Headless')
    expect(document.getElementById('contador-headless')?.textContent).toBe('1/1')

    const btnAvancar = document.getElementById('btn-avancar-headless') as HTMLButtonElement
    btnAvancar.click()
    await nextTick()

    expect(isActive.value).toBe(false)

    wrapper.unmount()
  })
})