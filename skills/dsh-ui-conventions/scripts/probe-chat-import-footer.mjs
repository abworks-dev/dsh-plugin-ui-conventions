#!/usr/bin/env node
// Offline browser fixture for the installed dsh-chat-import footer contribution.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    client: { type: 'string' },
    react: { type: 'string' },
    'react-dom': { type: 'string' },
    playwright: { type: 'string' },
    chromium: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (args.help) {
  console.log(`Usage: node skills/dsh-ui-conventions/scripts/probe-chat-import-footer.mjs [options]
  --client PATH       Installed plugin lib/client.js (DSH_CHAT_IMPORT_CLIENT)
  --react PATH        React UMD bundle (DSH_PROBE_REACT)
  --react-dom PATH    ReactDOM UMD bundle (DSH_PROBE_REACT_DOM)
  --playwright PATH   Playwright package directory (DSH_PROBE_PLAYWRIGHT)
  --chromium PATH     Browser executable (DSH_PROBE_CHROMIUM), optional
Defaults use the local desktop profile, sibling ConeCode React UMD bundles,
and installed Playwright. The browser uses its cached headless Chromium by default.
If the legacy focus declaration is present, also test a patched copy in memory.`);
  process.exit(0);
}

const env = process.env;
const repos = new URL('../../../../', import.meta.url);
const require = createRequire(import.meta.url);
const client = resolve(args.client ?? env.DSH_CHAT_IMPORT_CLIENT ?? join(
  env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles', 'desktop', 'node_modules',
  'dsh-chat-import', 'lib', 'client.js',
));
const react = args.react ?? env.DSH_PROBE_REACT ?? new URL('ConeCode/node_modules/react/umd/react.production.min.js', repos);
const reactDom = args['react-dom'] ?? env.DSH_PROBE_REACT_DOM ?? new URL('ConeCode/node_modules/react-dom/umd/react-dom.production.min.js', repos);
const playwright = args.playwright ?? env.DSH_PROBE_PLAYWRIGHT;
const executablePath = args.chromium ?? env.DSH_PROBE_CHROMIUM;

function resolvePlaywright() {
  if (playwright) return require.resolve(resolve(playwright));
  try {
    return require.resolve('playwright');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    const fromSibling = createRequire(new URL('dsh-mobile/package.json', repos));
    return fromSibling.resolve('playwright');
  }
}

const playwrightEntry = resolvePlaywright();
const { chromium } = require(playwrightEntry);
const deps = {
  react: react instanceof URL ? fileURLToPath(react) : resolve(react),
  reactDom: reactDom instanceof URL ? fileURLToPath(reactDom) : resolve(reactDom),
  playwright: playwrightEntry,
  chromium: executablePath ?? 'Playwright cached headless Chromium',
};
const focusThemes = {
  canonicalToken: {
    '--dsw-focus-ring-color': '#1463df',
    '--dsw-alias-state-business-primary': '#004ebf',
    '--dsw-alias-brand-primary': '#ac2367',
  },
  canonicalFallback: { '--dsw-alias-state-business-primary': '#004ebf' },
  legacyAlias: { '--dsw-alias-brand-primary': '#ac2367' },
};

const [pluginScript, reactScript, reactDomScript, manifest] = await Promise.all([
  readFile(client, 'utf8'),
  readFile(react, 'utf8'),
  readFile(reactDom, 'utf8'),
  readFile(join(dirname(client), '..', 'package.json'), 'utf8')
    .then(JSON.parse)
    .catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return {};
    }),
]);
const browser = await chromium.launch({ headless: true, executablePath });

