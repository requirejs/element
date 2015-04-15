define(function (require) {
  'use strict';

  require('template').ready(function() {
    window.contentState = document.querySelector('content-state');
    window.contentState.headerName = 'Test';
  });
});
