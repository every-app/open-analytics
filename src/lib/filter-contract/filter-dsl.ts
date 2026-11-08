import {
  EVENT_PAYLOAD_FIELD,
  FILTER_OPERATORS,
  type FilterCondition,
  type FilterDocument,
  type FilterFieldRegistry,
  type FilterTarget,
  FilterValidationError,
  type FilterValue,
  normalizeFilterDocument,
  VALUELESS_FILTER_OPERATORS,
} from "./filters";

/** The version of the human-readable filter expression language. */
export const FILTER_DSL_VERSION = 1 as const;

/** Maximum UTF-16 source length accepted by persisted and API DSL inputs. */
export const FILTER_DSL_MAX_LENGTH = 65_536 as const;

/** Valid examples, shown to API callers. */
export const FILTER_DSL_EXAMPLES = [
  'page.path eq "/pricing"',
  'geo.country in ["US", "GB"]',
  'client.deviceType neq "mobile"',
  'page.path startsWith "/docs" AND referrer.domain eq "google.com"',
  'event.name eq "signup"',
  'event.payload("/plan") eq "pro"',
] as const;

export enum FilterDslErrorCode {
  UnterminatedString = "unterminated_string",
  InvalidToken = "invalid_token",
  ExpectedField = "expected_field",
  ExpectedOperator = "expected_operator",
  ExpectedValue = "expected_value",
  ExpectedAnd = "expected_and",
  InvalidCondition = "invalid_condition",
}

/**
 * Error raised while parsing or validating a filter DSL document.
 *
 * `offset` is a UTF-16 source offset, matching JavaScript string indexing.
 */
export class FilterDslParseError extends Error {
  readonly code: string;
  readonly offset: number;
  readonly length: number;

  constructor(message: string, code: string, offset: number, length: number) {
    super(`${message} [${code}] at offset ${offset}.`);
    this.name = "FilterDslParseError";
    this.code = code;
    this.offset = offset;
    this.length = length;
  }
}

enum TokenKind {
  Word = "word",
  String = "string",
  Number = "number",
  Open = "(",
  Close = ")",
  ListOpen = "[",
  ListClose = "]",
  Comma = ",",
  End = "end",
}

type Token =
  | {
      readonly kind: TokenKind.Word | TokenKind.String;
      readonly value: string;
      readonly start: number;
      readonly end: number;
    }
  | {
      readonly kind: TokenKind.Number;
      readonly value: number;
      readonly start: number;
      readonly end: number;
    }
  | {
      readonly kind: Exclude<
        TokenKind,
        TokenKind.Word | TokenKind.String | TokenKind.Number
      >;
      readonly start: number;
      readonly end: number;
    };

const PUNCTUATION: Readonly<Record<string, TokenKind>> = {
  "(": TokenKind.Open,
  ")": TokenKind.Close,
  "[": TokenKind.ListOpen,
  "]": TokenKind.ListClose,
  ",": TokenKind.Comma,
};

