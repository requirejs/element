define(function (require) {
  var template = require('template');

  template.ready(function() {
    document.querySelector('account-list')
    .addEventListener('accountSelected', function (evt) {
      var account = evt.detail.account;

      document.querySelector('account-view').model = account;
    }, false);
  });
});
