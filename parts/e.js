/*jshint browser: true */
/*globals define, requirejs, CustomElements, Platform */

/*
CustomElement code near the bottom of this file is
from polymer-v0.0.20131107
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
      selectorProtocol = 'selector:',
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
   * @param  {String} refId ID to use as a basis for the
   * the local ID.
   * @return {String} full ID
   */
  function makeFullId(id, refId) {
    if (id.indexOf('.') === 0 && refId) {
      // Trim off the last segment of the refId, as we want
      // the "directory" level of the ID
      var parts = refId.split('/');
      parts.pop();
      refId = parts.join('/');

      id = (refId ? refId + '/' : '') + id;
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
   * @param  {Object} proto    the prototype for the custom element.
   * @param  {Array} selectors an array of selectors to run and functions
   * to execute for each node matched by the corresponding selector.
   * @param  {Function} onload function given by AMD load to call once
   * the custome element is loaded.
   */
  function finishLoad(id, proto, selectorArray, onload) {
    var oldCallback;

    // Wire up auto-injection of the template
    if (proto.template) {
      oldCallback = proto.createdCallback;
      proto.createdCallback = function () {
        // TODO: allow these sub elements to be wired in to template?
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

        selectorArray.forEach(function (wire) {
          slice.call(node.querySelectorAll(wire[0])).forEach(function (node) {
            wire[1].call(this, node);
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
     * @param  {String} refId the reference module ID to use,
     * which is normallly the module ID associated with the
     * HTML string given as input.
     * @return {String} converted HTML string.
     */
    idsToUrls: function(text, refId) {
      text = text
              .replace(hrefIdRegExp, function (match, id) {
                id = makeFullId(id, refId);
                return ' href="' + require.toUrl(id) + '"';
              })
              .replace(srcIdRegExp, function (match, id) {
                id = makeFullId(id, refId);
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
     * @param  {String} id module ID for the custom
     * element associated with this template.
     * @param  {Boolean} skipTranslateIds for build
     * concerns, want to avoid the work that translate
     * IDs until runtime, when more state is known
     * about final path information. If that is the
     * case, then pass true for this value.
     * @return {Object} template object.
     */
    textToTemplate: function(text, id, skipTranslateIds) {
      var obj,
          deps = element.depsFromText(text);

      obj = {
        id: id,
        deps: deps
      };

      if (skipTranslateIds) {
        obj.translateIds = true;
        obj.text = text;
      } else {
        obj.text = element.idsToUrls(text, id);
        // Cannot reliably create the template function
        // until IDs are translated, so wait on that
        // step until later.
        obj.fn = element.makeTemplateFn(obj.text);
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
          // For builds do nothing, since need runtime moduleId of the
          // module to do any final work. Rely on template plugin to do
          // any inlining.
          if (config.isBuild) {
            return onload();
          }

          // Create the prototype for the custom element.
          // Allow the module to be an array of mixins.
          // If it is an array, then mix them all in to the
          // prototype.
          var proto = Object.create(HTMLElement.prototype),
              mixins = Array.isArray(mod) ? mod : [mod],
              selectors = {},
              selectorArray = [];

          mixins.forEach(function (mixin) {
            Object.keys(mixin).forEach(function (key) {
              if (key.indexOf(selectorProtocol) === 0) {
                // A selector field. If dupes, only allow the last
                // one to win, but it will always occupy the same
                // place in the selectorArray. Use an array as the
                // final storage format for optimized looping during
                // each element instance's createdCallback.
                var selectorKey = key.substring(selectorProtocol.length),
                    index = selectorArray.length;

                if (selectors.hasOwnProperty(selectorKey)) {
                  index = selectors[selectorArray];
                }

                selectorArray[index] = [selectorKey, mixin[key]];
                selectors[selectorKey] = index;
              }

              Object.defineProperty(proto, key, Object.getOwnPropertyDescriptor(mixin, key));
            });
          });

          var template = proto.template;
          if (template) {
            if (typeof template === 'string') {
              proto.template = element.textToTemplate(template, template.id);
            } else if (template.translateIds) {
              // An inlined template object. Finish out
              // work that can only be done at runtime.
              var fullTemplateId = makeFullId(template.id, template.id);
              template.text = element.idsToUrls(template.text, fullTemplateId);
              if (!template.fn) {
                template.fn = element.makeTemplateFn(template.text);
              }
              template.translateIds = false;
            }
          }

          if (proto.template && proto.template.deps) {
            // Load the template dependencies before considering
            // this element completely loaded.
            req(proto.template.deps, function () {
              finishLoad(id, proto, selectorArray, onload);
            });
          } else {
            finishLoad(id, proto, selectorArray, onload);
          }
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
