
const { mergeObject } = foundry.utils;

export default class InventoryItemSheet extends ItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lastdays", "sheet", "item"],
      template: "systems/lastdays/templates/items/inventory-sheet.hbs",
      width: 500,
      height: "auto"
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.system = this.item.system;
    return data;
  }
  
  activateListeners(html) {
    super.activateListeners(html);

    // Damage type add/remove logic for weapons
    const addBtn = html.find('#addDamageType');
    const select = html.find('#damageTypeSelect');
    const tagsDiv = html.find('#damageTypeTags');
    const hiddenInput = html.find("input[name='system.damageType']");

    if (addBtn.length && select.length && hiddenInput.length) {
      addBtn.on('click', (ev) => {
        const val = select.val();
        if (!val) return;
        let types = hiddenInput.val() ? hiddenInput.val().split(',') : [];
        if (!types.includes(val)) {
          types.push(val);
          hiddenInput.val(types.join(','));
          this._onSubmit(ev);
        }
      });
    }

    if (tagsDiv.length && hiddenInput.length) {
      tagsDiv.on('click', '.remove-damage-type', (ev) => {
        const type = ev.currentTarget.dataset.type;
        let types = hiddenInput.val() ? hiddenInput.val().split(',') : [];
        types = types.filter(t => t !== type);
        hiddenInput.val(types.join(','));
        this._onSubmit(ev);
      });
    }

    // Force sheet re-render when item type changes
    const subtypeSelect = html.find("select[name='system.subtype']");
    if (subtypeSelect.length) {
      subtypeSelect.on('change', async (ev) => {
        const newType = subtypeSelect.val();
        let updateData = { 'system.subtype': newType };
        // If switching to weapon, ensure all weapon fields exist and are valid
        if (newType === 'weapon') {
          const sys = this.item.system || {};
          updateData['system.damage'] = typeof sys.damage === 'string' ? sys.damage : '';
          updateData['system.damageType'] = typeof sys.damageType === 'string' ? sys.damageType : '';
          updateData['system.hands'] = typeof sys.hands === 'number' ? sys.hands : 1;
          updateData['system.rarity'] = typeof sys.rarity === 'string' ? sys.rarity : '';
        }
        await this.item.update(updateData);
        // Reload item from database to ensure fresh data
        await this.item.refresh();
        console.log('AFTER UPDATE:', this.item.system.subtype, this.item.system);
        this.render(false);
      });
    }
  }
}
