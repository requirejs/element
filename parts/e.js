/*jshint browser: true */
/*globals define, CustomElements, Platform */

/*
Notes:

* CustomElement code from polymer-v0.0.20131107

* Warning: has sucky cycle support between custom element names. But cycles
  custom elements would be crazy talk right? Right? If not, would be good
  to get that use case.

*/
define(function(require, exports, module) {
  var parser, dataWires,
    isReady = false,
    readyQueue = [],
    tagRegExp = /<(\w+-\w+)(\s|>)/g,
    commentRegExp = /<!--*.?-->/g,
    hrefIdRegExp = /\shrefid="([^"]+)"/g,
    srcIdRegExp = /\ssrcid="([^"]+)"/g,
    templateDiv = document.createElement('div'),
    slice = Array.prototype.slice;

  if (typeof CustomElements !== 'undefined') {
    parser = CustomElements.parser;
  }

  dataWires = [
    ['data-attr', function (node, value, instance) {
      instance[value] = node;
    }],
    ['data-event', function (node, value, instance) {
      node.addEventListener(value, instance[value].bind(instance), false);
    }]
  ];

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

  function makeFullId(id, relId) {
    if (id.indexOf('.') === 0 && relId) {
      // Trim off the last segment of the relId, as we want
      // the "directory" level of the ID
      var parts = relId.split('/');
      parts.pop();
      relId = parts.join('/');

      id = (relId ? relId + '/' : '') + id;
    }
console.log('MAKE FULL ID FROM [' + id + '], [' + relId + '] = ' + id);
    return id;
  }

  function makePropName(attrName) {
    var parts = attrName.split('-');
    for (var i = 1; i < parts.length; i++) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
    }
    return parts.join('');
  }

  function fetchText(url, onload, onerror) {
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
  }


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
//xxx make sure template is created correctly
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

        dataWires.forEach(function (wire) {
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
   * Main module export
   */
  var element = {
    ready: function (fn) {
      if (isReady) {
        setTimeout(fn);
      } else {
        readyQueue.push(fn);
      }
    },

    makeTemplateNode: function (text) {
      templateDiv.innerHTML = '<template>' + text + '</template>';
       return templateDiv.removeChild(templateDiv.firstElementChild);
    },

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

    idToTemplate: function(id, onload, onerror) {
      fetchText(require.toUrl(id), function (text) {
        onload(element.textToTemplate(text, id));
      }, onerror);
    },

    textToTemplate: function(text, id) {
      var convertedText = element.idsToUrls(text, id),
          template = element.makeTemplateNode(convertedText);

      return {
        id: id,
        deps: element.depsFromText(text),
        text: convertedText,
        fn: function() {
          return template.content.cloneNode(true);
        }
      };
    },

    load: function (id, req, onload, config) {
      if (config.isBuild) {
        // TODO, wire up build inlining
        return;
      }

      req([id], function (mod) {
        if (mod.templateId) {
          if (!mod.moduleId) {
            return onload.error(new Error(id + ': specified templateId but missing moduleId'));
          }
          var fullTemplateId = makeFullId(mod.templateId, mod.moduleId);
          return element.idToTemplate(fullTemplateId, function(templateObj) {
            mod.template = templateObj;
            loadDeps(id, mod, req, onload);
          }, onload.error);
        } else if (typeof mod.template === 'string') {
          if (!mod.moduleId) {
            return onload.error(new Error(id + ': specified templateId but missing moduleId'));
          }
          mod.template = element.textToTemplate(mod.template, mod.moduleId);
        }

        loadDeps(id, mod, req, onload);
      });
    }
  };

  // This section wires up processing of the initial document DOM.
  // In a real document.register browser, this would not be possible
  // to do, as document.register would grab all the tags before this
  // would likely run. Need a document.register.disabled capability?
  // also, onDomDone just a hack related to DOMContentLoaded not firing.
  var onDomDone = false;
  function onDom() {
    if (onDomDone) {
      return;
    }
    onDomDone = true;

    // Collect all the tags already in the DOM
    var converted = element.textToTemplate(document.body.innerHTML);

    require(converted.deps, function() {
      // TAKEN FROM Polymer CustomElements/src/boot.js
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

        onReady();
      });
    });
  }
  if (typeof CustomElements !== 'undefined') {
    if (document.readyState === 'complete') {
      onDom();
    } else {
      window.addEventListener('DOMContentLoaded', onDom);

      // Hmm, DOMContentLoaded not firing, maybe because of funky unknown
      // elements. So, going old school
      var pollId = setInterval(function () {
        if (document.readyState === 'complete') {
          clearInterval(pollId);
          onDom();
        }
      }, 10);
    }
  }

  return element;
});
