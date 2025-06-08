Hooks.once("init", () => {
    console.log("Evermore RPG System | Initializing...");

    // Register system settings
    game.settings.register("evermore", "defaultAttribute", {
        name: "Default Attribute",
        hint: "Sets the default primary attribute for characters.",
        scope: "world",
        config: true,
        type: String,
        default: "strength"
    });

    // Define a basic actor type with default attributes
    CONFIG.Actor.documentClass = class EvermoreActor extends Actor {
        prepareData() {
            super.prepareData();
            // Ensure attributes exist and are initialized
            if (!this.system.attributes) this.system.attributes = {};
            const defaults = {
                strength: { value: 8, max: 18, description: "Measures bodily power, athletic training, and raw physical force." },
                dexterity: { value: 8, max: 18, description: "Measures agility, reflexes, and balance." },
                constitution: { value: 8, max: 18, description: "Measures health, stamina, and vital force." },
                intelligence: { value: 8, max: 18, description: "Measures mental acuity, recall, and reasoning." },
                wisdom: { value: 8, max: 18, description: "Reflects perceptiveness, intuition, and attunement to the world." },
                charisma: { value: 8, max: 18, description: "Measures ability to interact, confidence, and personality." },
                hp: { value: 10, max: 10 }
            };
            for (const [key, val] of Object.entries(defaults)) {
                if (!this.system.attributes[key]) this.system.attributes[key] = foundry.utils.deepClone(val);
            }
        }
    };

    // Register the character sheet for both character and npc types
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("evermore", class EvermoreCharacterSheet extends ActorSheet {
        get template() {
            return "systems/evermore/templates/character-sheet.html";
        }
    }, { types: ["character", "npc"], makeDefault: true });

    console.log("Evermore RPG System | Initialization complete!");
});

// Ensure new actors get default attributes on creation
Hooks.on("preCreateActor", (actor, data, options, userId) => {
    if (actor.type === "character" || actor.type === "npc") {
        if (!data.system) data.system = {};
        if (!data.system.attributes) {
            data.system.attributes = {
                strength: { value: 8, max: 18, description: "Measures bodily power, athletic training, and raw physical force." },
                dexterity: { value: 8, max: 18, description: "Measures agility, reflexes, and balance." },
                constitution: { value: 8, max: 18, description: "Measures health, stamina, and vital force." },
                intelligence: { value: 8, max: 18, description: "Measures mental acuity, recall, and reasoning." },
                wisdom: { value: 8, max: 18, description: "Reflects perceptiveness, intuition, and attunement to the world." },
                charisma: { value: 8, max: 18, description: "Measures ability to interact, confidence, and personality." },
                hp: { value: 10, max: 10 }
            };
        }
    }
});