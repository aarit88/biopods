---
name: Synthetic Sentience
colors:
  surface: '#101319'
  surface-dim: '#101319'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353b'
  on-surface: '#e1e2ea'
  on-surface-variant: '#c6c6ca'
  inverse-surface: '#e1e2ea'
  inverse-on-surface: '#2d3037'
  outline: '#8f9195'
  outline-variant: '#45474a'
  surface-tint: '#c5c6cb'
  primary: '#c5c6cb'
  on-primary: '#2e3134'
  primary-container: '#05070a'
  on-primary-container: '#76787d'
  inverse-primary: '#5c5e63'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#00e639'
  on-tertiary: '#003907'
  tertiary-container: '#000900'
  on-tertiary-container: '#008c1f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e2e7'
  primary-fixed-dim: '#c5c6cb'
  on-primary-fixed: '#191c1f'
  on-primary-fixed-variant: '#44474b'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#72ff70'
  tertiary-fixed-dim: '#00e639'
  on-tertiary-fixed: '#002203'
  on-tertiary-fixed-variant: '#00530e'
  background: '#101319'
  on-background: '#e1e2ea'
  surface-variant: '#32353b'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  metric-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.04em
  body-m:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-mono:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  gutter: 16px
  panel-gap: 24px
---

## Brand & Style

This design system is built on the metaphor of a **Living Machine**—a fusion of advanced cybernetic infrastructure and biological neural efficiency. The brand personality is authoritative, predictive, and immersive, designed to make complex AI observability feel like peering into a high-functioning artificial organism.

The visual style utilizes **Cinematic Glassmorphism**. It departs from static, flat interfaces in favor of a multi-layered, holographic environment. Every element should feel as though it is projected in a three-dimensional space, with organic motion and reactive states that mimic a biological response to data stimuli. The goal is to evoke a sense of "technological awe" while maintaining the surgical precision required for deep-system monitoring.

## Colors

The palette is anchored in **Deep Space Black** and **Midnight Blue** to provide infinite depth, allowing the accent colors to appear as self-illuminating light sources. 

- **Primary Surfaces:** Use deep, desaturated tones to minimize eye fatigue and maximize the impact of holographic overlays.
- **Accents:** Use Electric Cyan for active AI states and Bio Green for system health. Ultraviolet Purple is reserved for background processing and machine learning heuristics.
- **Glows:** Every accent color must have a corresponding "bloom" or "neon" variant (low opacity, high blur) to simulate light emission on the dark background.

## Typography

The typographic hierarchy prioritizes technical legibility and futuristic aesthetics.

- **Headlines:** Use **Space Grotesk** for its geometric, avant-garde appearance. It should be used for section headers and high-level platform titles.
- **Data & Body:** Use **Inter** for all functional data. For metrics, utilize the tighter tracking and bold weights of Inter to create a "compact data" look common in high-end cockpit displays.
- **Monospace Elements:** While Inter is the primary typeface, labels and status readouts should use increased letter-spacing to mimic scanning outputs and terminal interfaces.

## Layout & Spacing

This design system employs a **Fluid Neural Grid**. The layout should feel dynamic, with containers that scale and breathe based on the density of the data stream.

- **Grid:** A 12-column fluid grid with generous gutters to allow for "glow bleed" from neighboring components.
- **Layering:** Components should rarely sit on the same Z-plane. Use varying margins and negative space to create the illusion of floating panels.
- **Safe Zones:** Maintain a 32px inner margin for all primary viewports to ensure holographic edge effects do not interfere with core data legibility.

## Elevation & Depth

Depth is the primary driver of information hierarchy. Rather than traditional shadows, this design system uses **Refractive Glassmorphism**.

1. **Backdrop Blurs:** Panels use a `backdrop-filter: blur(20px)` combined with a 10% opacity fill of the primary accent color.
2. **Inner Glows:** Instead of drop shadows, use thin, 1px inner borders (linear gradients) to define the edges of floating panels, simulating light catching the edge of a glass pane.
3. **Z-Axis Hierarchy:**
    - **Level 0 (Background):** Particle-infused deep space black with moving gradients.
    - **Level 1 (Sub-panels):** Semi-transparent dark graphite.
    - **Level 2 (Active Holograms):** High-blur panels with glowing accents.
    - **Level 3 (Modals/Critical Alerts):** High-contrast panels with a chromatic aberration effect on the edges.

## Shapes

The shape language is "Soft-Technical." While the system is rooted in geometric precision, the "bio-organic" influence requires subtle rounding to avoid a purely cold, industrial feel.

- **Base Radius:** 4px (Soft) for buttons and inputs to maintain a crisp, professional edge.
- **Container Radius:** 12px to 16px for holographic cards to evoke an organic, cell-like structure.
- **Specialty Shapes:** Use clipped corners (octagonal cuts) for high-level status indicators to reinforce the sci-fi aesthetic.

## Components

The components are designed to feel like interactive light projections.

- **Holographic Cards:** Translucent backgrounds with a subtle "scanning line" animation that periodically passes vertically across the surface. Edges should have a faint neon pulse.
- **Neural Dependency Lines:** Use SVG paths with `stroke-dasharray` animations to visualize data flow between nodes. Lines should "pulse" with the color of the data status (e.g., green for healthy flow, red for bottlenecks).
- **Control Buttons:** Ghost-style buttons with high-contrast borders. On hover, the button should fill with a low-opacity glow and trigger a subtle haptic-style visual "glitch."
- **Status Orbs:** Circular indicators that use radial gradients. "Critical" states should employ a rhythmic outer-glow pulse (breath-like), while "Learning" states should show a rotating purple particle ring.
- **Input Fields:** Minimalist underlines that expand into full glowing rectangles when focused. Use monospace font for input text to reinforce the technical nature of the platform.
- **Data Scanners:** Progress bars should not be flat fills; they should be comprised of segmented "cells" that fill individually, mimicking biological growth or digital sequence loading.