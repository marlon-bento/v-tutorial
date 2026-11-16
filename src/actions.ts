/*
========
Motor de registro e execução de ações remotas entre componentes (src/actions.ts).
Permite que qualquer componente .vue exponha funções internas via registerAction para
serem acionadas declarativamente pelos passos em enterActions, rollbackActions e leaveActions,
incluindo espera automática por componentes que montam de forma assíncrona.
========
*/
import { nextTick, onScopeDispose, getCurrentScope } from 'vue'
import type { TutorialActionMap } from './types'
import { currentStep, globalOptions } from './state'

// Mapa global de ações registradas pelos componentes da aplicação via registerAction
export const registeredActions = new Map<string, (...args: any[]) => any>()

/*
Registra uma ação nomeada que pode ser disparada por qualquer passo do tutorial.
Recebe: name (identificador único da ação) e fn (função callback a ser executada).
Devolve: função para remover manualmente o registro da ação.
Por que é usada: Conecta o estado interno de componentes .vue desacoplados aos passos do tutorial e limpa a referência quando o componente desmonta.
*/
export function registerAction(
  name: string,
  fn: (...args: any[]) => any
): () => void {
  if (!name || !String(name).trim() || typeof fn !== 'function') {
    console.warn(
      `[v-tutorial] Falha ao registrar ação "${name || ''}": informe um nome não vazio e uma função válida em registerAction(nome, fn).`
    )
    return () => {}
  }

  registeredActions.set(name, fn)

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (registeredActions.get(name) === fn) {
        registeredActions.delete(name)
      }
    })
  }

  return () => {
    if (registeredActions.get(name) === fn) {
      registeredActions.delete(name)
    }
  }
}

/*
Executa uma ação previamente registrada por qualquer componente da aplicação.
Recebe: name (nome da ação) e args (argumentos repassados para a função).
Devolve: Promise com o retorno da função registrada ou undefined.
Por que é usada: Aguarda a montagem de componentes tardios (v-if/rotas) até o limite de actionTimeout e lista as ações disponíveis caso o nome não exista.
*/
export async function runRegisteredAction(
  name: string,
  ...args: any[]
): Promise<any> {
  if (!name || !String(name).trim()) {
    console.warn(
      '[v-tutorial] Tentativa de executar uma ação com nome vazio. ' +
        'Verifique as chaves configuradas em enterActions, leaveActions ou rollbackActions.'
    )
    return undefined
  }

  const limiteEsperaMs = globalOptions.value.actionTimeout ?? 800

  try {
    let fn = registeredActions.get(name)

    if (!fn) {
      const inicio = Date.now()
      while (!fn && Date.now() - inicio < limiteEsperaMs) {
        await new Promise((resolve) => setTimeout(resolve, 20))
        fn = registeredActions.get(name)
      }
    }

    if (fn) {
      return await fn(...args)
    } else {
      const acoesDisponiveis = Array.from(registeredActions.keys())
      const resumoAcoes =
        acoesDisponiveis.length > 0
          ? acoesDisponiveis.join(', ')
          : 'nenhuma ação registrada'
      const contextoPasso = currentStep.value
        ? ` no passo "${currentStep.value.id}" ("${currentStep.value.title}")`
        : ''

      console.warn(
        `[v-tutorial] Ação "${name}" chamada${contextoPasso} não foi encontrada após aguardar ${limiteEsperaMs}ms pela montagem do componente. ` +
          `Verifique se registerAction("${name}", fn) foi chamado no componente correspondente. ` +
          `Ações registradas no momento: [${resumoAcoes}].`
      )
    }
  } catch (err) {
    const contextoPasso = currentStep.value
      ? ` durante o passo "${currentStep.value.id}" ("${currentStep.value.title}")`
      : ''
    console.warn(
      `[v-tutorial] Erro ao executar a ação "${name}"${contextoPasso}. ` +
        `Verifique a implementação da função passada para registerAction("${name}"). Detalhes:`,
      err
    )
  }
}

/*
Percorre e executa em sequência um mapa ou lista de ações declarativas de um passo.
Recebe: actions (array de nomes de ações ou objeto chave-valor com argumentos).
Devolve: Promise<void>.
Por que é usada: Permite acionar múltiplas mudanças de estado de interface (abrir menu, fechar modal) antes de posicionar o foco do passo.
*/
export async function runActionMap(actions?: TutorialActionMap): Promise<void> {
  if (!actions) return
  if (Array.isArray(actions)) {
    for (const actionName of actions) {
      await runRegisteredAction(actionName)
    }
    await nextTick()
    return
  }

  for (const [actionName, arg] of Object.entries(actions)) {
    if (Array.isArray(arg)) {
      await runRegisteredAction(actionName, ...arg)
    } else if (arg === undefined) {
      await runRegisteredAction(actionName)
    } else {
      await runRegisteredAction(actionName, arg)
    }
  }
  await nextTick()
}