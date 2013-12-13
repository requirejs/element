define(function(require) {
  // mixins to do some data-prop and data-event wiring,
  // and to set up interior template.
  return [
    require('selectors/data-prop'),
    require('selectors/data-event')
  ];
});
