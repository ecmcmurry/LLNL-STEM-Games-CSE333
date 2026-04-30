# 8-Bit Circuit

An educational circuit puzzle game built for CSE 333. Students drag and drop electrical components onto circuit boards to solve real circuit theory problems — each level targets one concept, gives a formula hint, and uses a 30-second timer with 3 lives to keep the pressure on.

---

## How to Run

Requires Node.js. Install dependencies, then start the server:

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

An `ADRIAN` API key must be set in a `.env` file for the AI tutor to work:

```
ADRIAN=your_anthropic_api_key_here
```

---

## Gameplay

| Element | Description |
|---------|-------------|
| **Timer** | 30 seconds per level — reach 0 and it's BOOM |
| **Lives** | 3 hearts — a wrong answer or expired timer costs one |
| **Drop Zones** | Glowing slots on the circuit board — drag the correct component in |
| **Feedback** | Green flash = solved, dark flash = wrong |
| **AI Tutor** | Click the AI Guide character for a hint — it asks questions instead of giving answers |

---

## Game Modes

**FULL CIRCUIT** — plays all 10 levels in order, covering every concept.

**LEVELS** — jump directly into a specific category:

| Category | Concepts Covered |
|----------|-----------------|
| **OHM'S LAW** | I = V/R, V = I×R — pick the right resistor or battery |
| **RESISTORS** | Series R_total = R1+R2+..., parallel 1/R_total = 1/R1+1/R2 |
| **COMPLEX CIRCUITS** | RC time constant τ = RC, RL time constant τ = L/R, voltage divider V_out = Vin×R2/(R1+R2), switch selection |

---

## Levels

| Level | Category | Goal Type | Concept |
|-------|----------|-----------|---------|
| 1 | Ohm's Law | current | Find I given V=12V — choose the right resistor |
| 2 | Ohm's Law | voltage | Find V given I and R — choose the right battery |
| 3 | Ohm's Law | current | Choose both battery and resistor to hit target current |
| 4 | Resistors | series | 2-resistor series — choose both to match R_total |
| 5 | Resistors | series | 3-resistor series — choose all three |
| 6 | Resistors | parallel | Mixed series-parallel network — 3 drop zones |
| 7 | Complex | tau (RC) | Pick the capacitor that gives τ = R×C target |
| 8 | Complex | switch | Given fixed R and C, pick the switch with the matching τ |
| 9 | Complex | tau (RL) | Pick the inductor that gives τ = L/R target |
| 10 | Complex | voltageDivider | Pick R2 to hit target V_out in a voltage divider |

Level 99 is an AI-generated level created via the `/api/generate` endpoint.

---

## AI Tutor

Clicking the AI Guide sends the current level state to `POST /api/hint`, which calls **Claude Haiku** with a system prompt that:

- Never gives the direct answer
- Asks guiding questions instead
- Adjusts helpfulness based on how many lives the student has lost
- Keeps responses under 2 sentences

---

## File Structure

```
Game2/
├── Home.html           — Main HTML shell (all screens in one page)
├── server.js           — HTTP server + /api/hint endpoint
├── js/
│   ├── constants.js    — All 10 levels, grid positions, component image map
│   ├── game.js         — Core game loop: level loading, drag-and-drop, timer, lives
│   ├── stats.js        — Answer checking (formula engine), stats tracking
│   ├── board.js        — Dynamic circuit board rendering for AI-generated levels
│   ├── screens.js      — Screen navigation (home, levels, result, how-to-play)
│   ├── ai.js           — AI tutor prompt building and fetch to /api/hint
│   ├── logic.js        — Pure functions (no DOM): formulas, stats, prompt building
│   └── extraStyling.js — Pixel animation helpers
├── css/
│   ├── base.css        — Global reset and fonts
│   ├── briefcase.css   — Briefcase/cabinet frame styling
│   ├── game.css        — Circuit board, drop zones, component tray
│   ├── screens.css     — Screen layout (home, result, level select)
│   ├── components.css  — Pixel card and button components
│   └── ai.css          — AI guide sidebar and speech bubble
├── api/
│   ├── hint.js         — Vercel-compatible hint endpoint
│   └── generate.js     — Claude-based level generator (used for level 99)
├── assets/             — Circuit board images, component sprites, AI guide art
└── __tests__/
    ├── gameLogic.test.js — Unit tests for logic.js (formula engine, stats, prompts)
    ├── api.test.js       — Unit tests for /api/hint endpoint
    └── e2e.test.js       — End-to-end browser tests (Playwright)
```

---

## Testing

```bash
npm test              # Jest unit tests with coverage
npm run test:e2e      # Playwright end-to-end tests
```

Unit tests cover the pure logic layer in `js/logic.js`: formula calculation, answer tolerance checking, stats tracking, level progression, and prompt building.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `dotenv` | Load `ADRIAN` API key from `.env` |
| `jest` | Unit test runner |
| `@playwright/test` | End-to-end browser tests |
| `babel-jest` | ES module support in Jest |

No frontend build step — all UI code is plain JavaScript loaded directly by the browser.
