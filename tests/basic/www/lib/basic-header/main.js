/*jshint browser: true */
/*global define */
define(function(require) {
  // Return an array of objects that are all mixed in to the
  // final custom element prototype.
  return [
    // mixins for base functionality, and an HTML-based template.
    require('./base'),
    require('template!./template.html'),

    // Main prototype implementation
    {
      // Extra setup work to do once element is created.
      createdCallback: function () {
        this.setItalicContent();
      },

      // Sets the contents of the italic element.
      setItalicContent: function () {
        //this.italic was wired up via data-prop
        if (this.italic) {
          this.italic.textContent = 'THIS IS A HEADER: ' + this.foobar() + ': ' + this._suffix;
        }
      },

      // Support for the some-suffix attribute on the element.
      _suffix: '',
      set someSuffix(value) {
        this._suffix = value;
        this.setItalicContent();
      },
      get someSuffix() {
        return this._suffix;
      },

      // Testing calling a local custom function.
      foobar: function () {
        return 'foobar';
      },

      // Event handlers wired up via data-event.
      click: function (evt) {
        console.log('a click: ', evt.target);
      },
      mouseover: function (evt) {
        console.log('a mouseover: ' + evt.target);
      },
      onSomethingClick: function (evt) {
        evt.preventDefault();
        console.log('something click: ' + evt.target);
      }
    }
  ];
});
