// Old: designer.browser.dev.js module 554.
/**
 * An image kept as a data URL with its MIME type: the document thumbnail
 * (module 790) and the cloud metadata build one with fromBlob and read it
 * back as a Blob, bytes, the data URL or the bare base64.
 */
export class StorageImageData {
  /** The data URL ("data:<mime>;base64,..."). */
  image = "";
  mimeType = "";

  getImageAsBlob(): Blob {
    return new Blob([this.getImageAsBinary()], { type: this.getMimeType() });
  }

  getImageAsBinary(): Uint8Array<ArrayBuffer> {
    const binary = atob(this.getImageAsBase64());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  getMimeType(): string {
    return this.mimeType;
  }

  getImageAsDataURL(): string {
    return this.image;
  }

  /** The part after "base64," (undefined, which atob reads as "undefined", without it). */
  getImageAsBase64(): string {
    return this.image.split("base64,")[1] as string;
  }

  static async fromBlob(blob: Blob): Promise<StorageImageData> {
    const data = new StorageImageData();
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    data.image = url;
    data.mimeType = blob.type;
    return data;
  }
}