const OPERATORS = new Map(
  FILTER_OPERATORS.map((operator) => [operator.toLowerCase(), operator]),
);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    const start = index;
    const punctuation = PUNCTUATION[source[index]!];
    if (punctuation) {
      tokens.push({ kind: punctuation, start, end: start + 1 } as Token);
      index += 1;
      continue;
    }
    if (source[index] === '"') {
      const string = /^"(?:[^"\\]|\\.)*"/.exec(rest);
      if (!string) {
        throw new FilterDslParseError(
          "Unterminated JSON string.",
          FilterDslErrorCode.UnterminatedString,
          start,
          source.length - start,
        );
      }
      tokens.push({
        kind: TokenKind.String,
        value: JSON.parse(string[0]) as string,
        start,
        end: start + string[0].length,
      });
      index += string[0].length;
      continue;
    }
    const number = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.])/.exec(rest);
    if (number) {
      tokens.push({
        kind: TokenKind.Number,
        value: Number(number[0]),
        start,
        end: start + number[0].length,
      });
      index += number[0].length;
      continue;
    }
    const word = /^[A-Za-z][A-Za-z0-9_.]*/.exec(rest);
    if (!word) {
      throw new FilterDslParseError(
        "Unexpected character.",
        FilterDslErrorCode.InvalidToken,
        start,
        1,
      );
    }
    tokens.push({
      kind: TokenKind.Word,
      value: word[0],
      start,
      end: start + word[0].length,
    });
    index += word[0].length;
  }
  tokens.push({ kind: TokenKind.End, start: index, end: index });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token {
    return this.tokens[this.index]!;
  }

  private next(): Token {
    return this.tokens[this.index++]!;
  }

  private error(token: Token, code: FilterDslErrorCode, message: string) {
    return new FilterDslParseError(
      message,
      code,
      token.start,
      token.end - token.start,
    );
  }

  private expect(kind: TokenKind, code: FilterDslErrorCode, what: string) {
    const token = this.next();
    if (token.kind !== kind) throw this.error(token, code, `Expected ${what}.`);
    return token;
  }

  parse(): Array<{ condition: unknown; start: number; end: number }> {
    const conditions = [this.condition()];
    while (this.peek().kind !== TokenKind.End) {
      const token = this.next();
      if (token.kind !== TokenKind.Word || token.value.toUpperCase() !== "AND")
        throw this.error(
          token,
          FilterDslErrorCode.ExpectedAnd,
          "Expected AND between conditions.",
        );
      conditions.push(this.condition());
    }
    return conditions;
  }

  private condition() {
    const start = this.peek().start;
    const target = this.target();
    const operatorToken = this.next();
    const operator =
      operatorToken.kind === TokenKind.Word
        ? OPERATORS.get(operatorToken.value.toLowerCase())
        : undefined;
    if (!operator) {
      throw this.error(
        operatorToken,
        FilterDslErrorCode.ExpectedOperator,
        "Expected an operator.",
      );
    }
    if (VALUELESS_FILTER_OPERATORS.has(operator)) {
      return { condition: { target, operator }, start, end: operatorToken.end };
    }
    const value = this.value();
    return {
      condition: { target, operator, value },
      start,
      end: this.tokens[this.index - 1]!.end,
    };
  }

  private target(): FilterTarget {
    const token = this.next();
    if (token.kind !== TokenKind.Word) {
      throw this.error(
        token,
        FilterDslErrorCode.ExpectedField,
        "Expected a filter field.",
      );
    }
    if (token.value !== EVENT_PAYLOAD_FIELD) {
      return { kind: "field", field: token.value } as FilterTarget;
    }
    this.expect(TokenKind.Open, FilterDslErrorCode.ExpectedField, "`(`");
    const path = this.expect(
      TokenKind.String,
      FilterDslErrorCode.ExpectedField,
      "a JSON pointer string",
    );
    this.expect(TokenKind.Close, FilterDslErrorCode.ExpectedField, "`)`");
    return {
      kind: "event-payload",
      path: (path as { value: string }).value,
    } as FilterTarget;
  }

  private value(): FilterValue | FilterValue[] {
    if (this.peek().kind !== TokenKind.ListOpen) return this.scalar();
    this.next();
    const values = [this.scalar()];
    while (this.peek().kind === TokenKind.Comma) {
      this.next();
      values.push(this.scalar());
    }
    this.expect(TokenKind.ListClose, FilterDslErrorCode.ExpectedValue, "`]`");
    return values;
  }

  private scalar(): FilterValue {
    const token = this.next();
    if (token.kind === TokenKind.String || token.kind === TokenKind.Number)
      return token.value;
    if (token.kind === TokenKind.Word) {
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (token.value === "null") return null;
    }
    throw this.error(
      token,
      FilterDslErrorCode.ExpectedValue,
      "Expected a JSON value.",
    );
  }
}

/**
 * Parses `<field> <operator> [<value>]` conditions joined by AND. Throws a
 * FilterDslParseError naming the offending source offset.
 */
export function parseFilterDsl(
  source: string,
  registry: FilterFieldRegistry,
): FilterDocument {
  if (!source.trim()) return { conditions: [] };
  const parsed = new Parser(tokenize(source)).parse();
  const conditions = parsed.map(({ condition, start, end }) => {
    try {
      return normalizeFilterDocument({ conditions: [condition] }, registry)
        .conditions[0]!;
    } catch (error) {
      if (!(error instanceof FilterValidationError)) throw error;
      throw new FilterDslParseError(
        error.message,
        error.code,
        start,
        end - start,
      );
    }
  });
  return normalizeFilterDocument({ conditions }, registry);
}

function formatCondition(condition: FilterCondition): string {
  const target =
    condition.target.kind === "field"
      ? condition.target.field
      : `${EVENT_PAYLOAD_FIELD}(${JSON.stringify(condition.target.path)})`;
  if (VALUELESS_FILTER_OPERATORS.has(condition.operator))
    return `${target} ${condition.operator}`;
  const value = Array.isArray(condition.value)
    ? `[${condition.value.map((item) => JSON.stringify(item)).join(", ")}]`
    : JSON.stringify(condition.value);
  return `${target} ${condition.operator} ${value}`;
}

/** Formats a filter document in the DSL that parseFilterDsl reads. */
export function formatFilterDsl(document: FilterDocument): string {
  return document.conditions.map(formatCondition).join(" AND ");
}
