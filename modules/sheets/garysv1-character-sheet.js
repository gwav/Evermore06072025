import { takeLongRest, takeShortRest } from "../rests.js";
import { handleRollAttributeDieEvent, calculateAttributeValues, calculateCharacterData } from "../shared.js";
import { ldoaConfiguration } from "../configuration.js";
import { LanguageSelectionDialog } from "../dialogs/language-selection-dialog.js";
import { StartingGearDialog } from "../dialogs/starting-gear-dialog.js";

/**
 * Filter items by custom itemType field (from compendium UI)
 * @param {Array} items - Array of Foundry items
 * @param {string} desiredType - The itemType to match (e.g., "weapon", "armor")
 * @returns {Array} Filtered items matching the desired type
 */
function getItemsByItemType(items, desiredType) {
  return items.filter(item => {
    const customType = item.system?.itemType?.toLowerCase();
    return customType === desiredType;
  });
}

export default class Garysv1CharacterSheet extends ActorSheet {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["ldoa", "ldoa-sheet", "garysv1-character-sheet", "sheet"],
			height: 700,
			template: "systems/lastdays/templates/sheets/garysv1-character-sheet.html",
			width: 900,
			submitOnChange: false  // Prevent automatic form submission on every change
		});
	}

	get template() {
			return "systems/lastdays/templates/sheets/garysv1-character-sheet.html";
	}

	async getData() {
		let context = super.getData();
		context.tabSelected = this.actor.system.tabSelected || "overview";

		// Check for data corruption (warnings only)
		['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
				const calculated = this.actor.system.calculated?.[attr];
				const beginning = this.actor.system.beginning?.[attr];
				if (calculated > 100 || beginning > 100 || String(calculated).length > 2 || String(beginning).length > 2) {
						console.warn(`🚨 RAW CORRUPTION detected - ${attr}:`, {calculated, beginning});
				}
		});

		// Add configuration data with comprehensive safety checks
		context.configuration = CONFIG.configuration || {};
		console.log("🧪 Item Types Check:", this.actor.items.map(i => ({ name: i.name, type: i.type })));

		// Ensure required configuration lists exist to prevent template errors
		if (!context.configuration || !context.configuration.usageDieList) {
			context.configuration = context.configuration || {};
			context.configuration.usageDieList = {
				"exhausted": "ldoa.dice.exhausted",
				"d4": "ldoa.dice.d4",
				"d6": "ldoa.dice.d6",
				"d8": "ldoa.dice.d8",
				"d10": "ldoa.dice.d10",
				"d12": "ldoa.dice.d12",
				"d20": "ldoa.dice.d20"
			};
		}

		// Ensure language configuration exists
		if (!context.configuration.languagesList) {
			context.configuration.languagesList = CONFIG.configuration?.languagesList || {};
		}
		if (!context.configuration.languageGroups) {
			context.configuration.languageGroups = CONFIG.configuration?.languageGroups || {};
		}
		
		// Ensure basic context properties exist to prevent template errors
		context.actor = context.actor || {};
		context.actor.system = context.actor.system || {};
		context.weapons = getItemsByItemType(context.items, "weapon");

console.log("🧾 DEBUG - Item Type Comparison:");
(context.actor.items?.contents || []).forEach(item => {
  const foundryType = item.type;
  const customType = item.system?.itemType;
  console.log(`- "${item.name}" → Foundry type: ${foundryType}, Custom itemType: ${customType}`);
});


console.log("🧾 DEBUG - Actor Items Listing:");
(context.actor.items?.contents || []).forEach(item => {
  console.log(`- "${item.name}" [type: ${item.type}]`);
});

		// Ensure all required system properties exist
		context.actor.system.stress = String(context.actor.system.stress || "d6");
		context.actor.system.creationMode = context.actor.system.creationMode || false;
		
		// Initialize attribute sections if they don't exist
		context.actor.system.calculated = context.actor.system.calculated || {};
		context.actor.system.beginning = context.actor.system.beginning || {};
		context.actor.system.creationBonus = context.actor.system.creationBonus || {};
		context.actor.system.inGameBonus = context.actor.system.inGameBonus || {};
		
		// Initialize languages array if it doesn't exist 
		// Note: Thyrenian is automatically known by all characters (handled in template)
		

		
		// Force new characters to start in creation mode if they have default attributes (all 10s)
		if (context.actor.type === "character" && !context.actor.system.creationMode) {
			const hasDefaultAttributes = context.actor.system.calculated && 
				Object.values(context.actor.system.calculated).every(val => val === 10);
			
			if (hasDefaultAttributes) {
				console.log("🎭 New character detected - forcing creation mode");
				await context.actor.update({"system.creationMode": true});
				context.actor.system.creationMode = true; // Update context immediately
			}
		}
		
		// Calculate character data (including attributes)
		if (context.actor.type === "character") {
			const attributes = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
			
			// First, sanitize ALL attribute data to ensure all values are proper numbers
			// This must happen BEFORE calculation to prevent malformed values
			const sanitizeUpdates = {};
			let needsUpdate = false;
			
			for (const attr of attributes) {
				const sections = ['calculated', 'beginning', 'creationBonus', 'inGameBonus'];
				
				for (const section of sections) {
					const value = context.actor.system[section][attr];

					
					// Check if value needs sanitization
					const needsSanitization = Array.isArray(value) || 
																	typeof value === 'string' || 
																	String(value).includes(',') || 
																	isNaN(Number(value)) ||
																	// Handle concatenated values like 1111, 1010, 1313, etc.
																	(typeof value === 'number' && value > 18 && String(value).length > 2);
					
					if (needsSanitization) {
						let cleanValue;
						if (Array.isArray(value)) {
							cleanValue = parseInt(value[0]) || (section === 'calculated' || section === 'beginning' ? 10 : 0);
						} else if (typeof value === 'number' && value > 18 && String(value).length >= 2) {
							// Handle concatenated numbers like 1111 -> 11, 1313 -> 13, 99 -> 9, etc.
							const strValue = String(value);
							if (strValue.length === 4 && strValue[0] === strValue[1] && strValue[2] === strValue[3]) {
									// Pattern like 1111 -> 11, 1313 -> 13
									cleanValue = parseInt(strValue.substring(0, 2));
							} else if (strValue.length === 2 && strValue[0] === strValue[1]) {
									// Pattern like 99 -> 9, 88 -> 8
									cleanValue = parseInt(strValue[0]);
							} else if (strValue.length === 2) {
									// Other 2-digit values over 18 - use first digit
									cleanValue = parseInt(strValue[0]);
							} else {
									// Fallback - take first reasonable digit(s)
									cleanValue = parseInt(strValue.substring(0, 2)) || (section === 'calculated' || section === 'beginning' ? 10 : 0);
							}
						} else {
							cleanValue = parseInt(String(value).replace(/,/g, '')) || (section === 'calculated' || section === 'beginning' ? 10 : 0);
						}
						
						// Ensure reasonable range
						if (cleanValue > 18) {
							cleanValue = 18;
						}
						if (cleanValue < 3) {
							cleanValue = (section === 'calculated' || section === 'beginning' ? 10 : 0);
						}
						
						sanitizeUpdates[`system.${section}.${attr}`] = cleanValue;
						needsUpdate = true;
					}
				}
			}
				
			// Apply sanitization if needed - this MUST complete before calculation
			if (needsUpdate) {
				await context.actor.update(sanitizeUpdates);
				// Refresh context after update
				context = await super.getData();
				// ESSENTIAL: Must restore configuration - super.getData() doesn't include it
				context.configuration = CONFIG.configuration || {};
			}
			
			calculateCharacterData(context, CONFIG.configuration);
			
			// Calculate boon bonuses (no debug logging)
			
			// Calculate boon bonuses for each attribute (for UI display)
			const actorBoons = context.actor.items.filter(item => item.type === "boon");
			const boonBonuses = {
				strength: 0, dexterity: 0, constitution: 0,
				intelligence: 0, wisdom: 0, charisma: 0
			};
			
			actorBoons.forEach(boon => {
				if (boon.system?.effects?.attributes) {
					Object.keys(boonBonuses).forEach(attr => {
						if (boon.system.effects.attributes[attr]) {
							boonBonuses[attr] += boon.system.effects.attributes[attr];
						}
					});
				}
			});
			
			// Add boon bonuses to context for template
			context.boonBonuses = boonBonuses;
			
			// Apply human racial bonus if character is human and not in creation mode
			if (!context.actor.system.creationMode && context.actor.system.kin === "human") {
					await this._applyHumanCreationBonus();
			}
			
			// Removed all corruption fixing that was interfering with character creation
		}
console.log("Weapons in context:", context.weapons);
if (!Array.isArray(context.items)) {
  console.warn("🚨 context.items is not an array:", context.items);
  context.items = [];
}

		// Filter items by type
		context.demons      = context.items.filter((item) => item.type === "demon");
		context.boons       = context.items.filter((item) => item.type === "boon");
		context.spells      = context.items.filter((item) => item.type === "spell");
		context.spirits     = context.items.filter((item) => item.type === "spirit");
		context.weapons = getItemsByItemType(context.items, "weapon");

		context.equipment = context.items.filter(item =>["inventory", "equipment"].includes(item.type));

		context.consumables = context.items.filter((item) => item.type === "consumable");
		console.log("🧪 Equipment items:", context.equipment.map(i => i.name));

		
		// DEBUG: Log equipment items for template
		console.log(`🎒 EQUIPMENT DEBUG for character sheet:`);
		console.log(`- Total items available: ${context.items.length}`);
		console.log(`- Equipment items found: ${context.equipment.length}`);
		context.equipment.forEach((item, index) => {
				console.log(`  Equipment ${index + 1}: "${item.name}" (type: ${item.type}, quantity: ${item.system?.quantity || 'N/A'})`);
		});
		
		// DEBUG: Log boons items for template
		console.log(`⭐ BOONS DEBUG for character sheet:`);
		console.log(`- Boons found: ${context.boons.length}`);
		context.boons.forEach((item, index) => {
				console.log(`  Boon ${index + 1}: "${item.name}" (type: ${item.type}, power: ${item.system?.power || 'N/A'})`);
		});
		
		// Calculate language slots after boons are available
		context.languageSlots = this._calculateLanguageSlots(context);
		
		// Get available languages for selection
		context.availableLanguages = this._getAvailableLanguages(context);

		// Prepare armor data
		this._prepareArmorData(context);

		// Debug weapons before preparation
		console.log("🗡️ Pre-weapon preparation debug:", {
			weaponItems: context.weapons?.length || 0,
			weaponNames: context.weapons?.map(w => w.name) || []
		});

		// Prepare weapon data
		this._prepareWeaponData(context);
		
		// Debug weapons after preparation
		console.log("🗡️ Post-weapon preparation debug:", {
			availableMelee: context.availableMeleeWeapons?.length || 0,
			availableRanged: context.availableRangedWeapons?.length || 0
		});

