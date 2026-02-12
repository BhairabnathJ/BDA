# UI/UX Specification Document: Mental Clarity App
## Web Application (Desktop & Mobile Web)

## Document Purpose

This specification provides implementation-level detail for every screen, interaction, animation, and visual element in the Mental Clarity web app. Designed for web-first deployment with responsive design for desktop, tablet, and mobile web browsers. All measurements, timings, and behaviors are specified to ensure consistency with the product vision.

---

## Responsive Breakpoints

```
Desktop Large: 1440px and above
Desktop: 1024px - 1439px
Tablet: 768px - 1023px
Mobile: 320px - 767px
```

**Design Philosophy:**
- Desktop: Full featured, multi-panel layouts, mouse/keyboard optimized
- Tablet: Hybrid touch/mouse, simplified panels
- Mobile: Touch-first, single-focus interactions, gesture-driven

---

## Design System Foundation

### Color Palette (Complete Specification)

**Primary Colors:**
```
Background Base: #F5F1E8 (warm beige)
Background Dark: #E8E2D5 (slightly darker beige for contrast)
Primary Accent: #A8C5D1 (soft blue)
Secondary Accent: #B8D4C2 (soft sage green)
```

**Node Category Colors (Gradients):**
```
Organic/Life (food, health, relationships):
  Start: #E8C5B5 (warm peach)
  End: #D4A89F (deeper terracotta)

Technical/Work (coding, projects, engineering):
  Start: #A8C5D1 (soft blue)
  End: #8BA5B8 (deeper steel blue)

Creative (art, music, writing):
  Start: #D5B8D4 (soft lavender)
  End: #B89FB8 (deeper mauve)

Learning/Growth (education, skills):
  Start: #B8D4C2 (soft sage)
  End: #9FB89F (deeper green)

Personal/Emotions (feelings, thoughts, stress):
  Start: #F5E6D3 (soft cream)
  End: #D4C5B5 (deeper tan)
```

**UI Elements:**
```
Text Primary: #2C2C2C (very dark gray, never pure black)
Text Secondary: #6B6B6B (medium gray)
Text Disabled: #A8A8A8 (light gray)

Divider/Border: #D4CFC5 (subtle tan)
Overlay: #000000 at 40% opacity (for modals)
Success: #7FB89F (muted green)
Warning: #D4A87F (muted orange)
Error: #C58F8F (muted red)
```

**Transparency/Opacity Scale:**
```
Full Opacity: 100% (1.0)
Strong: 85% (0.85)
Medium: 60% (0.6)
Light: 40% (0.4)
Very Light: 20% (0.2)
Barely Visible: 10% (0.1)
```

### Typography System

**Font Family:** 
- Primary: Inter (web standard, excellent readability)
- Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

**Type Scale:**
```
Hero: 48px, Light weight (300)
  Desktop: 48px
  Tablet: 40px
  Mobile: 32px
  Usage: "What's on your mind?" main prompt

Title: 28px, Regular weight (400)
  Desktop: 28px
  Tablet: 24px
  Mobile: 20px
  Usage: "Get some rest" closure message

Heading: 20px, Medium weight (500)
  Desktop: 20px
  Tablet: 18px
  Mobile: 16px
  Usage: Node labels (large view), section headers

Body: 16px, Regular weight (400)
  Desktop: 16px
  Tablet: 15px
  Mobile: 14px
  Usage: Info panel text, settings

Caption: 13px, Regular weight (400)
  Desktop: 13px
  Tablet: 12px
  Mobile: 11px
  Usage: Timestamps, metadata

Tiny: 11px, Regular weight (400)
  Usage: System labels, helper text (desktop only)
```

**Line Height:**
- Hero: 1.1
- Title: 1.2
- Heading: 1.3
- Body: 1.5
- Caption: 1.4
- Tiny: 1.3

**Letter Spacing:**
- All sizes: -0.02em (slightly tighter for cleaner look)

### Spacing System

**Base Unit:** 8px

**Spacing Scale:**
```
Micro: 4px (0.5 units)
Tiny: 8px (1 unit)
Small: 16px (2 units)
Medium: 24px (3 units)
Large: 32px (4 units)
XLarge: 48px (6 units)
XXLarge: 64px (8 units)
Huge: 96px (12 units)
```

**Responsive Spacing:**
```
Desktop:
  Screen Edge Padding: 32px
  Content Padding: 24px
  Section Spacing: 48px

Tablet:
  Screen Edge Padding: 24px
  Content Padding: 16px
  Section Spacing: 32px

Mobile:
  Screen Edge Padding: 16px
  Content Padding: 12px
  Section Spacing: 24px
```

### Corner Radius System

```
Micro: 4px (tight curves for small elements)
Small: 8px (buttons, small cards)
Medium: 12px (cards, panels)
Large: 20px (modals, major containers)
XLarge: 32px (full-screen overlays)
Circle: 50% (circular elements)
```

### Shadow System

```
Subtle:
  offset-y: 2px
  blur: 8px
  color: #000000 at 8% opacity
  Usage: Nodes, small cards

Medium:
  offset-y: 4px
  blur: 16px
  color: #000000 at 12% opacity
  Usage: Floating panels, modals

Strong:
  offset-y: 8px
  blur: 24px
  color: #000000 at 16% opacity
  Usage: Overlays, important pop-ups
```

---

## Animation System

### Timing Functions (Easing Curves)

```css
/* Smooth In-Out (Default) */
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);

/* Organic Ease (Natural Motion) */
--ease-organic: cubic-bezier(0.33, 1, 0.68, 1);

/* Spring Bounce */
--ease-spring: cubic-bezier(0.5, 1.5, 0.5, 1);

/* Slow Start (Anticipation) */
--ease-slow-start: cubic-bezier(0.7, 0, 0.84, 0);

/* Quick Exit */
--ease-quick-exit: cubic-bezier(0.4, 0, 1, 1);
```

### Duration Standards

```
Micro: 100ms - 150ms
  Usage: Hover states, subtle feedback

Fast: 200ms - 300ms
  Usage: Button presses, quick transitions

Standard: 400ms - 500ms
  Usage: Most transitions, panel opens

Slow: 600ms - 800ms
  Usage: Meaningful transitions, zoom animations

Very Slow: 1000ms - 1500ms
  Usage: Opening sequences, breathing guides

Cinematic: 2000ms+
  Usage: 2am mode opening (5000ms), closure sequences
```

### Core Animation Patterns

**Fade In:**
```css
transition: opacity 400ms var(--ease-smooth);
from { opacity: 0; }
to { opacity: 1; }
```

**Fade Out:**
```css
transition: opacity 300ms var(--ease-quick-exit);
from { opacity: 1; }
to { opacity: 0; }
```

**Scale Up (Bloom):**
```css
transition: transform 600ms var(--ease-organic), 
            opacity 600ms var(--ease-organic);
from { transform: scale(0.8); opacity: 0; }
to { transform: scale(1); opacity: 1; }
```

**Scale Down (Dissolve):**
```css
transition: transform 400ms var(--ease-smooth), 
            opacity 400ms var(--ease-smooth);
from { transform: scale(1); opacity: 1; }
to { transform: scale(0.95); opacity: 0; }
```

**Slide Up:**
```css
transition: transform 500ms var(--ease-smooth), 
            opacity 500ms var(--ease-smooth);
from { transform: translateY(40px); opacity: 0; }
to { transform: translateY(0); opacity: 1; }
```

**Breathing Pulse:**
```css
animation: breathe 4000ms var(--ease-organic) infinite;

@keyframes breathe {
  0%, 100% { transform: scale(0.95); opacity: 0.6; }
  50% { transform: scale(1.05); opacity: 0.9; }
}
```

---

## Screen-by-Screen Specifications

### Screen 1: App Landing / Default Entry (Desktop)

**Viewport:** 1440px x 900px (standard laptop)

**Layout:**
```
+----------------------------------------------------------+
| [≡ Menu]  Mental Clarity                    [Profile ⚙] | <- Header: 64px
+----------------------------------------------------------+
|                                                           |
|                                                           |
|                    Dot Grid Background                    |
|                                                           |
|                [User's Graph if exists]                   | <- Canvas Area
|             [or clean grid + prompt if new]               |
|                                                           |
|                                                           |
|                                                           |
+----------------------------------------------------------+
| [🎤 Hold to speak]              [Type your thoughts ⌨️]  | <- Input Bar: 80px
+----------------------------------------------------------+
```

**Visual Details:**

*Header Bar (64px height):*
- Background: `rgba(255, 255, 255, 0.95)` with backdrop-filter blur(20px)
- Position: Fixed top, z-index: 100
- Border bottom: 1px solid #D4CFC5
- Shadow: Subtle (offset-y: 2px)

