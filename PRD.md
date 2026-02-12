# Product Requirements Document: Mental Clarity App

## Product Overview

A visual thought organization app that provides psychological relief through spatial externalization of mental chaos. The app creates a liminal space where users can offload overwhelming thoughts, visualize their mental landscape as an interactive node graph, and find clarity without prescriptive guidance.

**Core Problem:** People experience mental paralysis from competing thoughts, overwhelming to-do lists, and cognitive overload. Traditional productivity tools add friction by demanding categorization, decision-making, and structured input when users are least capable of providing it.

**Solution:** A voice-first, visually-driven interface that accepts unstructured brain dumps, automatically structures them into an explorable graph, and adapts to the user's mental state (crisis vs. exploration).

---

## Vision & Goals

**Primary Goal:** Enable users to feel immediate psychological relief by externalizing mental chaos into a visual structure they can interact with on their terms.

**Feeling Target:** Users should feel:
- **During 2am crisis dumps:** Safe, heard, transported to another space, able to release
- **After 2am dumps:** Free, lighter, like they can breathe, that it's okay to rest
- **During daytime exploration:** Clear, curious, in control, able to see patterns in their thinking
- **General interaction:** Like using Tony Stark's Jarvis - fluid, responsive, intelligent, smooth

**Emotional Design Principle:** The interface is the therapy. Every visual element, animation, and interaction serves psychological function first, utility second.

---

## Core Principles

1. **No text unless absolutely necessary** - Communication happens through visual language: color, motion, proximity, depth, opacity
2. **Zero decision-making during crisis** - 2am mode removes all choice except the cathartic gesture
3. **The graph is the guidance** - No AI suggestions or prompts. The spatial structure of the user's own thoughts reveals what matters
4. **Respect vulnerability** - When users are in crisis, the app creates boundaries they can't set for themselves (forced rest, app lock)
5. **Progressive trust through transparency** - Privacy controls are embedded in the experience, not hidden in settings
6. **Local-first, user-owned data** - All personal context stays on device. User sees and controls everything the app knows

---

## User Experience Flows

### Activation (Universal Entry Point)

**Trigger:** Hold iPhone action button

**Experience:**
- App launches (smooth, not instant - gentle fade-in from black)
- No splash screen, no loading indicators
- Directly into mode-appropriate experience

---

### 2AM Mode (Crisis/Vulnerable State)

**Automatically activates when:** Time is between 10pm - 7am OR sentiment analysis detects high stress

#### Opening Sequence (5 seconds)

**Visual:**
- Beige background
- Soft blue breathing wave at bottom of screen, pulsing gently
- Screen edges pulse in sync with wave
- White/translucent flowers (tulips, roses) slowly bloom - vibrant but colorless
- Behind flowers: faint shimmer of past graph/thoughts (barely visible)
- Optional: Personalized calming imagery (partner photo, family, nature) if user has shared this data

**Audio:**
- Soft ambient tone synchronized to breathing wave
- No voice, no prompts

**Function:** Transport user from anxious state into liminal space where they can safely release

#### Brain Dump Phase

**Visual:**
- Flowers continue blooming/pulsing with user's voice
- Breathing wave responds to speech cadence
- Background hints at nodes forming but stays abstract
- User can look at screen, ceiling, window - display is neutral and works in any case

**Audio:**
- Subtle pulse tone when user speaks (confirms recording even if not looking)
- After 15 seconds of silence: gentle audio cue meaning "still here, waiting"

**Interaction:**
- No taps, no swipes, no decisions
- Just speak
- If user accidentally stops: 30-second silence threshold before processing

#### Processing Phase

**What happens:**
- AI extracts topics and creates nodes
- Identifies sentiment and connection potential
- **Does NOT connect nodes** - keeps them disconnected
- Identifies the ONE node with highest emotional weight

**Visual:**
- Flowers begin fading
- Disconnected nodes appear in space
- Everything except the highest-weight node dims (opacity reduction)
- The key node glows/shines, comes to center
- User faces the single thing that's been consuming them

#### Cathartic Gesture

**User chooses through gesture (no prompt):**

**Option 1: Destruction**
- Drag and throw → node shatters into dissolving particles
- Press and hold → node cracks and breaks apart

**Option 2: Transformation**
- Node breaks into smaller manageable pieces that gently arrange themselves
- Flowers from opening sequence enclose the node protectively
- Node shrinks and moves to edge of view

