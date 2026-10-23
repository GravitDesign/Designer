// Old: chunk.vendor.js module 132 (GLength).
//
// A length with a unit, the unit conversion table and the small
// expression evaluator behind the numeric input fields ("10mm + 2pt").
import { GObject, registerClass } from "../core/object.ts";
import { formatNumber, parseNumber } from "../core/util.ts";

export type LengthUnit = (typeof Length.Unit)[keyof typeof Length.Unit];

export class Length extends GObject {
  static {
    registerClass(this, "GLength");
  }

  static readonly Unit = {
    PT: "pt",
    PX: "px",
    PC: "pc",
    IN: "in",
    MM: "mm",
    CM: "cm",
    PIX: "pix",
    CC: "cc",
    DD: "dd",
    FT: "ft",
    YD: "yd",
    MI: "mi",
    M: "m",
    KM: "km",
    Q: "q",
    H: "h",
  } as const;

  static readonly DEFAULT_UNIT: LengthUnit = Length.Unit.PX;

  static readonly DPI = 72;

  /**
   * Parses "12.5mm", "3 pt", "1,5in" and the like. The number is read
   * with parseNumber; the unit is whatever follows the number's
   * printed form, so "1e3px" or "+4px" don't find their unit. Unknown
   * units fall back to `defaultUnit` (default px).
   */
  static parseLength(text: string | null | undefined, defaultUnit?: string): Length | null {
    if (!text) return null;
    text = text.trim();
    if (0 == text.length) return null;
    const value = parseNumber(text);
    // NaN passes this check; "abc" becomes a NaN length.
    if (typeof value !== "number") return null;
    let unit = defaultUnit || Length.DEFAULT_UNIT;
    let suffix = text.slice(value.toString().length);
    if (suffix && suffix.length > 0) {
      suffix = suffix.trim().toLowerCase();
      const first = suffix.charAt(0);
      const second = suffix.charAt(1);
      if (suffix.length >= 2 && "p" == first && "t" == second) unit = Length.Unit.PT;
      else if (suffix.length >= 2 && "p" == first && "x" == second) unit = Length.Unit.PX;
      else if (suffix.length >= 2 && "p" == first && "c" == second) unit = Length.Unit.PC;
      else if (suffix.length >= 2 && "i" == first && "n" == second) unit = Length.Unit.IN;
      else if (suffix.length >= 2 && "m" == first && "m" == second) unit = Length.Unit.MM;
      else if (suffix.length >= 2 && "c" == first && "m" == second) unit = Length.Unit.CM;
      else if (suffix.length >= 1 && "m" == first) unit = Length.Unit.M;
    }
    return new Length(value, unit);
  }

  /**
   * Evaluates an expression such as "10mm + 2 * 3pt" in `unit` (default
   * px). Lengths with their own unit are converted to it. Returns null for
   * anything that doesn't parse or evaluate.
   */
  static parseEquation(text: string, unit?: string): Length | null {
    unit = unit || Length.DEFAULT_UNIT;
    const evaluator = new Evaluator(createContext(unit));
    try {
      return new Length(evaluator.evaluate(text), unit);
    } catch {
      return null;
    }
  }

  static parseEquationValue(text: string): number | null {
    const length = Length.parseEquation(text);
    return length ? length.getValue() : null;
  }

  private readonly _value: number;
  private readonly _unit: string;

  constructor(value?: number, unit?: string) {
    super();
    this._value = value as number;
    this._unit = unit || Length.DEFAULT_UNIT;
  }

  getValue(): number {
    return this._value;
  }

  getUnit(): string {
    return this._unit;
  }

  /** The value in pt (at DPI 72, which makes pt and px the same). */
  toPoint(): number {
    return this._unit != Length.Unit.PT
      ? (POINTS_PER_UNIT[this._unit] as number) * this._value
      : this._value;
  }

  toUnit(unit: string): number {
    return this._unit != unit ? this.toPoint() / (POINTS_PER_UNIT[unit] as number) : this._value;
  }

