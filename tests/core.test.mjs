import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { countWords, duration, Flow } from '../src/metrics.js';
const { atomicWrite, hash, inside, scan, safeName } = createRequire(import.meta.url)('../electron/core.cjs');
test('Turkish Unicode word counting and punctuation', () => {
  assert.equal(countWords("İstanbul'da akış, düşünce ve yazı — 2026."), 6);
  assert.equal(countWords(''), 0); assert.equal(countWords('你好 world'), 2);
});
test('Flow counts writing interval, excludes trailing idle, resets after gap', () => {
  const flow = new Flow(10); flow.stroke(0); flow.stroke(4000); flow.stroke(9000);
  assert.equal(flow.tick(18000), 9); assert.equal(flow.tick(20001), 0);
  assert.equal(flow.best, 9); assert.equal(flow.completed, 9);
  flow.stroke(21000); flow.stroke(24000); assert.equal(flow.finish(), 3); assert.equal(flow.best, 9);
  assert.equal(duration(125), '02:05');
});
test('Atomic UTF-8 saves, project filtering, path traversal and Windows filenames', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'akis-'));
  try {
    const file = path.join(dir, 'yazı.md'); atomicWrite(file, '# İlk düşünce'); atomicWrite(file, 'Yeni yazı');
    assert.equal(fs.readFileSync(file, 'utf8'), 'Yeni yazı');
    assert.equal(fs.readdirSync(dir).length, 1);
    assert.equal(hash('a'), hash('a')); assert.notEqual(hash('a'), hash('b'));
    assert.equal(inside(dir, file), true); assert.equal(inside(dir, dir + '-other/x.md'), false);
    assert.equal(inside(dir, path.join(dir, '..', 'other.md')), false);
    assert.equal(safeName('Bir / düşünce'), 'Bir - düşünce.md');
    assert.throws(() => safeName('CON')); assert.throws(() => safeName('...'));
    fs.writeFileSync(path.join(dir, 'private.txt'), 'x'); fs.mkdirSync(path.join(dir, 'nested')); fs.writeFileSync(path.join(dir, 'nested', 'z.md'), 'x');
    const entries = scan(dir); assert.equal(entries.length, 2); assert.equal(entries[0].children.length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

