<div align="center">

# 🎯 v-tutorial

**Tours Guiados e Treinamento 100% Interativo, Mobile-First (Estilo Bootstrap) e Headless-Ready para Vue 3**

[![NPM Version](https://img.shields.io/npm/v/v-tutorial?color=42b883&label=npm)](https://www.npmjs.com/package/v-tutorial)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependências-Zero-success)](#)
[![License: MIT](https://img.shields.io/badge/Licença-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🇧🇷 **Português** | 🌎 **[Read in English (English Version)](./README.md)**

</div>

---

## 📋 Sumário

1. [Por que usar o `v-tutorial`? (+ Tabela Comparativa)](#1-por-que-usar-o-v-tutorial)
2. [Arquitetura Modular](#2-arquitetura-modular)
3. [Instalação e Configuração Rápida](#3-instalação-e-configuração-rápida)
4. [Modos de Passo (`info`, `wait-click`, `optional-click`)](#4-modos-de-passo-info-wait-click-optional-click)
5. [Responsividade Mobile-First Estilo Bootstrap (`xs` até `xxl`)](#5-responsividade-mobile-first-estilo-bootstrap-xs-até-xxl)
6. [Uso Declarativo (`<TutorialProvider>` + `<VTutorialStep>`)](#6-uso-declarativo-tutorialprovider--vtutorialstep)
7. [Conectando Componentes Distintos (`registerAction` e `v-tutorial`)](#7-conectando-componentes-distintos-registeraction-e-v-tutorial)
8. [Customização Visual, Dark Mode e Variáveis CSS](#8-customização-visual-dark-mode-e-variáveis-css)
9. [Modo Headless UI e Scoped Slots](#9-modo-headless-ui-e-scoped-slots)
10. [Referência Completa da API](#10-referência-completa-da-api)

---

## 1. Por que usar o `v-tutorial`?

A maioria das bibliotecas de tour (`Driver.js`, `Shepherd.js`, `Intro.js`) foi pensada para sites estáticos ou fluxos passivos de leitura (`"Próximo -> Próximo -> Concluir"`). Quando colocadas dentro de uma **SPA moderna em Vue 3** com rotas dinâmicas, modais via `Teleport` e árvores DOM diferentes para Mobile e Desktop, elas quebram o `z-index` da aplicação, cobrem botões obrigatórios no celular e falham quando o usuário clica em **"Anterior"**.

| Recurso | `v-tutorial` | Driver.js | Shepherd.js | Intro.js |
| :--- | :---: | :---: | :---: | :---: |
| **Clique Real com 4 Escudos (`wait-click`)** *(Sem hack de `z-index`)* | ✅ | ❌ | ❌ | ❌ |
| **Breakpoints Mobile-First Estilo Bootstrap (`xs`..`xxl`)** | ✅ | ❌ | ❌ | ❌ |
| **Gavetas Mobile Anti-Colisão (`bottom-sheet` / `top-sheet`)** | ✅ | ❌ | ❌ | ❌ |
| **Rollback Declarativo de Rotas (`route` / `rollback-route`)** | ✅ | ❌ | ❌ | ❌ |
| **Rollback de Estado entre Componentes (`registerAction`)** | ✅ | ❌ | ❌ | ❌ |
| **API Declarativa `<VTutorialStep>` no Template + Slots** | ✅ | ❌ | ❌ | ❌ |
| **Modo Headless UI (`:unstyled="true"` + 8 Scoped Slots)** | ✅ | ❌ | ⚠️ Parcial | ❌ |
| **Dependências Externas** | **0** | 0 | Floating UI | 0 |

### Principais Diferenciais

* 🛡️ **Arquitetura de 4 Escudos de Clique (`wait-click`):** Em vez de clonar nós do DOM ou forçar `z-index`, o `v-tutorial` posiciona 4 escudos invisíveis ao redor do elemento destacado. O restante da tela fica bloqueado, mas **o botão real do seu sistema permanece 100% clicável** no lugar original.
* 📱 **Cascata Mobile-First Estilo Bootstrap (`xs` -> `sm` -> `md` -> `lg` -> `xl` -> `xxl`):** Defina o comportamento base para celular (`xs`) e sobrescreva `target`, `placement`, `enterActions` ou `disabled` a partir de qualquer breakpoint (`md`, `lg`, etc.). As regras cascateiam para telas maiores exatamente como no Bootstrap.
* 🧲 **Gavetas Mobile com Sistema Anti-Colisão (`bottom-sheet` e `top-sheet`):** Em telas móveis, o card ancora como uma gaveta inferior ou superior. Se o motor detectar que o card cobriria o botão destacado, ele inverte automaticamente a posição para o lado livre.
* ⏪ **Rollback Declarativo de Rotas e Estados:** Se o Passo 2 abre o menu lateral, o Passo 3 navega para `/report` e o usuário clica em **"Anterior"**, o `v-tutorial` desfaz a rota e o estado visual automaticamente (`rollback-route`, `:rollback-actions`).
* ⚡ **0% de CPU em Repouso:** Utiliza `ResizeObserver` combinado com janelas curtas de `requestAnimationFrame` apenas durante transições CSS (`transitionrun`), desligando o loop assim que a tela estabiliza.

---

## 2. Arquitetura Modular

O motor interno em `src/` é dividido em módulos independentes com responsabilidade única:

| Arquivo | Responsabilidade |
| :--- | :--- |
| `types.ts` | Contratos TypeScript de passos, breakpoints responsivos, mapas de ações e contextos. |
| `responsive.ts` | Detecção dos breakpoints do Bootstrap 5 (`xs` até `xxl`) e herança em cascata Mobile-First. |
| `domResolver.ts` | Busca de elementos visíveis no DOM, cálculo de `DOMRect` agrupado e auto-scroll suave. |
| `positioning.ts` | Matemática geométrica do card e da seta (`arrowStyle`), auto-flip e sistema anti-colisão mobile. |
| `useTutorial.ts` | Máquina de estados reativa, fila de passos, ações registradas e captura global de clique. |
| `TutorialProvider.vue` | Provedor visual/Headless que renderiza os escudos, anel de spotlight, seta e Scoped Slots. |
| `TutorialStep.vue` | Componente declarativo `<VTutorialStep>` com teleporte de slot e sincronização reativa. |

---

## 3. Instalação e Configuração Rápida

Instale o pacote via NPM, PNPM ou Yarn:

```bash
npm install v-tutorial
```

No arquivo `main.ts`, registre o `TutorialPlugin` e importe o CSS da biblioteca:

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { TutorialPlugin } from 'v-tutorial'
import 'v-tutorial/style.css'

const app = createApp(App)

app.use(router)
app.use(TutorialPlugin, {
  storageKey: 'meu-app-tutorial-concluido',
  autoScroll: true,
  scrollBehavior: 'smooth',
  spotlightPadding: 6,
  cardWidth: 370,
  showArrow: true,
  mobileSheetOnAuto: true,
  router, // Opcional: Habilita o funcionamento automático de route="" e rollback-route="" nos passos
})

app.mount('#app')
```

---

## 4. Modos de Passo (`info`, `wait-click`, `optional-click`)

| Modo | Botão "Próximo" | Clique no Elemento Alvo | Caso de Uso Ideal |
| :--- | :---: | :---: | :--- |
| `'info'` *(padrão)* | **Visível** | Opcional (não avança sozinho) | Telas de boas-vindas, explicações gerais ou visão de painéis. |
| `'wait-click'` | **Oculto** *(exibe "Aguardando clique...")* | **Obrigatório para avançar** | Treinamento prático onde o usuário **precisa clicar no botão real** (ex: abrir menu, abrir sistema). |
| `'optional-click'` | **Visível** | **Também avança o passo** | Quando o usuário pode testar o clique no botão (ex: fixar favorito) ou clicar em "Próximo". |

---

## 5. Responsividade Mobile-First Estilo Bootstrap (`xs` até `xxl`)

Assim como no Bootstrap 5, o `v-tutorial` segue a filosofia **Mobile-First**. As propriedades base definidas no `<VTutorialStep>` valem a partir de `xs` (`0px`) para cima, e qualquer propriedade definida em um breakpoint maior herda para os seguintes até ser sobrescrita:

| Breakpoint | Largura Mínima Padrão | Props de Atalho Direto |
| :--- | :---: | :--- |
| `xs` *(base)* | `0px` | `target`, `placement` |
| `sm` | `576px` | `target-sm`, `placement-sm` |
| `md` | `768px` | `target-md`, `placement-md` |
| `lg` | `992px` | `target-lg`, `placement-lg` |
| `xl` | `1200px` | `target-xl`, `placement-xl` |
| `xxl` | `1400px` | `target-xxl`, `placement-xxl` |

### 5.1. Usando Atalhos Diretos nas Props (`target-md`, `placement-md`)
Se no celular (`xs` e `sm`) o item do menu usa a classe `.mobile-system-link` e no computador (`md` em diante) usa `.sistema-item-row a.button`:

```vue
<VTutorialStep
  id="selecionar-sistema"
  target=".mobile-system-link"
  target-md=".sistema-item-row a.button"
  placement="bottom-sheet"
  placement-md="right"
  title="Abra um Sistema Técnico"
  mode="wait-click"
>
  <p class="mb-0">Clique no primeiro sistema destacado para abri-lo.</p>
</VTutorialStep>
```

### 5.2. Passos Exclusivos de Mobile ou Desktop (`disabled: true` por Breakpoint)
Quer criar um passo que ensina o usuário do celular a abrir a aba deslizante `.super-slim-slider`, mas que seja pulado automaticamente em telas `md` (`>= 768px`)? Basta usar `:breakpoints`:

```vue
<!-- Executa em xs e sm (< 768px) e é desabilitado automaticamente em md, lg, xl e xxl (>= 768px) -->
<VTutorialStep
  id="abrir-gaveta-mobile"
  target=".super-slim-slider"
  placement="bottom-sheet"
  title="Menu Lateral no Celular"
  mode="wait-click"
  :breakpoints="{
    md: { disabled: true }
  }"
>
  <p class="mb-0">Toque na aba destacada para abrir a lista de sistemas.</p>
</VTutorialStep>
```

---

## 6. Uso Declarativo (`<TutorialProvider>` + `<VTutorialStep>`)

Para manter a arquitetura limpa, deixe o componente `.vue` focado na declaração dos passos e isole os mapas de ações em um composable dedicado:

```vue
<template>
  <TutorialProvider>
    <VTutorialStep
      id="boas-vindas"
      title="Bem-vindo!"
      mode="info"
      placement="center"
      route="/"
      :enter-actions="acoesBoasVindasBase"
      :breakpoints="acoesBoasVindasDesktop"
    >
      <p class="mb-0">Este tutorial é <strong>100% interativo</strong>.</p>
    </VTutorialStep>

    <VTutorialStep
      id="clicar-reportar"
      target=".report-link"
      placement="bottom-sheet"
      placement-md="right"
      title="Reportar Erro ou Sugestão"
      mode="wait-click"
      rollback-route="/"
      :enter-actions="acoesAbrirMenuUsuario"
      :rollback-actions="acoesAbrirMenuUsuario"
    >
      <p class="mb-0">Clique na opção <strong>"Reportar erro ou sugestão"</strong>.</p>
    </VTutorialStep>
  </TutorialProvider>
</template>
```

---

## 7. Conectando Componentes Distintos (`registerAction` e `v-tutorial`)

### 7.1. Expondo Ações de Estado (`registerAction`)
Qualquer componente pode registrar ações globais que os passos acionam via `enterActions`, `rollbackActions` ou `leaveActions`:

```ts
// Dentro de UserInfo.vue
import { useTutorial } from 'v-tutorial'

const { registerAction } = useTutorial()

registerAction('openUserMenu', () => {
  if (isMobile.value) {
    isOpen.value = true
  } else {
    isDesktopModalOpen.value = true
  }
})

registerAction('closeUserMenu', () => {
  isOpen.value = false
  isDesktopModalOpen.value = false
})
```

### 7.2. Botão de Reiniciar Tutorial no Modal de Configurações
Chame `restartTutorial()` de qualquer lugar para limpar o `localStorage` e reiniciar o treinamento imediatamente a partir do Passo 1:

```ts
import { useTutorial } from 'v-tutorial'

const { restartTutorial } = useTutorial()

async function reiniciarTreinamentoSistema() {
  emit('fecharModal')
  await restartTutorial()
}
```

---

## 8. Customização Visual, Dark Mode e Variáveis CSS

O `v-tutorial` herda variáveis do **Tabler / Bootstrap** (`--tblr-primary`, `--tblr-bg-surface`) automaticamente e adapta-se ao modo escuro (`[data-bs-theme="dark"]` ou `.dark`). Para customizar em qualquer projeto:

```css
:root {
  --v-tutorial-primary: #10b981;
  --v-tutorial-bg: #ffffff;
  --v-tutorial-bg-secondary: #f8fafc;
  --v-tutorial-text: #0f172a;
  --v-tutorial-muted: #64748b;
  --v-tutorial-border: rgba(15, 23, 42, 0.12);
  --v-tutorial-danger: #ef4444;
  --v-tutorial-backdrop: rgba(10, 14, 23, 0.72);
  --v-tutorial-radius: 16px;
  --v-tutorial-z-index: 10040;
}
```

---

## 9. Modo Headless UI e Scoped Slots

Ative `:unstyled="true"` ou substitua qualquer Scoped Slot no `<TutorialProvider>` (`#card`, `#header`, `#body`, `#hint`, `#progress`, `#footer`, `#exit-button`, `#spotlight`):

```vue
<TutorialProvider>
  <template #card="{ step, stepIndex, totalSteps, activeBreakpoint, nextStep, prevStep, endTutorial }">
    <div class="meu-card-customizado p-4">
      <small>Breakpoint: {{ activeBreakpoint }} | Passo {{ stepIndex + 1 }}/{{ totalSteps }}</small>
      <h4>{{ step?.title }}</h4>
      <div v-html="step?.content"></div>
      <button v-if="stepIndex > 0" @click="prevStep">Anterior</button>
      <button v-if="step?.mode !== 'wait-click'" @click="nextStep">Próximo</button>
      <button @click="endTutorial(true)">Pular</button>
    </div>
  </template>
</TutorialProvider>
```

---

## 10. Referência Completa da API

### Props de `<VTutorialStep>` / Interface `TutorialStep`

| Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Auto-gerado | Identificador único do passo. |
| `target` | `string \| string[]` | `undefined` | Seletor CSS base (`xs`), ID do `v-tutorial` ou array de seletores. |
| `targetSm`..`targetXxl` | `string \| string[]` | `undefined` | Sobrescrita Mobile-First do alvo para `sm`, `md`, `lg`, `xl`, `xxl`. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'left' \| 'right' \| 'center' \| 'bottom-sheet' \| 'top-sheet'` | `'auto'` | Posicionamento base (`xs`) com prevenção automática de colisão. |
| `placementSm`..`placementXxl` | `TutorialPlacement` | `undefined` | Sobrescrita Mobile-First do posicionamento para `sm`, `md`, `lg`, `xl`, `xxl`. |
| `breakpoints` | `Partial<Record<TutorialBreakpointName, TutorialStepResponsiveOverride>>` | `undefined` | Objeto completo de sobrescrita Mobile-First por breakpoint (`disabled`, `enterActions`, `title`, etc.). |
| `disabled` | `boolean` | `false` | Ignora/pula o passo automaticamente se for `true` no breakpoint ativo. |
| `title` | `string` | **Obrigatório** | Título exibido no cabeçalho do card. |
| `mode` | `'info' \| 'wait-click' \| 'optional-click'` | `'info'` | Define o comportamento de avanço do passo. |
| `hintText` | `string` | `undefined` | Frase exibida na faixa pulsante de ação interativa. |
| `route` | `string` | `undefined` | Navega automaticamente para esta rota ao entrar no passo. |
| `rollbackRoute` | `string` | `undefined` | Rota para a qual retorna ao clicar em "Anterior". |
| `enterActions` | `Record<string, any> \| string[]` | `undefined` | Mapa de ações registradas executadas ao entrar no passo. |
| `rollbackActions` | `Record<string, any> \| string[]` | `undefined` | Mapa de ações registradas executadas ao voltar ("Anterior") para o passo. |
| `leaveActions` | `Record<string, any> \| string[]` | `undefined` | Mapa de ações registradas executadas ao sair do passo. |
| `afterClickDelay` | `number` | `280` | Tempo em `ms` após o clique no elemento antes de avançar. |
| `preventNativeClick` | `boolean` | `false` | Bloqueia a ação original do botão clicado durante o tutorial. |

### Retorno do Composable `useTutorial()`

| Propriedade / Método | Tipo | Descrição |
| :--- | :--- | :--- |
| `isActive` | `Ref<boolean>` | Indica se o tutorial está ativo no momento. |
| `activeBreakpoint` | `ComputedRef<'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl'>` | Nome do breakpoint Bootstrap ativo na janela atual. |
| `isMobileViewport` | `ComputedRef<boolean>` | `true` quando a largura da janela é menor que `md` (`< 768px`). |
| `currentStep` | `ComputedRef<TutorialStep \| null>` | Objeto do passo atual já resolvido para o breakpoint ativo. |
| `currentStepIndex` | `Ref<number>` | Índice numérico (base 0) do passo atual. |
| `totalSteps` | `ComputedRef<number>` | Quantidade total de passos habilitados no breakpoint atual. |
| `progress` | `ComputedRef<number>` | Porcentagem de conclusão (`0` a `100`). |
| `startTutorial(steps?, force?)` | `Promise<void>` | Inicia o tutorial (`force = true` ignora o `localStorage`). |
| `restartTutorial()` | `Promise<void>` | Limpa a flag do `localStorage` e reinicia imediatamente do Passo 1. |
| `nextStep()` / `prevStep()` | `Promise<void>` | Avança ou retorna um passo (acionando o rollback automaticamente). |
| `goToStep(indexOrId)` | `Promise<void>` | Pula diretamente para um passo pelo índice ou pelo `id`. |
| `endTutorial(markCompleted?)` | `void` | Fecha o tutorial imediatamente. |
| `registerAction(name, fn)` | `void` | Registra uma função nomeada que pode ser chamada pelos passos. |
| `onFinish` / `onStop` / `onStepChange` | `(cb) => () => void` | Listeners de ciclo de vida (limpos automaticamente no `onUnmounted`). |

---

## 📄 Licença

Distribuído sob a **Licença MIT**. Desenvolvido por [Márlon Bento Azevedo](https://github.com/marlon-bento).