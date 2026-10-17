/**
 * Ticket #4. The sentences a person reads say Ask Fleet.
 * The other card, the repair chip and the send title stay as they are.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createElement } from '../../web/node_modules/react/index.js'
import { renderToStaticMarkup } from '../../web/node_modules/react-dom/server.node.js'
import {
  ASK_FLEET,
  ASK_FLEET_BOUND_CARD,
  ASK_FLEET_BOUND_HINT,
  ASK_FLEET_PLACEHOLDER,
  ASK_FLEET_UNBOUND_CARD,
  TELL_ASK_FLEET,
  askLabel,
} from '@/brand/ask-fleet-copy'

const root = new URL('../../', import.meta.url)
function text(path: string): string {
  return readFileSync(new URL(path, root), 'utf8')
}

describe('Ask Fleet sentences', () => {
  it('names the conversation Ask Fleet, including a named agent', () => {
    expect(ASK_FLEET).toBe('Ask Fleet')
    expect(askLabel(undefined)).toBe('Ask Fleet')
    expect(askLabel('Mentor')).toBe('Ask Mentor')
    const html = renderToStaticMarkup(createElement('span', null, ASK_FLEET))
    expect(html).toBe('<span>Ask Fleet</span>')
  })

  it('uses the approved card, composer and settings sentences', () => {
    expect(ASK_FLEET_PLACEHOLDER).toBe('Ask Fleet anything…')
    expect(ASK_FLEET_BOUND_HINT).toBe('Ask Fleet about this task: type what you need, or send with nothing typed to use its title.')
    expect(ASK_FLEET_BOUND_CARD).toBe('Hand this task to Fleet: plan it, research it, or organize it.')
    expect(ASK_FLEET_UNBOUND_CARD).toBe('Search tasks, find notes, schedule your day, quick questions, etc.')
    expect(TELL_ASK_FLEET).toBe('Tell Ask Fleet')
  })

  it('puts those sentences on the sidebar, the dock, the draft and settings', () => {
    const sidebar = text('web/src/components/layout/Sidebar.tsx')
    expect(sidebar).toContain('aria-label="Ask Fleet"')
    expect(sidebar).toContain("title={collapsed ? 'Ask Fleet' : undefined}")
    expect(sidebar).toContain('<span className="sidebar-label">Ask Fleet</span>')
    expect(sidebar).not.toContain('Ask Walnut')

    const dock = text('web/src/components/dock/FocusDock.tsx')
    expect(dock).toContain('title="Ask Fleet"')
    expect(dock).toContain('aria-label="Ask Fleet"')

    const draft = text('web/src/components/sessions/DraftSessionPanel.tsx')
    expect(draft).toContain('ASK_FLEET')
    expect(draft).toContain('ASK_FLEET_PLACEHOLDER')
    expect(draft).toContain('ASK_FLEET_BOUND_HINT')
    expect(draft).toContain('ASK_FLEET_BOUND_CARD')
    expect(draft).toContain('ASK_FLEET_UNBOUND_CARD')
    expect(draft).toContain('askLabel')
    expect(draft).not.toContain('Ask Walnut anything')
    expect(draft).not.toContain('Hand this task to Walnut')
    expect(draft).toContain('Start Task')
    expect(draft).toContain('A coding session with Claude Code, Codex, OpenCode, etc.')
    expect(draft).toContain('Customize Walnut')
    expect(draft).toContain('Ask Walnut about this task (an empty message sends the task title)')

    const tasks = text('web/src/components/settings/sections/TasksSection.tsx')
    expect(tasks).toContain('TELL_ASK_FLEET')
    expect(tasks).not.toContain('Tell Ask Walnut')

    const registry = text('web/src/components/settings/core-settings-registry.tsx')
    expect(registry).toContain("rowLabel: TELL_ASK_FLEET")
    expect(registry).not.toContain('Tell Ask Walnut')

    const cloud = text('web/src/components/settings/sections/CloudSection.tsx')
    expect(cloud).toContain('You can also tell Ask Fleet: &ldquo;set up my cloud companion&rdquo;.')
    expect(cloud).not.toContain('Ask Walnut')
  })
})