Left Section:
- Hamburger menu icon: 24x24px, #2C2C2C, 24px from left edge
- App name "Mental Clarity": Heading size (20px), #2C2C2C, 16px left of icon
- On hover: icon scales to 1.1, 150ms

Right Section:
- Profile icon: 32x32px circle, #6B6B6B, 24px from right edge
- Settings gear icon: 24x24px, #6B6B6B, 16px left of profile
- On hover: scale to 1.1, 150ms

*Main Canvas Area:*
- Position: Fills space between header and input bar
- Background: #F5F1E8
- Overflow: hidden (no scrollbars, pan with mouse drag)

*Dot Grid Pattern:*
- Dots: 2px diameter circles
- Color: #D4CFC5
- Spacing: 32px grid (desktop = larger spacing than mobile)
- Opacity: 0.3
- Implementation: CSS background-image with repeating radial gradient

*Empty State (New User):*
```
Centered in canvas:
- "What's on your mind?" 
  - Font: Hero (48px, Light)
  - Color: #6B6B6B at 50% opacity
  - Animation: breathe (4s cycle, scale 0.98-1.02)
  - Position: Absolute center of canvas
```

*Existing Graph State:*
- Graph rendered using SVG or Canvas API
- Nodes positioned from saved data
- Zoom level: 100% (default)
- Pan position: Centered on most recent activity cluster

*Input Bar (80px height):*
- Position: Fixed bottom, z-index: 100
- Background: `rgba(255, 255, 255, 0.98)` with backdrop-filter blur(10px)
- Border top: 1px solid #D4CFC5
- Shadow: Medium (offset-y: -4px)

Left Button (Voice):
- Width: 240px
- Height: 56px
- Border-radius: 28px (pill shape)
- Background: #A8C5D1
- Text: "🎤 Hold to speak" (white, 16px)
- Position: 32px from left edge, vertically centered
- Cursor: pointer

