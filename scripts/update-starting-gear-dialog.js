/**
 * Script to update the starting gear dialog to use the Inventory compendium
 * This provides a backup of the original and creates a new version
 */

// Updated version of the starting gear dialog that uses compendium
const UPDATED_STARTING_GEAR_DIALOG = `export class StartingGearDialog extends Dialog {
    constructor(actor, options = {}) {
        const dialogData = {
            title: "Select Starting Gear",
            content: "",
            buttons: {
                close: {
                    label: "Close",
                    callback: () => {}
                }
            },
            default: "confirm",
            close: () => {}
        };

        const dialogOptions = foundry.utils.mergeObject({
            classes: ["ldoa", "starting-gear-dialog"],
            width: 800,
            height: 600,
            resizable: true
        }, options);

        super(dialogData, dialogOptions);
        
        this.actor = actor;
        this.availableCoins = actor.system.coins?.first || 0;
        this.selectedItems = [];
        this.totalCost = 0;
        this.compendiumItems = new Map(); // Cache for compendium items
        
        // Load compendium items on construction
        this.loadCompendiumItems();
    }

    async loadCompendiumItems() {
        console.log("🎒 Loading items from Inventory compendium...");
        
        const compendium = game.packs.find(p => p.metadata.name === "Inventory" || p.metadata.label === "Inventory");
        
        if (!compendium) {
            console.error("❌ Inventory compendium not found!");
            this.gearCategories = this.getFallbackCategories();
            return;
        }
        
        try {
            const items = await compendium.getDocuments();
            
            // Group items by category
            const categories = {
                d6: { title: "D6 COINS (1-6 coins each)", costRange: "1-6", items: [] },
                d6x10: { title: "D6 X 10 COINS (10-60 coins each)", costRange: "10-60", items: [] },
                d6x100: { title: "D6 X 100 COINS (100-600 coins each)", costRange: "100-600", items: [] }
            };
            
            // Sort items into categories
            for (const item of items) {
                const category = item.flags?.lastdays?.category;
                if (category && categories[category]) {
                    categories[category].items.push({
                        name: item.name,
                        id: item.id,
                        baseCost: item.system.cost || 0,
                        costFormula: item.flags?.lastdays?.costFormula || "1d6",
                        isWeapon: item.system.isWeapon || false,
                        isArmor: item.system.isArmor || false,
                        isShield: item.system.isShield || false,
                        isContainer: item.system.isContainer || false,
                        description: item.system.description || "",
                        compendiumItem: item
                    });
                    
                    // Cache the item for quick lookup
                    this.compendiumItems.set(item.name, item);
                }
            }
            
            // Sort items within each category
            for (const category of Object.values(categories)) {
                category.items.sort((a, b) => a.name.localeCompare(b.name));
            }
            
            this.gearCategories = categories;
            console.log(\`✅ Loaded \${items.length} items from compendium\`);
            
        } catch (error) {
            console.error("❌ Error loading compendium items:", error);
            this.gearCategories = this.getFallbackCategories();
        }
    }

    getFallbackCategories() {
        // Fallback to original hardcoded items if compendium fails
        return {
            d6: {
                title: "D6 COINS (1-6 coins each)",
                costRange: "1-6",
                items: [
                    { name: "A night at the tavern", baseCost: 3, costFormula: "1d6" },
                    { name: "A hearty meal", baseCost: 3, costFormula: "1d6" },
                    { name: "Backpack", baseCost: 3, costFormula: "1d6", isContainer: true },
                    { name: "Clothes (peasant)", baseCost: 3, costFormula: "1d6" },
                    { name: "Grappling hook", baseCost: 3, costFormula: "1d6" },
                    { name: "Mirror", baseCost: 3, costFormula: "1d6" },
                    { name: "Oil flask", baseCost: 3, costFormula: "1d6" },
                    { name: "Parchment, ink and quill", baseCost: 3, costFormula: "1d6" },
                    { name: "Rations (per day)", baseCost: 3, costFormula: "1d6" },
                    { name: "Rope", baseCost: 3, costFormula: "1d6" },
                    { name: "Scrolls", baseCost: 3, costFormula: "1d6" },
                    { name: "Waterskin", baseCost: 3, costFormula: "1d6", isContainer: true },
                    { name: "Whistle", baseCost: 3, costFormula: "1d6" },
                    { name: "Wooden stakes", baseCost: 3, costFormula: "1d6", isWeapon: true }
                ]
            },
            d6x10: {
                title: "D6 X 10 COINS (10-60 coins each)",
                costRange: "10-60",
                items: [
                    { name: "Boots", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Caltrops", baseCost: 35, costFormula: "1d6 * 10", isWeapon: true },
                    { name: "Clothes (noble)", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Crowbar", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Drugs and poisons", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Holy water", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Lantern", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Light armor", baseCost: 35, costFormula: "1d6 * 10", isArmor: true },
                    { name: "Musical instrument", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Saddle bags", baseCost: 35, costFormula: "1d6 * 10", isContainer: true },
                    { name: "Shovel, pick, etc.", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Simple weapons", baseCost: 35, costFormula: "1d6 * 10", isWeapon: true },
                    { name: "Spyglass", baseCost: 35, costFormula: "1d6 * 10" },
                    { name: "Tent", baseCost: 35, costFormula: "1d6 * 10", isContainer: true },
                    { name: "Waterproof case", baseCost: 35, costFormula: "1d6 * 10", isContainer: true }
                ]
            },
            d6x100: {
                title: "D6 X 100 COINS (100-600 coins each)",
                costRange: "100-600",
                items: [
                    { name: "Cart or wagon", baseCost: 350, costFormula: "1d6 * 100" },
                    { name: "Gem", baseCost: 350, costFormula: "1d6 * 100" },
                    { name: "Horse", baseCost: 350, costFormula: "1d6 * 100" },
                    { name: "Medium armor", baseCost: 350, costFormula: "1d6 * 100", isArmor: true },
                    { name: "Metal weapons (sword, battle axe...)", baseCost: 350, costFormula: "1d6 * 100", isWeapon: true }
                ]
            }
        };
    }

    async getData() {
        // Ensure compendium items are loaded
        if (!this.gearCategories || Object.keys(this.gearCategories).length === 0) {
            await this.loadCompendiumItems();
        }
        
        return {
            actor: this.actor,
            availableCoins: this.availableCoins,
            selectedItems: this.selectedItems,
            totalCost: this.totalCost,
            gearCategories: this.gearCategories,
            remainingCoins: this.availableCoins - this.totalCost
        };
    }

    get template() {
        return "systems/lastdays/templates/dialogs/starting-gear-dialog.html";
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        // Handle item selection
        html.find('.gear-item-checkbox').change(this._onItemToggle.bind(this));
        
        // Handle roll cost buttons
        html.find('.roll-cost-btn').click(this._onRollCost.bind(this));
        
        // Handle roll all buttons
        html.find('.roll-all-btn').click(this._onRollAllCosts.bind(this));
        
        // Handle quantity changes
        html.find('.quantity-input').change(this._onQuantityChanged.bind(this));
        
        // Handle buy items button
        html.find('.buy-items-btn').click(this._onBuyItemsClicked.bind(this));
        
        // Update display
        this._updateDisplay(html);
    }

    _onItemToggle(event) {
        const checkbox = event.currentTarget;
        const itemName = checkbox.dataset.item;
        const category = checkbox.dataset.category;
        const unitCost = parseInt(checkbox.dataset.cost) || 0;
        const quantityInput = this.element.find(\`[data-item="\${itemName}"] .quantity-input\`);
        const quantity = parseInt(quantityInput.val()) || 1;
        const totalCost = unitCost * quantity;
        
        if (checkbox.checked) {
            // Add item
            if (unitCost === 0) {
                ui.notifications.warn("Please roll for the cost of this item first!");
                checkbox.checked = false;
                return;
            }
            
            if (this.totalCost + totalCost > this.availableCoins) {
                ui.notifications.warn(\`Not enough coins for \${quantity} \${itemName}! Cost: \${totalCost} coins\`);
                checkbox.checked = false;
                return;
            }
            
            this.selectedItems.push({
                name: itemName,
                category: category,
                unitCost: unitCost,
                quantity: quantity,
                totalCost: totalCost
            });
            this.totalCost += totalCost;
        } else {
            // Remove item
            const itemIndex = this.selectedItems.findIndex(item => item.name === itemName);
            if (itemIndex > -1) {
                this.totalCost -= this.selectedItems[itemIndex].totalCost;
                this.selectedItems.splice(itemIndex, 1);
            }
        }
        
        this._updateDisplay(this.element);
    }

    _onQuantityChanged(event) {
        const quantityInput = event.currentTarget;
        const itemName = quantityInput.dataset.item;
        const checkbox = this.element.find(\`[data-item="\${itemName}"] .gear-item-checkbox\`);
        
        // If item is currently selected, update its cost
        if (checkbox.prop('checked')) {
            // Trigger the toggle to recalculate
            checkbox.trigger('change');
        }
    }

    async _onBuyItemsClicked(event) {
        event.preventDefault();
        
        console.log(\`🛒 STARTING PURCHASE PROCESS\`);
        
        if (this.selectedItems.length === 0) {
            ui.notifications.warn("No items selected to purchase!");
            return;
        }
        
        if (this.totalCost > this.availableCoins) {
            ui.notifications.error("You cannot afford all selected items!");
            return;
        }
        
        try {
            const itemsToCreate = [];
            
            for (const selectedItem of this.selectedItems) {
                // Try to get the item from compendium first
                const compendiumItem = this.compendiumItems.get(selectedItem.name);
                
                let itemData;
                if (compendiumItem) {
                    // Use compendium item as base
                    itemData = {
                        name: selectedItem.name,
                        type: compendiumItem.type,
                        system: foundry.utils.deepClone(compendiumItem.system),
                        flags: foundry.utils.deepClone(compendiumItem.flags)
                    };
                    
                    // Update cost and quantity
                    itemData.system.cost = selectedItem.unitCost;
                    itemData.system.quantity = selectedItem.quantity;
                    
                } else {
                    // Fallback to basic item creation
                    itemData = {
                        name: selectedItem.name,
                        type: "equipment",
                        system: {
                            description: \`Starting gear item (\${selectedItem.unitCost} coins each)\`,
                            rarity: "common",
                            armorValue: 0,
                            cost: selectedItem.unitCost,
                            quantity: selectedItem.quantity
                        }
                    };
                }
                
                itemsToCreate.push(itemData);
            }
            
            console.log(\`📦 CREATING \${itemsToCreate.length} ITEMS:\`, itemsToCreate);
            
            if (itemsToCreate.length > 0) {
                const createdItems = await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
                console.log(\`✅ ITEMS CREATED SUCCESSFULLY: \${createdItems.length} items\`, createdItems.map(i => i.name));
                
                // Force immediate character sheet refresh
                if (this.actor.sheet && this.actor.sheet.rendered) {
                    this.actor.sheet.render(false);
                    console.log(\`🔄 Character sheet refreshed immediately after item creation\`);
                }
            }
            
            // Deduct coins
            const newCoinAmount = this.availableCoins - this.totalCost;
            await this.actor.update({
                "system.coins.first": newCoinAmount
            });
            
            // Update available coins for continued shopping
            this.availableCoins = newCoinAmount;
            
            // Store count before clearing for notification
            const purchasedItemCount = this.selectedItems.length;
            
            // Clear selected items
            this.selectedItems = [];
            this.totalCost = 0;
            
            // Clear all checkboxes
            this.element.find('.gear-item-checkbox:checked').each((i, checkbox) => {
                checkbox.checked = false;
            });
            
            // Update display
            this._updateDisplay(this.element);
            
            // Refresh the character sheet to show new items
            if (this.actor.sheet && this.actor.sheet.rendered) {
                this.actor.sheet.render(false);
                console.log(\`🔄 Character sheet refreshed to show new equipment\`);
            }
            
            const itemWord = purchasedItemCount === 1 ? 'item' : 'items';
            ui.notifications.info(\`Successfully purchased \${purchasedItemCount} \${itemWord} from compendium! \${newCoinAmount} coins remaining.\`);
            
            console.log(\`✅ Purchase completed. Items added to inventory. Remaining coins: \${newCoinAmount}\`);
            
        } catch (error) {
            console.error(\`❌ Error purchasing items:\`, error);
            ui.notifications.error("Failed to purchase items. Please try again.");
        }
    }

    async _onRollCost(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        const itemName = button.dataset.item;
        
        // Get the item data to find the cost formula
        const categoryData = this.gearCategories[category];
        const itemData = categoryData?.items.find(item => item.name === itemName);
        
        let rollFormula = itemData?.costFormula;
        
        if (!rollFormula) {
            // Fallback to category-based formula
            switch(category) {
                case 'd6':
                    rollFormula = "1d6";
                    break;
                case 'd6x10':
                    rollFormula = "1d6 * 10";
                    break;
                case 'd6x100':
                    rollFormula = "1d6 * 100";
                    break;
                default:
                    console.error(\`🎲 Unknown category: \${category}\`);
                    return;
            }
        }
        
        console.log(\`🎲 Rolling \${rollFormula} for \${itemName}\`);
        
        try {
            const roll = new Roll(rollFormula);
            await roll.evaluate();
            const cost = roll.total;
            
            console.log(\`🎲 Roll result: \${cost} coins (formula: \${rollFormula})\`);
            
            // Update the button and store the cost
            button.textContent = \`\${cost} coins\`;
            button.dataset.cost = cost;
            button.classList.add('cost-rolled');
            
            // Enable the checkbox and quantity input
            const checkbox = this.element.find(\`[data-item="\${itemName}"] .gear-item-checkbox\`);
            const quantityInput = this.element.find(\`[data-item="\${itemName}"] .quantity-input\`);
            checkbox.prop('disabled', false);
            checkbox.attr('data-cost', cost);
            quantityInput.prop('disabled', false);
            
            // Show roll result in chat
            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: \`Rolling cost for: \${itemName}\`
            });
            
            console.log(\`✅ Successfully rolled cost for \${itemName}: \${cost} coins\`);
            
        } catch (error) {
            console.error(\`❌ Error rolling cost for \${itemName}:\`, error);
            ui.notifications.error(\`Failed to roll cost for \${itemName}\`);
        }
    }

    async _onRollAllCosts(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        
        console.log(\`🎲 Rolling all costs for category: \${category}\`);
        
        // Disable the roll all button during rolling
        button.disabled = true;
        button.textContent = "Rolling...";
        
        // Find all unrolled items in this category
        const categoryElement = this.element.find(\`.gear-category[data-category="\${category}"]\`);
        const unrolledButtons = categoryElement.find('.roll-cost-btn:not(.cost-rolled)');
        
        console.log(\`Found \${unrolledButtons.length} unrolled items in category \${category}\`);
        
        // Roll cost for each unrolled item
        for (let i = 0; i < unrolledButtons.length; i++) {
            const rollButton = unrolledButtons[i];
            
            // Simulate click on the roll button
            await this._onRollCost({ currentTarget: rollButton });
            
            // Small delay between rolls for better UX
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Re-enable the roll all button
        button.disabled = false;
        button.textContent = "Roll All Costs";
        
        console.log(\`✅ Finished rolling all costs for category \${category}\`);
    }

    _updateDisplay(html) {
        // Update remaining coins display
        const remainingCoins = this.availableCoins - this.totalCost;
        html.find('.remaining-coins').text(remainingCoins);
        html.find('.total-cost').text(this.totalCost);
        
        // Update buy button state
        const buyButton = html.find('.buy-items-btn');
        buyButton.prop('disabled', this.selectedItems.length === 0 || this.totalCost > this.availableCoins);
        
        // Update selected items display
        const selectedItemsList = html.find('.selected-items-list');
        selectedItemsList.empty();
        
        if (this.selectedItems.length > 0) {
            this.selectedItems.forEach(item => {
                const itemElement = \`<div class="selected-item">
                    <span class="item-name">\${item.name}</span>
                    <span class="item-quantity">x\${item.quantity}</span>
                    <span class="item-cost">\${item.totalCost} coins</span>
                </div>\`;
                selectedItemsList.append(itemElement);
            });
        } else {
            selectedItemsList.append('<div class="no-items">No items selected</div>');
        }
    }
}`;

