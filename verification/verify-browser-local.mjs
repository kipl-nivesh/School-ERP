import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const port = process.env.BRIGHTCAMP_BROWSER_PORT ?? '3008';
assert.match(port, /^[0-9]{1,5}$/);
const origin = new URL('http://127.0.0.1:' + port).origin;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    return route.abort();
  });
  for (const role of ['student', 'parent']) {
    await page.goto(origin + '/portal/' + role);
    assert.equal(new URL(page.url()).pathname, '/login/' + role);
  }
  await page.goto(origin + '/staff/admin');
  assert.equal(new URL(page.url()).pathname, '/login/staff');
  for (const role of ['admin', 'student', 'parent', 'teacher', 'accountant']) {
    const response = await page.goto(origin + '/' + role + '/dashboard');
    assert.equal(response?.status(), 200);
    assert.equal(new URL(page.url()).pathname, '/' + role + '/dashboard');
  }
  await page.goto(origin + '/invite#token=' + 'a'.repeat(64));
  await page.waitForURL(origin + '/invite');
  assert.equal(await page.locator('input[name=token]').inputValue(), 'a'.repeat(64));
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await page.getByRole('status').filter({ hasText: 'Unable to accept invitation.' }).waitFor();
  console.log('PASS: protected portal redirects, public previews and disabled invitation boundary');
} finally {
  await browser.close();
}
