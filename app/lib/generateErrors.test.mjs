import test from 'node:test';
import assert from 'node:assert/strict';
import { getGenerateErrorResponse } from './generateErrors.js';

test('returns a service-unavailable response for missing API key errors', () => {
  const response = getGenerateErrorResponse(new Error('API Key not configured'));

  assert.equal(response.status, 503);
  assert.match(response.error, /Gemini API key/i);
});

test('returns a server-error response for unexpected failures', () => {
  const response = getGenerateErrorResponse(new Error('Unexpected failure'));

  assert.equal(response.status, 500);
  assert.equal(response.error, 'Unexpected failure');
});
