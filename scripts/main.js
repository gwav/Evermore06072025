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

    // Define a basic actor type with HP = Constitution on creation
    CONFIG.Actor.documentClass = class EvermoreActor extends Actor {
        prepareData() {
            super.prepareData();
            const system = this.system;
            // Initialize HP to Constitution if not set or if 0
            if (!system?.hp?.value || system.hp.value === 0) {
                system.hp = system.hp || {};
                system.hp.value = system.attributes.constitution.value;
                system.hp.max = system.attributes.constitution.value;
            }
        }
    };

    // Unregister the default core sheet and register the custom sheet
    Actors.unregisterSheet("core", ActorSheet);

    // Register the custom character sheet
    Actors.registerSheet("evermore", EvermoreCharacterSheet, { types: ["character", "npc"], makeDefault: true });

    console.log("Evermore RPG System | Initialization complete!");
});

// Custom character sheet class
class EvermoreCharacterSheet extends ActorSheet {
    get template() {
        return "systems/evermore/templates/character-sheet.html";
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Handle attribute input changes
        html.find('.attr-input').change(ev => {
            const input = ev.currentTarget;
            const path = input.name;
            const value = Number(input.value);
            this.actor.update({ [path]: value });
        });

        // Handle single attribute roll
        html.find('.roll-attribute').click(async ev => {
            const attr = ev.currentTarget.dataset.attr;
            const roll = await (new Roll("1d8+6")).roll({ async: true });
            await this.actor.update({ [`system.attributes.${attr}.value`]: roll.total });
            ui.notifications.info(`${attr.charAt(0).toUpperCase() + attr.slice(1)} rolled: ${roll.total}`);
        });

        // Handle roll all attributes
        html.find('#roll-all-attributes').click(async () => {
            const attrs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
            const updates = {};
            for (const attr of attrs) {
                const roll = await (new Roll("1d8+6")).roll({ async: true });
                updates[`system.attributes.${attr}.value`] = roll.total;
            }
            await this.actor.update(updates);
            ui.notifications.info("All attributes rolled!");
        });
    }
}
