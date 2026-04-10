import { SUPPORT_TYPE } from '../utils/constants.js';

// Each level definition drives the build canvas (anchor nodes, load targets),
// the simulation (threat type and parameters), and the world scene renderer.
//
// anchorNodes:   Pre-placed fixed supports. Cannot be deleted or moved by the player.
// loadNodes:     Pre-placed free nodes where the simulation applies force.
//                Players must build structure that connects these to anchorNodes.
// winCondition:  What the simulation checks to decide pass/fail.
// scene:         Key passed to the world canvas background renderer.

export const LEVELS = [
  // ─── Level 1 ──────────────────────────────────────────────────────────────
  {
    id: 0,
    name: 'The Proving Ground',
    subtitle: 'Dead Load',
    tagline: 'Hold up what gravity demands.',
    description:
      'A factory roof platform must be supported against its own weight. ' +
      'No lateral forces, just gravity. Learn how load paths work.',
    budget: 600_000,
    scene: 'warehouse',
    threat: {
      type: 'gravity',
      label: 'Dead Load',
      description: 'Gravity pulls the platform straight down.',
    },
    realWorldRef: {
      name: 'Pratt Truss Railway Bridges',
      note: 'First built in 1844, Pratt trusses carry dead load across railroad spans worldwide.',
      photo: './history-photos/pratt-truss.jpg',
      photoCaption: 'Alexandra Railway Bridge, Rockhampton, 1899',
    },
    // Grid positions for pre-placed anchor supports (player cannot remove)
    anchorNodes: [
      { col: 3,  row: 12, supportType: SUPPORT_TYPE.PINNED, label: 'Wall A' },
      { col: 17, row: 12, supportType: SUPPORT_TYPE.PINNED, label: 'Wall B' },
    ],
    // Grid positions for the pre-placed load targets (player must structurally connect these)
    loadNodes: [
      { col: 8,  row: 3, load: { fx: 0, fy: -60_000 } }, // 60 kN downward
      { col: 10, row: 3, load: { fx: 0, fy: -60_000 } },
      { col: 12, row: 3, load: { fx: 0, fy: -60_000 } },
    ],
    winCondition: {
      type: 'no_collapse',
      description: 'No structural element may yield. Build a load path that distributes the weight.',
    },
    requirements: {
      minElements: 7,
      hint: 'You need at least a triangulated truss. One beam won\'t cut it.',
    },
  },

  // ─── Level 2 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Coastal Tower',
    subtitle: 'Lateral Wind Load',
    tagline: 'Stand tall. The storm is coming.',
    description:
      'A coastal observation tower must resist 120 km/h sustained wind. ' +
      'Lateral loads put your columns in bending. Diagonals and bracing are your friend.',
    budget: 900_000,
    scene: 'coastal',
    threat: {
      type: 'wind',
      label: 'Wind Load',
      description: '120 km/h lateral wind from the right side.',
      windSpeedKmh: 120,
      windAngleDeg: 180, // blowing left (negative X)
    },
    realWorldRef: {
      name: 'Tacoma Narrows Bridge',
      note: 'The 1940 collapse taught engineers that aerodynamic instability, not static wind, is the real threat.',
      photo: './history-photos/tacoma-narrows.jpg',
      photoCaption: 'Tacoma Narrows Bridge, Washington, 1940',
    },
    anchorNodes: [
      { col: 9,  row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation L' },
      { col: 11, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation R' },
    ],
    loadNodes: [
      { col: 10, row: 2, load: { fx: -30_000, fy: -15_000 } }, // crown of tower
      { col: 10, row: 5, load: { fx: -25_000, fy: 0 } },
      { col: 10, row: 8, load: { fx: -20_000, fy: 0 } },
    ],
    winCondition: {
      type: 'no_collapse',
      description: 'No structural element may yield under wind and gravity combined.',
    },
    requirements: {
      minElements: 9,
      hint: 'A squat box won\'t resist lateral wind. Build tall with diagonal bracing.',
    },
  },

  // ─── Level 3 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    name: 'Fault Line',
    subtitle: 'Seismic Event',
    tagline: 'The ground moves. Your structure must not fail.',
    description:
      'A 6.2-magnitude urban seismic event shakes the ground horizontally. ' +
      'Stiffness is not enough. Ductility, redundancy, and base flexibility matter.',
    budget: 1_500_000,
    scene: 'urban',
    threat: {
      type: 'seismic',
      label: 'Earthquake',
      description: 'Cyclic horizontal ground acceleration. Peak 0.4g.',
      peakAccelerationG: 0.4,
      frequencyHz: 1.0, // Ground shaking frequency
      durationSec: 8,
    },
    realWorldRef: {
      name: 'Base-isolated Japanese buildings',
      note:
        "Japan's isolated structures ride above the shaking on rubber bearings, dramatically reducing transmitted force.",
      photo: './history-photos/japanese-seismic.jpg',
      photoCaption: 'Seismic base isolators beneath Utah State Capitol, 2008',
    },
    anchorNodes: [
      { col: 5,  row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation A' },
      { col: 10, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation B' },
      { col: 15, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation C' },
    ],
    loadNodes: [
      { col: 5,  row: 5, load: { fx: 0, fy: -80_000 } },
      { col: 10, row: 5, load: { fx: 0, fy: -80_000 } },
      { col: 15, row: 5, load: { fx: 0, fy: -80_000 } },
      { col: 5,  row: 9, load: { fx: 0, fy: -40_000 } },
      { col: 10, row: 9, load: { fx: 0, fy: -40_000 } },
      { col: 15, row: 9, load: { fx: 0, fy: -40_000 } },
    ],
    winCondition: {
      type: 'no_collapse',
      description: 'Structure must survive the full seismic sequence without progressive collapse.',
    },
    requirements: {
      minElements: 12,
      hint: 'Seismic loads demand redundant lateral frames at every floor.',
    },
  },

  // ─── Level 4 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    name: 'The Rising',
    subtitle: 'Hydrostatic Flood Pressure',
    tagline: 'Water finds every weakness.',
    description:
      'A harbor floodgate must hold back 4 m of floodwater. Hydrostatic pressure ' +
      'increases with depth, loading the lower sections hardest.',
    budget: 2_000_000,
    scene: 'harbor',
    threat: {
      type: 'flood',
      label: 'Hydrostatic Pressure',
      description: '4 m floodwater head, pressure increases linearly with depth.',
      floodDepthM: 4,
      waterDensity: 1000, // kg/m³
    },
    realWorldRef: {
      name: 'Thames Barrier, London',
      note:
        'The Thames Barrier uses rotating gate sections to resist tidal surges. Each gate handles enormous hydrostatic loads.',
      photo: './history-photos/thames-barrier.jpg',
      photoCaption: 'Thames Barrier sector gates closing, London',
    },
    anchorNodes: [
      { col: 3,  row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Left Bank' },
      { col: 3,  row: 7,  supportType: SUPPORT_TYPE.PINNED, label: 'Left Mid' },
      { col: 17, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Right Bank' },
      { col: 17, row: 7,  supportType: SUPPORT_TYPE.PINNED, label: 'Right Mid' },
    ],
    loadNodes: [
      // Nodes along the gate face — pressure loads applied here in simulation
      { col: 10, row: 13, load: { fx: 80_000, fy: 0 } }, // bottom (highest pressure)
      { col: 10, row: 10, load: { fx: 55_000, fy: 0 } },
      { col: 10, row: 7,  load: { fx: 30_000, fy: 0 } }, // top (lowest pressure)
    ],
    winCondition: {
      type: 'no_collapse',
      description: 'No structural element may yield under hydrostatic flood pressure.',
    },
    requirements: {
      minElements: 10,
      hint: 'Deep water pressure needs dense horizontal and diagonal bracing.',
    },
  },

  // ─── Level 5 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Hard Target',
    subtitle: 'Ballistic Impact',
    tagline: "Redundancy is not a luxury. It's your only chance.",
    description:
      'A high-value asset inside must survive a direct ballistic impact at the roof. ' +
      'Design for progressive collapse prevention. One element will fail. ' +
      'The rest must hold.',
    budget: 4_000_000,
    scene: 'bunker',
    threat: {
      type: 'ballistic',
      label: 'Ballistic Impact',
      description: 'Single high-energy impact at the roof centre node.',
      impactForceKN: 300, // 300 kN impulse — survivable with redundant load paths
    },
    realWorldRef: {
      name: 'Ronan Point collapse, 1968',
      note:
        'A single gas explosion removed a load-bearing wall and triggered progressive floor collapse. This event established redundancy codes.',
      photo: './history-photos/ronan-point.jpg',
      photoCaption: 'Ronan Point, Newham, London, May 1968',
    },
    anchorNodes: [
      { col: 4,  row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation NW' },
      { col: 10, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation N' },
      { col: 16, row: 13, supportType: SUPPORT_TYPE.FIXED, label: 'Foundation NE' },
    ],
    loadNodes: [
      { col: 10, row: 2, load: { fx: 0, fy: -300_000 } }, // impact point
      { col: 6,  row: 7, load: { fx: 0, fy: -50_000 } },  // interior floors
      { col: 10, row: 7, load: { fx: 0, fy: -50_000 } },
      { col: 14, row: 7, load: { fx: 0, fy: -50_000 } },
    ],
    winCondition: {
      type: 'protected_node',
      description: 'The asset at the base must not be crushed. Base nodes must not fail.',
      protectedCols: [7, 10, 13],
      protectedRow: 13,
    },
    requirements: {
      minElements: 14,
      hint: 'One impact removes a member. Redundant load paths are your only defence.',
    },
  },
];