Right Button (Text):
- Width: 240px
- Height: 56px
- Border-radius: 28px
- Background: transparent
- Border: 2px solid #D4CFC5
- Text: "Type your thoughts ⌨️" (#6B6B6B, 16px)
- Position: 32px from right edge, vertically centered
- Cursor: pointer

**Interaction Specifications (Desktop):**

*Click Hamburger Menu:*
```
Action: Open side menu
Animation: 
  - Menu slides in from left (300ms, ease-smooth)
  - Width: 320px
  - Overlay appears behind menu (#000000 at 40%)
  - Main canvas dims slightly (opacity 0.6)
Visual feedback:
  - Cursor: pointer
  - Hover: Menu icon scales 1.1 (150ms)
  - Click: Menu icon rotates 90deg (200ms)
```

*Click Profile/Settings:*
```
Action: Open settings modal
Animation:
  - Modal slides up from bottom (400ms, ease-smooth)
  - Overlay appears (#000000 at 40%)
  - Modal centers on screen
  - Size: 600px width, auto height (max 80vh)
Visual feedback:
  - Cursor: pointer
  - Hover: Icon scales 1.1, color changes to #2C2C2C
```

*Click Voice Button:*
```
Action: Start voice recording
Animation:
  - Button scales 1.05 (150ms)
  - Background changes to darker blue #8BA5B8
  - Ripple effect from click point
Visual feedback:
  - Cursor: pointer
  - Hover: scales 1.02, shadow increases
  - Active state: pulsing glow effect
Behavior:
  - Must hold for 200ms to activate (prevents accidental)
  - Release to process
  - Visual indicator shows hold duration
```

*Click Text Button:*
```
Action: Open text input mode
Animation:
  - Input field expands from button (400ms, ease-organic)
  - Button transforms into submit button
  - Keyboard focus automatically
Visual feedback:
  - Cursor: pointer
  - Hover: border color darkens, slight shadow
```

*Click Node (on canvas):*
```
Action: Select node, show info panel
Animation:
  - Node scales 1.2 (300ms, ease-spring)
  - Node shadow increases (Medium → Strong)
  - Other nodes dim to 40% opacity (300ms)
  - Info panel slides in from right (400ms, ease-smooth)
    - Width: 400px (desktop), 100% (mobile)
Visual feedback:
  - Cursor: pointer
  - Hover: Node scales 1.05, shadow appears
  - Selected: Persistent scale, subtle pulse
```

*Double-Click Node:*
```
Action: Zoom into node detail view
Animation:
  - Camera zooms to node (800ms, ease-smooth)
  - Other nodes fade out completely (600ms)
  - Node expands to center (600ms)
  - Child nodes fade in around parent (800ms, staggered 100ms each)
Visual feedback:
  - First click: normal selection
  - Second click within 400ms: triggers zoom
```

*Mouse Wheel Scroll:*
```
Action: Zoom in/out of canvas
Behavior:
  - Scroll up: Zoom in (1.1x per scroll)
  - Scroll down: Zoom out (0.9x per scroll)
  - Zoom limits: 25% to 400%
  - Zooms toward cursor position
Animation:
  - Smooth interpolation (300ms, ease-smooth)
  - Nodes scale proportionally
  - Grid adjusts density
```

*Mouse Drag (on canvas background):*
```
Action: Pan canvas
Behavior:
  - Click and hold on empty space
  - Cursor changes to grab (open hand) → grabbing (closed hand)
  - 1:1 movement with mouse
  - Momentum: Continues moving after release (400ms deceleration)
Visual feedback:
  - Cursor: grab/grabbing
  - No selection while dragging
```

*Mouse Drag (on node):*
```
Action: Move node to new position
Behavior:
  - Click and hold on node (200ms to activate)
  - Cursor changes to grabbing
  - Node follows cursor with slight lag (40ms, smooth)
  - Connection lines stretch dynamically
  - Drop to lock position
Animation:
  - Node lifts (shadow Strong, scale 1.1)
  - While dragging: other nodes repel slightly (force-directed)
  - On drop: Node settles (scale back to 1, shadow Medium)
Visual feedback:
  - Hover: cursor pointer
  - Hold 200ms: cursor changes to grabbing, node scales 1.05
  - Dragging: node has Strong shadow
```

*Keyboard Shortcuts:*
```
Space: Start/stop voice recording
Cmd/Ctrl + K: Focus text input
Cmd/Ctrl + Z: Undo last action
Cmd/Ctrl + F: Search nodes
Escape: Close panels/modals
+/=: Zoom in
-: Zoom out
0: Reset zoom to 100%
Arrow keys: Pan canvas
```

---

### Screen 1: App Landing / Default Entry (Tablet - 768px)

**Layout Adjustments:**
```
+------------------------------------------+
| [≡]  Mental Clarity            [⚙] [👤] | <- Header: 56px
+------------------------------------------+
|                                           |
|                                           |
|         Dot Grid Background               |
|                                           |
|         [User's Graph if exists]          | <- Canvas
|      [or clean grid + prompt if new]      |
|                                           |
|                                           |
+------------------------------------------+
| [🎤]                            [⌨️]     | <- Input: 72px
+------------------------------------------+
```

**Key Differences from Desktop:**

*Header (56px):*
- App name hidden on tablet, only icons visible
- Menu icon: 32px from left
- Profile & settings: 16px from right, 12px apart

*Canvas:*
- Dot grid spacing: 24px (vs 32px desktop)
- Touch-optimized interactions (see below)

*Input Bar (72px):*
- Voice button: 56px circle (not pill)
  - Icon only: 🎤 (32px)
  - Position: 16px from left
- Text button: 56px circle
  - Icon only: ⌨️ (32px)
  - Position: 16px from right

**Touch Interactions:**

*Tap Node:*
```
Action: Select, show info panel
Touch target: Minimum 44x44px
Animation: Same as desktop click
Feedback: Node briefly scales 1.1 on touch-down
```

*Double-Tap Node:*
```
Action: Zoom into node
Timing: Second tap within 300ms
Animation: Same as desktop double-click
```

*Long-Press Node:*
```
Action: Move node (alternative to drag)
Duration: 400ms hold
Feedback: 
  - Progress circle appears (400ms fill)
  - Haptic feedback on activation (if supported)
  - Node lifts (shadow Strong)
```

*Pinch Gesture:*
```
Action: Zoom canvas
Behavior:
  - Two-finger pinch in: Zoom out
  - Two-finger pinch out: Zoom in
  - Live, 1:1 response
  - Zooms toward center of pinch
Limits: 25% to 400%
```

*Two-Finger Pan:*
```
Action: Pan canvas
Behavior:
  - Two fingers, drag
  - 1:1 movement
  - Momentum on release (300ms)
```

*Single-Finger Drag (on canvas):*
```
Action: Pan canvas (alternative)
Behavior:
  - Drag from empty space only
  - 1:1 movement
  - Distinguishes from node drag by delay (100ms)
```

---

### Screen 1: App Landing / Default Entry (Mobile - 375px)

**Layout:**
```
+-------------------+
| [≡]     [⚙] [👤] | <- Header: 48px
+-------------------+
|                    |
|   Dot Grid BG      |
|                    |
|   [Graph/Empty]    | <- Canvas
|                    |
|                    |
|                    |
+-------------------+
| What's on your     | <- Prompt overlay
|    mind?           |
+-------------------+
| [  🎤  ]   [  ⌨️  ]| <- Input: 64px
+-------------------+
```

**Key Differences:**

*Header (48px):*
- Minimal: Only icons, no text
- Menu: 24x24px, 12px from left
- Settings & Profile: 24x24px, 12px from right, 8px apart

*Canvas:*
- Dot grid spacing: 20px
- Occupies maximum vertical space
- Default zoom: 80% (show more nodes on small screen)

*Prompt Overlay (when graph empty):*
- Position: Bottom third of canvas
- Semi-transparent background: `rgba(245, 241, 232, 0.9)`
- Padding: 24px
- Border-radius: Large (20px top)

*Input Bar (64px):*
- Voice button: 48px circle
  - Icon: 28px
  - Position: 12px from left
- Text button: 48px circle
  - Icon: 28px
  - Position: 12px from right

**Mobile-Specific Interactions:**

*Tap Empty Space:*
```
Action: Show/hide input bar
Behavior:
  - Input bar can slide down to hide (more canvas space)
  - Tap canvas to bring back
Animation: 300ms slide up/down
```

*Swipe Up from Bottom:*
```
Action: Activate voice mode quickly
Behavior:
  - Swipe up gesture from bottom 20% of screen
  - Immediately starts recording
  - Bypasses button tap
Feedback: Haptic + visual wave from bottom
```

---

### Screen 2: 2AM Mode - Opening Sequence (Web - All Sizes)

**Trigger:** 
- Desktop: Hold voice button for 1 second when time is 10pm-7am
- Tablet/Mobile: Tap and hold voice button for 1 second
- OR: Any time when sentiment analysis detects high stress

**Full-Screen Takeover:**
```
+-------------------------------------------+
|                                            |
|                                            |
|                                            |
|     [Calming Imagery - Center]             | <- Personalized
|     [White Flowers Blooming]               | <- Layered
|                                            |
|                                            |
|     ~~~~~~~~~~~~~~~~                        | <- Breathing wave
|     ~~~~~~~~~~~~~~~~                        |
+-------------------------------------------+
```

**Duration:** 5000ms (5 seconds total)

**Timeline:**

```
0ms - 500ms:
  - Fade in from black to beige
  - Header/input bar fade out completely
  - Canvas overlay slides up from bottom
  - Audio: Soft ambient tone (if browser allows)
  - Easing: ease-slow-start

500ms - 1500ms:
  - Breathing wave fades in at bottom
  - Wave height: 
    - Desktop: 150px
    - Tablet: 120px
    - Mobile: 100px
  - Wave begins pulse (4s cycle)
  - Screen edges: subtle vignette pulse synchronized
  - Easing: ease-organic

1500ms - 3000ms:
  - Personalized imagery (if available): fade in 30% opacity
  - Image: Cover center 60% of screen, maintain aspect ratio
  - White flowers bloom from center (5-7 blooms)
  - Each flower: 
    - SVG or canvas-drawn
    - 800ms individual bloom
    - Staggered start (100ms between each)
    - Scale: 0.3 → 1.0
    - Opacity: 0 → 0.9
  - Easing: ease-organic

3000ms - 4000ms:
  - Faint graph shimmer behind flowers
  - Graph opacity: 10% maximum
  - Graph slightly blurred (blur: 8px)
  - Static, no interaction

4000ms - 5000ms:
  - All elements settle into steady breathing
  - Visual cue appears: "Speak when ready" (micro text, very subtle)
  - Position: Top center, opacity 40%
  - Ready for voice input
```

**Visual Specifications:**

*Background:*
- Color: #F5F1E8
- Radial gradient overlay:
  ```css
  background: radial-gradient(
    circle at center,
    #F5F1E8 0%,
    #E8E2D5 100%
  );
  ```

*Breathing Wave:*
```css
Position: absolute bottom
Bottom: 
  - Desktop: 48px from bottom
  - Tablet: 32px from bottom
  - Mobile: 24px from bottom
Height:
  - Desktop: 150px
  - Tablet: 120px
  - Mobile: 100px
Width: 100vw
Color: #A8C5D1 at 60% opacity
Filter: blur(8px)

Animation: breathe-wave 4000ms var(--ease-organic) infinite

@keyframes breathe-wave {
  0%, 100% {
    transform: scaleY(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scaleY(1.2);
    opacity: 0.7;
  }
}
```

*Screen Edge Vignette Pulse:*
```css
Position: fixed, inset 0
Pointer-events: none
Background: radial-gradient(
  circle at center,
  transparent 60%,
  rgba(168, 197, 209, 0.15) 100%
)

Animation: sync with wave (same 4000ms cycle)
```

*White Flowers:*
```
Implementation: SVG paths or Canvas API
Count: 5-7 individual blooms
Positions: Scattered around center in circular pattern
Size: 
  - Desktop: 80-120px diameter
  - Tablet: 60-100px diameter
  - Mobile: 50-80px diameter
Color: #FFFFFF at 85-95% opacity (slight variation per flower)
Shape: Stylized tulip/rose outlines (minimal, abstract)
Blur: 2px (soft edges)

Individual Bloom Animation:
  Duration: 800ms
  Easing: ease-organic
  Keyframes:
    0%: scale(0.3), opacity(0), rotate(0deg)
    60%: scale(1.1), opacity(1), rotate(5deg)
    100%: scale(1.0), opacity(0.9), rotate(0deg)

Stagger: 100ms between each flower start time
```

*Personalized Imagery:*
```
Source: User-provided or inferred from conversations
Format: JPEG/PNG/WebP
Position: Absolute center
Size: Cover 60% of viewport (maintain aspect ratio)
Opacity: 30%
Filter: 
  - blur(4px) - soft, dreamlike
  - brightness(1.1) - slightly brighter
  - contrast(0.9) - slightly lower contrast
Layer: Behind flowers, above background
```

*"Speak when ready" text:*
```
Font: Caption (13px on desktop, 11px mobile)
Color: #6B6B6B at 40% opacity
Position: Top center, 32px from top
Animation: Fade in at 4500ms (500ms fade)
Purpose: Subtle permission to begin
```

---

### Screen 3: 2AM Mode - Brain Dump Active (Web)

**State:** User is actively speaking

**Layout:**
```
+-------------------------------------------+
|                                            |
|                                            |
|     [Flowers continue pulsing]             |
|     [with voice cadence]                   |
|                                            |
|     ~~~~~~~~~~~~~~~~                        | <- Breathing wave
|     ~~~~~~~~~~~~~~~~  [responding to voice]|
+-------------------------------------------+
|  [Optional: Transcript scroll]             | <- Bottom overlay
+-------------------------------------------+
```

**Visual Changes from Opening:**

*Calming imagery fades out:*
```
Animation: Fade out over 1000ms
Timing: Begins when user starts speaking
Final state: opacity 0
```

*Flowers respond to voice:*
```
Behavior:
  - Scale pulses with voice amplitude
  - Louder voice → larger scale (1.0 to 1.15)
  - Quiet voice → smaller scale (0.95 to 1.0)
  - Smooth interpolation (100ms)
  - Color: Slight saturation increase with volume
Implementation:
  - Use Web Audio API to analyze frequency
  - Map amplitude to scale transform
```

*Breathing wave responds to speech:*
```
Behavior:
  - Base: Continues 4s breathing cycle
  - Overlay: Adds voice-responsive ripples
  - Speaking: Wave height increases proportionally
  - Silence: Returns to base rhythm
Visual:
  - Ripple effect originates from center
  - Multiple ripples can overlap
  - Each ripple: 600ms duration, fades out
```

*Optional Transcript Overlay (user setting):*
```
Position: Bottom of screen, 24px from bottom
Height: Auto (max 150px)
Background: rgba(255, 255, 255, 0.15) with backdrop-filter blur(20px)
Padding: 16px 24px
Border-radius: Large (20px) top only

Text:
  - Font: Body (16px)
  - Color: #2C2C2C at 70% opacity
  - Line-height: 1.5
  - Auto-scrolls as new words appear
  - Shows last 3 lines maximum
  
Behavior:
  - Fades in when speech starts (500ms)
  - Updates in real-time as speech-to-text processes
  - Fades out 2s after speech stops
```

**Audio Feedback:**

*Silence Detection:*
```
0-15 seconds silence: 
  - No change
  - Flowers continue gentle pulse
  
15 seconds silence:
  - Soft tone (300ms, gentle chime)
  - Visual: Single ripple from center
  - Meaning: "Still here, listening"
  
30 seconds silence:
  - Begin processing sequence
  - Audio: Tone fades out (1000ms)
  - Visual: Transition to processing animation
```

---

### Screen 4: 2AM Mode - Processing & Highlighting (Web)

**State:** User finished speaking, app is processing

**Duration:** Variable (AI processing time), typically 2-5 seconds

**Phase 1: Transition (1000ms)**

```
+-------------------------------------------+
|                                            |
|        [Flowers fade out]                  |
|        [Breathing wave fades]              |
|                                            |
|                                            |
|        [Processing indicator appears]      |
|                                            |
+-------------------------------------------+
```

Animation:
```
0-500ms:
  - Flowers scale down and fade (ease-quick-exit)
  - Breathing wave amplitude reduces
  - Background: remains beige

500-1000ms:
  - Simple processing indicator appears at center:
    - Circular ring, 64px diameter
    - Color: #A8C5D1
    - Stroke-width: 3px
    - Rotation animation: 1500ms linear infinite
    - Opacity: 0.6
```

**Phase 2: Nodes Appear (Variable, per node ~600ms)**

```
+-------------------------------------------+
|                                            |
|      [ ]    [ ]         [ ]                |
|                 [ ]           [ ]          | <- Nodes appear
|          [ ]                               | <- Disconnected
|     [ ]              [ ]                   |
|                                            |
+-------------------------------------------+
```

Animation per node:
```
Stagger: 200ms between each node
Individual animation: 600ms

Sequence:
  - Node fades in at assigned position
  - Scale: 0.5 → 1.0
  - Opacity: 0 → 1.0
  - Easing: ease-organic
  - Slight overshoot at end (scale 1.05 → 1.0)

Node appearance:
  - Size: Proportional to frequency mentioned
    - Desktop: 60-120px diameter
    - Mobile: 40-80px diameter
  - Color: Category gradient (muted)
  - Opacity: 60% initially (all equal)
  - No connections visible yet
```

**Phase 3: Highlight Key Node (2000ms)**

```
+-------------------------------------------+
|                                            |
|      [·]    [·]         [·]                |
|                 [·]           [·]          | <- Others dim
|          [•]                               | <- Key node glows
|     [·]              [·]                   |
|                                            |
+-------------------------------------------+
```

Animation:
```
0-1000ms:
  - All nodes except highest sentiment node dim
  - Others: opacity 60% → 20%
  - Easing: ease-smooth
  
0-1500ms:
  - Key node moves to center (if not already)
  - Path: Smooth bezier curve
  - Duration: 1000ms
  - Easing: ease-organic
  
500-2000ms:
  - Key node highlights:
    - Scale: 1.0 → 1.3
    - Opacity: 60% → 100%
    - Shadow: None → Strong
    - Glow effect: radial gradient overlay
      - Inner: node color at 100%
      - Outer: node color at 0%, extends 40px
    - Continuous gentle pulse (scale 1.25-1.35, 3s cycle)
```

**Text Overlay (appears with key node):**
```
Position: Above key node, 48px spacing
Font: Title (28px on desktop, 20px mobile)
Color: #2C2C2C
Opacity: Fade in 0 → 100% over 800ms
Content: Node label (user's words)
Max-width: 400px, text-align center
```

---

### Screen 5: 2AM Mode - Cathartic Gesture (Web)

**State:** User faces the highlighted node, chooses action

**Layout (Desktop/Tablet):**
```
+-------------------------------------------+
|                                            |
|                                            |
|                [KEY NODE]                  | <- Center, glowing
|              "Your thought"                |
|                                            |
|                                            |
|     [No visible UI - gesture-driven]       |
|                                            |
+-------------------------------------------+
```

**Layout (Mobile):**
```
+----------------------------+
|                             |
|        [KEY NODE]           |
|       "Your thought"        |
|                             |
|                             |
|                             |
| [Swipe gestures enabled]    |
+----------------------------+
```

**Interaction Options:**

**Option 1: Destruction Gesture**

*Desktop (Mouse):*
```
Action: Click and drag node away violently
Detection:
  - Must drag > 200px in any direction
  - Velocity > 1000px/s at release
  - Direction: any

Animation on release:
  - Node continues trajectory (momentum)
  - Accelerates as it moves (ease-quick-exit)
  - Shatters when reaches edge (~400ms)
  
Shatter effect:
  - Node breaks into 12-20 particles
  - Particles: 
    - Size: 8-20px
    - Color: Inherit from node
    - Velocity: Random directions, radial from impact
    - Rotation: Random spin
    - Opacity: Fade 100% → 0% over 800ms
    - Physics: Gravity + friction simulation
  - Sound: Subtle glass break (if audio enabled)
```

*Mobile (Touch):*
```
Action: Swipe node away forcefully
Detection:
  - Swipe distance > 150px
  - Swipe velocity > 800px/s
  - Direction: any

Animation: Same as desktop
Haptic: Heavy impact feedback on shatter
```

**Option 2: Transformation Gesture**

*Desktop:*
```
Action: Click and hold on node (hold for 2 seconds)
Visual feedback during hold:
  - Progress ring appears around node
  - Ring: 
    - Stroke-width: 4px
    - Color: #7FB89F (success green)
    - Fills clockwise over 2000ms
  - Node scales slightly larger (1.3 → 1.4)
  
On completion (2000ms):
  - Node blooms into smaller pieces
  - Animation: 1500ms
  
Bloom effect:
  - Node splits into 4-6 smaller nodes
  - Small nodes:
    - Size: 30% of original
    - Same color, lighter tint
    - Arrange in circular pattern around origin
    - Distance: 120px from center
  - Connection lines appear between pieces (dotted)
  - Flowers from opening sequence reappear, wrap around cluster
  - Overall effect: "breaking down into manageable pieces"
```

*Mobile:*
```
Action: Long-press node (1500ms)
Feedback: Same progress ring, haptic pulses every 500ms
Animation: Same bloom effect
```

**Option 3: Containment Gesture**

*Desktop:*
```
Action: Drag node to corner of screen
Detection:
  - Drag to within 80px of any corner
  - Hold at corner for 500ms
  
Visual feedback:
  - Corner highlights when node enters zone
  - Corner glow: #A8C5D1 at 40% opacity
  - Pulsing circle appears in corner (120px diameter)
  
On completion:
  - Node shrinks (scale 1.3 → 0.3)
  - Moves to exact corner position
  - "Container" visual appears:
    - Rounded square outline (60px)
    - Color: #A8C5D1
    - Stroke-width: 2px
    - Dashed line
  - Node settles inside container
  - Slight bounce effect (ease-spring)
  - Container pulses once (gentle)
```

*Mobile:*
```
Action: Swipe node to screen edge and hold
Detection:
  - Swipe toward any edge
  - Hold within 60px of edge for 300ms
Feedback: Haptic on edge contact, haptic pulse on completion
Animation: Same as desktop, smaller size (40px container)
```

**Automatic Timeout:**
```
If no gesture within 60 seconds:
  - Subtle prompt appears: "Choose what to do with this"
    - Font: Caption
    - Opacity: 40%
    - Position: Bottom center
    - Animation: Fade in over 1000ms
  
If no gesture within 120 seconds:
  - Automatically trigger containment to corner
  - Gentle, non-violent animation
  - Proceeds to closure sequence
```

---

### Screen 6: 2AM Mode - Closure Sequence (Web)

**Duration:** 12-15 seconds total

**Phase 1: Gesture Completion Acknowledgment (1000ms)**

```
+-------------------------------------------+
|                                            |
|                                            |
|         [Gesture effect completes]         |
|                                            |
|                                            |
+-------------------------------------------+
```

After any gesture completes:
- Screen holds for 500ms (let effect finish)
- Begin fade to black (500ms, ease-smooth)

**Phase 2: "Get some rest" Message (2000ms)**

```
+-------------------------------------------+
|                                            |
|                                            |
|             Get some rest                  | <- Fade in
|                                            |
|                                            |
+-------------------------------------------+
```

Visual:
```
Background: #000000 (pure black)
Text: "Get some rest"
  - Font: Title (28px desktop, 24px tablet, 20px mobile)
  - Color: #F5F1E8 (beige, inverted)
  - Position: Center
  - Animation:
    - Fade in: 800ms
    - Hold: 1200ms
    - Fade out: 1000ms (into next phase)
```

**Phase 3: Breathing Guide (10000ms)**

```
+-------------------------------------------+
|                                            |
|                                            |
|              [◯]                          | <- Breathing circle
|          Breathe in...                     |
|                                            |
+-------------------------------------------+
```

Visual:
```
Background: Remains black

Breathing Circle:
  - Position: Center
  - Diameter: 
    - Desktop: 200px
    - Tablet: 160px
    - Mobile: 120px
  - Color: #A8C5D1 at 60% opacity
  - Stroke-width: 3px
  - Fill: transparent initially
  
Animation (10 seconds = 2.5 breathing cycles at 4s each):
  
  Cycle (4000ms):
    0-2000ms (Inhale):
      - Circle scales: 0.8 → 1.2
      - Fill opacity: 0 → 30%
      - Text: "Breathe in..." fades in
      - Easing: ease-organic
    
    2000ms (Hold):
      - Circle holds at 1.2
      - Fill at 30%
      - Text fades out, no text shows
    
    2000-4000ms (Exhale):
      - Circle scales: 1.2 → 0.8
      - Fill opacity: 30% → 0%
      - Text: "Breathe out..." fades in
      - Easing: ease-organic
    
  Repeat 2.5 times (10 seconds total)

Text:
  - Font: Caption (13px)
  - Color: #F5F1E8 at 70% opacity
  - Position: Below circle, 24px spacing
  - Fades in/out with each breath phrase (800ms transitions)
```

**Phase 4: App Lock Message (3000ms)**

```
+-------------------------------------------+
|                                            |
|                                            |
|          See you at 9:00 AM                | <- Fade in
|                                            |
|         [Lock icon animation]              |
+-------------------------------------------+
```

Visual:
```
Text: "See you at 9:00 AM"
  - Font: Body (16px)
  - Color: #F5F1E8 at 70% opacity
  - Position: Center
  - Animation: Fade in 800ms
  
Lock Icon:
  - Position: Below text, 16px spacing
  - Size: 32px
  - Color: #A8C5D1 at 50% opacity
  - Animation:
    - Appears at 1000ms
    - Lock closes animation (400ms)
    - Subtle glow pulse (2s cycle)

Behavior:
  - Message shows for 2000ms
  - Fade out entire screen to black (1000ms)
  - Close/minimize application
  - Set lock state in localStorage
```

**Phase 5: Application Lock (Until 9AM)**

```
State Management:
  - localStorage.setItem('appLocked', true)
  - localStorage.setItem('lockUntil', '[9AM_TIMESTAMP]')
  - localStorage.setItem('lockReason', '2am_mode_closure')

If user tries to reopen before 9AM:
  - Show lock screen immediately
  - No access to any features
  - No emergency override

Lock Screen:
  Background: #000000
  Content:
    - Lock icon (48px)
    - Text: "Rest time. I'll see you at 9:00 AM"
    - Current time display
    - Breathing animation (passive, continuous)
  
  User can:
    - View the lock screen
    - Close/minimize
    - Nothing else
  
At 9AM:
  - Lock automatically releases
  - User can open app normally
  - No notification sent
```

---

### Screen 7: Daytime Mode - Main Graph View (Desktop)

**State:** User opens app between 7AM-10PM OR in calm state

**Layout (Desktop 1440px):**
```
+----------------------------------------------------------+
| [≡] Mental Clarity  [🔍 Search]           [Filters] [⚙️] | <- Header: 64px
+----------------------------------------------------------+
|                                                           |
|                                                           |
|                   • • • • • • • • •                       |
|        [○]                                                |
|                     [○]──[○]                             |
|                                                           | <- Main Canvas
|    [○]────[○]                    [○]                     |
|                                                           |
|                          [○]──[○]                        |
|                                                           |
|                   • • • • • • • • •                       |
+----------------------------------------------------------+
| [🎤 Start recording]  [Recent: 3 sessions] [+Text input] | <- Status Bar: 56px
+----------------------------------------------------------+
```

**Visual Details:**

*Header Bar (64px):*
```
Left Section:
  - Hamburger menu: 24x24px, #2C2C2C, 24px from left
  - App name: "Mental Clarity", Heading (20px), 16px from menu

Center Section:
  - Search input: 
    - Width: 320px
    - Height: 40px
    - Border-radius: 20px (pill)
    - Background: rgba(212, 207, 197, 0.3)
    - Border: 1px solid transparent
    - Placeholder: "Search your thoughts..." (#6B6B6B at 60%)
    - Icon: Magnifying glass (16px) at left, 12px padding
    - On focus:
      - Border: #A8C5D1
      - Background: rgba(255, 255, 255, 0.8)
      - Expand to 400px width (300ms, ease-smooth)

Right Section:
  - Filters button:
    - Size: 40x40px
    - Icon: Filter/funnel (20px)
    - Border-radius: 20px
    - Background: transparent
    - On hover: background rgba(212, 207, 197, 0.3)
  - Settings icon: 24x24px, 16px from filters
  - Spacing from right edge: 24px
```

*Main Canvas:*
```
Background: #F5F1E8
Dot Grid:
  - Spacing: 32px
  - Dot size: 2px
  - Color: #D4CFC5 at 30% opacity
  - Extends infinitely

View State: Shows graph at saved position
Default: Centered on recent activity cluster
```

*Node Specifications (Daytime):*
```
Size (diameter):
  - Based on frequency:
    - Mentioned 1-2 times: 50px
    - Mentioned 3-5 times: 70px
    - Mentioned 6-10 times: 90px
    - Mentioned 11+ times: 110px
  - Umbrella nodes: +20px bonus

Visual Properties:
  - Fill: Category gradient
    - Example (Technical): linear-gradient(135deg, #A8C5D1, #8BA5B8)
  - Stroke: 2px, same color as fill but 20% darker
  - Shadow: Subtle (offset-y: 2px, blur: 8px)
  - Opacity: 100% (full visibility)

Label:
  - Font: Body (16px for normal, 18px for large nodes)
  - Color: #2C2C2C
  - Position: Centered in node
  - Max-width: node diameter - 16px padding
  - Overflow: truncate with ellipsis
  - On hover: Show full text in tooltip

States:
  - Default: As described above
  - Hover:
    - Scale: 1.05 (150ms, ease-smooth)
    - Shadow: Medium
    - Cursor: pointer
    - Z-index: +10
  - Selected:
    - Scale: 1.15
    - Shadow: Strong
    - Stroke-width: 3px
    - Others dim to 40% opacity
  - Dragging:
    - Scale: 1.1
    - Shadow: Strong
    - Opacity: 90%
    - Cursor: grabbing
```

*Connection Line Specifications:*
```
Style based on relationship type:
  - Solid (co-mention): stroke-dasharray: none
  - Dashed (semantic): stroke-dasharray: 8 4
  - Dotted (temporal): stroke-dasharray: 2 4

Opacity based on strength:
  - Very strong (0.8-1.0): opacity 90%
  - Strong (0.5-0.8): opacity 70%
  - Weak (0.2-0.5): opacity 40%
  - Very weak (0-0.2): opacity 20%

Color:
  - Gradient from source node color to target node color
  - If both same category: solid category color

Thickness:
  - Standard: 1.5px
  - Strong connection (>0.9): 2px
  - Very weak (<0.3): 1px
  - Selected nodes' connections: 2.5px

Animation:
  - On hover source or target: opacity increases +20%
  - On connection creation: Draw animation (800ms)
    - Uses stroke-dashoffset technique
    - Appears to "draw" from source to target
```

*Status Bar (Bottom, 56px):*
```
Background: rgba(255, 255, 255, 0.95)
Border-top: 1px solid #D4CFC5
Shadow: Medium (offset-y: -4px)
Position: Fixed bottom

Left Section:
  - Voice button:
    - Style: Pill shape
    - Width: 200px, Height: 40px
    - Background: #A8C5D1
    - Text: "🎤 Start recording" (white, 14px)
    - On hover: background darker (#8BA5B8)
    - On active: pulses
    - Position: 24px from left

Center Section:
  - Session indicator:
    - Text: "Recent: 3 sessions" (Caption 13px, #6B6B6B)
    - Icon: Small dot per session (8px diameter, #A8C5D1)
    - On click: Opens recent sessions panel

Right Section:
  - Text input button:
    - Width: 160px, Height: 40px
    - Border: 1px solid #D4CFC5
    - Background: transparent
    - Text: "+ Text input" (#6B6B6B, 14px)
    - On hover: border #A8C5D1, background rgba(168, 197, 209, 0.1)
    - Position: 24px from right
```

**Graph Interaction Behaviors:**

*Node Click:*
```
Action: Select node, show info panel
Animation sequence:
  1. Node scales 1.0 → 1.15 (200ms, ease-spring)
  2. Other nodes dim to 40% opacity (300ms, ease-smooth)
  3. Node's connections brighten (opacity +30%)
  4. Info panel slides in from right (400ms, ease-smooth)

Info Panel:
  - Width: 400px (desktop), slides from right edge
  - Background: #FFFFFF
  - Shadow: Strong
  - Z-index: 200
  
Panel Content:
  - Header (80px):
    - Node label (Heading, 20px, #2C2C2C)
    - Category tag (Caption, pill shape, category color)
    - Close button (top-right, 32x32px)
  
  - Metadata Section (auto height):
    - Created: timestamp
    - Last accessed: timestamp  
    - Frequency: "Mentioned 7 times"
    - Sensitivity: Lock icon if sensitive
  
  - Content Section (scrollable):
    - Original text from brain dumps
    - Each dump: timestamp + transcript
    - Separated by subtle dividers
  
  - Connections Section:
    - "Connected to:" header
    - List of connected nodes (clickable chips)
    - Chip: Node name, mini preview, click to navigate
  
  - Actions Section (bottom, 64px):
    - "Add note" button
    - "Delete node" button (warning color)
    - "Mark sensitive" toggle
```

*Node Double-Click:*
```
Action: Zoom into node's sub-graph
Animation sequence:
  1. Camera zooms to node (800ms, ease-smooth)
  2. Other nodes fade out (600ms)
  3. Background changes subtly (darker dot grid)
  4. Node expands to 200px (600ms)
  5. Child nodes fade in around parent (800ms, staggered 100ms)
  6. Breadcrumb appears at top showing path

Breadcrumb:
  - Position: Top of canvas, 80px from top
  - Style: "All nodes > [Parent] > [Current]"
  - Clickable: Jump to any level
  - Background: rgba(255, 255, 255, 0.9)
  - Border-radius: 20px
  - Padding: 8px 16px
```

*Canvas Interactions:*
```
Mouse Wheel:
  - Scroll up: Zoom in (×1.1 per tick)
  - Scroll down: Zoom out (×0.9 per tick)
  - Limits: 25% to 400%
  - Smooth interpolation (300ms)
  
Click + Drag (on background):
  - Cursor: grab → grabbing
  - Pan canvas 1:1 with mouse
  - Momentum on release (400ms deceleration)
  
Drag Node:
  - Hold on node 200ms to activate
  - Cursor: grabbing
  - Node follows cursor (40ms smooth lag)
  - Connected nodes slightly repel (force-directed physics)
  - On release: Auto-layout runs (800ms settling)
  - Position saved to local storage

Keyboard Shortcuts:
  - Cmd/Ctrl + F: Focus search
  - Space: Start voice recording
  - Escape: Close panels/modals
  - +/=: Zoom in
  - -: Zoom out
  - 0: Reset zoom to 100%
  - Arrows: Pan canvas (50px per press)
  - Delete: Delete selected node (with confirmation)
```

---

### Screen 8: Daytime Mode - New Brain Dump (Voice Recording)

**Trigger:** Click "Start recording" button OR press Space

**Layout (Desktop):**
```
+----------------------------------------------------------+
|                                                           |
|           [Canvas dims to 40% opacity]                    |
|                                                           |
|  +--------------------------------------------------+    |
|  |                                                   |    |
|  |         Recording in progress...                 |    | <- Overlay
|  |                                                   |    |
|  |         [Wave visualization]                     |    |
|  |                                                   |    |
|  |         [Transcript appears here]                |    |
|  |                                                   |    |
|  +--------------------------------------------------+    |
|                                                           |
+----------------------------------------------------------+
```

**Visual Specifications:**

*Background Canvas State:*
```
Graph: Remains visible
Opacity: Dims to 40%
Blur: 4px gaussian blur
Interaction: Disabled during recording
```

*Recording Overlay:*
```
Position: Centered on canvas
Size:
  - Desktop: 600px width, auto height (max 500px)
  - Tablet: 90% width, auto height
  - Mobile: 100% width, fills screen
Background: rgba(255, 255, 255, 0.98)
Border-radius: Large (20px) on desktop, none on mobile
Shadow: Strong
Padding: 32px
Z-index: 300

Header Section (56px):
  - Text: "Recording in progress..."
    - Font: Heading (20px)
    - Color: #2C2C2C
  - Timer: "00:12" (elapsed time)
    - Font: Caption (13px)
    - Color: #6B6B6B
    - Position: Right-aligned
  - Spacing: 24px bottom margin
```

*Wave Visualization:*
```
Position: Below header
Height: 120px
Width: 100% of overlay

Visual: Audio waveform
  - Style: Vertical bars
  - Bar count: 40 bars
  - Bar width: 8px
  - Bar spacing: 6px
  - Color: #A8C5D1
  - Height: Based on audio amplitude (real-time)
  - Animation: Smooth (60fps)
  - Range: 10px (silence) to 120px (loud)

Implementation: Canvas API or SVG
  - Use Web Audio API AnalyserNode
  - Get frequency data
  - Map to bar heights
  - Update every 16ms (60fps)

Behavior:
  - When speaking: Bars dance with voice
  - When silent: Bars settle to baseline (gentle pulse)
```

*Transcript Section:*
```
Position: Below wave, 24px spacing
Max-height: 200px
Overflow-y: Auto scroll
Background: rgba(212, 207, 197, 0.15)
Border-radius: Medium (12px)
Padding: 16px

Text:
  - Font: Body (16px)
  - Color: #2C2C2C
  - Line-height: 1.6
  - As speech-to-text processes:
    - New words fade in (200ms)
    - Auto-scrolls to bottom
    - Shows last ~30 seconds of speech

Scrollbar:
  - Width: 6px
  - Track: rgba(212, 207, 197, 0.3)
  - Thumb: #A8C5D1 at 60% opacity
  - Border-radius: 3px
```

*Control Buttons:*
```
Position: Bottom of overlay, 56px height
Display: Flex, center aligned

Stop Button:
  - Width: 160px
  - Height: 48px
  - Background: #C58F8F (error red)
  - Text: "Stop recording" (white, 14px)
  - Border-radius: 24px
  - On hover: Background darker (#B57F7F)
  - On click: End recording, begin processing

Pause Button (optional):
  - Width: 120px
  - Height: 48px
  - Background: transparent
  - Border: 1px solid #D4CFC5
  - Text: "Pause" (#6B6B6B, 14px)
  - Border-radius: 24px
  - Margin-right: 16px from Stop
  - On click: Pause recording (can resume)
```

**Recording States:**

*Active Recording:*
```
Wave: Animating with voice
Transcript: Updating in real-time
Timer: Counting up
Buttons: Stop + Pause visible
```

*Paused:*
```
Wave: Frozen at last state
Transcript: Static
Timer: Paused
Overlay message: "Paused" (Caption, #6B6B6B)
Buttons: "Resume" + "Stop"
```

*Processing (after Stop clicked):*
```
Animation:
  - Wave fades out (300ms)
  - Transcript fades out (300ms)
  - Processing indicator appears
    - Spinner: 48px, #A8C5D1
    - Text: "Processing your thoughts..."
    - Font: Body (16px), #6B6B6B
  - Duration: Variable (AI processing time, 2-5 seconds)

Then:
  - New nodes appear on canvas (same animation as 2AM mode)
  - Connections form
  - Overlay dismisses (500ms fade + slide down)
  - Canvas returns to full visibility
```

---

### Screen 9: Daytime Mode - Text Input Mode (Desktop)

**Trigger:** Click "+ Text input" button OR Cmd/Ctrl+K

**Layout:**
```
+----------------------------------------------------------+
|                                                           |
|           [Canvas dims to 40% opacity]                    |
|                                                           |
|  +--------------------------------------------------+    |
|  |                                                   |    |
|  |  What's on your mind?                            |    |
|  |                                                   |    |
|  |  [Text area - grows with content]                |    | <- Overlay
|  |                                                   |    |
|  |                                                   |    |
|  |                                                   |    |
|  |  [Submit] [Cancel]                               |    |
|  +--------------------------------------------------+    |
|                                                           |
+----------------------------------------------------------+
```

**Visual Specifications:**

*Text Input Overlay:*
```
Position: Centered
Size:
  - Desktop: 600px width, auto height
  - Min-height: 300px
  - Max-height: 600px
Background: rgba(255, 255, 255, 0.98)
Border-radius: Large (20px)
Shadow: Strong
Padding: 32px
Z-index: 300

Prompt Text:
  - "What's on your mind?"
  - Font: Hero (36px on desktop, 28px tablet, 24px mobile)
  - Color: #2C2C2C at 70% opacity
  - Margin-bottom: 24px
```

*Text Area:*
```
Width: 100% of overlay minus padding
Min-height: 200px
Max-height: 400px
Overflow-y: Auto (if content exceeds max-height)
Background: Transparent
Border: None
Resize: Vertical (user can manually resize)

Text styling:
  - Font: Body (18px for comfortable typing)
  - Color: #2C2C2C
  - Line-height: 1.6
  - Placeholder: "Just start writing..." (#6B6B6B at 50%)

Focus state:
  - Outline: None
  - Auto-focus when overlay opens

Behavior:
  - Auto-grows with content (up to max-height)
  - No character limit
  - Spellcheck: Enabled (browser native)
  - Autocorrect: Disabled (preserve user's exact words)
```

*Character Count:*
```
Position: Below text area, right-aligned
Font: Tiny (11px)
Color: #A8A8A8
Content: "124 words • ~30 second read"
Updates: Real-time as user types
```

*Action Buttons:*
```
Position: Bottom of overlay
Display: Flex, space-between

Cancel Button:
  - Width: 120px
  - Height: 48px
  - Background: Transparent
  - Border: 1px solid #D4CFC5
  - Text: "Cancel" (#6B6B6B, 14px)
  - Border-radius: 24px
  - On hover: Border #A8C5D1
  - On click: Close overlay, discard text

Submit Button:
  - Width: 160px
  - Height: 48px
  - Background: #A8C5D1
  - Text: "Add thoughts" (white, 14px)
  - Border-radius: 24px
  - Disabled state: 
    - If text area empty
    - Background: #D4CFC5
    - Cursor: not-allowed
  - On hover (when enabled): Background darker (#8BA5B8)
  - On click: Process text, create nodes
```

*Keyboard Shortcuts:*
```
Escape: Cancel and close
Cmd/Ctrl + Enter: Submit (same as clicking Submit button)
```

**Processing After Submit:**
```
Animation:
  1. Text area fades to 60% opacity (200ms)
  2. Buttons disable
  3. Processing indicator appears above buttons:
     - Spinner: 24px, #A8C5D1
     - Text: "Processing..." (Caption, #6B6B6B)
  4. AI processes text (2-5 seconds)
  5. New nodes appear on canvas (same animation as voice mode)
  6. Overlay dismisses (500ms fade + slide down)
  7. Canvas returns to full visibility
  8. Focus returns to newly created nodes
```

---

### Screen 10: Privacy Popup (Sensitivity Confirmation)

**Trigger:** Node created with sensitivity confidence < 85%

**Timing:** Appears immediately after node is created (during brain dump processing)

**Layout (Desktop):**
```
+----------------------------------------------------------+
|                                                           |
|         [Canvas visible, slight dim 20%]                  |
|                                                           |
|     +------------------------------------------+          |
|     |                                           |          |
|     |  [Node icon/preview]                     |          |
|     |                                           |          |
|     |  Do you consider "sleep schedule"        |          |
|     |  to be sensitive information?            |          | <- Popup
|     |                                           |          |
|     |  [Yes, keep private] [No, it's fine]    |          |
|     |                                           |          |
|     +------------------------------------------+          |
|                                                           |
+----------------------------------------------------------+
```

**Visual Specifications:**

*Popup Container:*
```
Position: Absolute center of viewport
Size:
  - Desktop: 480px width, auto height
  - Tablet: 400px width
  - Mobile: 90% width, 16px margins
Background: #FFFFFF
Border-radius: Large (20px)
Shadow: Strong (offset-y: 8px, blur: 24px)
Padding: 32px
Z-index: 500
Animation: 
  - Entrance: Scale from 0.9 to 1.0 + fade in (300ms, ease-spring)
  - Has slight bounce at end
```

*Background Overlay:*
```
Full screen coverage
Background: rgba(0, 0, 0, 0.3)
Backdrop-filter: blur(4px)
Z-index: 499
Animation: Fade in (200ms)
Click: Dismisses popup (same as "No" button)
```

*Node Preview:*
```
Position: Top of popup
Size: 64px diameter
Display: Mini version of the actual node
  - Same category gradient
  - Same shape
  - Centered
Margin-bottom: 20px
Animation: Gentle pulse (3s cycle, scale 0.98-1.02)
```

*Question Text:*
```
Font: Heading (20px)
Color: #2C2C2C
Text-align: Center
Line-height: 1.4
Margin-bottom: 8px

Node label emphasized:
  - Wrapped in quotes: "sleep schedule"
  - Bold weight: 500
  - Color: Same as node's category color
```

*Explanation Text (subtle):*
```
Font: Caption (13px)
Color: #6B6B6B at 70% opacity
Text-align: Center
Text: "This helps me protect your privacy"
Margin-bottom: 24px
```

*Action Buttons:*
```
Display: Flex, horizontal, center-aligned
Gap: 16px between buttons

"Yes, keep private" Button:
  - Width: 180px
  - Height: 48px
  - Background: #A8C5D1
  - Text: "Yes, keep private" (white, 14px, medium weight)
  - Border-radius: 24px
  - Icon: Small lock icon (16px) at left
  - On hover: Background darker (#8BA5B8), slight scale 1.02
  - On click: Trigger storage options sub-panel

"No, it's fine" Button:
  - Width: 150px
  - Height: 48px
  - Background: Transparent
  - Border: 1px solid #D4CFC5
  - Text: "No, it's fine" (#6B6B6B, 14px)
  - Border-radius: 24px
  - On hover: Border #A8C5D1, background rgba(168, 197, 209, 0.1)
  - On click: Mark non-sensitive, dismiss popup
```

**If "Yes, keep private" clicked:**

*Storage Options Sub-Panel:*
```
Animation:
  - Previous content slides up and fades (200ms)
  - New content slides up from bottom and fades in (300ms)

New Content:
  
Header:
  - Text: "How should I handle this?"
  - Font: Heading (18px)
  - Color: #2C2C2C
  - Margin-bottom: 16px

Options (3 cards, stacked vertically):

Card 1 (Store locally):
  - Width: 100%
  - Height: 80px
  - Background: rgba(168, 197, 209, 0.1)
  - Border: 2px solid transparent
  - Border-radius: Medium (12px)
  - Padding: 16px
  - Cursor: pointer
  - On hover: Border #A8C5D1, background rgba(168, 197, 209, 0.15)
  
  Content:
    - Icon: 📱 (24px) at left
    - Title: "Store locally only" (Body 16px, medium)
    - Description: "Never leaves your device" (Caption 13px, #6B6B6B)
  
  On click:
    - Checkmark appears at right
    - "Confirm" button appears at bottom

Card 2 (Session only):
  - Same styling as Card 1
  - Icon: 🔒 (24px)
  - Title: "This session only"
  - Description: "I'll see it now, then forget"

Card 3 (Allow storage - optional):
  - Same styling as Card 1
  - Icon: ☁️ (24px)
  - Title: "Allow storage"
  - Description: "Use for learning over time"
  - Note: Appears only in settings, not during first-time popup

Confirm Button (appears after selection):
  - Width: 100%
  - Height: 48px
  - Background: #A8C5D1
  - Text: "Confirm" (white, 14px)
  - Border-radius: 24px
  - Margin-top: 16px
  - On click: Save preference, dismiss popup
```

**If "No, it's fine" clicked:**

```
Animation:
  - Popup scales down slightly (0.95) and fades out (200ms)
  - Background overlay fades out (200ms)
  
Action:
  - Mark node as non-sensitive
  - Update user's sensitivity learning model
  - Continue with brain dump processing
```

**Mobile Adaptations:**

```
Popup:
  - Width: 90% of screen
  - Max-width: 400px
  - Padding: 24px

Buttons:
  - Stack vertically instead of horizontal
  - Full width (100%)
  - "Yes" button on top
  - 12px gap between

Storage option cards:
  - Height: 72px (slightly shorter)
  - Font sizes: -1px from desktop
```

---

### Component Specifications

**Reusable UI Components:**

**1. Button Component**

```css
/* Base Button */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: Inter, sans-serif;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 200ms var(--ease-smooth);
  user-select: none;
}

.button:hover {
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.98);
}

/* Primary Button */
.button--primary {
  background: #A8C5D1;
  color: #FFFFFF;
}

.button--primary:hover {
  background: #8BA5B8;
}

/* Secondary Button */
.button--secondary {
  background: transparent;
  border: 1px solid #D4CFC5;
  color: #6B6B6B;
}

.button--secondary:hover {
  border-color: #A8C5D1;
  background: rgba(168, 197, 209, 0.1);
}

/* Danger Button */
.button--danger {
  background: #C58F8F;
  color: #FFFFFF;
}

.button--danger:hover {
  background: #B57F7F;
}

/* Size Variants */
.button--small {
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  border-radius: 16px;
}

.button--medium {
  height: 48px;
  padding: 0 24px;
  font-size: 14px;
  border-radius: 24px;
}

.button--large {
  height: 56px;
  padding: 0 32px;
  font-size: 16px;
  border-radius: 28px;
}

/* Disabled State */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

**2. Node Component (SVG/Canvas)**

```javascript
// Node structure for rendering
class Node {
  constructor(data) {
    this.id = data.id;
    this.label = data.label;
    this.x = data.x;
    this.y = data.y;
    this.size = data.size; // diameter in px
    this.category = data.category;
    this.connections = data.connections;
    this.selected = false;
    this.hovered = false;
  }
  
  get color() {
    const gradients = {
      organic: ['#E8C5B5', '#D4A89F'],
      technical: ['#A8C5D1', '#8BA5B8'],
      creative: ['#D5B8D4', '#B89FB8'],
      learning: ['#B8D4C2', '#9FB89F'],
      personal: ['#F5E6D3', '#D4C5B5']
    };
    return gradients[this.category] || gradients.personal;
  }
  
  get scale() {
    if (this.selected) return 1.15;
    if (this.hovered) return 1.05;
    return 1.0;
  }
  
  get opacity() {
    if (this.selected) return 1.0;
    // If any node is selected, dim others
    if (graph.hasSelection && !this.selected) return 0.4;
    return 1.0;
  }
  
  get shadow() {
    if (this.selected) return 'strong';
    if (this.hovered) return 'medium';
    return 'subtle';
  }
  
  render(ctx) {
    // Implementation depends on Canvas vs SVG choice
    // This is pseudo-code for structure
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = this.opacity;
    
    // Draw shadow
    ctx.shadowBlur = this.getShadowBlur();
    ctx.shadowOffsetY = this.getShadowOffset();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    
    // Draw circle with gradient
    const gradient = ctx.createLinearGradient(
      -this.size/2, -this.size/2,
      this.size/2, this.size/2
    );
    gradient.addColorStop(0, this.color[0]);
    gradient.addColorStop(1, this.color[1]);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw stroke
    ctx.strokeStyle = this.getDarkerColor(this.color[1], 0.2);
    ctx.lineWidth = this.selected ? 3 : 2;
    ctx.stroke();
    
    // Draw label
    ctx.fillStyle = '#2C2C2C';
    ctx.font = this.getLabelFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.truncateLabel(), 0, 0);
    
    ctx.restore();
  }
  
  truncateLabel() {
    const maxWidth = this.size - 16;
    // Measure text and truncate if needed
    return this.label.length > 20 
      ? this.label.substring(0, 17) + '...'
      : this.label;
  }
}
```

**3. Connection Line Component**

```javascript
class Connection {
  constructor(source, target, type, strength) {
    this.source = source;  // Node reference
    this.target = target;  // Node reference
    this.type = type;      // 'solid', 'dashed', 'dotted'
    this.strength = strength; // 0-1
  }
  
