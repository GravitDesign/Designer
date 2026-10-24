/**
 * The expression language of ready shapes (GParameterizedVertexProcessor),
 * without generated code.
 *
 * The old processor checked each coordinate expression against a
 * whitelist (isSecure), rewrote it (`.X` to `.getX()`, `sin(` to
 * `Math.sin(`, an optional clamp `Math.max(min, ( Math.min(max, ( e )) ))`)
 * and compiled `return <expression>;` with `Function(...params, body)`.
 * This module takes the same parameter names and the same body text and
 * parses them as the JavaScript subset that text can contain, then
 * evaluates the tree with the native operators and Math functions, in
 * JavaScript's evaluation order. So every number comes out bit for bit
 * as before, and a document can never run code.
 *
 * The subset is what passes the whitelist: numeric literals (decimal,
 * legacy octal, hex/octal/binary, BigInt, separators), parameters,
 * `Math.<whitelisted function>(...)`, `.getX()`/`.getY()`, `[index]`,
 * parentheses, commas, the binary operators `+ - * / **`, the unary
 * `+ -`, `++`/`--` on parameters and array elements, and comments.
 * Syntax JavaScript rejects (a literal followed by a name, `-2 ** 2`,
 * `1++`) throws a SyntaxError when compiling, as Function did.
 *
 * Differences, all only reachable with crafted parameter names or
 * operator runs the shape catalogue never uses: free names other than
 * NaN, Infinity and undefined throw a ReferenceError instead of reading a
 * browser global; a regular expression literal (`1+/2/+3`) and keywords
 * other than null, true, false, typeof and void (`this`, `new`) throw a
 * SyntaxError; `++`/`--` only update parameters and array elements (else
 * TypeError); Math members outside the whitelist and anything inherited
 * (`1..toFixed`) read as undefined.
 */

/** The Math functions the whitelist lets through (SUPPORTED_MATH_FUNCS and SUPPORTED_MATH_FUNCS2). */
const MATH_FUNCTIONS: Readonly<Record<string, (...args: number[]) => number>> = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  atan2: Math.atan2,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
  trunc: Math.trunc,
  min: Math.min,
  max: Math.max,
};

/** Words JavaScript never accepts as names (sloppy mode). */
const RESERVED = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
]);

type TokenType = "num" | "name" | "punct" | "end";

interface Token {
  type: TokenType;
  text: string;
  /** The value of a "num" token. */
  value?: number | bigint;
}

const PUNCTUATORS = ["**", "++", "--", "+", "-", "*", "/", "(", ")", "[", "]", ",", ".", ";"];

function isIdStart(c: string): boolean {
  return /[A-Za-z_$]/.test(c);
}

function isIdPart(c: string): boolean {
  return /[A-Za-z0-9_$]/.test(c);
}

function syntaxError(message: string): SyntaxError {
  return new SyntaxError(message);
}

/** Digits of `radix` with numeric separators, from `i`; returns the end. */
function scanDigits(text: string, i: number, digit: RegExp): number {
  let end = i;
  while (end < text.length) {
    const c = text[end] as string;
    if (digit.test(c)) end++;
    else if (c === "_" && end > i && digit.test(text[end + 1] ?? "")) end++;
    else break;
  }
  if (text[end] === "_") throw syntaxError("Numeric separators are not allowed here");
  return end;
}

