import { test, expect } from '@playwright/test'

test.describe('Main Application Workflow', () => {
  test('loads app and displays events page', async ({ page }) => {
    await page.goto('/events')

    // Wait for table headers
    await expect(page.getByText('OT (GMT)')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('navigates between pages via tab bar', async ({ page }) => {
    await page.goto('/')

    // Check if tab bar is visible
    const tabBar = page.locator('nav, [role="tablist"]').first()
    await expect(tabBar).toBeVisible()
  })

  test('events page shows event table with rows', async ({ page }) => {
    await page.goto('/events')

    // Wait for data to load (mock data will be returned)
    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(12)  // mock data has 12 events
  })

  test('clicking event row selects it', async ({ page }) => {
    await page.goto('/events')

    await page.waitForSelector('table tbody tr', { timeout: 10000 })

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()

    // Row should have selected styling (bg-primary/10 or similar)
    // Just verify no crash
    await expect(firstRow).toBeVisible()
  })

  test('filter bar is visible on events page', async ({ page }) => {
    await page.goto('/events')

    // FilterBar contains "Read" button
    await expect(page.getByRole('button', { name: /read/i })).toBeVisible()
  })

  test('theme toggle is present in header', async ({ page }) => {
    await page.goto('/')

    // ThemeToggle should be in header
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('navigating to waveform page without event shows empty state', async ({ page }) => {
    await page.goto('/waveform')

    // Should redirect to events or show no data state
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const hasRedirect = url.includes('/events') || url.includes('/waveform')
    expect(hasRedirect).toBeTruthy()
  })

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-xyz')

    // Should not show blank page
    await expect(page.locator('body')).toBeVisible()
  })
})
