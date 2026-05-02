const { checkPPEAnswers, calculateReaction, setAlpha, mixColors, distance, buildRunSummary, buildSystemPrompt } = require("../utils.js");
const { REACTIONS } = require('../reactions.js');
global.REACTIONS = REACTIONS;

describe("checkPPEAnswers", () => {
    
    test("All correct answers", () => {
        const answers = REACTIONS.hcl_naoh.safety;
        const inputs = {
            eye: answers.eyeAndFace.equipment,
            hands: answers.hands.equipment,
            body: answers.body.equipment,
            foot: answers.foot.equipment,
            respiratory: answers.respiratory.equipment
        }
        const result = checkPPEAnswers(inputs, answers);
        expect(result).toEqual([true, true, true, true, true]);
    });

    test("All wrong answers", () => {
        const answers = REACTIONS.hcl_naoh.safety;
        const inputs = {
            eye: "Wrong",
            hands: "Wrong",
            body: "Wrong",
            foot: "Wrong",
            respiratory: "Wrong"
        }
        const result = checkPPEAnswers(inputs, answers);
        expect(result).toEqual([false, false, false, false, false]);
    });

    test("Partial correct answers", () => {
        const answers = REACTIONS.hcl_naoh.safety;
        const inputs = {
            eye: answers.eyeAndFace.equipment,
            hands: "Wrong",
            body: answers.body.equipment,
            foot: "Wrong",
            respiratory: answers.respiratory.equipment
        };
        const result = checkPPEAnswers(inputs, answers);
        expect(result).toEqual([true, false, true, false, true]);
    });
});

describe("calculateReaction", () => {

    test("Calculate proper moles for a balanced equation", () => {
        //100mL of each reactant 
        const hclNaoh = REACTIONS.hcl_naoh;
        const result = calculateReaction([100,100], hclNaoh.reactants, hclNaoh.products);
        expect(result.products[0].molesProduced).toBeCloseTo(0.1, 2);
    });

    test("Properly identifies limiting reactant", () => {
        //50mL of reactant 0, and 100mL of reactant 1
        const hclNaoh = REACTIONS.hcl_naoh;
        const result = calculateReaction([50,100], hclNaoh.reactants, hclNaoh.products);
        //reactant 0 should be identified as the limiting reactant
        expect(result.reactants[0].molesExcess).toBeCloseTo(0, 5);
        //As such, reactant 1 should have excess moles
        expect(result.reactants[1].molesExcess).toBeGreaterThan(0);
    });

    test("Properly identifies moles unreacted in unbalanced equation", () => {
        //50mL of reactant 0, and 100mL of reactant 1
        const hclNaoh = REACTIONS.hcl_naoh;
        const result = calculateReaction([50,100], hclNaoh.reactants, hclNaoh.products);
        //reactant 0 should be using all of the moles added
        expect(result.reactants[0].molesUsed).toBeCloseTo(result.reactants[0].molesAdded, 5);
        //reactant 1 should have 0.05 moles unreacted
        expect(result.reactants[1].molesExcess).toBeCloseTo(0.05, 3);
    });

});

describe("setAlpha", () => {
    
    test("Sets the alpha for an rgba string", () => {
        const result = setAlpha("rgba(255, 255, 255, 0.5)", 0.75);
        expect(result).toBe("rgba(255, 255, 255,0.75)");
    });

    test("Sets the alpha for an rgb string", () => {
        const result = setAlpha("rgb(255, 255, 255)", 0.25, false);
        expect(result).toBe("rgba(255, 255, 255,0.25)");
    });

    test("Handles rgba without spaces", () => {
        const result = setAlpha("rgba(255,255,255,0.5)", 0.75);
        expect(result).toBe("rgba(255,255,255,0.75)");
    });
});

