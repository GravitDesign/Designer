/**
 * Webpack Module #554
 * Type: unknown
 */

function (e, t) {
    class n {
      getImageAsBlob() {
        return new Blob([this.getImageAsBinary()], {
          type: this.getMimeType(),
        });
      }
      getImageAsBinary() {
        const e = atob(this.getImageAsBase64()),
          t = new Uint8Array(e.length);
        for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
        return t;
      }
      getMimeType() {
        return this.mimeType;
      }
      getImageAsDataURL() {
        return this.image;
      }
      getImageAsBase64() {
        return this.image.split("base64,")[1];
      }
      static async fromBlob(e) {
        const t = new n(),
          o = await new Promise((t) => {
            const n = new FileReader();
            (n.onload = function (e) {
              t(e.target.result);
            }),
              n.readAsDataURL(e);
          });
        return (t.image = o), (t.mimeType = e.type), t;
      }
    }
    e.exports = n;
  }