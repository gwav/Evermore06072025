export class LanguageSelectionDialog extends Application {
    constructor(actor, options = {}) {
        super({}, {
            title: "Select Languages",
            classes: ["language-selection-dialog"],
            width: 500,
            height: "auto",
            resizable: true
        });
        
        this.actor = actor;
        this.dialogOptions = options;
    }
    
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "systems/lastdays/templates/dialogs/language-selection.html",
            classes: ["dialog", "language-selection-dialog"],
            width: 500,
            height: "auto",
            resizable: true
        });
    }
    
    async getData() {
        const data = await super.getData();
        
        // Safely prepare data for template
        const safeOptions = {
            availableLanguages: this.dialogOptions.availableLanguages || {},
            availableSlots: Math.max(0, this.dialogOptions.availableSlots || 0),
            currentLanguages: Array.isArray(this.dialogOptions.currentLanguages) ? 
                this.dialogOptions.currentLanguages.filter(l => l && l.trim()) : [],
            automaticLanguages: Array.isArray(this.dialogOptions.automaticLanguages) ? 
                this.dialogOptions.automaticLanguages.filter(l => l && l.trim()) : []
        };
        
        console.log("🔧 FormApplication getData:", safeOptions);
        
        data.options = safeOptions;
        return data;
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        
        // Language selection change handlers
        html.find('.language-select').change(this._onLanguageChange.bind(this));
        
        // Button handlers
        html.find('.save-languages').click(this._onSave.bind(this));
        html.find('.cancel-languages').click(this._onCancel.bind(this));
    }
    
    _onLanguageChange(event) {
        const select = event.currentTarget;
        const selectedLang = select.value;
        const descriptionDiv = $(select).siblings('.language-description');
        
        if (selectedLang) {
            try {
                const description = game.i18n.localize(`ldoa.languages.${selectedLang}.description`);
                descriptionDiv.text(description || "No description available");
            } catch (e) {
                descriptionDiv.text("No description available");
            }
        } else {
            descriptionDiv.text("");
        }
    }
    
    _onSave(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("🗣️ Save button clicked");
        
        const selectedLanguages = [];
        
        // Debug: Check what elements we can find
        console.log("🗣️ Debugging form elements:");
        console.log("🗣️ Element:", this.element);
        console.log("🗣️ All selects:", this.element.find('select'));
        console.log("🗣️ All selects with class:", this.element.find('.language-select'));
        
        // Collect selected languages from form elements
        for (let i = 0; i < this.dialogOptions.availableSlots; i++) {
            const select = this.element.find(`select[name="language_${i}"]`);
            console.log(`🗣️ Looking for select[name="language_${i}"], found:`, select.length, "elements");
            
            if (select.length > 0) {
                const value = select.val();
                console.log(`🗣️ Language slot ${i}: "${value}"`);
                if (value && value.trim()) {
                    selectedLanguages.push(value.trim());
                }
            } else {
                console.warn(`🗣️ Could not find select element for language_${i}`);
            }
        }
        
        console.log("🗣️ Selected languages:", selectedLanguages);
        
        // Validate no duplicates
        const uniqueLanguages = [...new Set(selectedLanguages)];
        if (uniqueLanguages.length !== selectedLanguages.length) {
            ui.notifications.error("Cannot select the same language multiple times!");
            return;
        }
        
        // Build complete languages array (preserving existing structure)
        const currentLanguages = [...(this.dialogOptions.currentLanguages || [])];
        
        // Clear out the user-selectable slots and add new selections
        let selectionIndex = 0;
        for (let i = 0; i < currentLanguages.length && selectionIndex < selectedLanguages.length; i++) {
            // If this slot is empty or not automatic, we can use it for user selection
            if (!currentLanguages[i] || !this.dialogOptions.automaticLanguages.includes(currentLanguages[i])) {
                currentLanguages[i] = selectedLanguages[selectionIndex];
                selectionIndex++;
            }
        }
        
        // If we still have selections to add, extend the array
        while (selectionIndex < selectedLanguages.length) {
            currentLanguages.push(selectedLanguages[selectionIndex]);
            selectionIndex++;
        }
        
        console.log("🗣️ Complete languages array to save:", currentLanguages);
        
        // Call the callback with the complete languages array
        if (this.dialogOptions.callback) {
            try {
                this.dialogOptions.callback(currentLanguages);
                console.log("🗣️ Callback completed successfully");
            } catch (error) {
                console.error("🗣️ Error in callback:", error);
            }
        } else {
            console.warn("🗣️ No callback function provided!");
        }
        
        this.close();
    }
    
    _onCancel(event) {
        event.preventDefault();
        this.close();
    }
    

}