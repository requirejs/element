Custom elements as seen through a module system.

Web components as a concept are a great idea. However, by relying on expressing them primarily using HTML containers, it introduces some mismatches once the developer has a module system. With the coming module system in ECMAScript (ES) 6, this project explores how web components might look like if the developer has a module system available.

This project uses AMD as the module system, but as the ES system will have very similar capabilities to AMD, this is a good test bed to work out module-custom element interaction, and it will be easily portable to ES6 when it becomes available.

This is an AMD loader plugin that implements loading of a custom element module via `element!custom-element-name`. There is a `template` plugin too, that handles scanning HTML snippets for custom elements and loading them as dependencies.

The element.js file uses Polymer's document.register polyfill, and it relies on browsers that have implemented the `template` element. So, right now it only works in Firefox and Chrome.

As document.register is implemented in browsers, this loader plugin will shrink dramatically, to a size that is smaller than the e.js portion of this plugin.

So the hope is to use the `template` element and `document.register` pieces of the Web Compnents stack. Over time, each custom element could use scoped style elements and the Shadow DOM as appropriate.

However, HTML Imports should not be needed with this modular approach, and because module loading in the browser is async, the assumption is that rendering will be completed async.

To avoid the FOUC issue, this plugin supports using a `template` tag to define the body, and once custom elements are loaded, that template is converted to the real contents of the body element.

Additionally, it supports using `hrefid` and `srcid` as attributes in place of `href` and `src` respectively. The `*id` versions allow using a `moduleID + '.' + extension` value, which is converted by the loader to a path when the templates are injected, changing them to regular `href` and `src` values in the meantime.

More details on those features below, but more on the perceived problems with the current state of Web Components, from the point of view of a person using modules.


### Perceived issues with Web Components

* HTML Imports use paths. This is out of place with a module system, which uses IDs that are converted to paths. This plays much better as the developer scales up, and allows better use of package managers to install custom elements.

* Right now the examples showing custom elements name themselves. This is also not scalable in a module system, where the end user and other code defines the name for a given module.

* HTML Imports need extra mechanics around an ownerDocument. This seems to cause confusion.

* HTML Imports creates an addition tension on page load symantics. Some use cases do not want to have a Flash of Unstyled Content (FOUC) (in this case might be more accurate to say Unapplied Content) while the imports load. There are talks about trying to allow blocking rendering by some extra signalling either by extra HTML elements or attributes.

* Current examples of web components are mostly JavaScript.

Modules are great with JavaScript. AMD-based projects have established usage patterns that use loader plugins to load HTML snippets for HTML templating systems. This can be used here too. As multistring literals quasis??? come to the language, if the HTML snippet is small enough, it can just be inlined in the module.


### Compared with

* CSP issues with Polymer
* Fancier



### Comparison with Polymer and X-Tags

Why does this

### Avoiding FOUC:

<body><template id="body">
    regular body content here in waiting until registration starts
</template></body>

Hopefully custom elements in a template are not resolved until template activated?

Downside, image URLs and such are not fetched until scripts have loaded.

### hrefid srcid

xxx

### data-name

### data-event

### Mixins for two way bindings, etc..

### Generalized templates

generalize
---

### TODO

Just a start,



How to deal with attribute setting? So:

<custom-tag some-attr="foo">

Those are public interface toggles to element. Like a set(options) sort of thing.

Map those to someAttr on instance, and do someAttr = 'foo' under covers.
Does that just work already with polymer shim?

---

restriction: if js module does a createElement for custom tag, needs to list it as a module dependency.

TODO:

* rename data-attr to data-name? or are those two different things?
* work with requirejs?
* two way data binding?

---

What are the lifecycle steps they can implement?

----
elements do not name themselves

---
hrefid srcid
---

mixins for two way data binding, other things.

--
modern browsers only, alameda only. template support.
--
