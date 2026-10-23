// Test support: drives GSceneDictionary inside a real scene (flush,
// release, texture fills, swatches and url resolution) and returns plain
// data. The same function runs in the old app's page against the old
// engine (to record __fixtures__/old-scene-dictionary.json; the
// TypeScript types are stripped first) and against the port in
// scene-dictionary.test.ts, so it may only use what it is given and no
// imports.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface SceneDictionaryProbeApi {
  Scene: any;
  /** GWorkspace (with GWorkspace.ResolveUrlEvent). */
  Workspace: any;
  Image: any;
  Rectangle: any;
  Group: any;
  /** GStylable (for GStylable.FillPaintLayer). */
  Stylable: any;
  TexturePattern: any;
  Swatch: any;
}

export function probeSceneDictionary(api: SceneDictionaryProbeApi): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const DATA_A = "data:image/png;base64,QUFBQQ==";
  const DATA_B = "data:image/png;base64,QkJCQg==";
  const DATA_C = "data:image/png;base64,Q0NDQw==";

  const newScene = () => {
    const workspace = new api.Workspace();
    const scene = new api.Scene(workspace);
    const decreased: unknown[] = [];
    const increase = workspace.increaseMemoryForImage.bind(workspace);
    const decrease = workspace.decreaseMemoryForImage.bind(workspace);
    // Tagged stand-ins for canvases: the memory calls are recorded by tag.
    workspace.increaseMemoryForImage = (image: any) =>
      image && image.tag ? true : increase(image);
    workspace.decreaseMemoryForImage = (image: any) => {
      decreased.push(image && image.tag ? image.tag : image);
      if (!(image && image.tag)) decrease(image);
    };
    return { workspace, scene, dictionary: scene.getDictionary(), decreased };
  };

  const target = (scene: any) => scene.getActiveLayer() || scene.getActivePage();

  const entriesOf = (dictionary: any) =>
    dictionary
      .getEntries()
      .map((entry: any) => [
        entry.value,
        entry.references,
        entry.cachedCanvas ? entry.cachedCanvas.tag : null,
      ]);

  const urlKind = (url: any) =>
    "string" == typeof url && 0 === url.indexOf("dictionary://") ? "dictionary" : url;

  const textureRect = (url: string) => {
    const rect = new api.Rectangle();
    const layer = new api.Stylable.FillPaintLayer();
    layer.setProperty("_pt", new api.TexturePattern(url));
    rect.getPaintLayers().appendChild(layer);
    return { rect, layer };
  };

  // -- flush: drops entries nothing uses; the memory of a dropped
  // entry's canvas is (or isn't) given back.
  {
    const { scene, dictionary, decreased } = newScene();
    const image = new api.Image();
    image.setProperty("url", DATA_A);
    target(scene).appendChild(image);
    const used = dictionary.getEntry(image.getProperty("url"));
    used.cachedCanvas = { tag: "used" };
    const unused = dictionary.putValueIfAbsent(DATA_B);
    unused.cachedCanvas = { tag: "unused" };
    const before = entriesOf(dictionary);
    dictionary.flush();
    out.flush = {
      imageUrl: urlKind(image.getProperty("url")),
      before,
      after: entriesOf(dictionary),
      decreased: decreased.slice(),
      unusedStillFound: !!dictionary.getEntry(unused.getUrl()),
    };
  }

  // -- release: memory back for every canvas, map emptied, listeners gone.
  {
    const { scene, dictionary, decreased } = newScene();
    const image = new api.Image();
    image.setProperty("url", DATA_A);
    target(scene).appendChild(image);
    dictionary.getEntry(image.getProperty("url")).cachedCanvas = { tag: "a" };
    const other = dictionary.putValueIfAbsent(DATA_B);
    other.cachedCanvas = { tag: "b" };
    dictionary.release();
    const released = {
      entries: entriesOf(dictionary),
      decreased: decreased.slice(),
      memory: dictionary._memory,
      otherCanvas: other.cachedCanvas,
    };
    const late = new api.Image();
    late.setProperty("url", DATA_C);
    target(scene).appendChild(late);
    out.release = {
      ...released,
      lateUrl: urlKind(late.getProperty("url")),
      entriesAfterInsert: entriesOf(dictionary),
    };
  }

  // -- texture fills: redirected to dictionary urls on insert, counted,
  // and released one reference per removed node.
  {
    const { scene, dictionary } = newScene();
    const one = textureRect(DATA_A);
    const before = one.layer.getProperty("_pt").getUrl();
    target(scene).appendChild(one.rect);
    const after = one.layer.getProperty("_pt").getUrl();
    const two = textureRect(DATA_A);
    target(scene).appendChild(two.rect);
    const steps: unknown[] = [entriesOf(dictionary)];
    dictionary.flush();
    steps.push(entriesOf(dictionary));
    target(scene).removeChild(one.rect);
    steps.push(entriesOf(dictionary));
    target(scene).removeChild(two.rect);
    steps.push(entriesOf(dictionary));
    dictionary.flush();
    steps.push(entriesOf(dictionary));
    out.texture = {
      before: urlKind(before),
      after: urlKind(after),
      sameEntry: two.layer.getProperty("_pt").getUrl() === after,
      steps,
    };
  }

  // -- a group removal drops only the group's own urls, not its children's.
  {
    const { scene, dictionary } = newScene();
    const group = new api.Group();
    const image = new api.Image();
    image.setProperty("url", DATA_A);
    group.appendChild(image);
    target(scene).appendChild(group);
    const inserted = entriesOf(dictionary);
    target(scene).removeChild(group);
    out.groupRemove = {
      imageUrl: urlKind(image.getProperty("url")),
      inserted,
      removed: entriesOf(dictionary),
    };
  }

  // -- swatches: a texture swatch gets an entry on insert but keeps its
  // plain url; a swatch with a dictionary url counts as a reference.
  {
    const { scene, dictionary } = newScene();
    const plain = new api.Swatch(new api.TexturePattern(DATA_A));
    scene.getSwatches().appendChild(plain);
    const plainUrl = plain.getProperty("_pt").getUrl();
    const inserted = entriesOf(dictionary);
    const entry = dictionary.putValueIfAbsent(DATA_B);
    const linked = new api.Swatch(new api.TexturePattern(DATA_C));
    linked.getProperty("_pt")._url = entry.getUrl();
    scene.getSwatches().appendChild(linked);
    const afterLinked = entriesOf(dictionary);
    dictionary.flush();
    out.swatch = {
      plainUrl: urlKind(plainUrl),
      inserted,
      afterLinked,
      flushed: entriesOf(dictionary),
    };
  }

  // -- url resolution: file, http, data and // values answer directly,
  // anything else (a cloud id) is asked of the workspace again; urls of
  // another scene and unknown entries are ignored.
  {
    const { workspace, scene, dictionary } = newScene();
    const other = new api.Scene(workspace);
    const events: unknown[] = [];
    const resolved: unknown[] = [];
    const done = (url: string) => resolved.push(url);
    workspace.addEventListener(api.Workspace.ResolveUrlEvent, (event: any) =>
      events.push([urlKind(event.url), event.scene === scene, event.resolved === done]),
    );
    const values = [
      "FILE:///c/x.png",
      "https://host/x.png",
      DATA_A,
      "//host/x.png",
      "cloud-id-1",
      "Data:x",
    ];
    for (const value of values) {
      const entry = dictionary.putValueIfAbsent(value);
      workspace.resolveUrl(entry.getUrl(), done, scene);
    }
    const first = dictionary.getEntries()[0];
    workspace.resolveUrl(first.getUrl(), done, other);
    workspace.resolveUrl("dictionary://missing", done, scene);
    out.resolve = { events, resolved };
  }

  // -- sanitize recreates a texture fill's missing entry from its raw url.
  {
    const { scene, dictionary } = newScene();
    const one = textureRect(DATA_A);
    target(scene).appendChild(one.rect);
    const pattern = one.layer.getProperty("_pt");
    const url = pattern.getUrl();
    pattern._storedUrl = DATA_B;
    const entry = dictionary.getEntry(url);
    Reflect.deleteProperty(dictionary._map, entry.uuid);
    dictionary.sanitize();
    const recreated = dictionary.getEntry(url);
    out.sanitizeTexture = {
      recreated: !!recreated,
      value: recreated ? recreated.value : null,
      references: recreated ? recreated.references : null,
      sameUuid: recreated ? recreated.uuid === entry.uuid : null,
    };
  }

  return out;
}