/** One numeric literal starting at `i` (a digit, or "." and a digit). */
function scanNumber(text: string, i: number): { end: number; value: number | bigint } {
  const c0 = text[i] as string;
  const c1 = text[i + 1] ?? "";
  let end: number;
  let value: number | bigint;
  if (c0 === "0" && /[xXoObB]/.test(c1)) {
    const digit = /[xX]/.test(c1) ? /[0-9a-fA-F]/ : /[oO]/.test(c1) ? /[0-7]/ : /[01]/;
    end = scanDigits(text, i + 2, digit);
    if (end === i + 2) throw syntaxError("Invalid or unexpected token");
    const literal = text.slice(i, end).replace(/_/g, "");
    if (text[end] === "n") {
      value = BigInt(literal);
      end++;
    } else value = Number(literal);
  } else if (c0 === "0" && /[0-9]/.test(c1)) {
    // Legacy octal (only 0-7) or a "non-octal" decimal like 089.
    end = i + 1;
    while (/[0-9]/.test(text[end] ?? "")) end++;
    const digits = text.slice(i, end);
    if (/^[0-7]+$/.test(digits)) value = parseInt(digits, 8);
    else {
      if (text[end] === ".") {
        end++;
        while (/[0-9]/.test(text[end] ?? "")) end++;
      }
      end = scanExponent(text, end);
      value = Number(text.slice(i, end));
    }
    if (text[end] === "_" || text[end] === "n") throw syntaxError("Invalid or unexpected token");
  } else {
    if (c0 === "0" && c1 === "_") throw syntaxError("Numeric separators are not allowed here");
    end = c0 === "." ? i : scanDigits(text, i, /[0-9]/);
    let integer = c0 !== ".";
    if (text[end] === ".") {
      integer = false;
      const fraction = end + 1;
      end = /[0-9]/.test(text[fraction] ?? "") ? scanDigits(text, fraction, /[0-9]/) : fraction;
    }
    const beforeExponent = end;
    end = scanExponent(text, end);
    if (end !== beforeExponent) integer = false;
    const literal = text.slice(i, end).replace(/_/g, "");
    if (integer && text[end] === "n") {
      value = BigInt(literal);
      end++;
    } else value = Number(literal);
  }
  // A literal may not run into a name or a digit (`2x`, `07_1`).
  const next = text[end] ?? "";
  if (isIdStart(next) || /[0-9]/.test(next)) throw syntaxError("Invalid or unexpected token");
  return { end, value };
}

function scanExponent(text: string, i: number): number {
  if (!/[eE]/.test(text[i] ?? "")) return i;
  let end = i + 1;
  if (/[+-]/.test(text[end] ?? "")) end++;
  if (!/[0-9]/.test(text[end] ?? "")) throw syntaxError("Invalid or unexpected token");
  return scanDigits(text, end, /[0-9]/);
}

/** Splits `text` into tokens, skipping whitespace and comments. */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i] as string;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      // A line comment runs to the end: the body has no line breaks.
      i = text.length;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      if (close < 0) throw syntaxError("Invalid or unexpected token");
      i = close + 2;
      continue;
    }
    const start = i;
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(text[i + 1] ?? ""))) {
      const { end, value } = scanNumber(text, i);
      tokens.push({ type: "num", text: text.slice(start, end), value });
      i = end;
    } else if (isIdStart(c)) {
      while (i < text.length && isIdPart(text[i] as string)) i++;
      tokens.push({ type: "name", text: text.slice(start, i) });
    } else {
      const punct = PUNCTUATORS.find((p) => text.startsWith(p, i));
      if (!punct) throw syntaxError("Invalid or unexpected token");
      tokens.push({ type: "punct", text: punct });
      i += punct.length;
    }
  }
  tokens.push({ type: "end", text: "" });
  return tokens;
}

/** The evaluation scope: the parameter values of one call. */
interface Scope {
  values: unknown[];
  index: ReadonlyMap<string, number>;
}

interface ExprNode {
  evaluate(scope: Scope): unknown;
}

/** A node that can be the target of ++/--. */
interface TargetNode extends ExprNode {
  update(scope: Scope, delta: 1 | -1, prefix: boolean): unknown;
}

const GLOBALS: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ["Math", Math],
  ["NaN", NaN],
  ["Infinity", Infinity],
  ["undefined", undefined],
]);

/** ToNumeric, then +1 or -1, as the update operators do. */
function stepped(old: unknown, delta: 1 | -1): { old: number | bigint; next: number | bigint } {
  // Unary plus throws on BigInt; JavaScript's ToNumeric keeps it.
  const numeric = typeof old === "bigint" ? old : +(old as number);
  const next = typeof numeric === "bigint" ? numeric + BigInt(delta) : numeric + delta;
  return { old: numeric, next };
}

class NameNode implements TargetNode {
  constructor(readonly name: string) {}

  evaluate(scope: Scope): unknown {
    const index = scope.index.get(this.name);
    if (index !== undefined) return scope.values[index];
    if (GLOBALS.has(this.name)) return GLOBALS.get(this.name);
    throw new ReferenceError(this.name + " is not defined");
  }

