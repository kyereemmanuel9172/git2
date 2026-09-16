import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('should have demo account buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/demo accounts/i)).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@church.org');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
  });

  test('should navigate to dashboard', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should have sidebar navigation', async ({ page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /attendance/i })).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@church.org');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
  });

  test('should display KPI cards', async ({ page }) => {
    await expect(page.getByText(/total members/i)).toBeVisible();
    await expect(page.getByText(/attendance/i)).toBeVisible();
  });

  test('should display charts section', async ({ page }) => {
    await expect(page.getByText(/attendance trend/i)).toBeVisible();
  });
});