  convert(unit: string): Length {
    return this._unit != unit
      ? new Length(this.toPoint() / (POINTS_PER_UNIT[unit] as number), unit)
      : new Length(this._value, unit);
  }

  /**
   * The value formatted with formatNumber plus the unit. The old code
   * looks the unit up by its lowercase value in the uppercase-keyed Unit
   * table, so the suffix is always "undefined" ("5undefined"); kept, see
   * QUESTIONS.md.
   */
  override toString(digits?: number): string {
    let text = formatNumber(this._value, digits);
    if (this._unit) text += (Length.Unit as Record<string, string>)[this._unit] as string;
    return text;
  }
}

/** Points per unit. */
const POINTS_PER_UNIT: Record<string, number> = {
  pt: Length.DPI / 72,
  px: 1,
  pc: Length.DPI / 6,
  in: Length.DPI,
  mm: Length.DPI / 25.4,
  cm: Length.DPI / 2.54,
  pix: Length.DPI / 300,
  cc: (4.51165812456 * Length.DPI) / 25.4,
  dd: (4.51165812456 * Length.DPI) / 25.4 / 12,
  ft: 12 * Length.DPI,
  yd: 36 * Length.DPI,
  mi: 63360 * Length.DPI,
  m: Length.DPI / 0.0254,
  km: Length.DPI / 254e-7,
  q: Length.DPI / 101.6,
  h: Length.DPI / 101.6,
};

// ---------------------------------------------------------------------------
// Expression evaluator: lexer, recursive descent parser and tree walker.

type TokenKind = "Operator" | "Identifier" | "Number";

interface Token {
  kind: TokenKind;
  value: string;
}

type ExpressionNode =
  | { Expression: ExpressionNode }
  | { Number: string }
  | { Identifier: string }
  | { Unary: { operator: string; expression: ExpressionNode } }
  | { Binary: { operator: string; left: ExpressionNode; right: ExpressionNode } }
  | { Assignment: { name: { Identifier: string }; value: ExpressionNode } }
  | { FunctionCall: { name: string; args: ExpressionNode[] } };

interface EvaluationContext {
  Unit: string;
  Constants: Record<string, number>;
  Functions: Record<string, ((...args: number[]) => number) | undefined>;
  Variables: Record<string, number>;
}

function createContext(unit: string): EvaluationContext {
  return {
    Unit: unit,
    Constants: { pi: 3.141592653589793, phi: 1.618033988749895 },
    Functions: {
      abs: Math.abs,
      acos: Math.acos,
      asin: Math.asin,
      atan: Math.atan,
      ceil: Math.ceil,
      cos: Math.cos,
      exp: Math.exp,
      floor: Math.floor,
      // Math.ln doesn't exist, so "ln(2)" fails and the field rejects it.
      ln: (Math as unknown as Record<string, ((...args: number[]) => number) | undefined>).ln,
      random: Math.random,
      sin: Math.sin,
      sqrt: Math.sqrt,
      tan: Math.tan,
    },
    Variables: {},
  };
}

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

const isWhitespace = (c: string): boolean => "\t" === c || " " === c || " " === c;
const isLetter = (c: string): boolean => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
const isDigit = (c: string): boolean => c >= "0" && c <= "9";
const isIdentifierStart = (c: string): boolean => "_" === c || isLetter(c);
const isIdentifierPart = (c: string): boolean => isIdentifierStart(c) || isDigit(c);

/**
 * Numbers include a trailing unit ("10mm") and may use "," as the decimal
 * separator; the parser hands them to Length.parseLength.
 */
class Lexer {
  private text = "";
  private length = 0;
  private index = 0;

  reset(text: string): void {
    this.text = text;
    this.length = text.length;
    this.index = 0;
  }

