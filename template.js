/*jshint browser: true */
/*globals define, process, Components, FileUtils */

define(function(require, exports, module) {
  var fetchText, fs, Cc, Ci,
      xpcIsWindows,
      element = require('element'),
      masterConfig = (module.config && module.config()) || {},
      buildMap = {};

  if (masterConfig.env === 'node' || (!masterConfig.env &&
      typeof process !== "undefined" &&
      process.versions &&
      !!process.versions.node)) {
    //Using special require.nodeRequire, something added by r.js.
    fs = requirejs.nodeRequire('fs');

    fetchText = function (url, onload, onerror) {
      try {
        var file = fs.readFileSync(url, 'utf8');
        // Remove BOM (Byte Mark Order) from utf8 files if it is there.
        if (file.indexOf('\uFEFF') === 0) {
          file = file.substring(1);
        }
        onload(file);
      } catch (e) {
        onerror(e);
      }
    };
  } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
      typeof XMLHttpRequest !== 'undefined')) {
    // browser
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
  } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
      typeof Components !== 'undefined' && Components.classes &&
      Components.interfaces)) {
    // Avert your gaze!
    Cc = Components.classes;
    Ci = Components.interfaces;
    Components.utils['import']('resource://gre/modules/FileUtils.jsm');
    xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

    fetchText = function (url, onload, onerror) {
      var inStream, convertStream, fileObj,
        readData = {};

      if (xpcIsWindows) {
        url = url.replace(/\//g, '\\');
      }

      fileObj = new FileUtils.File(url);

      //XPCOM, you so crazy
      try {
        inStream = Cc['@mozilla.org/network/file-input-stream;1']
               .createInstance(Ci.nsIFileInputStream);
        inStream.init(fileObj, 1, 0, false);

        convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                .createInstance(Ci.nsIConverterInputStream);
        convertStream.init(inStream, "utf-8", inStream.available(),
        Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

        convertStream.readString(inStream.available(), readData);
        convertStream.close();
        inStream.close();
        onload(readData.value);
      } catch (e) {
        onerror(new Error((fileObj && fileObj.path || '') + ': ' + e));
      }
    };
  }

  return {
    load: function (id, req, onload, config) {
      var isBuild = config.isBuild;

      fetchText(req.toUrl(id), function (text) {
        var templateObj = element.textToTemplate(text, (isBuild ? null : id));

        if (isBuild) {
          buildMap[id] = templateObj;
        }

        onload(templateObj);
      }, onload.error);
    },

    write: function (pluginName, id, write, config) {
      if (buildMap.hasOwnProperty(id)) {
        var obj = buildMap[id];

        write.asModule(pluginName + '!' + id,
          "define(" + JSON.stringify(obj.deps) + ", function () { return " +
          JSON.stringify({
            translateIds: true,
            text: buildMap[id].text
          }) +
          "; });\n");
      }
    }
  };
});