async function probe(bundle) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const blockedRequests = [];
  await context.route('**/*', (route) => {
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setContent(`
    <meta http-equiv="Content-Security-Policy" content="connect-src 'none'">
    <style>
      :root {
        --dsw-alias-label-primary: #222;
        --dsw-alias-interactive-bg-hover: #ddd;
      }
      body { font: 14px sans-serif; }
      #lane { display: flex; align-items: center; }
      [data-slot] { display: contents; }
      .peer { box-sizing: border-box; flex: 0 0 auto; margin: 4px 2px; }
    </style>
    <button id="before">Before footer</button>
    <div id="lane"><div data-slot="sidebar.footer.action"></div></div>
  `);
  await page.addScriptTag({ content: reactScript });
  await page.addScriptTag({ content: reactDomScript });
  await page.evaluate(() => {
    window.openedTabs = [];
    window.__ModuleLoader__ = {
      load({ id, factory }) {
        if (id !== 'dsh-chat-import') throw new Error(`Unexpected module: ${id}`);
        const plugin = factory((name) => {
          if (name === 'react') return window.React;
          throw new Error(`Unavailable fixture dependency: ${name}`);
        });
        const services = {
          sidebarRightTabs: { register() {} },
          sidebarRight: { openTab: (type) => window.openedTabs.push(type) },
          configForms: { get: () => ({ getSnapshot: () => ({
            status: 'ready', value: { sidebarButton: true },
          }) }) },
        };
        plugin.apply({
          get: (name) => services[name],
          effect: (setup) => setup(),
          slots: {
            inject(name, setup) {
              if (name === 'sidebar.footer.action') setup();
            },
            register(meta, component) {
              window.footer = { meta, component };
            },
          },
        });
      },
    };
  });
  await page.addScriptTag({ content: bundle });
  const registration = await page.evaluate(() => {
    window.root = window.ReactDOM.createRoot(document.querySelector('[data-slot]'));
    return window.footer?.meta;
  });
  assert.deepEqual(registration, { name: 'sidebar.footer.action', id: 'chat-import', order: 20 });

  const results = [];
  const cases = [
    { name: 'single 127', width: 127, count: 1, icon: true, exercise: true },
    { name: 'single 128', width: 128, count: 1, icon: false, full: true },
    { name: 'double 244', width: 244, count: 2, icon: false },
    { name: 'double 243', width: 243, count: 2, icon: true },
    { name: 'double 244 again', width: 244, count: 2, icon: false },
    { name: 'triple 268', width: 268, count: 3, icon: true },
    { name: 'triple 360', width: 360, count: 3, icon: true },
    { name: 'triple 112 (undersized)', width: 112, count: 3, icon: true, allowOverflow: true },
    { name: 'rail 56', width: 56, count: 1, wide: false, icon: true },
    { name: 'column 180', width: 180, count: 3, direction: 'column', icon: false, full: true },
    { name: 'wrap 180', width: 180, count: 3, wrap: 'wrap', icon: false, full: true, exercise: true },
  ];

  const button = page.locator('[data-slot] button');
  async function tabToButton() {
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const focus = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        active: element === document.activeElement,
        focusVisible: element.matches(':focus-visible'),
        inlineOutline: element.style.outline,
        outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor, outlineOffset: style.outlineOffset,
      };
    });
    assert.ok(focus.active && focus.focusVisible, 'Tab should keyboard-focus the import button');
    return focus;
  }

  async function setFocusTheme(theme) {
    await page.evaluate(({ properties, theme }) => {
      const style = document.documentElement.style;
      for (const name of properties) style.removeProperty(name);
      for (const [name, value] of Object.entries(theme)) style.setProperty(name, value);
    }, { properties: Object.values(focusThemes).flatMap(Object.keys), theme });
  }

  async function exerciseButton() {
    await page.evaluate(() => { window.openedTabs.length = 0; });
    const focus = {};
    for (const [name, theme] of Object.entries(focusThemes)) {
      await setFocusTheme(theme);
      focus[name] = await tabToButton();
    }
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.locator('#before').focus();
    assert.equal(await button.evaluate((element) => element.style.outline), '', 'Blur clears inline outline');
    await button.click();
    const pointerFocusVisible = await button.evaluate((element) => element.matches(':focus-visible'));
    const openedTabs = await page.evaluate(() => window.openedTabs);
    assert.deepEqual(openedTabs, ['chat-import', 'chat-import', 'chat-import']);
    assert.equal(pointerFocusVisible, false);
    await setFocusTheme({});
    return {
      focus, pointerFocusVisible,
      activation: { methods: ['Enter', 'Space', 'click'], openedTabs },
    };
  }

  const interaction = {};
  for (const scenario of cases) {
    const { name, width, count, wide = true, direction = 'row', wrap = 'nowrap', icon, full } = scenario;
    await page.evaluate(({ width, count, wide, direction, wrap, icon }) => {
      const lane = document.querySelector('#lane');
      lane.style.width = `${width}px`;
      lane.style.flexDirection = direction;
      lane.style.flexWrap = wrap;
      const h = window.React.createElement;
      const peers = Array.from({ length: count - 1 }, (_, index) => h('div', {
        className: 'peer', key: index,
        style: { width: icon ? '36px' : '108px', height: icon ? '36px' : '42px' },
      }));
      window.ReactDOM.flushSync(() => window.root.render([
        h(window.footer.component, { wide, key: 'import' }), ...peers,
      ]));
    }, { width, count, wide, direction, wrap, icon });
    // Give the retained component's ResizeObserver and MutationObserver a rendering cycle.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => {
      requestAnimationFrame(() => requestAnimationFrame(done));
    })));
    const metrics = await button.evaluate((element) => {
      const lane = document.querySelector('#lane');
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const svg = element.querySelector('svg');
      return {
        width: box.width, height: box.height,
        laneWidth: lane.clientWidth, overflow: Math.max(0, lane.scrollWidth - lane.clientWidth),
        wrapperWidth: element.parentElement.clientWidth,
        label: element.textContent.trim(), title: element.title,
        ariaLabel: element.getAttribute('aria-label'),
        svgWidth: svg.getBoundingClientRect().width,
        svgHidden: svg.getAttribute('aria-hidden'),
        radius: style.borderTopLeftRadius, margin: style.margin,
        flexGrow: style.flexGrow,
      };
    });
    assert.equal(metrics.laneWidth, width, name);
    assert.equal(metrics.wrapperWidth, 0, name);
    assert.equal(metrics.height, icon ? 36 : 42, name);
    assert.equal(Boolean(metrics.label), !icon, name);
    assert.equal(metrics.svgWidth, icon ? 18 : 16, name);
    assert.equal(metrics.svgHidden, 'true', name);
    assert.equal(metrics.radius, '12px', name);
    assert.equal(metrics.margin, '4px 2px', name);
    assert.ok(metrics.title && metrics.ariaLabel, `${name}: missing accessible text`);
    assert.equal(await page.getByRole('button', { name: metrics.ariaLabel, exact: true }).count(), 1, name);
    if (icon) assert.equal(metrics.width, 36, name);
    if (full) assert.equal(metrics.width, width - 4, name);
    if (!scenario.allowOverflow) assert.equal(metrics.overflow, 0, name);
    if (name === 'double 244') assert.equal(metrics.flexGrow, '0', name);
    results.push({ case: name, ...metrics });
    if (scenario.exercise) interaction[icon ? 'icon' : 'label'] = await exerciseButton();
  }

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(blockedRequests, []);

  await context.close();
  return { registration, results, interaction, blockedRequests };
}

