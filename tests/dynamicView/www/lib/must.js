/*jshint browser: true */
/*global define */

define(function(require, exports, module) {
  var must,
      slice = Array.prototype.slice,
      mustache = require('mustache'),
      template = require('template'),
      attrIdRegExp = /\s(hrefid|srcid)="([^"]+)"/g,
      buildMap = {};

  function parseIds(text, id) {
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
      id: id,
      srcIds: srcIds,
      hrefIds: hrefIds,
      text: text
    };
  }

  function toDom(text) {
    var tmplFn = template.makeTemplateFn(text);
    return tmplFn();
  }

  must = {
    compile: function () {
      return mustache.compile.apply(mustache, slice.call(arguments));
    },

    makeTemplateFn: function (req) {
      return function () {
        //`this` in here is the custom element instance
        var m = this.model,
            idParsed = this.template.idParsed;
        if (!m) {
          return;
        }

        var model = Object.create(m),
            id = idParsed.id;

        idParsed.srcIds.forEach(function (localId) {
          var fullId = template.makeFullId(localId, id);
          model['toUrl:srcId:' + fullId] = ' src="' + req.toUrl(fullId) + '"';
        });
        idParsed.hrefIds.forEach(function (localId) {
          var fullId = template.makeFullId(localId, id);
          model['toUrl:hrefId:' + fullId] = ' href="' + req.toUrl(fullId) + '"';
        });

        var dom = toDom(this.template.fn(model));

        return dom;
      };
    },

    load: function (id, req, onload, config) {
      template.fetchText(req.toUrl(id), function (text) {
        var deps = template.depsFromText(text);

        req(deps, function () {

          var mustacheFn,
              // Replace any hrefid/srcid with a {{toUrl:x}} value
              idParsed = parseIds(text, id);

          if (config.isBuild) {
            buildMap[id] = {
              deps: deps,
              idParsed: idParsed
            };
          } else {
            mustacheFn = mustache.compile(idParsed.text);
          }

          var templateFn = must.makeTemplateFn(req);
          templateFn.idParsed = idParsed;
          templateFn.fn = mustacheFn;

          onload({
            template: templateFn
          });
        });
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
     */
    write: function (pluginName, id, write) {
      if (buildMap.hasOwnProperty(id)) {
        var obj = buildMap[id],
            text = obj.idParsed.text,
            depString = JSON.stringify(obj.deps);

        // Get rid of text property, do not need to serialize it with
        // the idParsed info.
        obj.idParsed.text = undefined;

        depString = depString.replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
        if (depString) {
          depString = ', ' + depString;
        }

        write.asModule(pluginName + '!' + id,
          "define(['" + module.id + "', 'require'" + depString + "], function (must, require) {\n" +
            "var t = must.makeTemplateFn(require);\n" +
            "t.fn = must.compile(" + JSON.stringify(text) + ");\n" +
            "t.idParsed = " + JSON.stringify(obj.idParsed) + ";\n" +
          "return {template: t}; });\n");
      }
    }
  };

  return must;
});
