/*jshint browser: true */
/*global define */
define(function(require) {
    return {
        createdCallback: function () {
            var b = document.createElement('b');
            b.textContent = this.textContent;
            this.innerHTML = '';
            this.appendChild(b);
        }
    };
});
