// Resolve a hidden opponent attack against the player's declared defence.
// The opponent may have several legal choices, but only its sampled choice
// can deal damage. A defence against a different possible choice is a miss.
export function chooseOpponentAttack(choices, random = Math.random) {
  if (!Array.isArray(choices) || choices.length === 0 || choices.some(c => typeof c !== 'string' || !c)) throw new TypeError('Attack choices must be non-empty names');
  const index = Math.min(choices.length - 1, Math.floor(Math.max(0, Math.min(.999999999, random())) * choices.length));
  return {choices: [...choices], selected: choices[index]};
}

export function resolveOpponentAttack(attack, defence) {
  if (!attack || !Array.isArray(attack.choices) || typeof attack.selected !== 'string' || !attack.choices.includes(attack.selected)) throw new TypeError('Invalid opponent attack');
  if (defence !== null && defence !== undefined && (typeof defence !== 'string' || !attack.choices.includes(defence))) throw new TypeError('Invalid defence choice');
  const blocked = defence === attack.selected;
  return {blocked, hit: !blocked, damage: blocked ? 0 : 1, selected: attack.selected, defence: defence ?? null, possible: [...attack.choices]};
}
