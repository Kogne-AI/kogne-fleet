/**
 * Milestone fleet-brand 1, desktop 1440×900.
 * The recording is the acceptance walk: header, Ask Fleet draft, settings
 * sentences, then the dark header. Frames stay outside test-results, which
 * the runner deletes.
 *
 * Run: PW_TEST_PORT=35994 PW_IGNORE_LOAD=1 npx playwright test tests/e2e/browser/fleet-brand-walk.spec.ts --project=chromium --workers=1
 */
import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { openChatOnLoad, openDraft } from './draft-helpers'

const VIDEO_DIR = path.resolve('.kogne/runtime/fleet-brand-video')
const SHOTS = path.resolve('.kogne/runtime/fleet-brand-shots')

test.setTimeout(180_000)

async function beat(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
  await page.waitForTimeout(700)
}

test('a person sees Fleet, Ask Fleet, and the dark header', async ({ browser, baseURL }) => {
  fs.mkdirSync(VIDEO_DIR, { recursive: true })
  fs.mkdirSync(SHOTS, { recursive: true })
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  await openChatOnLoad(page)
  await page.goto('/')

  const header = page.locator('.sidebar-header')
  const expand = page.getByRole('button', { name: 'Expand sidebar' })
  await expect(expand.or(page.getByRole('button', { name: 'Collapse sidebar' }))).toBeVisible({ timeout: 30_000 })
  if (await expand.isVisible()) await expand.click()
  await expect(header.locator('.fleet-mark-light')).toBeVisible()
  await expect(header.locator('.fleet-mark-dark')).toBeHidden()
  await beat(page, '01-light-header')

  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(header.locator('.sidebar-fleet-logo')).toHaveCount(0)
  await beat(page, '02-collapsed')
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(header.locator('.fleet-mark-light')).toBeVisible()

  await expect(page.locator('#primary-sidebar').getByRole('button', { name: 'Ask Fleet' })).toBeVisible()

  const panel = await openDraft(page)
  await expect(panel.getByText('Start Task', { exact: true })).toBeVisible()
  await expect(panel.getByText('A coding session with Claude Code, Codex, OpenCode, etc.')).toBeVisible()
  await expect(panel.getByText('Ask Fleet', { exact: true })).toBeVisible()
  await expect(panel.getByText('Search tasks, find notes, schedule your day, quick questions, etc.')).toBeVisible()
  await beat(page, '03-draft-cards')
  await panel.getByRole('button', { name: /Ask Fleet/ }).click()
  await expect(panel.getByPlaceholder('Ask Fleet anything…')).toBeVisible()
  await beat(page, '04-ask-fleet-placeholder')

  const created = await page.request.post('/api/tasks', {
    data: { title: 'Brand hint task', source: 'local', project: '' },
  })
  expect(created.ok()).toBe(true)
  const taskId = ((await created.json()) as { task: { id: string } }).task.id
  const row = page.locator(`#home-task-navigation [data-task-id="${taskId}"]`).first()
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.hover()
  await row.locator('.task-start-btn').click()
  const bound = page.locator('.draft-session-panel').filter({ has: page.locator('.draft-bound-task') })
  await bound.getByRole('button', { name: /Ask Fleet/ }).click()
  await expect(bound.locator('.draft-quick-hint')).toHaveText(
    'Ask Fleet about this task: type what you need, or send with nothing typed to use its title.',
  )
  await beat(page, '04b-bound-hint')

  await page.getByTestId('sidebar-core-app-settings').click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('settings-filter').fill('Tell Ask Fleet')
  await page.getByTestId('settings-nav-tasks').click()
  await expect(page.getByText('Tell Ask Fleet', { exact: true })).toBeVisible()
  await beat(page, '05-tell-ask-fleet')
  await page.getByTestId('settings-filter').fill('')
  await page.getByTestId('settings-nav-devices').click()
  const cloud = page.getByText('You can also tell Ask Fleet: “set up my cloud companion”.')
  await cloud.scrollIntoViewIfNeeded()
  await expect(cloud).toBeVisible()
  await beat(page, '06-cloud-sentence')
  const selected = page.getByTestId('settings-nav-devices')
  await expect.poll(async () => selected.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(97, 92, 84)')

  await page.getByTestId('settings-nav-general').click()
  await page.locator('#settings-focus-bar').click()
  await page.getByTestId('settings-theme-dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByTestId('sidebar-core-app-home').click()
  await expect(page).toHaveURL(/\/$/)
  const dock = page.locator('.dock-chat-item').locator('visible=true').first()
  await expect(dock).toHaveAttribute('aria-label', 'Ask Fleet')
  await expect(dock.locator('.dock-chat-label')).toHaveText('Fleet')
  await expect(header.locator('.fleet-mark-dark')).toBeVisible()
  await expect(header.locator('.fleet-mark-light')).toBeHidden()
  await expect.poll(async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 16, 12)')
  await beat(page, '07-dark-header')

  const video = page.video()
  await context.close()
  const saved = await video?.path()
  expect(saved, 'recorded video').toBeTruthy()
  fs.copyFileSync(saved!, path.join(VIDEO_DIR, 'fleet-brand-console.webm'))
})
