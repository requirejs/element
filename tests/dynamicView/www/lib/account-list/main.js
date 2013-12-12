/*jshint browser: true */
/*global define */
define(function(require, exports, module) {
  return [
    // mixins to do some data-prop and data-event wiring
    require('selectors/data-prop'),
    require('selectors/data-event'),
    require('mixins/model'),

    // Main prototype implementation
    {
      // The HTML template to use for this element.
      template: require('template!./template.html'),

      // Support for the url attribute on the element.
      _url: '',
      get url() {
        return this._url;
      },
      set url(value) {
        this._url = value;
        this.fetchText(this._url, function (text) {
          this.model = JSON.parse(text);
        }.bind(this));
      },

      // Event handlers wired up via data-event.
      onSomethingClick: function (evt) {
        evt.preventDefault();
        var accoutName = evt.target.href.substring('account:'.length),
            account = this._data[accoutName],
            customEvent = new CustomEvent("accountClicked", {
              detail: {
                account: account
              }
            });

        this.dispatchEvent(customEvent);
      },

      // Helpers

      fetchText: function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
          var status, err;

          if (xhr.readyState === 4) {
            status = xhr.status;
            if (status > 399 && status < 600) {
              //An http 4xx or 5xx error. Signal an error.
              err = new Error(url + ' HTTP status: ' + status);
              err.xhr = xhr;
              onerror(err);
            } else {
              onload(xhr.responseText);
            }
          }
        };
        xhr.responseType = 'text';
        xhr.send(null);
      }
    }
  ];
});