function assertRing(focus, color, label) {
  assert.equal(focus.outlineStyle, 'solid', label);
  assert.equal(focus.outlineWidth, '2px', label);
  assert.equal(focus.outlineColor, color, label);
  assert.equal(focus.outlineOffset, '-2px', label);
}

try {
  const installed = await probe(pluginScript);
  const legacyDeclaration = 'e.currentTarget.style.outline = "2px solid var(--dsw-alias-brand-primary)";';
  const replacement = 'e.currentTarget.style.outline = "2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary)))";';
  const occurrences = pluginScript.split(legacyDeclaration).length - 1;
  let inMemoryPatch = { skipped: `Expected one legacy declaration, found ${occurrences}` };
  if (occurrences === 1) {
    const patched = await probe(pluginScript.replace(legacyDeclaration, replacement));
    assert.deepEqual(patched.registration, installed.registration);
    assert.deepEqual(patched.results, installed.results);
    for (const shape of ['icon', 'label']) {
      const before = installed.interaction[shape].focus;
      const after = patched.interaction[shape].focus;
      assertRing(before.canonicalToken, 'rgb(172, 35, 103)', shape);
      assert.equal(before.canonicalFallback.outlineStyle, 'none', shape);
      assertRing(before.legacyAlias, 'rgb(172, 35, 103)', shape);
      assertRing(after.canonicalToken, 'rgb(20, 99, 223)', shape);
      assertRing(after.canonicalFallback, 'rgb(0, 78, 191)', shape);
      assertRing(after.legacyAlias, 'rgb(172, 35, 103)', shape);
    }
    inMemoryPatch = { sameLayout: true, interaction: patched.interaction, blockedRequests: patched.blockedRequests };
  }
  console.log(JSON.stringify({
    plugin: { name: manifest.name ?? installed.registration.id, version: manifest.version ?? null, client },
    deps, browser: browser.version(), installed, inMemoryPatch,
  }, null, 2));
} finally {
  await browser.close();
}
