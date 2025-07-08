/**
 * Debug script to test boon display on character sheet
 */

// Function to add a test boon to the selected character
async function addTestBoon() {
    const selectedTokens = canvas.tokens.controlled;
    
    if (selectedTokens.length === 0) {
        const character = game.actors.find(a => a.type === "character");
        if (!character) {
            ui.notifications.error("No character found! Please select a character token or create a character.");
            return;
        }
        
        await addBoonToCharacter(character);
    } else {
        const actor = selectedTokens[0].actor;
        if (actor.type !== "character") {
            ui.notifications.error("Please select a character token.");
            return;
        }
        
        await addBoonToCharacter(actor);
    }
}

async function addBoonToCharacter(actor) {
    console.log(`🧪 Adding test boon to ${actor.name}...`);
    
    // Create a simple test boon
    const testBoon = {
        name: "Test Boon",
        type: "boon",
        system: {
            description: "This is a test boon to verify the boons tab is working properly.",
            power: "balance",
            effects: {
                attributes: {
                    strength: 1,
                    dexterity: 0,
                    constitution: 0,
                    intelligence: 0,
                    wisdom: 0,
                    charisma: 0
                },
                hitPoints: 2,
                initiative: 0,
                attackRolls: 0,
                damageRolls: 0,
                armorRating: 0,
                special: "Grants +1 to Strength and +2 Hit Points"
            }
        }
    };
    
    try {
        const createdBoon = await actor.createEmbeddedDocuments("Item", [testBoon]);
        console.log(`✅ Test boon created successfully:`, createdBoon[0]);
        
        // Force character sheet refresh
        if (actor.sheet && actor.sheet.rendered) {
            actor.sheet.render(false);
        }
        
        ui.notifications.info(`Test boon added to ${actor.name}! Check the Boons tab.`);
        
    } catch (error) {
        console.error(`❌ Error creating test boon:`, error);
        ui.notifications.error("Failed to create test boon. Check console for details.");
    }
}

// Function to remove all test boons from the selected character
async function removeTestBoons() {
    const selectedTokens = canvas.tokens.controlled;
    
    if (selectedTokens.length === 0) {
        const character = game.actors.find(a => a.type === "character");
        if (!character) {
            ui.notifications.error("No character found! Please select a character token or create a character.");
            return;
        }
        
        await removeBoonFromCharacter(character);
    } else {
        const actor = selectedTokens[0].actor;
        if (actor.type !== "character") {
            ui.notifications.error("Please select a character token.");
            return;
        }
        
        await removeBoonFromCharacter(actor);
    }
}

async function removeBoonFromCharacter(actor) {
    console.log(`🧹 Removing test boons from ${actor.name}...`);
    
    try {
        const testBoons = actor.items.filter(item => 
            item.type === "boon" && item.name.includes("Test Boon")
        );
        
        if (testBoons.length === 0) {
            ui.notifications.info("No test boons found to remove.");
            return;
        }
        
        const boonIds = testBoons.map(boon => boon.id);
        await actor.deleteEmbeddedDocuments("Item", boonIds);
        
        console.log(`✅ Removed ${testBoons.length} test boons`);
        
        // Force character sheet refresh
        if (actor.sheet && actor.sheet.rendered) {
            actor.sheet.render(false);
        }
        
        ui.notifications.info(`Removed ${testBoons.length} test boons from ${actor.name}.`);
        
    } catch (error) {
        console.error(`❌ Error removing test boons:`, error);
        ui.notifications.error("Failed to remove test boons. Check console for details.");
    }
}

// Function to debug what boons are actually on the character
async function debugCharacterBoons() {
    const selectedTokens = canvas.tokens.controlled;
    
    if (selectedTokens.length === 0) {
        const character = game.actors.find(a => a.type === "character");
        if (!character) {
            ui.notifications.error("No character found! Please select a character token or create a character.");
            return;
        }
        
        await debugBoons(character);
    } else {
        const actor = selectedTokens[0].actor;
        if (actor.type !== "character") {
            ui.notifications.error("Please select a character token.");
            return;
        }
        
        await debugBoons(actor);
    }
}

async function debugBoons(actor) {
    console.log(`🔍 DEBUGGING BOONS for ${actor.name}:`);
    console.log(`- Total items: ${actor.items.size}`);
    
    // Show all items
    console.log(`📝 All items:`);
    actor.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (type: ${item.type})`);
    });
    
    // Filter boons specifically
    const boons = actor.items.filter(item => item.type === "boon");
    console.log(`⭐ Boons found: ${boons.length}`);
    
    boons.forEach((boon, index) => {
        console.log(`  Boon ${index + 1}: ${boon.name}`);
        console.log(`    - Type: ${boon.type}`);
        console.log(`    - Power: ${boon.system?.power || 'N/A'}`);
        console.log(`    - Description: ${boon.system?.description || 'N/A'}`);
        console.log(`    - Effects:`, boon.system?.effects);
    });
    
    // Test the sheet data context
    if (actor.sheet) {
        const sheetData = await actor.sheet.getData();
        console.log(`📊 Sheet context boons: ${sheetData.boons?.length || 0}`);
        
        if (sheetData.boons && sheetData.boons.length > 0) {
            console.log(`✅ Boons are available in sheet context`);
            sheetData.boons.forEach((boon, index) => {
                console.log(`  Context Boon ${index + 1}: ${boon.name}`);
            });
        } else {
            console.log(`❌ No boons found in sheet context`);
        }
    }
}

// Make functions globally available
globalThis.addTestBoon = addTestBoon;
globalThis.removeTestBoons = removeTestBoons;
globalThis.debugCharacterBoons = debugCharacterBoons;

console.log("🧪 Boon testing script loaded!");
console.log("💡 Available functions:");
console.log("  - addTestBoon() - Add a test boon to selected character");
console.log("  - removeTestBoons() - Remove all test boons from selected character");
console.log("  - debugCharacterBoons() - Debug what boons are on the character");