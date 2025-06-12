class EvermoreCharacterSheet extends ActorSheet {
    class EvermoreCharacterSheet extends ActorSheet {
    getData() {
        const data = super.getData();

        // Ensure kin options are available in the template
        data.actor.system.persona.kin.options = data.actor.system.persona.kin.options || [];

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Handle Kin selection
        html.find('#kin-selection input[type="radio"]').change(ev => {
            const selectedKin = ev.currentTarget.value;
            this.actor.update({ "system.persona.kin.value": selectedKin });
        });

        // Handle attribute input changes
        html.find('.attr-input').change(ev => {
            const input = ev.currentTarget;
            const path = input.name;
            const value = Number(input.value);
            this.actor.update({ [path]: value });
        });
    }
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
