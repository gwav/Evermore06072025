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

    // Define a basic actor type
    CONFIG.Actor.documentClass = class EvermoreActor extends Actor {
        prepareData() {
            super.prepareData();
            console.log("Evermore RPG System | Preparing actor data...");
            // Initialize default attributes if missing
            if (!this.system.attributes) this.system.attributes = {};
            const defaults = {
                strength: { value: 8, max: 18 },
                dexterity: { value: 8, max: 18 },
                constitution: { value: 8, max: 18 },
                intelligence: { value: 8, max: 18 },
                wisdom: { value: 8, max: 18 },
                charisma: { value: 8, max: 18 },
                hp: { value: 10, max: 10 }
            };
            for (const [key, val] of Object.entries(defaults)) {
                if (!this.system.attributes[key]) this.system.attributes[key] = foundry.utils.deepClone(val);
            }
        }
    };

    // Register the character sheet
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("evermore", class EvermoreCharacterSheet extends ActorSheet {
        get template() {
            return "systems/evermore/templates/character-sheet.html";
        }
    }, { types: ["character"], makeDefault: true });

    console.log("Evermore RPG System | Initialization complete!");
});

// Ensure new actors get default attributes
Hooks.on("preCreateActor", (actor, data, options, userId) => {
    if (actor.type === "character") {
        if (!data.system) data.system = {};
        if (!data.system.attributes) {
            data.system.attributes = {
                strength: { value: 8, max: 18 },
                dexterity: { value: 8, max: 18 },
                constitution: { value: 8, max: 18 },
                intelligence: { value: 8, max: 18 },
                wisdom: { value: 8, max: 18 },
                charisma: { value: 8, max: 18 },
                hp: { value: 10, max: 10 }
            };
        }
    }
});