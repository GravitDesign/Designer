/**
 * Scenarios for the font manager's listing logic (paging, merge order,
 * prefix cache, provider switching, reset, eviction). They run against
 * the new FontsProviderManager in font-manager.test.ts and, transpiled to
 * plain JavaScript, against the old module 255 in the old app page, which
 * recorded font-manager-scenarios.json. So this file must not import
 * anything: it gets the manager, the provider base class and the error
 * codes passed in.
 */

export interface ScenarioFamily {
  family: string;
  fonts: { weight: number; style: string }[];
}

interface ScenarioCallbacks {
  done(families: ScenarioFamily[]): void;
  fail(error?: number): void;
}

interface ScenarioResult {
  faces: ScenarioFamily[];
  total?: number;
}

type ScenarioCallback = (result: ScenarioResult) => void;

/** What the scenarios use of a provider instance. */
export interface ScenarioProvider {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  _searchFilter(query: string): (family: { family: string }) => boolean;
}

/** What the scenarios use of the manager instance. */
export interface ScenarioManagerInstance {
  query(callback: ScenarioCallback, query: string, all?: boolean): void;
  loadMore(callback: ScenarioCallback, query: string): number | undefined;
  reset(providerClass?: unknown, force?: boolean, keepFull?: boolean): void;
  isCacheEmpty(): boolean;
  isLoading(): boolean;
  _firstCallback: ScenarioCallback | null;
  _resetProviders: unknown[] | null;
}

export interface ScenarioEnv {
  Manager: {
    getInstance(): ScenarioManagerInstance;
    registerProvider(providerClass: unknown): void;
    unregisterProvider(providerClass: unknown): void;
    getProviderInstance(providerClass: unknown): unknown;
    getProvider(family: string): unknown;
    disableProviders(classes: unknown[]): void;
    enableProviders(classes: unknown[], keepOthers?: boolean): void;
  };
  /** The provider base class (GFontsProvider). */
  Base: new (manager: unknown) => ScenarioProvider;
  Errors: { UnknownError: number; ConnectionError: number };
}

/** A provider's script: its families, an optional fake total and hooks. */
interface Script {
  families: string[];
  total?: number;
  /** Called in load before it answers; returning false keeps the answer back. */
  beforeDone?: (provider: ScenarioProvider) => boolean | undefined;
  failWith?: number;
}

interface Made {
  cls: unknown;
  instance: ScenarioProvider;
  script: Script;
  name: string;
}

