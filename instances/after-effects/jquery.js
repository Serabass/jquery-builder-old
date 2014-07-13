// https://trello.com/c/8JlVSxOQ/3--

if (typeof Array.prototype.shuffle === 'undefined') {
    Array.prototype.shuffle = function () { //v1.0
        return this.sort(function () {
            return 5 - (10 * Math.random());
        });
    };
}

if (typeof Array.prototype.map === 'undefined') {
    Array.prototype.map = function (callback) {
        var result = [];
        for(var i = 0; i < this.length; i++) {
            result.push(callback(this[i], i, this));
        }
        return result;
    };
}

if (typeof Function.prototype.bind === 'undefined') {
    Function.prototype.bind = function() {
        var fn = this, 
            // clone arguments
            args = Array.prototype.slice.call(arguments), 
            // get the first argument, which should be an object, and args will be modified. 
            object = args.shift();
            
        return function(){
            return fn.apply(object,
            // why use concat??? why? 
            args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

#include ../../lib/jquery-builder.js
var jQuery = (function (undefined) {
    var jQuery = new JQueryBuilder(function (selector, context) {
        
        context = jQuery.defined(context) ? context : app.project.activeItem;
        
        if ( ! jQuery.defined(selector) || selector === null)
            return;

        if (jQuery.isNumber(selector)) {
            try {
                var layer = context.layer(selector);
                this.push(layer);
                return;
            } catch(e) {};
        }
    
        if (jQuery.isString(selector)) {
            try {
                var layer = context.layer(selector);
                this.push(layer);
                return;
            } catch(e) {};
            
            var parts = selector.split(/\s*,\s*/);
            if (parts.length > 1) {
                arguments.callee.call(this, parts);
                return;
            }
            
            var rgx = /^#(.+?)$/;
            if (rgx.test(selector)) {
                parts = rgx.exec(selector);
                for (var i = 1; i <= app.project.items.length; i++) {
                    var currentComp = app.project.item(i);
                    if (currentComp.name === parts[1]) {
                        arguments.callee.call(this, currentComp);
                        return;
                    }
                }
            }
        }
        
        if (jQuery.isjQuery(context)) {
            throw 'under construction';
            var self = this;
            context.each(function () {
                if (jQuery.is(this, selector)) {
                    self.push(this);
                }
            });
            return;
        }
        
        if (jQuery.isObject(selector)) {
            if (jQuery.isComp(selector)) {
                arguments.callee.call(this, '*', selector);
                return;
            }
            if (jQuery.isArray(selector)) {
                for (var i = 0; i < selector.length; i++) {
                    arguments.callee.call(this, selector[i]);
                }
                return;
            }

            if (jQuery.isjQuery(selector)) {
                var self = this;
                selector.each(function () {
                    self.push(this);
                });
                return;
            }

            this.push(selector);
            return;
        }

        this.selector = selector;
        this.context = context;
        var layers = context.layers;
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (jQuery.is(layer, selector, i)) {
                this.push(layer);
            }
        }
    }).jQuery; // Вытаскиваем сформированный объект jQuery

    
    /**
     * Проверяем, подходит ли объект (слой) под указанный селектор
     * @param obj
     * @param selector
     * @param i
     * @returns {*}
     */
    jQuery.is = function (obj, selector, i) {
        switch (typeof selector) {
            case 'string' :
                if (selector === '*') {
                    return true;
                }
                if (selector[0] === ':') {
                    return (function (obj) {
                        var not = selector[1] === '!',
                            sub = selector.substr(not ? 2 : 1);

                        if (jQuery.isFunction(jQuery.expr[sub])) {
                            var result = jQuery.expr[sub].call(obj, i);
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
                        if (jQuery.isFunction(jQuery.cb[parts[1]])) {
                            // eval - зло. Всё равно придётся делать парсер
                            var result = eval('jQuery.cb.'+parts[1]+'('+parts[2]+').call(obj, i)');
                            return not ? !result : result;
                        }

                        return obj.name === selector;
                    }(obj));
                }
                if (/^\d+$/.test(selector)) {
                    arguments.callee.call(this, parseInt(selector, 10));
                }
                return obj.name === selector;
            case 'number' :
                return obj.index === selector;
            case 'function' :
                if (selector instanceof RegExp)
                    return selector.test(obj.name);
                return selector.call(obj, i);
        }
    };

    
    /**
     * Проверяем, принадлежит ли объект указанному типу
     * @param obj
     * @param type
     * @returns {*}
     */
    jQuery.isOfType = function (obj, type) {
        var types = {
            'function' : function (obj) {return typeof obj === 'function'},
            'object'   : function (obj) {return typeof obj === 'object'},
            'array'    : function (obj) {return jQuery.isOfType(obj, 'object') && obj instanceof Array},
            'jquery'   : function (obj) {return jQuery.isOfType(obj, 'object') && obj instanceof jQuery},
            'jqueryprops': function (obj) {return jQuery.isOfType(obj, 'object') && obj instanceof jQueryProps},
            'regexp'   : function (obj) {return jQuery.isOfType(obj, 'function') && obj instanceof RegExp},
            'regex'    : function (obj) {return jQuery.isOfType(obj, 'regex')},
            'undefined': function (obj) {return typeof obj === 'undefined'},
            'null'     : function (obj) {return obj === null},
            'string'   : function (obj) {return typeof obj === 'string'},
            'number'   : function (obj) {return typeof obj === 'number'},
            'boolean'  : function (obj) {return typeof obj === 'boolean'},
            'bool'     : function (obj) {return jQuery.isOfType(obj, 'boolean')},
            'layer'    : function (obj) {
                return (function (obj) {
                    if ( ! jQuery.defined(obj.constructor))
                        return false;
                    
                    return /Layer$/.test(obj.constructor.name);
                }(obj));
            },
            'comp' : function (obj) {
                return obj instanceof CompItem;
            },
            'file' : function (obj) {
                return obj instanceof File;
            },
            'prop' : function (obj) {
                return obj instanceof Property || obj instanceof PropertyGroup;
            }
        };

        if (typeof types[type] === 'undefined')
            return false;

        return types[type](obj);
    };

    
    /**
     * Проверяем, является ли объект функцией
     * @param obj
     * @returns {boolean}
     */
    jQuery.isFunction = function (obj) {
        return typeof obj === 'function';
    };

    /**
     * TODO Написать доку
     */
    jQuery.isNativeFunction = function (fn) {
        return jQuery.isFunction(fn) && /^\s*function \w+\(.*?\)\s*\{\s*\[native code\]\s*\}/i.test(fn.toString())
    };
    jQuery.undefined = 'undefined';
    /**
     * Проверяем, является ли объект объявлённым
     * @param obj
     * @returns {boolean}
     */
    jQuery.defined = function (obj) {
        return typeof obj !== 'undefined';
    };

    /**
     * Проверяем, является ли объект null
     * @param obj
     * @returns {boolean}
     */
    jQuery.isNull = function (obj) {
        return obj === null;
    };

    
    /**
     * Проверяем, является ли объект объектом
     * @param obj
     * @returns {boolean}
     */
    jQuery.isObject = function (obj) {
        return typeof obj === 'object';
    };

    /**
     * Проверяем, является ли объект пустым
     * @param obj
     * @returns {boolean}
     */
    jQuery.isEmptyObject = function (obj) {
        return jQuery.isObject(obj) && !Object.keys(obj).length;
    };

    
    /**
     * Проверяем, является ли объект массивом
     * @param obj
     * @returns {boolean}
     */
    jQuery.isArray = function (obj) {
        return obj instanceof Array;
    };

    
    /**
     * Проверяем, является ли объект jQuery
     * @param obj
     * @returns {boolean}
     */
    jQuery.isjQuery = function (obj) {
        return obj instanceof jQuery;
    };

    /**
     * Проверяем, является ли объект jQuery
     * @param obj
     * @returns {boolean}
     */
    jQuery.isjQueryComps = function (obj) {
        return obj instanceof jQueryComps;
    };

    
    /**
     * Проверяем, является ли объект регуляркой
     * @param obj
     * @returns {boolean}
     */
    jQuery.isRegExp = function (obj) {
        return obj instanceof RegExp;
    };

    
    /**
     * Проверяем, является ли объект строкой
     * @param obj
     * @returns {boolean}
     */
    jQuery.isString = function (obj) {
        return typeof obj === 'string';
    };

    
    /**
     * Проверяем, является ли объект числом
     * @param obj
     * @returns {boolean}
     */
    jQuery.isNumber = function (obj) {
        return typeof obj === 'number';
    };

    
    /**
     * Проверяем, является ли объект булевым значением
     * @param obj
     * @returns {boolean}
     */
    jQuery.isBoolean = function (obj) {
        return typeof obj === 'boolean';
    };

    /**
     * Проверяем, является ли объект слоем
     * @param obj
     * @returns {boolean}
     */
    jQuery.isLayer = function (obj) {
        return jQuery.defined(obj.constructor) && obj.constructor.name.substr(-5) === 'Layer';
    };

    /**
     * Проверяем, является ли объект композицией
     * @param obj
     * @returns {boolean}
     */
    jQuery.isComp = function (obj) {
        return obj instanceof CompItem;
    };

    /**
     * Проверяем, является ли объект файлом
     * @param obj
     * @returns {boolean}
     */
    jQuery.isFile = function (obj) {
        return obj instanceof File;
    };

    /**
     * Проверяем, является ли объект свойством
     * @param obj
     * @returns {boolean}
     */
    jQuery.isProp = function (obj) {
        return obj instanceof Property || obj instanceof PropertyGroup;
    };

    /**
     * Проверяем, является ли объект набором свойств
     * @param obj
     * @returns {boolean}
     */
    jQuery.isjQueryProps = function (obj) {
        return obj instanceof jQueryProps;
    };

    /**
     * Селекторы-выражения. Для более удобного поиска слоёв, к примеру
     *      jQuery(':selected') вернёт все выбранные слои
     * @var Object
     */
    jQuery.expr = {
        'all' : function () {
            return true;
        },
        'first' : function (i) {
            return this.index === 1;
        },
        'last' : function () {
            return this.index === this.containingComp.layers.length;
        },
        'selected' : function (i) {
            return this.selected;
        },
        'even' : function (i) {
            return i % 2 === 0;
        },
        'odd' : function (i) {
            return i % 2 !== 0;
        },
        '3d': function () {
            return this.threeDLayer;
        },
        'active': function () {
            return this.active;
        },
        'locked': function () {
            return this.locked;
        },
        'adj': function () {
            return this.adjustmentLayer;
        },
        'enabled': function () {
            return this.enabled;
        },
        'env': function () {
            return this.enviromnentLayer;
        },
        'audio': function () {
            return this.hasAudio;
        },
        'matte': function () {
            return this.hasTrackMatte;
        },
        'video': function () {
            return this.hasTrackMatte;
        },
        'remap': function () {
            return this.timeRemapEnabled;
        },
        'modified': function () {
            return this.isModified;
        },
        'noEffects': function () {
            return jQuery(this).effects().length === 0;
        },
        'motionBlur': function () {
            return this.motionBlur;
        },
        'null': function () {
            return this.nullLayer;
        },
        'layer': function () {
            return jQuery.isLayer(this);
        },
        'comp': function () {
            return jQuery.isComp(this);
        },
        'text': function () {
            return jQuery.is(this, '@is("TextLayer")');
        },
        'av': function () {
            return jQuery.is(this, '@is("AVLayer")');
        },
        'shape': function () {
            return jQuery.is(this, '@is("ShapeLayer")');
        },
        'light': function () {
            return jQuery.is(this, '@is("LightLayer")');
        },
        'camera': function () {
            return jQuery.is(this, '@is("CameraLayer")');
        }
    };

    
    /**
     * Селекторы-замыкания. Для ещё более удобного поиска слоёв с возможностью передачи аргументов, к примеру
     *      jQuery('@regex(/^\d+$/)') вернёт слои, у которых в названии содержатся только цифры
     */
    jQuery.cb = {
        'nth' : function (n) {
            return function (i) {
                return i % n === 0;
            };
        },
        'regex': function (rgx, prop) {
            if (!jQuery.defined(prop)) prop = 'name';
            return function (i) {
                return rgx.test($(this).prop(prop));
            };
        },
        'between': function (startTime, endTime) {
            // TODO Доработать
            return function (i) {
                return ((this.startTime >= startTime) && (this.startTime <= endTime)) || ((this.outPoint >= startTime) && (this.outPoint <= endTime));
            };
        },
        'activeAt': function (time) {
            return function (i) {
                return this.activeAtTime(time);
            };
        },
        'is': function (type) {
            return function (i) {
                return this.constructor.name === type;
            };
        },
        'inRect': function (left, top, width, height) {
            if (jQuery.isArray(left)) {
                var dim = left;
                left    = dim[0];
                top     = dim[1];
                width   = dim[2];
                height  = dim[3];
            }
            return function (i) {
                var pos = jQuery(this).prop(['transform', 'position']).value;
                return pos[0] >= left &&
                    pos[0] <= left + width &&
                    pos[1] >= top &&
                    pos[1] <= top + height;
            };
        },
        'index' : function (from, to) {
            return function (i) {
                if (!jQuery.defined(to))
                    return this.index === from;
                return this.index >= from && this.index <= to;
            };
        },
        'childOf': function(selector) {
            return function (i) {
                if (!jQuery.defined(selector))
                    return this.parent !== null;
                
                if (this.parent === null)
                    return false;
                
                return jQuery(this.parent).is(selector);
            };
        },
        'blendingMode' : function (mode) {
            return function (i) {
                return this.blendingMode === mode;
            };
        },
        'prop': function (prop, value) {
            return function (i) {
                var property = jQuery.prop(this, prop);
                
                if (jQuery.defined(property.value))
                    return property.value === value;
                    
                return property === value;
            };
        },
        'data': function (prop, value) {
            return function (i) {
                var property = jQuery.data(this, prop);
                
                if (jQuery.defined(property.value))
                    return property.value === value;
                    
                return property === value;
            };
        },
        'hasData': function (prop) {
            // TODO Уточнить
            return function (i) {
                if ( ! jQuery.defined(prop)) {
                    return jQuery.defined(jQuery.data(this, prop));
                }
                return jQuery.defined(jQuery.data(this));
            }
        },
        'is': function (type) {
            return function (i) {
                switch (type) {
                    case 'text'  : return this instanceof TextLayer;
                    case 'av'    : return this instanceof AVLayer;
                    case 'shape' : return this instanceof ShapeLayer;
                    case 'light' : return this instanceof LightLayer;
                    case 'camera': return this instanceof CameraLayer;
                    case 'null'  : return jQuery.is(this, ':null');
                }
                if (jQuery.defined(this.constructor)) {
                    return this.constructor.name === type;
                }
            }
        }
    };

    
    /**
     * Разделить необходимые свойства (список должен пополняться)
     * @param separate
     * @returns {*|jQuery}
     */
    jQuery.fn.separate = function (separate) {
        if (!jQuery.defined(separate)) {
            separate = true;
        }
        var props = [
            ['transform', 'position'].join(jQuery.props.delimiterString)
            // Перечислять все разделяемые свойства здесь
        ];
        this.props(props).separate(separate)
        return this;
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.index = function (obj) {
        var result;
        this.each(function (i) {
            if (obj === this) {
                result = i;
            }
        });
        return result;
    };

    
    /**
     * Выделить слой
     * @param sel
     * @returns {*|jQuery}
     */
    jQuery.fn.select = function (sel) {
        if (!jQuery.defined(sel)) sel = true;
        return this.each(function () {
            this.selected = sel;
        });
    };

    
    /**
     * Поставить выборку в очередь
     * @param interval
     * @param bl
     * @returns {*|jQuery}
     */
    jQuery.fn.queue = function (interval, bl) {
        if (!jQuery.defined(bl)) bl = 0;
        return this.each(function(i) {
            this.startTime = i * interval - (interval * bl);
            this.outPoint = (i * interval) + interval + (interval * bl);
        });
    };

    
    /**
     * Подогнать слои под композицию
     * TODO Доработать
     * @returns {*|jQuery}
     */
    jQuery.fn.fitToComp = function () {
        return this.each(function () {
            this.height = this.containingComp.height;
            this.width = this.containingComp.width;
        });
    };

    
    /**
     * Сделать слои трёхмерными
     * @param is3D
     * @returns {*|jQuery}
     */
    jQuery.fn.threeD = function (is3D) {
        if ( ! jQuery.defined(is3D))
            return this.first().threeDLayer;
        
        return this.each(function () {
            this.threeDLayer = is3D;
        });
        
        // return this.prop('threeDLayer', is3D);
    };

    
    
    /**
     * Открыть\закрыть группу истории
     * @param name
     * @returns {jQuery.fn}
     */
    jQuery.group = function (name) {
        if (jQuery.defined(name)) {
            app.beginUndoGroup(name);
        } else {
            app.endUndoGroup();
        }
        return this;
    };
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.group = function (name) {
        jQuery.group(name);
        return this;
    }
    
    #include jquery-comps.js
    jQuery.comps = jQueryComps;
    // ...
    
    #include jquery-props.js
    jQuery.props = jQueryProps;
    // ...
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.props = function (prop) {
        if ( ! jQuery.defined(prop)) {
            prop = '*';
        }
        return jQuery.props(prop, this);
    };

    /**
     * TODO Написать доку
     */
    jQuery.effects = function (name, obj) {
        if ( ! jQuery.defined(name)) {
            name  = [];
        }
        
        if (jQuery.isString(name)) {
            name = name.split(jQuery.props.delimiter)
        }
        
        return jQuery.props(['Effects'].concat(name), obj);
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.effects = function (name) {
        return jQuery.effects(name, this);
    };

    /**
     * Удалить все эффекты слоя
     * TODO Доработать
     * @returns {jQuery.fn}
     */
    jQuery.fn.clearEffects = function () {
        var effects = this.effects();
        for (var i = effects.length - 1; i > 0; i--) {
            effects[i].remove();
        }
        return this;
    };

    
    /**
     * Проверяем, подходит ли объект (слой) под указанный селектор
     * @param selector
     * @returns {*}
     */
    jQuery.fn.is = function (selector) {
        return jQuery.is(this.first(), selector, this.first().index);
    };

    
    /**
     * Фильтруем выборку
     * @param selector
     * @returns {*}
     */
    jQuery.fn.grep = function (selector, reverse) {
        if ( ! jQuery.defined(reverse)) {
            reverse = false;
        }
        var result = jQuery();
        this.each(function (i) {
            var match = jQuery.is(this, selector, i);
            match = reverse ? ! match : match;
            if (match) {
                result.push(this);
            }
        });
        return result;
    };

    /**
     * Добавляем всей выборке эффект по имени и вызываем на каждую итерцию замыкание
     * @param name
     * @param cb
     * @returns {*|jQuery}
     */
    jQuery.fn.addEffect = function (name, cb) {
        return this.each(function () {
            var effect = jQuery(this).prop('Effects').addProperty(name);
            if (jQuery.isFunction(cb)) {
                cb.call(this, effect);
            }
        });
    };

    
    /**
     * Добавляем всей выборке эффекты по имени и вызываем на каждую итерцию замыкание
     * @param effects
     * @returns {*|jQuery}
     */
    jQuery.fn.addEffects = function (effects) {
        for (var effect in effects) {
            if (effects.hasOwnProperty(effect)) {
                this.addEffect(effect, effects[effect]);
            }
        }
        return this;
    };

    
    /**
     * Примерная концепция настроек для плагинов
     * @param setting
     * @param settings
     * @param context
     * @returns {*}
     */
    jQuery.setting = function (setting, settings, context) {
        if (jQuery.isFunction(settings[setting])) {
            return settings[setting].call(context);
        }
        return settings[setting];
    };

    /**
     * TODO Продумать, как совместить с jQueryProps.steps
     * TODO Написать доку
     */
    jQuery.steps = function (duration, stepFn, step) {
        if ( ! jQuery.isFunction(stepFn))
            throw "Argument is not a function";

        if ( ! jQuery.defined(step)) {
            step = 0.01;
        }
    
        var nStep, endPoint = duration;
        for(var time = 0; time <= endPoint; time += step) {
            nStep = time / endPoint;
            stepFn(nStep, time, duration);
        }
        return this;
    };
    
    /**
     * TODO Продумать, как совместить с jQueryProps.steps
     * Вызывает функцию для определенного промежутка времени, в которой мы можем задать необходимые ключи и/или выполнить различные действия.
     * @returns {jQuery}
     */
    jQuery.fn.steps = function(startTime, duration, stepFn, step) {
        if ( ! jQuery.isFunction(stepFn))
            throw "Argument is not a function";

        if ( ! jQuery.defined(step)) {
            step = 0.01;
        }
        
        return this.each(function () {
            var self = this;
            jQuery.steps(duration, function (nStep, time, duration) {
                stepFn.call(self, nStep, startTime + time, duration);
            }, step);
        });
    };
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.after = function (selector) {
        var layer = jQuery(selector).first();
        if (jQuery.defined(layer)) {
            return this.each(function () {
                this.moveAfter(layer);
            });
        }
        return this;
    };

    
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.before = function (selector) {
        var layer = jQuery(selector).first();
        if (jQuery.defined(layer)) {
            return this.each(function () {
                this.moveBefore(layer);
            });
        }
        return this;
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.toBeginning = function (selector) {
        return this.each(function () {
            this.moveToBeginning();
        });
        return this;
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.toEnd = function (selector) {
        return this.each(function () {
            this.moveToEnd();
        });
        return this;
    };

    /**
     * TODO Написать доку
     */
    jQuery.removeData = function (obj, prop) {
        if (jQuery.defined(obj)) {
            if (jQuery.defined(obj[jQuery.data.field])) {
                delete obj[jQuery.data.field][prop];
            }
        }
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.removeData = function (prop) {
        return this.each(function () {
            jQuery.removeData(this, prop);
        });
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.clear = function (obj, force) {
        if ( ! jQuery.defined(force)) force = false;
        if (jQuery.defined(obj)) {
            if (jQuery.defined(obj[jQuery.data.field])) {
                if (force) {
                    delete obj[jQuery.data.field];
                } else {
                    if (Object.keys(obj[jQuery.data.field]).length === 0) {
                        delete obj[jQuery.data.field];
                    }
                }
            }
        }
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.clear = function (force) {
        return this.each(function () {
            jQuery.clear(this, force);
        });
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.data = function (obj, prop, value) {
        // Да простит меня Джон
        if (jQuery.defined(obj)) {
            if ( ! jQuery.defined(obj[jQuery.data.field])) {
                obj[jQuery.data.field] = {};
            }
            
            if (jQuery.defined(value)) {
                obj[jQuery.data.field][prop] = value;
                return this;
            }
            
            return obj[jQuery.data.field][prop];
        }
        return this;
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.data.field = '___data';
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.data = function (prop, value) {
        if ( ! jQuery.defined(value))
            return jQuery.data(this.first(), prop);
        
        return this.each(function () {
            jQuery.data(this, prop, value);
        });
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.hasData = function (obj, prop) {
        if (jQuery.defined(obj)) {
            if (jQuery.isObject(obj[jQuery.data.field])) {
                if (jQuery.defined(prop))
                    return jQuery.defined(obj[jQuery.data.field][prop]);
                return true;
            }
        }
        return false;
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.hasData = function (prop) {
        return jQuery.hasData(this, prop);
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.noop = function () {};

    /**
     * TODO Написать доку
     */
    jQuery.merge = function (jquery1, jquery2) {
        var newJQuery = jQuery();
        jquery1.each(function () {
            newJQuery.push(this);
        });
        jquery2.each(function () {
            newJQuery.push(this);
        });
        return newJQuery;
    };
    
    /**
     * TODO Написать доку
     */
    jQuery.fn.merge = function (jquery) {
        return jQuery.merge(this, jquery);
    };


    /**
     * TODO Написать доку
     */
    jQuery.fn.parent = function () {
        return jQuery(this.first().parent);
    };

    
    /**
     * TODO Написать доку
     */
    jQuery.fn.parents = function (selector) {
        var first = this.first(),
            result = jQuery(),
            current;
        if (!first) return [];
        current = first;
        while (current) {
            current = current.parent;
            
            if (current === null)
                break;
            
            if (jQuery.defined(selector)) {
                if (jQuery.is(current, selector)) {
                    result.push(current);
                    continue;
                }
            }
            result.push(current);
        }
        return result;
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.children = function (selector) {
        if ( ! jQuery.defined(selector)) {
            selector = '*';
        }
    
        var first = this.first();
        var result = jQuery();
        jQuery(selector).each(function () {
            if (this.parent === first) {
                result.push(this);
            }
        });
        return result;
    };

    /**
     * TODO А нужна ли?
     * TODO Написать доку
     */
    jQuery.fn.shuffle = function () {
        return this.each(function (i) {
            var index,
                layer;
            do {
                index = parseInt((Math.random() * this.containingComp.layers.length), 10);
                layer = jQuery(index).first();
            } while((index === this.index) && (layer === this));
            this.moveAfter(layer);
        });
    };


    /**
     * TODO Написать доку
     */
    jQuery.fn.remove = function () {
        return this.each(function () {
            this.remove();
        });
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.preComp = function (name) {
        return this.context.layers.precompose(this.toArray().map(function (layer) {
            return layer.index;
        }), name);
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.duplicate = function () {
        var result = [];
        this.each(function () {
            result.push(this.duplicate());
        });
        return jQuery(result);
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.copy = function (comp) {
        return this.each(function () {
            this.copyToComp(jQuery(comp).context);
        });
    };

    /**
     * TODO Написать доку
     */
    jQuery.snap = function (comp, file, time) {
        comp = jQuery(comp).context;
        if ( ! jQuery.defined(file)) {
            throw "Wrong argument";
        }
        
        if (jQuery.isString(file)) {
            file = File(file);
        }

        if ( ! jQuery.isFile(file)) {
            throw "Unknown argument";
        }
        
        if ( ! jQuery.defined(time)) {
            time = comp.time;
        }
        return comp.saveFrameToPng(time, file);
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.snap = function (file, time) {
        jQuery.snap(this.context, file, time);
        return this;
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn.concat = function (obj) {
        var thisSet = jQuery(this);
        var newSet = jQuery(obj);
        newSet.each(function () {
            thisSet.push(this);
        });
        return thisSet;
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn['+'] = function (obj) {
        return this.concat(jQuery(obj));
    };

    /**
     * TODO Написать доку
     */
    jQuery.fn['-'] = function (expr) {
        
        if (jQuery.isString(expr)) {
            return this.grep(expr, true);
        }
        
        if (jQuery.isNumber(expr))
            return this.removeAt(this.length - expr, expr);
            
        if (jQuery.isLayer(expr)) {
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
    jQuery.fn.expr = function (prop, value) {
        if ( ! jQuery.defined(value)) {
            return jQuery.prop(this, prop).expression;
        }
        return this.each(function () {
            jQuery.prop(this, prop).expression = value;
        });
    };

    /**
     * TODO Написать доку
     * t: current time, b: beginning value, c: change In value, d: duration
     */
    jQuery.easing = {
        def: 'easeOutQuad',
        swing: function (x, t, b, c, d) {
            //alert(jQuery.easing.default);
            return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
        },
        easeInQuad: function (x, t, b, c, d) {
            return c*(t/=d)*t + b;
        },
        easeOutQuad: function (x, t, b, c, d) {
            return -c *(t/=d)*(t-2) + b;
        },
        easeInOutQuad: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t + b;
            return -c/2 * ((--t)*(t-2) - 1) + b;
        },
        easeInCubic: function (x, t, b, c, d) {
            return c*(t/=d)*t*t + b;
        },
        easeOutCubic: function (x, t, b, c, d) {
            return c*((t=t/d-1)*t*t + 1) + b;
        },
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        },
        easeInQuart: function (x, t, b, c, d) {
            return c*(t/=d)*t*t*t + b;
        },
        easeOutQuart: function (x, t, b, c, d) {
            return -c * ((t=t/d-1)*t*t*t - 1) + b;
        },
        easeInOutQuart: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
            return -c/2 * ((t-=2)*t*t*t - 2) + b;
        },
        easeInQuint: function (x, t, b, c, d) {
            return c*(t/=d)*t*t*t*t + b;
        },
        easeOutQuint: function (x, t, b, c, d) {
            return c*((t=t/d-1)*t*t*t*t + 1) + b;
        },
        easeInOutQuint: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
            return c/2*((t-=2)*t*t*t*t + 2) + b;
        },
        easeInSine: function (x, t, b, c, d) {
            return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
        },
        easeOutSine: function (x, t, b, c, d) {
            return c * Math.sin(t/d * (Math.PI/2)) + b;
        },
        easeInOutSine: function (x, t, b, c, d) {
            return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
        },
        easeInExpo: function (x, t, b, c, d) {
            return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
        },
        easeOutExpo: function (x, t, b, c, d) {
            return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
        },
        easeInOutExpo: function (x, t, b, c, d) {
            if (t==0) return b;
            if (t==d) return b+c;
            if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
            return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
        },
        easeInCirc: function (x, t, b, c, d) {
            return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
        },
        easeOutCirc: function (x, t, b, c, d) {
            return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
        },
        easeInOutCirc: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
            return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
        },
        easeInElastic: function (x, t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
        },
        easeOutElastic: function (x, t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
        },
        easeInOutElastic: function (x, t, b, c, d) {
            var s=1.70158;var p=0;var a=c;
            if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
            if (a < Math.abs(c)) { a=c; var s=p/4; }
            else var s = p/(2*Math.PI) * Math.asin (c/a);
            if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
            return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
        },
        easeInBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c*(t/=d)*t*((s+1)*t - s) + b;
        },
        easeOutBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
        },
        easeInOutBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
            return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
        },
        easeInBounce: function (x, t, b, c, d) {
            return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
        },
        easeOutBounce: function (x, t, b, c, d) {
            if ((t/=d) < (1/2.75)) {
                return c*(7.5625*t*t) + b;
            } else if (t < (2/2.75)) {
                return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
            } else if (t < (2.5/2.75)) {
                return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
            } else {
                return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
            }
        },
        easeInOutBounce: function (x, t, b, c, d) {
            if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
            return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
        }
    };

    
    /**
     * TODO Написать доку
     * t: current time, b: beginning value, c: change In value, d: duration
     */
    jQuery.ease = function (fn, startValue, endValue, step, time, duration) {
        var easingFn;
        if (jQuery.isString(fn)) {
            if (jQuery.defined(this.easing[fn])) {
                easingFn = this.easing[fn];
            } else {
                throw "Unknown agrument";
            }
        } else if (jQuery.isFunction(fn)) {
            easingFn = fn;
        } else {
            throw "Unknown agrument";
        }
        return easingFn(0, duration * step, startValue, endValue - startValue, duration);
    };

    /**
     * TODO Написать доку
     */
    jQuery.toCamelCase = function (string, firstUpper) {
        var result = string;
        if ( ! jQuery.defined(firstUpper)) {
            firstUpper = false;
        }
        result = result.replace(/[\s_-](\w)/g, function (match, $1) {
            return $1.toUpperCase();
        }).replace(/^(\w)/g, function (match, $1) {
            return $1['to' + (firstUpper ? 'Upper' : 'Lower') + 'Case']();
        });
        return result;
    };

    /**
     * TODO Написать доку
     */
    jQuery.profile = function (cb, count) {
        if ( ! jQuery.defined(count)) {
            count = 100;
        }
        var time = Date.now();
        var mem = app.memoryInUse;
        for (var i = 0; i < count; i++) {
            cb();
        }
        return {
            time: Date.now() - time,
            mem: app.memoryInUse - mem
        };
    };

    return jQuery;
}());