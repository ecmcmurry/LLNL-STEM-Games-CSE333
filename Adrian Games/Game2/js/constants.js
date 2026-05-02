//possible set up for the AI to utilize the board
const gridPositions = {};
//I gave every respective spot where a component or critical circuit board tool can be placed
for(let row = 1; row <= 8; row++){
    for(let col = 1; col <= 8; col++){
        gridPositions[`${row}x${col}`] = {
            top:  `${5.4  + (row - 1) * 11}%`,
            left: `${5.5  + (col - 1) * 11}%`
        };
    }
}

//Created each components with there respective images so its readable to the API Key that i am attempting
//to make generate levels
const componentTypes = {
    playerComponents: {
        HorizontalResistor:  'assets/horizontal-resistor-actual.png',
        VerticalResistor:    'assets/vertical-resistor.png',
        HorizontalBattery:   'assets/Horizontal-Battery.png',
        VerticalBattery:     'assets/Vertical-Battery.png',
        HorizontalCapacitor: 'assets/Capacitor.png',
        VerticalCapacitor:   'assets/Vertical-Capacitor.png',
        HorizontalInductor:  'assets/Inductor.png',
        VerticalInductor:    'assets/Vertical-Inductor.png',
        HorizontalSwitch:    'assets/Switch.gif',
        VerticalSwitch:      'assets/Switch.gif',
    },
    aiComponents: {
        HorizontalWire:       'assets/Wire-Horizontal2.png',
        VerticalWire:         'assets/vertical-wire.png',
        LeftDownWire:         'assets/Corner-Left-Down-wire.png',
        LeftUpWire:           'assets/Corner-Left-Up-wire.png',
        RightDownWire:        'assets/Corner-Down-Right-wire.png',
        RightUpWire:          'assets/Corner-Up-Right-wire.png',
        TUpWire:              'assets/Left-Up-Right-wire.png',
        TDownWire:            'assets/Left-Down-Right-wire.png',
        TLeftWire:            'assets/Left-Up-Down-wire.png',
        TRightWire:           'assets/Up-Down-Right-wire.png',
        PositiveTerminal:     'assets/positive2.png',
        NegativeTerminal:     'assets/negative.png',
        VoltageDivideEndUp:   'assets/Up-V-end.png',
        VoltageDivideEndDown: 'assets/Down-V-end.png',
        VoltageDivideEndLeft: 'assets/Left-V-end.png',
        VoltageDivideEndRight:'assets/Right-V-end.png',
        HorizontalResistor:   'assets/horizontal-resistor-actual.png',
        VerticalResistor:     'assets/vertical-resistor.png',
        HorizontalBattery:    'assets/Horizontal-Battery.png',
        VerticalBattery:      'assets/Vertical-Battery.png',
        HorizontalCapacitor:  'assets/Capacitor.png',
        VerticalCapacitor:    'assets/Vertical-Capacitor.png',
        HorizontalInductor:   'assets/Inductor.png',
        VerticalInductor:     'assets/Vertical-Inductor.png',
    }
};

