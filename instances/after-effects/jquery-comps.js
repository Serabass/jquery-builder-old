var jQueryComps = (function (undefined) {
    var jQueryComps = new JQueryBuilder(function (selector) {
        var context = app.project;
        
        if ( ! jQuery.defined(selector))
            return;
            
        if (jQuery.isComp(selector)) {
            this.push(selector);
            return;
        }
    
        if (jQuery.isArray(selector)) {
            for (var i = 0; i < selector.length; i++) {
                arguments.callee.call(this, selector[i]);
            }
            return;
        }

        if (jQuery.isjQueryComps(selector)) {
            var self = this;
            selector.each(function () {
                self.push(this);
            });
            return;
        }
    
        if (jQuery.isNumber(selector)) {
            var result = context.item(selector);
            if (jQuery.defined(result)) {
                this.push(result);
                return;
            } else {
                throw "index not found";
            }
        }
        
        for (var i = 1; i <= context.numItems; i++) {
            var comp = context.item(i);
            if (jQuery.is(comp, selector)) {
                this.push(comp);
            }
        }
    }).jQuery;

    jQueryComps.expr = {
        'all' : function () {
            return true;
         }
    };

    jQueryComps.cb = {
        'nth' : function (n) {
            return function (i) {
                return i % n === 0;
            };
        },
    };

    jQueryComps.is = function (obj, selector) {
        switch (typeof selector) {
            case 'string' :
                if (selector === '*') {
                    return true;
                }
                if (selector[0] === ':') {
                    return (function (obj) {
                        var not = selector[1] === '!',
                            sub = selector.substr(not ? 2 : 1);

                        if (jQuery.isFunction(jQueryComps.expr[sub])) {
                            var result = jQueryComps.expr[sub].call(obj, i);
                            return not ? !result : result;
                        }

                        return obj.name === selector
                    }(obj));
                } else if (selector[0] === '@') {
                    return (function (obj) {
                        var rgx = /^(\w+)\((.*?)\)$/,
                            not = selector[1] === '!',
                            fn = selector.substr(not ? 2 : 1);
                        if ( ! rgx.test(fn))
                            return false;

                        var parts = rgx.exec(fn);
                        if (jQuery.isFunction(jQueryComps.cb[parts[1]])) {
                            // eval - зло. Всё равно придётся делать парсер
                            var result = eval('jQueryComps.cb.'+parts[1]+'('+parts[2]+').call(obj, i)');
                            return not ? !result : result;
                        }

                        return obj.name === selector;
                    }(obj));
                }
                if (/^\d+$/.test(selector)) {
                    arguments.callee.call(this, parseInt(selector, 10));
                }
                if (new RegExp(selector.replace('*', '.+?').test(obj.name))) {
                    return true;
                }
                return obj.name === selector;
            case 'number' :
                return obj.index === selector;
            case 'function' :
                if (jQuery.isRegExp(selector))
                    return selector.test(obj.name);
                return selector.call(obj, i);
        }
    };

    jQueryComps.fn.toString = function () {
        return 
    };
    return jQueryComps;
}());