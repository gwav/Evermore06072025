// CONSOLE COMMAND: List all characters
// Copy and paste this into your browser console (F12)

console.log("🎭 AVAILABLE CHARACTERS:");
console.log("========================");

const characters = game.actors.filter(a => a.type === "character");

if (characters.length === 0) {
    console.log("❌ No characters found in the world!");
    console.log("💡 You may need to create a character first.");
} else {
    characters.forEach((character, index) => {
        console.log(`${index + 1}. Name: "${character.name}"`);
        console.log(`   ID: "${character.id}"`);
        console.log(`   Items: ${character.items.size}`);
        console.log(`   ---`);
    });
    
    console.log(`\n✅ Found ${characters.length} character(s)`);
    console.log(`💡 Use any of the IDs above to add a test item`);
}

// Also check all actors
console.log("\n🎭 ALL ACTORS (any type):");
game.actors.forEach((actor, index) => {
    console.log(`${index + 1}. "${actor.name}" (Type: ${actor.type}, ID: ${actor.id})`);
});