/*
========
Ponto de entrada e exportação pública da biblioteca v-tutorial (src/index.ts).
Exporta os tipos, utilitários responsivos, resolvedores de DOM, posicionamento,
módulos internos (state, storage, actions, navigation, directive, useSpotlightTracker),
o composable useTutorial, componentes e registra tipagens globais para o Volar (VS Code).
========
*/
import type { App } from 'vue'
import type { TutorialOptions } from './types'
import { useTutorial, vTutorial, registeredActions } from './useTutorial'
import TutorialProvider from './TutorialProvider.vue'
import TutorialStepComponent from './TutorialStep.vue'

export * from './types'
export * from './keys'
export * from './responsive'
export * from './domResolver'
export * from './positioning'
export * from './state'
export * from './storage'
export * from './actions'
export * from './navigation'
export * from './directive'
export * from './useSpotlightTracker'
export { useTutorial, vTutorial, registeredActions }
export {
  TutorialProvider,
  TutorialStepComponent as VTutorialStep,
  TutorialStepComponent,
}

// Plugin Vue para instalação global via app.use(TutorialPlugin, options)
export const TutorialPlugin = {
  install(app: App, options?: Partial<TutorialOptions>) {
    if (options) {
      const { configureTutorial } = useTutorial()
      configureTutorial(options)
    }
    app.directive('tutorial', vTutorial)
    app.component('TutorialProvider', TutorialProvider)
    app.component('VTutorialStep', TutorialStepComponent)
  },
}

export default TutorialPlugin

// Integração nativa com Volar / vue-tsc para autocomplete automático no template Vue
declare module 'vue' {
  export interface GlobalComponents {
    TutorialProvider: typeof TutorialProvider
    VTutorialStep: typeof TutorialStepComponent
  }
  export interface GlobalDirectives {
    vTutorial: typeof vTutorial
  }
}