**Option 3: Containment**
- Drag node into visible container (jar/box visual)
- Represents "I see you, but you don't control me"

#### Closure

**Visual:**
- Screen fades to black
- Single text appears: "Get some rest"
- Breathing guide animation for 10-15 seconds
- App closes automatically

**System Behavior:**
- App locks and cannot be reopened until morning (default 9am)
- **No emergency override** - absolute boundary
- Wake time is user-configurable in settings
- Morning unlock is silent - no notification

### Personalized Calming Imagery (Opening Sequence Detail)

**Imagery Selection Logic:**
- System maintains "calming triggers" database from user conversations
- Extracted from past brain dumps when user mentions things that make them happy/calm
- Examples learned: "my partner", "my family", "nature", "the ocean", "my dog Max"

**Implementation:**
- First 3-5 uses: no personalized imagery (system doesn't know user yet)
- After sufficient data: randomly select 1 calming image from learned triggers
- Image appears semi-transparent, layered with the blooming flowers
- Never the same image twice in a row
- If no learned triggers exist: defaults to abstract calming patterns only

**Privacy:** 
- Images referenced are not stored by app
- User's device photos/contacts are never accessed without explicit permission
- System only stores text descriptions: "partner" or "family" not actual photos

### Silence Handling Specification

**During Brain Dump:**
- **0-15 seconds silence:** Continue recording, no feedback
- **15 seconds silence:** Gentle audio cue (soft tone, 0.3 seconds)
  - Meaning: "Still here, listening, take your time"
  - Visual: breathing wave pulses slightly stronger once
- **30 seconds silence:** Assume user is done, begin processing
  - Fade breathing wave out
  - Begin processing animation

**Accidental Pause Recovery:**
- If user speaks again after 20-25 seconds (during the "about to end" window): immediately resume full recording mode
- No jarring restart - seamless continuation


---

### Daytime Mode (Active Exploration)

**Automatically activates when:** Time is 7am - 10pm OR user opens app in calm state

#### Opening

**Visual:**
- App opens to full interactive graph
- All nodes visible, connections active
- Graph in same state user left it
- Breathing wave subtly present at bottom but minimal
- Beige/neutral color palette with soft blue accents

**No prompts, no "What's on your mind?" unless user initiates new dump**

#### Graph Interaction

**Node Properties:**
- **Size** = mental space/frequency of mention
- **Color gradients** = category/context (food warmer, tech cooler, etc)
- **Line style** = relationship type (solid/dotted/dashed)
- **Line opacity** = connection strength
- **Spatial clustering** = related concepts naturally group
- **Position** = user can drag to reorganize OR auto-layout by connection strength

**Interactions:**

**Single Click:** 
- Info panel appears (Notion/Obsidian-style or immersive overlay)
- Shows: original text from brain dumps, timestamps, sub-nodes
- User can manually add notes/text here if desired
- Opacity dims everything else, focuses on selected node

**Double Click:**
- Animation: zoom into node
- Reveals sub-nodes (hierarchical tree structure)
- Example: "Food" → "Vegetables" / "Meat" / "Opinions" → "I hate ketchup"

**Multi-parent nodes:**
- "Animals" can exist under both "Food" and "Photography"
- Visually: single node with connections to multiple parent umbrellas
- When double-clicking: sub-nodes spatially cluster by parent context
  - Food-related children appear in one direction (warmer visual properties)
  - Photography-related children appear in another direction (cooler properties)
- Context communicated through: spatial arrangement, color gradients, proximity

**Graph Navigation:**
- Pinch to zoom
- Two-finger drag to pan
- Default view shows: most recent 3 sessions + highest-frequency umbrella nodes
- Zoom out reveals full history with auto-layout

#### New Brain Dump (Daytime)

**Trigger:** User taps voice input button OR types in "What's on your mind?" text field

**Experience:**
- More direct than 2am mode
- Shows nodes forming in real-time
- Soft background blur, new nodes appear in focus
- Connections form immediately as AI processes
- When done: nodes integrate into main graph with smooth animation

**Processing:**
- AI extracts topics, creates nodes
- Identifies relationships, creates connections
- Nodes integrate into existing graph structure
- Auto-layout adjusts to accommodate new information

### Manual Input Option

**Text Input Alternative:**
- While voice is primary, users can type if:
  - In public space (can't speak aloud)
  - Prefer writing for certain topics
  - Voice recognition failing

**Access:**
- Small keyboard icon next to voice button
- Tapping opens minimal text field with "What's on your mind?" placeholder
- Typing experience: clean, distraction-free (no autocorrect suggestions, no keyboard sounds)
- Submit by pressing return/done

**Processing:** Identical to voice dumps - text parsed same way, creates nodes same way

### View States & Zoom Levels

**Default View (100% zoom):**
- Shows umbrella nodes + most recent 3 sessions' detail nodes
- Comfortable density - nodes not overlapping
- Dot grid visible but subtle

**Zoomed In (200-400%):**
- Focus on specific cluster
- Dot grid fades away
- Node labels fully readable
- Connection lines thicker, easier to trace
- Individual node details more prominent

**Zoomed Out (25-50%):**
- See entire graph history
- Dot grid more prominent (helps spatial orientation)
- Node labels hidden (just shapes and connections)
- Clusters become clear
- Good for "big picture" understanding

**Pan & Navigate:**
- Two-finger drag to pan (iOS standard)
- Double-tap background to return to default view
- Pinch to zoom (standard gesture)
- Smooth momentum scrolling

---

## Features & Functionality

### Core Features

**Voice Input**
- Primary input method
- Action button integration (iPhone)
- Real-time transcription (optional display)
- Ambient noise filtering
- Multi-language support

**AI Processing**
- Topic extraction and node creation
- Relationship detection and connection mapping
- Sentiment analysis (for 2am mode highlighting)
- Umbrella term identification (most ambiguous/general terms become parent nodes)
- Confidence scoring for umbrella inference

**Node Graph System**
- Interactive force-directed graph OR user-controlled spatial layout
- Multi-parent node support (one node can connect to multiple umbrellas)
- Hierarchical depth (nodes contain sub-nodes infinitely)
- Visual encoding: size, color, opacity, line style, spatial position
- Persistent user arrangements

**Sensitivity & Privacy**
- AI assigns confidence score (0-100) to each node's sensitivity
- If confidence < 85%: trigger privacy popup
- Popup: "Do you consider '[node topic]' to be sensitive information?" Yes/No
- Sensitive nodes get special icon/marker
- Per-node data storage options:
  - 📱 Store locally only (never leaves device)
  - 🔒 Process this session only (AI sees, then forgets)
  - ☁️ Allow storage (persists, used for learning)
- User can reclassify any node anytime in settings

**Mode Detection**
- Time-based (10pm-7am = crisis, 7am-10pm = exploration)
- Sentiment-based override (high stress triggers crisis mode even during day)
- User can manually toggle if needed

**Topic Extraction:**
- Parse transcript into semantic chunks
- Identify nouns, concepts, actions, and themes
- Group related mentions across the session
- Output: List of topics with frequency counts

**Umbrella Term Detection:**
- Algorithm: Identify the most ambiguous/general terms user naturally uses to describe groups of concepts
- Process:
  1. Analyze semantic relationships between extracted topics
  2. Find terms that could encompass multiple other terms
  3. Score each potential umbrella by ambiguity (0-100, higher = more general)
  4. If score > 70: automatically designate as umbrella
  5. If score 50-70: flag for user confirmation with confidence indicator
  6. If score < 50: treat as leaf node unless manually promoted by user
- Examples: "Food" is umbrella for "vegetables, meat, ketchup opinions" | "Projects" is umbrella for "AGRISCAN, Seikna, Unity Provisions"

**Relationship Detection:**
- Types of relationships to detect:
  - **Direct mention** (topics mentioned in same sentence): solid line
  - **Semantic similarity** (related concepts not explicitly linked): dashed line  
  - **Temporal clustering** (topics discussed together in time): dotted line
  - **Transitive** (connected through shared parent/child): thin solid line

**Connection Strength Calculation:**
- Formula: `strength = (co-mention_frequency × 0.5) + (semantic_similarity × 0.3) + (temporal_proximity × 0.2)`
- Normalized 0-1 scale
- Visual encoding: opacity of connection line (1.0 = fully opaque, 0.3 = barely visible)

**Sentiment Analysis (2am Mode Only):**
- Score each node for emotional weight: 0-100
- Factors: negative sentiment keywords, repetition, intensity markers, speech patterns
- Highest-scoring node becomes the highlighted "facing your demons" node
- Threshold: only highlight if score > 60 (otherwise show all nodes equally)

### Secondary Features

**Umbrella Node Creation**
- AI identifies most ambiguous/general terms user naturally uses
- If no clear umbrella exists, AI infers with confidence score
- If confidence low: "I grouped this under '[term]' - does that work?" (minimal visual prompt)
- User confirms or provides alternative
- System learns user's taxonomy over time

**Time-Based Functionality**
- 2am dumps: minimal processing, highlight one node, force rest
- Daytime dumps: full processing, immediate integration, active exploration
- No reminders or notifications (user decides when to engage)

**Search & Filter**
- Text search across all nodes
- Filter by: time created, frequency, sensitivity, umbrella category
- Highlight search results in graph

**Export & Backup**
- Export full graph as JSON
- Export individual nodes as markdown
- Manual backup/restore
- Automatic local backup daily

---

## Sensitivity Detection & Privacy Learning

### Confidence Scoring System

**Initial Classification:**
- Every node receives sensitivity confidence score on creation: 0-100
- Score represents: "How confident is the AI that this is/isn't sensitive information?"
- Threshold: **85** (if confidence < 85, trigger user confirmation)

**Scoring Factors:**
- Explicit privacy keywords (health, money, relationships, location, schedule, passwords, names)
- Contextual sensitivity (tone, associated emotions, specificity of details)
- Category patterns (medical topics, financial data, personal conflicts)

**Examples:**
- "I want to learn guitar" → confidence: 95 (clearly not sensitive, no popup)
- "I'm struggling with my sleep schedule" → confidence: 70 (health-related, trigger popup)
- "AGRISCAN project deadline" → confidence: 88 (work topic, slightly ambiguous but passes threshold)
- "My therapy appointment" → confidence: 30 (clearly sensitive, trigger popup)

### Privacy Popup Flow

**Trigger:** Any node with sensitivity confidence < 85

**Visual:**
- Soft overlay (not harsh modal)
- Focused on the specific node in question
- Node glows gently to show which topic is being discussed

**Content:**
```
"Do you consider '[node topic]' to be sensitive information?"

[Yes, keep private]  [No, it's fine]
```

**Response Handling:**

If **Yes:**
- Node marked with small privacy icon (lock symbol, subtle)
- Storage options presented:
  ```
  How should I handle this?
  
  📱 Store locally only
  Never leaves your device
  
  🔒 This session only  
  I'll see it now, then forget
  
  [Later in Settings, if they change mind:]
  ☁️ Allow storage
  Use for learning over time
  ```

If **No:**
- Node treated as non-sensitive
- Default storage applies
- System learns: similar topics in future won't trigger popup

### Learning User's Sensitivity Boundaries

**Pattern Recognition:**
- Track user's yes/no responses over first 10-20 popups
- Build sensitivity profile:
  - "User marks health topics as sensitive: YES"
  - "User marks work projects as sensitive: NO"  
  - "User marks family/relationships as sensitive: YES"
  - "User marks hobbies as sensitive: NO"

**Adaptive Confidence:**
- After learning period, adjust confidence scores based on user's patterns
- Example: If user consistently marks sleep-related topics as non-sensitive, future sleep nodes get confidence boost to 90+
- Reduces popup frequency over time while maintaining privacy-first approach

**Edge Cases:**
- If same topic gets different answers (sometimes sensitive, sometimes not): always err on side of caution, ask every time
- User can always override in settings: "Never ask about [category]" or "Always ask about [category]"

---

## Visual Design Requirements

### Color Palette

**Primary:**
- Beige/warm neutral backgrounds (#F5F1E8)
- Soft blue accents for calm elements (#A8C5D1)
- White with variable opacity for flowers/overlays

**Secondary:**
- Warm gradients for organic concepts (food, relationships, creativity)
- Cool gradients for technical concepts (coding, engineering, analysis)
- Muted, never saturated
- High contrast avoided - everything gentle

### Animation Principles

**Breathing/Organic Motion:**
- Nothing mechanical or rigid
- Nodes bloom, don't pop
- Connections flow like water, don't snap
- Transitions are exhales, not cuts

**Timing:**
- Opening sequences: 5 seconds
- Breathing guides: 10-15 seconds
- Node appearance: 0.8-1.2 second fade/grow
- Gesture responses: immediate but smooth (0.3s)

**Physics:**
- Graph has subtle drift/float when idle
- Nodes have soft collision boundaries
- Connections have tension/elasticity

### Typography

**Minimal usage:**
- "What's on your mind?" - primary input prompt (only text in daytime mode)
- "Get some rest" - 2am closure (only text in crisis mode)
- Node labels - user's own words, no modification
- Settings/controls - necessary UI only

**Font:**
- Clean, modern sans-serif
- Light/regular weights only
- Generous spacing
- High legibility at all sizes

### Spatial Design

**The Dot Grid:**
- Subtle dot grid background (whiteboard/graph paper aesthetic)
- Infinite canvas feel
- Dots fade when zoomed in, visible when zoomed out
- Reference points without constraint

**Negative Space:**
- Massive breathing room
- Nothing crowded or dense
- Emptiness is intentional - room to think

**Visual Hierarchy:**
- Depth through opacity, not size jumps
- Foreground/background separation subtle but clear
- Focused elements never harsh - still soft

**Line Style Encoding:**
- **Solid line**: Direct co-mention (topics discussed in same sentence/context)
- **Dashed line**: Semantic similarity (related concepts, not explicitly linked)
- **Dotted line**: Temporal clustering (discussed together in time, but different contexts)

**Line Opacity Encoding:**
- **0.9-1.0 opacity**: Very strong connection (connection strength > 0.8)
- **0.6-0.8 opacity**: Strong connection (strength 0.5-0.8)
- **0.3-0.5 opacity**: Weak connection (strength 0.2-0.5)
- **< 0.3 opacity**: Very weak connection (strength < 0.2)

**Line Color Encoding:**
- Generally matches the color gradient of the source node
- Subtle gradient from source node color to target node color
- If both nodes same category: solid category color
- If different categories: gradient blend

**Line Thickness:**
- Standard: 1.5px
- Selected/highlighted: 3px
- Very strong connections (> 0.9): 2px
- Very weak connections (< 0.3): 1px

---

## Technical Requirements

### Platform

**Phase 1:** iOS (iPhone 17 action button integration essential)
**Future:** Web, Android, iPad

### Tech Stack Recommendations

**Frontend:**
- React Native OR native Swift (for best action button integration)
- Graph visualization: D3.js, Cytoscape.js, or React Flow
- Animation: Framer Motion or native iOS animation frameworks
- Voice: Native iOS speech recognition APIs

**Backend:**
- **Local-first architecture** - all data stored on device by default
- IndexedDB or SQLite for graph data
- Optional: Sync layer (user-controlled) for multi-device

**AI Integration:**
- Claude API (Sonnet) for:
  - Topic extraction
  - Relationship mapping
  - Sentiment analysis
  - Umbrella term identification
- Processing happens on-device when possible, API for complex analysis
- No conversation history sent - only current brain dump text
- Persistent context (graph structure, user preferences) stays local

### Graph Auto-Layout Algorithm

**Force-Directed Layout (Primary Method):**
- Nodes repel each other (prevent overlap)
- Connected nodes attract each other
- Attraction force proportional to connection strength
- Physics simulation runs for 2-3 seconds after changes, then settles

**Clustering Behavior:**
- Highly connected nodes naturally cluster together
- Umbrella nodes have stronger gravitational pull on their children
- Orphan nodes (no connections) drift to periphery

**User Override:**
- If user manually drags a node: lock that node's position
- Locked nodes don't participate in auto-layout
- User can unlock by double-tapping node (subtle animation indicates unlock)

**Layout Refresh Triggers:**
- New nodes added during brain dump
- User deletes a node
- User manually reorganizes and wants to "reset" (button in settings)

### Data Architecture

**Node Object:**
```
{
  id: unique_id,
  label: string (user's words),
  type: "umbrella" | "detail" | "leaf",
  parents: [node_ids],
  children: [node_ids],
  connections: [{target_id, strength, style}],
  created: timestamp,
  last_accessed: timestamp,
  frequency: integer,
  sentiment_score: float,
  sensitivity: "public" | "local_only" | "session_only",
  user_notes: string (optional),
  position: {x, y} (if user-arranged),
  metadata: {
    source_session: session_id,
    raw_text: original_transcript_segment
  }
}
```

**Session Object:**
```
{
  id: unique_id,
  timestamp: datetime,
  mode: "crisis" | "exploration",
  duration: seconds,
  transcript: string,
  nodes_created: [node_ids],
  highlight_node: node_id (for 2am mode),
  gesture_chosen: "destroy" | "transform" | "contain" (for 2am)
}
```

### Performance Requirements

- Graph renders smoothly up to 500+ nodes
- Real-time node creation during voice input (< 100ms latency)
- Smooth 60fps animations throughout
- App launch < 1 second even with large graphs
- Voice-to-processing pipeline < 3 seconds

### Security & Privacy

- **All data encrypted at rest** (device-level encryption)
- **No telemetry or analytics** unless user explicitly opts in
- **API calls are stateless** - Claude API receives text, returns structure, remembers nothing
- **Sensitive data never leaves device** unless user explicitly chose "Allow storage" option
- **User can export and delete all data** at any time

---

## Privacy & Ethics Framework

### Consent Model

**First Launch:**
- Clear onboarding: "This app learns about you through conversation. The more you share, the more helpful it becomes."
- "You can always see what I know about you and delete anything."
- "Your data stays on your device unless you explicitly choose otherwise."

**During Use:**
- Sensitivity detection triggers inline consent
- No hidden data collection
- Visual indicators show what's being stored vs. processed

### Transparency Requirements

**Settings Menu Includes:**
- "What I Know About You" - browsable list of all inferred information
- Per-node data storage settings
- Ability to delete specific nodes, sessions, or entire graph
- Export all data as JSON
- Clear cache/reset app

### Ethical Boundaries

**The app will NOT:**
- Provide medical advice or mental health diagnoses
- Suggest clinical interventions
- Replace professional therapy
- Make claims about treating mental health conditions
- Use manipulative dark patterns to increase engagement

**The app IS:**
- A tool for self-reflection and organization
- A personal knowledge base
- A way to externalize thoughts
- A cognitive aid for clarity

---

## Success Metrics

### Psychological Impact (User Self-Report)

- "I felt relief after using this" (target: 85%+ agree)
- "I was able to sleep better after a 2am dump" (target: 75%+ agree)
- "I understand my thoughts better after exploring the graph" (target: 80%+ agree)
- "This helped me start a task I was avoiding" (target: 70%+ agree)

### Engagement (Healthy Use Patterns)

- Median session length: 3-8 minutes (not hours)
- 2am mode usage leads to app lock and rest (not continued scrolling)
- Users return to daytime mode within 24 hours of 2am dump (indicates they process, not just vent)
- Graph exploration leads to action (external apps, calendar entries, etc)

### Technical Performance

- 95th percentile app launch time < 1.5s
- Zero dropped frames during animations
- Voice-to-node latency < 3s
- Zero data loss incidents

### Privacy Adherence

- 100% of sensitive data flags reviewed by user within first 5 sessions
- < 5% of users ever enable cloud storage (indicates trust in local-first)
- Zero privacy-related support tickets

---

## Open Design Questions

**To be resolved during prototyping:**

1. **Exact visual encoding of connection types** - what does solid vs dotted vs dashed actually represent?
2. **Multi-parent node display complexity** - when one node has 4+ parents, how do we prevent visual chaos?
3. **Graph pruning strategy** - do old nodes ever archive/fade, or does the graph grow infinitely?
4. **Voice input accessibility** - how do users without action buttons (Android, web) activate crisis mode quickly?
5. **Gesture vocabulary** - are destroy/transform/contain the right three options, or do we need more/fewer?
6. **Notification strategy** - we decided no morning notifications, but do we need ANY notifications ever?
**Additional items to resolve:**
7. **Multi-parent visual complexity threshold** - at what point (4 parents? 6?) do we need alternate visualization?
8. **Graph size limits** - should we cap total nodes (1000? 5000?) for performance?
9. **Accidental deletion protection** - should there be "undo" for node deletion?
10. **Voice input in loud environments** - noise cancellation sufficient or need visual feedback that transcription is poor quality?
11. **Notification strategy** - definitively: do we need any notifications ever, or is it 100% user-initiated?
12. **First-time onboarding** - how much guidance do new users need without breaking the "minimal text" principle?

---

## Non-Goals (Out of Scope)

- Social features / sharing graphs with others
- Gamification / streaks / achievements
- AI-generated summaries or reports
- Integration with other productivity tools (calendars, task managers)
- Collaboration / multiplayer features
- Mood tracking as primary function
- Prescribed routines or programs
- **Audio output / text-to-speech** - app never speaks to user
- **Prescribed meditation / breathing exercises** - breathing guide is passive, not instructional
- **Mental health assessment / screening** - no diagnostic capabilities
- **Behavioral change programs** - no "30-day challenges" or structured courses
---

This PRD captures the vision. Build with the feeling in mind - every technical choice should serve the psychological goal of providing relief, clarity, and agency without adding cognitive burden.