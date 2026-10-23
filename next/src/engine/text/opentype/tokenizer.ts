// Old: chunk.vendor.js module 378 (opentype.js tokenizer.js).
// Gravit change: the FAIL messages of Event.subscribe, registerContextChecker
// and getContextRanges don't quote the name ("invalid newToken event
// handler" instead of "invalid 'newToken' event handler").

/** A token's state value: a glyph index, a ligature ([ligGlyph]) or null for no glyph. */
export type TokenValue = number | number[] | null;

export interface TokenState {
  deleted?: boolean;
  [key: string]: TokenValue | boolean | undefined;
}

export interface ActiveState {
  key: string;
  value: TokenValue;
}

/** The error object the tokenizer returns instead of throwing. */
export interface FailResult {
  FAIL: string;
  report?: unknown[];
}

/** One character of the text and the states modifiers and features gave it. */
export class Token {
  char: string;
  state: TokenState;
  activeState: ActiveState | null;

  constructor(char: string) {
    this.char = char;
    this.state = {};
    this.activeState = null;
  }

  /** Sets a state and makes it the active one. */
  setState(key: string, value: TokenValue): ActiveState {
    this.state[key] = value;
    this.activeState = { key: key, value: this.state[key] as TokenValue };
    return this.activeState;
  }

  getState(stateId: string): TokenValue | boolean {
    return this.state[stateId] || null;
  }
}

/** A run of tokens that a context checker matched. */
export class ContextRange {
  contextName: string;
  startIndex: number;
  endOffset: number | null;
  rangeId?: string;

  constructor(startIndex: number, endOffset: number | null, contextName: string) {
    this.contextName = contextName;
    this.startIndex = startIndex;
    this.endOffset = endOffset;
  }
}

export type ContextCheck = (contextParams: ContextParams<string>) => boolean | undefined;

/** A named context with its start and end checks and the ranges found so far. */
export class ContextChecker {
  contextName: string;
  openRange: ContextRange | null;
  ranges: ContextRange[];
  checkStart: ContextCheck;
  checkEnd: ContextCheck;

  constructor(contextName: string, checkStart: ContextCheck, checkEnd: ContextCheck) {
    this.contextName = contextName;
    this.openRange = null;
    this.ranges = [];
    this.checkStart = checkStart;
    this.checkEnd = checkEnd;
  }
}

/** A position in a list (characters or tokens) with what comes before and after it. */
export class ContextParams<T> {
  context: T[];
  index: number;
  length: number;
  current: T;
  backtrack: T[];
  lookahead: T[];

  constructor(context: T[], currentIndex: number) {
    this.context = context;
    this.index = currentIndex;
    this.length = context.length;
    this.current = context[currentIndex] as T;
    this.backtrack = context.slice(0, currentIndex);
    this.lookahead = context.slice(currentIndex + 1);
  }

  setCurrentIndex(index: number): void {
    this.index = index;
    this.current = this.context[index] as T;
    this.backtrack = this.context.slice(0, index);
    this.lookahead = this.context.slice(index + 1);
  }

  /** The item at the offset from the current one (negative looks back), or null outside the list. */
  get(offset: number): T | null {
    switch (true) {
      case offset === 0:
        return this.current;
      case offset < 0 && Math.abs(offset) <= this.backtrack.length:
        return this.backtrack.slice(offset)[0] as T;
      case offset > 0 && offset <= this.lookahead.length:
        return this.lookahead[offset - 1] as T;
      default:
        return null;
    }
  }
}

// Handlers get their own parameter lists; the event stores them untyped.
type AnyHandler = (this: Tokenizer, ...args: never[]) => unknown;
type StoredHandler = (this: Tokenizer, ...args: unknown[]) => unknown;

export class Event {
  eventId: string;
  subscribers: StoredHandler[];

  constructor(eventId: string) {
    this.eventId = eventId;
    this.subscribers = [];
  }

  /** Adds a handler and returns its id, or a FAIL object when it isn't a function. */
  subscribe(eventHandler: AnyHandler): number | FailResult {
    if (typeof eventHandler === "function") {
      return this.subscribers.push(eventHandler as unknown as StoredHandler) - 1;
    }
    return { FAIL: "invalid " + this.eventId + " event handler" };
  }

  unsubscribe(subsId: number): void {
    this.subscribers.splice(subsId, 1);
  }
}

const CORE_EVENTS = [
  "start",
  "end",
  "next",
  "newToken",
  "contextStart",
  "contextEnd",
  "insertToken",
  "removeToken",
  "removeRange",
  "replaceToken",
  "replaceRange",
  "composeRUD",
  "updateContextsRanges",
] as const;

export type EventId = (typeof CORE_EVENTS)[number];

export type TokenizerEvents = Record<EventId, Event>;

/** Initial handlers per event, passed to the Tokenizer constructor. */
export type TokenizerEventHandlers = Partial<Record<EventId, AnyHandler>>;

