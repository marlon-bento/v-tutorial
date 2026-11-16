/*
========
Suíte de testes do motor de posicionamento geométrico e prevenção de colisão (tests/positioning.spec.ts).
Valida o cálculo de coordenadas do card flutuante, da seta indicadora (arrowStyle),
inversão automática de top-sheet e bottom-sheet no celular e auto-flip nas bordas da janela.
========
*/
import { describe, it, expect } from 'vitest'
import { calcularPosicaoCard } from '../src/index'

describe('Posicionamento e Anti-Colisão (positioning.ts)', () => {
  it('Centraliza o card quando não há elemento alvo', () => {
    const resultado = calcularPosicaoCard({
      hasTargetBox: false,
      spotlightBox: { x: 0, y: 0, width: 0, height: 0 },
      viewportW: 1024,
      viewportH: 768,
      maxCardW: 370,
      cardHeight: 220,
      requestedPlacement: 'auto',
      isMobileViewport: false,
      useMobileSheet: true,
    })

    expect(resultado.resolvedPlacement).toBe('center')
    expect(resultado.cardStyle.top).toBe('50%')
    expect(resultado.cardStyle.left).toBe('50%')
    expect(resultado.arrowStyle).toBeNull()
  })

  it('Converte auto em bottom-sheet no mobile quando há espaço inferior', () => {
    const resultado = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 20, y: 60, width: 100, height: 40 },
      viewportW: 390,
      viewportH: 800,
      maxCardW: 370,
      cardHeight: 220,
      requestedPlacement: 'auto',
      isMobileViewport: true,
      useMobileSheet: true,
    })

    expect(resultado.resolvedPlacement).toBe('bottom-sheet')
    expect(resultado.cardStyle.bottom).toBe('12px')
    expect(resultado.arrowStyle).toBeNull()
  })

  it('Inverte bottom-sheet para top-sheet se cobrir botão inferior', () => {
    const resultado = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 40, y: 620, width: 120, height: 48 },
      viewportW: 390,
      viewportH: 700,
      maxCardW: 350,
      cardHeight: 220,
      requestedPlacement: 'bottom-sheet',
      isMobileViewport: true,
      useMobileSheet: true,
    })

    expect(resultado.resolvedPlacement).toBe('top-sheet')
    expect(resultado.cardStyle.top).toBe('12px')
    expect(resultado.arrowStyle).toBeNull()
  })

  it('Inverte top-sheet para bottom-sheet se cobrir botão no topo', () => {
    const resultado = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 30, y: 20, width: 140, height: 44 },
      viewportW: 390,
      viewportH: 700,
      maxCardW: 350,
      cardHeight: 220,
      requestedPlacement: 'top-sheet',
      isMobileViewport: true,
      useMobileSheet: true,
    })

    expect(resultado.resolvedPlacement).toBe('bottom-sheet')
    expect(resultado.cardStyle.bottom).toBe('12px')
    expect(resultado.arrowStyle).toBeNull()
  })

  it('Recua para bottom ou top com seta quando alvo colide com ambos os sheets', () => {
    // Alvo de y=80 até y=400 em tela de 500px: spaceTop=80, spaceBottom=100 -> prefere bottom
    const resultadoParaBaixo = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 20, y: 80, width: 300, height: 320 },
      viewportW: 390,
      viewportH: 500,
      maxCardW: 350,
      cardHeight: 200,
      requestedPlacement: 'top-sheet',
      isMobileViewport: true,
      useMobileSheet: true,
    })

    expect(resultadoParaBaixo.resolvedPlacement).toBe('bottom')
    expect(resultadoParaBaixo.arrowStyle).not.toBeNull()

    // Alvo de y=120 até y=440 em tela de 500px: spaceTop=120, spaceBottom=60 -> prefere top
    const resultadoParaTopo = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 20, y: 120, width: 300, height: 320 },
      viewportW: 390,
      viewportH: 500,
      maxCardW: 350,
      cardHeight: 200,
      requestedPlacement: 'bottom-sheet',
      isMobileViewport: true,
      useMobileSheet: true,
    })

    expect(resultadoParaTopo.resolvedPlacement).toBe('top')
    expect(resultadoParaTopo.arrowStyle).not.toBeNull()
  })

  it('Faz auto-flip horizontal (right <-> left) na borda da tela', () => {
    const flipParaEsquerda = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 1100, y: 200, width: 80, height: 40 },
      viewportW: 1200,
      viewportH: 800,
      maxCardW: 370,
      cardHeight: 200,
      requestedPlacement: 'right',
      isMobileViewport: false,
      useMobileSheet: false,
    })

    expect(flipParaEsquerda.resolvedPlacement).toBe('left')
    expect(flipParaEsquerda.arrowStyle?.top).toBeDefined()

    const flipParaDireita = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 10, y: 200, width: 80, height: 40 },
      viewportW: 1200,
      viewportH: 800,
      maxCardW: 370,
      cardHeight: 200,
      requestedPlacement: 'left',
      isMobileViewport: false,
      useMobileSheet: false,
    })

    expect(flipParaDireita.resolvedPlacement).toBe('right')
    expect(flipParaDireita.arrowStyle?.top).toBeDefined()
  })

  it('Faz auto-flip vertical (bottom <-> top) na borda da tela', () => {
    const flipParaTopo = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 400, y: 740, width: 120, height: 40 },
      viewportW: 1200,
      viewportH: 800,
      maxCardW: 370,
      cardHeight: 220,
      requestedPlacement: 'bottom',
      isMobileViewport: false,
      useMobileSheet: false,
    })

    expect(flipParaTopo.resolvedPlacement).toBe('top')
    expect(flipParaTopo.arrowStyle?.left).toBeDefined()

    const flipParaBaixo = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 400, y: 10, width: 120, height: 40 },
      viewportW: 1200,
      viewportH: 800,
      maxCardW: 370,
      cardHeight: 220,
      requestedPlacement: 'top',
      isMobileViewport: false,
      useMobileSheet: false,
    })

    expect(flipParaBaixo.resolvedPlacement).toBe('bottom')
    expect(flipParaBaixo.arrowStyle?.left).toBeDefined()
  })

  it('Escolhe o lado com maior espaço livre em placement="auto" no desktop', () => {
    const resultado = calcularPosicaoCard({
      hasTargetBox: true,
      spotlightBox: { x: 100, y: 300, width: 150, height: 50 },
      viewportW: 1280,
      viewportH: 720,
      maxCardW: 370,
      cardHeight: 220,
      requestedPlacement: 'auto',
      isMobileViewport: false,
      useMobileSheet: false,
    })

    expect(resultado.resolvedPlacement).toBe('right')
  })
})