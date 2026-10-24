/**
 * Webpack Module #1554
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o() {
      this.stack = [];
    }
    n(38),
      (o.RawValue = function (e) {
        this.value = e;
      }),
      (o.RawValue.prototype.getValue = function () {
        return this.value;
      }),
      (o.prototype._checkRaw = function (e) {
        return e instanceof o.RawValue ? e.getValue() : "'".concat(e, "'");
      }),
      (o.prototype.add = function (e, t, n, i) {
        return this._add(
          e instanceof o.RawValue ? e : new o.RawValue(e),
          t,
          n,
          i
        );
      }),
      (o.prototype._add = function (e, t, n) {
        let i =
          arguments.length > 3 && void 0 !== arguments[3]
            ? arguments[3]
            : o.Connector.AND;
        return (
          this.stack.push({ field: e, operator: t, value: n, connector: i }),
          this
        );
      }),
      (o.prototype.group = function (e) {
        var t = new o();
        return this.stack.push(t), e(t), this;
      }),
      (o.prototype.and = function (e, t, n) {
        return this.add(e, t, n, o.Connector.AND);
      }),
      (o.prototype.or = function (e, t, n) {
        return this.add(e, t, n, o.Connector.OR);
      }),
      (o.prototype.in = function (e, t) {
        return this._add(
          e,
          o.Connector.IN,
          t instanceof o.RawValue ? t : new o.RawValue(t)
        );
      }),
      (o.prototype.build = function () {
        var e = this;
        return this.stack
          .map(function (t, n) {
            return t instanceof o
              ? ""
                  .concat(0 !== n ? o.Connector.AND + " " : "", "(")
                  .concat(t.build(), ")")
              : ""
                  .concat(0 !== n ? t.connector + " " : "")
                  .concat(e._checkRaw(t.field), " ")
                  .concat(t.operator, " ")
                  .concat(e._checkRaw(t.value));
          })
          .join(" ");
      }),
      (o.Connector = { AND: "AND", IN: "IN", OR: "OR" }),
      (e.exports = o);
  }