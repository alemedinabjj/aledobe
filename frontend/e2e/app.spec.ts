import { expect, test, type Page } from "@playwright/test"

const unique = () => `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@aledobe.test`

async function signIn(page: Page, email = unique()) {
  await page.goto("/login")
  await page.getByLabel("Name").fill("E2E Designer")
  await page.getByLabel("Email").fill(email)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test("landing page presents the product", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The design tool")
  await expect(page.getByRole("link", { name: /Start designing/ })).toBeVisible()
  await expect(page.locator("canvas").first()).toBeVisible()
})

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login/)
})

test("user creates a project, designs a file and it persists", async ({ page }) => {
  await signIn(page)

  await page.getByRole("button", { name: "New project" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("textbox").fill("E2E Project")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name: "E2E Project" })).toBeVisible()

  await page.getByRole("button", { name: "New design" }).first().click()
  await expect(page).toHaveURL(/\/file\//)
  await expect(page.getByText("Layers", { exact: true })).toBeVisible()

  await page.keyboard.press("r")
  const canvas = page.locator("main canvas").first()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 200, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 380, box.y + 320, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText("Rectangle 1").first()).toBeVisible()
  await expect(page.getByText("Unsaved changes")).toBeVisible()
  await expect(page.getByText("Saved", { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText("Rectangle 1").first()).toBeVisible()

  await page.keyboard.press("Control+a")
  await page.keyboard.press("Delete")
  await expect(page.getByText("Rectangle 1")).toHaveCount(0)
  await page.keyboard.press("Control+z")
  await expect(page.getByText("Rectangle 1").first()).toBeVisible()
})

test("editor playground works without an account", async ({ page }) => {
  await page.goto("/playground")
  await expect(page.getByText("Landing", { exact: true }).first()).toBeVisible()
  await page.getByText("Headline").click()
  await expect(page.getByText("Typography")).toBeVisible()
})
