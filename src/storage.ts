/*
========
Módulo de persistência em localStorage e validação estrutural de passos (src/storage.ts).
Isola a leitura e gravação resiliente da flag de conclusão do tutorial e verifica
inconsistências de configuração em passos (como modo wait-click sem elemento alvo).
========
*/
import type { TutorialStep } from './types'

/*
Lê com segurança a flag de conclusão do tutorial no localStorage.
Recebe: chave (string da chave configurada no storageKey).
Devolve: booleano indicando se o tutorial já consta como concluído.
Por que é usada: Evita que bloqueios de cookies/storage em navegação anônima ou iframes quebrem a aplicação.
*/
export function lerStorageConcluido(chave: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(chave) === 'true'
  } catch (err) {
    console.warn(
      `[v-tutorial] Não foi possível ler a chave "${chave}" no localStorage. ` +
        `Verifique se o armazenamento do navegador está bloqueado. Detalhes:`,
      err
    )
    return false
  }
}

/*
Salva ou remove com segurança a flag de conclusão do tutorial no localStorage.
Recebe: chave (string da chave) e concluido (booleano indicando se deve salvar ou remover).
Devolve: void.
Por que é usada: Previne exceções QuotaExceededError ou SecurityError ao finalizar ou reiniciar o tutorial.
*/
export function atualizarStorageConcluido(chave: string, concluido: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (concluido) {
      localStorage.setItem(chave, 'true')
    } else {
      localStorage.removeItem(chave)
    }
  } catch (err) {
    console.warn(
      `[v-tutorial] Não foi possível atualizar a chave "${chave}" no localStorage. ` +
        `O progresso será mantido apenas em memória nesta sessão. Detalhes:`,
      err
    )
  }
}

/*
Valida a consistência estrutural de um passo antes de exibi-lo e emite avisos claros se houver erro de configuração.
Recebe: step (passo resolvido para o breakpoint atual a ser validado).
Devolve: void.
Por que é usada: Identifica imediatamente passos sem título, sem ID ou em modo wait-click sem elemento alvo clicável.
*/
export function validarConfiguracaoPasso(step: TutorialStep | undefined | null): void {
  if (!step) return

  if (!step.id || !String(step.id).trim()) {
    console.warn(
      '[v-tutorial] Um passo foi configurado sem a propriedade obrigatória "id". ' +
        'Defina um identificador único em cada passo para evitar falhas de navegação.'
    )
  }

  if (!step.title || !String(step.title).trim()) {
    console.warn(
      `[v-tutorial] Passo "${step.id || 'sem-id'}": a propriedade "title" está vazia. ` +
        `Informe um título descritivo para o cabeçalho do card.`
    )
  }

  const semTarget =
    !step.target ||
    (typeof step.target === 'string' && !step.target.trim()) ||
    (Array.isArray(step.target) && step.target.length === 0)

  if (step.mode === 'wait-click' && (semTarget || step.placement === 'center')) {
    console.warn(
      `[v-tutorial] Configuração inconsistente no passo "${step.id}" ("${step.title}"): ` +
        `o modo "wait-click" oculta o botão "Próximo" e exige que o usuário clique no elemento destacado, ` +
        `mas o passo está ${semTarget ? 'sem "target" definido' : 'com placement="center"'}. ` +
        `Defina um "target" válido ou altere o modo para "info".`
    )
  }
}