/*
========
Motor de cálculo geométrico e prevenção de colisão do card flutuante (positioning.ts).
Calcula as coordenadas do card, da seta indicadora (arrowStyle) e impede que o card
(inclusive em modo top-sheet ou bottom-sheet no mobile) cubra o botão que o usuário deve clicar.
========
*/
import type { TutorialPlacement } from './types'

export interface ParametrosPosicionamentoCard {
  hasTargetBox: boolean
  spotlightBox: { x: number; y: number; width: number; height: number }
  viewportW: number
  viewportH: number
  maxCardW: number
  cardHeight: number
  requestedPlacement: TutorialPlacement
  isMobileViewport: boolean
  useMobileSheet: boolean
}

export interface ResultadoPosicionamentoCard {
  resolvedPlacement: TutorialPlacement
  cardStyle: Record<string, string>
  arrowStyle: Record<string, string> | null
}

/*
Calcula a posição ideal do card flutuante e da seta indicadora com sistema anti-colisão.
Recebe: params (objeto ParametrosPosicionamentoCard com dimensões da tela, do card e do alvo).
Devolve: objeto ResultadoPosicionamentoCard contendo o estilo CSS do card e da seta.
Por que é usada: Isola toda a matemática de layout fora do componente Vue e garante que o alvo nunca seja encoberto.
*/
export function calcularPosicaoCard(
  params: ParametrosPosicionamentoCard
): ResultadoPosicionamentoCard {
  const {
    hasTargetBox,
    spotlightBox: rect,
    viewportW: vw,
    viewportH: vh,
    maxCardW,
    cardHeight,
    requestedPlacement,
    isMobileViewport,
    useMobileSheet,
  } = params

  const responsiveWidth = Math.min(maxCardW, vw - 24)

  if (!hasTargetBox) {
    return {
      resolvedPlacement: 'center',
      cardStyle: {
        top: '50%',
        left: '50%',
        width: `${responsiveWidth}px`,
        transform: 'translate(-50%, -50%)',
      },
      arrowStyle: null,
    }
  }

  const gap = 14
  let placement: TutorialPlacement = requestedPlacement || 'auto'

  const spaceRight = vw - (rect.x + rect.width)
  const spaceLeft = rect.x
  const spaceBottom = vh - (rect.y + rect.height)
  const spaceTop = rect.y

  if (
    isMobileViewport &&
    useMobileSheet &&
    (placement === 'auto' || placement === 'left' || placement === 'right')
  ) {
    placement = spaceBottom >= spaceTop ? 'bottom-sheet' : 'top-sheet'
  }

  // Detector Anti-Colisão para top-sheet e bottom-sheet:
  // Garante que o card nunca fique por cima do botão obrigatório no celular
  if (placement === 'top-sheet' || placement === 'bottom-sheet') {
    const sheetW = Math.min(vw - 20, 440)
    const sheetLeft = Math.round((vw - sheetW) / 2)

    const topSheetY = 12
    const topSheetBottom = topSheetY + cardHeight
    const bottomSheetTop = vh - 12 - cardHeight
    const bottomSheetBottom = vh - 12

    const overlapsTopSheet =
      rect.y < topSheetBottom + 10 && rect.y + rect.height > topSheetY - 10
    const overlapsBottomSheet =
      rect.y < bottomSheetBottom + 10 && rect.y + rect.height > bottomSheetTop - 10

    if (placement === 'top-sheet' && overlapsTopSheet && !overlapsBottomSheet) {
      placement = 'bottom-sheet'
    } else if (placement === 'bottom-sheet' && overlapsBottomSheet && !overlapsTopSheet) {
      placement = 'top-sheet'
    } else if (overlapsTopSheet && overlapsBottomSheet) {
      if (spaceBottom >= spaceTop) {
        const safeTop = Math.min(vh - cardHeight - 10, rect.y + rect.height + 12)
        return {
          resolvedPlacement: 'bottom',
          cardStyle: {
            top: `${Math.max(12, safeTop)}px`,
            left: `${sheetLeft}px`,
            bottom: 'auto',
            width: `${sheetW}px`,
            transform: 'none',
          },
          arrowStyle: {
            left: `${Math.max(24, Math.min(sheetW - 24, rect.x + rect.width / 2 - sheetLeft))}px`,
          },
        }
      } else {
        const safeTop = Math.max(12, rect.y - cardHeight - 12)
        return {
          resolvedPlacement: 'top',
          cardStyle: {
            top: `${safeTop}px`,
            left: `${sheetLeft}px`,
            bottom: 'auto',
            width: `${sheetW}px`,
            transform: 'none',
          },
          arrowStyle: {
            left: `${Math.max(24, Math.min(sheetW - 24, rect.x + rect.width / 2 - sheetLeft))}px`,
          },
        }
      }
    }

    if (placement === 'bottom-sheet') {
      return {
        resolvedPlacement: 'bottom-sheet',
        cardStyle: {
          bottom: '12px',
          left: `${sheetLeft}px`,
          top: 'auto',
          width: `${sheetW}px`,
          transform: 'none',
        },
        arrowStyle: null,
      }
    }

    if (placement === 'top-sheet') {
      return {
        resolvedPlacement: 'top-sheet',
        cardStyle: {
          top: '12px',
          left: `${sheetLeft}px`,
          bottom: 'auto',
          width: `${sheetW}px`,
          transform: 'none',
        },
        arrowStyle: null,
      }
    }
  }

  if (placement === 'auto') {
    const candidates: Array<{
      dir: 'right' | 'left' | 'bottom' | 'top'
      space: number
      minReq: number
    }> = [
      { dir: 'right', space: spaceRight, minReq: responsiveWidth + gap + 16 },
      { dir: 'left', space: spaceLeft, minReq: responsiveWidth + gap + 16 },
      { dir: 'bottom', space: spaceBottom, minReq: cardHeight + gap + 16 },
      { dir: 'top', space: spaceTop, minReq: cardHeight + gap + 16 },
    ]
    const fitting = candidates.filter((c) => c.space >= c.minReq)
    if (fitting.length > 0) {
      placement = fitting.sort((a, b) => b.space - a.space)[0].dir
    } else {
      placement = candidates.sort((a, b) => b.space - a.space)[0].dir
    }
  } else {
    if (placement === 'right' && spaceRight < responsiveWidth + gap && spaceLeft > spaceRight) {
      placement = 'left'
    } else if (placement === 'left' && spaceLeft < responsiveWidth + gap && spaceRight > spaceLeft) {
      placement = 'right'
    } else if (placement === 'bottom' && spaceBottom < cardHeight + gap && spaceTop > spaceBottom) {
      placement = 'top'
    } else if (placement === 'top' && spaceTop < cardHeight + gap && spaceBottom > spaceTop) {
      placement = 'bottom'
    }
  }

  let top = rect.y
  let left = rect.x

  if (placement === 'right') {
    left = rect.x + rect.width + gap
    top = rect.y + rect.height / 2 - cardHeight / 2
  } else if (placement === 'left') {
    left = rect.x - responsiveWidth - gap
    top = rect.y + rect.height / 2 - cardHeight / 2
  } else if (placement === 'bottom') {
    top = rect.y + rect.height + gap
    left = rect.x + rect.width / 2 - responsiveWidth / 2
  } else if (placement === 'top') {
    top = rect.y - cardHeight - gap
    left = rect.x + rect.width / 2 - responsiveWidth / 2
  }

  left = Math.max(12, Math.min(left, vw - responsiveWidth - 12))
  top = Math.max(12, Math.min(top, vh - cardHeight - 12))

  // Prevenção final contra sobreposição em telas estreitas
  const overlapsHorizontally = left < rect.x + rect.width && left + responsiveWidth > rect.x
  const overlapsVertically = top < rect.y + rect.height && top + cardHeight > rect.y
  if (overlapsHorizontally && overlapsVertically) {
    if (spaceBottom >= spaceTop) {
      top = Math.min(vh - cardHeight - 10, rect.y + rect.height + 12)
      placement = 'bottom'
    } else {
      top = Math.max(12, rect.y - cardHeight - 12)
      placement = 'top'
    }
  }

  const targetCenterX = rect.x + rect.width / 2
  const targetCenterY = rect.y + rect.height / 2
  let arrowStyle: Record<string, string> | null = null

  if (placement === 'right' || placement === 'left') {
    const arrowTop = Math.max(22, Math.min(cardHeight - 22, targetCenterY - top))
    arrowStyle = { top: `${arrowTop}px` }
  } else if (placement === 'bottom' || placement === 'top') {
    const arrowLeft = Math.max(24, Math.min(responsiveWidth - 24, targetCenterX - left))
    arrowStyle = { left: `${arrowLeft}px` }
  }

  return {
    resolvedPlacement: placement,
    cardStyle: {
      top: `${top}px`,
      left: `${left}px`,
      bottom: 'auto',
      width: `${responsiveWidth}px`,
      transform: 'none',
    },
    arrowStyle,
  }
}