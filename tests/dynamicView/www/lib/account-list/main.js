/*jshint browser: true */
/*global define */
define(function(require, exports, module) {
  var fetchText = require('template').fetchText;

  return [
    // mixins to do some data-prop and data-event wiring
    require('selectors/data-prop'),
    require('selectors/data-event'),
    require('mixins/model'),

    // The HTML template to use for this element.
    require('must!./template.html'),

    // Main prototype implementation
    {

      // Support for the url attribute on the element.
      _url: '',
      get url() {
        return this._url;
      },
      set url(value) {
        this._url = value;
        fetchText(this._url, function (text) {
          this.model = JSON.parse(text);
        }.bind(this));
      },

      // Event handlers wired up via data-event.
      onAccountClick: function (evt) {
console.log('got here: ' + account.id);
        evt.stopPropagation();
        evt.preventDefault();
        var account, customEvent,
            accountId = parseInt(evt.target.href.substring('#account:'.length), 0);

        // Find the account.
        this._data.accounts.some(function(acct) {
          if (acct.id === accountId) {
            account = acct;
            return true;
          }
        });

        if (account) {
console.log('got here: ' + account.id);
          customEvent = new CustomEvent("accountClicked", {
            detail: {
              account: account
            }
          });
        }

        this.dispatchEvent(customEvent);
      }
    }
  ];
});
