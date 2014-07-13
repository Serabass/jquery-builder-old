

(function ($) {
    $.fn.car = function (options) {
        var defaults = {
                initPosition    : 1400,
                endPosition     : 50,
                time            : [3, +2],
                breakTime       : [4.0, +1.2],
                breakRotation   : -40,
                fallTime        : [5.5, +1],
                anchorPoint     : null
            },
            settings = $.extend({}, defaults, options),
            self = this,
            _ = function (name) {
                return jQuery.setting(name, settings, self);
            };
        this.separate().set3D(false);
        this.time(_('time')[0], _('time')[1], function (step, time, duration) {
            var position = $.ease('easeOutQuad', _('initPosition'), _('endPosition'), step, time, duration);
            this.transform.xPosition.setValueAtTime(time, position);
        });
        this.time(_('breakTime')[0], _('breakTime')[1], function (step, time, duration) {
            var rotation = $.ease('easeOutQuad', 0, _('breakRotation'), step, time, duration);
            this.transform.rotation.setValueAtTime(time, rotation);
        });
        this.time(_('fallTime')[0],_('fallTime')[1], function (step, time, duration) {
            var rotation = $.ease('easeOutBounce', _('breakRotation'), 0, step, time, duration);
            this.transform.rotation.setValueAtTime(time, rotation);
        });
        return this;
    };

    $.fn.carDust = function (options) {
        return this.each(function () {
            var defaults = {
                    initPosition    : function() {return 1640;},
                    endPosition     : function() {return -50;},
                    time            : function() {return [3, 2];},
                    breakTime       : function() {return 0.6;},
                    breakRotation   : function() {return -20;},
                    anchorPoint     : function() {}
                },
                settings = $.extend({}, defaults, options),
                self = this,
                offset = (100 - 200 * Math.random()),
                timeOffset = (2 - 4 * Math.random()),
                _ = function (name) {
                    return jQuery.setting(name, settings, self);
                };
            $(this).time(_('time')[0], _('time')[1], function (step, time, duration) {
                var position = $.ease('easeOutQuad', _('initPosition') + offset, _('endPosition') + offset, step, time, duration);
                this.transform.xPosition.setValueAtTime(time, position);
            }).time(_('time')[1] - 1, 1, function (step, time, duration) {
                var opacity = $.ease('easeOutQuad', 100, 0, step, time, duration);
                this.transform.opacity.setValueAtTime(time, opacity);
            });
        });
    };

    $.fn.swings = function (startTime, endTime, startValue, endValue) {
        return this.time(startTime, endTime, function (step, time, duration) {
            var rotation = $.ease('easeOutElastic', startValue, endValue, step, time, duration);
            this.transform.xRotation.setValueAtTime(time, rotation);
        })
    };

    $.fn.ventilator = function () {
        // Добавить опции
        return this.time(0, 4, function(step, time, duration) {
            var rotation = $.ease('easeOutElastic', -400, 500, step, time, duration);
            this.transform.yPosition.setValueAtTime(time, rotation);
        })
        .time(0.5, 1, function(step, time, duration) {
            var rotation = $.ease('easeInQuad', 0, 1000, step, time, duration);
            this.transform.yRotation.setValueAtTime(time, rotation);
        })
        .time(1.5, 1, function(step, time, duration) {
            var rotation = $.ease('easeOutQuad', 1000, 200, step, time, duration);
            this.transform.yRotation.setValueAtTime(time, rotation);
        })
        .time(1.7, 1, function(step, time, duration) {
            var rotation = $.ease('easeOutQuad', 0, -400, step, time, duration);
            this.transform.yPosition.setValueAtTime(time, rotation);
        })
    };

    $.fn.creep = function (options) {
        var startPosition = 1500;
        var oneStep = 400;
        var pause = 0.2;
        this.separate();
        for (var i = 0; i < 4; i++) {
            this.time(i + pause, 0.8, function(step, time, duration) {
                var from = startPosition - (oneStep * i);
                var to = startPosition - (oneStep * (i + 1));
                var position = $.ease('easeOutQuad', from, to, step, time, duration);
                this.transform.xPosition.setValueAtTime(time, position);
            });
        }
        return this;
    };

    $.fn.leave = function (startTime, endTime, startPosition, endPosition) {
        return this.separate().threeD(true).each(function (i) {
            jQuery(this).prop('transform > xPosition').expression = '650 + (500 * Math.sin(time))';
            jQuery(this).prop('transform > zRotation').expression = '(transform.xPosition - 650) / -30';
            
            jQuery(this).prop('transform > yPosition').setValueAtTime(startTime, startPosition);
            jQuery(this).prop('transform > yPosition').setValueAtTime(endTime, endPosition);
        });
    };

}(jQuery));