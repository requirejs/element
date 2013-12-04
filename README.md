Initial markup can have tags in it, after that...


document.register.disabled to disable parsing until ready?
Maybe a <body parse-suspended> to suspend the body parsing until script says ready?

OR: does <template> not trigger DOM parsing? Maybe just do:

<body>
    <template>
        regular body content here in waiting until registration starts
    </template>
</body>

For code that wants to delay custom element instantiation?

Downside, image URLs and such are not fetched until scripts have loaded.

---

How to deal with attribute setting? So:

<custom-tag some-attr="foo">

Those are public interface toggles to element. Like a set(options) sort of thing.

Map those to someAttr on instance, and do someAttr = 'foo' under covers.
Does that just work already with polymer shim?