  /** The next token, or undefined at the end. */
  next(): Token | undefined {
    while (this.index < this.length && isWhitespace(this.peekChar())) this.readChar();
    if (this.index >= this.length) return undefined;
    const token = this.scanNumber() ?? this.scanOperator() ?? this.scanIdentifier();
    if (token !== undefined) return token;
    throw new SyntaxError("Unknown token from character " + this.peekChar());
  }

  /** The next token without consuming it (undefined at the end or on an error). */
  peek(): Token | undefined {
    const saved = this.index;
    let token: Token | undefined;
    try {
      token = this.next();
    } catch {
      token = undefined;
    }
    this.index = saved;
    return token;
  }

  private peekChar(): string {
    return this.index < this.length ? this.text.charAt(this.index) : "\0";
  }

  private readChar(): string {
    let c = "\0";
    if (this.index < this.length) {
      c = this.text.charAt(this.index);
      this.index += 1;
    }
    return c;
  }

  private scanNumber(): Token | undefined {
    let c = this.peekChar();
    if (!(isDigit(c) || "." === c)) return undefined;
    let number = "";
    if ("." !== c) {
      for (number = this.readChar(); isDigit((c = this.peekChar()));) number += this.readChar();
    }
    if ("." === c || "," === c) {
      for (number += this.readChar(); isDigit((c = this.peekChar()));) number += this.readChar();
    }
    if ("e" === c || "E" === c) {
      number += this.readChar();
      c = this.peekChar();
      if ("+" !== c && "-" !== c && !isDigit(c)) {
        let what = "character " + c;
        if (this.index >= this.length) what = "<end>";
        throw new SyntaxError("Unexpected " + what + " after the exponent sign");
      }
      for (number += this.readChar(); isDigit((c = this.peekChar()));) number += this.readChar();
    }
    if (isLetter(c)) {
      number += this.readChar();
      while (isLetter(this.peekChar())) number += this.readChar();
    }
    if ("." === number) throw new SyntaxError("Expecting decimal digits after the dot sign");
    return { kind: "Number", value: number };
  }

  private scanOperator(): Token | undefined {
    if ("+-*/()^%=;,".indexOf(this.peekChar()) >= 0) {
      return { kind: "Operator", value: this.readChar() };
    }
    return undefined;
  }

  private scanIdentifier(): Token | undefined {
    if (!isIdentifierStart(this.peekChar())) return undefined;
    let name = this.readChar();
    while (isIdentifierPart(this.peekChar())) name += this.readChar();
    return { kind: "Identifier", value: name };
  }
}

const isOperator = (token: Token | undefined, operator: string): boolean =>
  token !== undefined && token.kind === "Operator" && token.value === operator;

/**
 * Grammar: assignment := additive ["=" assignment]; additive and
 * multiplicative are left associative; unary := ("+" | "-") unary |
 * primary; primary := identifier | call | number | "(" assignment ")".
 */
class Parser {
  private readonly lexer = new Lexer();

  parse(text: string): ExpressionNode {
    this.lexer.reset(text);
    const expression = this.assignment();
    const rest = this.lexer.next();
    if (rest !== undefined) throw new SyntaxError("Unexpected token " + rest.value);
    return { Expression: expression };
  }

  private assignment(): ExpressionNode {
    const left = this.additive();
    if ("Identifier" in left && left.Identifier && isOperator(this.lexer.peek(), "=")) {
      this.lexer.next();
      return { Assignment: { name: left, value: this.assignment() } };
    }
    return left;
  }

  private additive(): ExpressionNode {
    let left = this.multiplicative();
    let token = this.lexer.peek();
    while (isOperator(token, "+") || isOperator(token, "-")) {
      const operator = (this.lexer.next() as Token).value;
      left = { Binary: { operator, left, right: this.multiplicative() } };
      token = this.lexer.peek();
    }
    return left;
  }

  private multiplicative(): ExpressionNode {
    let left = this.unary();
    let token = this.lexer.peek();
    while (isOperator(token, "*") || isOperator(token, "/")) {
      const operator = (this.lexer.next() as Token).value;
      left = { Binary: { operator, left, right: this.unary() } };
      token = this.lexer.peek();
    }
    return left;
  }

