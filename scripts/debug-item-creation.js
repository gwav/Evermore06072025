/**
 * Debug script to test item creation step by step
 * Run this from F12 console after selecting a character token
 */
async function debugEquipmentCreation() {
    console.log("🔍 DEBUG: Starting equipment creation test");
    
    // Get actor
    const actor = canvas.tokens.controlled[0]?.actor || game.actors.contents[0];
    if (!actor) {
        console.error("❌ No actor found");
        return;
    }
    
    console.log(`🎭 Testing with actor: ${actor.name}`);
    console.log(`💰 Actor coins before: ${actor.system.coins.first}`);
    console.log(`🎒 Equipment count before: ${actor.items.filter(i => i.type === 'equipment').length}`);
    
    // Test equipment item data
    const testItem = {
        name: "Debug Test Backpack",
        type: "equipment", 
        system: {
            description: "Debug test item",
            rarity: "common",
            armorValue: 0,
            cost: 5,
            quantity: 1
        }
    };
    
    console.log("📦 Creating item with data:", testItem);
    
    try {
        // Step 1: Create the item
        console.log("🚀 Step 1: Creating embedded document...");
        const createdItems = await actor.createEmbeddedDocuments("Item", [testItem]);
        console.log("✅ Step 1 complete, created items:", createdItems);
        
        // Step 2: Check if it was actually created
        console.log("🚀 Step 2: Checking actor's items...");
        const allItems = actor.items.contents;
        const equipmentItems = allItems.filter(i => i.type === 'equipment');
        console.log(`📊 Total items: ${allItems.length}, Equipment items: ${equipmentItems.length}`);
        console.log("🎒 Equipment items:", equipmentItems.map(i => ({
            name: i.name,
            id: i.id,
            quantity: i.system?.quantity,
            cost: i.system?.cost
        })));
        
        // Step 3: Check if the created item is in the list
        const createdItem = createdItems[0];
        const foundItem = allItems.find(i => i.id === createdItem.id);
        if (foundItem) {
            console.log("✅ Step 2 complete: Item found in actor's items");
            console.log("📋 Found item details:", {
                name: foundItem.name,
                type: foundItem.type,
                system: foundItem.system
            });
        } else {
            console.error("❌ Step 2 failed: Item not found in actor's items!");
        }
        
        // Step 3: Force sheet refresh
        console.log("🚀 Step 3: Refreshing character sheet...");
        if (actor.sheet && actor.sheet.rendered) {
            await actor.sheet.render(false);
            console.log("✅ Step 3 complete: Character sheet refreshed");
        }
        
        // Step 4: Test coin deduction
        console.log("🚀 Step 4: Testing coin deduction...");
        const currentCoins = actor.system.coins.first;
        const newCoins = currentCoins - 5;
        await actor.update({"system.coins.first": newCoins});
        console.log(`💰 Coins updated: ${currentCoins} → ${newCoins}`);
        
        return createdItem;
        
    } catch (error) {
        console.error("❌ Error in equipment creation test:", error);
        console.error("Stack trace:", error.stack);
    }
}

// Run the debug test
debugEquipmentCreation().then(result => {
    console.log("🏁 Debug test completed, result:", result);
});