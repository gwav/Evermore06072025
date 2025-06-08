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
        }
    };

    // Register the character sheet
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("evermore", class EvermoreCharacterSheet extends ActorSheet {
        get template() {
            return "systems/evermore/templates/character-sheet.html";
        }
    }, { types: ["character"], makeDefault: true });

    Actors.registerSheet("evermore", EvermoreActorSheet, { 
        types: ["character", "npc"], 
        makeDefault: true 
    });

    console.log("Evermore RPG System | Initialization complete!");
});
