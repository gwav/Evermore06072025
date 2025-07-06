/**
 * Script to populate the Inventory compendium with starting gear items
 * Run this from the console: runPopulateInventory()
 */

// Define the gear data with metadata
const GEAR_DATA = {
    d6: {
        title: "D6 COINS (1-6 coins each)",
        costRange: [1, 6],
        costFormula: "1d6",
        items: [
            { name: "A night at the tavern", isConsumable: true, description: "A night's stay at a tavern with food and drink" },
            { name: "A hearty meal", isConsumable: true, description: "A filling meal that restores energy" },
            { name: "Backpack", isContainer: true, description: "A sturdy backpack for carrying gear" },
            { name: "Clothes (peasant)", isClothing: true, description: "Simple, practical clothing for everyday wear" },
            { name: "Grappling hook", isTool: true, description: "An iron hook attached to a rope for climbing" },
            { name: "Mirror", isTool: true, description: "A polished metal mirror for signaling or grooming" },
            { name: "Oil flask", isConsumable: true, description: "A flask of oil for lamps or other purposes" },
            { name: "Parchment, ink and quill", isTool: true, description: "Writing materials for recording information" },
            { name: "Rations (per day)", isConsumable: true, description: "Preserved food for one day of travel" },
            { name: "Rope", isTool: true, description: "50 feet of sturdy hemp rope" },
            { name: "Scrolls", isTool: true, description: "Blank parchment scrolls for writing" },
            { name: "Waterskin", isContainer: true, description: "A leather container for carrying water" },
            { name: "Whistle", isTool: true, description: "A simple whistle for signaling" },
            { name: "Wooden stakes", isWeapon: true, description: "Sharpened wooden stakes, useful against certain creatures" }
        ]
    },
    d6x10: {
        title: "D6 X 10 COINS (10-60 coins each)",
        costRange: [10, 60],
        costFormula: "1d6 * 10",
        items: [
            { name: "Boots", isClothing: true, description: "Sturdy leather boots for travel" },
            { name: "Caltrops", isWeapon: true, description: "Spiked metal devices scattered on the ground to slow enemies" },
            { name: "Clothes (noble)", isClothing: true, description: "Fine clothing befitting a person of status" },
            { name: "Crowbar", isTool: true, description: "An iron bar for prying open doors and containers" },
            { name: "Drugs and poisons", isConsumable: true, description: "Various alchemical substances for different purposes" },
            { name: "Holy water", isConsumable: true, description: "Water blessed by a priest, effective against undead" },
            { name: "Lantern", isTool: true, description: "A metal lantern that burns oil to provide light" },
            { name: "Light armor", isArmor: true, armorValue: 1, description: "Leather armor that provides basic protection" },
            { name: "Musical instrument", isTool: true, description: "A portable instrument for entertainment" },
            { name: "Saddle bags", isContainer: true, description: "Leather bags designed to hang from a saddle" },
            { name: "Shovel, pick, etc.", isTool: true, description: "Digging tools for excavation work" },
            { name: "Simple weapons", isWeapon: true, description: "Basic weapons like clubs, daggers, or slings" },
            { name: "Spyglass", isTool: true, description: "A collapsible telescope for viewing distant objects" },
            { name: "Tent", isContainer: true, description: "A portable shelter for camping" },
            { name: "Waterproof case", isContainer: true, description: "A sealed container for protecting items from water" }
        ]
    },
    d6x100: {
        title: "D6 X 100 COINS (100-600 coins each)",
        costRange: [100, 600],
        costFormula: "1d6 * 100",
        items: [
            { name: "Cart or wagon", isVehicle: true, description: "A wheeled vehicle for transporting goods" },
            { name: "Gem", isTreasure: true, description: "A precious stone of significant value" },
            { name: "Horse", isMount: true, description: "A riding horse trained for travel" },
            { name: "Medium armor", isArmor: true, armorValue: 2, description: "Scale or chain armor providing good protection" },
            { name: "Metal weapons (sword, battle axe...)", isWeapon: true, description: "Well-crafted metal weapons for combat" }
        ]
    }
};

// Function to determine item type based on metadata
function determineItemType(itemData) {
    if (itemData.isWeapon) return "weapon";
    if (itemData.isArmor) return "equipment";
    if (itemData.isConsumable) return "consumable";
    return "equipment"; // Default to equipment
}