  get opacity() {
    if (this.strength > 0.8) return 0.9;
    if (this.strength > 0.5) return 0.7;
    if (this.strength > 0.2) return 0.4;
    return 0.2;
  }
  
  get thickness() {
    if (this.strength > 0.9) return 2.0;
    if (this.strength < 0.3) return 1.0;
    return 1.5;
  }
  
  get dashPattern() {
    switch(this.type) {
      case 'dashed': return [8, 4];
      case 'dotted': return [2, 4];
      default: return [];
    }
  }
  
  render(ctx) {
    // Get node positions
    const start = { x: this.source.x, y: this.source.y };
    const end = { x: this.target.x, y: this.target.y };
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.lineWidth = this.thickness;
    ctx.setLineDash(this.dashPattern);
    
    // Create color gradient from source to target
    const gradient = ctx.createLinearGradient(
      start.x, start.y, end.x, end.y
    );
    gradient.addColorStop(0, this.source.color[1]);
    gradient.addColorStop(1, this.target.color[1]);
    ctx.strokeStyle = gradient;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    ctx.restore();
  }
}
```

**4. Breathing Wave Component (2AM Mode)**

```javascript
class BreathingWave {
  constructor(canvasHeight) {
    this.height = canvasHeight;
    this.baseAmplitude = 40;
    this.frequency = 0.02;
    this.phase = 0;
    this.breathCycle = 4000; // 4 seconds
    this.startTime = Date.now();
  }
  
