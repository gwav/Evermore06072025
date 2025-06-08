// ... (rest of your init code above)

Actors.unregisterSheet("core", ActorSheet);
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
      const roll = await (new Roll("1d8+6")).roll({async: true});
      await this.actor.update({ [`system.attributes.${attr}.value`]: roll.total });
      ui.notifications.info(`${attr.charAt(0).toUpperCase() + attr.slice(1)} rolled: ${roll.total}`);
    });

    // Handle roll all attributes
    html.find('#roll-all-attributes').click(async () => {
      const attrs = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
      const updates = {};
      for (const attr of attrs) {
        const roll = await (new Roll("1d8+6")).roll({async: true});
        updates[`system.attributes.${attr}.value`] = roll.total;
      }
      await this.actor.update(updates);
      ui.notifications.info("All attributes rolled!");
    });
  }
}
Actors.registerSheet("evermore", EvermoreCharacterSheet, { types: ["character", "npc"], makeDefault: true });