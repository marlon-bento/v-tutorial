/*
========
Suíte de testes de navegação, rotas, ações registradas e tratamento de erros (tests/navigation-and-actions.spec.ts).
Valida o fluxo de passos (startTutorial, nextStep, prevStep, goToStep, restartTutorial),
execução tardia de registerAction, rollback de rotas/ações e todos os cenários de erro de execução
(ações inexistentes, exceções em callbacks/hooks, rotas sem router, wait-click inválido e bloqueio de localStorage).
========
*/
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { useTutorial } from '../src/index'
import {
  resetarEstadoGlobalTutorial,
  criarElementoAlvoNoDom,
  criarRouterMock,
} from './helpers'

describe('Escopo: Navegação, Rotas, Ações Registradas e Cenários de Erro (useTutorial.ts)', () => {
  beforeEach(() => {
    resetarEstadoGlobalTutorial()
  })

  it('Deve aguardar a montagem tardia do componente da rota antes de executar registerAction', async () => {
    const acaoExecutadaNaPagina = vi.fn()
    const { router } = criarRouterMock('/')

    const AppComRotaDinamica = defineComponent({
      setup() {
        const { registerAction } = useTutorial()
        const paginaReportMontada = ref(false)

        setTimeout(() => {
          paginaReportMontada.value = true
          registerAction('acaoExclusivaDaPaginaReport', (valor: string) => {
            acaoExecutadaNaPagina(valor)
          })
        }, 80)

        return { paginaReportMontada }
      },
      template: `<div v-if="paginaReportMontada" id="pagina-report">Report View</div>`,
    })

    const wrapper = mount(AppComRotaDinamica, { attachTo: document.body })
    const { configureTutorial, startTutorial } = useTutorial()

    configureTutorial({ router })

    await startTutorial(
      [
        {
          id: 'ir-para-report',
          title: 'Indo para Report',
          mode: 'info',
          placement: 'center',
          route: '/report',
          enterActions: {
            acaoExclusivaDaPaginaReport: 'dados-iniciais',
          },
        },
      ],
      true
    )

    expect(router.currentRoute.value.path).toBe('/report')
    expect(acaoExecutadaNaPagina).toHaveBeenCalledTimes(1)
    expect(acaoExecutadaNaPagina).toHaveBeenCalledWith('dados-iniciais')

    wrapper.unmount()
  })

  it('Deve avançar ao clicar no botão real em modo wait-click e fazer rollback de rota e estado ao clicar em Anterior', async () => {
    const estadoMenuExpandido = ref(false)
    const { router } = criarRouterMock('/')

    const { configureTutorial, registerAction, startTutorial, currentStep, prevStep } =
      useTutorial()

    configureTutorial({ router })
    registerAction('setMenu', (aberto: boolean) => {
      estadoMenuExpandido.value = aberto
    })

    const botaoAlvo = criarElementoAlvoNoDom({ className: 'btn-abrir-sistema' })

    await startTutorial(
      [
        {
          id: 'passo-1',
          target: '.btn-abrir-sistema',
          title: 'Clique no sistema',
          mode: 'wait-click',
          afterClickDelay: 25,
          route: '/',
          rollbackRoute: '/',
          enterActions: { setMenu: true },
          rollbackActions: { setMenu: true },
        },
        {
          id: 'passo-2',
          title: 'Dentro do sistema',
          mode: 'info',
          placement: 'center',
          route: '/sistema/agenda',
          enterActions: { setMenu: false },
        },
      ],
      true
    )

    expect(currentStep.value?.id).toBe('passo-1')
    expect(estadoMenuExpandido.value).toBe(true)

    botaoAlvo.click()

    await new Promise((r) => setTimeout(r, 70))
    await nextTick()

    expect(currentStep.value?.id).toBe('passo-2')
    expect(router.currentRoute.value.path).toBe('/sistema/agenda')
    expect(estadoMenuExpandido.value).toBe(false)

    await prevStep()

    expect(currentStep.value?.id).toBe('passo-1')
    expect(router.currentRoute.value.path).toBe('/')
    expect(estadoMenuExpandido.value).toBe(true)
  })

  it('Deve bloquear o clique nativo do elemento quando preventNativeClick=true e permitir avanço via wrapTutorialAction', async () => {
    const acaoNativa = vi.fn()
    const acaoTutorial = vi.fn()

    const botao = criarElementoAlvoNoDom({ id: 'btn-perigoso' })
    botao.addEventListener('click', acaoNativa)

    const { startTutorial, currentStep, wrapTutorialAction } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-bloqueado',
          target: '#btn-perigoso',
          title: 'Não dispare o submit real',
          mode: 'wait-click',
          preventNativeClick: true,
          afterClickDelay: 20,
        },
        {
          id: 'passo-wrapper',
          target: '#btn-perigoso',
          title: 'Teste com wrapTutorialAction',
          mode: 'info',
          placement: 'center',
        },
        {
          id: 'passo-final',
          title: 'Concluído',
          mode: 'info',
          placement: 'center',
        },
      ],
      true
    )

    botao.click()
    await new Promise((r) => setTimeout(r, 60))

    expect(acaoNativa).not.toHaveBeenCalled()
    expect(currentStep.value?.id).toBe('passo-wrapper')

    const funcaoEncapsulada = wrapTutorialAction('passo-wrapper', acaoNativa, {
      tutorialFn: acaoTutorial,
      preventNativeWhenActive: true,
      autoAdvance: true,
    })

    await funcaoEncapsulada('parametro-teste')
    expect(acaoTutorial).toHaveBeenCalledWith('parametro-teste')
    expect(acaoNativa).not.toHaveBeenCalled()
    expect(currentStep.value?.id).toBe('passo-final')
  })

  it('[CENÁRIO DE ERRO] Deve emitir aviso claro ao chamar startTutorial sem nenhum passo registrado ou com todos desabilitados', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { startTutorial, isActive } = useTutorial()

    await startTutorial([], true)
    expect(isActive.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível iniciar o tutorial: nenhum passo foi registrado')
    )

    await startTutorial(
      [
        {
          id: 'passo-desativado',
          title: 'Desativado',
          mode: 'info',
          disabled: true,
        },
      ],
      true
    )

    expect(isActive.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('todos os 1 passos cadastrados estão desabilitados (disabled: true)')
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve alertar quando um passo em modo wait-click não possui target ou usa placement="center"', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { startTutorial } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-travado',
          title: 'Passo mal configurado',
          mode: 'wait-click',
          placement: 'center',
        },
      ],
      true
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Configuração inconsistente no passo "passo-travado" ("Passo mal configurado"): o modo "wait-click" oculta o botão "Próximo"'
      )
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve listar as ações registradas disponíveis quando enterActions chama uma ação inexistente', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { registerAction, startTutorial } = useTutorial()

    registerAction('abrirModalUsuario', () => {})
    registerAction('fecharMenuLateral', () => {})

    await startTutorial(
      [
        {
          id: 'passo-acao-errada',
          title: 'Teste de typo na ação',
          mode: 'info',
          placement: 'center',
          enterActions: ['abrirModalUsuaroComErroDeDigitacao'],
        },
      ],
      true
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Ação "abrirModalUsuaroComErroDeDigitacao" chamada no passo "passo-acao-errada" ("Teste de typo na ação") não foi encontrada'
      )
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ações registradas no momento: [abrirModalUsuario, fecharMenuLateral]')
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve capturar exceções lançadas dentro de uma ação registrada sem interromper o tutorial', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { registerAction, startTutorial, isActive, isTransitioning } = useTutorial()

    registerAction('acaoQueQuebra', () => {
      throw new Error('Falha interna no componente ao abrir gaveta')
    })

    await startTutorial(
      [
        {
          id: 'passo-com-acao-defeituosa',
          title: 'Passo resiliente',
          mode: 'info',
          placement: 'center',
          enterActions: ['acaoQueQuebra'],
        },
      ],
      true
    )

    expect(isActive.value).toBe(true)
    expect(isTransitioning.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Erro ao executar a ação "acaoQueQuebra" durante o passo "passo-com-acao-defeituosa"'
      ),
      expect.any(Error)
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve avisar quando um passo define route="/..." mas o Vue Router não foi configurado no plugin', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { startTutorial } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-sem-router',
          title: 'Rota sem Router',
          mode: 'info',
          placement: 'center',
          route: '/configuracoes',
        },
      ],
      true
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'O passo "passo-sem-router" tentou navegar para a rota "/configuracoes", mas nenhuma instância do Vue Router foi configurada'
      )
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve capturar falhas de navegação do Vue Router (ex: erro em navigation guard) sem travar a transição', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { router } = criarRouterMock('/', new Error('Acesso negado pelo guard de autenticação'))
    const { configureTutorial, startTutorial, isActive, isTransitioning } = useTutorial()

    configureTutorial({ router })

    await startTutorial(
      [
        {
          id: 'passo-rota-bloqueada',
          title: 'Rota Protegida',
          mode: 'info',
          placement: 'center',
          route: '/admin',
        },
      ],
      true
    )

    expect(isActive.value).toBe(true)
    expect(isTransitioning.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Falha ao navegar para a rota "/admin" no passo "passo-rota-bloqueada"'
      ),
      expect.any(Error)
    )

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve listar os passos habilitados quando goToStep recebe um ID ou índice inexistente', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { startTutorial, goToStep, currentStep } = useTutorial()

    await startTutorial(
      [
        { id: 'boas-vindas', title: 'Bem-vindo', mode: 'info', placement: 'center' },
        { id: 'conclusao', title: 'Fim', mode: 'info', placement: 'center' },
      ],
      true
    )

    await goToStep('id-que-nao-existe')
    expect(currentStep.value?.id).toBe('boas-vindas')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Não foi possível navegar para o passo "id-que-nao-existe": índice ou ID não encontrado'
      )
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Passos habilitados no momento (2): [0: "boas-vindas", 1: "conclusao"]')
    )

    await goToStep(99)
    expect(currentStep.value?.id).toBe('boas-vindas')

    warnSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve recuperar isTransitioning=false e avançar mesmo se beforeEnter, onTargetClick ou afterClick lançarem erro', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const botao = criarElementoAlvoNoDom({ id: 'btn-com-erro-hook' })
    const { startTutorial, currentStep, isTransitioning } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-1-hooks',
          target: '#btn-com-erro-hook',
          title: 'Passo com erro nos hooks',
          mode: 'wait-click',
          afterClickDelay: 20,
          beforeEnter: () => {
            throw new Error('Erro no beforeEnter')
          },
          onTargetClick: () => {
            throw new Error('Erro no onTargetClick')
          },
          afterClick: () => {
            throw new Error('Erro no afterClick')
          },
        },
        {
          id: 'passo-2-sucesso',
          title: 'Chegou ao passo 2 mesmo após erros nos hooks',
          mode: 'info',
          placement: 'center',
        },
      ],
      true
    )

    expect(isTransitioning.value).toBe(false)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao iniciar o tutorial no primeiro passo "passo-1-hooks"'),
      expect.any(Error)
    )

    botao.click()
    await new Promise((r) => setTimeout(r, 60))
    await nextTick()

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao executar o callback de clique no elemento alvo do passo "passo-1-hooks"'),
      expect.any(Error)
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro no hook afterClick do passo "passo-1-hooks"'),
      expect.any(Error)
    )
    expect(currentStep.value?.id).toBe('passo-2-sucesso')
    expect(isTransitioning.value).toBe(false)

    errorSpy.mockRestore()
  })

  it('[CENÁRIO DE ERRO] Deve continuar funcionando em memória caso o localStorage lance SecurityError ou QuotaExceededError', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage bloqueado no iframe')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: limite de armazenamento excedido')
    })

    const { startTutorial, endTutorial, isActive } = useTutorial()

    await startTutorial(
      [{ id: 'passo-memoria', title: 'Sem Storage', mode: 'info', placement: 'center' }],
      false
    )

    expect(isActive.value).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível ler a chave "v-tutorial-completed" no localStorage'),
      expect.any(Error)
    )

    endTutorial(true)
    expect(isActive.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Não foi possível atualizar a chave "v-tutorial-completed" no localStorage'),
      expect.any(Error)
    )

    getItemSpy.mockRestore()
    setItemSpy.mockRestore()
    warnSpy.mockRestore()
  })
})