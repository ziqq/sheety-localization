declare class IntlMessageFormat {
  constructor(message: string, locales?: string | string[]);
  format(values?: Record<string, unknown>): unknown;
}

export default IntlMessageFormat;
