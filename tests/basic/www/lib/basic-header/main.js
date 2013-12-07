/*jshint browser: true */
/*global define */
define(function(require, exports, module) {
  return {
    // Loader plugin needs to know the ID to use for
    // relative ID resolution later.
    moduleId: module.id,

    // The HTML template to use for this element.
    template: require('template!./template.html'),

    // Extra setup work to do once element is created.
    createdCallback: function () {
      //this.italic was wired up via data-prop
      this.italic.textContent = 'THIS IS A HEADER: ' + this.foobar() + ': ' + this._suffix;
    },

    // Support for the some-suffix attribute on the element.
    _suffix: '',
    set someSuffix(value) {
      this._suffix = value;
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
  };
});
