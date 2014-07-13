var jQueryProps = (function (undefined) {
    var jQueryProps = new JQueryBuilder(function (selector, context) {
        var self = this;
        if ( ! jQuery.defined(selector) || selector === null)
            return;

        if (jQuery.isjQueryProps(selector)) {
            selector.each(function () {
                self.push(this);
            });
            return;
        }
        
        if (jQuery.isProp(selector)) {
            this.push(selector);
            return;
        }
        
        if (jQuery.isArray(selector)) {
            for (var i = 0; i < selector.length; i++) {
                arguments.callee.call(this, selector[i], context);
            }
            return;
        }

        if (jQuery.isProp(context) || jQuery.isLayer(context)) {
            var subprops = jQueryProps.find(context, selector);
            
            for (var i = 0; i < subprops.length; i++) {
                this.push(subprops[i]);
            }
            return;
        }
        
        if ( ! jQuery.defined(context)) {
            context = jQuery('*');
        } else {
            context = jQuery(context);
        }
        
        this.context = context;
        context.each(function () {
            var props = jQuery.props(selector, this);
            for (var i = 0; i < props.length; i++) {
                self.push(props[i]);
            }
        });
    }).jQuery;

    /**
     * TODO Написать доку
     */
    jQueryProps.find = function (obj, selector) {
        if (jQuery.isString(selector)) {
            selector = selector.split(jQueryProps.delimiter);
        }
        var result = [];
        
        for (var i = 1; i <= obj.numProperties; i++) {
            var currentObj = obj.property(i);
            var co = 0;
            var prop = selector.slice(0);
            var part = prop.shift();
            part = jQuery.toCamelCase(part);
            if (jQueryProps.is(currentObj, part)) {
                if (prop.length === 0) {
                    result.push(currentObj);
                } else {
                    var subprops = jQueryProps.find(currentObj, prop);
                    for (var ii = 0; ii < subprops.length; ii++) {
                        result.push(subprops[ii]);
                    }
                }
            }
        }
        return result;
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.expr = {
        'all' : function () {
            return true;
        },
        'active' : function () {
            return this.active;
        },
        'selected' : function () {
            return this.selected;
        },
        'expression' : function () {
            return this.expressionEnabled;
        },
        'prop' : function () {
            return this instanceof Property;
        },
        'group' : function () {
            return this instanceof PropertyGroup;
        },
        '1d' : function () {
            return this.propertyValueType === PropertyValueType.OneD;
        },
        '2d' : function () {
            return this.propertyValueType === PropertyValueType.TwoD;
        },
        '3d' : function () {
            return this.propertyValueType === PropertyValueType.ThreeD;
        },
        '2ds' : function () {
            return this.propertyValueType === PropertyValueType.TwoD_SPATIAL;
        },
        '3ds' : function () {
            return this.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
        },
        'color' : function () {
            return this.propertyValueType === PropertyValueType.COLOR;
        },
        'custom' : function () {
            return this.propertyValueType === PropertyValueType.CUSTOM_VALUE;
        },
        'indexedGroup' : function () {
            return this.propertyType === PropertyType.INDEXED_GROUP;
        },
        'namedGroup' : function () {
            return this.propertyType === PropertyType.NAMED_GROUP;
        },
        'property' : function () {
            return this.propertyType === PropertyType.PROPERTY;
        },
        'percent' : function () {
            return this.unitsText === 'percent';
        }
    };
    
    /**
     * TODO Написать доку
     */
    jQueryProps.is = function (prop, selector) {
        if (selector === '*')
            return true;
        
        switch (typeof selector) {
            case 'string' :
                var parts = selector.split(/\s*,\s*/);
                for (var i = 0; i < parts.length; i++) {
                    var match = (function (selector) {
                        var parts = selector.split(':');
                        var maskMatch = false, exprMatch = true;
                        var mask = parts[0].replace(/\*/g, ".*?");
                        var expr = parts[1];
                        
                        if (mask === '') {
                            mask = '*';
                        }
                        
                        if (jQuery.defined(expr)) {
                            if (expr[0] == '!') {
                                exprMatch = ! jQueryProps.expr[expr.substr(1)].call(this);
                            } else {
                                exprMatch = jQueryProps.expr[expr].call(this);
                            }
                        }
                        
                        var maskParts = mask.split(/\s*,\s*/);
                        for (var i = 0; i < maskParts.length; i++) {
                            var rgx = new RegExp('^' + maskParts[i] + '$', 'ig');
                            maskMatch = rgx.test(this.name) || rgx.test(jQuery.toCamelCase(this.name)) || rgx.test(this.propertyIndex);
                            if (maskMatch) break;
                        }
                        
                        return maskMatch && exprMatch;
                    }.call(prop, parts[i]));
                    if (match) return match;
                }
                return false;
            case 'function' :
                return selector.call(prop);
        }
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.is = function (selector) {
        return jQueryProps.is(this.first(), selector);
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.toString = function () {
        return 'jQueryProps (' + this.length + ' propert' + (this.length === 1 ? 'y' : 'ies') + ')';
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.find = function (selector) {
        var result = jQueryProps();
        this.each(function () {
            var props = jQueryProps(selector, this);
            props.each(function () {
                result.push(this);
            });
        });
        return result;
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.val = function (val) {
        if ( ! jQuery.defined(val)) {
            return this.first().value;
        }
        return this.each(function () {
            if (jQuery.isFunction(val)) {
                this.setValue(val.call(this, this.value));
                return;
            }
            this.setValue(val);
        });
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.atKey = function (key, val) {
        if ( ! jQuery.defined(val)) {
            return this.first().valueAtKey(key);
        }
        return this.each(function () {
            if (jQuery.isFunction(val)) {
                this.setValueAtKey(key, val.call(this, key, this.value));
                return;
            }
            this.setValueAtKey(key, val);
        });
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.atTime = function (time, val) {
        
        if (jQuery.isObject(time)) {
            var times = Object.keys(time);
            var values = Object.values(time);
            return this.each(function () {
                this.setValuesAtTimes(times, values);
            });
        }

        if ( ! jQuery.defined(val)) {
            return this.first().valueAtTime(time);
        }
        return this.each(function () {
            if (jQuery.isFunction(val)) {
                this.setValueAtTime(time, val.call(this, time, this.value));
                return;
            }
            this.setValueAtTime(time, val);
        });
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.clear = function () {
        return this.each(function () {
            for (var i = 1; i <= this.numKeys; i++) {
                this.removeKey(i);
            }
        });
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.tree = function (prop) {
        var currentProp = prop;
        var result = [];
        do {
            result.push(currentProp);
            currentProp = currentProp.parentProperty;
        } while(currentProp !== null);
        return result.reverse();
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.tree = function (asStrings, join) {
        var result;
        if ( ! jQuery.defined(asStrings)) {
            asStrings = false;
        }
        if ( ! jQuery.defined(join)) {
            join = false;
        }
        if (asStrings) {
            result = [];
            this.each(function () {
                var tree = jQueryProps.tree(this);
                var string = tree.map(function (obj) {
                    return obj.name;
                }).join(jQuery.props.delimiterString);
                result.push(string);
            });
        } else {
            result = {};
            this.each(function () {
                result[this.name] = jQueryProps.tree(this);
            });
        }
        
        return join ? result.join('\n') : join;
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.steps = function (prop, startTime, duration, stepFn, step) {
        if ( ! jQuery.isFunction(stepFn))
            throw "Argument is not a function";

        if ( ! jQuery.defined(step)) {
            step = 0.01;
        }
        
        var nStep, endPoint = duration, valueAtTime, currentTime;
        for(var time = 0; time <= endPoint; time += step) {
            nStep = time / endPoint;
            currentTime = startTime + time;
            valueAtTime = stepFn.call(prop, nStep, currentTime, duration);
            if (jQuery.defined(valueAtTime)) {
                if (jQuery.isNumber(valueAtTime)) {
                    prop.setValueAtTime(currentTime, valueAtTime);
                } else {
                    throw "value must be a number";
                }
            }
        }
        return this;
    };
    
    /**
     * TODO Написать доку
     */
    jQueryProps.easing = function (prop, times, values, fn, step) {
        jQueryProps(prop).steps(times[0], times[1], function (nStep, time, duration) {
            return jQuery.ease(fn, values[0], values[1], nStep, time, duration);
        }, step);
        return this;
    };
    
    /**
     * TODO Написать доку
     */
    jQueryProps.fn.easing = function (times, values, fn, step) {
        return this.each(function () {
            jQueryProps.easing(this, times, values, fn, step);
        });
    };
    
    /**
     * TODO Написать доку
     */
    jQueryProps.fn.steps = function (startTime, duration, stepFn, step) {
        if ( ! jQuery.isFunction(stepFn))
            throw "Argument is not a function";
        
        if ( ! jQuery.defined(step)) {
            step = 0.01;
        }
        
        return this.each(function () {
            jQueryProps.steps(this, startTime, duration, stepFn, step);
        });
    };

    /**
     * Фильтруем выборку
     * @param selector
     * @returns {*}
     */
    jQueryProps.fn.grep = function (selector, reverse) {
        if ( ! jQuery.defined(reverse)) {
            reverse = false;
        }
        var result = jQueryProps();
        this.each(function (i) {
            var match = jQueryProps.is(this, selector, i);
            match = reverse ? ! match : match;
            if (match) {
                result.push(this);
            }
        });
        return result;
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn.concat = function (obj) {
        var thisSet = jQueryProps(this);
        var newSet = jQueryProps(obj);
        newSet.each(function () {
            thisSet.push(this);
        });
        thisSet.context = this.context;
        return thisSet;
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn['+'] = function (obj) {
        var object = jQueryProps(obj, this.context); // # говнокод?
        return this.concat(object);
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.fn['-'] = function (expr) {
        
        if (jQuery.isString(expr)) {
            return this.grep(expr, true);
        }
        
        if (jQueryProps.isNumber(expr))
            return this.removeAt(this.length - expr, expr);
            
        if (jQueryProps.isLayer(expr)) {
            for (var i = this.length; i >= 0; i--) {
                if (this.get(i) === expr) {
                    this.removeAt(i);
                }
            }
            return this;
        }
    };
    
    /**
     * TODO Написать доку
     */
    jQueryProps.fn.separate = function (separate) {
        if ( ! jQuery.defined(separate)) {
            return this.first().dimensionsSeparated;
        }
        return this.each(function () {
            this.dimensionsSeparated = separate;
        });
    };

    /**
     * TODO Написать доку
     */
    jQueryProps.delimiter = /\s*>\s*/;
    jQueryProps.delimiterString = '>';
    
    return jQueryProps;
}());