//these are just all my hard coded levels that i had made my self 
const levels = [
    {
        category: 'ohmsLaw',//basic ohms law circuit board
        level: 1, 
        voltage: 12,
        goal: 3,
        goalType: 'current', 
        resistance: null,
        dropZones: [{ top: '49.4%', left: '60.5%' }],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_blank1.1.png',
        Answer: 3, 
        components: [
            {type: 'resistor', label: '4Ω', img: 'assets/horizontal-resistor.png', value: 4},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]   
    },

    {
        category: 'ohmsLaw',//basic ohms law circuit
        level: 2,
        fixedCurrent: 2,
        resistance: 4,
        voltage: null,
        goal: '(?)',
        goalType: 'voltage', 
        dropZones: [
            {top: '49%', left: '38.25%'},
        ],
        hint: "Ohm's Law: V = I × R",
        boardImg: 'assets/CircuitBoard_level2.png',
        Answer: 8,
        components: [
            {type: 'battery', label: '8V', img: 'assets/Horizontal-Battery.png', value: 8},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 3},
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },
    
    {
        category: 'ohmsLaw',//1 resistor and 1 battery circuit
        level: 3,
        fixedCurrent: 3,
        goal: 3,
        goalType: 'current',
        resistance: null,
        voltage: null,
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_level3.png',
        Answer: 3,
        components: [
            {type: 'resistor', label: '2Ω', img: 'assets/horizontal-resistor.png', value: 2},
            {type: 'resistor', label: '6Ω', img: 'assets/horizontal-resistor.png', value: 6}, 
            {type: 'battery', label: '6v', img: 'assets/Horizontal-Battery.png', value: 6},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 3},
        ]
    },

    {
        category: 'resistor',// series circuit 2 equivalence resistance
        level: 4,
        voltage: 15,
        fixedCurrent: 1,
        goalType: 'series',
        goal: 5,
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Series resistors: R_total = R1 + R2",
        boardImg: 'assets/CircuitBoard_level4.png',
        Answer: 13,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'resistor', //series equavalence circuit 3 resistors
        level: 5,
        voltage: 15,
        goal: 5,
        goalType: 'series',
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '38%', left: '38.26%'},
            {top: '16%', left: '38.26%'},
        ],
        hint: "Series resistors: R_total = R1 + R2 + R3",
        boardImg: 'assets/CircuitBoard_level5.png',
        Answer: 16,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    }, 

    {   
        category: 'resistor', //2 series resistors in parallel with 1 resistor 
        level: 6,
        voltage: 15,
        goal: 5,
        goalType: 'parallel',
        dropZones: [
            {top: '27.3%', left: '38.26%'},
            {top: '38%', left: '60.26%'},
            {top: '60%', left: '38.26%'},
        ],
        hint: "Parallel: 1/R_total = 1/R1 + 1/R2",
        boardImg: 'assets/CircuitBoard_level6.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
            {type: 'resistor', label: '10Ω', img: 'assets/horizontal-resistor.png', value: 10},
        ]
    },

    {
        category: 'complexLevel', //dropping correct capacitance basic board
        goalType: 'tau',
        level: 7,
        voltage: 15,
        fixedResistor: 10,
        resistance: 10,
        goal: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        hint: "RC Circuit: τ = R × C",
        boardImg: 'assets/CircuitBoard_level7.png',
        Answer: 5,
        components: [
        {type: 'capacitor', label: '0.2F', img: 'assets/Capacitor.png', value: 0.2},
        {type: 'capacitor', label: '0.5F', img: 'assets/Capacitor.png', value: 0.5}, 
        {type: 'capacitor', label: '1.0F', img: 'assets/Capacitor.png', value: 1.0},
        {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
        ]
    },
    {
        category: 'complexLevel', //dropping correct switch witha fixed resistor and capacitor simple circuit
        level: 8,
        fixedResistor: 5,      
        fixedCapacitor: 1,    
        goalType: 'switch',    
        hint: "τ = R × C — calculate the time constant then pick the right switch!",
        boardImg: 'assets/CircuitBoard_level8.png',
        Answer: 5,             
        dropZones: [
            {top: '71%', left: '60.26%'},
        ],
        components: [
            {type: 'switch', label: '3s', img: 'assets/Wire-Horizontal2.png', value: 3},
            {type: 'switch', label: '5s', img: 'assets/Wire-Horizontal2.png', value: 5},  
            {type: 'switch', label: '8s', img: 'assets/Wire-Horizontal2.png', value: 8},
        ]
    },
    {
        category: 'complexLevel',
        level: 9,
        fixedResistor: 1000,    
        goalType: 'tau',
        goal: 5,               
        hint: "RL Circuit: τ = L / R — pick the inductor that gives τ = 5s!",
        boardImg: 'assets/CircuitBoard_level9.png',
        Answer: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        components: [
            {type: 'inductor', label: '2000H', img: 'assets/Inductor.png', value: 2000},
            {type: 'inductor', label: '5000H', img: 'assets/Inductor.png', value: 5000}, 
            {type: 'inductor', label: '8000H', img: 'assets/Inductor.png', value: 8000},
        ]
    },

    {
        category: 'complexLevel', //Voltage division with the usefule formula
        level: 10,
        voltage: 12,          
        fixedR1: 8,             
        goalType: 'voltageDivider',
        hint: "Voltage Divider: V_out = V_in × R2 / (R1 + R2) — pick R2!",
        boardImg: 'assets/CircuitBoard_level10.png',
        Answer: 4,             
        dropZones: [
            {top: '27.3%', left: '38.26%'},  
        ],
        components: [
            {type: 'resistor', label: '2Ω',  img: 'assets/horizontal-resistor.png', value: 2},
            {type: 'resistor', label: '4Ω',  img: 'assets/horizontal-resistor.png', value: 4},  
            {type: 'resistor', label: '6Ω',  img: 'assets/horizontal-resistor.png', value: 6},
            {type: 'resistor', label: '10Ω', img: 'assets/horizontal-resistor.png', value: 10},
        ]
    },

//AI created this level based off a very critical prompt that i gave it. in api/generate
{
  "category": "ohmsLaw",
  "goalType": "current",
  "level": 99,
  "voltage": 12,
  "resistance": null,
  "fixedCurrent": null,
  "fixedResistor": null,
  "fixedCapacitor": null,
  "fixedR1": null,
  "fixedR2": null,
  "goal": 3,
  "hint": "I = V / R",
  "boardImg": "assets/EMPTY.png",
  "Answer": 3,
  "board": [
    { "position": "1x1", "type": "RightDownWire",    "fixed": true },
    { "position": "1x2", "type": "HorizontalWire",   "fixed": true },
    { "position": "1x3", "type": "HorizontalWire",   "fixed": true },
    { "position": "1x4", "type": "LeftDownWire",     "fixed": true },
    { "position": "2x1", "type": "VerticalWire",     "fixed": true },
    { "position": "2x4", "type": "VerticalWire",     "fixed": true },
    { "position": "3x1", "type": "HorizontalBattery","fixed": true, "value": 12, "label": "12V" },
    { "position": "3x4", "type": "DROP_ZONE",        "fixed": false, "isDropZone": true, "accepts": "resistor" },
    { "position": "4x1", "type": "VerticalWire",     "fixed": true },
    { "position": "4x4", "type": "VerticalWire",     "fixed": true },
    { "position": "5x1", "type": "RightUpWire",      "fixed": true },
    { "position": "5x2", "type": "HorizontalWire",   "fixed": true },
    { "position": "5x3", "type": "HorizontalWire",   "fixed": true },
    { "position": "5x4", "type": "LeftUpWire",       "fixed": true }
  ],
  "dropZones": [
    { "top": "27.4%", "left": "38.5%" }
  ],
  "components": [
    { "type": "resistor", "label": "4Ω", "img": "assets/horizontal-resistor.png", "value": 4 },
    { "type": "resistor", "label": "6Ω", "img": "assets/horizontal-resistor.png", "value": 6 },
    { "type": "resistor", "label": "8Ω", "img": "assets/horizontal-resistor.png", "value": 8 },
    { "type": "resistor", "label": "3Ω", "img": "assets/horizontal-resistor.png", "value": 3 }
  ]
}
];