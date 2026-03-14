// ─── Grid ─────────────────────────────────────────────────────────────────────
export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_METERS = 5.0;       // Real-world metres per grid cell
export const MIN_CELL_PX = 28;        // Smallest rendered cell size (mobile)
export const MAX_CELL_PX = 56;        // Largest rendered cell size (desktop)
export const NODE_VISUAL_RADIUS = 7;  // Drawn circle radius in pixels
export const NODE_HIT_RADIUS = 22;    // Touch/click hit-test radius (≥44 px total diameter)

// ─── Element types ────────────────────────────────────────────────────────────
export const ELEMENT_TYPE = Object.freeze({
  BEAM:   'beam',    // Flexural member – resists bending and axial force
  COLUMN: 'column',  // Compression-primary member – designed for buckling resistance
  TRUSS:  'truss',   // Axial-only (effectively pin-jointed via near-zero I)
  CABLE:  'cable',   // Tension-only axial member – goes slack under compression
});

// ─── Support types ────────────────────────────────────────────────────────────
export const SUPPORT_TYPE = Object.freeze({
  FIXED:    'fixed',     // Clamp: u, v, θ all constrained
  PINNED:   'pinned',    // u, v constrained; θ free
  ROLLER_H: 'roller_h',  // Only v constrained (horizontal roller)
  ROLLER_V: 'roller_v',  // Only u constrained (vertical roller)
});

// ─── Element material / section properties (SI: Pa, m², m⁴) ──────────────────
// costPerMeter is game dollars, not real money.
export const ELEMENT_PROPERTIES = Object.freeze({
  [ELEMENT_TYPE.BEAM]: {
    E: 200e9,            // Young's modulus – structural steel (Pa)
    A: 0.0076,           // Cross-section area – W310×60 I-section (m²)
    I: 1.29e-4,          // Second moment of area (m⁴)
    yieldStress: 250e6,  // Yield stress (Pa)
    tensionOnly: false,
    displayName: 'Steel Beam',
    description: 'Resists bending and axial load. Best for horizontal spans.',
    blueprintColor: '#64b5f6',
    worldColor: '#546e7a',
    lineWidthPx: 5,
    costPerMeter: 1_500,
    icon: 'beam',
  },
  [ELEMENT_TYPE.COLUMN]: {
    E: 200e9,
    A: 0.0127,           // W200×100 I-section
    I: 2.13e-4,
    yieldStress: 250e6,
    tensionOnly: false,
    displayName: 'Steel Column',
    description: 'Handles vertical compression and buckling. Best for upright supports.',
    blueprintColor: '#81c784',
    worldColor: '#455a64',
    lineWidthPx: 7,
    costPerMeter: 2_000,
    icon: 'column',
  },
  [ELEMENT_TYPE.TRUSS]: {
    E: 200e9,
    A: 0.003,
    I: 1e-7,             // Near-zero: simulates pin-joint (axial-only)
    yieldStress: 350e6,  // High-strength steel
    tensionOnly: false,
    displayName: 'Truss Member',
    description: 'Axial-only. Efficient when used in triangulated networks.',
    blueprintColor: '#ffb74d',
    worldColor: '#8d6e63',
    lineWidthPx: 3,
    costPerMeter: 500,
    icon: 'truss',
  },
  [ELEMENT_TYPE.CABLE]: {
    E: 160e9,            // High-strength wire rope
    A: 0.002,
    I: 0,                // No bending stiffness
    yieldStress: 1500e6, // Wire rope ultimate
    tensionOnly: true,
    displayName: 'Cable',
    description: 'Tension-only. Snaps slack under compression. Cheapest per metre.',
    blueprintColor: '#ce93d8',
    worldColor: '#bdbdbd',
    lineWidthPx: 2,
    costPerMeter: 300,
    icon: 'cable',
  },
});

// ─── Stress visualisation thresholds ─────────────────────────────────────────
export const STRESS_UTILISATION = Object.freeze({
  SAFE:     0.60,  // ≤60 % of yield → green
  MODERATE: 0.80,  // ≤80 %          → amber
  CRITICAL: 1.00,  // ≤100 %         → red
  // > 100 % → element fails
});

export const STRESS_COLORS = Object.freeze({
  safe:     '#4caf50',
  moderate: '#ff9800',
  critical: '#f44336',
  failed:   '#b71c1c',
});

// ─── Physics constants ────────────────────────────────────────────────────────
export const GRAVITY_MS2     = 9.81;   // m/s²
export const STEEL_DENSITY   = 7850;   // kg/m³

// ─── Simulation rendering ─────────────────────────────────────────────────────
export const DEFORMATION_SCALE = 80;   // Multiply real displacement for visual exaggeration

// ─── Pattern notification rarity ─────────────────────────────────────────────
export const RARITY = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  LEGENDARY: 'legendary',
});
