/*jshint browser: true */
/*globals define, requirejs */

define(function(require, exports, module) {
  var fetchText,
      element = require('element'),
      buildMap = {};

  if (typeof XMLHttpRequest !== 'undefined') {
    // browser loading
    fetchText = function (url, onload, onerror) {
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
    };
  } else {
    // Likely a build scenario. Cheat a bit and use
    // an r.js helper. This could be modified to support
    // more AMD loader tools though in the future.
    fetchText = function (url, onload) {
      onload(requirejs._readFile(url));
    };
  }

  return {
    /**
     * AMD loader plugin API. Loads the resource. Called by an
     * AMD loader.
     * @param  {String} id     resource ID to load.
     * @param  {Function} req    context-specific `require` function.
     * @param  {Function} onload called when loading is complete.
     * @param  {Object} config config object, normally just has
     * config.isBuild to indicate build scenario.
     */
    load: function (id, req, onload, config) {
      var isBuild = config.isBuild;

      fetchText(req.toUrl(id), function (text) {
        var templateObj = element.textToTemplate(text, id, isBuild);

        if (isBuild) {
          buildMap[id] = templateObj;
          // Trigger loading of any deps found in the template,
          // since otherwise they will not be seen by the build.
          req(templateObj.deps, onload);
        } else {
          onload(templateObj);
        }
      }, onload.error);
    },

    /**
     * AMD loader plugin API. Called by a build tool, to give
     * this plugin the opportunity to write a resource to
     * a build file.
     * @param  {String} pluginName ID of this module, according
     * to what the loader thinks the ID is.
     * @param  {String} id         resource ID handled by plugin.
     * @param  {Function} write      Used to write output to build file.
     * @param  {Object} config     config from loader.
     */
    write: function (pluginName, id, write, config) {
      if (buildMap.hasOwnProperty(id)) {
        var obj = buildMap[id];

        write.asModule(pluginName + '!' + id,
          "define(" + JSON.stringify(obj.deps) + ", function () { return " +
          JSON.stringify(buildMap[id]) +
          "; });\n");
      }
    }
  };
});