  update() {
    const elapsed = Date.now() - this.startTime;
    const breathProgress = (elapsed % this.breathCycle) / this.breathCycle;
    
    // Sine wave for smooth breathing
    this.breathScale = Math.sin(breathProgress * Math.PI * 2) * 0.2 + 1.0;
    this.phase += 0.01;
  }
  
  render(ctx, width) {
    ctx.save();
    
    // Position at bottom
    ctx.translate(0, this.height - 80);
    
    // Apply breathing scale
    ctx.scale(1, this.breathScale);
    
    // Draw wave
    ctx.fillStyle = 'rgba(168, 197, 209, 0.6)';
    ctx.filter = 'blur(8px)';
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    // Generate wave points
    for (let x = 0; x <= width; x += 5) {
      const y = Math.sin(x * this.frequency + this.phase) * this.baseAmplitude;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, 120);
    ctx.lineTo(0, 120);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
```

---

### Performance Optimization Guidelines

**Graph Rendering:**

```
For Canvas API:
  - Use requestAnimationFrame for smooth 60fps
  - Only redraw nodes in viewport (frustum culling)
  - Use offscreen canvas for node rendering (cache)
  - Batch draw calls (all nodes, then all connections)
  - Use web workers for physics calculations

For SVG:
  - Use CSS transforms for node movement (hardware accelerated)
  - Limit DOM nodes with virtualization for large graphs (500+ nodes)
  - Use CSS will-change for frequently animated elements
  - Debounce pan/zoom events (16ms)

Memory Management:
  - Cap visible nodes at 200 (virtualize rest)
  - Lazy load node details (only when info panel opens)
  - Clean up event listeners on unmount
  - Use object pooling for frequently created/destroyed elements
```

**Animation Performance:**

```
Use CSS transforms over position changes:
  ✅ transform: translate3d(x, y, 0)
  ❌ left: x, top: y

Enable GPU acceleration:
  - transform: translateZ(0)
  - will-change: transform (sparingly)

Reduce paint areas:
  - Use contain: layout style paint
  - Isolate animated layers with z-index
  
Limit concurrent animations:
  - Max 20 nodes animating simultaneously
  - Stagger node appearances (100ms between)
  - Cancel off-screen animations
```

---

### Accessibility Guidelines

**Keyboard Navigation:**
```
Tab: Navigate between interactive elements
Enter/Space: Activate buttons
Escape: Close modals/panels
Arrow keys: Pan canvas (50px per press)
+/-: Zoom in/out
Home: Reset view to default
```

**Screen Reader Support:**
```
All interactive elements have aria-labels
Graph description: "Interactive thought map with X nodes"
Node: "Topic: [label], mentioned [n] times, connected to [m] other topics"
Announce state changes: "Node selected", "Recording started", etc.
```

**Visual Accessibility:**
```
Color contrast ratio: Minimum 4.5:1 for text
Focus indicators: 2px solid outline, high contrast
Reduced motion mode: 
  - Disable all non-essential animations
  - Use simple fades instead of complex transitions
  - prefers-reduced-motion media query

Font scaling: Support up to 200% browser zoom
Touch targets: Minimum 44x44px (WCAG AAA)
```

---

### Browser & Device Support

**Minimum Browser Versions:**
```
Chrome: 90+
Firefox: 88+
Safari: 14+
Edge: 90+

Mobile:
  iOS Safari: 14+
  Chrome Android: 90+
```

**Required APIs:**
```
Essential:
  - Web Audio API (for voice recording & visualization)
  - Canvas API or SVG (for graph rendering)
  - LocalStorage (for data persistence)
  - Intersection Observer (for viewport detection)

Progressive Enhancement:
  - Web Speech API (fallback: manual transcript)
  - Vibration API (fallback: visual feedback only)
  - Service Worker (for offline support, not required for MVP)
```

**Responsive Testing Breakpoints:**
```
Desktop Large: 1440px, 1920px
Desktop: 1024px, 1280px
Tablet: 768px, 1024px (landscape)
Mobile: 375px, 414px, 390px
Small Mobile: 320px (minimum support)
```
