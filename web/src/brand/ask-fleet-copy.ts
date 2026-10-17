/** The sentences a person reads for the Fleet conversation. */

export const ASK_FLEET = 'Ask Fleet'
export const ASK_FLEET_PLACEHOLDER = 'Ask Fleet anything…'
export const ASK_FLEET_BOUND_HINT = 'Ask Fleet about this task: type what you need, or send with nothing typed to use its title.'
export const ASK_FLEET_BOUND_CARD = 'Hand this task to Fleet: plan it, research it, or organize it.'
export const ASK_FLEET_UNBOUND_CARD = 'Search tasks, find notes, schedule your day, quick questions, etc.'
export const TELL_ASK_FLEET = 'Tell Ask Fleet'

/** A named agent keeps its own name. With no name, the conversation is Ask Fleet. */
export function askLabel(name: string | undefined): string {
  return name ? `Ask ${name}` : ASK_FLEET
}