  update(scope: Scope, delta: 1 | -1, prefix: boolean): unknown {
    const index = scope.index.get(this.name);
    if (index === undefined) {
      if (GLOBALS.has(this.name) && this.name !== "Math") {
        // NaN, Infinity and undefined are read-only: the result is computed, nothing changes.
        const { old, next } = stepped(GLOBALS.get(this.name), delta);
        return prefix ? next : old;
      }
      if (this.name === "Math") throw new TypeError("Math can't be updated here");
      throw new ReferenceError(this.name + " is not defined");
    }
    const { old, next } = stepped(scope.values[index], delta);
    scope.values[index] = next;
    return prefix ? next : old;
  }
}

class ConstantNode implements ExprNode {
  constructor(readonly value: unknown) {}

  evaluate(): unknown {
    return this.value;
  }
}

/** The functions an expression can call: the whitelisted Math functions and getX/getY. */
const callable = new WeakSet<object>(Object.values(MATH_FUNCTIONS));

/**
 * `object[key]`, limited to what expressions can reach: whitelisted Math
 * functions, getX/getY, and own properties (array elements). Never
 * anything else on the prototype chain.
 */
function readProperty(object: unknown, key: unknown): unknown {
  if (object === null || object === undefined) {
    throw new TypeError("Cannot read properties of " + String(object));
  }
  const name = String(key);
  if (object === Math) {
    return Object.hasOwn(MATH_FUNCTIONS, name) ? MATH_FUNCTIONS[name] : undefined;
  }
  if ((name === "getX" || name === "getY") && typeof object === "object") {
    const method = (object as Record<string, unknown>)[name];
    if (typeof method !== "function") return undefined;
    callable.add(method);
    return method;
  }
  if (typeof object === "string") {
    const index = Number(name);
    return Number.isInteger(index) && index >= 0 && String(index) === name
      ? object[index]
      : undefined;
  }
  if (typeof object === "object" && Object.hasOwn(object, name)) {
    return (object as Record<string, unknown>)[name];
  }
  return undefined;
}

class MemberNode implements TargetNode {
  constructor(
    readonly object: ExprNode,
    readonly property: ExprNode | string,
  ) {}

  private _key(scope: Scope): unknown {
    return typeof this.property === "string" ? this.property : this.property.evaluate(scope);
  }

  evaluate(scope: Scope): unknown {
    return this.evaluateWithTarget(scope).value;
  }

  /** The property value and the object it was read from (the `this` of a call). */
  evaluateWithTarget(scope: Scope): { target: unknown; value: unknown } {
    const object = this.object.evaluate(scope);
    return { target: object, value: readProperty(object, this._key(scope)) };
  }

  update(scope: Scope, delta: 1 | -1, prefix: boolean): unknown {
    const object = this.object.evaluate(scope);
    const key = this._key(scope);
    const { old, next } = stepped(readProperty(object, key), delta);
    if (!Array.isArray(object)) throw new TypeError("Only array elements can be updated here");
    (object as unknown as Record<string, unknown>)[String(key)] = next;
    return prefix ? next : old;
  }
}

class CallNode implements TargetNode {
  constructor(
    readonly callee: ExprNode,
    readonly args: ExprNode[],
  ) {}

  evaluate(scope: Scope): unknown {
    let target: unknown = undefined;
    let fn: unknown;
    if (this.callee instanceof MemberNode) {
      ({ target, value: fn } = this.callee.evaluateWithTarget(scope));
    } else fn = this.callee.evaluate(scope);
    const args: unknown[] = [];
    for (let i = 0; i < this.args.length; ++i)
      args.push((this.args[i] as ExprNode).evaluate(scope));
    if (typeof fn !== "function" || !callable.has(fn)) {
      throw new TypeError(String(fn) + " is not a function");
    }
    return Reflect.apply(fn as (...values: unknown[]) => unknown, target, args);
  }

  /** `f()++` compiles (web compatibility) but throws once the call is made. */
  update(scope: Scope): unknown {
    this.evaluate(scope);
    throw new ReferenceError("Invalid left-hand side expression in postfix operation");
  }
}

