# What Wave

A browser-based wave-matching game for STEM students. Adjust sliders for amplitude, frequency, and phase shift to match the target wave. As the difficulty goes up, you'll have to start combining waves together.

---

## Concept

You manage the amplitude, frequency, and phase components of up to four waves, which add together to match a target wave. As you score points, the game gets harder by changing multiple components or requiring multiple waves.

---

## Gameplay Loop

1. **Study Target Wave** — Study the red target wave
2. **Adjust Sliders** — Adjust the amplitude, frequency, and phase sliders to control your wave 
3. **Match Wave** — Adjust the bright green wave until it lines up with the red target wave. If they match, you gain points and a new target wave is generated

---

## Difficulty Chart

| Current Score | Active Components | Number of Waves |
|---|----------|----------|
| <2 | Amplitude | 1 |
| 2-3 | Amplitude & Frequency | 1 |
| 4-5 | Amplitude, Frequency, & Phase | 1 |
| 6-8 | Amplitude & Frequency | 2 |
| 9-11 | Amplitude, Frequency, & Phase | 2 |
| 12-14 | Amplitude & Frequency | 3 |
| 15-17 | Amplitude, Frequency, & Phase | 3 |
| 18-20 | Amplitude & Frequency | 4 |
| >20 | Amplitude, Frequency, & Phase | 4 |

---

## Project Structure

```
fourier/
├── index.html
```

---

## Tech Stack

- **HTML**
- **Javascript** — No added packages
- **Canvas 2D API** — wave rendering