describe("mixColors", () => {
    
    test("Mixes two rgba strings", () => {
        const result = mixColors("rgba(200,200,200,0.8)", "rgba(100,100,100,0.4)");
        expect(result).toContain("rgba(150,150,150,");
        expect(result).toContain("0.6");
    });

    test("Mixes two rgb strings", () => {
        const result = mixColors("rgb(200,200,200)", "rgb(100,100,100)");
        expect(result).toContain("rgb(150,150,150)");
    });

    test("Mixes an rgb string and an rgba string", () => {
        const result = mixColors("rgb(200,200,200)", "rgba(100,100,100,0.5)");
        expect(result).toContain("rgba(150,150,150,");
        expect(result).toContain("0.75");
    });

    test("Mixes two identical colours", () => {
        const result = mixColors("rgba(255, 0, 128, 0.5)", "rgba(255, 0, 128, 0.5)");
        expect(result).toBe("rgba(255,0,128,0.5)");
    });
});

describe("distance", () => {
    //
    test("Distance between two of the same point", () => {
        const result = distance(1,1, 1,1);
        expect(result).toBeCloseTo(0, 5);
    });

    test("X Distance", () => {
        const result = distance(10,1, 0,1);
        expect(result).toBeCloseTo(10, 3);
    });

    test("Y Distance", () => {
        const result = distance(1,10, 1,0);
        expect(result).toBeCloseTo(10, 3);
    });

    test("X+Y Distance", () => {
        const result = distance(10,10, 0,0);
        expect(result).toBeCloseTo(Math.sqrt(200), 5);
    });

    test("Distance with negative coordinates", () => {
        const result = distance(-5, -5, 5, 5);
        expect(result).toBeCloseTo(Math.sqrt(200), 5); // same as (10,10) to (0,0)
    });
});

//Claude assisted in the generation of these tests
describe("buildRunSummary", () => {
    //Even after modifying the function to accept additional paremeters, there are too many things that go into the summary
    //This runs before each test to initialize some variables
    beforeEach(() => {
        global.yieldPercent = 94;
        global.evidenceStatement = "The temperature rose from 20°C to 27°C, showing the reaction was exothermic.";
        global.predictions = REACTIONS.hcl_naoh.predictions;
        global.playerPredictions = [
            "Release heat (exothermic)",
            "Neutral (pH 7)",
            "No, all products will remain in solution",
            "No, no gas will be produced",
            "Acid-base neutralisation",
            "Na⁺ and Cl⁻ ions"
        ];
        global.volumes = [100, 100];
        global.moles = {
            reactants: [
                { molesAdded: 0.1, molesExcess: 0, molesUsed: 0.1 },
                { molesAdded: 0.1, molesExcess: 0, molesUsed: 0.1 }
            ]
        };
    });

    test("Builds correct summary for HCl + NaOH reaction", () => {
        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.reactionName).toBe("Hydrochloric acid + Sodium hydroxide");
        expect(summary.yieldPercent).toBe(94);
        expect(summary.evidenceStatement).toBe("The temperature rose from 20°C to 27°C, showing the reaction was exothermic.");
        expect(summary.equationBalanced).toBe(true);
    });

    test("Reactants array is correctly formatted", () => {
        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.reactants).toEqual([
            "Hydrochloric acid (HCl)",
            "Sodium hydroxide solution (NaOH)"
        ]);
    });

    test("Products array is correctly formatted", () => {
        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.products).toEqual([
            "Sodium chloride (NaCl)",
            "Water (H2O)"
        ]);
    });

    test("Predictions are correctly mapped with student answers", () => {
        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.predictions[0]).toEqual({
            question: "Will this reaction release or absorb heat?",
            studentAnswer: "Release heat (exothermic)",
            correctAnswer: "Release heat (exothermic)",
            correct: true
        });
    });

    test("Volumes are correctly summarized", () => {
        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.volumes[0]).toEqual({
            name: "Hydrochloric acid",
            symbol: "HCl",
            volumeML: 100,
            molesAdded: 0.1,
            molesExcess: 0,
            isLimiting: true
        });
    });

    test("Detects imbalanced equations", () => {
        //Simulates imbalanced volumes
        volumes = [50, 100];
        moles.reactants[0].molesExcess = 0;
        moles.reactants[1].molesExcess = 0.05;

        const hclNaoh = REACTIONS.hcl_naoh;
        const summary = buildRunSummary("hcl_naoh", hclNaoh.reactants, hclNaoh.products);

        expect(summary.equationBalanced).toBe(false);
        expect(summary.volumes[1].isLimiting).toBe(false);
    });

    test("Works with different reactions", () => {
        const pbKi = REACTIONS.pb_no3_ki;
        const summary = buildRunSummary("pb_no3_ki", pbKi.reactants, pbKi.products);

        expect(summary.reactionName).toBe("Lead nitrate + Potassium iodide");
        expect(summary.debriefTargets).toBeDefined();
    });
});

