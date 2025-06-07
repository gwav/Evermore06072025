Hooks.once("init", () => {
    console.log("Evermore RPG System | Initializing...");

    // Register system settings (example)
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

    console.log("Evermore RPG System | Initialization complete!");
});
