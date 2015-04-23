/*jshint browser: true */
/*global define */
define(function(require) {
  // Return an array of objects that are all mixed in to the
  // final custom element prototype.
  return [
    // mixins for base functionality, and an HTML-based template.
    require('./base'),
    require('template!./tag-one.html'),
    {
      createdCallback: function() {
        console.log('tag-one: title node ', this.title);
        console.log('tag-one: tagTwo node ', this.tagTwo);
        console.log('tag-one: internal node (should be undefined) ',
                    this.internal);
      }
    }
  ];
});

