# Reaction Lab

A browser-based chemistry game for STEM students. Answer quizzes about safety gear and disposal, balance stoichiometric equations, make predictions and be ready to explain your reasoning to an AI tutor.

---

## Concept

You explore one of four chemical reactions in a simplified manner framed like my own experiences in undergraduate chemistry labs. You are asked to make predictions and explain evidence, then have to work with an AI tutor to make sure you understand any mistakes you made.

---

## Gameplay Loop

1. **Choose Reaction** — Select one of four reactions to experiment with
2. **Read the Prelab** — Read through a pre-lab explaining details about the reaction
3. **Make Predictions** — Answer multiple choice questions about what you think will occur
4. **Safety Checklist** — Choose the right protective equipment to wear in the experiment
5. **Take Reactants from Storage** — Learn more about reactants like visuals and GHS safety warnings
6. **Measure Reactants** — Measure the correct amount of each reactant to make a balanced equation
7. **Proceed with Reaction** — Pour each reactant and stir to mix them
8. **Analyze the Products** — Read through some traits such as temperature change and pH, then use this information to justify how you know a reaction occured
9. **Dispose of Products** — Choose the proper disposal method for the products
10. **AI Debrief** — Answer questions asked by a Socratic AI tutor about your predictions, evidence statement, and performance throughout the reaction

---

## Levels

| # | Reactants | Symbols |
|---|----------|----------|
| 1 | Hydrochloric acid + Sodium hydroxide | HCl + NaOH |
| 2 | Lead nitrate + Potassium iodide | Pb(NO₃)₂ + KI |
| 3 | Sodium carbonate + Hydrochloric acid | Na₂CO₃ + HCl |
| 4 | Copper sulfate + Sodium hydroxide | CuSO₄ + NaOH |

---

## Project Structure

```
chemistry/
├── index.html
├── main.js                  — Contains most of the code including drawing, confirming responses, calculating reactions, etc.
├── utils.js                 — Contains functions that don't interact with DOM elements to aid in testing.
├── reactions.js             — Data object containing information on all included reactions
├── swapScreen.js            — Functions and Event Listeners for swapping screens
├── jest.config.js           — Configuration for jest, used for unit testing
├── playwright.config.js     — Configuration for playwright, used for end-to-end testing
├── package-lock.json
├── package.json
├── api/
│   └── chat.js              — Communicates with the Claude API
├── styles/
│   └── main.css             — full stylesheet
├── coverage/                — Folder containing the unit test report from jest
├── playwright-report/
│   └── index.html           — End-to-End test results from playwright
├── test-results
└── tests
    ├── chemistry.e2e.test.js      — A file containing all of the End-to-End tests
    └── chemistry.unit.test.js     — A file containing all of the unit tests
```

---

## Tech Stack

- **HTML**
- **Javascript** — No added packages
- **Canvas 2D API** — beaker/reaction rendering

---

## Running Locally

```bash
cd chemistry
vercel link
vercel env pull .env
npm install -g vercel
vercel dev
```

Open `http://localhost:3000`.