import { RARITY } from '../utils/constants.js';

// Each pattern entry fires a recognition notification when detected.
// The detector (pattern-detector.js) checks for these after every build action.
// Rarity controls the visual treatment of the notification toast.

export const STRUCTURAL_PATTERNS = [
  // ─── Common ───────────────────────────────────────────────────────────────
  {
    id: 'simple_span',
    name: 'Simply Supported Beam',
    rarity: RARITY.COMMON,
    engineeringPurpose: 'Carries vertical load across a gap via bending.',
    realWorldExample: 'Floor joists in every building on Earth.',
    color: '#4fc3f7',
    icon: '━',
  },
  {
    id: 'cantilever',
    name: 'Cantilever',
    rarity: RARITY.COMMON,
    engineeringPurpose: 'Transfers load to a fixed end without a far support.',
    realWorldExample: 'Balconies, aircraft wings, cantilevered overhangs.',
    color: '#4fc3f7',
    icon: '┘',
  },
  {
    id: 'triangle',
    name: 'Triangulated Panel',
    rarity: RARITY.COMMON,
    engineeringPurpose: 'Triangles are the only rigid polygon. Converts forces to pure axial.',
    realWorldExample: 'The most fundamental element of every truss ever built.',
    color: '#4fc3f7',
    icon: '△',
  },
  {
    id: 'portal_frame',
    name: 'Portal Frame',
    rarity: RARITY.COMMON,
    engineeringPurpose: 'Rigid rectangular frame that resists lateral load through moment connections.',
    realWorldExample: 'Steel portal frames span every industrial warehouse and sports hall.',
    color: '#4fc3f7',
    icon: '⊓',
  },

  // ─── Uncommon ─────────────────────────────────────────────────────────────
  {
    id: 'pratt_truss',
    name: 'Pratt Truss',
    rarity: RARITY.UNCOMMON,
    engineeringPurpose: 'Vertical posts carry compression; diagonals carry tension — optimised for steel.',
    realWorldExample: 'Caleb & Thomas Pratt patented it in 1844. Still used for railway bridges worldwide.',
    color: '#81c784',
    icon: 'N',
  },
  {
    id: 'warren_truss',
    name: 'Warren Truss',
    rarity: RARITY.UNCOMMON,
    engineeringPurpose: 'Alternating diagonals share tension and compression — fewer pieces than Pratt.',
    realWorldExample: 'James Warren patented it in 1848. Used on the Sydney Harbour Bridge approach spans.',
    color: '#81c784',
    icon: 'W',
  },
  {
    id: 'x_brace',
    name: 'X-Brace',
    rarity: RARITY.UNCOMMON,
    engineeringPurpose: 'Crossing diagonals resist lateral load in both directions.',
    realWorldExample: 'Exterior bracing on the John Hancock Center, Chicago.',
    color: '#81c784',
    icon: '✕',
  },
  {
    id: 'k_brace',
    name: 'K-Brace',
    rarity: RARITY.UNCOMMON,
    engineeringPurpose: 'K-shaped diagonals allow door/window openings while bracing the frame.',
    realWorldExample: 'Seismic lateral bracing in mid-rise steel office buildings.',
    color: '#81c784',
    icon: 'K',
  },
  {
    id: 'arch',
    name: 'Arch',
    rarity: RARITY.UNCOMMON,
    engineeringPurpose: 'Curved form redirects vertical loads into pure axial compression.',
    realWorldExample: 'Roman aqueducts, Sydney Harbour Bridge main arch, Gateway Arch St. Louis.',
    color: '#81c784',
    icon: '⌒',
  },

  // ─── Rare ─────────────────────────────────────────────────────────────────
  {
    id: 'cable_stayed',
    name: 'Cable-Stayed System',
    rarity: RARITY.RARE,
    engineeringPurpose: 'High-strength cables from a tower provide direct vertical support to a deck.',
    realWorldExample: 'Millau Viaduct, France — tallest bridge structure in the world.',
    color: '#ffb74d',
    icon: 'Y',
  },
  {
    id: 'moment_frame',
    name: 'Moment-Resisting Frame',
    rarity: RARITY.RARE,
    engineeringPurpose: 'Rigid beam-column joints transfer lateral load through bending — no diagonals needed.',
    realWorldExample: 'Seismic design standard in Los Angeles high-rises since 1971.',
    color: '#ffb74d',
    icon: '⊞',
  },
  {
    id: 'diagrid',
    name: 'Diagrid Frame',
    rarity: RARITY.RARE,
    engineeringPurpose: 'Diagonal grid acts as both structure and skin — highly material-efficient.',
    realWorldExample: '30 St Mary Axe (The Gherkin), London. Hearst Tower, NYC.',
    color: '#ffb74d',
    icon: '◇',
  },

  // ─── Legendary ────────────────────────────────────────────────────────────
  {
    id: 'tensegrity',
    name: 'Tensegrity',
    rarity: RARITY.LEGENDARY,
    engineeringPurpose: 'Isolated compression struts float in a continuous tension network — no element touches another compressive member.',
    realWorldExample: 'Buckminster Fuller coined the term. The Kurilpa Bridge in Brisbane is the largest in the world.',
    color: '#ce93d8',
    icon: '✦',
  },
  {
    id: 'suspension',
    name: 'Suspension System',
    rarity: RARITY.LEGENDARY,
    engineeringPurpose: 'A catenary cable carries the deck through vertical hangers — the most span-efficient long-range structure.',
    realWorldExample: 'Golden Gate Bridge (1280 m main span), Akashi Kaikyō Bridge (1991 m).',
    color: '#ce93d8',
    icon: '∪',
  },
];

// [RECOGNITION] Returns the pattern definition object for a given pattern ID
export function getPatternById(id) {
  return STRUCTURAL_PATTERNS.find(p => p.id === id) ?? null;
}
