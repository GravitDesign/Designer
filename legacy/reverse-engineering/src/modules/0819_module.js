/**
 * Webpack Module #819
 * Type: unknown
 */

function (e, t, n) {
    (function (e, o) {
      var i = n(570),
        a = n(660).spawn,
        r = n(178);
      t.XMLHttpRequest = function () {
        "use strict";
        var t,
          s,
          l = this,
          c = n(571),
          d = n(572),
          u = {},
          p = !1,
          g = { "User-Agent": "node-XMLHttpRequest", Accept: "*/*" },
          h = {},
          f = {},
          m = [
            "accept-charset",
            "accept-encoding",
            "access-control-request-headers",
            "access-control-request-method",
            "connection",
            "content-length",
            "content-transfer-encoding",
            "cookie",
            "cookie2",
            "date",
            "expect",
            "host",
            "keep-alive",
            "origin",
            "referer",
            "te",
            "trailer",
            "transfer-encoding",
            "upgrade",
            "via",
          ],
          y = ["TRACE", "TRACK", "CONNECT"],
          v = !1,
          _ = !1,
          b = {};
        (this.UNSENT = 0),
          (this.OPENED = 1),
          (this.HEADERS_RECEIVED = 2),
          (this.LOADING = 3),
          (this.DONE = 4),
          (this.readyState = this.UNSENT),
          (this.onreadystatechange = null),
          (this.responseText = ""),
          (this.responseXML = ""),
          (this.status = null),
          (this.statusText = null),
          (this.withCredentials = !1);
        (this.open = function (e, t, n, o, i) {
          if (
            (this.abort(),
            (_ = !1),
            !(function (e) {
              return e && -1 === y.indexOf(e);
            })(e))
          )
            throw new Error("SecurityError: Request method not allowed");
          (u = {
            method: e,
            url: t.toString(),
            async: "boolean" != typeof n || n,
            user: o || null,
            password: i || null,
          }),
            w(this.OPENED);
        }),
          (this.setDisableHeaderCheck = function (e) {
            p = e;
          }),
          (this.setRequestHeader = function (e, t) {
            if (this.readyState !== this.OPENED)
              throw new Error(
                "INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN"
              );
            if (
              (function (e) {
                return p || (e && -1 === m.indexOf(e.toLowerCase()));
              })(e)
            ) {
              if (v) throw new Error("INVALID_STATE_ERR: send flag is true");
              (e = f[e.toLowerCase()] || e),
                (f[e.toLowerCase()] = e),
                (h[e] = h[e] ? h[e] + ", " + t : t);
            } else console.warn('Refused to set unsafe header "' + e + '"');
          }),
          (this.getResponseHeader = function (e) {
            return "string" == typeof e &&
              this.readyState > this.OPENED &&
              s &&
              s.headers &&
              s.headers[e.toLowerCase()] &&
              !_
              ? s.headers[e.toLowerCase()]
              : null;
          }),
          (this.getAllResponseHeaders = function () {
            if (this.readyState < this.HEADERS_RECEIVED || _) return "";
            var e = "";
            for (var t in s.headers)
              "set-cookie" !== t &&
                "set-cookie2" !== t &&
                (e += t + ": " + s.headers[t] + "\r\n");
            return e.substr(0, e.length - 2);
          }),
          (this.getRequestHeader = function (e) {
            return "string" == typeof e && f[e.toLowerCase()]
              ? h[f[e.toLowerCase()]]
              : "";
          }),
          (this.send = function (n) {
            if (this.readyState !== this.OPENED)
              throw new Error(
                "INVALID_STATE_ERR: connection must be opened before send() is called"
              );
            if (v)
              throw new Error(
                "INVALID_STATE_ERR: send has already been called"
              );
            var p,
              m = !1,
              y = !1,
              b = i.parse(u.url);
            switch (b.protocol) {
              case "https:":
                m = !0;
              case "http:":
                p = b.hostname;
                break;
              case "file:":
                y = !0;
                break;
              case void 0:
              case null:
              case "":
                p = "localhost";
                break;
              default:
                throw new Error("Protocol not supported.");
            }
            if (y) {
              if ("GET" !== u.method)
                throw new Error("XMLHttpRequest: Only GET method is supported");
              if (u.async)
                r.readFile(b.pathname, "utf8", function (e, t) {
                  e
                    ? l.handleError(e)
                    : ((l.status = 200), (l.responseText = t), w(l.DONE));
                });
              else
                try {
                  (this.responseText = r.readFileSync(b.pathname, "utf8")),
                    (this.status = 200),
                    w(l.DONE);
                } catch (e) {
                  this.handleError(e);
                }
            } else {
              var C = b.port || (m ? 443 : 80),
                x = b.pathname + (b.search ? b.search : "");
              for (var S in g) f[S.toLowerCase()] || (h[S] = g[S]);
              if (
                ((h.Host = p),
                (m && 443 === C) || 80 === C || (h.Host += ":" + b.port),
                u.user)
              ) {
                void 0 === u.password && (u.password = "");
                var E = new e(u.user + ":" + u.password);
                h.Authorization = "Basic " + E.toString("base64");
              }
              "GET" === u.method || "HEAD" === u.method
                ? (n = null)
                : n
                ? ((h["Content-Length"] = e.isBuffer(n)
                    ? n.length
                    : e.byteLength(n)),
                  h["Content-Type"] ||
                    (h["Content-Type"] = "text/plain;charset=UTF-8"))
                : "POST" === u.method && (h["Content-Length"] = 0);
              var A = {
                host: p,
                port: C,
                path: x,
                method: u.method,
                headers: h,
                agent: !1,
                withCredentials: l.withCredentials,
              };
              if (((_ = !1), u.async)) {
                var T = m ? d.request : c.request;
                (v = !0), l.dispatchEvent("readystatechange");
                var G = function (e) {
                  l.handleError(e);
                };
                (t = T(A, function e(n) {
                  if (
                    301 !== (s = n).statusCode &&
                    302 !== s.statusCode &&
                    303 !== s.statusCode &&
                    307 !== s.statusCode
                  )
                    s.setEncoding("utf8"),
                      w(l.HEADERS_RECEIVED),
                      (l.status = s.statusCode),
                      s.on("data", function (e) {
                        e && (l.responseText += e), v && w(l.LOADING);
                      }),
                      s.on("end", function () {
                        v && (w(l.DONE), (v = !1));
                      }),
                      s.on("error", function (e) {
                        l.handleError(e);
                      });
                  else {
                    u.url = s.headers.location;
                    var o = i.parse(u.url);
                    p = o.hostname;
                    var a = {
                      hostname: o.hostname,
                      port: o.port,
                      path: o.path,
                      method: 303 === s.statusCode ? "GET" : u.method,
                      headers: h,
                      withCredentials: l.withCredentials,
                    };
                    (t = T(a, e).on("error", G)).end();
                  }
                }).on("error", G)),
                  n && t.write(n),
                  t.end(),
                  l.dispatchEvent("loadstart");
              } else {
                var P = ".node-xmlhttprequest-content-" + o.pid,
                  D = ".node-xmlhttprequest-sync-" + o.pid;
                r.writeFileSync(D, "", "utf8");
                for (
                  var L =
                      "var http = require('http'), https = require('https'), fs = require('fs');var doRequest = http" +
                      (m ? "s" : "") +
                      ".request;var options = " +
                      JSON.stringify(A) +
                      ";var responseText = '';var req = doRequest(options, function(response) {response.setEncoding('utf8');response.on('data', function(chunk) {  responseText += chunk;});response.on('end', function() {fs.writeFileSync('" +
                      P +
                      "', JSON.stringify({err: null, data: {statusCode: response.statusCode, headers: response.headers, text: responseText}}), 'utf8');fs.unlinkSync('" +
                      D +
                      "');});response.on('error', function(error) {fs.writeFileSync('" +
                      P +
                      "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" +
                      D +
                      "');});}).on('error', function(error) {fs.writeFileSync('" +
                      P +
                      "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" +
                      D +
                      "');});" +
                      (n
                        ? "req.write('" +
                          JSON.stringify(n).slice(1, -1).replace(/'/g, "\\'") +
                          "');"
                        : "") +
                      "req.end();",
                    I = a(o.argv[0], ["-e", L]);
                  r.existsSync(D);

                );
                var k = JSON.parse(r.readFileSync(P, "utf8"));
                I.stdin.end(),
                  r.unlinkSync(P),
                  k.err
                    ? l.handleError(k.err)
                    : ((s = k.data),
                      (l.status = k.data.statusCode),
                      (l.responseText = k.data.text),
                      w(l.DONE));
              }
            }
          }),
          (this.handleError = function (e) {
            (this.status = 0),
              (this.statusText = e),
              (this.responseText = e.stack),
              (_ = !0),
              w(this.DONE),
              this.dispatchEvent("error");
          }),
          (this.abort = function () {
            t && (t.abort(), (t = null)),
              (h = g),
              (this.status = 0),
              (this.responseText = ""),
              (this.responseXML = ""),
              (_ = !0),
              this.readyState === this.UNSENT ||
                (this.readyState === this.OPENED && !v) ||
                this.readyState === this.DONE ||
                ((v = !1), w(this.DONE)),
              (this.readyState = this.UNSENT),
              this.dispatchEvent("abort");
          }),
          (this.addEventListener = function (e, t) {
            e in b || (b[e] = []), b[e].push(t);
          }),
          (this.removeEventListener = function (e, t) {
            e in b &&
              (b[e] = b[e].filter(function (e) {
                return e !== t;
              }));
          }),
          (this.dispatchEvent = function (e) {
            if (("function" == typeof l["on" + e] && l["on" + e](), e in b))
              for (var t = 0, n = b[e].length; t < n; t++) b[e][t].call(l);
          });
        var w = function (e) {
          (e != l.LOADING && l.readyState === e) ||
            ((l.readyState = e),
            (u.async || l.readyState < l.OPENED || l.readyState === l.DONE) &&
              l.dispatchEvent("readystatechange"),
            l.readyState !== l.DONE ||
              _ ||
              (l.dispatchEvent("load"), l.dispatchEvent("loadend")));
        };
      };
    }).call(this, n(221).Buffer, n(183));
  }