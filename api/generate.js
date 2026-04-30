export default async function handler(req, res) {

    if(req.method !== 'POST'){
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            accuracy     = 50,
            category     = 'ohmsLaw',
            categoryName = "Ohm's Law",
            correct      = 0,
            incorrect    = 0
        } = req.body || {};

        const difficulty = accuracy >= 75 ? 'hard' : accuracy >= 50 ? 'medium' : 'easy';
        const spec = chooseSpec(category, difficulty);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type':      'application/json',
                'x-api-key':         process.env.ADRIAN,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 1000,
                temperature: 1.0,
                system:     buildSystemPrompt(),
                messages: [
                    { role: 'user',      content: buildUserPrompt(spec, category, categoryName, correct, incorrect, accuracy, difficulty) },
                    { role: 'assistant', content: '{' }
                ],
                stop_sequences: ['```']
            })
        });

        let level;
        if(response.ok){
            const data = await response.json();
            const raw  = '{' + (data.content[0]?.text ?? '');
            try {
                const modelValues = JSON.parse(stripMarkdown(raw));
                level = assembleLevel(spec, modelValues, category);
            } catch(parseErr) {
                console.error('[generate] parse failed, server-built fallback:', parseErr.message);
                level = assembleLevel(spec, null, category);
            }
        } else {
            const errBody = await response.text();
            console.error('[generate] Anthropic 4xx body:', errBody);
            level = assembleLevel(spec, null, category);
        }

        res.status(200).json(resolveDropZones(level));

    } catch(err) {
        console.error('[generate] outer error:', err);
        const spec = chooseSpec('ohmsLaw', 'easy');
        res.status(200).json(resolveDropZones(assembleLevel(spec, null, 'ohmsLaw')));
    }
}


function stripMarkdown(raw) {
    let text = raw.trim();
    text = text.replace(/^\s*```(?:json|JSON)?\s*/i, '');
    text = text.replace(/\s*```\s*$/i, '');
    const first = text.indexOf('{');
    const last  = text.lastIndexOf('}');
    if(first !== -1 && last > first){
        text = text.slice(first, last + 1);
    }
    return text.trim();
}


