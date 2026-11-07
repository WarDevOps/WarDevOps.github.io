// Run: node tests/marker-history.browser.test.js <path-to-playwright/index.mjs>
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const {chromium} = await import(pathToFileURL(process.argv[2]));
const originalEditor = process.argv.includes('--before')
  ? execFileSync('git', ['show', 'HEAD:assets/js/vector-editor.js'], {cwd: root}) : null;
const types = {'.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp'};
const server = createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    const target = path.resolve(root, '.' + name);
    if (!target.startsWith(root)) {res.writeHead(403).end();return;}
    const body = originalEditor && name === '/assets/js/vector-editor.js' ? originalEditor : await readFile(target);
    res.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream'}).end(body);
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({headless: true, channel: 'chrome'});
  const page = await browser.newPage({viewport: {width: 1500, height: 1050}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin + '/?map=38th%20Parallel', {waitUntil: 'networkidle'});
  await page.locator('#map-image').click();
  await page.locator('#modal-toggle-editor').click();
  const tools = page.locator('.modal-marker-tools .vector-editor-tools');
  const undo = tools.locator('[data-vector-action=undo]');
  const redo = tools.locator('[data-vector-action=redo]');
  const key = '38th Parallel::domination-1|Red';
  const stored = () => page.evaluate(key => {
    const layout = JSON.parse(localStorage.getItem('maptactic-marker-layout-v2'));
    return {markers: layout.markers[key] || [], annotations: layout.annotations[key] || [], groups: layout.vectorGroups?.[key] || []};
  }, key);
  const save = () => page.locator('#modal-save-marker-layout').evaluate(button => button.click());
  const remove = async () => {
    const marker = page.locator('#modal-marker-layer .map-marker').first();
    const id = await marker.getAttribute('data-marker-id');
    await marker.dispatchEvent('contextmenu', {clientX: 500, clientY: 300, button: 2});
    await page.locator('#modal-marker-context-menu [data-marker-action=delete]').click();
    assert.ok(!(await stored()).markers.some(marker => marker.id === id));
  };
  await save();
  const initial = await stored();
  assert.ok(initial.markers.length > 2);
  assert.equal(await undo.isDisabled(), true, 'Saving alone must not create history');
  await remove();
  const deletedOnce = await stored();
  assert.equal(await undo.isEnabled(), true, 'Context-menu deletion must be undoable');
  await remove();
  const deletedTwice = await stored();
  await undo.click();assert.deepEqual(await stored(), deletedOnce);
  await undo.click();assert.deepEqual(await stored(), initial);
  assert.equal(await undo.isDisabled(), true);
  await save();
  assert.equal(await redo.isEnabled(), true, 'Saving without changes must preserve redo');
  await redo.click();assert.deepEqual(await stored(), deletedOnce);
  await redo.click();assert.deepEqual(await stored(), deletedTwice);
  assert.equal(await redo.isDisabled(), true);
  await page.locator('#modal-map-stage').focus();
  await page.keyboard.press('Control+z');assert.deepEqual(await stored(), deletedOnce);
  await page.keyboard.press('Control+Shift+z');assert.deepEqual(await stored(), deletedTwice);
  await page.keyboard.press('Control+z');assert.deepEqual(await stored(), deletedOnce);
  await page.keyboard.press('Control+y');assert.deepEqual(await stored(), deletedTwice);
  await undo.click();
  await remove();
  assert.equal(await redo.isDisabled(), true, 'A new deletion must invalidate redo');
  await undo.click();assert.deepEqual(await stored(), deletedOnce);
  await undo.click();assert.deepEqual(await stored(), initial);
  // Mix vector-toolbar deletion with the context-menu history.
  await tools.locator('input[type=checkbox]').uncheck();
  const rect = await page.locator('#modal-marker-layer').boundingBox();
  await page.mouse.move(rect.x + 1, rect.y + 1);await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 1, rect.y + rect.height - 1, {steps: 8});await page.mouse.up();
  const vectorDelete = tools.locator('[data-vector-action=delete]');
  assert.equal(await vectorDelete.isEnabled(), true);
  await vectorDelete.click();
  const vectorDeleted = await stored();
  assert.ok(vectorDeleted.markers.length < initial.markers.length);
  await undo.click();assert.deepEqual(await stored(), initial);
  await redo.click();assert.deepEqual(await stored(), vectorDeleted);
  await undo.click();
  await remove();
  await undo.click();assert.deepEqual(await stored(), initial);
  await redo.click();
  const final = await stored();
  // Ctrl+S must export JSON, not invoke the browser's Save Page command.
  await page.evaluate(() => {window.showSaveFilePicker = undefined;});
  await page.locator('#modal-map-stage').focus();
  const downloading = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const download = await downloading;
  assert.ok(download.suggestedFilename().endsWith('.json'));
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.deepEqual(exported.markers[key].map(marker => marker.id), final.markers.map(marker => marker.id));
  assert.deepEqual(exported.annotations[key], final.annotations);
  // Check cancellation of native shortcuts without triggering native browser UI.
  const dispatch = (key, extra = {}) => page.evaluate(({key, extra}) => {
    const event = new KeyboardEvent('keydown', {key, ctrlKey: true, bubbles: true, cancelable: true, ...extra});
    document.querySelector('#modal-map-stage').dispatchEvent(event);
    return event.defaultPrevented;
  }, {key, extra});
  assert.equal(await dispatch('z'), true);
  assert.equal(await dispatch('Z', {shiftKey: true}), true);
  // Repeated keydown events are cancelled but must not export additional files.
  assert.equal(await dispatch('s', {repeat: true}), true);
  assert.deepEqual(await stored(), final);
  const inputShortcuts = await page.evaluate(() => {
    const input = document.createElement('textarea');
    document.querySelector('#image-modal').append(input);
    const prevented = [false, true].map(shiftKey => {
      const event = new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, shiftKey, bubbles: true, cancelable: true});
      input.dispatchEvent(event);
      return event.defaultPrevented;
    });
    input.remove();return prevented;
  });
  assert.deepEqual(inputShortcuts, [false, false], 'Text inputs must retain native undo/redo');
  assert.deepEqual(await stored(), final);
  await page.locator('#modal-toggle-editor').click();
  for (const [key, extra] of [['z', {}], ['Z', {shiftKey: true}], ['s', {}]]) {
    assert.equal(await dispatch(key, extra), false, 'Shortcuts must not override browsing outside edit mode');
  }
  await page.reload({waitUntil: 'networkidle'});
  assert.deepEqual(await stored(), final, 'The history result must persist on reload');
  // Display controls must work without editing or changing saved map data.
  for (const name of ['Aral Sea', 'Frozen Pass', 'Volokolamsk']) {
    await page.goto(origin + '/?map=' + encodeURIComponent(name), {waitUntil: 'networkidle'});
    await page.locator('#map-image').click();
    const colorToggle = page.locator('#modal-marker-color-toggle');
    const modalTheme = page.locator('#modal-theme-toggle');
    await page.waitForFunction(() => !document.querySelector('#modal-image').hidden);
    assert.equal(await colorToggle.textContent(), 'WHITE ICONS', name + ' starts with black icons');
    const storage = await page.evaluate(() => localStorage.getItem('maptactic-marker-layout-v2'));
    const originalIcons = await page.locator('#modal-marker-layer .map-marker img').evaluateAll(nodes => nodes.map(node => ({src: node.getAttribute('src'), filter: getComputedStyle(node).filter})));
    await colorToggle.click();
    assert.equal(await colorToggle.textContent(), 'BLACK ICONS');
    assert.equal(await page.locator('#modal-marker-layer .is-special-role-marker').count(), 0);
    assert.equal(await page.locator('#modal-annotation-layer .is-special-dark-annotation').count(), 0);
    const whiteIcons = await page.locator('#modal-marker-layer .map-marker img').evaluateAll(nodes => nodes.map(node => ({src: node.getAttribute('src'), filter: getComputedStyle(node).filter})));
    if (originalIcons.length) assert.notDeepEqual(whiteIcons, originalIcons);
    await modalTheme.click();
    assert.equal(await page.locator('body').evaluate(node => node.classList.contains('light-theme')), true);
    assert.equal(await modalTheme.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(await colorToggle.textContent(), 'BLACK ICONS', 'Theme does not reset icon preference');
    await modalTheme.click();
    assert.equal(await modalTheme.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'), 'false');
    await colorToggle.click();
    assert.deepEqual(await page.locator('#modal-marker-layer .map-marker img').evaluateAll(nodes => nodes.map(node => ({src: node.getAttribute('src'), filter: getComputedStyle(node).filter}))), originalIcons);
    assert.equal(await page.evaluate(() => localStorage.getItem('maptactic-marker-layout-v2')), storage);
    await colorToggle.click();
    await page.locator('.close-modal').click();
    await page.locator('#map-image').click();
    assert.equal(await colorToggle.textContent(), 'BLACK ICONS', 'Reopening preserves the choice');
    await page.locator('.close-modal').click();
    await page.locator('[data-language=ko]').click();
    await page.locator('#map-image').click();
    assert.equal(await colorToggle.textContent(), '아이콘 검정으로');
    await page.setViewportSize({width: 375, height: 812});
    for (const id of ['modal-theme-toggle', 'modal-marker-color-toggle']) {
      const box = await page.locator('#' + id).boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 375, id + ' must fit on mobile');
    }
    await page.setViewportSize({width: 1500, height: 1050});
  }
  assert.deepEqual(errors, []);
  console.log('PASS: marker deletion history, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, Ctrl+S JSON export, native shortcut cancellation, input and edit-mode boundaries, and reload persistence');
  console.log('PASS: modal theme synchronization, black/white icon toggles on Aral Sea/Frozen Pass/Volokolamsk, unchanged layout data, localization, and mobile controls');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
