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
    readyQueue.forEach(function (fn) {
      fn();
    });
    readyQueue = [];
  }

  var element = {
    ready: function (fn) {
      if (element._ready) {
        setTimeout(fn);
      } else {
        readyQueue.push(fn);
      }
    },

    findTagDeps: function(text) {
      var match,
        deps = [];
      text = text.replace(commentRegExp, '');

      tagRegExp.lastIndex = 0;
      while ((match = tagRegExp.exec(text))) {
        deps.push(module.id + '!' + match[1]);
      }

      return deps;
    },

    load: function (id, require, onload, config) {
      if (config.isBuild) {
        // TODO, wire up build inlining
        return;
      }

      require([id], function (mod) {
        function finish() {

          if (typeof mod.template === 'string') {
            templateDiv.innerHTML = '<template>' + mod.template + '</template>';
            mod.template = templateDiv.removeChild(templateDiv.firstElementChild);
          }

          var proto = Object.create(HTMLElement.prototype);
          Object.keys(mod).forEach(function (key) {
            proto[key] = mod[key];
          });

          // Wire up auto-injection of the template
          if (proto.template) {
            var oldCallback = proto.createdCallback;
            proto.createdCallback = function () {
              this.innerHTML = '';

              var i, item,
                  node = this.template.content.cloneNode(true),
                  attrs = this.attributes;

              // Wire attributes to this element's custom/getter setters
              /*
              for (i = 0; i < attrs.length; i++) {
                item = attrs.item(i);
                propName = makePropName(item.nodeName);

                if (this[propName]) {

                }
              }
              */

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

        var deps = [];
        if (typeof mod.template === 'string') {
          deps = element.findTagDeps(mod.template);
        }

        if (deps.length) {
          require([deps], finish);
        } else {
          finish();
        }
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
    var deps = element.findTagDeps(document.body.innerHTML);

    require(deps, function() {
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
