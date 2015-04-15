define(function (require) {
  'use strict';

  require('template').ready(function() {
    var node = window.contentState = document.querySelector('content-state');
    node.headerName = 'Test';
    node.style = {
      altClasses: 'one two'
    };
    node.bar = 'bar-is-cool';
    node.activated = false;
  });
});
