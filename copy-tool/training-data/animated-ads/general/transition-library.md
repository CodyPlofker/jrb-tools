# Transition Library

## Entry Transitions

### fade
```json
{
  "entry": "fade",
  "entryDuration": 0.5,
  "easing": "ease-out"
}
```
**Use when:** Subtle reveals, backgrounds, overlays
**Feel:** Smooth, professional, unobtrusive

### slide-up
```json
{
  "entry": "slide-up",
  "entryDuration": 0.5,
  "easing": "ease-out"
}
```
**Use when:** Text entries, positive messaging, "rising" concepts
**Feel:** Energetic, optimistic, ascending

### slide-down
```json
{
  "entry": "slide-down",
  "entryDuration": 0.5,
  "easing": "ease-out"
}
```
**Use when:** Headers dropping in, top-anchored content
**Feel:** Commanding, descending authority

### slide-left
```json
{
  "entry": "slide-left",
  "entryDuration": 0.5,
  "easing": "ease-out"
}
```
**Use when:** Sequential content, "next" concepts, Western reading flow
**Feel:** Progressive, forward-moving

### slide-right
```json
{
  "entry": "slide-right",
  "entryDuration": 0.5,
  "easing": "ease-out"
}
```
**Use when:** Revealing hidden content, sidebar entries
**Feel:** Unveiling, counter-flow attention grab

### zoom-in
```json
{
  "entry": "zoom-in",
  "entryDuration": 0.6,
  "easing": "ease-out"
}
```
**Use when:** Hero products, key reveals, "look closer" moments
**Feel:** Focused, important, demanding attention

### zoom-out
```json
{
  "entry": "zoom-out",
  "entryDuration": 0.6,
  "easing": "ease-out"
}
```
**Use when:** Context reveals, establishing shots, "see the big picture"
**Feel:** Expansive, comprehensive, scene-setting

### bounce
```json
{
  "entry": "bounce",
  "entryDuration": 0.8,
  "easing": "ease-out"
}
```
**Use when:** Playful brands, discounts, CTAs that need energy
**Feel:** Fun, energetic, attention-grabbing

### pulse
```json
{
  "entry": "pulse",
  "entryDuration": 0.4,
  "easing": "ease-in-out"
}
```
**Use when:** Urgent CTAs, limited time offers, "act now" moments
**Feel:** Urgent, pulsing, alive

## Exit Transitions

### fade-out
```json
{
  "exit": "fade",
  "exitDuration": 0.4,
  "easing": "ease-in"
}
```
**Use when:** Smooth scene transitions, graceful exits

### slide-out (any direction)
```json
{
  "exit": "slide-left",
  "exitDuration": 0.4,
  "easing": "ease-in"
}
```
**Use when:** Making room for next element, creating flow

### zoom-out-exit
```json
{
  "exit": "zoom-out",
  "exitDuration": 0.5,
  "easing": "ease-in"
}
```
**Use when:** Dramatic exits, fading to background

## Scene Transitions

### crossfade
```json
{
  "type": "crossfade",
  "fromTimestamp": 3.0,
  "toTimestamp": 3.5
}
```
**Duration:** 0.5-1.0s
**Use when:** Smooth scene changes, professional feel
**Avoid:** When you need clear scene distinction

### wipe
```json
{
  "type": "wipe",
  "direction": "left",
  "fromTimestamp": 3.0,
  "toTimestamp": 3.5
}
```
**Duration:** 0.4-0.8s
**Use when:** Before/after reveals, "turning the page"
**Directions:** left, right, up, down

### slide
```json
{
  "type": "slide",
  "direction": "left",
  "fromTimestamp": 3.0,
  "toTimestamp": 3.5
}
```
**Duration:** 0.4-0.7s
**Use when:** Sequential content, carousel-like effect
**Directions:** left, right, up, down

### zoom
```json
{
  "type": "zoom",
  "fromTimestamp": 3.0,
  "toTimestamp": 3.8
}
```
**Duration:** 0.5-1.0s
**Use when:** Impactful reveals, focusing on detail
**Note:** Can feel disorienting - use sparingly

## Common Animation Sequences

### The Classic Reveal
1. Background fades in (0s, 0.5s duration)
2. Main image slides up (0.3s, 0.6s duration)
3. Headline slides up (1.0s, 0.4s duration)
4. Subtext fades in (1.5s, 0.3s duration)
5. CTA bounces in (2.5s, 0.6s duration)

### The Build
1. Background establishes (0s)
2. Element 1 slides in from left (0.5s)
3. Element 2 slides in from left (1.0s)
4. Element 3 slides in from left (1.5s)
5. CTA zooms in (2.5s)

### The Focus
1. Full scene appears (0s, fade)
2. Zoom into product (1.0s)
3. Text overlays fade in (2.0s)
4. Zoom out slightly for CTA (3.0s)

### The Story
1. Scene 1: Problem (0-3s)
   - Transition: crossfade
2. Scene 2: Solution (3-6s)
   - Transition: wipe
3. Scene 3: Benefit + CTA (6-10s)

## Timing Templates by Duration

### 6-second ad
- 0.0s: Background + main visual
- 0.5s: Primary message
- 2.0s: Supporting message
- 4.0s: CTA (holds 2s)

### 15-second ad
- 0.0s: Hook (background + attention grabber)
- 2.0s: Main message
- 5.0s: Supporting points
- 10.0s: Benefits
- 12.0s: CTA (holds 3s)

### 30-second ad
- 0.0s: Scene 1 - Hook
- 5.0s: Scene 2 - Problem/Context
- 12.0s: Scene 3 - Solution
- 20.0s: Scene 4 - Benefits
- 25.0s: CTA with social proof (holds 5s)
