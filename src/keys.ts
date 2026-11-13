/*
========
Chaves de injeção de dependência (Provide / Inject) do módulo de tutorial (keys.ts).
Segue o padrão do v-required para comunicação transparente entre TutorialProvider e TutorialStep.
========
*/
import type { InjectionKey } from 'vue'
import type { TutorialProviderInjection } from './types'

// Chave única de injeção para registro automático de passos declarativos no template
export const TUTORIAL_PROVIDER_KEY: InjectionKey<TutorialProviderInjection> = Symbol(
  'SISTEC_TUTORIAL_PROVIDER_KEY'
)