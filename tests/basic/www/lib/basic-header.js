/*jshint browser: true */
/*global define */
define(function(require) {
    return {
        template: require('text!basic-header.html'),
        createdCallback: function () {
            this.querySelector('i').textContent = 'THIS IS A HEADER: ' + this.foobar() + ': ' + this._suffix;
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
        }
    };
});
