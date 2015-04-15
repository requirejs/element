define(function(require, exports, module) {
  'use strict';

  return function base(templateMixins) {
    return [
      // Mix in the template first, so that its createdCallback is
      // called before the other createdCallbacks, so that the
      // template is there for things like l10n mixing and node
      // binding inside the template.
      templateMixins ? templateMixins : {},

      // Wire up support for auto-node binding
      require('mixins/data-state')
    ];
  };
});
