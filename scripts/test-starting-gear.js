/**
 * Test script to verify starting gear functionality
 * Run this from the F12 console in Foundry VTT
 */
async function testStartingGearCreation() {
    console.log("🧪 Testing starting gear creation...");
    
    // Get the first selected actor or create a test actor
    let testActor = canvas.tokens.controlled[0]?.actor || game.actors.contents[0];
    
    if (!testActor) {
        console.error("❌ No actor found. Please select a token or create an actor first.");
        return;
    }
    
    console.log(`🎭 Using actor: ${testActor.name}`);
    
    // Test item data structure
    const testItemData = {
        name: "Test Starting Gear Item",
        type: "equipment",
        system: {
            description: "Test item for starting gear (5 coins each)",
            rarity: "common",
            armorValue: 0,
            cost: 5,
            quantity: 2
        }
    };
    
    console.log("📦 Test item data:", testItemData);
    
    try {
        // Create the test item
        const createdItems = await testActor.createEmbeddedDocuments("Item", [testItemData]);
        console.log("✅ Successfully created test item:", createdItems[0]);
        
        // Verify the item was created with correct data
        const createdItem = createdItems[0];
        console.log("🔍 Created item system data:", createdItem.system);
        
        if (createdItem.system.cost === 5 && createdItem.system.quantity === 2) {
            console.log("✅ Cost and quantity fields are working correctly!");
        } else {
            console.warn("⚠️ Cost or quantity fields may not be working as expected");
        }
        
        // Clean up - delete the test item
        await testActor.deleteEmbeddedDocuments("Item", [createdItem.id]);
        console.log("🧹 Cleaned up test item");
        
        return true;
        
    } catch (error) {
        console.error("❌ Error creating test item:", error);
        return false;
    }
}

// Run the test
testStartingGearCreation();