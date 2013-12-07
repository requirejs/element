Custom elements as seen through a module system.

*Disclaimer: This is a work in progress, as a way for me to learn web components and to find a good answer for them in a module system. So feedback is welcome, it is very possible that I miss important parts of the specs.*

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

## Comparison with Polymer and X-Tags

Both [Polymer](http://www.polymer-project.org/) and [X-Tags](http://x-tags.org/) provide extras on top of the base capabilities being specified. While those things may be nice, and some are to feel out what might need to be standardized later, it gets hard to figure out what is custom and what is not, or to only take the custom parts that an app may use.

The goal of this modular plugin approach was to provide a small base to provide basic template, ID-to-path and document.registration management, then encourage support for additional features as separate modules that can be mixed in to an element module's prototype.

This results in each module for a custom element just needing to export the object properties that will be mixed in to the prototype for the element's constructor function. [Example from the tests](https://github.com/jrburke/element/blob/master/tests/basic/www/lib/basic-header/main.js).

This loader plugin also avoids eval-related issues with [CSP](https://developer.mozilla.org/en-US/docs/Security/CSP/Introducing_Content_Security_Policy) because no eval-based approaches are used.

## Lifecycle Background

By default, custom elements registered via `document.register` get notified of a few events:

* **createdCallback**: Called when an instance is created.
* **enteredView**: Called when the element is inserted into document.
* **leftView**: Called when element is removed from the document.
* **attributeChanged**: Called when an attribute on the element is added, changed or removed.

This loader plugin hooks into `createdCallback` to do the template wiring. The custom element can still have its own `createdCallback` on it, the plugin will call it after it does its work.

The loader plugin also takes any attributes on the tag and sets those values using JS-equivalent names to the attribute names, to communicate the outside API values to the plugin instance.

For example, for this use of a custom element:

```html
<custom-tag some-attr="foo">
```

The loader plugin will look for a `someAttr` property in the custom element instance, and if it exists, it will call `instance.someAttr = 'foo'`. Getters and Setters can be used, see [this example from the tests](https://github.com/jrburke/element/blob/369c736d597f98d826ee79e9aef5487525ce9169/tests/basic/www/lib/basic-header/main.js#L17). [Usage here](https://github.com/jrburke/element/blob/369c736d597f98d826ee79e9aef5487525ce9169/tests/basic/www/index.html#L7).

## Avoiding FOUC

If you construct the HTML page by using a template tag with an ID of "body", like so:

```html
<body><template id="body">
    regular body content here in waiting until registration starts
</template></body>
```

Then the plugin will convert that template to the real body content once it knows all custom elements have loaded.

This may mean that any resources for the body, like images, may not start downloading until custom element initialization is done. I think this works out though, because those module elements may also affect layout, so best to have all of the custom module elements loaded first.

## hrefid srcid

Once custom elements are installable via a package manager, knowing the actual paths for items starts to get harder to know. This was simulated in the basic test in this repo, where `www/lib` is where all packages would be installed. In the basic test, [`basic-header`](https://github.com/jrburke/element/tree/master/tests/basic/www/lib/basic-header) was package directory that had a few resources, and the basic-header.html template wanted to refer to an image in that directory. It did so via `srcid`:

```html
<img srcid="./localimage.png">
```

The loader plugin will conver that to a path then replace `srcid` with `src` before inserting the template in the DOM. The same thing happens with `hrefid` to `href`.

## data-prop

If the template specifies `data-prop` as an attribute on a tag, then the element for that tag will be set as the value to that property on the custom element instance. For instance, with this tag in the element's template:

```html
<div data-prop="dialog"></div>
```

then after the instance of the element is created, that instance can use `this.dialog` to refer to that element.

## data-event

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

## Cycles

Given the disconnected require calls done for custom elements found in templates, there is not a clear dependency graph between custom elements. This means it is hard to break cycles, otherwise known as circular dependencies.

I expect circular dependencies in elements will be extremely rare. However, if they show up, you just need to explicitly state the dependency as a `require('element!dependency-tag')` dependency in the module, and that should allow for cycle resolution.

## How is element.js constructed

Just a concat of the files in the **parts** directory. [e.js](https://github.com/jrburke/element/blob/master/parts/e.js) is the only new code for the plugin, the rest comes from Polymer's Custom Element shim.

## TODO

* Show how two way data binding could be added via a module dependency mixin for a particular custom element module.
* Convert the dataWires for data-prop and data-event in e.js to just be modules to mixin via normal module dependencies.


* example project
* work with requirejs?
