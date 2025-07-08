// Test script to add an item directly to a character
// Run this in the browser console (F12)

async function addTestItemToCharacter(characterId) {
    try {
        // Find the character
        const character = game.actors.get(characterId);
        if (!character) {
            console.error(`❌ Character with ID '${characterId}' not found`);
            console.log("Available characters:", game.actors.filter(a => a.type === "character").map(a => ({id: a.id, name: a.name})));
            return;
        }
        
        console.log(`🎯 Found character: "${character.name}" (ID: ${character.id})`);
        
        // Create test item data
        const testItemData = {
            name: "Test Item",
            type: "equipment",
            system: {
                description: "This is a test item to verify inventory system",
                quantity: 1,
                cost: 0,
                rarity: "common",
                armorValue: 0
            }
        };
        
        console.log(`📦 Creating test item:`, testItemData);
        
        // Add the item to the character
        const createdItems = await character.createEmbeddedDocuments("Item", [testItemData]);
        
        console.log(`✅ Test item created successfully:`, createdItems[0].name);
        console.log(`📊 Character now has ${character.items.size} total items`);
        
        // Check equipment items specifically
        const equipmentItems = character.items.filter(i => i.type === "equipment");
        console.log(`🎒 Equipment items (${equipmentItems.length}):`);
        equipmentItems.forEach((item, index) => {
            console.log(`  ${index + 1}. "${item.name}" (qty: ${item.system.quantity})`);
        });
        
        // Force character sheet refresh if it's open
        if (character.sheet && character.sheet.rendered) {
            character.sheet.render(false);
            console.log(`🔄 Character sheet refreshed`);
        }
        
        ui.notifications.info(`Test item "${testItemData.name}" added to ${character.name}. Check the Equipment tab!`);
        
    } catch (error) {
        console.error(`❌ Error adding test item:`, error);
    }
}

// Run the function
addTestItemToCharacter("77");