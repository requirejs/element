/*jshint browser: true */
/*globals define */

/*
Notes:

* Warning: has sucky cycle support between custom element names. But cycles
  custom elements would be crazy talk right? Right? If not, would be good
  to get that use case.

*/
define(function(require, exports, module) {
    var tagRegExp = /<(\w+-\w+)(\s|>)/g,
        commentRegExp = /<!--*.?-->/g,
        templateDiv = document.createElement('div');

    function removeComments(text) {
        var output = '';

    }

    var element = {
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
                    onload(document.register(id, {
                        prototype: Object.create(Object.create(HTMLElement.prototype), mod)
                    }));
                }

                if (typeof mod.template === 'string') {
                    var deps = element.findTagDeps(mod.template);
                    require([deps], function () {
                        templateDiv.innerHTML = '<template>' + mod.template + '</template>';
                        mod.template = templateDiv.removeChild(templateDiv.firstElementChild);
                        finish();
                    });
                } else {
                    finish();
                }
            });
        }
    };

    return element;
});
