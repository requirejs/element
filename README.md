Custom elements as seen through a module system.

*Disclaimer: This is a work in progress, as a way for me to learn web components and to find a good answer for them in a module system. So feedback is welcome, it is very possible that I miss important parts of the specs.*

* [Background](#background)
* [Perceived issues with Web Components](#perceived-issues-with-web-components)
* [Comparison with Polymer and X-Tags](#comparison-with-polymer-and-x-tags)
* [Custom features](#custom-features)
    * [Element lifecycle background](#element-lifecycle-background)
    * [Mixins for Custom Element modules](#mixins-for-custom-element-modules)
    * [Avoiding FOUC](#avoiding-fouc)
    * [element.ready()](#element-ready)
    * [Attribute wiring](#attribute-wiring)
    * [Template support](#template-support)
    * [hrefid, srcid](#hrefid-srcid)
    * [Selector wiring](#selector-wiring)
        * [data-prop](#data-prop)
        * [data-event](#data-event)
* [How is element.js constructed](#how-is-elementjs-constructed)
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

Additionally, it supports using `hrefid` and `srcid` as attributes in place of `href` and `src` respectively. The `*id` versions allow using a `moduleID + '.' + extension` value, which is converted by the loader to a path when the templates are injected, changing them to regular `href` and `src` values in the process.

More details on those features below, but first, more on the perceived problems with the current state of Web Components, from the point of view of a person using modules.

## Perceived issues with Web Components

**HTML Imports use paths**. This is out of place with a module system, which uses IDs that are converted to paths. IDs work much better as the developer scales up, and allows better use of package managers to install custom elements.

Right now the examples showing **custom elements name themselves**. This is not so flexible for reuse. In a module system, the end user and other code defines the name for a given module.

**HTML Imports need extra mechanics** around an ownerDocument. This seems to cause confusion.

**HTML Imports creates an addition tension on page load symantics**. Some use cases do not want to have a Flash of Unstyled Content (FOUC) while the imports load. In this case might be more accurate to say Unapplied Content. There are talks about trying to allow blocking rendering by some extra signalling either by extra HTML elements or attributes. Modules are always async, and it looks like a `template` element could be used to avoid the FOUC problem.

**Current examples/base elments of web components are JavaScript-heavy**, with just a bit of HTML around them. Modules are great with JavaScript. AMD-based projects have established usage patterns that use loader plugins to load HTML snippets for HTML templating systems. That can be used for custom elements too. If the HTML snippet is small enough, it can just be inlined in the module, and [quasi-literals](http://wiki.ecmascript.org/doku.php?id=harmony:quasis) for ES6 open up other possibilities.

**Clear optimization strategies** are available with the loader plugin. The template and HTML, along with already-parsed dependencies can be inlined in a build step. Try it by going to the `tests/basic` directory, run `node tools/r.js -o tools/build.js`, and inspect the `www-built/app.js` file. There may be optimization strategies in the pipeline for HTML Imports, but with the modular approach, hopefully HTML Imports would not be needed.

Maybe not all HTML cases in the future will be able to use modules, and that some of the decisions in the web component stack, like the ones around HTML Imports, are there for those cases. I wanted to show how a modular approach can streamline some decisions and allow custom elements to be reusable in more ways, in particular by package managers. This fits well with the encapsulation goals of custom elements.

I also want to be sure that decisions for the web component stack do not harm modular use.

Related, but separately: I am very wary of anyone advocating HTML Imports for loading scripts. There is the script tag for path-based script loading, and the ES Module Loader API for anything else (or an AMD module loader in the meantime).

## Comparison with Polymer and X-Tags

Both [Polymer](http://www.polymer-project.org/) and [X-Tags](http://x-tags.org/) provide extras on top of the base capabilities being specified. While those things may be nice, and some are to feel out what might need to be standardized later, it gets hard to figure out what is custom and what is not, or to only take the custom parts that an app may use.

The goal of this modular plugin approach was to provide a small base to provide basic template, ID-to-path conversion, selector wiring and document.registration management, then encourage support for additional features as separate modules that can be mixed in to an element module's prototype.

This results in each module for a custom element just needing to export the object properties that will be mixed in to the prototype for the element's constructor function. [Example from the tests](https://github.com/jrburke/element/blob/master/tests/basic/www/lib/basic-header/main.js).

This loader plugin also avoids eval-related issues with [CSP](https://developer.mozilla.org/en-US/docs/Security/CSP/Introducing_Content_Security_Policy) because no eval-based approaches are used.

## Custom features

This plugin uses these standard web components features:

* [template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template)
* [document.register](http://w3c.github.io/webcomponents/spec/custom/#dfn-document-register)

but uses a loader plugin to handle document.register, and uses modules for creating the custom element prototypes that is passed to document.register.

Since a JS module is the primary definition of the custom element, then there needs to be a way to specify an HTML structure for the internals of the custom element.

The custom parts of this loader plugin then are about wiring up an HTML structure via a template element, to allow using module IDs instead of paths for resources inside that template, and to allow a convention for wiring up bindings with the template.

### Element lifecycle background

By default, custom elements registered via `document.register` can implement standard callbacks for some [lifecycle events](http://w3c.github.io/webcomponents/spec/custom/#dfn-definition-construction-algorithm):

* **createdCallback**: Called when an instance is created.
* **enteredViewCallback**: Called when the element is inserted into document.
* **leftViewCallback**: Called when element is removed from the document.
* **attributeChangedCallback**: Called when an attribute on the element is added, changed or removed.

This loader plugin hooks into `createdCallback` to do the template wiring. The custom element can still have its own `createdCallback` on it, the plugin will call it after it does its work.

If the custom element does not implement an `attributeChangedCallback` method, then this plugin will wire up a default one that just takes any attribute change, and converts that to a property name value set. See [attribute wiring](#attribute-wiring) for more information.

On to the more custom behaviors of this loader plugin:

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

This mixin behavior is particularly useful for mixing in [selector wiring](#selector-wiring) behaviors.

### Avoiding FOUC

Since loading custom elements happens asynchronously, because that is how modules load, then there can be a Flash of Unstyled Content (FOUC), where the non-upgraded body of the document is shown before the custom elements are defined and used in the body.

The plugin allows you to avoid that flash. If you construct the HTML page by using a template tag with an ID of "body", like so:

```html
<body><template id="body">
    Regular body content is put here, and it will
    not become the real body content until custom
    element loading and registration is complete.
</template></body>
```

Then the plugin will convert that template to the real body content once it knows all custom elements have loaded.

This may mean that any resources for the body, like images, may not start downloading until custom element initialization is done. I think this works out though, because those module elements may also affect layout, so best to have all of the custom module elements loaded first.

### element.ready()

Since custom element loading is async, you should not run application code that depends on the custom elements being in the document on window.onload or document DOMContentLoaded. Instead, register a callback with `element.ready()` to get notification when custom elements have been loaded and applied:

```javascript
element.ready(function() {
  // All custom elements needed for first page load have
  // been loaded and instantiated when this callback is
  // executed.
});
```

### Attribute Wiring

The loader plugin takes any attributes that were specified on the custom tag and sets those values using JS-equivalent names to the attribute names, to communicate the outside API values to the plugin instance.

For example, for this use of a custom element:

```html
<custom-tag some-attr="foo">
```

The loader plugin will look for a `someAttr` property in the custom element instance, and if it exists, it will call `instance.someAttr = 'foo'`. Getters and Setters can be used, see [this example from the tests](https://github.com/jrburke/element/blob/0119a37f8816bbd29ad8e7c701169a6927e0b6ff/tests/basic/www/lib/basic-header/main.js#L27). [Usage here](https://github.com/jrburke/element/blob/0119a37f8816bbd29ad8e7c701169a6927e0b6ff/tests/basic/www/index.html#L7).

Additionally, if the element definition does not define an `attributeChangedCallback`, then this plugin will add a simple `attributeChangedCallback` that just does this attribute-to-property name conversion and set the value of that property name.

### Template support

If the module exports a property called `template`, then the loader plugin will make sure to load the template's dependencies before considering the current element module loaded.

The loader plugin expects the following structure for the `template` property:

```javascript
{
  template: {
    // Array of dependencies for the template. This is
    // normally just a list of custom-element names that
    // are used in the template.
    deps: [],
    // A function that is called that generates a DOM
    // node that is used for the element instance.
    // The `this` value is this template object,
    // and the `node`argument is the custom element
    // that will use the return value. If the node
    // wants to use existing children, do so in the
    // fn function -- they are cleared out after
    // fn is called.
    fn: function(node) {}
  }
}
```

That form is the most basic of the template forms and useful if you are using an HTML template library to generate the template function.

The following `template` object structure is supported if the template is a simple text template that wants [hrefid and srcid](#hrefid-srcid) attributes processed:

```javascript
{
  template: {
    id: 'template/id',
    deps: [],
    translateIds: true,
    text: '...'
  }
}
```

Note that `fn` is not provided in this case. The loader plugin will create an `fn` property for it after doing the hrefid and srcid conversions.

If the `template!` loader plugin is used, then that plugin will generate this template object structure based on a module reference to an HTML file:

```javascript
define(function(require) {
  return  {
    template: require('template!./mytemplate.html')
  }
});
```

### hrefid, srcid

Once custom elements are installable via a package manager, knowing the actual paths for items starts to get harder to know. This was simulated in the basic test in this repo, where `www/lib` is where all packages would be installed. In the basic test, [`basic-header`](https://github.com/jrburke/element/tree/master/tests/basic/www/lib/basic-header) was package directory that had a few resources, and the basic-header.html template wanted to refer to an image in that directory. It did so via `srcid`:

```html
<img srcid="./localimage.png">
```

If the element's [template property](#template-support) allows for it, the loader plugin will convert that to a path then replace `srcid` with `src` before inserting the template in the DOM. The same thing happens with `hrefid` to `href`.

## Selector wiring

The loader plugin looks for special properties on the custom element prototype when constructing new instances, and will run node.querySelectorAll() queries based on those property names.

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

As `document.register` is implemented by browsers, this plugin should shrink to a size that is smaller than e.js.

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

In your app's main module, ask for element as a dependency, and register a ready listener to do work that depends on any custom elements that are in the body of the HTML page:

```javascript
// app/main module
define(function(require) {
  require('element').ready(function () {
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

* Show how two way data binding could be added via a selector mixin.
* Show an example that consumes original childNodes.
* shadowDom use?
* CSS: how to load
* expand polymer/xtag comparison?


on refactor:
* update in file comments
* update readme
* update sample

Updates to do:

* element is needed because need outside ID for
the tag ID,
  not the module's actual ID (packages issue)
* only depends on a prototype.template() function now.
* creates an _element property to hold selectors and multiplexed function listeners. But only functions, no getters/setters.
* selectors: are only remembered once, on init.

* template depends on element, it uses 'element!' in deps name, and it
uses element for the document.register() functionality.

## Spec questions

* If document.register in browser, when parsing HTML, need to wait for async load of things before starting. A "delay parsing" api, that then is called later to continue? Would allow for img/ Using template tag, but requires special knowledge.

* Need to manually do the setPropFromAttr after creation, but should that happen automatically?
Same with attibuteChagnedCallback.

* :unresolved matches selectors that have not been upgraded, for FOUC handling, but also, could poll until no others for load event?

* what triggers "all unresolved have been resolved"?

* is="" attribute, why there, why not just a regular custom element name?


