/*jshint browser: true */
/*global define */
define(function(require, exports, module) {
  var fetchText = require('template').fetchText;

  return [
    // mixins to do some data-prop and data-event wiring
    require('selectors/data-prop'),
    require('selectors/data-event'),
    require('mixins/model'),

    // The HTML template to use for this element.
    require('must!./template.html'),

    // Main prototype implementation
    {

    }
  ]
});
