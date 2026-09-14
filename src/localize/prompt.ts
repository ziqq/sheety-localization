import type {
  LocalizationRequest,
  LocalizeRow,
} from '../localize/models.js';

function uniqueLanguages(languages: string[]): string[] {
  return [...new Set(languages.map((language) => language.trim()).filter(Boolean))];
}

function describeLanguage(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return `${code}: ${displayNames.of(code.replace(/_/g, '-')) ?? code}`;
  } catch {
    return code;
  }
}

/**
 * Build a provider-neutral prompt and strict JSON Schema whose locale properties
 * exactly match the requested target language batch.
 */
export function buildLocalizationRequest(
  row: LocalizeRow,
  requestedLanguages: string[],
): LocalizationRequest {
  const languages = uniqueLanguages(requestedLanguages);
  if (!row.label || !row.source.trim()) {
    throw new Error('Localization row must have a label and source text');
  }
  if (!languages.length) {
    throw new Error('At least one target language is required');
  }

  const languageProperties = Object.fromEntries(
    languages.map((code) => [
      code,
      {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            description: `Translation into ${describeLanguage(code)}`,
          },
        },
      },
    ]),
  );

  const schema: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'localization'],
    properties: {
      label: { type: 'string', minLength: 1 },
      localization: {
        type: 'object',
        additionalProperties: false,
        required: languages,
        properties: languageProperties,
      },
    },
  };

  const prompt = [
    'Translate one software localization message.',
    `Label: ${row.label}`,
    `Source language: ${describeLanguage(row.sourceCode)}`,
    `Source text: ${JSON.stringify(row.source)}`,
    row.description ? `Description: ${row.description}` : null,
    row.meta ? `Metadata: ${row.meta}` : null,
    'Target languages:',
    ...languages.map((code) => `- ${describeLanguage(code)}`),
    'Return only the requested structured JSON.',
    'Preserve every ICU argument, plural/select directive, and HTML/XML tag.',
    'Do not add explanations, markdown, placeholders, or metadata.',
    'Keep punctuation and tone equivalent to the source.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return { prompt, schema };
}
