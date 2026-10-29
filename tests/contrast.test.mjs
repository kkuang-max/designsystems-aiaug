import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/design-system.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: loaded, exports: loaded.exports });
const { initialSystem, contrast, contrastPairs, fixContrastRole } = loaded.exports;
const passes = pair => contrast(pair.foreground, pair.background) >= pair.target;

function fixInOrder(original, reverse = false) {
  let colors = { ...original };
  const pairs = contrastPairs(colors);
  if (reverse) pairs.reverse();
  for (const pair of pairs) {
    const before = contrastPairs(colors);
    if (passes(before.find(p => p.name === pair.name))) continue;
    colors = fixContrastRole(colors, pair.role);
    const after = contrastPairs(colors);
    assert.ok(after.filter(p => p.role === pair.role).every(passes), `${pair.name} must fix all uses of its token`);
    for (const prior of before.filter(passes)) {
      assert.ok(passes(after.find(p => p.name === prior.name)), `${pair.name} broke ${prior.name}`);
    }
  }
  assert.ok(contrastPairs(colors).every(passes), 'Every checked pair must pass after one sweep');
  return colors;
}

test('shared text fixes converge for opposing and similar surfaces in either order', () => {
  for (const [background, surface] of [['#ffffff', '#000000'], ['#ffffff', '#888888'], ['#121212', '#ffffff'], ['#aaaaaa', '#eeeeee']]) {
    const colors = { ...initialSystem.colors, background, surface, text: '#888888', muted: '#888888' };
    fixInOrder(colors);
    fixInOrder(colors, true);
  }
});

test('primary fixes recompute automatic button ink and preserve link contrast', () => {
  // These midtones fall in the gap where both white and #181818 fail AA.
  for (const primary of ['#777777', '#7c7c7c', '#808080']) {
    const colors = { ...initialSystem.colors, primary };
    fixInOrder(colors);
    fixInOrder(colors, true);
  }
});

test('fixes preserve unrelated tokens and leave already passing roles unchanged', () => {
  const colors = { ...initialSystem.colors, muted: initialSystem.colors.background };
  const fixed = fixContrastRole(colors, 'muted');
  for (const role of Object.keys(colors).filter(role => role !== 'muted')) assert.equal(fixed[role], colors[role]);
  assert.equal(JSON.stringify(fixContrastRole(fixed, 'muted')), JSON.stringify(fixed));
});

test('varied palettes finish without regressing any passing checks', () => {
  let seed = 42;
  const color = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return `#${(seed & 0xffffff).toString(16).padStart(6, '0')}`;
  };
  for (let index = 0; index < 150; index++) {
    const colors = Object.fromEntries(Object.keys(initialSystem.colors).map(role => [role, color()]));
    fixInOrder(colors, index % 2 === 0);
  }
});
