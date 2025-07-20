// Test script to verify inventory sheet fixes
console.log("Testing inventory sheet fixes...");

// Test if split helper is available
if (Handlebars.helpers.split) {
    console.log("✓ Split helper is registered");
    
    // Test the split helper
    const testResult = Handlebars.helpers.split("Fire,Ice,Lightning", ",");
    console.log("Split test result:", testResult);
} else {
    console.log("✗ Split helper is NOT registered");
}

// Check if InventoryItemSheet is properly registered
if (game.system.id === 'lastdays') {
    const inventorySheets = game.system.sheets.items.filter(s => s.types.includes('inventory'));
    console.log("Inventory sheets registered:", inventorySheets.length);
    
    if (inventorySheets.length > 0) {
        console.log("✓ InventoryItemSheet is registered");
    } else {
        console.log("✗ InventoryItemSheet is NOT registered");
    }
}

console.log("Test complete.");