function resolveDropZones(level) {
    const zones = [];
    for(const cell of level.board){
        if(cell.isDropZone || cell.type === 'DROP_ZONE'){
            const [rowStr, colStr] = String(cell.position).split('x');
            const row  = parseInt(rowStr, 10);
            const col  = parseInt(colStr, 10);
            const top  = 5.4 + (row - 1) * 11;
            const left = 5.5 + (col - 1) * 11;
            zones.push({ top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` });
        }
    }
    level.dropZones = zones;
    return level;
}


// ────────── template + topic spec ──────────

const TEMPLATES = {
    series_1R: {
        dropZoneCount: 1,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'LeftUpWire',       fixed: true }
        ]
    },
    series_2R: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'VerticalWire',     fixed: true },
            { position: '5x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '6x1', type: 'VerticalWire',     fixed: true },
            { position: '6x3', type: 'VerticalWire',     fixed: true },
            { position: '7x1', type: 'RightUpWire',      fixed: true },
            { position: '7x2', type: 'HorizontalWire',   fixed: true },
            { position: '7x3', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'TDownWire',        fixed: true },
            { position: '1x3', type: 'HorizontalWire',   fixed: true },
            { position: '1x4', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x2', type: 'VerticalWire',     fixed: true },
            { position: '2x4', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x2', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x4', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x2', type: 'VerticalWire',     fixed: true },
            { position: '4x4', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'TUpWire',          fixed: true },
            { position: '5x3', type: 'HorizontalWire',   fixed: true },
            { position: '5x4', type: 'LeftUpWire',       fixed: true }
        ]
    },
    series_1R_mirror: {
        dropZoneCount: 1,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x3', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'LeftUpWire',       fixed: true }
        ]
    },
    series_1R_wide: {
        dropZoneCount: 1,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'HorizontalWire',   fixed: true },
            { position: '1x4', type: 'HorizontalWire',   fixed: true },
            { position: '1x5', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x5', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x5', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x5', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'HorizontalWire',   fixed: true },
            { position: '5x4', type: 'HorizontalWire',   fixed: true },
            { position: '5x5', type: 'LeftUpWire',       fixed: true }
        ]
    },
    series_1R_compact: {
        dropZoneCount: 1,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '2x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x1', type: 'VerticalWire',     fixed: true },
            { position: '3x3', type: 'VerticalWire',     fixed: true },
            { position: '4x1', type: 'RightUpWire',      fixed: true },
            { position: '4x2', type: 'HorizontalWire',   fixed: true },
            { position: '4x3', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_compact: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'TDownWire',        fixed: true },
            { position: '1x3', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x2', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x2', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x2', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'TUpWire',          fixed: true },
            { position: '5x3', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_mirror: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'TDownWire',        fixed: true },
            { position: '1x4', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '2x4', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x3', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x4', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '4x4', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'TUpWire',          fixed: true },
            { position: '5x4', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_center: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'TDownWire',        fixed: true },
            { position: '1x4', type: 'HorizontalWire',   fixed: true },
            { position: '1x5', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x3', type: 'VerticalWire',     fixed: true },
            { position: '2x5', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x3', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x5', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x3', type: 'VerticalWire',     fixed: true },
            { position: '4x5', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'TUpWire',          fixed: true },
            { position: '5x4', type: 'HorizontalWire',   fixed: true },
            { position: '5x5', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_tall: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'TDownWire',        fixed: true },
            { position: '1x3', type: 'HorizontalWire',   fixed: true },
            { position: '1x4', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x2', type: 'VerticalWire',     fixed: true },
            { position: '2x4', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'VerticalWire',     fixed: true },
            { position: '3x2', type: 'VerticalWire',     fixed: true },
            { position: '3x4', type: 'VerticalWire',     fixed: true },
            { position: '4x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '4x2', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x4', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '5x1', type: 'VerticalWire',     fixed: true },
            { position: '5x2', type: 'VerticalWire',     fixed: true },
            { position: '5x4', type: 'VerticalWire',     fixed: true },
            { position: '6x1', type: 'VerticalWire',     fixed: true },
            { position: '6x2', type: 'VerticalWire',     fixed: true },
            { position: '6x4', type: 'VerticalWire',     fixed: true },
            { position: '7x1', type: 'RightUpWire',      fixed: true },
            { position: '7x2', type: 'TUpWire',          fixed: true },
            { position: '7x3', type: 'HorizontalWire',   fixed: true },
            { position: '7x4', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_wide: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'TDownWire',        fixed: true },
            { position: '1x3', type: 'HorizontalWire',   fixed: true },
            { position: '1x4', type: 'HorizontalWire',   fixed: true },
            { position: '1x5', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x2', type: 'VerticalWire',     fixed: true },
            { position: '2x5', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '3x2', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x5', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x2', type: 'VerticalWire',     fixed: true },
            { position: '4x5', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'TUpWire',          fixed: true },
            { position: '5x3', type: 'HorizontalWire',   fixed: true },
            { position: '5x4', type: 'HorizontalWire',   fixed: true },
            { position: '5x5', type: 'LeftUpWire',       fixed: true }
        ]
    },
    parallel_2R_wide_mirror: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'RightDownWire',    fixed: true },
            { position: '1x2', type: 'HorizontalWire',   fixed: true },
            { position: '1x3', type: 'HorizontalWire',   fixed: true },
            { position: '1x4', type: 'TDownWire',        fixed: true },
            { position: '1x5', type: 'LeftDownWire',     fixed: true },
            { position: '2x1', type: 'VerticalWire',     fixed: true },
            { position: '2x4', type: 'VerticalWire',     fixed: true },
            { position: '2x5', type: 'VerticalWire',     fixed: true },
            { position: '3x1', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x4', type: 'DROP_ZONE',        fixed: false, isDropZone: true, accepts: 'resistor' },
            { position: '3x5', type: 'HorizontalBattery', fixed: true, isBattery: true },
            { position: '4x1', type: 'VerticalWire',     fixed: true },
            { position: '4x4', type: 'VerticalWire',     fixed: true },
            { position: '4x5', type: 'VerticalWire',     fixed: true },
            { position: '5x1', type: 'RightUpWire',      fixed: true },
            { position: '5x2', type: 'HorizontalWire',   fixed: true },
            { position: '5x3', type: 'HorizontalWire',   fixed: true },
            { position: '5x4', type: 'TUpWire',          fixed: true },
            { position: '5x5', type: 'LeftUpWire',       fixed: true }
        ]
    },
    voltageDivider_H: {
        dropZoneCount: 2,
        board: [
            { position: '1x1', type: 'VoltageDivideEndRight', fixed: true, isVIn: true,  terminal: 'Vin+'  },
            { position: '1x2', type: 'HorizontalWire',        fixed: true },
            { position: '1x3', type: 'HorizontalWire',        fixed: true },
            { position: '1x4', type: 'HorizontalWire',        fixed: true },
            { position: '1x5', type: 'LeftDownWire',          fixed: true },
            { position: '2x5', type: 'DROP_ZONE',             fixed: false, isDropZone: true, accepts: 'resistor', slot: 'R1' },
            { position: '3x5', type: 'TRightWire',            fixed: true },
            { position: '3x6', type: 'HorizontalWire',        fixed: true },
            { position: '3x7', type: 'HorizontalWire',        fixed: true },
            { position: '3x8', type: 'VoltageDivideEndLeft',  fixed: true, isVOut: true, terminal: 'Vout+' },
            { position: '4x5', type: 'DROP_ZONE',             fixed: false, isDropZone: true, accepts: 'resistor', slot: 'R2' },
            { position: '5x1', type: 'VoltageDivideEndRight', fixed: true, isVIn: true,  terminal: 'Vin-'  },
            { position: '5x2', type: 'HorizontalWire',        fixed: true },
            { position: '5x3', type: 'HorizontalWire',        fixed: true },
            { position: '5x4', type: 'HorizontalWire',        fixed: true },
            { position: '5x5', type: 'TUpWire',               fixed: true },
            { position: '5x6', type: 'HorizontalWire',        fixed: true },
            { position: '5x7', type: 'HorizontalWire',        fixed: true },
            { position: '5x8', type: 'VoltageDivideEndLeft',  fixed: true, isVOut: true, terminal: 'Vout-' }
        ]
    }
};

const TOPIC_RULES = {
    ohmsLaw: [
        { goalType: 'current', templateName: 'series_1R',         hint: "Ohm's Law: I = V / R" },
        { goalType: 'current', templateName: 'series_1R_mirror',  hint: "Ohm's Law: I = V / R" },
        { goalType: 'current', templateName: 'series_1R_wide',    hint: "Ohm's Law: I = V / R" },
        { goalType: 'current', templateName: 'series_1R_compact', hint: "Ohm's Law: I = V / R" }
    ],
    resistor: [
        { goalType: 'series',   templateName: 'series_2R',              hint: 'Series: R_total = R1 + R2' },
        { goalType: 'parallel', templateName: 'parallel_2R',            hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_wide',       hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_compact',    hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_mirror',     hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_center',     hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_tall',       hint: 'Parallel: 1/R = 1/R1 + 1/R2' },
        { goalType: 'parallel', templateName: 'parallel_2R_wide_mirror',hint: 'Parallel: 1/R = 1/R1 + 1/R2' }
    ],
    complexLevel: [
        { goalType: 'voltageDivider', templateName: 'voltageDivider_H', hint: 'V_out = V_in × R2 / (R1 + R2)' }
    ]
};

function chooseSpec(category, difficulty) {
    const rules = TOPIC_RULES[category] || TOPIC_RULES.ohmsLaw;
    const rule  = rules[Math.floor(Math.random() * rules.length)];
    const voltageRange = difficulty === 'hard' ? [12, 24] : difficulty === 'medium' ? [10, 20] : [6, 12];
    return { ...rule, voltageRange, templateName: rule.templateName };
}

function randInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}


// ────────── prompts ──────────

function buildSystemPrompt() {
    return `You generate numeric values for a circuit theory puzzle level.

OUTPUT RULE (CRITICAL):
Respond with a single raw JSON object and nothing else. No markdown, no prose, no code fences, no backticks. Start with { and end with }. Must parse with JSON.parse() as-is.

You do NOT design the board. You only pick numbers (voltage, resistor values, goal) that make the formula work out to an integer.`;
}

function buildUserPrompt(spec, category, categoryName, correct, incorrect, accuracy, difficulty) {
    const [vLo, vHi] = spec.voltageRange;
    const nonce = Math.random().toString(36).slice(2, 10);
    const hintV = randInt(vLo, vHi);
    const hintR = randInt(2, 10);

    const topicInstructions = ({
        current: `Pick a voltage V in [${vLo}, ${vHi}] and a resistance R (positive integer) so that V / R is a small positive integer. The student will drop R. "goal" = V / R.`,
        voltage: `Pick a current I (positive integer 1-5) and a resistance R (positive integer 2-10) so that I * R is an integer in [${vLo}, ${vHi}]. The student will drop the battery value. "goal" = I * R.`,
        series:  `Pick two resistor values R1, R2 (positive integers 2-10) and a voltage in [${vLo}, ${vHi}]. The student will drop BOTH resistors. "goal" = R1 + R2.`,
        parallel:`Pick two resistor values R1, R2 (positive integers 2-12) such that (R1*R2)/(R1+R2) is an integer, and a voltage in [${vLo}, ${vHi}]. The student will drop BOTH resistors. "goal" = (R1*R2)/(R1+R2).`,
        voltageDivider: `Pick V_in in [${vLo}, ${vHi}] and two resistor values R1, R2 (positive integers 2-10) such that V_in * R2 / (R1 + R2) is a small positive integer. "goal" = V_out.`
    })[spec.goalType];

    return `Call id: ${nonce}
Seed hints (lean toward FRESH values near these, do not reuse previous call numbers): V~${hintV}, R~${hintR}

Student performance:
- category:   ${category} (${categoryName})
- correct:    ${correct}
- incorrect:  ${incorrect}
- accuracy:   ${accuracy}%
- difficulty: ${difficulty}

Topic: ${spec.goalType}
Formula: ${spec.hint}

${topicInstructions}

Respond with this exact shape (fill the <...> slots with integers):
{
  "voltage": <int or null>,
  "current": <int or null>,
  "r1": <int or null>,
  "r2": <int or null>,
  "answer": <int>,
  "distractors": [<int>, <int>, <int>]
}

Rules:
- "answer" must be the exact integer result of the formula using your picked numbers.
- "distractors" are 3 DIFFERENT wrong resistor values (not equal to any correct value).
- Vary your numbers aggressively each call — do not repeat the same voltage or resistors.`;
}


// ────────── assemble final level from spec + model values ──────────

function assembleLevel(spec, modelValues, category) {
    const [vLo, vHi] = spec.voltageRange;
    const tpl = TEMPLATES[spec.templateName];

    const v  = clampInt(modelValues?.voltage, vLo, vHi, randInt(vLo, vHi));
    const i  = clampInt(modelValues?.current, 1,   5,   randInt(1, 5));
    const r1 = clampInt(modelValues?.r1,      2,   12,  randInt(2, 10));
    const r2 = clampInt(modelValues?.r2,      2,   12,  randInt(2, 10));

    let voltage = v, resistance = null, fixedCurrent = null, fixedR1 = null, fixedR2 = null;
    let correctValue, goal;
    const components = [];

    switch(spec.goalType){
        case 'current': {
            const [V, R] = pickCurrentPair(vLo, vHi);
            voltage = V;
            resistance = null;
            goal = V / R;
            correctValue = R;
            components.push(resistor(R));
            break;
        }
        case 'voltage': {
            const [I, R] = pickVoltagePair(vLo, vHi);
            voltage = null;
            resistance = R;
            fixedCurrent = I;
            goal = I * R;
            correctValue = I * R;
            components.push(battery(correctValue));
            break;
        }
        case 'series': {
            const R1 = randInt(2, 10);
            const R2 = randInt(2, 10);
            goal = R1 + R2;
            components.push(resistor(R1), resistor(R2));
            break;
        }
        case 'parallel': {
            const [a, b] = pickParallelPair();
            goal = (a * b) / (a + b);
            components.push(resistor(a), resistor(b));
            break;
        }
        case 'voltageDivider': {
            const vin = randInt(vLo, vHi);
            const [R1, R2] = pickDividerPair(vin);
            voltage = vin;
            goal = Math.round((vin * R2) / (R1 + R2));
            components.push(resistor(R1), resistor(R2));
            break;
        }
    }

    const existing = new Set(components.filter(c => c.type === 'resistor').map(c => c.value));
    const picks = Array.isArray(modelValues?.distractors) ? modelValues.distractors.filter(x => Number.isInteger(x) && x > 0 && !existing.has(x)) : [];
    while(picks.length < 3){
        const d = randInt(2, 15);
        if(!existing.has(d) && !picks.includes(d)) picks.push(d);
    }
    picks.slice(0, 3).forEach(d => components.push(resistor(d)));

    const board = tpl.board.map(cell => {
        if(cell.isBattery){
            const vLabel = voltage ?? correctValue ?? v;
            return { position: cell.position, type: 'HorizontalBattery', fixed: true, value: vLabel, label: `${vLabel}V` };
        }
        return { ...cell };
    });

    return {
        category,
        goalType:       spec.goalType,
        level:          99,
        voltage,
        resistance,
        fixedCurrent,
        fixedResistor:  null,
        fixedCapacitor: null,
        fixedR1,
        fixedR2,
        goal,
        hint:           spec.hint,
        boardImg:       'assets/EMPTY.png',
        Answer:         goal,
        board,
        dropZones:      [],
        components
    };
}

function clampInt(n, lo, hi, fallback) {
    if(!Number.isFinite(n)) return fallback;
    const val = Math.round(n);
    return val < lo || val > hi ? fallback : val;
}

function pickCurrentPair(vLo, vHi) {
    const options = [];
    for(let V = vLo; V <= vHi; V++){
        for(let R = 2; R <= 12; R++){
            if(V % R !== 0) continue;
            const I = V / R;
            if(I >= 1 && I <= 6) options.push([V, R]);
        }
    }
    if(options.length === 0) return [vLo, 2];
    return options[Math.floor(Math.random() * options.length)];
}

function pickVoltagePair(vLo, vHi) {
    const options = [];
    for(let I = 1; I <= 5; I++){
        for(let R = 2; R <= 10; R++){
            const prod = I * R;
            if(prod >= vLo && prod <= vHi) options.push([I, R]);
        }
    }
    if(options.length === 0) return [1, vLo];
    return options[Math.floor(Math.random() * options.length)];
}

function pickParallelPair() {
    const options = [];
    for(let a = 2; a <= 12; a++){
        for(let b = a; b <= 12; b++){
            if((a * b) % (a + b) === 0) options.push([a, b]);
        }
    }
    return options[Math.floor(Math.random() * options.length)];
}

function pickDividerPair(vin) {
    const options = [];
    for(let R1 = 2; R1 <= 10; R1++){
        for(let R2 = 2; R2 <= 10; R2++){
            const vout = (vin * R2) / (R1 + R2);
            if(Number.isInteger(vout) && vout > 0 && vout < vin) options.push([R1, R2]);
        }
    }
    if(options.length === 0) return [3, 2];
    return options[Math.floor(Math.random() * options.length)];
}

function resistor(value) {
    return { type: 'resistor', label: `${value}Ω`, img: 'assets/horizontal-resistor.png', value };
}

function battery(value) {
    return { type: 'battery', label: `${value}V`, img: 'assets/Horizontal-Battery.png', value };
}
