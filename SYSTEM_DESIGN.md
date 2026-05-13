# Real Agent Insight -- System Design Document

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Technology Stack](#4-technology-stack)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [State Management](#6-state-management)
7. [Persistence Layer (localStorage)](#7-persistence-layer-localstorage)
8. [External API Integrations](#8-external-api-integrations)
9. [Design System](#9-design-system)
10. [Notable Implementation Patterns](#10-notable-implementation-patterns)
11. [Security Considerations](#11-security-considerations)
12. [Marketing Site](#12-marketing-site)

---

## 1. System Overview

Real Agent Insight is a real estate client discovery and intelligence tool that lets agents record voice answers to 110 structured questions across 8 domains, research neighborhoods via interactive Google Maps with AI-personalized place suggestions, and generate aggregated client profiles. The app runs without a build system -- React 18 and Babel are loaded via CDN for in-browser JSX transpilation. The backend is a single Express.js server with one API endpoint that calls Claude AI. All user data persists in the browser's localStorage, scoped per client.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ index.html │  │  app.js    │  │  data.js   │  │  styles.css  │  │
│  │ (entry     │  │ (all React │  │ (110 Q's,  │  │ (design      │  │
│  │  point,    │  │  comps,    │  │  8 domains, │  │  system,     │  │
│  │  CDN       │  │  ~2000     │  │  window.   │  │  CSS vars,   │  │
│  │  scripts)  │  │  lines)    │  │  questions) │  │  ~770 lines) │  │
│  └────────────┘  └─────┬──────┘  └────────────┘  └──────────────┘  │
│                        │                                            │
│          ┌─────────────┼──────────────┐                             │
│          ▼             ▼              ▼                              │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐                    │
│  │ Web Speech   │ │ Google   │ │ localStorage │                    │
│  │ API          │ │ Maps JS  │ │              │                    │
│  │ (browser     │ │ API      │ │ clients,     │                    │
│  │  native)     │ │ (CDN)    │ │ transcripts, │                    │
│  │              │ │          │ │ favorites,   │                    │
│  │ Voice-to-    │ │ Maps,    │ │ suggestions, │                    │
│  │ text via     │ │ Places,  │ │ location     │                    │
│  │ Speech       │ │ Geocode, │ │ research     │                    │
│  │ Recognition  │ │ Street   │ │              │                    │
│  │              │ │ View,    │ │              │                    │
│  │              │ │ Distance │ │              │                    │
│  └──────────────┘ └────┬─────┘ └──────────────┘                    │
│                        │                                            │
└────────────────────────┼────────────────────────────────────────────┘
                         │
            POST /api/suggest-places
            { transcripts[] }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVER (Express.js)                            │
│                                                                     │
│  server.js                                                          │
│  ├── Static file serving (app/ directory)                           │
│  └── POST /api/suggest-places                                       │
│      IN:  { transcripts: [{category, question, transcript}] }       │
│      OUT: [{label, type, keyword, reason}]  (3-8 suggestions)       │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                  Anthropic SDK
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│                                                                     │
│  ┌───────────────────┐    ┌───────────────────────────────────┐     │
│  │  Claude AI         │    │  Google Cloud Platform             │     │
│  │  (Anthropic API)   │    │                                   │     │
│  │                    │    │  Maps JavaScript API               │     │
│  │  Model: opus-4-6   │    │  Places API (nearbySearch,         │     │
│  │  Thinking:         │    │             getDetails)            │     │
│  │    adaptive        │    │  Geocoding API                     │     │
│  │  Max tokens: 1024  │    │  Street View API                   │     │
│  │                    │    │  Distance Matrix API                │     │
│  │  Analyzes client   │    │                                   │     │
│  │  transcripts and   │    │  All called client-side from       │     │
│  │  returns place     │    │  MapExplorer component             │     │
│  │  suggestions       │    │                                   │     │
│  └───────────────────┘    └───────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Hierarchy

```
App (app.js:1861-2002)
│
├── isAuthenticated === false
│   └── LoginView (app.js:66-145)
│       props: { onLogin }
│       ├── Email/password form with client-side validation
│       └── Google Sign-In button (mock, non-functional)
│
├── isAuthenticated && !currentClient
│   └── ClientDashboard (app.js:147-404)
│       props: { onSelectClient }
│       ├── Client card grid (click to select)
│       ├── Create Client modal
│       ├── Edit Client modal
│       └── Delete Confirmation modal
│
└── isAuthenticated && currentClient
    │
    ├── Header
    │   ├── Client info badge (name, email)
    │   ├── "Switch Client" button → currentClient = null
    │   └── "Sign Out" button → isAuthenticated = false
    │
    ├── Sidebar (glass-panel)
    │   ├── "Client Profile" button ──── viewMode = "summary"
    │   ├── "Location Research" button ── viewMode = "location"
    │   └── Domain category buttons ──── viewMode = "questions"
    │       ├── Financial (15 questions)
    │       ├── Family & Household (15)
    │       ├── Work & Professional (15)
    │       ├── Lifestyle & Priorities (15)
    │       ├── Location & Commute (15)
    │       ├── Property Specifics (15)
    │       ├── Future & Miscellaneous (10)
    │       └── Entertainment (10)
    │
    └── Main Content Area (switches on viewMode)
        │
        ├── viewMode = "questions"
        │   └── QuestionView (app.js:406-525)
        │       props: { question, onNext, onPrev, hasPrev, hasNext, clientId }
        │       └── Recorder (app.js:6-64)
        │           props: { onTranscriptUpdate, onRecordingComplete }
        │           └── Web Speech API (SpeechRecognition)
        │
        ├── viewMode = "location"
        │   └── LocationResearch (app.js:1507-1788)
        │       props: { clientId }
        │       ├── ZIP search form (ZIP + min/max price)
        │       ├── Results display (housing, schools, crime)
        │       ├── Available Homes grid
        │       └── MapExplorer (app.js:713-1505)
        │           props: { zipCode, homes[], clientId }
        │           ├── Google Map (dark styled, 450px)
        │           ├── Street View (lazy-initialized)
        │           ├── Place filter chips (4 categories)
        │           ├── "For You" AI suggestion chips
        │           ├── Place cards list
        │           ├── Favorites panel
        │           └── Distance Calculator
        │
        └── viewMode = "summary"
            └── SummaryView (app.js:1790-1859)
                props: { clientId }
                └── Grouped question responses with transcripts
```

---

## 4. Technology Stack

| Technology | Version | Delivery | Purpose |
|---|---|---|---|
| React | 18 | CDN (unpkg) | UI component rendering |
| ReactDOM | 18 | CDN (unpkg) | DOM mounting via `createRoot` |
| Babel Standalone | latest | CDN (unpkg) | In-browser JSX transpilation |
| Express.js | 4.18.2 | npm | Static file serving + API endpoint |
| @anthropic-ai/sdk | 0.39.0 | npm | Claude AI integration |
| dotenv | 16.4.5 | npm | Environment variable loading |
| Google Maps JS API | latest | CDN (Google) | Maps, Places, Geocoding, StreetView, DistanceMatrix |
| Web Speech API | native | Browser built-in | Voice-to-text transcription |
| Cormorant | 300-700 | Google Fonts | Display/serif typography (headings, prices) |
| Syne | 400-700 | Google Fonts | UI/sans typography (buttons, labels, body) |

---

## 5. Data Flow Diagrams

### 5a. Voice Recording to Summary

```
User clicks Record button
        │
        ▼
Recorder.toggleRecording()
        │
        ▼
SpeechRecognition.start()
    continuous: true
    interimResults: true
        │
        ▼
onresult events fire as user speaks
        │
   ┌────┴──────────────┐
   │                    │
   ▼                    ▼
Final transcript     Interim transcript
(complete phrases)   (in-progress text,
   │                  displayed at 0.5
   │                  opacity, ephemeral)
   │
   ▼
QuestionView.handleTranscriptUpdate(final, interim)
   │
   ▼
setTranscript(prev => prev + ' ' + final)
   │
   ▼
saveData() ──▶ localStorage[ c_{clientId}_q_{questionId} ]
               { transcript, summary, timestamp, questionText }
   │
   ▼
User clicks Stop
   │
   ▼
handleRecordingComplete()
   │
   ▼
setTimeout(1500ms) ──▶ Mock summary generation
   │                    "Client discussed {category} preferences.
   │                     Key points: {transcript.substring(0,50)}..."
   ▼
setSummary() ──▶ saveData() ──▶ localStorage (updated)
```

### 5b. Location Search to Map

```
User enters ZIP code + optional min/max price
        │
        ▼
doSearch() ──▶ ZIP validation: /^\d{5}(-\d{4})?$/
        │
        ▼
Parse price range (default: 0 to Infinity)
        │
        ▼
Check MOCK_HOMES[] for static data matching ZIP
        │
   ┌────┴────────────────┐
   │                      │
   ▼                      ▼
Static data found      No static data
(90210, 10001)         for this ZIP
   │                      │
Filter by price        generateMockHomes(zip, min, max)
range                  3-5 random homes
   │                   isSimulated: true
   └────────┬─────────┘
            ▼
   setResults({
     zipCode, homes[], timestamp,
     housing: {summary, medianPrice, rentRange, trend},
     schools: {summary, rating, grade, familyFriendly},
     crime:   {summary, crimeGrade, safetyScore, trend}
   })
            │
            ├──▶ localStorage[ c_{clientId}_location ]
            │
            ▼
   MapExplorer mounts with { zipCode, homes[], clientId }
            │
            ▼
   Geocoder.geocode({ address: ZIP + ', USA' })
            │
            ▼
   new google.maps.Map(center: latLng, zoom: 13, dark style)
            │
       ┌────┴──────────────────────┐
       │                            │
       ▼                            ▼
   Home markers                nearbySearch() x 4 categories
   (circular pattern             ┌──────────────────┐
    around ZIP center)           │ schools   (2000m) │
       │                         │ restaurants(2000m)│
       │                         │ amenities  (2000m)│
       │                         │ businesses (2000m)│
       │                         └────────┬─────────┘
       │                                  │
       │                                  ▼
       │                         setNearbyPlaces()
       │                         Create markers (hidden)
       │                         Toggle via filter chips
       │                                  │
       └──────────────┬───────────────────┘
                      ▼
              Map fully initialized
              Street View available on tab switch
```

### 5c. "For You" AI Suggestion Pipeline

```
MapExplorer mounts / zipCode changes / clientId changes
        │
        ▼
fetchForYouSuggestions()
        │
        ▼
Scan ALL localStorage keys: c_{clientId}_q_{1..110}
Collect transcripts with length > 5 chars
        │
        ▼
Check cache: localStorage[ forYou_{clientId}_{zipCode} ]
        │
   ┌────┴───────────────────────┐
   │                             │
   ▼                             ▼
Cache HIT                     Cache MISS
_transcriptCount matches       or count mismatch
current count                    │
   │                             ▼
   │                  POST /api/suggest-places
   │                  {
   │                    transcripts: [
   │                      { category, question, transcript },
   │                      ...
   │                    ]
   │                  }
   │                             │
   │                             ▼
   │                  ┌──────────────────────────┐
   │                  │  Express Server           │
   │                  │         │                  │
   │                  │         ▼                  │
   │                  │  Anthropic SDK             │
   │                  │  Claude opus-4-6           │
   │                  │  adaptive thinking         │
   │                  │         │                  │
   │                  │         ▼                  │
   │                  │  Returns JSON array:       │
   │                  │  [{                        │
   │                  │    label: "Dog Park",      │
   │                  │    type: "park",           │
   │                  │    keyword: "dog park      │
   │                  │             off leash",    │
   │                  │    reason: "Client has     │
   │                  │            two large dogs" │
   │                  │  }, ...]                   │
   │                  └──────────┬─────────────────┘
   │                             │
   │                             ▼
   │                  Cache in localStorage with
   │                  _transcriptCount metadata
   │                             │
   └─────────────┬───────────────┘
                 ▼
   setForYouSuggestions(suggestions)
   Assign color from FOR_YOU_COLORS palette
                 │
                 ▼
   For each suggestion:
     nearbySearch({
       location: mapCenter,
       radius: 3000,
       type: suggestion.type,
       keyword: suggestion.keyword
     })
                 │
                 ▼
   Create colored markers (hidden by default)
   User toggles filter chips to show/hide
   Click marker ──▶ InfoWindow with place details + reason
```

---

## 6. State Management

### App (root)

| State | Type | Purpose |
|---|---|---|
| `isAuthenticated` | boolean | Auth gate |
| `currentClient` | object or null | Selected client |
| `activeCategory` | string | Current question domain |
| `currentQuestionIndex` | number | Position in filtered questions |
| `viewMode` | string | `"questions"` / `"location"` / `"summary"` |

Derived: `filteredQuestions` = questions filtered by `activeCategory`, `currentQuestion` = `filteredQuestions[currentQuestionIndex]`

### LoginView

| State | Type | Purpose |
|---|---|---|
| `email` | string | Form input |
| `password` | string | Form input |
| `error` | string | Validation error message |

Auth is mock-only. Password validated client-side against regex but `onLogin()` always succeeds.

### ClientDashboard

| State | Type | Persisted |
|---|---|---|
| `clients` | array | localStorage `"clients"` |
| `showModal` | boolean | No |
| `showEditModal` | boolean | No |
| `showDeleteConfirm` | boolean | No |
| `newClient` | object | No |
| `editingClient` | object | No |
| `deletingClient` | object | No |

### QuestionView

| State | Type | Persisted |
|---|---|---|
| `transcript` | string | localStorage `c_{clientId}_q_{id}` |
| `interim` | string | No (ephemeral display) |
| `summary` | string | localStorage `c_{clientId}_q_{id}` |
| `isSummarizing` | boolean | No |

**Refs:**
- `currentQuestionRef` -- Keeps current question in sync for closure-safe access in `saveData()`.

### LocationResearch

| State | Type | Persisted |
|---|---|---|
| `zipCode` | string | localStorage `c_{clientId}_location` |
| `minPrice` | string | localStorage `c_{clientId}_location` |
| `maxPrice` | string | localStorage `c_{clientId}_location` |
| `results` | object | localStorage `c_{clientId}_location` |
| `loading` | boolean | No |
| `error` | string | No |

### MapExplorer (19 useState, 10 useRef)

**State:**

| State | Type | Purpose |
|---|---|---|
| `activeTab` | string | `"map"` or `"street"` |
| `activeFilters` | object | `{schools, restaurants, amenities, businesses}` toggles |
| `nearbyPlaces` | object | `{schools[], restaurants[], amenities[], businesses[]}` |
| `placesLoading` | boolean | Loading indicator |
| `mapError` | string | Error display |
| `forYouSuggestions` | array | Claude-generated suggestions |
| `forYouPlaces` | object | Places found per suggestion |
| `forYouFilters` | object | Visibility toggles per suggestion |
| `forYouLoading` | boolean | Loading indicator |
| `forYouError` | string | Error display |
| `mapReady` | boolean | Map initialization gate |
| `favorites` | array | `[{id, name, lat, lng}]` |
| `distanceAddress` | string | Distance calculator input |
| `distanceResults` | array | Calculated distances |
| `distanceLoading` | boolean | Loading indicator |
| `distanceError` | string | Error display |

**Refs:**

| Ref | Purpose |
|---|---|
| `mapDivRef` | Map container DOM element |
| `streetViewDivRef` | Street View container DOM element |
| `mapInstanceRef` | `google.maps.Map` instance |
| `infoWindowRef` | Shared `google.maps.InfoWindow` |
| `placesServiceRef` | `google.maps.places.PlacesService` |
| `homeMarkersRef` | Array of property `google.maps.Marker` |
| `placeMarkersRef` | `{schools[], restaurants[], amenities[], businesses[]}` markers |
| `forYouMarkersRef` | `{[label]: markers[]}` per suggestion |
| `svInitializedRef` | Boolean flag for lazy Street View init |
| `favoritesRef` | In-sync ref for `window.__mapToggleFav` access |
| `favMarkersRef` | Array of favorite star markers |
| `distanceMarkerRef` | Single marker for distance origin |

### SummaryView

| State | Type | Purpose |
|---|---|---|
| `clientData` | array | All answered questions collected from localStorage |
| `masterInsight` | string | Mock high-level profile summary |

---

## 7. Persistence Layer (localStorage)

| Key Pattern | Value Shape | Written By | Read By |
|---|---|---|---|
| `clients` | `[{id, name, age, phone, email, createdAt}]` | ClientDashboard | ClientDashboard |
| `c_{clientId}_q_{questionId}` | `{transcript, summary, timestamp, questionText}` | QuestionView | QuestionView, SummaryView, MapExplorer |
| `c_{clientId}_location` | `{zipCode, minPrice, maxPrice, results}` | LocationResearch | LocationResearch |
| `mapFav_{clientId}` | `[{id, name, lat, lng}]` | MapExplorer | MapExplorer |
| `forYou_{clientId}_{zipCode}` | `{suggestions[], _transcriptCount}` | MapExplorer | MapExplorer |

**Cascade deletion:** When a client is deleted via `ClientDashboard.handleDeleteConfirm()`, all localStorage keys containing `c_{clientId}_` are removed by iterating all keys.

**Cache invalidation:** The `forYou_` cache stores `_transcriptCount`. On load, if the current number of transcripts differs from the cached count, the cache is invalidated and Claude is re-queried.

---

## 8. External API Integrations

```
┌─────────────────────────────────────────────────────────────────────┐
│                       API Integration Map                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SERVER-SIDE (server.js)                                            │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                                                            │     │
│  │  POST /api/suggest-places                                  │     │
│  │      │                                                     │     │
│  │      ▼                                                     │     │
│  │  Anthropic SDK ──▶ Claude opus-4-6                         │     │
│  │                    thinking: adaptive                      │     │
│  │                    max_tokens: 1024                         │     │
│  │                                                            │     │
│  │  Request:  { transcripts: [{category, question,            │     │
│  │                              transcript}] }                │     │
│  │  Response: [{label, type, keyword, reason}]                │     │
│  │            (3-8 personalized place suggestions)            │     │
│  │                                                            │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  CLIENT-SIDE (app.js -- MapExplorer)                                │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                                                            │     │
│  │  Geocoding API                                             │     │
│  │    geocode({ address: ZIP + ', USA' })                     │     │
│  │    Returns: { lat, lng }                                   │     │
│  │    Used by: map initialization, distance calculator        │     │
│  │                                                            │     │
│  │  Places API -- nearbySearch                                │     │
│  │    Fixed categories: radius 2000m, top 15 by rating        │     │
│  │      schools     → type: 'school'                          │     │
│  │      restaurants  → type: 'restaurant'                     │     │
│  │      amenities    → type: 'park'                           │     │
│  │      businesses   → type: 'store'                          │     │
│  │    "For You": radius 3000m, top 10, type + keyword         │     │
│  │                                                            │     │
│  │  Places API -- getDetails                                  │     │
│  │    fields: ['website']                                     │     │
│  │    Lazy-loaded on marker click                             │     │
│  │                                                            │     │
│  │  Distance Matrix API                                       │     │
│  │    origins: [user-entered address]                         │     │
│  │    destinations: [all favorites]                           │     │
│  │    travelMode: DRIVING                                     │     │
│  │    unitSystem: IMPERIAL                                    │     │
│  │    Returns: distance + duration per favorite               │     │
│  │                                                            │     │
│  │  Street View Panorama                                      │     │
│  │    Lazy-initialized on first tab switch                    │     │
│  │    Linked to map via setStreetView()                       │     │
│  │    Updates position on home marker click                   │     │
│  │                                                            │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  CLIENT-SIDE (app.js -- Recorder)                                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                                                            │     │
│  │  Web Speech API                                            │     │
│  │    SpeechRecognition (with webkit prefix fallback)         │     │
│  │    continuous: true  (multiple utterances)                  │     │
│  │    interimResults: true  (live partial text)               │     │
│  │                                                            │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--ink` | `#07070a` | Deepest background |
| `--ink-2` | `#0d0d12` | Card/panel backgrounds |
| `--ink-3` | `#141419` | Elevated surfaces |
| `--gold` | `#c8a96e` | Primary accent, headings, active states |
| `--gold-dim` | `rgba(200,169,110,0.22)` | Hover/active backgrounds |
| `--gold-glow` | `rgba(200,169,110,0.07)` | Subtle highlight areas |
| `--gold-line` | `rgba(200,169,110,0.35)` | Borders, dividers |
| `--cream` | `#ede8df` | Primary text |
| `--cream-60` | `rgba(237,232,223,0.6)` | Secondary text |
| `--cream-30` | `rgba(237,232,223,0.3)` | Tertiary/muted text |
| `--cream-08` | `rgba(237,232,223,0.08)` | Surface borders |
| `--cream-04` | `rgba(237,232,223,0.04)` | Subtle surface fills |
| `--green` | `#7dd3a8` | Success states |
| `--red` | `#f07a7a` | Danger/error states |

### Typography

| Token | Value | Usage |
|---|---|---|
| `--ff-display` | `'Cormorant', Georgia, serif` | Headings, question text, prices |
| `--ff-ui` | `'Syne', sans-serif` | Buttons, labels, navigation, body |
| `--ease-out` | `cubic-bezier(0.25,0.46,0.45,0.94)` | Standard transition easing |

### Surface System

**Glass panels** (`.glass-panel`):
- Background: `rgba(13,13,18,0.78)`
- Backdrop filter: `blur(14px)`
- Border: `1px solid var(--gold-line)`
- Box shadow: outer gold glow + inset white highlight
- Used for: sidebar, search panel, result cards, modals

**Grain overlay** (`body::before`):
- SVG noise filter at 4% opacity
- Full-viewport pseudo-element
- Adds texture/depth to dark backgrounds

### Animations

| Name | Duration | Usage |
|---|---|---|
| `pulse` | 2s infinite | Recording button -- expanding red box-shadow |
| `slideUp` | 0.5s ease-out | Login card, modal entrances (opacity + translateY) |

### Google Maps Dark Theme

Custom 17-rule style array (`DARK_MAP_STYLE` in app.js) matching the app palette:
- Geometry: `#0d0d12` (ink-2)
- Labels: `#c8a96e` (gold)
- Roads: `#252230` (dark gray)
- Water: `#07070a` (ink)
- Points of interest: `#1a1a24` (subtle dark)

### Map Marker Styles

| Marker Type | Shape | Color | Scale | Notes |
|---|---|---|---|---|
| Home property | Circle | `#c8a96e` (gold) | 11 | Positioned in circular pattern |
| Place (school) | Circle | `#fbbf24` | 7 | Hidden until filter toggled |
| Place (restaurant) | Circle | `#f87171` | 7 | Hidden until filter toggled |
| Place (amenity) | Circle | `#4ade80` | 7 | Hidden until filter toggled |
| Place (business) | Circle | `#a78bfa` | 7 | Hidden until filter toggled |
| "For You" | Circle | varies (8 colors) | 7 | Hidden until filter toggled |
| Favorite | Star text | `#c8a96e` (gold) | 14 | zIndex 999, always visible |
| Distance origin | Circle | `#f472b6` (pink) | 10 | Label "A", zIndex 1000 |

---

## 10. Notable Implementation Patterns

### 10a. Global Callback Bridge for InfoWindow Favorites

Google Maps InfoWindow content is raw HTML injected via `setContent()`. React state cannot be accessed from `onclick` handlers in this HTML. The solution attaches a global function that the DOM buttons call:

```
useEffect:
  window.__mapToggleFav = (id, name, lat, lng) => {
    setFavorites(prev => /* toggle logic */)
  }
  cleanup: delete window.__mapToggleFav
```

InfoWindow HTML references it via `onclick="window.__mapToggleFav(...)"`. The `favoritesRef` stays in sync with state so the global callback always reads current data.

### 10b. Closure Bug Fix via useRef

`QuestionView.saveData()` is called from within `setTranscript(prev => ...)` where the `question` prop from the outer scope may be stale due to rapid category changes. Fix:

```
const currentQuestionRef = useRef(question)
useEffect(() => { currentQuestionRef.current = question }, [question])

// In saveData():
const q = currentQuestionRef.current  // always current
```

### 10c. "For You" Cache Invalidation

Cache key: `forYou_{clientId}_{zipCode}`. Stores `_transcriptCount` alongside suggestions. On load, compares current transcript count against cached count. If different (user answered more questions), cache is invalidated and Claude is re-queried with all transcripts.

### 10d. Lazy Street View

`svInitializedRef` (boolean) prevents re-creating `StreetViewPanorama` on repeated tab switches. Panorama is only created on the first click of the "Street View" tab, conserving API calls and memory. Position updates when a home marker is clicked.

### 10e. Mock Data with Simulated Flag

Static homes exist for ZIPs 90210 and 10001 in `MOCK_HOMES[]`. For all other ZIPs, `generateMockHomes()` creates 3-5 random listings with `isSimulated: true`. The UI renders a "Simulated Listing" badge on these cards to distinguish them from curated data.

### 10f. Circular Marker Positioning

Home markers are positioned in a circle around the geocoded ZIP center using trigonometric distribution, since mock homes have no real coordinates:

```
angle  = (index / homeCount) * 2 * PI
radius = 0.004 + (index % 3) * 0.002
lat    = center.lat + cos(angle) * radius
lng    = center.lng + sin(angle) * radius
```

---

## 11. Security Considerations

| Area | Current State | Risk |
|---|---|---|
| **Authentication** | Mock-only. Password validated client-side but `onLogin()` always succeeds. No session tokens, no server auth. | Anyone can access the app. |
| **API key (Google Maps)** | Hardcoded in `index.html`. | Acceptable for Maps JS API (restricted by HTTP referrer in Google Cloud Console). |
| **API key (Anthropic)** | In `.env` file, loaded server-side via dotenv. Never exposed to browser. | Properly protected. |
| **API endpoint** | `POST /api/suggest-places` has no auth, no rate limiting. | Anyone who can reach the server can trigger Claude API calls. |
| **localStorage** | Client PII (names, emails, phones) and voice transcripts stored unencrypted. | Accessible to any JS on the same origin. |
| **InfoWindow HTML** | Constructed via string concatenation with Google Places data (`place.name`, `place.vicinity`). | Potential XSS if Places API returns malicious content. Basic escaping exists for favorites only. |
| **Input validation** | ZIP code has regex validation. Other inputs (client name, email) have no server-side validation. | Low risk since no server-side persistence. |

---

## 12. Marketing Site

`marketing/index.html` is a standalone 1693-line landing page with all CSS and JavaScript inline. It is completely independent of the main application -- no shared code, assets, or build process.

**Sections:** Navigation (fixed), Hero (split layout), Feature ticker (scrolling), How It Works (3 steps), Stats strip, Question Domains grid (8 cards), Location Research showcase, Sample Listings (6 homes), Footer.

**Interactive elements:** Scroll-triggered nav styling (`.scrolled` class), Intersection Observer for staggered entrance animations on domain cards and home cards, hover effects.

**Design:** Matches the main app's dark theme with gold accents, glass-panel effects, and grain texture overlay.
