// Simple syntax test for the character sheet
try {
  // Try to parse the character sheet file
  const fs = require('fs');
  const content = fs.readFileSync('./modules/sheets/garysv1-character-sheet.js', 'utf8');
  
  // Simple syntax check - look for common issues
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  console.log('Brace count check:');
  console.log('Open braces:', openBraces);
  console.log('Close braces:', closeBraces);
  
  if (openBraces === closeBraces) {
    console.log('✅ Brace count matches');
  } else {
    console.log('❌ Brace count mismatch');
  }
  
} catch (error) {
  console.error('Syntax test error:', error.message);
}