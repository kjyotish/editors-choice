export function getGenerateErrorResponse(error) {
  const message = error instanceof Error ? error.message : 'Failed to generate songs.';

  if (/api key|gemini/i.test(message)) {
    return {
      status: 503,
      error: 'Song generation is temporarily unavailable because the Gemini API key is not configured.',
    };
  }

  return {
    status: 500,
    error: message,
  };
}
