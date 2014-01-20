//TODO: this is not working
define(function () {
  return {
    templateInsertedCallback: function () {
      var nodes = this.querySelectorAll('[data-bind]'),
          length = nodes.length;

      for (var i = 0; i < length; i++) {
        this[nodes[i].dataset.prop] = nodes[i];
      }
    }
  };
});