export function runFontManagerScenarios(env: ScenarioEnv): Record<string, unknown> {
  const { Manager, Base, Errors } = env;
  const manager = Manager.getInstance();
  const log: string[] = [];
  let made: Made[] = [];
  const held: (() => void)[] = [];

  const summary = (faces: ScenarioFamily[] | undefined): unknown => {
    if (!faces) return null;
    if (faces.length <= 12) return faces.map((face) => face.family);
    return {
      n: faces.length,
      head: faces.slice(0, 3).map((face) => face.family),
      tail: faces.slice(-3).map((face) => face.family),
      // Where the families of the other providers are in a long list.
      others: faces
        .map((face, index) => (face.family.indexOf("#") < 0 ? index + ":" + face.family : null))
        .filter((entry) => entry !== null),
    };
  };

  const recorder = (name: string): ScenarioCallback => {
    return (result) => {
      log.push(
        name + " -> " + JSON.stringify({ faces: summary(result.faces), total: result.total }),
      );
    };
  };

  const make = (name: string, script: Script): Made => {
    class ScriptedProvider extends Base {
      load(query: string, start: number, count: number, callbacks: ScenarioCallbacks): void {
        log.push(name + ".load(" + query + ", " + start + ", " + count + ")");
        if (script.failWith !== undefined) {
          callbacks.fail(script.failWith);
          return;
        }
        const families = script.families
          .map((family) => ({ family, fonts: [{ weight: 400, style: "N" }] }))
          .filter(this._searchFilter(query))
          .slice(start, start + count);
        const answer = (): void => callbacks.done(families);
        if (script.beforeDone && script.beforeDone(this) === false) held.push(answer);
        else answer();
      }
      getTotalFonts(query?: string): number {
        if (script.total !== undefined) return script.total;
        return query
          ? script.families.map((family) => ({ family })).filter(this._searchFilter(query)).length
          : script.families.length;
      }
      getProviderId(): string {
        return name;
      }
      addPreviews(): void {}
      resolveFont(
        _family: string,
        _style: unknown,
        _weight: unknown,
        callbacks: ScenarioCallbacks,
      ) {
        callbacks.fail(Errors.UnknownError);
      }
      resetProvider(): void {
        log.push(name + ".resetProvider()");
      }
    }
    Manager.registerProvider(ScriptedProvider);
    const entry: Made = {
      cls: ScriptedProvider,
      instance: Manager.getProviderInstance(ScriptedProvider) as ScenarioProvider,
      script,
      name,
    };
    made.push(entry);
    return entry;
  };

  const enabled = (): string => made.map((m) => m.name + "=" + m.instance.isEnabled()).join(" ");

  const clean = (): void => {
    for (const m of made) Manager.unregisterProvider(m.cls);
    made = [];
    held.length = 0;
    manager._firstCallback = null;
    manager._resetProviders = null;
    manager.reset();
  };

  const many = (prefix: string, count: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(prefix + "#" + String(i).padStart(5, "0"));
    return out;
  };

  const scenarios: Record<string, () => void> = {
    merge() {
      make("A", { families: ["Mg Bravo", "Mg Delta"] });
      make("B", { families: ["Mg Alpha", "Mg Charlie", "Mg Echo"] });
      make("C", { families: ["Mg Foxtrot", "Mg Bravo"] });
      manager.query(recorder("query %"), "%");
      manager.query(recorder("query % again"), "%");
      manager.query(recorder("query mg c"), "mg c");
      log.push("owner of Mg Bravo: " + (Manager.getProvider("Mg Bravo") === made[0]?.instance));
    },
    paging() {
      // A first provider with more than a full page, then a short one whose
      // families sort between the first one's.
      make("P", { families: many("Pg ", 10005) });
      make("Q", { families: ["Pg A", "Pg Z"] });
      const first = manager.query(recorder("query %"), "%");
      void first;
      log.push("loadMore " + manager.loadMore(recorder("loadMore 1"), "%"));
      log.push("loadMore " + manager.loadMore(recorder("loadMore 2"), "%"));
      manager.query(recorder("query % cached"), "%");
    },
    pagingTwoProviders() {
      // The second page starts inside the second provider.
      make("P", { families: many("Pt a", 6000) });
      make("Q", { families: many("Pt b", 6000) });
      manager.query(recorder("query %"), "%");
      log.push("loadMore " + manager.loadMore(recorder("loadMore 1"), "%"));
      log.push("loadMore " + manager.loadMore(recorder("loadMore 2"), "%"));
    },
    loadMoreFirstPage() {
      make("A", { families: ["Lm One", "Lm Two"] });
      log.push("loadMore " + manager.loadMore(recorder("loadMore first"), "%"));
      log.push("loadMore " + manager.loadMore(recorder("loadMore second"), "%"));
    },
    loadMoreWhileLoading() {
      make("A", { families: ["Ll One"], beforeDone: () => false });
      manager.query(recorder("query %"), "%");
      log.push("loading " + manager.isLoading());
      log.push("loadMore " + manager.loadMore(recorder("loadMore"), "%"));
      (held.shift() as () => void)();
      log.push("loading " + manager.isLoading());
    },
    prefixCache() {
      make("A", { families: ["Px Alpha", "Px Beta", "Px Gamma", "Pz Other"] });
      manager.query(recorder("query px"), "px");
      manager.query(recorder("query px al"), "px al");
      manager.query(recorder("query px gam"), "px gam");
      manager.query(recorder("query pz o"), "pz o");
    },
    prefixCacheIncomplete() {
      // A shorter query with a full page and more fonts than listed doesn't
      // answer a longer one.
      make("A", { families: many("Pi ", 10005) });
      manager.query(recorder("query pi"), "pi");
      manager.query(recorder("query pi #0000"), "pi #0000");
    },
    disabledWhileLoading() {
      make("A", {
        families: ["Dw Alpha"],
        beforeDone: (provider) => {
          provider.setEnabled(false);
          return true;
        },
      });
      make("B", { families: ["Dw Beta"] });
      manager.query(recorder("query %"), "%");
      log.push(enabled());
    },
    providerSwitching() {
      const a = make("A", { families: ["Ps A"] });
      const b = make("B", { families: ["Ps B"] });
      make("C", { families: ["Ps C"] });
      Manager.disableProviders([a.cls, b.cls]);
      log.push("disable [A, B]: " + enabled());
      Manager.enableProviders([a.cls, b.cls]);
      log.push("enable [A, B]: " + enabled());
      Manager.enableProviders([a.cls], true);
      log.push("enable [A] keep: " + enabled());
      manager.query(recorder("query % with disabled"), "%");
      manager.query(recorder("query % all"), "%", true);
      log.push("cache empty " + manager.isCacheEmpty());
    },
    reset() {
      const a = make("A", { families: ["Rs A"] });
      const b = make("B", { families: ["Rs B"] });
      manager.query(recorder("query % all"), "%", true);
      log.push("cache empty " + manager.isCacheEmpty());
      manager.reset(null, false, true);
      log.push("after keepFull: cache empty " + manager.isCacheEmpty());
      manager.query(recorder("query % all again"), "%", true);
      b.instance.setEnabled(false);
      manager.reset(b.cls);
      manager.reset(b.cls, true);
      manager.reset(a.cls);
      log.push("after reset: cache empty " + manager.isCacheEmpty());
      manager._firstCallback = recorder("first callback");
      manager.reset();
    },
    connectionError() {
      make("A", { families: ["Ce A"], failWith: Errors.ConnectionError });
      make("B", { families: ["Ce B"], failWith: Errors.UnknownError });
      manager.query(recorder("query %"), "%");
      log.push(
        "reset providers " + (manager._resetProviders ? manager._resetProviders.length : null),
      );
      log.push("first queued is A " + (manager._resetProviders?.[0] === made[0]?.cls));
    },
    eviction() {
      make("A", { families: ["Ev A"] });
      for (let i = 0; i <= 30; i++) manager.query(() => {}, "ev" + i);
      log.length = 0;
      manager.query(recorder("query ev0"), "ev0");
      manager.query(recorder("query ev30"), "ev30");
      manager.query(recorder("query ev1"), "ev1");
    },
  };

  const out: Record<string, unknown> = {};
  clean();
  for (const name of Object.keys(scenarios)) {
    log.length = 0;
    try {
      (scenarios[name] as () => void)();
    } catch (error) {
      log.push("threw " + String(error));
    }
    out[name] = log.slice();
    clean();
  }
  return out;
}
