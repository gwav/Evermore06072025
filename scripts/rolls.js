// rolls.js
export function rollAttribute() {
  return (new Roll("1d8+6")).roll({async: true});
}