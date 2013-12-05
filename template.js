/*jshint browser: true */
/*global define */

define(function (require) {
  var element = require('element'),
      templateDiv = document.createElement('div'),
      extRegExp = /\.\w+$/;

  return {
    load: function(id, req, onload, config) {
      // TODO: work out inlining
      if (config.isBuild) {
        return;
      }

      var url = req.toUrl(id),
          xhr = new XMLHttpRequest();

      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        var status, err, template,
            converted = {};

        if (xhr.readyState === 4) {
          status = xhr.status;
          if (status > 399 && status < 600) {
            //An http 4xx or 5xx error. Signal an error.
            err = new Error(url + ' HTTP status: ' + status);
            err.xhr = xhr;
            onload.error(err);
          } else {
            converted = element.convertText(xhr.responseText, id.replace(extRegExp, ''));

            require(converted.deps || [], function () {
              templateDiv.innerHTML = '<template>' + converted.text + '</template>';
              template = templateDiv.removeChild(templateDiv.firstElementChild);
              onload(template);
            }, onload.error);
          }
        }
      };
      xhr.responseType = 'text';
      xhr.send(null);
    }
  };
});
