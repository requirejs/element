/*jshint browser: true */
/*global define */
define(function(require) {
  // Return an array of objects that are all mixed in to the
  // final custom element prototype.
  return [
    // mixins for base functionality, and an HTML-based template.
    require('./base'),
    require('template!./tag-two.html'),
    {
      createdCallback: function() {
        console.log('tag-two: internal node ',
                    this.internal);

      },

      onInternalClick: function(evt) {
        console.log('tag-two internal element clicked');
      }
    }
  ];
});

