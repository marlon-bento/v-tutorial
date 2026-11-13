<div align="center">

# 🎯 v-tutorial

**100% Interactive, Mobile-First (Bootstrap-Style) & Headless-Ready Guided Tours for Vue 3**

[![NPM Version](https://img.shields.io/npm/v/v-tutorial?color=42b883&label=npm)](https://www.npmjs.com/package/v-tutorial)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-success)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🌎 **English** | 🇧🇷 **[Leia em Português (Portuguese Version)](./README.pt-BR.md)**

</div>


<img width="1000" height="562" alt="v-tutorial" src="https://github.com/user-attachments/assets/ec106114-4da2-4358-9159-fde748cc29ff" />

---

## 📋 Table of Contents

1. [Why `v-tutorial`? (+ Comparison Table)](#1-why-v-tutorial)
2. [Modular Architecture](#2-modular-architecture)
3. [Installation & Quick Setup](#3-installation--quick-setup)
4. [Step Modes (`info`, `wait-click`, `optional-click`)](#4-step-modes-info-wait-click-optional-click)
5. [Bootstrap-Style Mobile-First Responsiveness (`xs` to `xxl`)](#5-bootstrap-style-mobile-first-responsiveness-xs-to-xxl)
6. [Declarative Usage (`<TutorialProvider>` + `<VTutorialStep>`)](#6-declarative-usage-tutorialprovider--vtutorialstep)
7. [Connecting Remote Components (`registerAction` & `v-tutorial`)](#7-connecting-remote-components-registeraction--v-tutorial)
8. [Styling, Dark Mode & CSS Variables](#8-styling-dark-mode--css-variables)
9. [Headless UI Mode & Scoped Slots](#9-headless-ui-mode--scoped-slots)
10. [Complete API Reference](#10-complete-api-reference)

---

## 1. Why `v-tutorial`?

Most guided tour libraries (`Driver.js`, `Shepherd.js`, `Intro.js`) were built for static websites or passive `"Next -> Next -> Finish"` reading flows. When used inside modern **Vue 3 SPAs** with dynamic routes, `Teleport` modals, and distinct Mobile/Desktop DOM trees, they break `z-index` stacking contexts, cover mandatory buttons on mobile screens, and fail when a user clicks **"Previous"**.

| Feature | `v-tutorial` | Driver.js | Shepherd.js | Intro.js |
| :--- | :---: | :---: | :---: | :---: |
| **4-Shield Real Click (`wait-click`)** *(No `z-index` hacks)* | ✅ | ❌ | ❌ | ❌ |
| **Bootstrap-Style Mobile-First Breakpoints (`xs`..`xxl`)** | ✅ | ❌ | ❌ | ❌ |
| **Anti-Collision Mobile Sheets (`bottom-sheet` / `top-sheet`)** | ✅ | ❌ | ❌ | ❌ |
| **Declarative Vue Router Rollback (`route` / `rollback-route`)** | ✅ | ❌ | ❌ | ❌ |
| **Remote Component State Rollback (`registerAction`)** | ✅ | ❌ | ❌ | ❌ |
| **Declarative `<VTutorialStep>` Template API + Slots** | ✅ | ❌ | ❌ | ❌ |
| **Headless UI Mode (`:unstyled="true"` + 8 Scoped Slots)** | ✅ | ❌ | ⚠️ Partial | ❌ |
| **External Dependencies** | **0** | 0 | Floating UI | 0 |

### Core Highlights

* 🛡️ **4-Shield Click Architecture (`wait-click`):** Instead of cloning DOM nodes or hacking `z-index`, `v-tutorial` surrounds the target element with 4 invisible click shields. The rest of the screen is blocked while **your real button remains 100% interactive** in its native DOM context.
* 📱 **Bootstrap-Style Mobile-First Cascade (`xs` -> `sm` -> `md` -> `lg` -> `xl` -> `xxl`):** Define base props for mobile (`xs`) and override `target`, `placement`, `enterActions`, or `disabled` at any breakpoint (`md`, `lg`, etc.). Rules cascade upward automatically just like Bootstrap's grid.
* 🧲 **Anti-Collision Mobile Sheets (`bottom-sheet` & `top-sheet`):** On mobile viewports, floating cards automatically dock as a clean bottom or top sheet. If a sheet would overlap the highlighted button, the anti-collision engine automatically flips it to the opposite free side.
* ⏪ **Declarative State & Route Rollback:** If Step 2 opens a sidebar, Step 3 navigates to `/report`, and the user clicks **"Previous"**, `v-tutorial` automatically rolls back the route and UI state (`rollback-route`, `:rollback-actions`).
* ⚡ **0% Idle CPU Tracking:** Uses `ResizeObserver` + short `requestAnimationFrame` bursts only during CSS transitions (`transitionrun`), dropping to 0% CPU usage once the layout settles.

---

## 2. Modular Architecture

The library is split into focused, single-responsibility modules inside `src/`:

| File | Responsibility |
| :--- | :--- |
| `types.ts` | TypeScript interfaces for steps, responsive breakpoints, action maps, and contexts. |
| `responsive.ts` | Bootstrap 5 breakpoint detection (`xs` to `xxl`) and Mobile-First property cascading. |
| `domResolver.ts` | Visible DOM element resolution, multi-target bounding box calculation, and smooth auto-scrolling. |
| `positioning.ts` | Card & caret arrow coordinate math, auto-flipping, and mobile sheet anti-collision engine. |
| `useTutorial.ts` | Reactive state machine, step queue, registered actions, and global click capture. |
| `TutorialProvider.vue` | Root visual/Headless provider rendering shields, spotlight ring, arrow, and card slots. |
| `TutorialStep.vue` | Declarative `<VTutorialStep>` component with slot teleportation and reactive prop syncing. |

---

## 3. Installation & Quick Setup

Install the package via NPM, PNPM, or Yarn:

```bash
npm install v-tutorial
```

Register `TutorialPlugin` and import the stylesheet in your `main.ts`:

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
  storageKey: 'my-app-tutorial-completed',
  autoScroll: true,
  scrollBehavior: 'smooth',
  spotlightPadding: 6,
  cardWidth: 370,
  showArrow: true,
  mobileSheetOnAuto: true,
  router, // Optional: Enables declarative route="" and rollback-route="" on steps
})

app.mount('#app')
```

---

## 4. Step Modes (`info`, `wait-click`, `optional-click`)

| Mode | "Next" Button | Clicking Target Element | Best Use Case |
| :--- | :---: | :---: | :--- |
| `'info'` *(default)* | **Visible** | Optional (does not auto-advance) | Welcome screens, general explanations, or panel overviews. |
| `'wait-click'` | **Hidden** *(shows "Waiting click...")* | **Required to advance** | Hands-on training where the user **must click the real button** (e.g., opening a menu or system). |
| `'optional-click'` | **Visible** | **Also advances the step** | When the user can either test the button (e.g., pin a favorite) or click "Next" to skip. |

---

## 5. Bootstrap-Style Mobile-First Responsiveness (`xs` to `xxl`)

Just like Bootstrap 5, `v-tutorial` is **Mobile-First**. Base props on `<VTutorialStep>` apply from `xs` (`0px`) upward, and any breakpoint override cascades to larger screens until overridden again:

| Breakpoint | Default Min-Width | Shorthand Props |
| :--- | :---: | :--- |
| `xs` *(base)* | `0px` | `target`, `placement` |
| `sm` | `576px` | `target-sm`, `placement-sm` |
| `md` | `768px` | `target-md`, `placement-md` |
| `lg` | `992px` | `target-lg`, `placement-lg` |
| `xl` | `1200px` | `target-xl`, `placement-xl` |
| `xxl` | `1400px` | `target-xxl`, `placement-xxl` |

### 5.1. Using Shorthand Responsive Props (`target-md`, `placement-md`)
If your app renders `.mobile-system-link` on phones (`xs`/`sm`) and `.desktop-system-link` on desktops (`md` and up):

```vue
<VTutorialStep
  id="select-system"
  target=".mobile-system-link"
  target-md=".desktop-system-link"
  placement="bottom-sheet"
  placement-md="right"
  title="Open a System"
  mode="wait-click"
>
  <p class="mb-0">Click on the highlighted system to open it.</p>
</VTutorialStep>
```

### 5.2. Mobile-Only or Desktop-Only Steps (`disabled: true` per Breakpoint)
Want a step that teaches mobile users how to pull open the mobile drawer (`.mobile-drawer-tab`), but automatically skips itself on desktop (`md` and up)? Use the `:breakpoints` prop:

```vue
<!-- Runs on xs and sm (< 768px), automatically skipped on md, lg, xl, xxl (>= 768px) -->
<VTutorialStep
  id="open-mobile-drawer"
  target=".mobile-drawer-tab"
  placement="bottom-sheet"
  title="Mobile Menu Tab"
  mode="wait-click"
  :breakpoints="{
    md: { disabled: true }
  }"
>
  <p class="mb-0">Tap the side pull-tab to open the mobile menu.</p>
</VTutorialStep>
```

---

## 6. Declarative Usage (`<TutorialProvider>` + `<VTutorialStep>`)

Build complete multi-route interactive onboarding flows directly in your template:

```vue
<template>
  <TutorialProvider :auto-start="true">
    <VTutorialStep
      id="welcome"
      title="Welcome!"
      mode="info"
      placement="center"
      route="/"
      :enter-actions="{ closeThemeModal: true, closeUserMenu: true, setSidebarExpanded: false }"
    >
      <p class="mb-0">This training is <strong>100% interactive</strong>.</p>
    </VTutorialStep>

    <VTutorialStep
      id="click-report"
      target=".report-link"
      placement="bottom-sheet"
      placement-md="right"
      title="Report an Issue"
      mode="wait-click"
      rollback-route="/"
      :enter-actions="{ setSidebarExpanded: true, openUserMenu: true }"
      :rollback-actions="{ setSidebarExpanded: true, openUserMenu: true }"
    >
      <p class="mb-0">Click on <strong>"Report issue or suggestion"</strong>.</p>
    </VTutorialStep>
  </TutorialProvider>
</template>
```

---

## 7. Connecting Remote Components (`registerAction` & `v-tutorial`)

### 7.1. Exposing Component State (`registerAction`)
Any component can register actions that steps can trigger via `enterActions`, `rollbackActions`, or `leaveActions`:

```ts
// Inside UserInfo.vue
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

### 7.2. Restarting the Tutorial from a Settings Modal
Call `restartTutorial()` from any component to clear the completion flag in `localStorage` and immediately launch Step 1:

```ts
import { useTutorial } from 'v-tutorial'

const { restartTutorial } = useTutorial()

async function handleRestartClick() {
  closeSettingsModal()
  await restartTutorial()
}
```

---

## 8. Styling, Dark Mode & CSS Variables

`v-tutorial` inherits **Tabler / Bootstrap** variables (`--tblr-primary`, `--tblr-bg-surface`) automatically and adapts to Dark Mode (`[data-bs-theme="dark"]` or `.dark`). Override `--v-tutorial-*` variables to customize:

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

## 9. Headless UI Mode & Scoped Slots

Set `:unstyled="true"` or override any Scoped Slot on `<TutorialProvider>` (`#card`, `#header`, `#body`, `#hint`, `#progress`, `#footer`, `#exit-button`, `#spotlight`):

```vue
<TutorialProvider>
  <template #card="{ step, stepIndex, totalSteps, activeBreakpoint, nextStep, prevStep, endTutorial }">
    <div class="custom-card p-4">
      <small>Breakpoint: {{ activeBreakpoint }} | Step {{ stepIndex + 1 }}/{{ totalSteps }}</small>
      <h4>{{ step?.title }}</h4>
      <div v-html="step?.content"></div>
      <button v-if="stepIndex > 0" @click="prevStep">Back</button>
      <button v-if="step?.mode !== 'wait-click'" @click="nextStep">Next</button>
      <button @click="endTutorial(true)">Skip</button>
    </div>
  </template>
</TutorialProvider>
```

---

## 10. Complete API Reference

### `<VTutorialStep>` Props / `TutorialStep` Properties

| Property | Type | Default | Description |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Auto-generated | Unique step identifier. |
| `target` | `string \| string[]` | `undefined` | Base (`xs`) selector, `v-tutorial` ID, or array of selectors. |
| `targetSm`..`targetXxl` | `string \| string[]` | `undefined` | Mobile-First target overrides for `sm`, `md`, `lg`, `xl`, `xxl`. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'left' \| 'right' \| 'center' \| 'bottom-sheet' \| 'top-sheet'` | `'auto'` | Base (`xs`) card placement with automatic collision prevention. |
| `placementSm`..`placementXxl` | `TutorialPlacement` | `undefined` | Mobile-First placement overrides for `sm`, `md`, `lg`, `xl`, `xxl`. |
| `breakpoints` | `Partial<Record<TutorialBreakpointName, TutorialStepResponsiveOverride>>` | `undefined` | Full Mobile-First override object per breakpoint (`disabled`, `enterActions`, `title`, etc.). |
| `disabled` | `boolean` | `false` | Skips this step when `true` in the active breakpoint. |
| `title` | `string` | **Required** | Step header title. |
| `mode` | `'info' \| 'wait-click' \| 'optional-click'` | `'info'` | Step interaction behavior. |
| `hintText` | `string` | `undefined` | Text shown in the pulsing interactive banner. |
| `route` | `string` | `undefined` | Navigates to this route before entering the step. |
| `rollbackRoute` | `string` | `undefined` | Navigates to this route when returning via "Previous". |
| `enterActions` | `Record<string, any> \| string[]` | `undefined` | Registered actions executed when entering the step. |
| `rollbackActions` | `Record<string, any> \| string[]` | `undefined` | Registered actions executed when returning via "Previous". |
| `leaveActions` | `Record<string, any> \| string[]` | `undefined` | Registered actions executed when leaving the step. |
| `afterClickDelay` | `number` | `280` | Delay in `ms` after clicking the target before advancing. |
| `preventNativeClick` | `boolean` | `false` | Blocks the native click handler of the target during the tour. |

### `useTutorial()` Return Values

| Property / Method | Type | Description |
| :--- | :--- | :--- |
| `isActive` | `Ref<boolean>` | Whether the tutorial is currently running. |
| `activeBreakpoint` | `ComputedRef<'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl'>` | Current Bootstrap-style breakpoint name. |
| `isMobileViewport` | `ComputedRef<boolean>` | `true` when viewport width is below `md` (`< 768px`). |
| `currentStep` | `ComputedRef<TutorialStep \| null>` | Active step resolved for the current breakpoint. |
| `currentStepIndex` | `Ref<number>` | 0-based index of the active step. |
| `totalSteps` | `ComputedRef<number>` | Total enabled steps for the current breakpoint. |
| `progress` | `ComputedRef<number>` | Completion percentage (`0` to `100`). |
| `startTutorial(steps?, force?)` | `Promise<void>` | Starts the tour (`force = true` ignores `localStorage`). |
| `restartTutorial()` | `Promise<void>` | Clears `localStorage` flag and restarts from Step 1. |
| `nextStep()` / `prevStep()` | `Promise<void>` | Navigates forward or backward (with automatic rollback). |
| `goToStep(indexOrId)` | `Promise<void>` | Jumps directly to a specific step index or `id`. |
| `endTutorial(markCompleted?)` | `void` | Closes the tutorial immediately. |
| `registerAction(name, fn)` | `void` | Registers a named action callable by any step. |
| `onFinish` / `onStop` / `onStepChange` | `(cb) => () => void` | Lifecycle event listeners (auto-disposed on component unmount). |

---

## 📄 License

Distributed under the **MIT License**. Created by [Márlon Bento Azevedo](https://github.com/marlon-bento).
