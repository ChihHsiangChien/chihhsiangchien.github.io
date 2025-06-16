# Project: EcoTactica

## Overview

**EcoTactica** is a browser-based simulation game designed for iPads. Students take on the role of policy-makers or community leaders, navigating environmental, economic, and social trade-offs to improve biodiversity and sustainability metrics while reacting to unforeseen global or local events.

The game avoids AI-based decision generation and instead uses a combination of:

- Strategy cards chosen by the player
- Event cards that modify state conditions
- A flag-based state machine to track long-term changes and triggers
- Optional Markov Chain elements to simulate probabilistic outcomes and feedback loops

---

## Core Loop

Each turn, the player:

1. Reviews current environmental and social indicators on a dashboard.
2. Selects 1 out of 3 drawn **strategy cards**.
3. Faces a possible **event card** (randomly or conditionally triggered).
4. System computes the state changes, modifies dashboard, and updates flags.

---

## Game Elements

### Dashboard (State)

Quantifiable metrics that change throughout the game:

- Climate Stability (0–100)
- Biodiversity Index (0–100)
- Public Trust (0–100)
- Economic Viability (0–100)
- Social Equity (0–100)
- Flag storage (detailed below)

### Strategy Cards

- 20+ predefined cards, drawn progressively
- Each has a:
  - Title
  - Description
  - Effect (quantitative, e.g. +10 Biodiversity, -5 Economy)
  - Conditional modifiers based on flags
- Card effects apply immediately or trigger delayed effects via flags

### Event Cards

- Triggered randomly or based on specific flag logic
- Examples:
  - "Flood Disaster" if climate stability < 30
  - "Youth Climate Strike" if public trust < 50 after 3 pollution events
- Can amplify or nullify strategy effects

### Flags

- Boolean or numeric variables stored as key-value pairs
- Used to:
  - Track event history (e.g., `energyCrisisOccurred: true`)
  - Store counters (e.g., `pollutionOverLimitCount: 2`)
  - Manage conditional logic and delayed effects

### Transitions

- Game logic evaluates state transitions based on strategy + event + flags
- Optional: integrate Markov Chain matrices to probabilistically simulate long-term changes (e.g., biodiversity degradation if no conservation action after X rounds)

---

## Win/Lose Conditions

- Game lasts a fixed number of turns (e.g., 12 rounds)
- Scoring rubric evaluates final dashboard:
  -
    > 80 in 3+ indicators = Outstanding
  - 50–80 in 3+ indicators = Acceptable
  - <50 in 3+ indicators = Game Over (ecological collapse)

---

## Sample Data Formats

### Strategy Card CSV Columns:

\| id | title | description | effect\_biodiversity | effect\_economy | required\_flag | prohibit\_flag | delayed\_flag | delay\_turns |

### Flags Example:

```json
"flags": {
  "energyCrisisOccurred": true,
  "joinedTreaty": false,
  "pollutionOverLimitCount": 2,
  "delayedCarbonTax": {"delay": 2, "type": "carbonTax"}
}
```

---

## UI/UX Guidelines

- Mobile-first layout for iPad landscape
- Card selection panel (bottom), dashboard (top or side)
- Animated transitions for card effects
- Strategy and event logs for review

---

## Extensions

- Multiplayer or class-wide dashboard aggregation
- Instructor panel to inject events
- Scenario-based missions (e.g., "Save Coastal City")

---

## License

- Open-source, MIT or Creative Commons
- Suitable for integration in formal environmental education

---

## Project Name: EcoTactica

**Tagline**: "Lead with Strategy. Sustain with Science."

Ready for JSON/CSV integration, front-end implementation, and classroom testing.

