define({
  'selector:[data-prop]': function (node) {
    this[node.dataset.prop] = node;
  }
});
