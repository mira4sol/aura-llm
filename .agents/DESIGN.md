---
name: Aura OS
colors:
  surface: '#13121c'
  surface-dim: '#13121c'
  surface-bright: '#393843'
  surface-container-lowest: '#0d0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#292933'
  surface-container-highest: '#34343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#cac3d8'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f3a'
  outline: '#948ea1'
  outline-variant: '#494455'
  surface-tint: '#cdbdff'
  primary: '#cdbdff'
  on-primary: '#370095'
  primary-container: '#6c3ce9'
  on-primary-container: '#e4daff'
  inverse-primary: '#6836e5'
  secondary: '#dcfdff'
  on-secondary: '#00373a'
  secondary-container: '#00f1fd'
  on-secondary-container: '#006a6f'
  tertiary: '#d0bcff'
  on-tertiary: '#3c0091'
  tertiary-container: '#7240db'
  on-tertiary-container: '#e6d9ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e8deff'
  primary-fixed-dim: '#cdbdff'
  on-primary-fixed: '#20005f'
  on-primary-fixed-variant: '#4f07cd'
  secondary-fixed: '#6ff6ff'
  secondary-fixed-dim: '#00dce6'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#13121c'
  on-background: '#e4e1ee'
  surface-variant: '#34343e'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-ui:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system embodies an intelligent, hyper-responsive, and local-first personal productivity OS. Designed for power users, technologists, and privacy-conscious executives who require zero-latency machine intelligence directly on their hardware, the aesthetic bridges cyber-luminescence with calm, tactile utility.

