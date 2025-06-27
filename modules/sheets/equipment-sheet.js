export default class EquipmentSheet  extends ItemSheet {
    static get defaultOptions() {
        return(foundry.utils.mergeObject(super.defaultOptions,
                                         {classes:  ["ldoa", "ldoa-sheet", "ldoa-equipment-sheet", "sheet"],
                                          height:   450,
                                          template: "systems/lastdays/templates/sheets/equipment-sheet.html",
                                          width:    600}));
    }

	get template() {
		return("systems/lastdays/templates/sheets/equipment-sheet.html");
	}

	getData() {
		let context = super.getData();

		context.configuration = CONFIG.configuration;
		return(context);
	}
}