console.log("Sheet context:", context);

		// Add kin descriptions (lore only)
		const kinDescriptions = {
				blooded: `<strong>BLOODED</strong>
									<p>Blooded are individuals with supernatural ancestry, whether from a recent parent or a distant ancestor. They mostly look human but have distinct traits that reveal their heritage—some subtly, others dramatically. While Blooded feel connected to one another, they have no unified community. Scholars have categorized them into different bloodlines including Changeling, Dragonborn, Elementalkin and Nephilim.</p>`,
				human: `<strong>HUMAN</strong>
								<p>The most numerous of the Kin of Evermore, humans can be found throughout the lands. Humanity is not native to Evermore, having been transported from Earth through a powerful Rite created by the Grand Archmage Zoso. When Evermore came into being it was painfully glaring that humanity was missing. This issue was on the Creator's part, an oversight.</p>`,
				manikin: `<strong>MANIKIN</strong>
									<p>Manikins are sentient, humanoid constructs. Some were created for a special purpose while others became sentient by strange magics or occurrences.</p>`,
				trickster: `<strong>TRICKSTER</strong>
										<p>Tricksters are intelligent animals that can take on human form. They are the children of the Trickster god Eshu but are not divine themselves (though some of them through trickery gain followers) and can die like any other living being (most of the time). Typical animal forms associated with Tricksters include Cat, Carp, Coyote, Crane, Dog, Fox, Hare, Raccoon, Raven and Wolf. Tricksters reproduce by unions with humans or animals of their type. They cannot reproduce with each other.</p>`
		};

		// Add kin traits (mechanics only)
		const kinTraits = {
			blooded: `<ul>
				<li><strong>Alluring:</strong> They have a natural charm, giving them an advantage in social interactions.</li>
				<li><strong>Blood Calls to Blood:</strong> They can sense places, people, and objects connected to their ancestry.</li>
				<li><strong>Two Spirit:</strong> Considered both human and supernatural.</li>
			</ul>
			<p><strong>Languages:</strong> They speak the tongue of their supernatural ancestor.</p>`,
			human: `<ul>
				<li><strong>Image of the Creator:</strong> Humans receive a +1 bonus to all attributes at character level. This cannot raise the total of an attribute past 18. Furthermore they receive an extra boon at character creation.</li>
			</ul>
			<p><strong>Languages:</strong> A language belonging to their Origin.</p>`,
			manikin: `<ul>
				<li><strong>Magick Susceptibility:</strong> Manikins are susceptible to magickal effects, including magickal healing, curses, and enchantments.</li>
				<li><strong>Inorganic Existence:</strong> Manikins cannot eat, drink, or breathe. Non-magickal diseases, poisons, and venoms have no effect on Manikins. While they cannot suffer from these ailments, they can transmit them to others.</li>
				<li><strong>Limited Empathy:</strong> Manikins have disadvantage on social Charisma rolls.</li>
				<li><strong>Dormancy & Dreaming:</strong> Manikins become dormant for four hours daily—a period akin to sleep for organics. During this time, they enter a dream-like state. They remain unaware of their surroundings unless deliberately awakened, making them vulnerable during this phase.</li>
			</ul>
			<p><strong>Languages:</strong> One language reflecting either a creator or used to fulfill a special purpose.</p>`,
			trickster: `<ul>
				<li><strong>Noble Form:</strong> The true form. The animal form. In this form the Trickster uses all of the stats of the character but they must be tempered by the reality of the form. A Raven Trickster cannot lift a bowling ball while a carp cannot manipulate any item in their fish form. Hit points are that of the character's. In either form hit points and hit points loss carry over. Items worn while in the hooman form melds into this form and cannot be used or benefited from in any way.</li>
				<li><strong>Hooman Form:</strong> The foil of the Trickster. In the hooman form all background features are accessible. The hooman form can understand but not speak the Beast Speech. When this form becomes unconscious in any way it reverts to the Noble Form.</li>
			</ul>
			<p><strong>Languages:</strong> Beast Speech.</p>`
		};

		// Ensure we have a kin value (default to human if not set)
		let currentKin = context.actor.system.kin || 'human';
		
		// If no kin is set, initialize it to human
		if (!context.actor.system.kin) {
				await this.actor.update({ "system.kin": "human" }, { render: false });
				currentKin = 'human';
		}
		
		context.kinDescription = kinDescriptions[currentKin] || kinDescriptions.human;
		context.kinTraits = kinTraits[currentKin] || kinTraits.human;
		
		// Ensure the context has the current kin for template rendering
		context.actor.system.kin = currentKin;

		// Debug template data
		console.log("🔍 Template render check:");
		console.log("- CONFIG.configuration:", CONFIG.configuration);
		console.log("- context.configuration:", context.configuration);
		console.log("- usageDieList exists:", !!context.configuration?.usageDieList);
		console.log("- usageDieList value:", context.configuration?.usageDieList);
		console.log("- stress value:", context.actor.system.stress);
		console.log("- stress type:", typeof context.actor.system.stress);
		
		// Force ensure usageDieList is valid before template renders
		if (!context.configuration?.usageDieList) {
			console.warn("🔧 Forcing usageDieList fallback");
			context.configuration = context.configuration || {};
			context.configuration.usageDieList = {
				"exhausted": "ldoa.dice.exhausted",
				"d4": "ldoa.dice.d4",
				"d6": "ldoa.dice.d6",
				"d8": "ldoa.dice.d8",
				"d10": "ldoa.dice.d10",
				"d12": "ldoa.dice.d12",
				"d20": "ldoa.dice.d20"
			};
		}

		// Add Origins data with selection state
		const currentOrigin = context.actor.system.origin || "";
		console.log(`🌍 Current origin for template: "${currentOrigin}"`);
		
		const barbarianOriginsList = [
			"...in a slave camp.",
			"...on an island just before the invaders came.",
			"...during your clan's last raid.",
			"...in an invading army's camp before you were kidnapped.",
			"...under the harsh sun, in the territory of a desert tribe.",
			"...in the hut of a banished druid.",
			"...in a stone circle shunned by your people.",
			"...among your Pict brothers and sisters after a bloody battle.",
			"...aboard a longship filled with Northern raiders.",
			"...nine months after a foreign mercenary married your mother.",
			"...while the rest of the Iron Horde was attacking a caravan.",
			"...in a civilized kingdom, but you were traded as a hostage.",
			"...in a cave network ruled by strange insectoid creatures.",
			"...in a palace, soon after raided by your adoptive tribe.",
			"...on the night your clan burned the Empire's capital.",
			"...in a forest clearing, denounced by the druids as a dark omen.",
			"...on the last ship of a seafaring clan.",
			"...inside a wicker statue about to be burned.",
			"...on the foreign ship bringing your family back home.",
			"...in the middle of a battle against your conquerors."
		];
		
		context.barbarianOrigins = barbarianOriginsList.map((text, index) => ({
			text: text,
			value: `barbarian-${index}`,
			selected: currentOrigin === `barbarian-${index}`
		}));

		const civilisedOriginsList = [
			"...in the city's worst slums.",
			"...in the shadows of a theocracy.",
			"...aboard a plague ship, somehow the only survivor.",
			"...in a bustling mining town.",
			"...during an expedition searching for a mythical city.",
			"...on the street, as your family was fleeing revolutionary forces.",
			"...in a foreign land after your parents' ship got wrecked.",
			"...inside an invocation pentacle, near the sorcerer's body.",
			"...on the prison island where the monarch's political opponents are sent.",
			"...on the day the king was beheaded by your father.",
			"...aboard a ship sent to find a new maritime route.",
			"...in a military academy where your parents were teaching.",
			"...in a fortress later burned by your family's enemies.",
			"...in the biggest mansion of the city's merchant quarter.",
			"...in the middle of a mercenary camp.",
			"...in a secluded religious community.",
			"...in the dilapidated manor of your ruined family.",
			"...in an isolated farm on the frontier.",
			"...in the richest palace of the Caliphate.",
			"...in a hideout for the assassin's guild."
		];
		
		context.civilisedOrigins = civilisedOriginsList.map((text, index) => ({
			text: text,
			value: `civilised-${index}`,
			selected: currentOrigin === `civilised-${index}`
		}));

		const decadentOriginsList = [
			"...in a jeweled tower, symbol of a corrupt empire.",
			"...in the barracks of the slave soldiers.",
			"...in a disreputable brothel of the City of Thieves.",
			"...in the poppy fields owned by the Court's greatest sorcerer.",
			"...in the necropolis where you were raised by ghosts.",
			"...in a museum, as part of the permanent exhibition.",
			"...in the ruins of a crystal palace.",
			"...inside a monstrous creature killed by your adoptive parents.",
			"...as a vessel for the soul of a dying noble. The ritual failed.",
			"...in the last city of a dying species.",
			"...covered with the blood of your own people after a failed invocation.",
			"...in the arena's champion quarters.",
			"...in the servants quarters of a vampire's tower.",
			"...below the Empress's palace, among her slaves.",
			"...in the desiccated gardens of a dying desert city.",
			"...on a tropical island, just as it was beginning to sink.",
			"...in an asylum deep within the Forbidden City.",
			"...in the laboratory of the alchemist you called Father.",
			"...at the top of a pyramid of red obsidian.",
			"...in a hurricane summoned by your mother."
		];
		
		context.decadentOrigins = decadentOriginsList.map((text, index) => ({
			text: text,
			value: `decadent-${index}`,
			selected: currentOrigin === `decadent-${index}`
		}));

		return context;
	}

	async _render(force, options) {
			const result = await super._render(force, options);
			
			// Ensure origin type button styling is applied after render
			setTimeout(() => {
					this._updateOriginTypeButtonStyling();
			}, 100);
			
			return result;
	}

	async _renderInner(data) {
		try {
			console.log("🎨 About to render template with data:", {
				configuration: data.configuration,
				usageDieList: data.configuration?.usageDieList,
				stress: data.actor?.system?.stress
			});
			
			// Debug origin data being passed to template
			if (data.actor?.type === "character") {
				console.log("🌍 Origin data for template:", {
					originType: data.actor.system.originType,
					origin: data.actor.system.origin,
					background: data.actor.system.background
				});
			}
			return await super._renderInner(data);
		} catch (error) {
			console.error("🚨 Template render error:", error);
			console.error("🚨 Data that caused error:", data);
			throw error;
		}
	}

	activateListeners(html) {
		super.activateListeners(html);

		// Mode switching
		html.find('.garysv1-mode-button').click(this._onModeClicked.bind(this));

		// Tab switching
		html.find(".garysv1-tab-label").click(ev => {
			const tab = $(ev.currentTarget).data("tab");

			// Save selected tab to actor system data
			this.actor.update({ "system.tabSelected": tab });

			html.find(".garysv1-tab-label").removeClass("garysv1-tab-active");
			$(ev.currentTarget).addClass("garysv1-tab-active");

			html.find(".garysv1-tab-panel").removeClass("garysv1-tab-active");
			html.find(`.garysv1-tab-panel[data-tab="${tab}"]`).addClass("garysv1-tab-active");
		});

		// Rest controls
		html.find('.ldoa-rest-icon').click(this._onRestClicked.bind(this));

		// Stress die roll
		html.find('.ldoa-stress-roll-icon').click(this._onStressRollClicked.bind(this));

		// Attribute rolls
		html.find('.ldoa-attribute-roll-icon').click(this._onAttributeRollClicked.bind(this));
		
		// Roll all attributes
		html.find('.garysv1-roll-all-button').click(this._onRollAllAttributesClicked.bind(this));

		// Item management
		html.find('.ldoa-delete-item-icon').click(this._onDeleteItemClicked.bind(this));
		html.find(".ldoa-item-name").click(ev => {
			const itemId = ev.currentTarget.dataset.itemId;
			const item = this.actor.items.get(itemId);
			if (item) {
				item.sheet.render(true);
			} else {
				console.warn("Item not found on actor:", itemId);
			}
		});


		// Language selection
		html.find('[data-action="select-languages"]').click(this._onLanguageSelectionClicked.bind(this));

		// Auto-expand textareas in equipment grid
		html.find('.garysv1-desc-input, .garysv1-notes-input').each((i, textarea) => {
			this._autoExpandTextarea(textarea);
			$(textarea).on('input', () => this._autoExpandTextarea(textarea));
		});

		// Gear selection button
		html.find('.garysv1-gear-button.garysv1-gear-enabled').click(this._onGearSelectionClicked.bind(this));
		html.find(".garysv1-browse-inventory").click(() => {
				const pack = game.packs.get("world.inventory");
				context.inventory = context.items.filter(item => item.type === "equipment");

				if (pack) pack.render(true);
				else ui.notifications.warn("Inventory compendium not found.");
		});

		html.find(".garysv1-tab-label").click(ev => {
			const tab = $(ev.currentTarget).data("tab");

			html.find(".garysv1-tab-label").removeClass("garysv1-tab-active");
			$(ev.currentTarget).addClass("garysv1-tab-active");

			html.find(".garysv1-tab-panel").removeClass("garysv1-tab-active");
			html.find(`.garysv1-tab-panel[data-tab="${tab}"]`).addClass("garysv1-tab-active");

		});

		// Armor selection
		html.find('.garysv1-armor-select').change(ev => {
			const selectedId = ev.target.value;
			const armorData = this.options.availableArmor || [];

			const selectedArmor = armorData.find(item => item.id === selectedId);
			const value = selectedArmor?.armorValue ?? 0;

			// Update displayed armor value
			html.find('.garysv1-armor-value').text(value);

			// 🧠 Persist the selection to actor data
			this.actor.update({
				"system.selectedArmor": selectedId
			});

		//Weapon selection
		html.find('[name="system.selectedMeleeWeapon"]').change(ev => {
			this.actor.update({ "system.selectedMeleeWeapon": ev.target.value });
		});
		html.find('[name="system.selectedRangedWeapon"]').change(ev => {
			this.actor.update({ "system.selectedRangedWeapon": ev.target.value });
		});

		});
		
		// Handle kin radio button changes to prevent flicker
		const kinRadios = html.find('.garysv1-kin-radio');
		
		// Fix the radio button selection after template renders
		const currentKin = this.actor.system.kin || 'human';
		kinRadios.each((i, el) => {
			el.checked = (el.value === currentKin);
		});
		
		kinRadios.change(this._onKinRadioChanged.bind(this));
		
		// Handle background radio button changes
		const backgroundRadios = html.find('.garysv1-background-radio');
		
		// Fix the background radio button selection after template renders
		const currentBackground = this.actor.system.background || 'barbarian';
		backgroundRadios.each((i, el) => {
			el.checked = (el.value === currentBackground);
		});
		
		backgroundRadios.change(this._onBackgroundRadioChanged.bind(this));
		
		// Initialize background display on sheet load
		this._updateBackgroundDisplay(currentBackground);
		
		// Language management
		html.find('.garysv1-language-select').change(this._onLanguageSelectChanged.bind(this));
		html.find('.garysv1-language-remove').click(this._onLanguageRemoveClicked.bind(this));
		
		// Initialize Game Play mode background display
		this._updateGamePlayBackgroundDisplay(currentBackground);

		// Handle origin type radio button changes
		const originTypeRadios = html.find('.garysv1-origin-type-radio');
		originTypeRadios.change(this._onOriginTypeRadioChanged.bind(this));

		// Handle specific origin radio button changes
		const originRadios = html.find('.garysv1-origin-radio');
		originRadios.change(this._onOriginRadioChanged.bind(this));
		
		// Initialize origin type display on sheet load
		const currentOriginType = this.actor.system.originType || 'barbarian';
		this.element.find('.garysv1-origin-group').addClass('garysv1-hidden');
		this.element.find(`.garysv1-origin-group[data-origin-type="${currentOriginType}"]`).removeClass('garysv1-hidden');
		
		// Update origin type button styling
		this._updateOriginTypeButtonStyling();
		
		// Also update styling after any DOM operations complete
		setTimeout(() => {
			this._updateOriginTypeButtonStyling();
		}, 50);
		
		// Handle other form inputs with debounced updates (exclude HP input)
		html.find('input[type="text"], input[type="number"], select').not('.garysv1-kin-radio').not('.garysv1-hp-input').change(this._onFormFieldChanged.bind(this));
		
		// Handle HP input separately to avoid interfering with attributes
		html.find('.garysv1-hp-input').change(this._onHPChanged.bind(this));
		
		// Equipment filter buttons
		html.find('.garysv1-filter-button').click(this._onEquipmentFilterClicked.bind(this));

		html.find('.garysv1-weapon-roll').click(ev => {
			const rollType = ev.currentTarget.dataset.rollType;
			const select = html.find(`.garysv1-weapon-select[data-action="${rollType}"]`);
			const itemId = select.val();
			const item = actor.items.get(itemId);

			const ability = rollType === 'melee' ? 'str' : 'dex';
			const rollFormula = `1d20 + @abilities.${ability}.mod`;

			new Roll(rollFormula, actor.getRollData()).roll({async: true}).then(roll => {
				roll.toMessage({
					speaker: ChatMessage.getSpeaker({actor}),
					flavor: `${rollType === 'melee' ? 'Melee' : 'Ranged'} Weapon Resolution: ${item?.name}`
				});
			});
		});
	}

	async _onRestClicked(event) {
			event.preventDefault();
			const element = event.currentTarget;
			const actorId = element.dataset.actor;
			const restType = element.dataset.type;
			
			const actor = game.actors.get(actorId);
			if (actor) {
					if (restType === "long") {
							takeLongRest(actor);
					} else if (restType === "short") {
							takeShortRest(actor);
					} else {
							console.error(`Unrecognised type '${restType}' specified for rest.`);
					}
			} else {
					console.error(`Unable to locate an actor with the id ${actorId}.`);
			}
	}

	async _onStressRollClicked(event) {
			event.preventDefault();
			const actor = this.actor;
			
			// Roll stress die
			const roll = new Roll(actor.system.stress);
			await roll.evaluate();
			
			// Display result
			await roll.toMessage({
					speaker: ChatMessage.getSpeaker({actor: actor}),
					flavor: `${actor.name} rolls their stress die!`
			});
	}

	async _onAttributeRollClicked(event) {
			console.log("🎯 ATTRIBUTE ROLL CLICKED!", event);
			event.preventDefault();
			const element = event.currentTarget;
			const actor = this.actor;
			const attribute = element.dataset.attribute;
			
			console.log("🎯 Element:", element);
			console.log("🎯 Attribute:", attribute);
			console.log("🎯 Actor:", actor);
			console.log("🎯 Creation Mode:", actor.system.creationMode);
			
			if (!attribute) {
					console.error("No attribute specified for roll");
					return;
			}
			
			// Check if we're in Game Play mode or Creation Mode
			if (actor.system.creationMode) {
					// CHARACTER CREATION roll - roll 1d6 + 7 and set both beginning and current values
					const roll = new Roll("1d6 + 7");
					await roll.evaluate();
					
					const newValue = parseInt(roll.total);  // Ensure it's an integer
					
					// Update both beginning (locked) and current (calculated) values
					const updateData = {};
					updateData[`system.beginning.${attribute}`] = newValue;
					updateData[`system.calculated.${attribute}`] = newValue;
					
					console.log(`About to update actor with data:`, updateData);
					console.log(`Current actor data before update:`, actor.system);
					
					await actor.update(updateData);
					
					console.log(`Actor data after update:`, actor.system);
					
					// Force refresh the sheet
					this.render(false);
					
					// Send to chat
					await roll.toMessage({
							speaker: ChatMessage.getSpeaker({actor: actor}),
							flavor: `${actor.name} rolls for ${game.i18n.localize(`ldoa.attributes.${attribute}.long`)} (Character Creation): ${newValue}`
					});
					
					console.log(`Character creation roll - ${attribute}: ${newValue}`);
			} else {
					// GAME PLAY mode - Resolution roll (1d20 vs attribute)
					this._showResolutionRollDialog(actor, attribute);
			}
	}

	async _onDeleteItemClicked(event) {
			event.preventDefault();
			const element = event.currentTarget;
			const itemId = element.dataset.item;
			
			const item = this.actor.items.get(itemId);
			if (item) {
					await item.delete();
			}
	}

	async _onItemNameClicked(event) {
			event.preventDefault();
			const element = event.currentTarget;
			const itemId = element.dataset.item;
			
			const item = this.actor.items.get(itemId);
			if (item) {
					item.sheet.render(true);
			}
	}

	async _onEquipmentFilterClicked(event) {
			event.preventDefault();
			const button = event.currentTarget;
			const filter = button.dataset.filter;
			
			// Update active button
			const html = $(this.element);
			html.find('.garysv1-filter-button').removeClass('garysv1-filter-active');
			$(button).addClass('garysv1-filter-active');
			
			// Filter equipment items
			const equipmentItems = html.find('.garysv1-equipment-item');
			
			equipmentItems.each((i, element) => {
					const itemElement = $(element);
					const itemType = itemElement.data('item-type');
					const itemName = itemElement.data('item-name')?.toLowerCase() || '';
					
					let shouldShow = true;
					
					switch(filter) {
							case 'all':
									shouldShow = true;
									break;
							case 'weapons-armor':
									shouldShow = itemType === 'weapon' || 
															itemName.includes('armor') || 
															itemName.includes('armour') ||
															itemName.includes('shield') ||
															itemName.includes('helmet') ||
															itemName.includes('gauntlet') ||
															itemName.includes('boot') ||
															itemName.includes('sword') ||
															itemName.includes('axe') ||
															itemName.includes('spear') ||
															itemName.includes('bow') ||
															itemName.includes('crossbow') ||
															itemName.includes('dagger') ||
															itemName.includes('mace') ||
															itemName.includes('hammer') ||
															itemName.includes('staff') ||
															itemName.includes('club');
									break;
							case 'potions':
									shouldShow = itemType === 'consumable' ||
															itemName.includes('potion') ||
															itemName.includes('elixir') ||
															itemName.includes('tonic') ||
															itemName.includes('remedy') ||
															itemName.includes('salve') ||
															itemName.includes('herb') ||
															itemName.includes('pill') ||
															itemName.includes('medicine');
									break;
							case 'wealth':
									shouldShow = itemName.includes('coin') ||
															itemName.includes('gold') ||
															itemName.includes('silver') ||
															itemName.includes('copper') ||
															itemName.includes('gem') ||
															itemName.includes('jewel') ||
															itemName.includes('diamond') ||
															itemName.includes('ruby') ||
															itemName.includes('emerald') ||
															itemName.includes('sapphire') ||
															itemName.includes('pearl') ||
															itemName.includes('treasure') ||
															itemName.includes('currency');
									break;
							case 'misc':
									// Everything else (default case)
									shouldShow = !(
											// Not weapons/armor
											(itemType === 'weapon' || 
												itemName.includes('armor') || 
												itemName.includes('armour') ||
												itemName.includes('shield') ||
												itemName.includes('helmet') ||
												itemName.includes('gauntlet') ||
												itemName.includes('boot') ||
												itemName.includes('sword') ||
												itemName.includes('axe') ||
												itemName.includes('spear') ||
												itemName.includes('bow') ||
												itemName.includes('crossbow') ||
												itemName.includes('dagger') ||
												itemName.includes('mace') ||
												itemName.includes('hammer') ||
												itemName.includes('staff') ||
												itemName.includes('club')) &&
											// Not potions
											!(itemType === 'consumable' ||
												itemName.includes('potion') ||
												itemName.includes('elixir') ||
												itemName.includes('tonic') ||
												itemName.includes('remedy') ||
												itemName.includes('salve') ||
												itemName.includes('herb') ||
												itemName.includes('pill') ||
												itemName.includes('medicine')) &&
											// Not wealth
											!(itemName.includes('coin') ||
												itemName.includes('gold') ||
												itemName.includes('silver') ||
												itemName.includes('copper') ||
												itemName.includes('gem') ||
												itemName.includes('jewel') ||
												itemName.includes('diamond') ||
												itemName.includes('ruby') ||
												itemName.includes('emerald') ||
												itemName.includes('sapphire') ||
												itemName.includes('pearl') ||
												itemName.includes('treasure') ||
												itemName.includes('currency'))
									);
									break;
					}
					
					if (shouldShow) {
							itemElement.show();
					} else {
							itemElement.hide();
					}
			});
	}

	async _onKinRadioChanged(event) {
			const selectedKin = event.currentTarget.value;
			
			// Update the actor data
			await this.actor.update({ "system.kin": selectedKin }, { render: false });
			
			// Update traits and description immediately without re-rendering the whole sheet
			// Descriptions (lore only - for bottom box)
			const kinDescriptions = {
					blooded: `<strong>BLOODED</strong>
										<p>Blooded are individuals with supernatural ancestry, whether from a recent parent or a distant ancestor. They mostly look human but have distinct traits that reveal their heritage—some subtly, others dramatically. While Blooded feel connected to one another, they have no unified community. Scholars have categorized them into different bloodlines including Changeling, Dragonborn, Elementalkin and Nephilim.</p>`,
					human: `<strong>HUMAN</strong>
									<p>The most numerous of the Kin of Evermore, humans can be found throughout the lands. Humanity is not native to Evermore, having been transported from Earth through a powerful Rite created by the Grand Archmage Zoso. When Evermore came into being it was painfully glaring that humanity was missing. This issue was on the Creator's part, an oversight.</p>`,
					manikin: `<strong>MANIKIN</strong>
										<p>Manikins are sentient, humanoid constructs. Some were created for a special purpose while others became sentient by strange magics or occurrences.</p>`,
					trickster: `<strong>TRICKSTER</strong>
											<p>Tricksters are intelligent animals that can take on human form. They are the children of the Trickster god Eshu but are not divine themselves (though some of them through trickery gain followers) and can die like any other living being (most of the time). Typical animal forms associated with Tricksters include Cat, Carp, Coyote, Crane, Dog, Fox, Hare, Raccoon, Raven and Wolf. Tricksters reproduce by unions with humans or animals of their type. They cannot reproduce with each other.</p>`
			};

			// Traits (mechanics only - for right side box)
			const kinTraits = {
					blooded: `<ul>
											<li><strong>Alluring:</strong> They have a natural charm, giving them an advantage in social interactions.</li>
											<li><strong>Blood Calls to Blood:</strong> They can sense places, people, and objects connected to their ancestry.</li>
											<li><strong>Two Spirit:</strong> Considered both human and supernatural.</li>
										</ul>
										<p><strong>Languages:</strong> They speak the tongue of their supernatural ancestor.</p>`,
					human: `<ul>
										<li><strong>Image of the Creator:</strong> Humans receive a +1 bonus to all attributes at character level. This cannot raise the total of an attribute past 18. Furthermore they receive an extra boon at character creation.</li>
									</ul>
									<p><strong>Languages:</strong> A language belonging to their Origin.</p>`,
					manikin: `<ul>
											<li><strong>Magick Susceptibility:</strong> Manikins are susceptible to magickal effects, including magickal healing, curses, and enchantments.</li>
											<li><strong>Inorganic Existence:</strong> Manikins cannot eat, drink, or breathe. Non-magickal diseases, poisons, and venoms have no effect on Manikins. While they cannot suffer from these ailments, they can transmit them to others.</li>
											<li><strong>Limited Empathy:</strong> Manikins have disadvantage on social Charisma rolls.</li>
											<li><strong>Dormancy & Dreaming:</strong> Manikins become dormant for four hours daily—a period akin to sleep for organics. During this time, they enter a dream-like state. They remain unaware of their surroundings unless deliberately awakened, making them vulnerable during this phase.</li>
										</ul>
										<p><strong>Languages:</strong> One language reflecting either a creator or used to fulfill a special purpose.</p>`,
					trickster: `<ul>
												<li><strong>Noble Form:</strong> The true form. The animal form. In this form the Trickster uses all of the stats of the character but they must be tempered by the reality of the form. A Raven Trickster cannot lift a bowling ball while a carp cannot manipulate any item in their fish form. Hit points are that of the character's. In either form hit points and hit points loss carry over. Items worn while in the hooman form melds into this form and cannot be used or benefited from in any way.</li>
												<li><strong>Hooman Form:</strong> The foil of the Trickster. In the hooman form all background features are accessible. The hooman form can understand but not speak the Beast Speech. When this form becomes unconscious in any way it reverts to the Noble Form.</li>
											</ul>
											<p><strong>Languages:</strong> Beast Speech.</p>`
			};
			
			const description = kinDescriptions[selectedKin] || kinDescriptions.human;
			const traits = kinTraits[selectedKin] || kinTraits.human;
			
			// Update both description and traits boxes immediately
			const descElements = this.element.find('.garysv1-kin-desc-content');
			descElements.html(description);
			
			const traitsElements = this.element.find('.garysv1-kin-traits-content');
			traitsElements.html(traits);
			
			// Apply/remove human creation bonus if in Game Play mode
			if (!this.actor.system.creationMode) {
					if (selectedKin === "human") {
							await this._applyHumanCreationBonus();
					} else {
							await this._removeHumanCreationBonus();
					}
			}
	}

	async _onOriginTypeRadioChanged(event) {
			event.preventDefault();
			event.stopPropagation();
			
			const selectedOriginType = event.currentTarget.value;
			
			// Determine starting coins based on origin type
			let startingCoins = 0;
			switch (selectedOriginType) {
					case 'barbarian':
							startingCoins = 25;
							break;
					case 'civilised':
							startingCoins = 50;
							break;
					case 'decadent':
							startingCoins = 100;
							break;
					default:
							startingCoins = 25; // Default to barbarian amount
			}
			
			console.log(`💰 Updating starting coins for origin type ${selectedOriginType}: ${startingCoins}`);
			
			// Update the actor data including starting coins
			const updateData = {
					"system.originType": selectedOriginType,
					"system.coins.first": startingCoins
			};
			
			await this.actor.update(updateData, { render: false });
			
			// Show/hide the appropriate origin groups
			this.element.find('.garysv1-origin-group').addClass('garysv1-hidden');
			this.element.find(`.garysv1-origin-group[data-origin-type="${selectedOriginType}"]`).removeClass('garysv1-hidden');
			
			// Update origin type button styling
			this._updateOriginTypeButtonStyling();
			
			// Clear any currently selected origin when changing type
			await this.actor.update({ "system.origin": "" }, { render: false });
	}

	async _onOriginRadioChanged(event) {
			event.preventDefault();
			event.stopPropagation();
			
			const selectedOrigin = event.currentTarget.value;
			
			console.log(`🌍 Origin selected: ${selectedOrigin}`);
			
			// Extract origin type from the selected origin (e.g., "decadent-0" -> "decadent")
			const originType = selectedOrigin.split('-')[0];
			
			// Determine starting coins based on origin type
			let startingCoins = 0;
			switch (originType) {
					case 'barbarian':
							startingCoins = 25;
							break;
					case 'civilised':
							startingCoins = 50;
							break;
					case 'decadent':
							startingCoins = 100;
							break;
					default:
							startingCoins = 25; // Default to barbarian amount
			}
			
			console.log(`💰 Setting starting coins for ${originType}: ${startingCoins}`);
			
			// Update both the specific origin and ensure the origin type is maintained
			// Also set starting coins (assuming they go in the first coin slot)
			const updateData = {
					"system.origin": selectedOrigin,
					"system.originType": originType,
					"system.coins.first": startingCoins
			};
			
			await this.actor.update(updateData, { render: false });
			
			console.log(`🌍 Origin saved to actor: ${this.actor.system.origin}`);
			console.log(`🌍 Origin type ensured: ${this.actor.system.originType}`);
			
			// Debug: Check what the actor system looks like after save
			console.log(`🌍 Actor system after save:`, {
					originType: this.actor.system.originType,
					origin: this.actor.system.origin,
					background: this.actor.system.background
			});
			
			// Update origin type button styling to keep it highlighted
			this._updateOriginTypeButtonStyling();
			
			// Re-render the sheet to update the gear button state
			this.render(false);
	}

	_updateOriginTypeButtonStyling() {
			if (!this.element) return;
			
			// Remove all selected classes first
			this.element.find('.garysv1-origin-type-option').removeClass('garysv1-origin-type-selected');
			
			// Add selected class to the currently checked option
			const checkedOption = this.element.find('.garysv1-origin-type-radio:checked');
			if (checkedOption.length > 0) {
					checkedOption.closest('.garysv1-origin-type-option').addClass('garysv1-origin-type-selected');
					console.log(`🎨 Origin type button styling updated for: ${checkedOption.val()}`);
			} else {
					// If no radio is checked but we have an originType, find and check it
					const currentOriginType = this.actor.system.originType;
					if (currentOriginType) {
							const targetRadio = this.element.find(`.garysv1-origin-type-radio[value="${currentOriginType}"]`);
							if (targetRadio.length > 0) {
									targetRadio.prop('checked', true);
									targetRadio.closest('.garysv1-origin-type-option').addClass('garysv1-origin-type-selected');
									console.log(`🎨 Origin type button styling restored for: ${currentOriginType}`);
							}
					}
			}
	}

	async _applyHumanCreationBonus() {
			const attributes = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
			const updateData = {};
			let needsUpdate = false;
			
			attributes.forEach(attr => {
					const currentBonus = this.actor.system.creationBonus?.[attr] || 0;
					if (currentBonus !== 1) {
							updateData[`system.creationBonus.${attr}`] = 1;
							needsUpdate = true;
					}
			});
			
			if (needsUpdate) {
					await this.actor.update(updateData, { render: false });
			}
	}

	async _removeHumanCreationBonus() {
			const attributes = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
			const updateData = {};
			let needsUpdate = false;
			
			attributes.forEach(attr => {
					const currentBonus = this.actor.system.creationBonus?.[attr] || 0;
					if (currentBonus === 1) {
							updateData[`system.creationBonus.${attr}`] = 0;
							needsUpdate = true;
					}
			});
			
			if (needsUpdate) {
					await this.actor.update(updateData, { render: false });
			}
	}

	async _onBackgroundRadioChanged(event) {
			const selectedBackground = event.currentTarget.value;
			
			// Update the actor data
			await this.actor.update({ "system.background": selectedBackground }, { render: false });
			
			// Update the display
			this._updateBackgroundDisplay(selectedBackground);
			
			// Update Game Play mode display as well
			this._updateGamePlayBackgroundDisplay(selectedBackground);
	}

	_updateBackgroundDisplay(selectedBackground) {
			const backgroundData = this._getBackgroundData();
			const description = backgroundData.descriptions[selectedBackground] || backgroundData.descriptions['barbarian'];
			const traits = backgroundData.traits[selectedBackground] || backgroundData.traits['barbarian'];

			// Combine description and traits into single content
			const combinedContent = `${description}<h4>Traits</h4>${traits}`;

			// Update the combined display element
			const contentElements = this.element.find('.garysv1-background-content-all');
			if (contentElements.length > 0) {
					contentElements.html(combinedContent);
			}
	}

	_getBackgroundData() {
			const descriptions = {
					barbarian: `<strong>BARBARIAN - MARTIAL BACKGROUND</strong><p>To the east of the Spine of Tiamat lies the untamed wilderness of Evermore, where the fierce Barbarians roam. Forged by the harsh lands they call home; these warriors embody raw power and unyielding will.</p>`,
					knight: `<strong>KNIGHT ERRANT - MARTIAL BACKGROUND</strong><p>Knight Errant are wandering knights bound by the codes of Chivalry and a thirst for adventure. They travel the land seeking to right wrongs, protect the vulnerable, and prove their worth through heroic deeds.</p>`,
					mage: `<strong>MAGE - ARTE BACKGROUND</strong><p>Mages pursue Forbidden magicks, seeking power through ancient texts and arcane study, balancing wisdom and danger. A fragile truce between mages, priests, and Sandmen has maintained order since The Sovereign Wars reshaped Evermore.</p>`,
					priest: `<strong>PRIEST - ARTE BACKGROUND</strong><p>The gods of Evermore claim divine creation, but the world was dreamt into existence by Gene Nolan, a mortal from Earth. They are not true deities but immortals empowered by the Divinity Virus—an enigmatic substance from the Way Outs.</p><p>Priests unknowingly receive the Virus through divine intermediaries, relics, or rituals. This binds them to their god, granting miracles as rewards or punishments. Their powers stem not from pure divinity, but from a mysterious contagion linking them to their deity.</p>`,
					phenom: `<strong>PHENOM - MARTIAL BACKGROUND</strong><p>Phenoms appear ordinary but hold immense potential, revealing hidden strength or extraordinary abilities when challenged. Often underestimated, they rise to greatness in pivotal moments.</p>`,
					promethean: `<strong>PROMETHEAN - ARTE BACKGROUND</strong><p>Promethean magick is a fusion of wonder and terror, fueled by Aether from the Way Outs. Unlike Earth's science, it mirrors the fantastical inventions of Jules Verne, Frankenstein's Monster, and 1950s sci-fi creations. While their gadgets seem accessible to all, only Prometheans truly comprehend their workings.</p><p>Innovation never stops—new theories and inventions emerge constantly, with major discoveries recorded every five years in The Journal of Esteemed Colleagues</p>`,
					psion: `<strong>PSION - ARTE BACKGROUND</strong><p>Psions are rare individuals with powerful psychic abilities, often linked to the mysterious True Atlanteans or their ancient technologies. They dedicate their lives to mastering their abilities, forming groups called "Cells" to enhance their skills and explore the depths of psionic power. When using their abilities, a third eye appears on their forehead, hinting at their unusual origins.</p>`,
					rogue: `<strong>ROGUE - MARTIAL BACKGROUND</strong><p>Rogues are timeless figures of cunning and adaptability, thriving in the shadows across all realms—including Evermore.</p>`,
					sandman: `<strong>SANDMAN - ARTE BACKGROUND</strong><p>Sandmen are enigmatic individuals who have shattered the barriers between the waking world and the mystical Dreamlands.</p>`
			};

			const traits = {
					barbarian: `<ul><li><strong>Rage:</strong> When you go rage, add a d6 to the damage you deal. The damage you receive while raging is halved. Your rage stops when you roll a 1 on the d6. You need a long rest to be able to go rage again.</li><li><strong>Survivalist:</strong> The barbarian has the survivalist boon for free.</li><li><strong>Languages:</strong> Thyrenian and their barbarian tribal language.</li></ul>`,
					knight: `<ul><li><strong>Arms and Armor:</strong> The Knight Errant starts the game with a suit of plate mail and a long sword. No knight would ever use range weapons.</li><li><strong>Code of Honor:</strong> Grants advantage on social interactions when defending the weak or promoting justice. Furthermore, they have advantage to resist mind influencing effects.</li><li><strong>Horsemanship:</strong> Masters of the saddle, Knight Errant have advantage on rolls to dealings with horses.</li><li><strong>Languages:</strong> Thyrenian and any one civilized or decadent language</li></ul>`,
					mage: `<ul><li><strong>Arcane Knowledge:</strong> Advantage on arcane-related rolls; can create spells and Arcane Tokens.</li><li><strong>Arte: Arcane Magik:</strong> Starts with three spells, gaining more through gameplay.</li><li><strong>Archmage:</strong> At level 20, can craft Arcane Relics and Rites.</li><li><strong>Languages:</strong> Knows Thyrenian, Draconic, and three others.</li></ul>`,
					priest: `<ul><li><strong>Keeper of the Faith:</strong> Perfect knowledge of their god's doctrine; carries a holy symbol without using gear slots.</li><li><strong>Arte: Miracles:</strong> Starts with three miracles, gaining more through gameplay.</li><li><strong>High Priest:</strong> At level 20, can create Divine Relics and Rites.</li><li><strong>Languages:</strong> Knows Thyrenian and either Celestial or Infernal.</li></ul>`,
					phenom: `<ul><li><strong>Expanded Potential:</strong> Starts with an extra boon—two at character creation or three if human.</li><li><strong>Luck:</strong> Can reroll one roll per day, choosing the outcome.</li><li><strong>Languages:</strong> Knows Thyrenian and two others of any origin.</li></ul>`,
					promethean: `<ul><li><strong>Weird Knowledge:</strong> Deep understanding of the Way Outs; advantage on related rolls.</li><li><strong>Weird Science:</strong> Starts with Intelligence score in Invention Points, gaining more weekly through gameplay.</li><li><strong>Esteemed Colleague:</strong> At level 20, can create Astonishing Marvels (Relics) and may join The Journal of Esteemed Colleagues.</li><li><strong>Languages:</strong> Thyrenian, Enochian, and one other.</li></ul>`,
					psion: `<ul><li><strong>Psionics:</strong> They start with three psionic arte and can charge Psionic Crystals.</li><li><strong>Overmind:</strong> At level 20, they gain access to the Akashic Records and can create psionic relics.</li><li><strong>Languages:</strong> They speak Thyrenian, Enochian, and one language based on their origin.</li></ul>`,
					rogue: `<ul><li><strong>Sneak Attack:</strong> Your first attack against an unaware target is an automatic hit that deals damage equal to your Dexterity score.</li><li><strong>Thievery:</strong> Rogues have a wide range of abilities at their disposal including: Lockpicking, Pickpocketing, Stealth, Identifying and disarming mechanical or magical traps, Forgery, Infiltration through disguise or deception. These rolls all have advantage.</li><li><strong>Tools of the Trade:</strong> Rogues have a wide range of tools to help them with their wares. From disguise kits, to lock picks and other simple, small instruments. These tools do not take up Gear Slots.</li><li><strong>Languages:</strong> Thyrenian, Silent Tongue and any one other.</li></ul>`,
					sandman: `<ul><li><strong>Daydreamer:</strong> Sandmen see all things Dream that exists in the Waken World. Furthermore, they detect people, places or things that are of Dream even if it's hidden on a 4in6 roll.</li><li><strong>Dream Mask:</strong> The sandman has a minor dream token called a dream mask. The sandman can summon the mask to his person no matter the circumstances. The mask doesn't take up Gear slots.</li><li><strong>Arte: Somnium:</strong> Sandmen start the game with three Somnium and can gain more either by boons or in game.</li><li><strong>Dream Sovereign:</strong> At 20th level, they gain the title of Dream Sovereign and can now create Dream Relics and Rites. See Arte Section.</li><li><strong>Languages:</strong> Thyrenian and three others of any origin.</li></ul>`
			};

			return { descriptions, traits };
	}

	_updateGamePlayBackgroundDisplay(selectedBackground) {
			const backgroundData = this._getBackgroundData();
			const description = backgroundData.descriptions[selectedBackground] || backgroundData.descriptions['barbarian'];
			const traits = backgroundData.traits[selectedBackground] || backgroundData.traits['barbarian'];

			// Combine description and traits for Game Play mode
			const combinedContent = `${description}<h4>Traits</h4>${traits}`;

			// Update the Game Play mode background display
			const gamePlayElements = this.element.find('.garysv1-background-selected-content');
			if (gamePlayElements.length > 0) {
					gamePlayElements.html(combinedContent);
			}
	}

	async _onHPChanged(event) {
			// Handle HP changes separately to avoid interfering with attribute calculations
			const newValue = parseInt(event.target.value) || 0;
			await this.actor.update({
					'system.currentHitPoints': newValue
			});
	}

	async _onFormFieldChanged(event) {
			// Handle regular form field changes with the standard submit behavior
			const formData = new FormDataExtended(this.form);
			await this._updateObject(event, formData.object);
	}

	async _updateObject(event, formData) {
			console.log('🔧 _updateObject called with formData:', formData);
			console.log('🔧 Event target:', event.target?.name, 'value:', event.target?.value);
			
			// Clean up numeric values to prevent parsing errors
			const cleanedData = foundry.utils.deepClone(formData);
			
			// List of numeric fields that should be integers
			const numericFields = [
					'system.calculated.strength', 'system.calculated.dexterity', 'system.calculated.constitution',
					'system.calculated.intelligence', 'system.calculated.wisdom', 'system.calculated.charisma',
					'system.beginning.strength', 'system.beginning.dexterity', 'system.beginning.constitution',
					'system.beginning.intelligence', 'system.beginning.wisdom', 'system.beginning.charisma',
					'system.creationBonus.strength', 'system.creationBonus.dexterity', 'system.creationBonus.constitution',
					'system.creationBonus.intelligence', 'system.creationBonus.wisdom', 'system.creationBonus.charisma',
					'system.inGameBonus.strength', 'system.inGameBonus.dexterity', 'system.inGameBonus.constitution',
					'system.inGameBonus.intelligence', 'system.inGameBonus.wisdom', 'system.inGameBonus.charisma'
			];

			// Clean numeric values - handle arrays properly
			for (const field of numericFields) {
					const value = foundry.utils.getProperty(cleanedData, field);
					if (value !== undefined && value !== null) {
							let numValue;
							
							// Handle arrays (multiple form inputs with same name)
							if (Array.isArray(value)) {
									console.log(`🔧 Handling array for ${field}:`, value);
									// Take the LAST value from the array (most recent user input)
									const lastValue = value[value.length - 1];
									numValue = parseInt(lastValue) || 0;
							} else {
									// Handle single values
									const cleanValue = String(value).replace(/,/g, '');
									numValue = parseInt(cleanValue) || 0;
							}
							
							// For inGameBonus fields, we need to subtract boon bonuses to get the manual part
							if (field.includes('system.inGameBonus.')) {
									const attribute = field.split('.').pop(); // Extract attribute name
									
									// Calculate boon bonuses on the fly
									let boonBonus = 0;
									const actorBoons = this.actor.items.filter(item => item.type === "boon");
									actorBoons.forEach(boon => {
											if (boon.system?.effects?.attributes?.[attribute]) {
													boonBonus += boon.system.effects.attributes[attribute];
											}
									});
									
									if (boonBonus > 0) {
											const manualBonus = numValue - boonBonus;
											console.log(`🔧 ${field}: Separating manual (${manualBonus}) from boon (${boonBonus}) = total (${numValue})`);
											numValue = Math.max(0, manualBonus); // Ensure not negative
									}
							}
							
							console.log(`🔧 Cleaned ${field}: ${JSON.stringify(value)} → ${numValue}`);
							foundry.utils.setProperty(cleanedData, field, numValue);
					}
			}

			console.log('🔧 Updating actor with cleaned data:', cleanedData);
			
			// Debug any attribute values that look suspicious
			if (cleanedData.system) {
					['calculated', 'beginning', 'creationBonus', 'inGameBonus'].forEach(section => {
							if (cleanedData.system[section]) {
									['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach(attr => {
											const value = cleanedData.system[section][attr];
											if (value && (value > 18 || String(value).length > 2)) {
													console.warn(`🚨 Suspicious ${section}.${attr} value during update:`, value);
											}
									});
							}
					});
			}
			
			return super._updateObject(event, cleanedData);
	}

	async _onModeClicked(event) {
			event.preventDefault();
			const element = event.currentTarget;
			const mode = element.dataset.mode;
			
			const creationMode = mode === "creation";
			await this.actor.update({"system.creationMode": creationMode});
	}

	_onGarysv1TabLabelClicked(event) {
			let element = event.currentTarget;
			event.preventDefault();
			
			if(element.dataset.tab && element.dataset.actor) {
					let actor = this.actor;
					if(actor) {
							this.selectGarysv1Tab(element.dataset.tab, actor);
					}
			}
			return false;
	}

	selectGarysv1Tab(tabName, actor) {
			const characterSheet = this.element[0];
			if(!characterSheet) return;

			// Update tab labels
			const tabLabels = characterSheet.querySelectorAll('.garysv1-tab-label');
			tabLabels.forEach(label => {
					label.classList.remove('garysv1-tab-active');
					if(label.dataset.tab === tabName) {
							label.classList.add('garysv1-tab-active');
					}
			});

			// Update tab panels
			const tabPanels = characterSheet.querySelectorAll('.garysv1-tab-panel');
			tabPanels.forEach(panel => {
					panel.classList.remove('garysv1-tab-active');
					if(panel.dataset.tab === tabName) {
							panel.classList.add('garysv1-tab-active');
					}
			});
	}

	async _onRollAllAttributesClicked(event) {
			console.log("🎲 ROLL ALL CLICKED!", event);
			event.preventDefault();
			const actor = this.actor;
			
			console.log("🎲 Actor:", actor);
			console.log("🎲 Creation Mode:", actor.system.creationMode);
			console.log("Rolling all attributes for character creation (1d6 + 7)");
			
			const attributes = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
			const results = [];
			const updateData = {};
			
			// Roll each attribute with 1d6 + 7 and prepare update data
			for (const attribute of attributes) {
					const roll = new Roll("1d6 + 7");
					await roll.evaluate();
					
					const newValue = parseInt(roll.total);  // Ensure it's an integer
					updateData[`system.beginning.${attribute}`] = newValue;
					updateData[`system.calculated.${attribute}`] = newValue;
					
					results.push({
							attribute: attribute,
							attributeName: game.i18n.localize(`ldoa.attributes.${attribute}.long`),
							roll: roll,
							total: newValue
					});
					
					console.log(`Character creation - ${attribute}: ${newValue}`);
			}
			
			// Update all attributes at once
			console.log(`Roll All: About to update actor with data:`, updateData);
			console.log(`Roll All: Current actor data before update:`, actor.system);
			
			// Double-check that all values are actually numbers
			Object.keys(updateData).forEach(key => {
					const value = updateData[key];
					console.log(`${key}: ${value} (type: ${typeof value})`);
					if (typeof value === 'string' && value.includes(',')) {
							console.error(`🚨 Found comma in value: ${key} = "${value}"`);
					}
			});
			
			await actor.update(updateData);
			
			console.log(`Roll All: Actor data after update:`, actor.system);
			
			// Force refresh the sheet
			this.render(false);
			
			// Create a comprehensive message showing all results
			let content = `<div class="garysv1-roll-all-results">
					<h3>${actor.name} generates all attributes! (Character Creation)</h3>
					<div class="garysv1-results-list">`;
			
			for (const result of results) {
					content += `
							<div class="garysv1-result-row">
									<span class="garysv1-result-attribute">${result.attributeName}:</span>
									<span class="garysv1-result-roll">${result.roll.result}</span>
									<span class="garysv1-result-total">= ${result.total}</span>
							</div>`;
			}
			
			content += `</div></div>`;
			
			console.log("Sending chat message with content:", content);
			
			// Send to chat
			try {
					const chatMessage = await ChatMessage.create({
							speaker: ChatMessage.getSpeaker({actor: actor}),
							content: content,
							style: CONST.CHAT_MESSAGE_STYLES.OTHER
					});
					console.log("Chat message sent successfully:", chatMessage);
			} catch (error) {
					console.error("Error sending chat message:", error);
					console.error("Error details:", error.message, error.stack);
			}
	}

	_showResolutionRollDialog(actor, attribute) {
			const attributeValue = actor.system.calculated[attribute];
			const attributeName = game.i18n.localize(`ldoa.attributes.${attribute}.long`);
			
			const dialogContent = `
					<div class="resolution-roll-dialog">
							<h3>Resolution Roll: ${attributeName}</h3>
							<p>Roll 1d20 vs ${attributeName} (${attributeValue})</p>
							<p><strong>Success:</strong> Roll < ${attributeValue} | <strong>Failure:</strong> Roll ≥ ${attributeValue}</p>
							
							<div class="roll-options">
									<div class="roll-type">
											<label>Roll Type:</label>
											<select id="rollType">
													<option value="normal">Normal</option>
													<option value="advantage">Advantage (2d20, keep lower)</option>
													<option value="disadvantage">Disadvantage (2d20, keep higher)</option>
											</select>
									</div>
									
									<div class="roll-modifier">
											<label for="modifier">Modifier:</label>
											<input type="number" id="modifier" value="0" min="-10" max="10" step="1" 
															title="- no. beneficial, + no. detrimental">
									</div>
							</div>
					</div>
			`;

			new Dialog({
					title: `${attributeName} Resolution Roll`,
					content: dialogContent,
					buttons: {
							roll: {
									icon: '<i class="fas fa-dice-d20"></i>',
									label: "Roll",
									callback: (html) => {
											const rollType = html.find('#rollType').val();
											const modifier = parseInt(html.find('#modifier').val()) || 0;
											this._executeResolutionRoll(actor, attribute, attributeValue, rollType, modifier);
									}
							},
							cancel: {
									icon: '<i class="fas fa-times"></i>',
									label: "Cancel"
							}
					},
					default: "roll"
			}).render(true);
	}

	async _executeResolutionRoll(actor, attribute, attributeValue, rollType, modifier) {
			const attributeName = game.i18n.localize(`ldoa.attributes.${attribute}.long`);
			
			// Determine roll formula based on advantage/disadvantage
			let rollFormula = "1d20";
			let rollTypeText = "";
			
			if (rollType === "advantage") {
					rollFormula = "2d20kl"; // Keep lowest
					rollTypeText = " (Advantage)";
			} else if (rollType === "disadvantage") {
					rollFormula = "2d20kh"; // Keep highest
					rollTypeText = " (Disadvantage)";
			}
			
			// Add modifier if present
			if (modifier !== 0) {
					rollFormula += modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
			}
			
			const roll = new Roll(rollFormula);
			await roll.evaluate();
			
			const rollResult = roll.total;
			const targetValue = attributeValue;
			const success = rollResult < targetValue;
			
			// Create detailed flavor text
			let flavorText = `<strong>${attributeName} Resolution Roll${rollTypeText}</strong><br>`;
			flavorText += `Target: ${targetValue} | Roll: ${rollResult}`;
			if (modifier !== 0) {
					flavorText += ` (${modifier >= 0 ? '+' : ''}${modifier})`;
			}
			flavorText += `<br><span style="color: ${success ? 'green' : 'red'}; font-weight: bold;">`;
			flavorText += success ? 'SUCCESS' : 'FAILURE';
			flavorText += '</span>';
			
			// Send to chat
			await roll.toMessage({
					speaker: ChatMessage.getSpeaker({actor: actor}),
					flavor: flavorText
			});
	}

	_prepareArmorData(context) {
			// Get armor from equipment
			const armorFromEquipment = context.equipment.filter(item => 
					item.system && item.system.armorValue !== undefined && item.system.armorValue > 0
			).map(item => ({
					id: item._id,
					name: item.name,
					armorValue: item.system.armorValue,
					source: "equipment"
			}));

			// Equipment armor goes in the dropdown
			context.availableArmor = [...armorFromEquipment];

			// Calculate total armor value
			let totalArmorValue = 0;
			
			// Add selected equipment armor value
			if (context.actor.system.selectedArmor) {
					const selectedArmor = context.availableArmor.find(armor => armor.id === context.actor.system.selectedArmor);
					if (selectedArmor) {
							totalArmorValue += selectedArmor.armorValue;
					}
			}

			// Add all boon armor bonuses (these are always active and don't go in dropdown)
			context.boons.forEach(boon => {
					if (boon.system && boon.system.effects && boon.system.effects.armorRating > 0) {
							totalArmorValue += boon.system.effects.armorRating;
					}
			});

			context.totalArmorValue = totalArmorValue;
	}

	_calculateLanguageSlots(context) {
			let totalSlots = 1; // Everyone starts with 1 for Thyrenian
			let sources = [];
			let automaticLanguages = [];
			let restrictions = [];
			
			// Base language (everyone gets this)
			sources.push("Thyrenian (Universal)");
			
			// Background bonuses
			const background = context.actor.system.background;
			if (background && CONFIG.configuration.languageBonuses?.backgrounds) {
					const backgroundData = CONFIG.configuration.languageBonuses.backgrounds[background];
					if (backgroundData) {
							// Add slots
							if (backgroundData.slots > 0) {
									totalSlots += backgroundData.slots;
									sources.push(`${background.charAt(0).toUpperCase() + background.slice(1)}: ${backgroundData.description}`);
							}
							
							// Add automatic languages
							if (backgroundData.automatic && backgroundData.automatic.length > 0) {
									automaticLanguages.push(...backgroundData.automatic);
							}
							
							// Store restrictions for later use
							if (backgroundData.restricted && backgroundData.restricted.length > 0) {
									restrictions = backgroundData.restricted;
							}
					}
			}
			
			// Kin bonuses
			const kin = context.actor.system.kin || 'human';
			if (CONFIG.configuration.languageBonuses?.kin) {
					const kinBonus = CONFIG.configuration.languageBonuses.kin[kin] || 0;
					if (kinBonus > 0) {
							totalSlots += kinBonus;
							sources.push(`${kin.charAt(0).toUpperCase() + kin.slice(1)} Kin (+${kinBonus})`);
					}
			}
			
			// Boon bonuses
			let boonBonus = 0;
			if (context.boons && Array.isArray(context.boons)) {
					context.boons.forEach(boon => {
							// Check if boon grants language slots
							if (boon.system && boon.system.effects && boon.system.effects.languages) {
									boonBonus += boon.system.effects.languages;
									sources.push(`${boon.name} (+${boon.system.effects.languages})`);
							}
							// Special boons that grant languages
							if (boon.name && boon.name.toLowerCase().includes('linguist')) {
									boonBonus += 3;
									sources.push(`${boon.name} (+3)`);
							}
							if (boon.name && boon.name.toLowerCase().includes('scholar')) {
									boonBonus += 2;
									sources.push(`${boon.name} (+2)`);
							}
							if (boon.name && boon.name.toLowerCase().includes('traveler')) {
									boonBonus += 1;
									sources.push(`${boon.name} (+1)`);
							}
					});
			}
			totalSlots += boonBonus;
			
			// Calculate currently used slots
			const languages = context.actor.system.languages || [];
			const userLanguages = Array.isArray(languages) ? languages.filter(lang => lang && lang.trim()).length : 0;
			const usedSlots = 1 + userLanguages + automaticLanguages.length; // Thyrenian + user selected + automatic
			
			return {
					total: totalSlots,
					used: usedSlots,
					available: Math.max(0, totalSlots - usedSlots),
					sources: sources,
					isOverLimit: usedSlots > totalSlots,
					automaticLanguages: automaticLanguages,
					restrictions: restrictions,
					userLanguageCount: userLanguages
			};
	}

	_getAvailableLanguages(context) {
			const background = context.actor.system.background;
			const restrictions = context.languageSlots.restrictions;
			const allLanguages = CONFIG.configuration.languagesList || {};
			const languageGroups = CONFIG.configuration.languageGroups || {};
			
			// If no restrictions, return all languages
			if (!restrictions || restrictions.length === 0) {
					return allLanguages;
			}
			
			let availableLanguages = {};
			
			// Handle special restriction cases
			if (restrictions.includes("origin")) {
					// For Phenom and Psion - get languages from their origin background
					const originType = context.actor.system.originType;
					if (originType === "barbarian") {
							// Add barbarian languages
							languageGroups.barbarian?.languages?.forEach(lang => {
									if (allLanguages[lang]) {
											availableLanguages[lang] = allLanguages[lang];
									}
							});
					}
					// Add other origin types as needed
			} else if (restrictions.includes("celestial") || restrictions.includes("infernal")) {
					// For Priest - only Celestial or Infernal
					restrictions.forEach(lang => {
							if (allLanguages[lang]) {
									availableLanguages[lang] = allLanguages[lang];
							}
					});
			} else {
					// Handle group restrictions (barbarian, civilized, decadent, etc.)
					restrictions.forEach(groupName => {
							const group = languageGroups[groupName];
							if (group && group.languages) {
									group.languages.forEach(lang => {
											if (allLanguages[lang]) {
													availableLanguages[lang] = allLanguages[lang];
											}
									});
							}
					});
			}
			
			return availableLanguages;
	}

	async _onLanguageSelectionClicked(event) {
		event.preventDefault();
		
		const context = await this.getData();
		const availableSlots = context.languageSlots?.available || 0;
		
		if (availableSlots <= 0) {
			ui.notifications.info("No language slots available!");
			return;
	}
		
		console.log("🗣️ Opening language dialog with", availableSlots, "available slots");
		
		// Use simple dialog for now to ensure it works
		console.log("🗣️ Using simple dialog approach");
		this._showSimpleLanguageDialog(context, availableSlots);
	}

	async _showSimpleLanguageDialog(context, availableSlots) {
		const availableLanguages = context.availableLanguages || {};
		const automaticLanguages = context.languageSlots?.automaticLanguages || [];
		
		// Create simple HTML content
		let content = `<div style="padding: 10px;">`;
		content += `<p><strong>Select ${availableSlots} language(s):</strong></p>`;
		
		for (let i = 0; i < availableSlots; i++) {
			content += `<div style="margin-bottom: 10px;">`;
			content += `<label>Language ${i + 1}:</label><br>`;
			content += `<select id="lang_${i}" style="width: 100%; margin-top: 5px;">`;
			content += `<option value="">-- Select Language --</option>`;
			
			for (const [key, value] of Object.entries(availableLanguages)) {
				if (automaticLanguages.includes(key)) continue;
				const displayName = game.i18n.localize(value);
				content += `<option value="${key}">${displayName}</option>`;
			}					
			content += `</select>`;
			content += `</div>`;
		}
		
		if (automaticLanguages.length > 0) {
			content += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc;">`;
			content += `<h4>Automatic Languages (already known):</h4>`;
			for (const lang of automaticLanguages) {
				const name = game.i18n.localize(`ldoa.languages.${lang}.name`);
				content += `<span style="background: #3498db; color: white; padding: 2px 6px; border-radius: 10px; margin-right: 5px; font-size: 0.8em;">${name}</span>`;
			}
			content += `</div>`;
		}
		
		content += `</div>`;
		
		// Show dialog
		new Dialog({
			title: "Select Languages",
			content: content,
			buttons: {
				save: {
					icon: '<i class="fas fa-save"></i>',
					label: "Save",
					callback: async (html) => {
						console.log("🗣️ Simple dialog save clicked");
						const selectedLanguages = [];
						for (let i = 0; i < availableSlots; i++) {
							const value = html.find(`#lang_${i}`).val();
							console.log(`🗣️ Simple dialog language slot ${i}: "${value}"`);
							if (value && value.trim()) {
								selectedLanguages.push(value.trim());
							}
						}
						
						console.log("🗣️ Simple dialog selected languages:", selectedLanguages);
						
						// Check for duplicates
						const unique = [...new Set(selectedLanguages)];
						if (unique.length !== selectedLanguages.length) {
							ui.notifications.error("Cannot select the same language multiple times!");
							return;
						}
						
						// Build complete languages array (preserving existing structure)
						const currentLanguages = [...(context.actor.system.languages || [])];
						const automaticLanguages = context.languageSlots?.automaticLanguages || [];
						
						// Clear out the user-selectable slots and add new selections
						let selectionIndex = 0;
						for (let i = 0; i < currentLanguages.length && selectionIndex < selectedLanguages.length; i++) {
							// If this slot is empty or not automatic, we can use it for user selection
							if (!currentLanguages[i] || !automaticLanguages.includes(currentLanguages[i])) {
								currentLanguages[i] = selectedLanguages[selectionIndex];
								selectionIndex++;
							}
						}
						
						// If we still have selections to add, extend the array
						while (selectionIndex < selectedLanguages.length) {
							currentLanguages.push(selectedLanguages[selectionIndex]);
							selectionIndex++;
						}
						
						// Update actor
						console.log("🗣️ Updating actor with complete languages array:", currentLanguages);
						try {
							await this.actor.update({"system.languages": currentLanguages});
							console.log("🗣️ Actor update completed");
							this.render(false);
						} catch (error) {
							console.error("🗣️ Error updating actor:", error);
						}
					}
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: "Cancel"
				}
			},
			default: "save"
		}).render(true);
	}

	async _onLanguageSelectChanged(event) {
		event.preventDefault();
		const select = event.currentTarget;
		const index = parseInt(select.name.split('.').pop());
		const selectedLanguage = select.value;
		
		console.log(`🗣️ Language changed at index ${index}: ${selectedLanguage}`);
		
		// Update the language in the array
		const currentLanguages = [...(this.actor.system.languages || [])];
		currentLanguages[index] = selectedLanguage;
		
		await this.actor.update({
			"system.languages": currentLanguages
		});
		
		// Re-render to show language description
		this.render(false);
	}

	async _onLanguageRemoveClicked(event) {
		event.preventDefault();
		const button = event.currentTarget;
		const index = parseInt(button.dataset.index);
		
		console.log(`🗣️ Removing language at index ${index}`);
		
		// Remove the language from the array
		const currentLanguages = [...(this.actor.system.languages || [])];
		currentLanguages[index] = "";
		
		await this.actor.update({
			"system.languages": currentLanguages
		});
		
		// Re-render to update display
		this.render(false);
	}

	async _onGearSelectionClicked(event) {
		event.preventDefault();
		
		console.log("🎒 Gear selection clicked");
		
		// Check if character has background selected
		if (!this.actor.system.background) {
				ui.notifications.warn("Please select your Persona Background first!");
				return;
		}
		
		// Check if origin is also selected (more complete requirement)
		if (!this.actor.system.origin) {
				ui.notifications.warn("Please finish your character creation first! Select your Origin before choosing gear.");
				return;
		}
		
		console.log(`🎒 Opening gear selection for background: ${this.actor.system.background}, origin: ${this.actor.system.origin}`);
		
		// Open the starting gear selection dialog
		const gearDialog = new StartingGearDialog(this.actor);
		gearDialog.render(true);
	}

	/**
	 * Auto-expand textarea to fit content
	 * @param {HTMLTextAreaElement} textarea - The textarea element to expand
	 */
	_autoExpandTextarea(textarea) {
		if (!textarea) return;
		
		// Reset height to auto to get the correct scrollHeight
		textarea.style.height = 'auto';
		
		// Set the height to the scroll height, with a minimum height
		const minHeight = 24; // Minimum height in pixels
		const maxHeight = 120; // Maximum height in pixels
		const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
		
		textarea.style.height = `${newHeight}px`;
		
		// If content exceeds max height, enable scrolling
		if (textarea.scrollHeight > maxHeight) {
				textarea.style.overflowY = 'auto';
		} else {
				textarea.style.overflowY = 'hidden';
		}
	}

	/**
	 * Prepare armor data for the character sheet
	 */
	_prepareArmorData(context) {
		const armorList = [{
			id: '',
			name: 'None',
			armorValue: 0
		}];

		const armorItems = context.equipment.filter(item => {
			const name = item.name?.toLowerCase() || "";
			return name.includes("light") || name.includes("medium") || name.includes("heavy");
		});

		armorItems.forEach(item => {
			const name = item.name?.toLowerCase() || "";

			let baseValue = 0;
			if (name.includes("light")) baseValue = 1;
			else if (name.includes("medium")) baseValue = 2;
			else if (name.includes("heavy")) baseValue = 3;

			let modifier = 0;
			const match = name.match(/([+-])\s*(\d+)/);
			if (match) {
				const sign = match[1] === '-' ? -1 : 1;
				const number = parseInt(match[2]);
				modifier = sign * number;
			}

			const armorValue = baseValue + modifier;

			armorList.push({
				id: item._id,
				name: item.name,
				armorValue
			});
		});
		
		context.availableArmor = armorList;

		const selectedId = context.actor.system.selectedArmor || '';
		const selectedArmor = armorList.find(a => a.id === selectedId);
		context.totalArmorValue = selectedArmor?.armorValue ?? 0;
	}

	/**
	 * Prepare weapon data for the character sheet
	 */
	_prepareWeaponData(context) {
		const weapons = context.weapons || [];
		const defaultWeapon = { id: '', name: 'None' };
		const meleeList = [defaultWeapon];
		const rangedList = [defaultWeapon];

		weapons.forEach(item => {
			// Add all weapons to both lists - let players choose
			const weaponOption = { id: item._id, name: item.name };
			meleeList.push(weaponOption);
			rangedList.push(weaponOption);
		});

		console.log("🗡️ Weapon preparation debug - Total weapons:", weapons.length);

		// Ensure context has the arrays
		context.availableMeleeWeapons = meleeList || [defaultWeapon];
		context.availableRangedWeapons = rangedList || [defaultWeapon];

		const meleeId = context.actor.system.selectedMeleeWeapon || '';
		const rangedId = context.actor.system.selectedRangedWeapon || '';

		context.selectedMeleeWeapon = meleeList.find(w => w.id === meleeId) || defaultWeapon;
		context.selectedRangedWeapon = rangedList.find(w => w.id === rangedId) || defaultWeapon;
		
		console.log("🗡️ Final weapon context - Melee:", context.availableMeleeWeapons.length, "Ranged:", context.availableRangedWeapons.length);
	}
}