The core visual style is **Glassmorphism fused with Deep Cyber-Minimalism**:
- **Atmospheric Void:** True deep midnight canvas (#07070D) eliminates OLED power draw and creates limitless depth.
- **Nebula Radiance:** Concentrated gradients of violet, electric cyan, and neon sapphire illuminate actionable components, conveying computational power and ambient life.
- **Tactile Precision:** Frosted glass panels, razor-thin luminous inner rims, and pill-shaped interactive targets invoke the feel of physical, high-precision instrumentation embedded within hardware.
- **Telemetry Transparency:** Offline hardware metrics (RAM, context window, model weights, local tokens/sec) are displayed with technical elegance, reinforcing the sovereignty of offline computation.

## Colors

The palette is engineered exclusively for an immersive dark mode experience on high-density OLED and Super Retina displays. 

- **Primary (`#6C3CE9`) & Tertiary (`#8B5CF6`):** Nebula Violet and Cosmic Iris symbolize internal synthesis, cognitive workflows, and neural inference. They serve as primary fills for elevated triggers, gradient blends, and primary actions.
- **Secondary (`#00F2FE`):** Electric Cyan represents active connection, live local processing states, voice input waveforms, and telemetry confirmation.
- **Neutral (`#0B0B14`):** Obsidian Void forms the foundation for card backdrops and nested surfaces, layered above the `#07070D` canvas.
- **Surface Elevation Layers:**
  - Base Canvas: `#07070D`
  - Glass Surface (Default): `rgba(17, 17, 30, 0.65)` with `backdrop-filter: blur(24px)`
  - Active Surface / Card: `rgba(28, 26, 48, 0.55)` with `backdrop-filter: blur(32px)`
  - Elevated Surface: `rgba(40, 36, 68, 0.70)`
- **Luminescent Accent Borders:** Linear gradient borders transitioning from `rgba(0, 242, 254, 0.35)` to `rgba(108, 60, 233, 0.20)` down to `transparent`.
- **Content Hierarchy:**
  - High Contrast (Headings, primary text): `#FFFFFF`
  - Medium Contrast (Body, secondary labels): `rgba(255, 255, 255, 0.72)`
  - Muted (Metadata, prompt hints, telemetry keys): `rgba(255, 255, 255, 0.44)`
  - Disabled / Hairline rules: `rgba(255, 255, 255, 0.08)`

## Typography

The typographic hierarchy harmonizes fluid, modern humanist geometry with developer-grade telemetry precision.

- **Primary Hierarchy (`Plus Jakarta Sans`):** Delivers clean geometry with subtle warmth, ensuring long-form conversational synthesis and executive task tracking remain legible at small scales. Display weights leverage tighter tracking for maximum impact against ambient visual blurs.
- **Instrumentation & Telemetry (`JetBrains Mono`):** Applied exclusively for hardware diagnostics, inference rate (`tk/s`), RAM allocation, timestamping, model versioning, and tabular metrics. The monospaced rhythm creates an anchor of deterministic computational performance amidst fluid gradient backgrounds.

## Layout & Spacing

A native mobile-first, edge-to-edge layout framework tailored for iOS Dynamic Island and Android system insets.

- **Grid Architecture:** 
  - Mobile employs a 4-column fluid grid system with `1.25rem` (`20px`) outer safe-area margins and `1rem` (`16px`) gutters.
  - Large devices (Foldables/Tablets) expand to a 6-column to 12-column layout with fixed max-width content vessels (`680px` for conversational assistant feeds; `960px` for multi-pane productivity hubs).
- **Rhythm & Safe Insets:**
  - Top safe margins clear status bars by at least `space-lg` (`24px`).
  - Bottom command bars float decoupled above the home indicator, maintaining `1rem` clearance plus standard OS inset.
- **Component Padding Standards:**
  - High-density telemetry badges: `0.25rem` vertical by `0.5rem` horizontal.
  - Interactive pill inputs and conversational prompts: `0.75rem` vertical by `1.25rem` horizontal.
  - Insight and context cards: `1.25rem` comprehensive internal padding.

## Elevation & Depth

Visual hierarchy does not use traditional black drop shadows; instead, it utilizes **translucent glass layering, luminescent back-glows, and light refraction**:

- **Tier 0 (Backdrop Void):** Absolute `#07070D` canvas, occasionally enriched by radial focal glows (e.g., `#6C3CE9` at 15% opacity, `blur(120px)`) positioned behind primary active state hubs.
- **Tier 1 (Resting Glass Cards & Panels):** Layered with `rgba(14, 14, 25, 0.65)`, a `1px` continuous border of `rgba(255, 255, 255, 0.08)`, and backdrop blur of `24px`.
- **Tier 2 (Floating Action Pods & Active Cards):** Layered with `rgba(24, 22, 45, 0.75)`, backdrop blur of `32px`, accented with a directional stroke gradient (`rgba(0, 242, 254, 0.40)` at top-left to `rgba(108, 60, 233, 0.10)` at bottom-right). Ambient glow: `0px 12px 36px -4px rgba(108, 60, 233, 0.25)`.
- **Tier 3 (Modals, Overlays & Orb Hubs):** Floating glass sheets with subtle inner shadows (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)`) and peripheral corona diffusion (`0px 0px 48px 0px rgba(0, 242, 254, 0.18)`).

## Shapes

The design system embraces an ultra-modern **pill-shaped geometry (`roundedness: 3`)** that visually communicates seamless fluid intelligence and tactile comfort.

- **Primary Triggers, Floating Prompts, and Badges:** Fully rounded continuous pill radii (`9999px` or `2rem`+).
- **Cards and Structured Containers:** Styled with `rounded-xl` (`1.5rem` to `1.75rem`), pairing harmoniously with modern device display corner curves.
- **Inner Nested Elements:** Secondary chips or progress indicators within cards inherit proportional roundedness (`0.75rem` to `1rem`) to ensure uniform concentric rhythm.

## Components

### 1. Unified Command Prompt (Floating Input Pill)
- **Container:** Full pill shape floating `16px` above the bottom safe area. Filled with `rgba(15, 15, 28, 0.82)` with `backdrop-filter: blur(28px)`.
- **Stroke:** `1px` subtle gradient border shining brighter toward top center (`rgba(0, 242, 254, 0.35)` to `rgba(255, 255, 255, 0.06)`).
- **Actions:** Leading '+' action icon in a subdued circle; placeholder styled with `body-md` in `rgba(255, 255, 255, 0.44)`; trailing voice wave/mic icon encapsulated in an electric cyan or violet circular glow.

### 2. Buttons & CTAs
- **Primary Pill Action:** Linear gradient background from `#6C3CE9` through `#8B5CF6` to `#00F2FE`. Bold white typography (`label-ui`), with an inner luminous highlight and diffused ambient shadow (`0 8px 24px rgba(108, 60, 233, 0.4)`).
- **Secondary Ghost Pill:** Frosted `rgba(255, 255, 255, 0.06)` fill, hairline border `rgba(255, 255, 255, 0.14)`. Hover/press transitions into a soft cyan border glow.

### 3. Chips & Suggestion Bubbles
- Low-profile pill enclosures for one-tap agent prompts (e.g., "Plan my day", "Organize my tasks").
- Border: `1px solid rgba(255, 255, 255, 0.10)`.
- Fill: `rgba(20, 20, 35, 0.5)`.
- Icon + Text layout using `label-ui` with generous horizontal padding (`1rem`).

### 4. Hardware Telemetry & Model Stats Pill
- Ultra-compact diagnostic chip using `JetBrains Mono` (`label-telemetry-sm`).
- Displays offline indicators: `LOCAL • 4-BIT • 38 tk/s • 4.2GB RAM`.
- Status dot features a pulsing cyan/green neon corona reflecting zero network latency.

### 5. Glass Metric Cards & Analytics Panels
- Surface container with `rounded-xl` (`1.5rem`), translucent obsidian glass, and crisp inner top edge highlights.
- Metric highlights set in high-contrast sans-serif numbers flanked by subtle donut progress dials or bar charts accented in electric cyan, magenta, and nebula violet.

### 6. Voice & Orb Waveform Visualizer
- Dynamic conversational interface consisting of an illuminated, fluid central sphere (orb) rendered with layered radial blurs and rotating cyan/violet gradients.
- Responsive to vocal input and local processing states with reactive amplitude waves.