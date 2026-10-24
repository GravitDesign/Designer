/**
 * Webpack Module #1108
 * Type: unknown
 */

function (t, n, o) {
    "use strict";
    o(96), o(57), o(20), o(151), o(38);
    var i = function () {
      (this.interval = 1e3), (this.maxInterval = 6e4);
    };
    (i.prototype.retry = function (e) {
      setTimeout(e, this.interval), (this.interval = this.nextInterval_());
    }),
      (i.prototype.reset = function () {
        this.interval = 1e3;
      }),
      (i.prototype.nextInterval_ = function () {
        var e = 2 * this.interval + this.getRandomInt_(0, 1e3);
        return Math.min(e, this.maxInterval);
      }),
      (i.prototype.getRandomInt_ = function (e, t) {
        return Math.floor(Math.random() * (t - e + 1) + e);
      });
    var a = function (e) {
      var t = function () {};
      if (
        ((this.file = e.file),
        (this.contentType =
          e.contentType || this.file.type || "application/octet-stream"),
        (this.metadata = e.metadata || {
          name: this.file.name,
          mimeType: this.contentType,
        }),
        (this.token = e.token),
        (this.onComplete = e.onComplete || t),
        (this.onProgress = e.onProgress || t),
        (this.onError = e.onError || t),
        (this.offset = e.offset || 0),
        (this.chunkSize = e.chunkSize || 0),
        (this.retryHandler = new i()),
        (this.url = e.url),
        !this.url)
      ) {
        var n = e.params || {};
        (n.uploadType = "resumable"),
          (this.url = this.buildUrl_(e.fileId, n, e.baseUrl));
      }
      this.httpMethod = e.fileId ? "PATCH" : "POST";
    };
    (a.prototype.upload = function () {
      var e = new XMLHttpRequest();
      e.open(this.httpMethod, this.url, !0),
        e.setRequestHeader("Authorization", "Bearer " + this.token),
        e.setRequestHeader("Content-Type", "application/json"),
        e.setRequestHeader("X-Upload-Content-Length", this.file.size),
        e.setRequestHeader("X-Upload-Content-Type", this.contentType),
        (e.onload = function () {
          if (e.status < 400) {
            var t = e.getResponseHeader("Location");
            (this.url = t), this.sendFile_();
          } else this.onUploadError_(e);
        }.bind(this)),
        (e.onerror = this.onUploadError_.bind(this, e)),
        e.send(JSON.stringify(this.metadata));
    }),
      (a.prototype.sendFile_ = function () {
        var e = this.file,
          t = this.file.size;
        (this.offset || this.chunkSize) &&
          (this.chunkSize &&
            (t = Math.min(this.offset + this.chunkSize, this.file.size)),
          (e = e.slice(this.offset, t)));
        var n = new XMLHttpRequest();
        n.open("PUT", this.url, !0),
          n.setRequestHeader("Content-Type", this.contentType),
          n.setRequestHeader(
            "Content-Range",
            "bytes " + this.offset + "-" + (t - 1) + "/" + this.file.size
          ),
          n.setRequestHeader("X-Upload-Content-Type", this.file.type),
          n.upload && n.upload.addEventListener("progress", this.onProgress),
          (n.onload = this.onContentUploadSuccess_.bind(this, n)),
          (n.onerror = this.onContentUploadError_.bind(this, n)),
          n.send(e);
      }),
      (a.prototype.resume_ = function () {
        var e = new XMLHttpRequest();
        e.open("PUT", this.url, !0),
          e.setRequestHeader("Content-Range", "bytes */" + this.file.size),
          e.setRequestHeader("X-Upload-Content-Type", this.file.type),
          e.upload && e.upload.addEventListener("progress", this.onProgress),
          (e.onload = this.onContentUploadSuccess_.bind(this, e)),
          (e.onerror = this.onContentUploadError_.bind(this, e)),
          e.send();
      }),
      (a.prototype.extractRange_ = function (e) {
        var t = e.getResponseHeader("Range");
        t && (this.offset = parseInt(t.match(/\d+/g).pop(), 10) + 1);
      }),
      (a.prototype.onContentUploadSuccess_ = function (t) {
        200 == t.status || 201 == t.status
          ? this.onComplete(t.response)
          : 308 == t.status
          ? (this.extractRange_(t), this.retryHandler.reset(), this.sendFile_())
          : this.onContentUploadError_(e);
      }),
      (a.prototype.onContentUploadError_ = function (e) {
        e.status && e.status < 500
          ? this.onError(e.response)
          : this.retryHandler.retry(this.resume_.bind(this));
      }),
      (a.prototype.onUploadError_ = function (e) {
        this.onError(e.response);
      }),
      (a.prototype.buildQuery_ = function (e) {
        return (
          (e = e || {}),
          Object.keys(e)
            .map(function (t) {
              return encodeURIComponent(t) + "=" + encodeURIComponent(e[t]);
            })
            .join("&")
        );
      }),
      (a.prototype.buildUrl_ = function (e, t, n) {
        var o = n || "https://www.googleapis.com/upload/drive/v3/files/";
        e && (o += e);
        var i = this.buildQuery_(t);
        return i && (o += "?" + i), o;
      }),
      (t.exports = a);
  }