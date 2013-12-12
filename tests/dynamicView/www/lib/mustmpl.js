define(function(require) {
  var mustache = require('mustache'),
      template = require('template'),
      attrIdRegExp = /\s(hrefid|srcid)="([^"]+)"/g;


  function parseIds(text) {
    var idMap = {},
        srcIds = [],
        hrefIds = [];

    text = text.replace(attrIdRegExp, function (match, type, id) {
      var key = type + ':' + id;
      if (!idMap.hasOwnProperty(key)) {
        if (type === 'hrefid') {
          hrefIds.push(id);
        } else {
          srcIds.push(id);
        }
        idMap[key] = true;
      }

      return ' {{toUrl:' + key + '}}';
    });

    return {
      srcIds: srcIds,
      hrefIds: hrefIds,
      text: text
    };
  }

  function toDom(text) {
    var frag = document.createDocumentFragment();
    frag.innerHTML = text;
    return frag;
  }

  return {
    load: function (id, req, onload, config) {
      req(['template!' + id], function (tmpl) {
        // Replace any hrefid/srcid with a {{toUrl:x}} value
        var idParsed = parseIds(tmpl.text);

        tmpl.fn = function(instance) {
          var m = instance.model;
          if (!m) {
            return;
          }

          var model = Object.create(m);

          idParsed.srcIds.forEach(function (id) {
            model['toUrl:srcId:' + id] = ' src="' + req.toUrl(id) + '"';
          });
          idParsed.hrefIds.forEach(function (id) {
            model['toUrl:hrefId:' + id] = ' href="' + req.toUrl(id) + '"';
          });

          if (model) {
            return toDom(mustache.render(idParsed.text, model));
          }
        };

        // Make sure hrefid/srcid parsing is not done by element loader plugin.
        tmpl.parseIds = false;

        onload(tmpl);
      });
    }
  };
});
