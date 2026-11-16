/*
========
Suíte de testes do motor de responsividade Mobile-First (tests/responsive.spec.ts).
Valida a detecção dos breakpoints no padrão Bootstrap 5 (xs até xxl), a herança em cascata
das propriedades de cada passo, a prioridade dos atalhos inline e o comportamento quando
passos são desabilitados ao redimensionar a tela.
========
*/
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  useTutorial,
  calcularBreakpointAtivo,
  resolverPassoResponsivo,
  DEFAULT_BOOTSTRAP_BREAKPOINTS,
  type TutorialStep,
} from '../src/index'
import { resetarEstadoGlobalTutorial } from './helpers'

describe('Escopo: Responsividade Mobile-First e Breakpoints (responsive.ts)', () => {
  beforeEach(() => {
    resetarEstadoGlobalTutorial()
  })

  it('Deve detectar corretamente cada breakpoint Bootstrap nos limites exatos de largura', () => {
    expect(calcularBreakpointAtivo(0, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xs')
    expect(calcularBreakpointAtivo(375, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xs')
    expect(calcularBreakpointAtivo(575, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xs')
    expect(calcularBreakpointAtivo(576, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('sm')
    expect(calcularBreakpointAtivo(767, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('sm')
    expect(calcularBreakpointAtivo(768, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('md')
    expect(calcularBreakpointAtivo(991, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('md')
    expect(calcularBreakpointAtivo(992, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('lg')
    expect(calcularBreakpointAtivo(1199, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('lg')
    expect(calcularBreakpointAtivo(1200, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xl')
    expect(calcularBreakpointAtivo(1399, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xl')
    expect(calcularBreakpointAtivo(1400, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xxl')
    expect(calcularBreakpointAtivo(1920, DEFAULT_BOOTSTRAP_BREAKPOINTS)).toBe('xxl')
  })

  it('Deve aplicar a cascata Mobile-First completa (xs -> sm -> md -> lg -> xl -> xxl)', () => {
    const passoBase: TutorialStep = {
      id: 'menu-principal',
      title: 'Título Base XS',
      content: 'Conteúdo XS',
      mode: 'wait-click',
      target: '.alvo-xs',
      placement: 'bottom-sheet',
      hintText: 'Dica XS',
      spotlightPadding: 4,
      cardWidth: 300,
      autoScroll: false,
      route: '/mobile',
      rollbackRoute: '/inicio-mobile',
      enterActions: ['abrirGavetaMobile'],
      rollbackActions: ['fecharGavetaMobile'],
      leaveActions: ['limparMobile'],
      breakpoints: {
        sm: {
          title: 'Título SM',
          hintText: 'Dica SM',
        },
        md: {
          title: 'Título MD',
          content: 'Conteúdo Desktop',
          mode: 'info',
          spotlightPadding: 10,
          cardWidth: 420,
          autoScroll: true,
          route: '/desktop',
          rollbackRoute: '/inicio-desktop',
          enterActions: ['expandirSidebarDesktop'],
          rollbackActions: ['recolherSidebarDesktop'],
          leaveActions: ['limparDesktop'],
        },
        xl: {
          disabled: true,
        },
      },
      targetMd: '.alvo-md-atalho',
      placementMd: 'right',
    }

    const emXs = resolverPassoResponsivo(passoBase, 'xs')
    expect(emXs.title).toBe('Título Base XS')
    expect(emXs.target).toBe('.alvo-xs')
    expect(emXs.placement).toBe('bottom-sheet')
    expect(emXs.mode).toBe('wait-click')

    const emSm = resolverPassoResponsivo(passoBase, 'sm')
    expect(emSm.title).toBe('Título SM')
    expect(emSm.hintText).toBe('Dica SM')
    expect(emSm.target).toBe('.alvo-xs')

    // Em lg, deve herdar todas as configurações definidas em sm e md
    const emLg = resolverPassoResponsivo(passoBase, 'lg')
    expect(emLg.title).toBe('Título MD')
    expect(emLg.content).toBe('Conteúdo Desktop')
    expect(emLg.mode).toBe('info')
    expect(emLg.target).toBe('.alvo-md-atalho')
    expect(emLg.placement).toBe('right')
    expect(emLg.hintText).toBe('Dica SM')
    expect(emLg.spotlightPadding).toBe(10)
    expect(emLg.cardWidth).toBe(420)
    expect(emLg.autoScroll).toBe(true)
    expect(emLg.route).toBe('/desktop')
    expect(emLg.rollbackRoute).toBe('/inicio-desktop')
    expect(emLg.enterActions).toEqual(['expandirSidebarDesktop'])
    expect(emLg.rollbackActions).toEqual(['recolherSidebarDesktop'])
    expect(emLg.leaveActions).toEqual(['limparDesktop'])
    expect(emLg.disabled).toBeUndefined()

    // Em xxl, deve herdar o disabled: true definido em xl
    const emXxl = resolverPassoResponsivo(passoBase, 'xxl')
    expect(emXxl.disabled).toBe(true)
  })

  it('Deve permitir que atalhos inline (targetLg, placementLg) sobrescrevam o objeto breakpoints do mesmo nível', () => {
    const passo: TutorialStep = {
      id: 'passo-prioridade',
      title: 'Prioridade',
      mode: 'info',
      target: '.base',
      placement: 'top',
      targetLg: '.atalho-lg',
      placementLg: 'left',
      breakpoints: {
        lg: {
          target: '.objeto-lg',
          placement: 'bottom',
        },
      },
    }

    const resolvido = resolverPassoResponsivo(passo, 'lg')
    expect(resolvido.target).toBe('.atalho-lg')
    expect(resolvido.placement).toBe('left')
  })

  it('Deve permitir desabilitar um passo no mobile (xs) e habilitá-lo a partir do desktop (md)', () => {
    const passoSomenteDesktop: TutorialStep = {
      id: 'atalho-teclado',
      title: 'Atalhos de Teclado',
      mode: 'info',
      disabled: true,
      breakpoints: {
        md: {
          disabled: false,
        },
      },
    }

    expect(resolverPassoResponsivo(passoSomenteDesktop, 'xs').disabled).toBe(true)
    expect(resolverPassoResponsivo(passoSomenteDesktop, 'sm').disabled).toBe(true)
    expect(resolverPassoResponsivo(passoSomenteDesktop, 'md').disabled).toBe(false)
    expect(resolverPassoResponsivo(passoSomenteDesktop, 'xl').disabled).toBe(false)
  })

  it('Deve encerrar o tutorial e emitir aviso claro se todos os passos ficarem desabilitados após redimensionar a janela', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    const { startTutorial, isActive } = useTutorial()

    await startTutorial(
      [
        {
          id: 'exclusivo-mobile',
          title: 'Apenas no Celular',
          mode: 'info',
          placement: 'center',
          breakpoints: {
            md: { disabled: true },
          },
        },
      ],
      true
    )

    expect(isActive.value).toBe(true)

    // Redimensiona para desktop (1024px -> lg), onde o único passo é desabilitado
    window.innerWidth = 1024
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(isActive.value).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Todos os passos ficaram desabilitados após redimensionar a tela')
    )

    warnSpy.mockRestore()
  })

  it('Deve reajustar currentStepIndex se o usuário estiver no último passo e um redimensionamento reduzir o total de passos', async () => {
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    const { startTutorial, nextStep, currentStepIndex, currentStep } = useTutorial()

    await startTutorial(
      [
        {
          id: 'passo-1',
          title: 'Passo 1 (Mobile e Desktop)',
          mode: 'info',
          placement: 'center',
        },
        {
          id: 'passo-2-mobile',
          title: 'Passo 2 (Somente Mobile)',
          mode: 'info',
          placement: 'center',
          breakpoints: {
            md: { disabled: true },
          },
        },
      ],
      true
    )

    await nextStep()
    expect(currentStepIndex.value).toBe(1)
    expect(currentStep.value?.id).toBe('passo-2-mobile')

    // Redimensiona para desktop: a lista filtrada passa a ter apenas 1 passo (índice 0)
    window.innerWidth = 1024
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(currentStepIndex.value).toBe(0)
    expect(currentStep.value?.id).toBe('passo-1')
  })
})