function initializeCoreEvents(this: Tokenizer, events?: TokenizerEventHandlers): void {
  const tokenizerEvents = this.events;
  const updateContextsRanges = this.updateContextsRanges;
  CORE_EVENTS.forEach((eventId) => {
    // Read-only and not enumerable, like the old defineProperty calls.
    Object.defineProperty(tokenizerEvents, eventId, { value: new Event(eventId) });
  });
  if (events) {
    CORE_EVENTS.forEach((eventId) => {
      const event = events[eventId];
      if (typeof event === "function") {
        tokenizerEvents[eventId].subscribe(event);
      }
    });
  }
  const requiresContextUpdate: EventId[] = [
    "insertToken",
    "removeToken",
    "removeRange",
    "replaceToken",
    "replaceRange",
    "composeRUD",
  ];
  requiresContextUpdate.forEach((eventId) => {
    tokenizerEvents[eventId].subscribe(updateContextsRanges);
  });
}

/** A [method name, ...arguments] entry for composeRUD. */
export type RUDOperation = [string, ...unknown[]];

/**
 * Splits text into tokens, runs context checkers over them and lets
 * modifiers give each new token a state.
 */
export class Tokenizer {
  tokens: Token[];
  registeredContexts: Record<string, ContextChecker>;
  contextCheckers: ContextChecker[];
  events: TokenizerEvents;
  registeredModifiers: string[];

  constructor(events?: TokenizerEventHandlers) {
    this.tokens = [];
    this.registeredContexts = {};
    this.contextCheckers = [];
    this.events = {} as TokenizerEvents;
    this.registeredModifiers = [];
    initializeCoreEvents.call(this, events);
  }

  inboundIndex(index: number): boolean {
    return index >= 0 && index < this.tokens.length;
  }

