define(function(require) {
  // mixins to do some data-prop and data-event wiring,
  // and to set up interior template.
  return [
    require('mixins/data-prop'),
    require('mixins/data-event')
  ];
});
