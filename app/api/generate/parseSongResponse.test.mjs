import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSongResponse } from './parseSongResponse.js';

test('parses a normal JSON array from the model response', () => {
  const result = parseSongResponse('[{"title":"Song A","viral_para":"Great beat","timestamp":"00:32","tip":"Use a cut"}]');
  assert.deepEqual(result, [{ title: 'Song A', viral_para: 'Great beat', timestamp: '00:32', tip: 'Use a cut' }]);
});

test('extracts JSON from surrounding commentary and code fences', () => {
  const result = parseSongResponse('Here is the result:\n```json\n[{"title":"Song B","viral_para":"Warm intro","timestamp":"00:18","tip":"Match the hook"}]\n```\nThanks!');
  assert.deepEqual(result, [{ title: 'Song B', viral_para: 'Warm intro', timestamp: '00:18', tip: 'Match the hook' }]);
});

test('repairs unescaped quotes inside string values', () => {
  const result = parseSongResponse('[{"title":"Song "A" - Artist","viral_para":"Perfect for edits","timestamp":"00:45","tip":"Use the drop"}]');
  assert.deepEqual(result, [{ title: 'Song "A" - Artist', viral_para: 'Perfect for edits', timestamp: '00:45', tip: 'Use the drop' }]);
});

test('extracts arrays from object-wrapped responses', () => {
  const result = parseSongResponse('{"songs":[{"title":"Song C","viral_para":"Bright hook","timestamp":"01:05","tip":"Cut on the pre-drop"}]}');
  assert.deepEqual(result, [{ title: 'Song C', viral_para: 'Bright hook', timestamp: '01:05', tip: 'Cut on the pre-drop' }]);
});
