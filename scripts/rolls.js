// rolls.js
export function rollAttribute() {
  return (new Roll("1d8+6")).roll({async: true});
}

/**
 * Performs a resolution roll: compares an attribute roll to a d20 roll.
 * @param {number} attributeValue - The value to compare against the d20 roll.
 * @param {"normal"|"advantage"|"disadvantage"} [mode="normal"] - Roll mode.
 * @returns {Promise<{success: boolean, attribute: number, d20: number, mode: string}>}
 */
export async function resolutionRoll(attributeValue, mode = "normal") {
  let d20Roll;
  if (mode === "advantage" || mode === "disadvantage") {
    // Roll 2d20
    d20Roll = new Roll("2d20");
    await d20Roll.roll({async: true});
    const [first, second] = d20Roll.terms[0].results.map(r => r.result);
    let d20;
    if (mode === "advantage") {
      d20 = Math.min(first, second);
    } else {
      d20 = Math.max(first, second);
    }
    d20Roll._total = d20; // Set the displayed total to the selected die
    d20Roll._formula = `${mode} (${first}, ${second}) → ${d20}`;
    d20Roll._evaluated = true;
    d20Roll._result = d20;
  } else {
    d20Roll = new Roll("1d20");
    await d20Roll.roll({async: true});
  }

  const d20Result = mode === "normal"
    ? d20Roll.total
    : d20Roll._result;

  const success = attributeValue > d20Result;

  // Optionally, send to chat
  d20Roll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `Resolution Roll (${mode}): Attribute ${attributeValue} vs d20 (${d20Result})<br><strong>${success ? "Success" : "Failure"}</strong>`
  });

  return {
    success,
    attribute: attributeValue,
    d20: d20Result,
    mode
  };
}