// Function to create system data based on item type and metadata
function createSystemData(itemData, category) {
    const costRange = GEAR_DATA[category].costRange;
    const baseCost = Math.floor((costRange[0] + costRange[1]) / 2); // Average cost as base
    
    if (itemData.isWeapon) {
        return {
            description: itemData.description,
            hands: 1,
            rarity: "common",
            type: itemData.name.toLowerCase().includes("bow") || itemData.name.toLowerCase().includes("sling") ? "ranged" : "melee",
            cost: baseCost,
            costFormula: GEAR_DATA[category].costFormula,
            isWeapon: true,
            isArmor: false,
            isShield: false,
            isContainer: false
        };
    } else if (itemData.isArmor) {
        return {
            description: itemData.description,
            rarity: "common",
            armorValue: itemData.armorValue || 0,
            cost: baseCost,
            costFormula: GEAR_DATA[category].costFormula,
            quantity: 1,
            isWeapon: false,
            isArmor: true,
            isShield: false,
            isContainer: false
        };
    } else if (itemData.isConsumable) {
        return {
            description: itemData.description,
            quantity: 1,
            rarity: "common",
            usageDie: {
                current: "^",
                maximum: "d4"
            },
            cost: baseCost,
            costFormula: GEAR_DATA[category].costFormula,
            isWeapon: false,
            isArmor: false,
            isShield: false,
            isContainer: false
        };
    } else {
        // Equipment (default)
        return {
            description: itemData.description,
            rarity: "common",
            armorValue: 0,
            cost: baseCost,
            costFormula: GEAR_DATA[category].costFormula,
            quantity: 1,
            isWeapon: false,
            isArmor: false,
            isShield: false,
            isContainer: itemData.isContainer || false,
            isTool: itemData.isTool || false,
            isClothing: itemData.isClothing || false,
            isTreasure: itemData.isTreasure || false,
            isMount: itemData.isMount || false,
            isVehicle: itemData.isVehicle || false
        };
    }
}

// Main function to populate the compendium
async function populateInventoryCompendium() {
    console.log("🎒 Starting to populate Inventory compendium...");
    
    // Find the Inventory compendium
    const compendium = game.packs.find(p => p.metadata.name === "Inventory" || p.metadata.label === "Inventory");
    
    if (!compendium) {
        ui.notifications.error("Inventory compendium not found! Please create it first.");
        console.error("❌ Inventory compendium not found");
        return;
    }
    
    console.log(`📦 Found compendium: ${compendium.metadata.label}`);
    
    // Clear existing items (optional - uncomment if you want to start fresh)
    // await compendium.deleteEmbeddedDocuments("Item", Array.from(compendium.index.keys()));
    
    let itemsCreated = 0;
    let errors = 0;
    
    // Process each category
    for (const [category, categoryData] of Object.entries(GEAR_DATA)) {
        console.log(`🔧 Processing category: ${categoryData.title}`);
        
        for (const itemData of categoryData.items) {
            try {
                const itemType = determineItemType(itemData);
                const systemData = createSystemData(itemData, category);
                
                const newItem = {
                    name: itemData.name,
                    type: itemType,
                    system: systemData,
                    flags: {
                        lastdays: {
                            startingGear: true,
                            category: category,
                            costRange: categoryData.costRange,
                            costFormula: categoryData.costFormula
                        }
                    }
                };
                
                // Create the item in the compendium
                await compendium.createEmbeddedDocuments("Item", [newItem]);
                itemsCreated++;
                
                console.log(`✅ Created: ${itemData.name} (${itemType})`);
                
            } catch (error) {
                console.error(`❌ Failed to create ${itemData.name}:`, error);
                errors++;
            }
        }
    }
    
    console.log(`🎉 Compendium population complete!`);
    console.log(`📊 Items created: ${itemsCreated}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors === 0) {
        ui.notifications.info(`Successfully populated Inventory compendium with ${itemsCreated} items!`);
    } else {
        ui.notifications.warn(`Populated compendium with ${itemsCreated} items, but ${errors} errors occurred. Check console for details.`);
    }
}

// Function to roll costs for all items in compendium
async function rollCostsForCompendiumItems() {
    console.log("🎲 Rolling costs for compendium items...");
    
    const compendium = game.packs.find(p => p.metadata.name === "Inventory" || p.metadata.label === "Inventory");
    
    if (!compendium) {
        ui.notifications.error("Inventory compendium not found!");
        return;
    }
    
    const items = await compendium.getDocuments();
    
    for (const item of items) {
        const costFormula = item.flags?.lastdays?.costFormula;
        
        if (costFormula) {
            try {
                const roll = new Roll(costFormula);
                await roll.evaluate();
                const rolledCost = roll.total;
                
                // Update the item with the rolled cost
                await item.update({
                    "system.cost": rolledCost
                });
                
                console.log(`🎲 ${item.name}: rolled ${rolledCost} coins (${costFormula})`);
                
            } catch (error) {
                console.error(`❌ Failed to roll cost for ${item.name}:`, error);
            }
        }
    }
    
    ui.notifications.info("Finished rolling costs for all items!");
}

// Make functions globally available for console execution
globalThis.runPopulateInventory = populateInventoryCompendium;
globalThis.rollInventoryCosts = rollCostsForCompendiumItems;

console.log("📜 Inventory population script loaded!");
console.log("💡 Run 'runPopulateInventory()' to populate the compendium");
console.log("🎲 Run 'rollInventoryCosts()' to roll random costs for all items");