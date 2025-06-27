export class StartingGearDialog extends Dialog {
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
        
        // Define gear categories with their items
        this.gearCategories = {
            d6: {
                title: "D6 COINS (1-6 coins each)",
                costRange: "1-6",
                items: [
                    "A night at the tavern",
                    "A hearty meal", 
                    "Backpack*",
                    "Clothes (peasant)**",
                    "Grappling hook",
                    "Mirror",
                    "Oil flask",
                    "Parchment, ink and quill",
                    "Rations (per day)",
                    "Rope",
                    "Scrolls",
                    "Waterskin", 
                    "Whistle",
                    "Wooden stakes"
                ]
            },
            d6x10: {
                title: "D6 X 10 COINS (10-60 coins each)",
                costRange: "10-60", 
                items: [
                    "Boots",
                    "Caltrops",
                    "Clothes (noble)*",
                    "Crowbar",
                    "Drugs and poisons",
                    "Holy water",
                    "Lantern",
                    "Light armor",
                    "Musical instrument",
                    "Saddle bags",
                    "Shovel, pick, etc.",
                    "Simple weapons",
                    "Spyglass",
                    "Tent",
                    "Waterproof case"
                ]
            },
            d6x100: {
                title: "D6 X 100 COINS (100-600 coins each)",
                costRange: "100-600",
                items: [
                    "Cart or wagon",
                    "Gem", 
                    "Horse",
                    "Medium armor",
                    "Metal weapons (sword, battle axe...)"
                ]
            }
        };
    }

    async getData() {
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
        const quantityInput = this.element.find(`.quantity-input[data-item="${itemName}"]`);
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
                ui.notifications.warn(`Not enough coins for ${quantity} ${itemName}! Cost: ${totalCost} coins`);
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
        const checkbox = this.element.find(`.gear-item-checkbox[data-item="${itemName}"]`);
        
        // If item is currently selected, update its cost
        if (checkbox.prop('checked')) {
            // Trigger the toggle to recalculate
            checkbox.trigger('change');
        }
    }

    async _onBuyItemsClicked(event) {
        event.preventDefault();
        
        console.log(`🛒 STARTING PURCHASE PROCESS - STEP 1: CREATE ITEMS FIRST`);
        
        // STEP 1: CREATE ITEMS IMMEDIATELY (before any other checks)
        try {
            const itemsToCreate = [];
            
            for (const selectedItem of this.selectedItems) {
                const itemData = {
                    name: selectedItem.name,
                    type: "equipment",
                    system: {
                        description: `Starting gear item (${selectedItem.unitCost} coins each)`,
                        rarity: "common",
                        armorValue: 0,
                        cost: selectedItem.unitCost,
                        quantity: selectedItem.quantity
                    }
                };
                itemsToCreate.push(itemData);
            }
            
            console.log(`📦 CREATING ${itemsToCreate.length} ITEMS IMMEDIATELY:`, itemsToCreate);
            
            if (itemsToCreate.length > 0) {
                const createdItems = await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
                console.log(`✅ ITEMS CREATED SUCCESSFULLY: ${createdItems.length} items`, createdItems.map(i => i.name));
                
                // DEBUG: Check if items are actually in the actor's items collection
                console.log(`🔍 CHECKING ACTOR ITEMS AFTER CREATION:`);
                console.log(`- Total items on actor: ${this.actor.items.size}`);
                console.log(`- Equipment items: ${this.actor.items.filter(i => i.type === "equipment").length}`);
                const equipmentItems = this.actor.items.filter(i => i.type === "equipment");
                equipmentItems.forEach((item, index) => {
                    console.log(`  Equipment ${index + 1}: "${item.name}" (type: ${item.type}, quantity: ${item.system?.quantity || 'N/A'})`);
                });
                
                // Force immediate character sheet refresh
                if (this.actor.sheet && this.actor.sheet.rendered) {
                    this.actor.sheet.render(false);
                    console.log(`🔄 Character sheet refreshed immediately after item creation`);
                }
            }
            
        } catch (error) {
            console.error(`❌ FAILED TO CREATE ITEMS:`, error);
            ui.notifications.error("Failed to create items. Purchase cancelled.");
            return;
        }
        
        console.log(`� STEP 2: NOW CHECKING PURCHASE CONDITIONS`);
        
        if (this.selectedItems.length === 0) {
            ui.notifications.warn("No items selected to purchase!");
            return;
        }
        
        if (this.totalCost > this.availableCoins) {
            ui.notifications.error("You cannot afford all selected items!");
            return;
        }
        
        console.log(`🛒 Purchasing ${this.selectedItems.length} items for ${this.totalCost} coins`);
        
        try {
            console.log(`🛒 STEP 3: DEDUCTING COINS AND FINALIZING PURCHASE`);
            
            // Items were already created at the beginning
            
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
                console.log(`🔄 Character sheet refreshed to show new equipment`);
            }
            
            const itemWord = purchasedItemCount === 1 ? 'item' : 'items';
            ui.notifications.info(`Successfully purchased ${purchasedItemCount} ${itemWord}! ${newCoinAmount} coins remaining.`);
            
            console.log(`✅ Purchase completed. Items added to inventory. Remaining coins: ${newCoinAmount}`);
            
        } catch (error) {
            console.error(`❌ Error purchasing items:`, error);
            ui.notifications.error("Failed to purchase items. Please try again.");
        }
    }

    async _onRollCost(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        const itemName = button.dataset.item;
        
        let roll;
        let rollFormula;
        
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
                console.error(`🎲 Unknown category: ${category}`);
                return;
        }
        
        console.log(`🎲 Rolling ${rollFormula} for ${itemName}`);
        
        try {
            roll = new Roll(rollFormula);
            await roll.evaluate();
            const cost = roll.total;
            
            console.log(`🎲 Roll result: ${cost} coins (formula: ${rollFormula})`);
            
            // Update the button and store the cost
            button.textContent = `${cost} coins`;
            button.dataset.cost = cost;
            button.classList.add('cost-rolled');
            
            // Enable the checkbox and quantity input
            const checkbox = this.element.find(`.gear-item-checkbox[data-item="${itemName}"]`);
            const quantityInput = this.element.find(`.quantity-input[data-item="${itemName}"]`);
            checkbox.prop('disabled', false);
            checkbox.attr('data-cost', cost);
            quantityInput.prop('disabled', false);
            
            // Show roll result in chat
            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: `Rolling cost for: ${itemName}`
            });
            
            console.log(`✅ Successfully rolled cost for ${itemName}: ${cost} coins`);
            
        } catch (error) {
            console.error(`❌ Error rolling cost for ${itemName}:`, error);
            ui.notifications.error(`Failed to roll cost for ${itemName}`);
        }
    }

    async _onRollAllCosts(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        
        console.log(`🎲 Rolling all costs for category: ${category}`);
        
        // Disable the roll all button during rolling
        button.disabled = true;
        button.textContent = "Rolling...";
        
        // Find all unrolled items in this category
        const categoryElement = this.element.find(`.gear-category[data-category="${category}"]`);
        const unrolledButtons = categoryElement.find('.roll-cost-btn').not('.cost-rolled');
        
        if (unrolledButtons.length === 0) {
            ui.notifications.info(`All items in ${category.toUpperCase()} category already have costs rolled.`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-dice"></i> Roll All';
            return;
        }
        
        let successCount = 0;
        let totalRolls = unrolledButtons.length;
        
        // Roll costs for each unrolled item with a small delay between rolls
        for (let i = 0; i < unrolledButtons.length; i++) {
            const rollButton = unrolledButtons[i];
            
            try {
                // Simulate clicking the individual roll button
                await this._rollSingleItemCost(rollButton, category);
                successCount++;
                
                // Small delay between rolls for visual effect
                if (i < unrolledButtons.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.error(`❌ Failed to roll cost for item in ${category}:`, error);
            }
        }
        
        // Re-enable the roll all button
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-dice"></i> Roll All';
        
        // Show success message
        ui.notifications.info(`Rolled costs for ${successCount}/${totalRolls} items in ${category.toUpperCase()} category.`);
        
        console.log(`✅ Completed rolling all costs for ${category}: ${successCount}/${totalRolls} successful`);
    }

    async _rollSingleItemCost(rollButton, category) {
        const itemName = rollButton.dataset.item;
        
        let roll;
        let rollFormula;
        
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
                throw new Error(`Unknown category: ${category}`);
        }
        
        roll = new Roll(rollFormula);
        await roll.evaluate();
        const cost = roll.total;
        
        // Update the button and store the cost
        rollButton.textContent = `${cost} coins`;
        rollButton.dataset.cost = cost;
        rollButton.classList.add('cost-rolled');
        
        // Enable the checkbox and quantity input
        const checkbox = this.element.find(`.gear-item-checkbox[data-item="${itemName}"]`);
        const quantityInput = this.element.find(`.quantity-input[data-item="${itemName}"]`);
        checkbox.prop('disabled', false);
        checkbox.attr('data-cost', cost);
        quantityInput.prop('disabled', false);
        
        // Show roll result in chat (but don't await to avoid slowdown)
        roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: `Rolling cost for: ${itemName}`
        });
        
        return cost;
    }

    _updateDisplay(html) {
        // Update remaining coins display
        const remainingCoins = this.availableCoins - this.totalCost;
        html.find('.remaining-coins').text(remainingCoins);
        html.find('.total-cost').text(this.totalCost);
        
        // Update coin display color based on remaining amount
        const coinsDisplay = html.find('.coins-info');
        if (remainingCoins < 0) {
            coinsDisplay.addClass('over-budget');
        } else {
            coinsDisplay.removeClass('over-budget');
        }
        
        // Update selected items list
        const selectedList = html.find('.selected-items-list');
        selectedList.empty();
        
        this.selectedItems.forEach(item => {
            const quantityText = item.quantity > 1 ? ` (×${item.quantity})` : '';
            const costText = item.quantity > 1 ? `${item.unitCost} × ${item.quantity} = ${item.totalCost} coins` : `${item.totalCost} coins`;
            selectedList.append(`
                <div class="selected-item">
                    <span class="item-name">${item.name}${quantityText}</span>
                    <span class="item-cost">${costText}</span>
                </div>
            `);
        });
        
        if (this.selectedItems.length === 0) {
            selectedList.append('<div class="no-items">No items selected</div>');
        }
        
        // Update buy items button state
        const buyButton = html.find('.buy-items-btn');
        const canAfford = this.totalCost <= this.availableCoins;
        const hasItems = this.selectedItems.length > 0;
        
        buyButton.prop('disabled', !hasItems || !canAfford);
        
        if (!hasItems) {
            buyButton.text('Select Items to Buy');
        } else if (!canAfford) {
            buyButton.html('<i class="fas fa-exclamation-triangle"></i> Cannot Afford Selected Items');
        } else {
            const itemWord = this.selectedItems.length === 1 ? 'Item' : 'Items';
            buyButton.html(`<i class="fas fa-shopping-cart"></i> Buy ${this.selectedItems.length} ${itemWord} (${this.totalCost} coins)`);
        }
    }


}