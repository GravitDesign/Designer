/**
 * Webpack Module #412
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = function () {
      (this.head = null), (this.tail = null);
    };
    (o.prototype = {
      add: function (e) {
        var t = { item: e, next: null },
          n = this.tail;
        n ? (n.next = t) : (this.head = t), (this.tail = t);
      },
      get: function () {
        var e = this.head;
        if (e)
          return null === (this.head = e.next) && (this.tail = null), e.item;
      },
    }),
      (e.exports = o);
  }