  /** Runs several replace/update/delete operations silently and dispatches one composeRUD event. */
  composeRUD(RUDs: RUDOperation[]): FailResult | undefined {
    const silent = true;
    const state = RUDs.map((RUD) => {
      const method = (this as unknown as Record<string, (...args: unknown[]) => unknown>)[
        RUD[0]
      ] as (...args: unknown[]) => unknown;
      return method.apply(this, RUD.slice(1).concat(silent));
    });
    const hasFAILObject = (obj: unknown): boolean =>
      typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj as object, "FAIL");
    if (state.every(hasFAILObject)) {
      return {
        FAIL: "composeRUD: one or more operations hasn't completed successfully",
        report: state.filter(hasFAILObject),
      };
    }
    this.dispatch("composeRUD", [state.filter((op) => !hasFAILObject(op))]);
    return undefined;
  }

  replaceRange(
    startIndex: number,
    offset: number | null,
    tokens: Token[],
    silent?: boolean,
  ): [Token[], Token[]] | FailResult {
    offset = offset !== null ? offset : this.tokens.length;
    const isTokenType = tokens.every((token) => token instanceof Token);
    if (!isNaN(startIndex) && this.inboundIndex(startIndex) && isTokenType) {
      const replaced = this.tokens.splice(startIndex, offset, ...tokens);
      if (!silent) this.dispatch("replaceToken", [startIndex, offset, tokens]);
      return [replaced, tokens];
    }
    return { FAIL: "replaceRange: invalid tokens or startIndex." };
  }

  replaceToken(index: number, token: Token, silent?: boolean): [Token, Token] | FailResult {
    if (!isNaN(index) && this.inboundIndex(index) && token instanceof Token) {
      const replaced = this.tokens.splice(index, 1, token);
      if (!silent) this.dispatch("replaceToken", [index, token]);
      return [replaced[0] as Token, token];
    }
    return { FAIL: "replaceToken: invalid token or index." };
  }

  removeRange(startIndex: number, offset?: number, silent?: boolean): Token[] {
    offset = !isNaN(offset as number) ? (offset as number) : this.tokens.length;
    const tokens = this.tokens.splice(startIndex, offset);
    if (!silent) this.dispatch("removeRange", [tokens, startIndex, offset]);
    return tokens;
  }

  removeToken(index: number, silent?: boolean): Token[] | FailResult {
    if (!isNaN(index) && this.inboundIndex(index)) {
      const token = this.tokens.splice(index, 1);
      if (!silent) this.dispatch("removeToken", [token, index]);
      return token;
    }
    return { FAIL: "removeToken: invalid token index." };
  }

  insertToken(tokens: Token[], index: number, silent?: boolean): Token[] | FailResult {
    const tokenType = tokens.every((token) => token instanceof Token);
    if (tokenType) {
      this.tokens.splice(index, 0, ...tokens);
      if (!silent) this.dispatch("insertToken", [tokens, index]);
      return tokens;
    }
    return { FAIL: "insertToken: invalid token(s)." };
  }

  /**
   * On every new token, if condition is null or returns true, sets the
   * token's modifierId state to what modifier returns.
   */
  registerModifier(
    modifierId: string,
    condition: ((token: Token, contextParams: ContextParams<string>) => boolean) | null,
    modifier: (token: Token, contextParams: ContextParams<string>) => TokenValue,
  ): void {
    this.events.newToken.subscribe(function (
      this: Tokenizer,
      token: Token,
      contextParams: ContextParams<string>,
    ) {
      const canApplyModifier =
        condition === null || condition.apply(this, [token, contextParams]) === true;
      if (canApplyModifier) {
        const newStateValue = modifier.apply(this, [token, contextParams]);
        token.setState(modifierId, newStateValue);
      }
    });
    this.registeredModifiers.push(modifierId);
  }

  rangeToText(range: ContextRange): string | undefined {
    if (range instanceof ContextRange) {
      return this.getRangeTokens(range)
        .map((token) => token.char)
        .join("");
    }
    return undefined;
  }

  getText(): string {
    return this.tokens.map((token) => token.char).join("");
  }

  getContext(contextName: string): ContextChecker | null {
    const context = this.registeredContexts[contextName];
    return context ? context : null;
  }

  on(eventName: string, eventHandler: AnyHandler): number | FailResult | null {
    const event = (this.events as Record<string, Event | undefined>)[eventName];
    if (event) {
      return event.subscribe(eventHandler);
    }
    return null;
  }

  dispatch(eventName: string, args?: unknown[]): void {
    const event = (this.events as Record<string, Event | undefined>)[eventName];
    if (event instanceof Event) {
      event.subscribers.forEach((subscriber) => {
        subscriber.apply(this, args || []);
      });
    }
  }

  registerContextChecker(
    contextName: string,
    contextStartCheck: ContextCheck,
    contextEndCheck: ContextCheck,
  ): ContextChecker | FailResult {
    if (this.getContext(contextName)) {
      return { FAIL: "context name " + contextName + " is already registered." };
    }
    if (typeof contextStartCheck !== "function") {
      return { FAIL: "missing context start check." };
    }
    if (typeof contextEndCheck !== "function") {
      return { FAIL: "missing context end check." };
    }
    const contextChecker = new ContextChecker(contextName, contextStartCheck, contextEndCheck);
    this.registeredContexts[contextName] = contextChecker;
    this.contextCheckers.push(contextChecker);
    return contextChecker;
  }

  getRangeTokens(range: ContextRange): Token[] {
    const endIndex = range.startIndex + (range.endOffset as number);
    return ([] as Token[]).concat(this.tokens.slice(range.startIndex, endIndex));
  }

  getContextRanges(contextName: string): ContextRange[] | FailResult {
    const context = this.getContext(contextName);
    if (context) {
      return context.ranges;
    }
    return { FAIL: "context checker " + contextName + " is not registered." };
  }

  resetContextsRanges(): void {
    const registeredContexts = this.registeredContexts;
    for (const contextName in registeredContexts) {
      if (Object.prototype.hasOwnProperty.call(registeredContexts, contextName)) {
        (registeredContexts[contextName] as ContextChecker).ranges = [];
      }
    }
  }

  updateContextsRanges(): void {
    this.resetContextsRanges();
    const chars = this.tokens.map((token) => token.char);
    for (let i = 0; i < chars.length; i++) {
      const contextParams = new ContextParams(chars, i);
      this.runContextCheck(contextParams);
    }
    this.dispatch("updateContextsRanges", [this.registeredContexts]);
  }

  setEndOffset(offset: number, contextName: string): ContextRange {
    const context = this.getContext(contextName) as ContextChecker;
    const startIndex = (context.openRange as ContextRange).startIndex;
    const range = new ContextRange(startIndex, offset, contextName);
    const ranges = context.ranges;
    range.rangeId = contextName + "." + ranges.length;
    ranges.push(range);
    context.openRange = null;
    return range;
  }

  runContextCheck(contextParams: ContextParams<string>): void {
    const index = contextParams.index;
    this.contextCheckers.forEach((contextChecker) => {
      const contextName = contextChecker.contextName;
      const context = this.getContext(contextName) as ContextChecker;
      let openRange = context.openRange;
      if (!openRange && contextChecker.checkStart(contextParams)) {
        openRange = new ContextRange(index, null, contextName);
        context.openRange = openRange;
        this.dispatch("contextStart", [contextName, index]);
      }
      if (openRange && contextChecker.checkEnd(contextParams)) {
        const offset = index - openRange.startIndex + 1;
        const range = this.setEndOffset(offset, contextName);
        this.dispatch("contextEnd", [contextName, range]);
      }
    });
  }

  /** Splits the text into one token per code point and runs the checkers and modifiers. */
  tokenize(text: string): Token[] {
    this.tokens = [];
    this.resetContextsRanges();
    const chars = Array.from(text);
    this.dispatch("start");
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i] as string;
      const contextParams = new ContextParams(chars, i);
      this.dispatch("next", [contextParams]);
      this.runContextCheck(contextParams);
      const token = new Token(char);
      this.tokens.push(token);
      this.dispatch("newToken", [token, contextParams]);
    }
    this.dispatch("end", [this.tokens]);
    return this.tokens;
  }
}