  private unary(): ExpressionNode {
    const token = this.lexer.peek();
    if (isOperator(token, "-") || isOperator(token, "+")) {
      const operator = (this.lexer.next() as Token).value;
      const expression = this.unary();
      return { Unary: { operator, expression } };
    }
    return this.primary();
  }

  private primary(): ExpressionNode {
    let token = this.lexer.peek();
    if (token === undefined) throw new SyntaxError("Unexpected termination of expression");
    if (token.kind === "Identifier") {
      token = this.lexer.next() as Token;
      return isOperator(this.lexer.peek(), "(")
        ? this.functionCall(token.value)
        : { Identifier: token.value };
    }
    if (token.kind === "Number") {
      return { Number: (this.lexer.next() as Token).value };
    }
    if (isOperator(token, "(")) {
      this.lexer.next();
      const expression = this.assignment();
      if (!isOperator(this.lexer.next(), ")")) throw new SyntaxError("Expecting )");
      return { Expression: expression };
    }
    throw new SyntaxError("Parse error, can not process token " + token.value);
  }

  private functionCall(name: string): ExpressionNode {
    let args: ExpressionNode[] = [];
    if (!isOperator(this.lexer.next(), "(")) {
      throw new SyntaxError('Expecting ( in a function call "' + name + '"');
    }
    if (!isOperator(this.lexer.peek(), ")")) {
      args = [];
      for (;;) {
        args.push(this.assignment());
        if (!isOperator(this.lexer.peek(), ",")) break;
        this.lexer.next();
      }
    }
    if (!isOperator(this.lexer.next(), ")")) {
      throw new SyntaxError('Expecting ) in a function call "' + name + '"');
    }
    return { FunctionCall: { name, args } };
  }
}

class Evaluator {
  private readonly parser = new Parser();

  constructor(private readonly context: EvaluationContext) {}

  evaluate(text: string): number {
    return this.evaluateNode(this.parser.parse(text));
  }

  private evaluateNode(node: ExpressionNode): number {
    const context = this.context;
    if ("Expression" in node) return this.evaluateNode(node.Expression);
    if ("Number" in node) {
      const length = Length.parseLength(node.Number, context.Unit);
      if (!length) throw new SyntaxError("Invalid length " + node.Number);
      return length.toUnit(context.Unit);
    }
    if ("Binary" in node) {
      const { operator, left, right } = node.Binary;
      const a = this.evaluateNode(left);
      const b = this.evaluateNode(right);
      switch (operator) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        default:
          throw new SyntaxError("Unknown operator " + operator);
      }
    }
    if ("Unary" in node) {
      const value = this.evaluateNode(node.Unary.expression);
      switch (node.Unary.operator) {
        case "+":
          return value;
        case "-":
          return -value;
        default:
          throw new SyntaxError("Unknown operator " + node.Unary.operator);
      }
    }
    if ("Identifier" in node) {
      if (hasOwn(context.Constants, node.Identifier)) {
        return context.Constants[node.Identifier] as number;
      }
      if (hasOwn(context.Variables, node.Identifier)) {
        return context.Variables[node.Identifier] as number;
      }
      throw new SyntaxError("Unknown identifier");
    }
    if ("Assignment" in node) {
      const value = this.evaluateNode(node.Assignment.value);
      context.Variables[node.Assignment.name.Identifier] = value;
      return value;
    }
    const call = node.FunctionCall;
    if (hasOwn(context.Functions, call.name)) {
      const args: number[] = [];
      for (const arg of call.args) args.push(this.evaluateNode(arg));
      // ln is listed but undefined; calling it throws a TypeError, which
      // parseEquation turns into null like any other error.
      const fn = context.Functions[call.name] as (...args: number[]) => number;
      return fn(...args);
    }
    throw new SyntaxError("Unknown function " + call.name);
  }
}