class UnaryNode implements ExprNode {
  constructor(
    readonly operator: string,
    readonly operand: ExprNode,
  ) {}

  evaluate(scope: Scope): unknown {
    if (this.operator === "typeof") {
      if (
        this.operand instanceof NameNode &&
        !scope.index.has(this.operand.name) &&
        !GLOBALS.has(this.operand.name)
      ) {
        return "undefined";
      }
      return typeof this.operand.evaluate(scope);
    }
    const value = this.operand.evaluate(scope) as number;
    switch (this.operator) {
      case "-":
        return -value;
      case "+":
        return +value;
      default:
        // void
        return undefined;
    }
  }
}

class UpdateNode implements ExprNode {
  constructor(
    readonly target: TargetNode,
    readonly delta: 1 | -1,
    readonly prefix: boolean,
  ) {}

  evaluate(scope: Scope): unknown {
    return this.target.update(scope, this.delta, this.prefix);
  }
}

class BinaryNode implements ExprNode {
  constructor(
    readonly operator: string,
    readonly left: ExprNode,
    readonly right: ExprNode,
  ) {}

  evaluate(scope: Scope): unknown {
    // Operands are whatever the expression produced; the native operators
    // apply JavaScript's own conversions.
    const left = this.left.evaluate(scope) as number;
    const right = this.right.evaluate(scope) as number;
    switch (this.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      default:
        return left ** right;
    }
  }
}

class SequenceNode implements ExprNode {
  constructor(readonly items: ExprNode[]) {}

  evaluate(scope: Scope): unknown {
    let value: unknown;
    for (let i = 0; i < this.items.length; ++i) value = (this.items[i] as ExprNode).evaluate(scope);
    return value;
  }
}

function isTarget(node: ExprNode): node is TargetNode {
  return node instanceof NameNode || node instanceof MemberNode || node instanceof CallNode;
}

/** Recursive descent over the tokens, with JavaScript's precedence and associativity. */
class Parser {
  private _position = 0;

  constructor(private readonly _tokens: Token[]) {}

  private get _token(): Token {
    return this._tokens[this._position] as Token;
  }

  private _is(text: string): boolean {
    const token = this._token;
    return (token.type === "punct" || token.type === "name") && token.text === text;
  }

  private _expect(text: string): void {
    if (!this._is(text)) throw this._unexpected();
    this._position++;
  }

  private _unexpected(): SyntaxError {
    const token = this._token;
    return syntaxError(
      token.type === "end" ? "Unexpected end of input" : "Unexpected token '" + token.text + "'",
    );
  }

  /** `return <expression>;` and nothing else. */
  parseBody(): ExprNode {
    this._expect("return");
    let node: ExprNode = new ConstantNode(undefined);
    if (!this._is(";") && this._token.type !== "end") node = this._expression();
    // Empty statements may follow.
    while (this._is(";")) this._position++;
    if (this._token.type !== "end") throw this._unexpected();
    return node;
  }

  private _expression(): ExprNode {
    const items = [this._additive()];
    while (this._is(",")) {
      this._position++;
      items.push(this._additive());
    }
    return items.length === 1 ? (items[0] as ExprNode) : new SequenceNode(items);
  }

  private _additive(): ExprNode {
    let node = this._multiplicative();
    while (this._is("+") || this._is("-")) {
      const operator = this._token.text;
      this._position++;
      node = new BinaryNode(operator, node, this._multiplicative());
    }
    return node;
  }

  private _multiplicative(): ExprNode {
    let node = this._exponent();
    while (this._is("*") || this._is("/")) {
      const operator = this._token.text;
      this._position++;
      node = new BinaryNode(operator, node, this._exponent());
    }
    return node;
  }

  /** `a ** b ** c` is `a ** (b ** c)`; a unary operand on the left is a SyntaxError. */
  private _exponent(): ExprNode {
    const unaryStart = this._isUnaryOperator();
    const node = this._unary();
    if (this._is("**")) {
      if (unaryStart) {
        throw syntaxError(
          "Unary operator used immediately before exponentiation expression. Parenthesis must be used to disambiguate operator precedence",
        );
      }
      this._position++;
      return new BinaryNode("**", node, this._exponent());
    }
    return node;
  }

