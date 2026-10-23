// Old: chunk.vendor.js module 470 (the GL texture registry, exposed for
// debugging as GGLMemoryManager).
//
// The old registry stored textures in an array under `texture.id`. For
// recorded textures that was a number; for real ones it is a WebGLTexture,
// which as a key becomes the string "[object WebGLTexture]". Real textures
// therefore share one slot that the array walks (slice, forEach) never see,
// so flush, destroyTextures and checkMemory find nothing. With the recorder
// gone every texture is real; the behaviour is kept.

/** What the registry needs of a texture. */
export interface RegisteredTexture {
  id: unknown;
  width: number;
  height: number;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old registry was a static-only object
export class GLTextures {
  static _textures: RegisteredTexture[] = [];

  private static _slots(): Record<string, RegisteredTexture | undefined> {
    return this._textures as unknown as Record<string, RegisteredTexture | undefined>;
  }

  static addTexture(texture: RegisteredTexture | null | undefined): void {
    if (texture && texture.id) this._slots()[String(texture.id)] = texture;
  }

  static deleteTexture(texture: RegisteredTexture | null | undefined): void {
    if (texture && texture.id) Reflect.deleteProperty(this._slots(), String(texture.id));
  }

  /** Forgets entries without a texture. */
  static flush(): void {
    this._textures.slice().forEach((texture, index) => {
      if (!texture.id) Reflect.deleteProperty(this._textures, index);
    });
  }

  static destroyTextures(gl?: WebGLRenderingContext | null): void {
    this.flush();
    this._textures.slice().forEach((texture) => {
      if (
        null !== texture.id &&
        "undefined" != typeof WebGLTexture &&
        texture.id instanceof WebGLTexture
      ) {
        if (gl) gl.deleteTexture(texture.id);
      }
      this.deleteTexture(texture);
      texture.id = null;
    });
  }

  static checkMemory(): { textures: number; unrendered: number; bytes: number } {
    let bytes = 0;
    let textures = 0;
    const unrendered = 0;
    this._textures.forEach((texture) => {
      if (texture.id) {
        bytes += texture.width * texture.height * 8;
        textures += 1;
      }
    });
    return { textures, unrendered, bytes };
  }
}