//Claude assisted in the generation of these tests
describe("buildSystemPrompt", () => {
    let mockSummary;

    beforeEach(() => {
        mockSummary = {
            reactionName: "Hydrochloric acid + Sodium hydroxide",
            reactants: ["Hydrochloric acid (HCl)", "Sodium hydroxide solution (NaOH)"],
            products: ["Sodium chloride (NaCl)", "Water (H2O)"],
            energyChange: "exothermic",
            yieldPercent: 94,
            evidenceStatement: "The temperature rose from 20°C to 27°C.",
            predictions: [
                {
                    question: "Will this reaction release or absorb heat?",
                    studentAnswer: "Absorb heat (endothermic)",
                    correctAnswer: "Release heat (exothermic)",
                    correct: false
                }
            ],
            debriefTargets: [
                "Why the reaction is exothermic and what evidence supported this",
                "The role of the limiting reactant and how it affected yield"
            ],
            // This was missing
            volumes: [
                {
                    name: "Hydrochloric acid",
                    symbol: "HCl",
                    volumeML: 100,
                    molesAdded: 0.1,
                    molesExcess: 0,
                    isLimiting: true
                },
                {
                    name: "Sodium hydroxide solution",
                    symbol: "NaOH",
                    volumeML: 100,
                    molesAdded: 0.1,
                    molesExcess: 0,
                    isLimiting: true
                }
            ]
        };
    });

    test("Includes all sections", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("Socratic chemistry tutor");
        expect(prompt).toContain("EXPERIMENT CONTEXT");
        expect(prompt).toContain("STUDENT PERFORMANCE");
        expect(prompt).toContain("YOUR BEHAVIOUR RULES");
        expect(prompt).toContain("UNIVERSAL LEARNING TARGETS");
        expect(prompt).toContain("REACTION-SPECIFIC LEARNING TARGETS");
        expect(prompt).toContain("OPENING MESSAGE");
    });

    test("Includes reaction data", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("Hydrochloric acid + Sodium hydroxide");
        expect(prompt).toContain("exothermic");
        expect(prompt).toContain("Hydrochloric acid (HCl)");
        expect(prompt).toContain("Sodium hydroxide solution (NaOH)");
    });

    test("Includes student predictions", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("Will this reaction release or absorb heat?");
        expect(prompt).toContain("Absorb heat (endothermic)");
        expect(prompt).toContain("Release heat (exothermic)");
        expect(prompt).toContain("Incorrect");
    });

    test("Includes the evidence statement", () => {
        const prompt = buildSystemPrompt(mockSummary);
        expect(prompt).toContain("The temperature rose from 20°C to 27°C.");
    });

    test("Labels excellent yield appropriately", () => {
        mockSummary.yieldPercent = 94;
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("excellent yield");
        expect(prompt).toContain("do not question it");
    });

    test("Labels poor yield appropriately", () => {
        mockSummary.yieldPercent = 75;
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("lower than expected");
        expect(prompt).toContain("worth discussing");
    });

    test("Labels acceptable yield appropriately", () => {
        mockSummary.yieldPercent = 85;
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("acceptable yield");
    });

    test("Includes reaction-specific learning goals", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("Why the reaction is exothermic");
        expect(prompt).toContain("The role of the limiting reactant");
    });

    test("Includes universal learning goals", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("limiting reactant");
        expect(prompt).toContain("yield is rarely 100%");
    });

    test("Works with different reactions", () => {
        mockSummary.reactionName = "Lead nitrate + Potassium iodide";
        mockSummary.debriefTargets = [
            "Why a precipitate formed",
            "Solubility rules"
        ];

        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt).toContain("Lead nitrate + Potassium iodide");
        expect(prompt).toContain("Why a precipitate formed");
        expect(prompt).toContain("Solubility rules");
    });

    test("Prompt is not empty", () => {
        const prompt = buildSystemPrompt(mockSummary);

        expect(prompt.length).toBeGreaterThan(500);
    });
});