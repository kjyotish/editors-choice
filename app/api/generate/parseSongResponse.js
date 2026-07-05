const removeCodeFences = (value) => String(value || '').replace(/```(?:json)?/gi, '').trim();

const extractJsonArrayFromObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const candidateKeys = ['songs', 'results', 'data', 'items'];
  for (const key of candidateKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return null;
};

const findBalancedJsonSegment = (text) => {
  const candidates = ['[', '{'];

  for (const openChar of candidates) {
    const startIndex = text.indexOf(openChar);
    if (startIndex === -1) continue;

    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < text.length; index += 1) {
      const current = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (current === '\\') {
          escaped = true;
          continue;
        }

        if (current === '"') {
          inString = false;
        }

        continue;
      }

      if (current === '"') {
        inString = true;
        continue;
      }

      if (current === openChar) {
        depth += 1;
      } else if (current === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(startIndex, index + 1);
        }
      }
    }
  }

  return '';
};

const repairJsonStringQuotes = (value) => {
  let result = '';
  let inString = false;
  let escaped = false;

  const isDelimiter = (character) => [',', ':', '}', ']'].includes(character);

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if (inString) {
      if (escaped) {
        result += current;
        escaped = false;
        continue;
      }

      if (current === '\\') {
        result += current;
        escaped = true;
        continue;
      }

      if (current === '"') {
        let nextIndex = index + 1;
        while (nextIndex < value.length && /\s/.test(value[nextIndex])) {
          nextIndex += 1;
        }

        if (nextIndex >= value.length || isDelimiter(value[nextIndex])) {
          result += current;
          inString = false;
          continue;
        }

        result += '\\"';
        continue;
      }

      if (current === '\n') {
        result += '\\n';
        continue;
      }

      if (current === '\r') {
        result += '\\r';
        continue;
      }

      if (current === '\t') {
        result += '\\t';
        continue;
      }

      result += current;
      continue;
    }

    if (current === '"') {
      result += current;
      inString = true;
      continue;
    }

    result += current;
  }

  return result;
};

export function parseSongResponse(rawText) {
  const candidates = [];
  const cleaned = removeCodeFences(rawText);

  if (cleaned) {
    candidates.push(cleaned);
  }

  const balanced = findBalancedJsonSegment(cleaned);
  if (balanced) {
    candidates.push(balanced);
  }

  const repaired = repairJsonStringQuotes(cleaned);
  if (repaired) {
    candidates.push(repaired);
    const repairedBalanced = findBalancedJsonSegment(repaired);
    if (repairedBalanced) {
      candidates.push(repairedBalanced);
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed;
      }

      const objectArray = extractJsonArrayFromObject(parsed);
      if (Array.isArray(objectArray)) {
        return objectArray;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error('Failed to parse song response');
}
