/**
 * Export all inventory items (Armor, Shields, Weapons, Consumables, Containers, Misc) from a compendium to a JSON array
 * for compendium import or documentation.
 * 
 * Usage: Paste into Foundry VTT's console or run as a macro.
 * The output will appear in the browser console (F12).
 *
 * Set COMPENDIUM_NAME below to your compendium's label or collection id.
 */

const COMPENDIUM_NAME = "world.inventory"; // Set this to your compendium's label or collection id
const ITEM_TYPES = ["armor", "shield", "weapon", "consumable", "container", "misc"];

// Helper: Determine item flags and weapon handedness
function getItemFlags(item) {
  const type = item.type?.toLowerCase() || "";
  let weaponType = null;
  if (type === "weapon") {
    // Try to detect handedness from system data or name
    if (item.system?.twoHanded) {
      weaponType = "two-handed";
    } else if (item.name?.toLowerCase().includes("two-handed")) {
      weaponType = "two-handed";
    } else {
      weaponType = "one-handed";
    }
  }
  return {
    isArmor: type === "armor",
    isShield: type === "shield",
    isContainer: type === "container",
    weaponType
  };
}

const pack = game.packs.find(p => p.metadata.label === COMPENDIUM_NAME || p.collection === COMPENDIUM_NAME);
if (!pack) {
  console.error(`Compendium '${COMPENDIUM_NAME}' not found!`);
} else {
  pack.getDocuments().then(items => {
    // List all unique item types in the compendium
    const typeSet = new Set(items.map(item => item.type));
    console.log("Item types in compendium:", Array.from(typeSet));
    // Now filter and export
    const allItems = items.filter(item => ITEM_TYPES.includes(item.type?.toLowerCase()));
    const exportData = allItems.map(item => {
      const flags = getItemFlags(item);
      return {
        name: item.name,
        type: item.type,
        slotCost: item.system?.slotCost ?? 1,
        description: item.system?.description ?? item.data?.data?.description ?? "",
        weaponType: flags.weaponType,
        isArmor: flags.isArmor,
        isShield: flags.isShield,
        isContainer: flags.isContainer
      };
    });
    console.log("=== Inventory Export JSON ===");
    console.log(JSON.stringify(exportData, null, 2));
    console.log("=== End Export ===");
  });
}