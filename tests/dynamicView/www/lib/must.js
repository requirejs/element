/*jshint browser: true */
/*global define */

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
    var tmpl = template.makeTemplateNode(text);
    var frag = tmpl.content.cloneNode(true);
    return frag;
  }

  return {
    load: function (id, req, onload, config) {
      template.fetchText(req.toUrl(id), function (text) {
        // Replace any hrefid/srcid with a {{toUrl:x}} value
        var idParsed = parseIds(text),
            mustacheFn = mustache.compile(idParsed.text);

        onload({
          createdCallback: template.templateCreatedCallback,
          template: function () {
            //`this` in here is the custom element instance
            var m = this.model;
            if (!m) {
              return;
            }

            var model = Object.create(m);

            idParsed.srcIds.forEach(function (localId) {
              var fullId = template.makeFullId(localId, id);
              model['toUrl:srcId:' + fullId] = ' src="' + req.toUrl(fullId) + '"';
            });
            idParsed.hrefIds.forEach(function (localId) {
              var fullId = template.makeFullId(localId, id);
              model['toUrl:hrefId:' + fullId] = ' href="' + req.toUrl(fullId) + '"';
            });

            return toDom(mustacheFn(model));
          }
        });
      }, onload.error);
    }
  };
});
