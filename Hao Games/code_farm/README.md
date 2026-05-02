# There's a Bug in the Flower!

A farming and debugging game built for team CSE 333. Players grow flowers on a farm, but bugs can appear and freeze growth. Players need to solve coding puzzles to fix them nd keep your farm alive.

---

# How to Run (locally)

Start the backend (AI server):

```bash
node server.js
```

Start the frontend:
```bash
py -m http.server 8000
```

Then open in your browser:
http://localhost:8000

---

# Gameplay

| Action | Description                             |
|--------|-----------------------------------------|
| Plant  | Buy seeds and plant flowers on the farm |
| Grow   | Flowers grow over multiple days         |
| Bug    | Bugs may appear and freeze growth       |
| Debug  | Solve coding puzzles to remove bugs     |
| Harvest| Collect flowers and earn coins          |

---

# Debugging Flower Difficulty System

| Flower                     | Difficulty |
|----------------------------|------------|
| Tulip, Daisy               | Easy       |
| Crimson Rose, Violet Start | Medium     |
| Emberblossom, Moonflower   | Hard       |

AI-generated coding puzzles scale based on flower type.

---

# Game Mechanics

- Each flower rquires several days to grow
- Bug randomly appear by a probability of 30% and pause growth
- Growth resumes only after the bug is fixed
- Growth does not skip days while the flower is bugged
- Players earn coins by harvesting flowers
- New flowers unlock based on harvest progression

---

# System

- Bug System
1. Each day has a 30% chance to generate bugs
2. Bugs attach to individual plots
3. Bug puzzles are generated dynamically using AI

- Growth System
1. Growth is based on (current day - planted day)
2. Bugged flowers freeze progress
3. Fixed using totalFrozenDay logic
-
- AI Puzzle System
1. Backend uses Claude API
2. Return JSON with: title, buggy, hint, fixCheck
3. Frontend validates solution using text.includes()

- Stats System
1. The system tracks: total harvests, harvests per flower, total coins, current day, and total bugs fixed

---

# UI Features

- Terminal-style command system (cd farm, cd sotre, etc)
- Store and inventory pages
- Stats dashboard
- Help page
- Loading page during AI generation
- Guided tutorial for first-time players

---

# File Structure

code_farm/
├── index.html      - Main game UI
├── game.js         - Game logic
├── server.js       - AI backend (Claude API)
├── assets/         - Images and UI assets
├── styles.css      - CSS styling
├── .env            - API key (not committed)

---

# Dependencies

| Library           | Purpose                         |
|-------------------|---------------------------------|
| Express.js        | Backend server                  |
| @anthropic-ai/sdk | Claude AI integration           |
| dotenv            | Environment variable management |

---

# Tech Notes
- Uses acync API calls for AI puzzle generation
- Loading screen prevents interaction during requests
- Growth freeze implemented using bugStartDay + totalFrozenDays
- LocalStorage used for saving game state
- Backend separates API key from frontend for security
