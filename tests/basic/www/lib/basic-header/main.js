/*jshint browser: true */
/*global define */
define(function(require, exports, module) {
  return {
    moduleId: module.id,
    template: require('template!./template.html'),
    //template: '',
    /*
    template: {
      deps: element.
    }
     */
    createdCallback: function () {
      this.italic.textContent = 'THIS IS A HEADER: ' + this.foobar() + ': ' + this._suffix;
    },

    // some-suffix
    _suffix: '',
    set someSuffix(value) {
      this._suffix = value;
    },
    get someSuffix() {
      return this._suffix;
    },

    foobar: function () {
      return 'foobar';
    },

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
