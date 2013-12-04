define(function (require) {
    // Load any app-specific modules
    // with a relative require call,
    // like:
    var element = require('element');

    element.ready(function() {
        console.log('FINISHED LOADING');
    });
});