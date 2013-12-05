
To avoid FOUC:

<body><template id="body">
    regular body content here in waiting until registration starts
</template></body>

Hopefully custom elements in a template are not resolved until template activated?

Downside, image URLs and such are not fetched until scripts have loaded.

---

Mention quasis? And in that case, can call template()????

----



How to deal with attribute setting? So:

<custom-tag some-attr="foo">

Those are public interface toggles to element. Like a set(options) sort of thing.

Map those to someAttr on instance, and do someAttr = 'foo' under covers.
Does that just work already with polymer shim?

---

restriction: if js module does a createElement for custom tag, needs to list it as a module dependency.

TODO:

* data-prop
* data-event
* build step
* two way data binding?
---

What are the lifecycle steps they can implement?

