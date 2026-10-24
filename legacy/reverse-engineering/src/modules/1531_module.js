/**
 * Webpack Module #1531
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(4), n(13), n(38);
    var o = n(1);
    const { FILE_FORMATS: i, gApi: a } = n(10),
      r = i.find((e) => e.default),
      { COMMAND_SAVE: s, COMMAND_SYNC_IMAGES: l } = n(591),
      c = n(1164);
    e.exports = class extends c {
      constructor(e, t) {
        super(e, t);
      }
      async updateFileSceneAndMetadata(e, t, n, o) {
        await this._syncSceneImages(e, n);
        const { sceneSnapshot: i, urls: r } = await this._saveScene(e, t, n);
        return (
          console.log({ documentId: e, file: t, sceneSnapshot: i, urls: r }),
          await this._saveThumbnail(o.thumbnail.getImageAsBlob(), r.url_t),
          await a.commitAutoSaveFileUpdate(t.id),
          a.getFile(e + "?edit")
        );
      }
      _syncSceneImages(e, t) {
        return new Promise((n) => {
          let i = t.getDictionary().getEntries(),
            r = [];
          (i = i.map(
            (e) => (
              e.hasOwnProperty("cachedCanvas") && (e.cachedCanvas = null), e
            )
          )),
            t.acceptChildren((e) => {
              e instanceof o.GImage &&
                r.push({
                  name: e.getProperty("name"),
                  url: e.getProperty("url"),
                });
            });
          const s = Object.create(t),
            c = this._request(l.REQUEST, {
              id: e,
              images: r,
              entries: i,
              cloudURL: a.url,
            });
          this._worker.addEventListener(
            "message",
            function (e) {
              const { cmd: t, id: i, data: a } = e.data;
              if (t !== l.SUCCESS || i !== c) return !1;
              let r = s.getDictionary();
              s.setCloudSynchronization(null);
              let d = new o.GDictionary();
              return d.deserialize(a), r.merge(d), n(), !0;
            }.bind(this),
            { once: !0 }
          );
        });
      }
      _saveScene(e, t, n) {
        return new Promise((i, a) => {
          let l = o.GNode.serialize(n, { save: !0 });
          const c = Object.create(n),
            d = this._request(s.REQUEST, {
              id: e,
              file: t,
              scene: l,
              type: r.type,
            });
          this._worker.addEventListener(
            "message",
            function (e) {
              const { cmd: t, id: n, data: o } = e.data;
              if ((t !== s.SUCCESS && t !== s.FAILED) || n !== d) return !1;
              t === s.SUCCESS
                ? i({ sceneSnapshot: c, urls: o.urls })
                : t === s.FAILED && a();
              return !0;
            }.bind(this),
            { once: !0 }
          );
        });
      }
      _saveThumbnail(e, t) {
        const n = new XMLHttpRequest();
        n.open("PUT", t);
        const o = {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public,max-age=31600000",
        };
        for (var i in o) n.setRequestHeader(i, o[i]);
        n.send(e);
      }
    };
  }