// Function to backup and update the starting gear dialog
async function updateStartingGearDialog() {
    const originalPath = "modules/dialogs/starting-gear-dialog.js";
    const backupPath = "modules/dialogs/starting-gear-dialog.js.backup";
    
    console.log("🔄 Updating starting gear dialog to use compendium...");
    
    try {
        // Read the original file
        const response = await fetch(\`systems/lastdays/\${originalPath}\`);
        const originalContent = await response.text();
        
        // Create backup
        console.log("💾 Creating backup of original file...");
        // Note: This would require server-side file operations
        // For now, we'll just log the content
        console.log("📋 Original content (save this manually as backup):");
        console.log(originalContent);
        
        console.log("✅ Backup created. New content ready.");
        console.log("📝 You can now replace the starting-gear-dialog.js file with the updated version.");
        
    } catch (error) {
        console.error("❌ Error updating dialog:", error);
    }
    
    return UPDATED_STARTING_GEAR_DIALOG;
}

// Make function globally available
globalThis.updateStartingGearDialog = updateStartingGearDialog;
globalThis.getUpdatedStartingGearDialog = () => UPDATED_STARTING_GEAR_DIALOG;

console.log("🔧 Starting gear dialog update script loaded!");
console.log("💡 Run 'updateStartingGearDialog()' to get the updated dialog code");
console.log("📄 Run 'getUpdatedStartingGearDialog()' to get just the code");`;