/*


<div data-cstate="account.name"></div>

<button data-aif="disabled:hackMutationHeader.isStarred"></button>

<input data-astate="value:displayName,placeholder:l10n.placeholder">

 */
define(function () {
  'use strict';
  var slice = Array.prototype.slice,
      hasOwn = Object.prototype.hasOwnProperty,
      waitingForRaf = false,
      updates = [],
      stateSelector = '[data-cstate],[data-aif],[data-astate]';

  function update() {
    var objs = updates;
    updates = [];
    waitingForRaf = false;
    objs.forEach(function(obj) {
      try {
        obj.renderStateMods();
      } catch(e) {
        setTimeout(function() {
            console.error(e);
        });
      }
    });
  }

  function scheduleUpdate(obj) {
    if (updates.indexOf(obj) === -1) {
      updates.push(obj);
    }

    if (!waitingForRaf) {
      waitingForRaf = true;
      requestAnimationFrame(update);
    }
  }

  function getStateValue(obj, stateParts) {
    for (var i = 0; i < stateParts.length; i++) {
      obj = obj[stateParts[i]];
    }
    return obj;
  }

  function hasProp(obj, prop) {
    return hasOwn.call(obj, prop);
  }

  function getStateFn(prop) {
    return this._state[prop];
  }

  function setStateFn(prop, value) {
    this._state[prop] = value;
    this._statePropUpdates[prop] = true;
    scheduleUpdate(this);
  }

  function contentStateFn(node, stateParts) {
    var value = getStateValue(this, stateParts);
    node.textContent = value;
  }

  function bindState(node) {
    var nodes = slice.call(node.querySelectorAll(stateSelector));
    if (node.dataset.cstate || node.dataset.aif || node.dataset.astate) {
      nodes.unshift(node);
    }

console.log('NODES ARE: ' + (typeof nodes) + ', ' + nodes);

    nodes.forEach(function (matchNode) {
console.log('GOT THING: ', matchNode);
      var cstate = matchNode.dataset.cstate;
      if (cstate) {
        cstate.split(',').forEach(function(stateValue) {
          var stateParts = stateValue.split('.'),
              prop = stateParts[0];

          if (!hasProp(node._stateMods, prop)) {
            node._stateMods[prop] = [];
          }
          node._stateMods[prop]
              .push(contentStateFn.bind(node, matchNode, stateParts));

          if (!hasProp(node, 'hasOwnProperty')) {
            Object.defineProperty(node, prop, {
              enumerable: true,
              get: getStateFn.bind(node, prop),
              set: setStateFn.bind(node, prop)
            });
          }
        });
      }

    });

    node._stateBound = true;
  }

  return {
    // TODO, need this on first render??
    renderState: function() {

    },

    renderStateMods: function() {
      var propUpdates = this._statePropUpdates;
      this._statePropUpdates = {};
      Object.keys(propUpdates).forEach(function(prop) {
        if (hasProp(this._stateMods, prop)) {
          this._stateMods[prop].forEach(function(fn) {
            fn();
          });
        }
      }.bind(this));
    },

    createdCallback: function() {
      this._state = {};
      this._stateMods = {};
      this._statePropUpdates = {};
console.log('HERE MAN');
      // Node may not be using a template string for its internals, so do the
      // work now if not done before.
      if (!this._stateBound) {
        bindState(this);
      }
    },

    // TODO, what about nested prop changes, like account.name?
    // TODO, what about arrays of items.

    templateInsertedCallback: function() {
      bindState(this);
    }
  };
});