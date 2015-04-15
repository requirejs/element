/*
* Only supports top level property changes. So for this.account.name,
  only this.account is watched for changes.

todo:
* need this on first render renderState: function() {}?

* the difference between attributes and properties. So how to deal
  with .checked? data-pstate="checked:selected" and a data-sif?

* investigate array changes: both in data and in sub elements
  that are bound to data items. Maybe have special tags that
  deal with array roots.
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

  function getStateFn(obj, prop) {
    return obj._state[prop];
  }

  function setStateFn(obj, prop, value) {
    obj._state[prop] = value;
    obj._statePropUpdates[prop] = true;
    scheduleUpdate(obj);
  }

  function contentStateFn(obj, node, stateParts) {
    var value = getStateValue(obj, stateParts);
    node.textContent = value;
  }

  function attrStateFn(obj, node, stateParts, attrName) {
    var value = getStateValue(obj, stateParts);
    if (value === undefined || value === null) {
      node.removeAttribute(attrName);
    } else {
      node.setAttribute(attrName, value);
    }
  }

  function aifBaseFn(node, attrName, isTrue) {
    if (isTrue) {
      node.setAttribute(attrName, attrName);
    } else {
      node.removeAttribute(attrName);
    }
  }

  function aifYesFn(obj, node, stateParts, attrName) {
    var value = !!getStateValue(obj, stateParts);
    aifBaseFn(node, attrName, value);
  }

  function aifNoFn(obj, node, stateParts, attrName) {
    var value = !getStateValue(obj, stateParts);
    aifBaseFn(node, attrName, value);
  }


  function defineProp(node, prop, stateModFn) {
    if (!hasProp(node._stateMods, prop)) {
      node._stateMods[prop] = [];
    }
    node._stateMods[prop].push(stateModFn);

    if (!hasProp(node, prop)) {
      Object.defineProperty(node, prop, {
        enumerable: true,
        get: getStateFn.bind(undefined, node, prop),
        set: setStateFn.bind(undefined, node, prop)
      });
    }
  }

  function bindState(node) {
    var nodes = slice.call(node.querySelectorAll(stateSelector));
    if (node.dataset.cstate || node.dataset.aif || node.dataset.astate) {
      nodes.unshift(node);
    }

    nodes.forEach(function (matchNode) {
      // data-cstate wiring.
      var cstate = matchNode.dataset.cstate;
      if (cstate) {
        cstate.split(',').forEach(function(stateValue) {
          var stateParts = stateValue.split('.'),
              prop = stateParts[0];

          defineProp(node, prop,
            contentStateFn.bind(undefined, node, matchNode, stateParts));
        });
      }

      // data-astate wiring.
      var astate = matchNode.dataset.astate;
      if (astate) {
        astate.split(',').forEach(function(nameValue) {
          var pair = nameValue.split(':'),
              attrName = pair[0],
              stateValue = pair[1],
              stateParts = stateValue.split('.'),
              prop = stateParts[0];

          defineProp(node, prop,
            attrStateFn.bind(undefined, node, matchNode, stateParts, attrName));

        });
      }

      // data-aif wiring.
      var aif = matchNode.dataset.aif;
      if (aif) {
        aif.split(',').forEach(function(nameValue) {
          var pair = nameValue.split(':'),
              attrName = pair[0],
              stateValue = pair[1],
              stateParts = stateValue.split('.'),
              prop = stateParts[0],
              aifFn = aifYesFn;

          if (prop.indexOf('!') === 0) {
            prop = prop.substring(1);
            stateParts[0] = prop;
            aifFn = aifNoFn;
          }

          defineProp(node, prop,
            aifFn.bind(undefined, node, matchNode, stateParts, attrName));

        });
      }
    });

    node._stateBound = true;
  }

  return {
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

      // Node may not be using a template string for its internals, so do the
      // work now if not done before.
      if (!this._stateBound) {
        bindState(this);
      }
    },

    templateInsertedCallback: function() {
      bindState(this);
    }
  };
});