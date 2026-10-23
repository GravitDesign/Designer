import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import type { Font } from "../../engine/text/fonts/font.ts";
import {
  FontsProviderManager,
  MissingFontEvent,
  type FontRequest,
  type QueryResult,
} from "./font-manager.ts";
import {
  FontsProvider,
  FontsProviderErrors,
  type FontsProviderError,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import { MissingFontTracker } from "./missing-font-tracker.ts";
import { FontAvailabilityTracker } from "./font-availability-tracker.ts";

/** Lists and resolves its families synchronously; records what it was asked. */
abstract class TestProvider extends FontsProvider {
  abstract families: string[];
  resolveError: FontsProviderError | undefined = undefined;
  asked: string[] = [];

  override load(query: string, start: number, count: number, callbacks: LoadCallbacks): void {
    callbacks.done(
      this.families
        .map((family): ListedFamily => ({ family, fonts: [{ weight: 400, style: "N" }] }))
        .filter(this._searchFilter(query))
        .slice(start, start + count),
    );
  }

  override getTotalFonts(query?: string): number {
    return query
      ? this.families.map((family) => ({ family })).filter(this._searchFilter(query)).length
      : this.families.length;
  }

  override getProviderId(): string {
    return this.constructor.name;
  }

  override resolveFont(
    family: string,
    _style: unknown,
    _weight: unknown,
    callbacks: ResolveCallbacks,
  ) {
    this.asked.push(family);
    if (this.families.includes(family) && this.resolveError === undefined) {
      callbacks.done(new ArrayBuffer(8));
    } else callbacks.fail(this.resolveError);
  }
}

let registered: (new (manager: FontsProviderManager) => TestProvider)[] = [];

const fakeFont = { isResolved: () => true } as unknown as Font;

function request(family: string): FontRequest & {
  resolved: Mock<(font: Font) => void>;
  failed: Mock<() => void>;
} {
  return {
    family,
    style: "N",
    weight: 400,
    resolved: vi.fn<(font: Font) => void>(),
    failed: vi.fn<() => void>(),
    tryToResolveMissingFont: true,
    sender: null,
  };
}

/**
 * Two fresh providers: the first has Alpha and Shared, the second Beta,
 * Shared and Gamma. The manager remembers which provider listed a family
 * for good, so each test gets its own family names (`prefix`).
 */
function setUp(prefix = ""): { first: TestProvider; second: TestProvider } {
  class FirstProvider extends TestProvider {
    families = [prefix + "Alpha", prefix + "Shared"];
  }
  class SecondProvider extends TestProvider {
    families = [prefix + "Beta", prefix + "Shared", prefix + "Gamma"];
  }
  registered = [FirstProvider, SecondProvider];
  FontsProviderManager.registerProvider(FirstProvider);
  FontsProviderManager.registerProvider(SecondProvider);
  return {
    first: FontsProviderManager.getProviderInstance(FirstProvider) as TestProvider,
    second: FontsProviderManager.getProviderInstance(SecondProvider) as TestProvider,
  };
}

afterEach(() => {
  for (const providerClass of registered) FontsProviderManager.unregisterProvider(providerClass);
  registered = [];
  FontsProviderManager.getInstance().reset();
  vi.restoreAllMocks();
});

describe("FontsProviderManager.resolveFont", () => {
  it("asks the providers in order until one has the font", () => {
    vi.spyOn(OpenTypeFont, "create").mockReturnValue(fakeFont as OpenTypeFont);
    const { first, second } = setUp();
    const beta = request("Beta");
    FontsProviderManager.resolveFont(beta);
    expect(first.asked).toEqual(["Beta"]);
    expect(second.asked).toEqual(["Beta"]);
    expect(beta.resolved).toHaveBeenCalledWith(fakeFont);
    expect(beta.failed).not.toHaveBeenCalled();
  });

  it("fails a font nobody has and reports it as missing", () => {
    const { first, second } = setUp();
    const tracker = new MissingFontTracker();
    tracker.start();
    const missing = request("Nowhere");
    FontsProviderManager.resolveFont(missing);
    FontsProviderManager.resolveFont(request("Nowhere"));
    tracker.stop();
    expect(first.asked).toEqual(["Nowhere", "Nowhere"]);
    expect(second.asked).toEqual(["Nowhere", "Nowhere"]);
    expect(missing.failed).toHaveBeenCalledTimes(1);
    expect(tracker.getMissingFonts()).toEqual(["Nowhere"]);
  });

  it("tries the next provider when a file doesn't parse", () => {
    const create = vi.spyOn(OpenTypeFont, "create");
    create.mockReturnValueOnce(null).mockReturnValueOnce(fakeFont as OpenTypeFont);
    const { second } = setUp();
    const shared = request("Shared");
    FontsProviderManager.resolveFont(shared);
    expect(second.asked).toEqual(["Shared"]);
    expect(shared.resolved).toHaveBeenCalledWith(fakeFont);
  });

  it("keeps a font the engine resolved meanwhile", () => {
    const create = vi.spyOn(OpenTypeFont, "create");
    setUp();
    const engine = new FontManager();
    const known = { isResolved: () => true } as unknown as Font;
    vi.spyOn(engine, "_getFont").mockReturnValue(known);
    const alpha = request("Alpha");
    alpha.sender = engine;
    FontsProviderManager.resolveFont(alpha);
    expect(create).not.toHaveBeenCalled();
    expect(alpha.resolved).toHaveBeenCalledWith(known);
  });

  it("goes straight to the provider that listed the family", () => {
    vi.spyOn(OpenTypeFont, "create").mockReturnValue(fakeFont as OpenTypeFont);
    const { first, second } = setUp("A ");
    FontsProviderManager.getInstance().query(() => {}, "%", true);
    expect(FontsProviderManager.getProvider("A Shared")).toBe(first);
    expect(FontsProviderManager.getProvider("A Gamma")).toBe(second);
    FontsProviderManager.resolveFont(request("A Gamma"));
    expect(first.asked).toEqual([]);
    expect(second.asked).toEqual(["A Gamma"]);
  });

  it("leaves a listed font pending when its download had no connection", () => {
    const { second } = setUp("B ");
    FontsProviderManager.getInstance().query(() => {}, "%", true);
    second.resolveError = FontsProviderErrors.ConnectionError;
    const gamma = request("B Gamma");
    FontsProviderManager.resolveFont(gamma);
    expect(gamma.resolved).not.toHaveBeenCalled();
    expect(gamma.failed).not.toHaveBeenCalled();
    second.resolveError = FontsProviderErrors.UnknownError;
    const again = request("B Gamma");
    const missing = vi.fn();
    FontsProviderManager.getInstance().addEventListener(MissingFontEvent, missing);
    FontsProviderManager.resolveFont(again);
    FontsProviderManager.getInstance().removeEventListener(MissingFontEvent, missing);
    expect(again.failed).toHaveBeenCalledTimes(1);
    expect((missing.mock.calls[0]?.[0] as MissingFontEvent).provider).toBe(second);
  });
});

describe("FontsProviderManager.query", () => {
  it("merges the providers' families sorted by name and caches the result", () => {
    setUp("C ");
    const manager = FontsProviderManager.getInstance();
    const results: QueryResult[] = [];
    manager.query((result) => results.push(result), "%");
    // The previews pass that follows calls nobody.
    expect(results).toHaveLength(1);
    expect(results[0]?.faces.map((face) => face.family)).toEqual([
      "C Alpha",
      "C Beta",
      "C Gamma",
      "C Shared",
      "C Shared",
    ]);
    expect(results[0]?.total).toBe(5);
    const cached: QueryResult[] = [];
    manager.query((result) => cached.push(result), "%");
    expect(cached).toEqual([results[0]]);
    // A longer query is answered from the shorter one's complete result.
    const narrowed: QueryResult[] = [];
    manager.query((result) => narrowed.push(result), "c ga%");
    expect(narrowed[0]?.faces.map((face) => face.family)).toEqual(["C Gamma"]);
  });

  it("answers QueryFontFamilyEvent from the full cache", () => {
    setUp("D ");
    const answers: unknown[] = [];
    const event = { family: "D Beta", callback: (fonts: unknown) => answers.push(fonts) };
    FontsProviderManager.resolveQueryFontFamily(event as never);
    FontsProviderManager.resolveQueryFontFamily({ ...event, family: "Nowhere" } as never);
    expect(answers).toEqual([[{ weight: 400, style: "N" }], []]);
  });

  it("normalizes queries to one trailing %", () => {
    const manager = FontsProviderManager.getInstance();
    expect(manager.normalizeQuery("%")).toBe("%");
    expect(manager.normalizeQuery("")).toBe("%");
    expect(manager.normalizeQuery("ab%%")).toBe("ab%");
    expect(manager.normalizeQuery("ab")).toBe("ab%");
  });
});

describe("FontAvailabilityTracker", () => {
  it("resolves once the font manager has no pending fonts", async () => {
    const engine = new FontManager();
    let finish: (() => void) | null = null;
    engine.addEventListener(FontManager.ResolveFontEvent, (event) => {
      finish = () => event.failed();
    });
    engine.getFont("Somewhere", "N", 400);
    let done = false;
    void new FontAvailabilityTracker(engine).waitForAllPendingFonts().then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    (finish as unknown as () => void)();
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
