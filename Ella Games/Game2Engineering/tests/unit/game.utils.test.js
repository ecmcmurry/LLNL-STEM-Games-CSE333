const {
  MATERIALS,
  HEAT_TREAT_OUTCOMES,
  computeDesign,
  evaluateDesign,
  formatConstraints,
  constraintList,
  pickCharacter,
  characterImage,
  characterDisplayName,
  extractJobTitle,
  CHARACTERS
} = require('../../game.utils');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const steelMild = MATERIALS.find(m => m.id === 'steel_mild');
const titanium  = MATERIALS.find(m => m.id === 'titanium');

function makeItem(material, microstructure = 'raw', htMods = null) {
  return {
    material,
    microstructure,
    htMods: htMods || HEAT_TREAT_OUTCOMES[microstructure] || HEAT_TREAT_OUTCOMES.raw
  };
}

// ─── computeDesign — AISI 1020 Mild Steel @ 4 mm (Part 1 entry) ──────────────

describe('computeDesign — AISI 1020 Mild Steel @ 4 mm', () => {

  test('1. strength = yieldStrength(210) × yieldMult(1.0) × thickness(4) = 840 MPa', () => {
    const d = computeDesign(makeItem(steelMild, 'raw'), 4);
    expect(d.strength).toBe(840);
  });

  test('2. cost = costPerMm(8) × thickness(4) = $32', () => {
    const d = computeDesign(makeItem(steelMild, 'raw'), 4);
    expect(d.cost).toBe(32);
  });

  test('3. weight = density(7.85) × thickness(4) = 31.4 g/cm²', () => {
    const d = computeDesign(makeItem(steelMild, 'raw'), 4);
    expect(d.weight).toBeCloseTo(31.4, 1);
  });

  test('4. materialId = "steel_mild" and materialName = "AISI 1020 Mild Steel"', () => {
    const d = computeDesign(makeItem(steelMild, 'raw'), 4);
    expect(d.materialId).toBe('steel_mild');
    expect(d.materialName).toBe('AISI 1020 Mild Steel');
  });

});

// ─── computeDesign — heat-treatment multipliers ───────────────────────────────

describe('computeDesign — heat-treatment multipliers', () => {

  test('5. martensite yieldMult(1.7) raises titanium strength: 880×1.7×2 = 2992 MPa', () => {
    const d = computeDesign(makeItem(titanium, 'martensite', HEAT_TREAT_OUTCOMES.martensite), 2);
    expect(d.strength).toBe(2992);
  });

  test('6. ferrite yieldMult(0.75) lowers mild-steel strength: 210×0.75×4 = 630 MPa', () => {
    const d = computeDesign(makeItem(steelMild, 'ferrite', HEAT_TREAT_OUTCOMES.ferrite), 4);
    expect(d.strength).toBe(630);
  });

});

// ─── evaluateDesign ───────────────────────────────────────────────────────────

describe('evaluateDesign', () => {
  const design = { strength: 840, weight: 31.4, cost: 32, ductility: 0.25, thermalLimit: 420 };

  test('7. passes when minStrength constraint is satisfied', () => {
    const r = evaluateDesign(design, { constraints: { minStrength: 800 } });
    expect(r.pass).toBe(true);
    expect(r.fail).toHaveLength(0);
  });

  test('8. fails and records failure message when minStrength is not met', () => {
    const r = evaluateDesign(design, { constraints: { minStrength: 900 } });
    expect(r.pass).toBe(false);
    expect(r.fail[0]).toMatch(/Strength/);
  });

  test('9. fails when maxWeight constraint is exceeded', () => {
    const r = evaluateDesign(design, { constraints: { maxWeight: 20 } });
    expect(r.pass).toBe(false);
    expect(r.fail[0]).toMatch(/Weight/);
  });

  test('10. checks array contains correct label and ok fields for each constraint', () => {
    const r = evaluateDesign(design, { constraints: { minStrength: 800, maxWeight: 50 } });
    expect(r.checks).toHaveLength(2);
    expect(r.checks[0]).toMatchObject({ label: 'Strength', ok: true });
    expect(r.checks[1]).toMatchObject({ label: 'Weight', ok: true });
  });

});

// ─── characterImage ───────────────────────────────────────────────────────────

describe('characterImage', () => {

  test('11. rabbit with default mood returns "assets/RabbitRegular.png"', () => {
    expect(characterImage('rabbit')).toBe('assets/RabbitRegular.png');
  });

  test('12. bird with happy mood returns "assets/BirdHappy.png"', () => {
    expect(characterImage('bird', 'happy')).toBe('assets/BirdHappy.png');
  });

});

// ─── characterDisplayName ─────────────────────────────────────────────────────

describe('characterDisplayName', () => {

  test('13. "bird" → "Dr. Bird"', () => {
    expect(characterDisplayName('bird')).toBe('Dr. Bird');
  });

  test('14. "bobcat" → "Rufus"', () => {
    expect(characterDisplayName('bobcat')).toBe('Rufus');
  });

  test('15. "rabbit" → "Mr. Hop" or "Miss Hop"', () => {
    expect(['Mr. Hop', 'Miss Hop']).toContain(characterDisplayName('rabbit'));
  });

});

// ─── formatConstraints / constraintList ───────────────────────────────────────

describe('formatConstraints and constraintList', () => {

  test('16. formatConstraints returns correct HTML string for minStrength + maxCost', () => {
    const html = formatConstraints({ minStrength: 800, maxCost: 100 });
    expect(html).toContain('800');
    expect(html).toContain('100');
  });

  test('17. constraintList returns <li> items for all provided constraints', () => {
    const html = constraintList({ minStrength: 700, maxWeight: 15, maxCost: 50 });
    expect(html).toContain('<li>');
    expect(html).toContain('700');
    // extractJobTitle — strips job-title from comma-separated string
    expect(extractJobTitle('Dr. Carter, Materials Engineer')).toBe('Materials Engineer');
    expect(extractJobTitle('Structural Analyst')).toBe('Structural Analyst');
  });

});

// ─── pickCharacter ────────────────────────────────────────────────────────────

describe('pickCharacter', () => {

  test('18. always returns one of the three valid character ids', () => {
    for (let i = 0; i < 30; i++) {
      expect(CHARACTERS).toContain(pickCharacter());
    }
  });

});

