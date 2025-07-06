const { mergeObject } = foundry.utils;
export class InventoryItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lastdays", "sheet", "item"],
      width: 500,
      height: 400,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    return "systems/lastdays/templates/sheets/inventory-sheet.html";
  }

  /** @override */
    getData(options) {
        const data = super.getData(options);
        data.configuration = CONFIG.lastdays?.configuration ?? {};
        return data;
    }
}
