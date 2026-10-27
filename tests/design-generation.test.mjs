import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The provider is mocked. These tests never read a real key or contact a model.
function fixture({ key = 'test-key', output, failure } = {}) {
  const cache = new Map();
  const calls = [];
  const env = { ANTHROPIC_API_KEY: key };
  const sdk = {
    jsonSchema: (schema, options) => ({ schema, ...options }),
    Output: { object: options => options },
    APICallError: { isInstance: error => typeof error?.statusCode === 'number' },
    generateText: async options => { calls.push(options); if (failure) throw failure; return { output }; },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, Request, Response, AbortSignal, URL, process: { env },
      require: name => name === 'ai' ? sdk : name === '@ai-sdk/anthropic' ? { anthropic: name => name } : load(name.endsWith('design-generation') ? 'lib/design-generation.ts' : 'lib/design-system.ts'),
    });
    cache.set(file, module.exports);
    return module.exports;
  }
  const design = load('lib/design-system.ts');
  const route = load('app/api/design/route.ts');
  const body = { prompt: 'A vivid pink, editorial system for a creative studio', system: structuredClone(design.initialSystem), vibes: structuredClone(design.initialVibes), locks: { color: false, typography: false, shape: false, motion: false } };
  const request = (value = body, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/design', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  return { route, design, body, request, calls, load };
}

test('configuration check reports availability without invoking AI or revealing a key', async () => {
  const f = fixture();
  const response = await f.route.GET();
  assert.deepEqual(await response.json(), { configured: true });
  assert.equal(f.calls.length, 0);
});
test('missing key, bad inputs, cross-origin, and fully locked systems never invoke AI', async () => {
  const missing = fixture({ key: '' });
  assert.equal((await missing.route.POST(missing.request())).status, 503);
  assert.equal(missing.calls.length, 0);
  const f = fixture();
  assert.equal((await f.route.POST(f.request(f.body, 'https://other.example'))).status, 403);
  assert.equal((await f.route.POST(f.request({ ...f.body, prompt: '' }))).status, 400);
  assert.equal((await f.route.POST(f.request({ ...f.body, prompt: 'x'.repeat(4001) }))).status, 400);
  assert.equal((await f.route.POST(f.request({ ...f.body, system: { ...f.body.system, displayFont: 'Unsupported Font' } }))).status, 400);
  assert.equal((await f.route.POST(f.request({ ...f.body, locks: { color: true, typography: true, shape: true, motion: true } }))).status, 400);
  assert.equal(f.calls.length, 0);
});
test('a supported direction is returned and locked tokens are preserved', async () => {
  const seed = fixture();
  const candidate = structuredClone(seed.body.system);
  candidate.name = 'Creative pink'; candidate.radius = 28; candidate.colors.primary = '#A10083';
  const f = fixture({ output: { system: candidate, vibes: seed.body.vibes } });
  f.body.locks.color = true;
  const response = await f.route.POST(f.request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.system.colors.primary, f.body.system.colors.primary);
  assert.equal(result.system.radius, 28);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].maxRetries, 0);
  assert.equal(JSON.parse(f.calls[0].prompt).brief, f.body.prompt);
});
test('unsupported output and provider failures do not replace the current design', async () => {
  const invalid = fixture({ output: { system: {}, vibes: {} } });
  assert.equal((await invalid.route.POST(invalid.request())).status, 502);
  const limited = fixture({ failure: { statusCode: 429, secret: 'not-for-client' } });
  const response = await limited.route.POST(limited.request());
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes('not-for-client'));
  assert.equal(limited.calls.length, 1);
});
test('schema validation rejects unsupported fonts, ranges, and invalid vibe values', () => {
  const f = fixture();
  const { directionSchema } = f.load('lib/design-generation.ts');
  assert.equal(directionSchema.validate({ system: f.body.system, vibes: f.body.vibes }).success, true);
  assert.equal(directionSchema.validate({ system: { ...f.body.system, radius: 100 }, vibes: f.body.vibes }).success, false);
  assert.equal(directionSchema.validate({ system: f.body.system, vibes: { ...f.body.vibes, warmth: Infinity } }).success, false);
});

test('search returns changes to every component token category with the current studio context', async () => {
  const seed = fixture();
  const candidate = {
    ...seed.body.system,
    name: 'Electric editorial',
    colors: { ...seed.body.system.colors, primary: '#7020A0', background: '#FAF5FF' },
    displayFont: 'Geist', bodyFont: 'Geist Mono', typeScale: 1.4, tracking: -0.01,
    radius: 24, border: 2, spacing: 32, depth: 'offset',
    duration: 400, easing: 'spring', hoverScale: 1.06,
  };
  const vibes = { ...seed.body.vibes, playfulness: 90 };
  const f = fixture({ output: { system: candidate, vibes } });
  const response = await f.route.POST(f.request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { system: candidate, vibes });
  const context = JSON.parse(f.calls[0].prompt);
  assert.deepEqual(context.currentSystem, f.body.system);
  assert.deepEqual(context.vibeSliders, f.body.vibes);
  assert.deepEqual(context.lockedCategories, f.body.locks);
});

test('insufficient credits produces an actionable message without exposing provider details', async () => {
  const f = fixture({ failure: { statusCode: 400, message: 'Your credit balance is too low to access the API. secret-test-value' } });
  const response = await f.route.POST(f.request());
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.match(body.error, /credit balance is too low/);
  assert.ok(!body.error.includes('secret-test-value'));
  assert.equal(f.calls.length, 1);
});
