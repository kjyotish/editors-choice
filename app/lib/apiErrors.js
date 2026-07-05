export function getApiErrorResponse(error, fallbackMessage = 'Request failed.') {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (/supabase|credentials|missing/i.test(message)) {
    return {
      status: 503,
      error: 'The data service is not configured yet. Please try again later.',
    };
  }

  return {
    status: 500,
    error: message,
  };
}
