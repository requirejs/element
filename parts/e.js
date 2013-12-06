/*jshint browser: true */
/*globals define, requirejs, CustomElements, Platform */

/*
Notes:

* CustomElement code from polymer-v0.0.20131107

* Warning: has sucky cycle support between custom element names. But cycles
  custom elements would be crazy talk right? Right? If not, would be good
  to get that use case.

*/
define(function(require, exports, module) {
  var parser, templateDiv,
      isReady = false,
      readyQueue = [],
      tagRegExp = /<(\w+-\w+)(\s|>)/g,
      commentRegExp = /<!--*.?-->/g,
      hrefIdRegExp = /\shrefid="([^"]+)"/g,
      srcIdRegExp = /\ssrcid="([^"]+)"/g,
      buildProtocol = 'build:',
      slice = Array.prototype.slice;

  if (typeof CustomElements !== 'undefined') {
    parser = CustomElements.parser;
    templateDiv = document.createElement('div');
  }

  /**
   * Handles converting <template id="body"> template
   * into a real body content, and calling back
   * element.ready listeners.
   */
  function onReady() {
    isReady = true;

    // The template#body is on purpose. Do not want to get
    // other element that may be #body if the page decides
    // to not use the template tag to avoid FOUC.
    var bodyTemplate = document.querySelector('template#body');

    if (bodyTemplate) {
      bodyTemplate.parentNode.removeChild(bodyTemplate);
      document.body.appendChild(bodyTemplate.content);
    }

    readyQueue.forEach(function (fn) {
      fn();
    });
    readyQueue = [];
  }

  /**
   * For hrefid and srcid resolution, need full IDs.
   * This method takes care of creating full IDs. It
   * could be improved by removing extraneous ./ and
   * ../ references.
   * @param  {String} id    possible local, relative ID
   * @param  {String} relId ID to use as a basis for the
   * the local ID.
   * @return {String} full ID
   */
  function makeFullId(id, relId) {
    if (id.indexOf('.') === 0 && relId) {
      // Trim off the last segment of the relId, as we want
      // the "directory" level of the ID
      var parts = relId.split('/');
      parts.pop();
      relId = parts.join('/');

      id = (relId ? relId + '/' : '') + id;
    }

    return id;
  }

  /**
   * Converts an attribute like a-long-attr to aLongAttr
   * @param  {String} attrName The attribute name
   * @return {String}
   */
  function makePropName(attrName) {
    var parts = attrName.split('-');
    for (var i = 1; i < parts.length; i++) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
    }
    return parts.join('');
  }

  /**
   * Called once a template's dependencies have been loaded, and the
   * current element can be considered fully loaded.
   * @param  {String} id     module ID.
   * @param  {Object} mod    The module export for the custom element.
   * @param  {Function} onload function given by AMD load to call once
   * the custome element is loaded.
   */
  function finishLoad(id, mod, onload) {
    var proto = Object.create(HTMLElement.prototype);
    Object.keys(mod).forEach(function (key) {
      Object.defineProperty(proto, key, Object.getOwnPropertyDescriptor(mod, key));
    });

    // Wire up auto-injection of the template
    if (proto.template) {
      var oldCallback = proto.createdCallback;
      proto.createdCallback = function () {
        this.innerHTML = '';

        var i, item, propName,
            node = this.template.fn(),
            attrs = this.attributes;

        // Wire attributes to this element's custom/getter setters
        for (i = 0; i < attrs.length; i++) {
          item = attrs.item(i);
          propName = makePropName(item.nodeName);

          // Purposely using this instead of getOwnPropertyDescriptor
          // since the methos is likely on the object prototype. This
          // means it could be hazardous to use attribute IDs that
          // conflict with JS object properties.
          if (propName in this) {
            this[propName] = item.value;
          }
        }

        element.dataWires.forEach(function (wire) {
          slice.call(node.querySelectorAll('[' + wire[0] + ']')).forEach(function (node) {
            wire[1](node, node.getAttribute(wire[0]), this);
          }.bind(this));
        }.bind(this));

        this.appendChild(node);

        if (oldCallback) {
          return oldCallback.apply(this, slice.call(arguments));
        }
      };
    }

    onload(document.register(id, {
      prototype: proto
    }));
  }

  /**
   * Responsible for loading any dependencies from a custom
   * element's template object. Uses the element's module
   * export's template.deps as the list of IDs. So, this
   * should only be called once template normalization has
   * happened.
   * @param  {String} id     module ID.
   * @param  {Object} mod    module export.
   * @param  {Function} req    context-specific `require`
   * function, comes from the AMD loader.
   * @param  {Function} onload function to call once
   * loading is complete, comes from the AMD loader.
   */
  function loadDeps(id, mod, req, onload) {
    if (mod.template && mod.template.deps) {
      req(mod.template.deps, function () {
        finishLoad(id, mod, onload);
      });
    } else {
      finishLoad(id, mod, onload);
    }
  }

  /**
   * Main module export. These methods are visible to
   * any module.
   */
  var element = {
    /**
     * Register a function to be run once element dependency
     * tracing and registration has finished.
     * @param  {Function} fn
     */
    ready: function (fn) {
      if (isReady) {
        setTimeout(fn);
      } else {
        readyQueue.push(fn);
      }
    },

    /**
     * data- attributes to scan for in each instantiated element,
     * done in the createdCallback step, before the element-specific
     * createdCallback is run. Extensible, but this effectively is
     * like a global. Better bet is to implement mixins for elements
     * to use as dependencies. These may be moved to mixins once
     * proving out the general loader plugin support.
     * @type {Array}
     */
    dataWires: [
      ['data-attr', function (node, value, instance) {
        instance[value] = node;
      }],
      ['data-event', function (node, value, instance) {
        // Value is of type 'name:value,name:value',
        // with the :value part optional.
        value.split(',').forEach(function (pair) {
          var evtName, method,
              parts = pair.split(':');

          if (!parts[1]) {
            parts[1] = parts[0];
          }
          evtName = parts[0].trim();
          method = parts[1].trim();

          if (typeof instance[method] !== 'function') {
            throw new Error('"' + method + '" is not a function, cannot bind with data-event');
          }

          node.addEventListener(evtName, function(evt) {
            // Treat these events as private to the
            // custom element.
            evt.stopPropagation();
            return instance[method](evt);
          }, false);
        });
      }]
    ],

    /**
     * Makes a <template> element from a string of HTML.
     * @param  {String} text
     * @return {HTMLTemplateElement}
     */
    makeTemplateNode: function (text) {
      templateDiv.innerHTML = '<template>' + text + '</template>';
       return templateDiv.removeChild(templateDiv.firstElementChild);
    },

    /**
     * Makes a template function for use as the template object
     * used in a fully realized custom element.
     * @param  {String} text string of HTML
     * @return {Function} by calling this function, creates a
     * clone of the DocumentFragment from template.
     */
    makeTemplateFn: function (text) {
      var templateNode = element.makeTemplateNode(text);
      return function() { return templateNode.content.cloneNode(true); };
    },

    /**
     * Replaces hrefid and srcid with href and src, using
     * require.toUrl(id) to convert the IDs to paths.
     * @param  {String} text  string of HTML
     * @param  {String} relId the reference module ID to use,
     * which is normallly the module ID associated with the
     * HTML string given as input.
     * @return {String} converted HTML string.
     */
    idsToUrls: function(text, relId) {
      text = text
              .replace(hrefIdRegExp, function (match, id) {
                id = makeFullId(id, relId);
                return ' href="' + require.toUrl(id) + '"';
              })
              .replace(srcIdRegExp, function (match, id) {
                id = makeFullId(id, relId);
                return ' src="' + require.toUrl(id) + '"';
              });
      return text;
    },

    /**
     * Gives and array of 'element!'-based module IDs for
     * any custom elements found in the string of HTML.
     * So if the HTML has <some-thing> in it, the returned
     * dependency array will have 'element!some-thing' in it.
     * @param  {String} text string of HTML
     * @return {Array} array of dependencies. Could be zero
     * length if no dependencies found.
     */
    depsFromText: function (text) {
      var match, noCommentText,
          deps = [];

      // Remove comments so only legit tags are found
      noCommentText = text.replace(commentRegExp, '');

      tagRegExp.lastIndex = 0;
      while ((match = tagRegExp.exec(noCommentText))) {
        deps.push(module.id + '!' + match[1]);
      }

      return deps;
    },

    /**
     * Converts a string of HTML into a full template
     * object that is used for a custom element's
     * prototype `template` property.
     * @param  {String} text string of HTML
     * @param  {String} id   module ID for the custom
     * element associated with this template.
     * @return {Object} template object.
     */
    textToTemplate: function(text, id) {
      var obj,
          deps = element.depsFromText(text);

      if (id) {
        text = element.idsToUrls(text, id);
      }

      obj = {
        id: id,
        deps: deps,
        text: text
      };

      if (id) {
        obj.fn = element.makeTemplateFn(text);
      }
      return obj;
    },

    /**
     * The AMD loader plugin API. Called by an AMD loader
     * to handle 'element!' resources.
     * @param  {String} id     module ID to load.
     * @param  {Function} req  context-specific `require` function.
     * @param  {Function} onload function to call once loading is complete.
     * @param  {Object} config config from the loader. Normally just has
     * config.isBuild if in a build scenario.
     */
    load: function (id, req, onload, config) {
      // If a build directive, load those files and scan
      // for dependencies, loading them all.
      if (id.indexOf(buildProtocol) === 0 && config.isBuild) {
        id = id.substring(buildProtocol.length);

        var idList = id.split(','),
            count = 0,
            buildIdDone = function () {
              count += 1;
              if (count === idList.length) {
                onload();
              }
            };

        // Set buildIdDone as executable by the build
        buildIdDone.__requireJsBuild = true;

        // Allow for multiple files separated by commas
        id.split(',').forEach(function (moduleId) {
          var path = req.toUrl(moduleId);

          // Leverage r.js optimizer special method for reading
          // files synchronously.
          require(element.depsFromText(requirejs._readFile(path)), buildIdDone);
        });
      } else {
        // Normal dependency request.
        req([id], function (mod) {
          // For builds do nothing, since need
          // runtime moduleId of the module to
          // do any final work. Rely on template
          // plugin to do any inlining.
          if (config.isBuild) {
            return onload(mod);
          }

          var template = mod.template;
          if (template) {
            if (!mod.moduleId) {
              return onload.error(new Error(id + ': specified templateId but missing moduleId'));
            }

            if (typeof template === 'string') {
              mod.template = element.textToTemplate(template, mod.moduleId);
            } else if (mod.translateIds) {
              // An inlined template object. Finish out
              // work that can only be done at runtime.
              var fullTemplateId = makeFullId(mod.templateId, mod.moduleId);
              template.text = element.idsToUrls(template.text, fullTemplateId);
              if (!template.fn) {
                template.fn = element.makeTemplateFn(template.text);
              }
            }
          }
          loadDeps(id, mod, req, onload);
        });
      }
    }
  };

  if (typeof CustomElements !== 'undefined') {
    // This section wires up processing of the initial document DOM.
    // In a real document.register browser, this would not be possible
    // to do, as document.register would grab all the tags before this
    // would likely run. Need a document.register.disabled capability?
    // also, onDomDone just a hack related to DOMContentLoaded not firing.
    var onDom, onDomDone = false;
    onDom = function () {
      if (onDomDone) {
        return;
      }
      onDomDone = true;

      // Collect all the tags already in the DOM
      var converted = element.textToTemplate(document.body.innerHTML);

      require(converted.deps, function() {
        // START TAKEN FROM Polymer CustomElements/src/boot.js
        // parse document
        CustomElements.parser.parse(document);
        // one more pass before register is 'live'
        CustomElements.upgradeDocument(document);
        // choose async
        var async = window.Platform && Platform.endOfMicrotask ?
        Platform.endOfMicrotask :
        setTimeout;
        async(function() {
          // set internal 'ready' flag, now document.register will trigger
          // synchronous upgrades
          CustomElements.ready = true;
          // capture blunt profiling data
          CustomElements.readyTime = Date.now();
          //if (window.HTMLImports) {
          //  CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
          //}
          // notify the system that we are bootstrapped
          //document.body.dispatchEvent(
          //  new CustomEvent('WebComponentsReady', {bubbles: true})
          //);
        // END TAKEN FROM Polymer CustomElements/src/boot.js

          onReady();
        });
      });
    };
    if (typeof CustomElements !== 'undefined') {
      if (document.readyState === 'complete') {
        onDom();
      } else {
        window.addEventListener('DOMContentLoaded', onDom);

        // Hmm, DOMContentLoaded not firing, maybe because of funky unknown
        // elements. So, going old school.
        var pollId = setInterval(function () {
          if (document.readyState === 'complete') {
            clearInterval(pollId);
            onDom();
          }
        }, 10);
      }
    }
  }

  return element;
});
