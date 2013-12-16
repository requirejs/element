Custom elements as seen through a module system.

*Disclaimer: This is a work in progress, as a way for me to learn web components and to find a good answer for them in a module system. So feedback is welcome, it is very possible that I miss important parts of the specs.*

* [Background](#background)
* [Perceived issues with Web Components](#perceived-issues-with-web-components)
* [Comparison with Polymer and X-Tags](#comparison-with-polymer-and-x-tags)
* [Element lifecycle background](#element-lifecycle-background)
* [Standard Web Component features used](#standard-web-component-features-used)
* [`element` loader plugin custom features](#element-loader-plugin-custom-features)
    * [Mixins for Custom Element modules](#mixins-for-custom-element-modules)
    * [Attribute wiring](#attribute-wiring)
* [`template` loader plugin custom features](#template-loader-plugin-custom-features)
    * [Avoiding FOUC](#avoiding-fouc)
    * [template.ready()](#template-ready)
    * [hrefid, srcid](#hrefid-srcid)
    * [Selector wiring](#selector-wiring)
    * [Example selectors](#example-selectors)
        * [data-prop](#data-prop)
        * [data-event](#data-event)
* [How is element.js constructed](#how-is-elementjs-constructed)
* [How is template.js constructed](#how-is-templatejs-constructed)
* [Installation](#installation)
* [Usage](#usage)
* [Notes](#notes)
* [TODO](#todo)

## Background

Web components as a concept are a great idea. However, by relying on expressing them primarily using HTML containers, it introduces some mismatches once the developer has a module system. With the coming module system in ECMAScript (ES) 6, this project explores how web components might look like if the developer has a module system available.

This project uses AMD as the module system, but as the ES module system will have very similar capabilities to AMD. So using AMD is a good test bed to work out module-custom element interaction, and it should be easily portable to ES6 when it becomes available.

This is an AMD loader plugin that implements loading of a custom element module via `element!custom-element-name`. There is a `template` plugin too, that handles scanning HTML snippets for custom elements and loading them as dependencies.

The element.js file uses Polymer's `document.register` polyfill, and it relies on browsers that have implemented the `template` element. So, right now it likely only works in Firefox and Chrome.

As `document.register` is implemented in browsers, this loader plugin will shrink dramatically, to a size that is smaller than the [e.js portion](https://github.com/jrburke/element/blob/master/parts/e.js) of this plugin.

So the hope is to just use the `template` element and `document.register` pieces of the Web Compnents stack in this plugin. Over time, each custom element could use scoped style elements and the Shadow DOM as they become available in browsers.

However, HTML Imports should not be needed with this modular approach, and because module loading in the browser is async, the assumption is that rendering will be always be completed async.

To avoid the FOUC issue, this plugin supports using a `template` tag to define the body, and once custom elements are loaded, that template is converted to the real contents of the body element.

Additionally, the `template` loader plugin supports using `hrefid` and `srcid` as attributes in place of `href` and `src` respectively. The `*id` versions allow using a `moduleID + '.' + extension` value, which is converted by the loader to a path when the templates are injected, changing them to regular `href` and `src` values in the process.

More details on those features below, but first, more on the perceived problems with the current state of Web Components, from the point of view of a person using modules.

## Perceived issues with Web Components

**HTML Imports use paths**. This is out of place with a module system, which uses IDs that are converted to paths. IDs work much better as the developer scales up, and allows better use of package managers to install custom elements.

Right now the examples showing **custom elements name themselves**. This is not so flexible for reuse. In a module system, the end user and other code defines the name for a given module.

**HTML Imports need extra mechanics** around an ownerDocument. This seems to cause confusion.

**HTML Imports creates an addition tension on page load symantics**. Some use cases do not want to have a Flash of Unstyled Content (FOUC) while the imports load. In this case might be more accurate to say Unapplied Content. There are talks about trying to allow blocking rendering by some extra signalling either by extra HTML elements or attributes. Modules are always async, and it looks like a `template` element could be used to avoid the FOUC problem.

**Current examples/base elments of web components are JavaScript-heavy**, with just a bit of HTML around them. Modules are great with JavaScript. AMD-based projects have established usage patterns that use loader plugins to load HTML snippets for HTML templating systems. That can be used for custom elements too. If the HTML snippet is small enough, it can just be inlined in the module, and [quasi-literals](http://wiki.ecmascript.org/doku.php?id=harmony:quasis) for ES6 open up other possibilities.

**Clear optimization strategies** are available with the loader plugin. The template and HTML, along with already-parsed dependencies can be inlined in a build step. Try it by going to the `tests/basic` directory, run `node tools/r.js -o tools/build.js`, and inspect the `www-built/app.js` file. There may be optimization strategies in the pipeline for HTML Imports, but with the modular approach, hopefully HTML Imports would not be needed.

Maybe not all HTML cases in the future will be able to use modules, and that some of the decisions in the web component stack, like the ones around HTML Imports, are there for those cases. I wanted to show how a modular approach can streamline some decisions and allow custom elements to be reusable in more ways, in particular by package managers. This fits well with the encapsulation goals of custom elements.

## Comparison with Polymer and X-Tags

Both [Polymer](http://www.polymer-project.org/) and [X-Tags](http://x-tags.org/) provide extras on top of the base capabilities being specified. While those things may be nice, and some are to feel out what might need to be standardized later, it gets hard to figure out what is custom and what is not, or to only take the custom parts that an app may use.

The goal of this modular plugin approach was to provide a small base to provide basic template, ID-to-path conversion, selector wiring and document.registration management, then encourage support for additional features as separate modules that can be mixed in to an element module's prototype.

This results in each module for a custom element just needing to export the object properties that will be mixed in to the prototype for the element's constructor function. [Example from the tests](https://github.com/jrburke/element/blob/master/tests/basic/www/lib/basic-header/main.js).

This loader plugin also avoids eval-related issues with [CSP](https://developer.mozilla.org/en-US/docs/Security/CSP/Introducing_Content_Security_Policy) because no eval-based approaches are used.

## Element lifecycle background

By default, custom elements registered via `document.register` can implement standard callbacks for some [lifecycle events](http://w3c.github.io/webcomponents/spec/custom/#dfn-definition-construction-algorithm):

* **createdCallback**: Called when an instance is created.
* **enteredViewCallback**: Called when the element is inserted into document.
* **leftViewCallback**: Called when element is removed from the document.
* **attributeChangedCallback**: Called when an attribute on the element is added, changed or removed.

Since these are special callbacks, and multiple mixins may want to listen for them, the `element` loader plugin allows multiple mixins to listen for these events.

The `template` loader plugin hooks into `createdCallback` to do the template wiring. The custom element can still have its own `createdCallback` on it. See [Mixins for Custom Element modules](#mixins-for-custom-element-modules) for more information.

## Standard Web Component features used

The `element` and `template` loader plugins uses these standard web components features:

* [template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template)
* [document.register](http://w3c.github.io/webcomponents/spec/custom/#dfn-document-register)

but uses a loader plugin to handle document.register, and uses modules for creating the custom element prototypes that is passed to document.register. The `template` plugin creates HTML snippets, via the template element, for the interior DOM structure of an element.

## `element` loader plugin custom features

The `element` loader plugin provides these services:

* Takes a mixin of properties, and converts that to an object prototype and calls `document.register` using the module ID referenced in the `element!` dependency reference.
* Multiplexes [lifecycle events]() mentioned by the mixins.
* Automatically wires up any attribute value that is set to setting that value on an instance's associated property.

More details follow.

### Mixins for Custom Element modules

The simplest form of creating a custom element module is to just to return an object literal that is the set a properties that the plugin will mix in to the prototype object for that custom element:

```javascript
define(function(require) {
  return {
    createdCallback: function () {},
    ...
  };
});
```

However, the module can also export an array of objects, and each object's properties will be mixed in to the prototype. If there are overlapping property names, the last one in the array list wins.

```javascript
define(function(require) {
  return [
    {
      someProp: function () {},
    },
    {
      createdCallback: function () {},
      // This someProp definition wins
      someProp: function () {}
    }
  ];
});
```

The only exception to the "last one wins" is if the property name ends in "Callback". Those are all stored and fired in the sequence they are mixed in to the element prototype. This multiplexing of Callback-style properties means that all of the [element lifecycle callbacks](#element-lifecycle-background) are multiplexed.

The Callback multiplexing also gives a convention for mixins that want to allow multiple function calls for custom element changes that should be done all in the same turn. This is in contrast to triggering custom events, which can complete asynchronously. Events should be favored if notification of a state change can happen async. This is not necessarily true for some things like the lifecycle callbacks.

This mixin behavior is particularly useful for mixing in [selector wiring](#selector-wiring) behaviors when using the `template` loader plugin.

### Attribute Wiring

`element` takes any attributes that were specified on the custom tag and sets those values using JS-equivalent names to the attribute names, to communicate the outside API values to the plugin instance.

For example, for this use of a custom element:

```html
<custom-tag some-attr="foo">
```

The loader plugin will look for a `someAttr` property in the custom element instance, and if it exists, it will call `instance.someAttr = 'foo'`. Getters and Setters can be used, see [the `someSuffix` section in basic-header](https://github.com/jrburke/element/blob/master/tests/basic/www/lib/basic-header/main.js). [Usage here](https://github.com/jrburke/element/blob/master/tests/basic/www/index.html).

Additionally, if an attribute is changed on a custom element instance, the `element` plugin listens for `attributeChangedCallback` and it will automatically trigger this attribute-to-property name conversion and set the value of that property name.


## `template` loader plugin custom features

The `template` loader plugin allows specifying an HTML file as the basis to use for the interior DOM structure of an element. It knows how to output a mixin object value that can be used by the `element` loader plugin.

In addition to doing the basic DOM construction, it provides these other capabilities:

### Avoiding FOUC

Since loading custom elements happens asynchronously, because that is how modules load, then there can be a Flash of Unstyled Content (FOUC), where the non-upgraded body of the document is shown before the custom elements are defined and used in the body.

The `template` plugin allows you to avoid that flash. If you construct the HTML page by using a template tag with an ID of "body", like so:

```html
<body><template id="body">
    Regular body content is put here, and it will
    not become the real body content until custom
    element loading and registration is complete.
</template></body>
```

Then the plugin will convert that template to the real body content once it knows all custom elements have loaded that were registered in that template body.

This may mean that any resources for the body, like images, may not start downloading until custom element initialization is done. I think this works out though, because those module elements may also affect layout, so best to have all of the custom module elements loaded first.

### template.ready()

Since custom element loading is async, you should not run application code that depends on the custom elements being in the document on window.onload or document DOMContentLoaded. Instead, register a callback with `template.ready()` to get notification when custom elements have been loaded and applied:

```javascript
template.ready(function() {
  // All custom elements needed for first page load have
  // been loaded and instantiated when this callback is
  // executed.
});
```

### hrefid, srcid

Once custom elements are installable via a package manager, knowing the actual paths for items starts to get harder to know. This was simulated in the basic test in this repo, where `www/lib` is where all packages would be installed. In the basic test, [`basic-header`](https://github.com/jrburke/element/tree/master/tests/basic/www/lib/basic-header) was package directory that had a few resources, and the basic-header.html template wanted to refer to an image in that directory. It did so via `srcid`:

```html
<img srcid="./localimage.png">
```

The `template` loader plugin will convert that to a path then replace `srcid` with `src` before inserting the template in the DOM. The same thing happens with `hrefid` to `href`.

### Selector wiring

The `template` loader plugin looks for special properties on the custom element prototype when constructing new instances, and will run node.querySelectorAll() queries based on those property names.

Combined with the [mixin capability](#mixins-for-custom-element-modules), this allows some automated wiring of behaviors to DOM nodes internal to the custom element.

If the prototype property name starts with `selector:`, then the rest of that property name will be used as a selector for a node.querySelectorAll() call, and each node found via that call will be passed to the function value for that property name.

Using the data-prop mixin as an example:

```javascript
{
  'selector:[data-prop]': function (node) {
    // `this` is still the custom element instance.
    this[node.dataset.prop] = node;
  }
}
```

This results in an `instance.querySelectorAll('[data-prop]'))`, and each node in that result is passed to the function mentioned above.

### Example selectors

These example selectors can be used alongside the `template` loader plugin to do some auto-wiring of some internal DOM structure to a custom element instance.

#### selectors/data-prop

If the template specifies `data-prop` as an attribute on a tag, then the element for that tag will be set as the value to that property on the custom element instance. For instance, with this tag in the element's template:

```html
<div data-prop="dialog"></div>
```

then after the instance of the element is created, that instance can use `this.dialog` to refer to that element.

Code is at [selectors/data-prop](https://raw.github.com/jrburke/element/master/selectors/data-prop.js).

Example usage:

```javascript
// A custom element that mixes in data-prop:
define(function(require) {
  return [
    require('selectors/data-prop'),

    // Main custom element implementation here
    {
      createdCallback: function () {
        // Assuming template specified
        // `data-prop="dialog"` on an element,
        // the following would work.
        console.log(this.dialog.classList);
      },
      ...
    }
  ];
});
```

#### selectors/data-event

You can wire up event handlers by using a `data-event` attribute on a tag in the template. The general format is:

```html
<div data-event="[DOM event name]:[property name],[DOM event name]:[property name]..."></div>
```

Where `DOM event name` is an event name like `click`, `mouseover`, and `property name` is the property name on the element that will be used for the call to `node.addEventListener`. If `[property name]` is omitted, then it is assumed that there is a property on the instance that is the same name as `[DOM event name]`.

Examples:

```
<div data-event="click"> --> node.addEventListener('click', this.click.bind(this));
<div data-event="click:dialogClick"> --> node.addEventListener('click', this.dialogClick.bind(this));

<div data-event="click:dialogClick,mouseover:dialogMouseOver"> -->
node.addEventListener('click', this.dialogClick.bind(this));
node.addEventListener('click', this.dialogMouseOver.bind(this));
```

Code is at [selectors/data-event](https://raw.github.com/jrburke/element/master/selectors/data-event.js).

Example usage:

```javascript
// A custom element that mixes in data-event:
define(function(require) {
  return [
    require('selectors/data-event'),

    // Main custom element implementation here
    {
      createdCallback: function () {},

      // If the template specified
      // `data-event="click:onDialogClick"`
      // on an element, the following would
      // be called if that element was
      // clicked.
      onDialogClick: function (evt) {}
      ...
    }
  ];
});
```

## How is element.js constructed

Just a concat of the files in the **parts** directory.

[e.js](https://github.com/jrburke/element/blob/master/parts/e.js) is the only new code for the plugin, the rest comes from Polymer's Custom Element shim.

As `document.register` is implemented by browsers, this plugin should shrink to just being the contents in e.js.

## How is template.js constructed

[template.js](https://github.com/jrburke/element/blob/master/template.js) is just a regular AMD loader plugin that returns an object structure that plays well with `element` mixins. It depends on `element` for the document.register shim and for the Custom Elements bootstrapping done on document load, to set up template.ready().

As `document.register` is implemented by browsers, this plugin will shrink a little bit, and the template.ready approach may change.

## Installation

They are still under development, so grab them from this repo in raw form:

* [element.js](https://raw.github.com/jrburke/element/master/element.js) or `volo install jrburke/element#element.js`
* [template.js](https://raw.github.com/jrburke/element/master/template.js) or `volo install jrburke/element#template.js`

Or you can use this example project that shows its usage: [jrburke/element-example](https://github.com/jrburke/element-example)

If you have [volo](http://volojs.org) installed:

```
volo create localexample jrburke/element-example
```

You can also look at the `tests/basic` directory from this repo.

Once they have more time to bake, the template plugin will move to its own repo and have its own distribution.

## Usage

In your app's main module, ask for `template` as a dependency, and register a ready listener to do work that depends on any custom elements that are in the body of the HTML page:

```javascript
// app/main module
define(function(require) {
  require('template').ready(function () {
    // all custom elements referenced in
    // the HTML body have been loaded,
    // registered, and instantiated.
  })
});
```

When adding new views to the HTML, each view should be [constructed as an HTML element](#mixins-for-custom-element-modules). Then, just use the `element!` to load those views dynamically:

```javascript
// this is inside a controller module that
// at some point decides to load a new
// view.
require['element!account-view'], function (AccountView) {
  // Create a new AccountView and insert into document
  var accountNode = new AccountView();

  // Listen to any DOM events in the list that
  // would trigger a contoller
  // change via listNode.addEventListener()
  accountNode.addEventListener('click', function (evt) {
    // account view clicked, do something.
  }, false);

  // Add to the DOM:
  document.body.appendChild(accountNode);
});
```

## Notes

### Cycles

Given the disconnected require calls done for custom elements found in templates, there is not a clear dependency graph between custom elements. This means it is hard to break cycles, otherwise known as circular dependencies.

I expect circular dependencies in elements will be extremely rare. However, if they show up, you just need to explicitly state the dependency as a `require('element!dependency-tag')` dependency in the module, and that should allow for cycle resolution.

## TODO

* Document templateInsertedCallback
* update example for templateInsertedCallback

* Show how two way data binding could be added via a selector mixin.
* Show an example that consumes original childNodes.
* shadowDom use?
* CSS: how to load
* expand polymer/xtag comparison?

## Spec questions

* If document.register in browser, when parsing HTML, need to wait for async load of things before starting. A "delay parsing" api, that then is called later to continue? Would allow for img/ Using template tag, but requires special knowledge.

* :unresolved matches selectors that have not been upgraded, for FOUC handling, but also, could poll until no others for load event?

* Some "customElementsReady" when all unknown elements resolved?

* Need to manually do the setPropFromAttr after creation, but should that happen automatically? Same with attibuteChangedCallback.

* what triggers "all unresolved have been resolved"?

* is="" attribute, why there, why not just a regular custom element name?

* events for the lifecycle callbacks?

* what is the spec around grabbing template children?