  private _isUnaryOperator(): boolean {
    return this._is("+") || this._is("-") || this._is("typeof") || this._is("void");
  }

  private _unary(): ExprNode {
    if (this._isUnaryOperator()) {
      const operator = this._token.text;
      this._position++;
      return new UnaryNode(operator, this._unary());
    }
    if (this._is("++") || this._is("--")) {
      const delta = this._token.text === "++" ? 1 : -1;
      this._position++;
      const target = this._unary();
      if (!isTarget(target)) {
        throw syntaxError("Invalid left-hand side expression in prefix operation");
      }
      return new UpdateNode(target, delta, true);
    }
    return this._postfix();
  }

  private _postfix(): ExprNode {
    const node = this._callOrMember();
    // No line breaks can occur, so ++/-- always binds to the operand before it.
    if (this._is("++") || this._is("--")) {
      if (!isTarget(node)) {
        throw syntaxError("Invalid left-hand side expression in postfix operation");
      }
      const delta = this._token.text === "++" ? 1 : -1;
      this._position++;
      return new UpdateNode(node, delta, false);
    }
    return node;
  }

  private _callOrMember(): ExprNode {
    let node = this._primary();
    for (;;) {
      if (this._is(".")) {
        this._position++;
        const token = this._token;
        if (token.type !== "name") throw this._unexpected();
        this._position++;
        node = new MemberNode(node, token.text);
      } else if (this._is("[")) {
        this._position++;
        const key = this._expression();
        this._expect("]");
        node = new MemberNode(node, key);
      } else if (this._is("(")) {
        this._position++;
        const args: ExprNode[] = [];
        if (!this._is(")")) {
          args.push(this._additive());
          while (this._is(",")) {
            this._position++;
            // A trailing comma is allowed in calls.
            if (this._is(")")) break;
            args.push(this._additive());
          }
        }
        this._expect(")");
        node = new CallNode(node, args);
      } else return node;
    }
  }

  private _primary(): ExprNode {
    const token = this._token;
    if (token.type === "num") {
      this._position++;
      return new ConstantNode(token.value);
    }
    if (token.type === "name") {
      this._position++;
      switch (token.text) {
        case "null":
          return new ConstantNode(null);
        case "true":
          return new ConstantNode(true);
        case "false":
          return new ConstantNode(false);
      }
      if (RESERVED.has(token.text)) throw syntaxError("Unexpected token '" + token.text + "'");
      return new NameNode(token.text);
    }
    if (this._is("(")) {
      this._position++;
      const node = this._expression();
      this._expect(")");
      return node;
    }
    if (this._is("/")) throw syntaxError("Regular expressions are not supported");
    throw this._unexpected();
  }
}

/**
 * The parameter names as Function joins them ("a,b"): identifiers, with
 * an optional trailing comma; an empty list has none. Later duplicates
 * win, as in sloppy-mode functions.
 */
function parseParameters(names: readonly string[]): Map<string, number> {
  const text = names.join(",");
  const index = new Map<string, number>();
  if (/^\s*$/.test(text)) return index;
  const parts = text.split(",");
  if (parts.length > 1 && /^\s*$/.test(parts[parts.length - 1] as string)) parts.pop();
  for (let i = 0; i < parts.length; ++i) {
    const name = (parts[i] as string).trim();
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || RESERVED.has(name)) {
      throw syntaxError("Unexpected token in the parameter list");
    }
    index.set(name, i);
  }
  return index;
}

/** A compiled expression: called with the parameter values, like the old generated function. */
export type ExpressionFunction = (...args: unknown[]) => unknown;

/**
 * Compiles `body` (`return <expression>;`) with the parameters `names`,
 * what `Function(...names, body)` did. Throws a SyntaxError where
 * Function threw one.
 */
export function compileExpressionFunction(
  names: readonly string[],
  body: string,
): ExpressionFunction {
  const index = parseParameters(names);
  const tree = new Parser(tokenize(body)).parseBody();
  return (...args: unknown[]) => {
    // A copy: ++/-- on a parameter changes this call's value only.
    return tree.evaluate({ values: args.slice(), index });
  };
}
