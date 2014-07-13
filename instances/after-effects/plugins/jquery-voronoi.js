(function ($) {
	var global = this;
    
    $.fn.breakIt = function (/* [object] */options) {
         if (!$.defined(options)) options = {};
        var o = $.extend({
            step: 10,
            chaos: 50,
            horizontal: true,
            delta: function (i, count, chaos) {
                return chaos + (Math.sin(i) * Math.cos(i)) * 10;
            },
            position: 0.5
        }, options),
            ret,
            rgx = /^(\d+)%$/;
        app.beginUndoGroup('jQuery.breakIt [' + this.length + ' elements');
        if (typeof o.position === 'string') {
            if (rgx.test(o.position)) {
                o.position = parseInt(rgx.exec(o.position)[1], 10) / 100;
            } else {
                throw new Error('unknown format of options.position');
            }
        }
        ret = this.each(function () {
            var shapes = [new Shape(), new Shape()],
                p1 = [],
                p2 = [],
                delta,
                verts = [],
                verts1 = [],
                verts2 = [],
                width = this.width,
                height = this.height,
                bmasks = false,
                prop,
                mapped,
                sorted,
                i,
                masks,
                duplicates,
                cnt = 0;
            try {
                prop = this.Masks.property(1);
                bmasks = true;
            } catch (e) {
                bmasks = false;
            }
            if (bmasks) { // reserved
                mapped = this.Masks.property(1).property('Mask Path').value.vertices.map(function () {
                    return this[0];
                });
                sorted = mapped.sort(function (e1, e2) {
                    return e1 < e2;
                });
                width = sorted[0] - sorted[sorted.length - 1];
                mapped = this.Masks.property(1).property('Mask Path').value.vertices.map(function () {
                    return this[1];
                });
                sorted = mapped.sort(function (e1, e2) {
                    return e1 < e2;
                });
                height = sorted[0] - sorted[sorted.length - 1];
            }
            if (!o.horizontal) {
                p2 = [(width * o.position) + delta, 0];
                for (i = 0; i <= (height); i += o.step) {
                    delta = (o.chaos / 2) - o.delta(i, ++cnt, o.chaos);
                    p1 = p2;
                    p2 = [(width * o.position) + delta, i];
                    verts.push(p2);
                }
                for (i = 0; i < verts.length; i++) {
                    verts1.push(verts[i]);
                }
                verts1.push([0, p2[1]]);
                verts1.push([0, 0]);
                for (i = 0; i < verts.length; i++) {
                    verts2.push(verts[i]);
                }
                verts2.push([width, p2[1]]);
                verts2.push([width, 0]);
            } else {
                p2 = [0, (height * o.position) + delta];
                for (i = 0; i <= (width); i += o.step) {
                    delta = (o.chaos / 2) - o.delta(i, ++cnt, o.chaos);
                    p1 = p2;
                    p2 = [i, (height * o.position) + delta];
                    verts.push(p2);
                }
                for (i = 0; i < verts.length; i++) {
                    verts1.push(verts[i]);
                    verts2.push(verts[i]);
                }
                verts1.push([p2[0], height]);
                verts1.push([0, height]);
                verts2.push([p2[0], 0]);
                verts2.push([0, 0]);
            }
            shapes[0].vertices = verts1;
            shapes[0].closed = true;
            shapes[1].vertices = verts2;
            shapes[1].closed = true;
            duplicates = [this.duplicate(), this.duplicate()];
            masks = [duplicates[0].Masks.addProperty("Mask"), duplicates[1].Masks.addProperty("Mask")]; // не добавлять новую маску, а редактировать имеющуюся, если есть
            masks[0].maskShape.setValue(shapes[0]);
            masks[1].maskShape.setValue(shapes[1]);
            this.enabled = false;
            duplicates[0].selected = true;
            duplicates[1].selected = true;
            this.selected = false;
            this.duplicates = duplicates;
            if (o.horizontal) {
                duplicates[0].name = this.name + ' [bottom]';
                duplicates[1].name = this.name + ' [top]';
            } else {
                duplicates[0].name = this.name + ' [left]';
                duplicates[1].name = this.name + ' [right]';
            }
        });
        app.endUndoGroup();
        return ret;
    };
    $.fn.repair = function () {
        var ret;
        app.beginUndoGroup('jQuery.repair [' + this.length + ' elements');
        ret = this.each(function () {
            var i;
            if ($.def(this.duplicates)) {
                for (i = 0; i < this.duplicates.length; i++) {
                    this.duplicates[i].remove();
                    delete this.duplicates[i];
                }
                delete this.duplicates;
                this.enabled = true;
                this.selected = true;
            }
        });
        app.endUndoGroup();
        return ret;
    };
    $.fn.breakVoronoi = function (/* [object] */options) {
        /*!
        Author: Raymond Hill (rhill@raymondhill.net)
        File: rhill-voronoi-core.js
        Version: 0.96
        Date: May 26, 2011
        Description: This is my personal Javascript implementation of
        Steven Fortune's algorithm to compute Voronoi diagrams.

        Copyright (C) 2010,2011 Raymond Hill
        https://github.com/gorhill/Javascript-Voronoi

        Licensed under The MIT License
        http://en.wikipedia.org/wiki/MIT_License

        *****

        Portions of this software use, depend, or was inspired by the work of:

          "Fortune's algorithm" by Steven J. Fortune: For his clever
          algorithm to compute Voronoi diagrams.
          http://ect.bell-labs.com/who/sjf/

          "The Liang-Barsky line clipping algorithm in a nutshell!" by Daniel White,
          to efficiently clip a line within a rectangle.
          http://www.skytopia.com/project/articles/compsci/clipping.html

          "rbtree" by Franck Bui-Huu
          https://github.com/fbuihuu/libtree/blob/master/rb.c
          I ported to Javascript the C code of a Red-Black tree implementation by
          Franck Bui-Huu, and further altered the code for Javascript efficiency
          and to very specifically fit the purpose of holding the beachline (the key
          is a variable range rather than an unmutable data point), and unused
          code paths have been removed. Each node in the tree is actually a beach
          section on the beachline. Using a tree structure for the beachline remove
          the need to lookup the beach section in the array at removal time, as
          now a circle event can safely hold a reference to its associated
          beach section (thus findDeletionPoint() is no longer needed). This
          finally take care of nagging finite arithmetic precision issues arising
          at lookup time, such that epsilon could be brought down to 1e-9 (from 1e-4).
          rhill 2011-05-27: added a 'previous' and 'next' members which keeps track
          of previous and next nodes, and remove the need for Beachsection.getPrevious()
          and Beachsection.getNext().
        */
        function Voronoi() {
            this.edges = null;
            this.cells = null;
            this.beachsectionJunkyard = [];
            this.circleEventJunkyard = [];
        }
        Voronoi.prototype.reset = function () {
            if (!this.beachline) {
                this.beachline = new this.RBTree();
            }
            if (this.beachline.root) {
                var a = this.beachline.getFirst(this.beachline.root);
                while (a) {
                    this.beachsectionJunkyard.push(a);
                    a = a.rbNext;
                }
            }
            this.beachline.root = null;
            if (!this.circleEvents) {
                this.circleEvents = new this.RBTree();
            }
            this.circleEvents.root = this.firstCircleEvent = null;
            this.edges = [];
            this.cells = [];
        };
        Voronoi.prototype.sqrt = Math.sqrt;
        Voronoi.prototype.abs = Math.abs;
        Voronoi.prototype.EPSILON = 1e-9;
        Voronoi.prototype.equalWithEpsilon = function (d, c) {
            return this.abs(d - c) < 1e-9;
        };
        Voronoi.prototype.greaterThanWithEpsilon = function (d, c) {
            return d - c > 1e-9;
        };
        Voronoi.prototype.greaterThanOrEqualWithEpsilon = function (d, c) {
            return c - d < 1e-9;
        };
        Voronoi.prototype.lessThanWithEpsilon = function (d, c) {
            return c - d > 1e-9;
        };
        Voronoi.prototype.lessThanOrEqualWithEpsilon = function (d, c) {
            return d - c < 1e-9;
        };
        Voronoi.prototype.RBTree = function () {
            this.root = null;
        };
        Voronoi.prototype.RBTree.prototype.rbInsertSuccessor = function (e, a) {
            var d,
                c,
                b;
            if (e) {
                a.rbPrevious = e;
                a.rbNext = e.rbNext;
                if (e.rbNext) {
                    e.rbNext.rbPrevious = a;
                }
                e.rbNext = a;
                if (e.rbRight) {
                    e = e.rbRight;
                    while (e.rbLeft) {
                        e = e.rbLeft;
                    }
                    e.rbLeft = a;
                } else {
                    e.rbRight = a;
                }
                d = e;
            } else {
                if (this.root) {
                    e = this.getFirst(this.root);
                    a.rbPrevious = null;
                    a.rbNext = e;
                    e.rbPrevious = a;
                    e.rbLeft = a;
                    d = e;
                } else {
                    a.rbPrevious = a.rbNext = null;
                    this.root = a;
                    d = null;
                }
            }
            a.rbLeft = a.rbRight = null;
            a.rbParent = d;
            a.rbRed = true;
            e = a;
            while (d && d.rbRed) {
                c = d.rbParent;
                if (d === c.rbLeft) {
                    b = c.rbRight;
                    if (b && b.rbRed) {
                        d.rbRed = b.rbRed = false;
                        c.rbRed = true;
                        e = c;
                    } else {
                        if (e === d.rbRight) {
                            this.rbRotateLeft(d);
                            e = d;
                            d = e.rbParent;
                        }
                        d.rbRed = false;
                        c.rbRed = true;
                        this.rbRotateRight(c);
                    }
                } else {
                    b = c.rbLeft;
                    if (b && b.rbRed) {
                        d.rbRed = b.rbRed = false;
                        c.rbRed = true;
                        e = c;
                    } else {
                        if (e === d.rbLeft) {
                            this.rbRotateRight(d);
                            e = d;
                            d = e.rbParent;
                        }
                        d.rbRed = false;
                        c.rbRed = true;
                        this.rbRotateLeft(c);
                    }
                }
                d = e.rbParent;
            }
            this.root.rbRed = false;
        };
        Voronoi.prototype.RBTree.prototype.rbRemoveNode = function (f) {
            if (f.rbNext) {
                f.rbNext.rbPrevious = f.rbPrevious;
            }
            if (f.rbPrevious) {
                f.rbPrevious.rbNext = f.rbNext;
            }
            f.rbNext = f.rbPrevious = null;
            var e = f.rbParent,
                g = f.rbLeft,
                b = f.rbRight,
                d,
                a,
                c;
            if (!g) {
                d = b;
            } else {
                if (!b) {
                    d = g;
                } else {
                    d = this.getFirst(b);
                }
            }
            if (e) {
                if (e.rbLeft === f) {
                    e.rbLeft = d;
                } else {
                    e.rbRight = d;
                }
            } else {
                this.root = d;
            }
            if (g && b) {
                a = d.rbRed;
                d.rbRed = f.rbRed;
                d.rbLeft = g;
                g.rbParent = d;
                if (d !== b) {
                    e = d.rbParent;
                    d.rbParent = f.rbParent;
                    f = d.rbRight;
                    e.rbLeft = f;
                    d.rbRight = b;
                    b.rbParent = d;
                } else {
                    d.rbParent = e;
                    e = d;
                    f = d.rbRight;
                }
            } else {
                a = f.rbRed;
                f = d;
            }
            if (f) {
                f.rbParent = e;
            }
            if (a) {
                return;
            }
            if (f && f.rbRed) {
                f.rbRed = false;
                return;
            }
            do {
                if (f === this.root) {
                    break;
                }
                if (f === e.rbLeft) {
                    c = e.rbRight;
                    if (c.rbRed) {
                        c.rbRed = false;
                        e.rbRed = true;
                        this.rbRotateLeft(e);
                        c = e.rbRight;
                    }
                    if ((c.rbLeft && c.rbLeft.rbRed) || (c.rbRight && c.rbRight.rbRed)) {
                        if (!c.rbRight || !c.rbRight.rbRed) {
                            c.rbLeft.rbRed = false;
                            c.rbRed = true;
                            this.rbRotateRight(c);
                            c = e.rbRight;
                        }
                        c.rbRed = e.rbRed;
                        e.rbRed = c.rbRight.rbRed = false;
                        this.rbRotateLeft(e);
                        f = this.root;
                        break;
                    }
                } else {
                    c = e.rbLeft;
                    if (c.rbRed) {
                        c.rbRed = false;
                        e.rbRed = true;
                        this.rbRotateRight(e);
                        c = e.rbLeft;
                    }
                    if ((c.rbLeft && c.rbLeft.rbRed) || (c.rbRight && c.rbRight.rbRed)) {
                        if (!c.rbLeft || !c.rbLeft.rbRed) {
                            c.rbRight.rbRed = false;
                            c.rbRed = true;
                            this.rbRotateLeft(c);
                            c = e.rbLeft;
                        }
                        c.rbRed = e.rbRed;
                        e.rbRed = c.rbLeft.rbRed = false;
                        this.rbRotateRight(e);
                        f = this.root;
                        break;
                    }
                }
                c.rbRed = true;
                f = e;
                e = e.rbParent;
            } while (!f.rbRed);
            if (f) {
                f.rbRed = false;
            }
        };
        Voronoi.prototype.RBTree.prototype.rbRotateLeft = function (b) {
            var d = b,
                c = b.rbRight,
                a = d.rbParent;
            if (a) {
                if (a.rbLeft === d) {
                    a.rbLeft = c;
                } else {
                    a.rbRight = c;
                }
            } else {
                this.root = c;
            }
            c.rbParent = a;
            d.rbParent = c;
            d.rbRight = c.rbLeft;
            if (d.rbRight) {
                d.rbRight.rbParent = d;
            }
            c.rbLeft = d;
        };
        Voronoi.prototype.RBTree.prototype.rbRotateRight = function (b) {
            var d = b,
                c = b.rbLeft,
                a = d.rbParent;
            if (a) {
                if (a.rbLeft === d) {
                    a.rbLeft = c;
                } else {
                    a.rbRight = c;
                }
            } else {
                this.root = c;
            }
            c.rbParent = a;
            d.rbParent = c;
            d.rbLeft = c.rbRight;
            if (d.rbLeft) {
                d.rbLeft.rbParent = d;
            }
            c.rbRight = d;
        };
        Voronoi.prototype.RBTree.prototype.getFirst = function (a) {
            while (a.rbLeft) {
                a = a.rbLeft;
            }
            return a;
        };
        Voronoi.prototype.RBTree.prototype.getLast = function (a) {
            while (a.rbRight) {
                a = a.rbRight;
            }
            return a;
        };
        Voronoi.prototype.Cell = function (a) {
            this.site = a;
            this.halfedges = [];
        };
        Voronoi.prototype.Cell.prototype.prepare = function () {
            var a = this.halfedges,
                b = a.length,
                c;
            while (b--) {
                c = a[b].edge;
                if (!c.vb || !c.va) {
                    a.splice(b, 1);
                }
            }
            a.sort(function (e, d) {
                return d.angle - e.angle;
            });
            return a.length;
        };
        Voronoi.prototype.Vertex = function (a, b) {
            this.x = a;
            this.y = b;
        };
        Voronoi.prototype.Edge = function (b, a) {
            this.lSite = b;
            this.rSite = a;
            this.va = this.vb = null;
        };
        Voronoi.prototype.Halfedge = function (d, e, a) {
            this.site = e;
            this.edge = d;
            if (a) {
                this.angle = Math.atan2(a.y - e.y, a.x - e.x);
            } else {
                var c = d.va,
                    b = d.vb;
                this.angle = d.lSite === e ? Math.atan2(b.x - c.x, c.y - b.y) : Math.atan2(c.x - b.x, b.y - c.y);
            }
        };
        Voronoi.prototype.Halfedge.prototype.getStartpoint = function () {
            return this.edge.lSite === this.site ? this.edge.va : this.edge.vb;
        };
        Voronoi.prototype.Halfedge.prototype.getEndpoint = function () {
            return this.edge.lSite === this.site ? this.edge.vb : this.edge.va;
        };
        Voronoi.prototype.createEdge = function (e, a, d, b) {
            var c = new this.Edge(e, a);
            this.edges.push(c);
            if (d) {
                this.setEdgeStartpoint(c, e, a, d);
            }
            if (b) {
                this.setEdgeEndpoint(c, e, a, b);
            }
            this.cells[e.voronoiId].halfedges.push(new this.Halfedge(c, e, a));
            this.cells[a.voronoiId].halfedges.push(new this.Halfedge(c, a, e));
            return c;
        };
        Voronoi.prototype.createBorderEdge = function (d, c, a) {
            var b = new this.Edge(d, null);
            b.va = c;
            b.vb = a;
            this.edges.push(b);
            return b;
        };
        Voronoi.prototype.setEdgeStartpoint = function (b, d, a, c) {
            if (!b.va && !b.vb) {
                b.va = c;
                b.lSite = d;
                b.rSite = a;
            } else {
                if (b.lSite === a) {
                    b.vb = c;
                } else {
                    b.va = c;
                }
            }
        };
        Voronoi.prototype.setEdgeEndpoint = function (b, d, a, c) {
            this.setEdgeStartpoint(b, a, d, c);
        };
        Voronoi.prototype.Beachsection = function () {

        };
        Voronoi.prototype.createBeachsection = function (a) {
            var b = this.beachsectionJunkyard.pop();
            if (!b) {
                b = new this.Beachsection();
            }
            b.site = a;
            return b;
        };
        Voronoi.prototype.leftBreakPoint = function (e, f) {
            var a = e.site,
                m = a.x,
                l = a.y,
                k = l - f,
                n,
                h,
                g,
                d,
                c,
                j,
                i;
            if (!k) {
                return m;
            }
            n = e.rbPrevious;
            if (!n) {
                return -Infinity;
            }
            a = n.site;
            h = a.x;
            g = a.y;
            d = g - f;
            if (!d) {
                return h;
            }
            c = h - m;
            j = 1 / k - 1 / d;
            i = c / d;
            if (j) {
                return (-i + this.sqrt(i * i - 2 * j * (c * c / (-2 * d) - g + d / 2 + l - k / 2))) / j + m;
            }
            return (m + h) / 2;
        };
        Voronoi.prototype.rightBreakPoint = function (b, c) {
            var d = b.rbNext,
                a;
            if (d) {
                return this.leftBreakPoint(d, c);
            }
            a = b.site;
            return a.y === c ? a.x : Infinity;
        };
        Voronoi.prototype.detachBeachsection = function (a) {
            this.detachCircleEvent(a);
            this.beachline.rbRemoveNode(a);
            this.beachsectionJunkyard.push(a);
        };
        Voronoi.prototype.removeBeachsection = function (b) {
            var a = b.circleEvent,
                j = a.x,
                h = a.ycenter,
                e = new this.Vertex(j, h),
                f = b.rbPrevious,
                d = b.rbNext,
                l = [b],
                g = Math.abs,
                m,
                c,
                k,
                i;
            this.detachBeachsection(b);
            m = f;
            while (m.circleEvent && g(j - m.circleEvent.x) < 1e-9 && g(h - m.circleEvent.ycenter) < 1e-9) {
                f = m.rbPrevious;
                l.unshift(m);
                this.detachBeachsection(m);
                m = f;
            }
            l.unshift(m);
            this.detachCircleEvent(m);
            c = d;
            while (c.circleEvent && g(j - c.circleEvent.x) < 1e-9 && g(h - c.circleEvent.ycenter) < 1e-9) {
                d = c.rbNext;
                l.push(c);
                this.detachBeachsection(c);
                c = d;
            }
            l.push(c);
            this.detachCircleEvent(c);
            k = l.length;
            for (i = 1; i < k; i++) {
                c = l[i];
                m = l[i - 1];
                this.setEdgeStartpoint(c.edge, m.site, c.site, e);
            }
            m = l[0];
            c = l[k - 1];
            c.edge = this.createEdge(m.site, c.site, undefined, e);
            this.attachCircleEvent(m);
            this.attachCircleEvent(c);
        };
        Voronoi.prototype.addBeachsection = function (l) {
            var j = l.x,
                n = l.y,
                p,
                m,
                v,
                q,
                o = this.beachline.root,
                e,
                h,
                k,
                i,
                t,
                r,
                a,
                c,
                b,
                u,
                g,
                f,
                s;
            while (o) {
                v = this.leftBreakPoint(o, n) - j;
                if (v > 1e-9) {
                    o = o.rbLeft;
                } else {
                    q = j - this.rightBreakPoint(o, n);
                    if (q > 1e-9) {
                        if (!o.rbRight) {
                            p = o;
                            break;
                        }
                        o = o.rbRight;
                    } else {
                        if (v > -1e-9) {
                            p = o.rbPrevious;
                            m = o;
                        } else {
                            if (q > -1e-9) {
                                p = o;
                                m = o.rbNext;
                            } else {
                                p = m = o;
                            }
                        }
                        break;
                    }
                }
            }
            e = this.createBeachsection(l);
            this.beachline.rbInsertSuccessor(p, e);
            if (!p && !m) {
                return;
            }
            if (p === m) {
                this.detachCircleEvent(p);
                m = this.createBeachsection(p.site);
                this.beachline.rbInsertSuccessor(e, m);
                e.edge = m.edge = this.createEdge(p.site, e.site);
                this.attachCircleEvent(p);
                this.attachCircleEvent(m);
                return;
            }
            if (p && !m) {
                e.edge = this.createEdge(p.site, e.site);
                return;
            }
            if (p !== m) {
                this.detachCircleEvent(p);
                this.detachCircleEvent(m);
                h = p.site;
                k = h.x;
                i = h.y;
                t = l.x - k;
                r = l.y - i;
                a = m.site;
                c = a.x - k;
                b = a.y - i;
                u = 2 * (t * b - r * c);
                g = t * t + r * r;
                f = c * c + b * b;
                s = new this.Vertex((b * g - r * f) / u + k, (t * f - c * g) / u + i);
                this.setEdgeStartpoint(m.edge, h, a, s);
                e.edge = this.createEdge(h, l, undefined, s);
                m.edge = this.createEdge(l, a, undefined, s);
                this.attachCircleEvent(p);
                this.attachCircleEvent(m);
                return;
            }
        };
        Voronoi.prototype.CircleEvent = function () {

        };
        Voronoi.prototype.attachCircleEvent = function (i) {
            var r = i.rbPrevious,
                o = i.rbNext,
                k,
                u,
                c,
                t,
                s,
                n,
                l,
                f,
                e,
                v,
                h,
                g,
                m,
                j,
                b,
                q,
                a,
                p;
            if (!r || !o) {
                return;
            }
            k = r.site;
            u = i.site;
            c = o.site;
            if (k === c) {
                return;
            }
            t = u.x;
            s = u.y;
            n = k.x - t;
            l = k.y - s;
            f = c.x - t;
            e = c.y - s;
            v = 2 * (n * e - l * f);
            if (v >= -2e-12) {
                return;
            }
            h = n * n + l * l;
            g = f * f + e * e;
            m = (e * h - l * g) / v;
            j = (n * g - f * h) / v;
            b = j + s;
            q = this.circleEventJunkyard.pop();
            if (!q) {
                q = new this.CircleEvent();
            }
            q.arc = i;
            q.site = u;
            q.x = m + t;
            q.y = b + this.sqrt(m * m + j * j);
            q.ycenter = b;
            i.circleEvent = q;
            a = null;
            p = this.circleEvents.root;
            while (p) {
                if (q.y < p.y || (q.y === p.y && q.x <= p.x)) {
                    if (p.rbLeft) {
                        p = p.rbLeft;
                    } else {
                        a = p.rbPrevious;
                        break;
                    }
                } else {
                    if (p.rbRight) {
                        p = p.rbRight;
                    } else {
                        a = p;
                        break;
                    }
                }
            }
            this.circleEvents.rbInsertSuccessor(a, q);
            if (!a) {
                this.firstCircleEvent = q;
            }
        };
        Voronoi.prototype.detachCircleEvent = function (a) {
            var b = a.circleEvent;
            if (b) {
                if (!b.rbPrevious) {
                    this.firstCircleEvent = b.rbNext;
                }
                this.circleEvents.rbRemoveNode(b);
                this.circleEventJunkyard.push(b);
                a.circleEvent = null;
            }
        };
        Voronoi.prototype.connectEdge = function (l, a) {
            var b = l.vb,
                c,
                p,
                n,
                r,
                d,
                o,
                e,
                i,
                h,
                k,
                j,
                g,
                f,
                m,
                q;
            if (!!b) {
                return true;
            }
            c = l.va;
            p = a.xl;
            n = a.xr;
            r = a.yt;
            d = a.yb;
            o = l.lSite;
            e = l.rSite;
            i = o.x;
            h = o.y;
            k = e.x;
            j = e.y;
            g = (i + k) / 2;
            f = (h + j) / 2;
            if (j !== h) {
                m = (i - k) / (j - h);
                q = f - m * g;
            }
            if (m === undefined) {
                if (g < p || g >= n) {
                    return false;
                }
                if (i > k) {
                    if (!c) {
                        c = new this.Vertex(g, r);
                    } else {
                        if (c.y >= d) {
                            return false;
                        }
                    }
                    b = new this.Vertex(g, d);
                } else {
                    if (!c) {
                        c = new this.Vertex(g, d);
                    } else {
                        if (c.y < r) {
                            return false;
                        }
                    }
                    b = new this.Vertex(g, r);
                }
            } else {
                if (m < -1 || m > 1) {
                    if (i > k) {
                        if (!c) {
                            c = new this.Vertex((r - q) / m, r);
                        } else {
                            if (c.y >= d) {
                                return false;
                            }
                        }
                        b = new this.Vertex((d - q) / m, d);
                    } else {
                        if (!c) {
                            c = new this.Vertex((d - q) / m, d);
                        } else {
                            if (c.y < r) {
                                return false;
                            }
                        }
                        b = new this.Vertex((r - q) / m, r);
                    }
                } else {
                    if (h < j) {
                        if (!c) {
                            c = new this.Vertex(p, m * p + q);
                        } else {
                            if (c.x >= n) {
                                return false;
                            }
                        }
                        b = new this.Vertex(n, m * n + q);
                    } else {
                        if (!c) {
                            c = new this.Vertex(n, m * n + q);
                        } else {
                            if (c.x < p) {
                                return false;
                            }
                        }
                        b = new this.Vertex(p, m * p + q);
                    }
                }
            }
            l.va = c;
            l.vb = b;
            return true;
        };
        Voronoi.prototype.clipEdge = function (d, i) {
            var b = d.va.x,
                l = d.va.y,
                h = d.vb.x,
                g = d.vb.y,
                f = 0,
                e = 1,
                k = h - b,
                j = g - l,
                c = b - i.xl,
                a;
            if (k === 0 && c < 0) {
                return false;
            }
            a = -c / k;
            if (k < 0) {
                if (a < f) {
                    return false;
                } else {
                    if (a < e) {
                        e = a;
                    }
                }
            } else {
                if (k > 0) {
                    if (a > e) {
                        return false;
                    } else {
                        if (a > f) {
                            f = a;
                        }
                    }
                }
            }
            c = i.xr - b;
            if (k === 0 && c < 0) {
                return false;
            }
            a = c / k;
            if (k < 0) {
                if (a > e) {
                    return false;
                } else {
                    if (a > f) {
                        f = a;
                    }
                }
            } else {
                if (k > 0) {
                    if (a < f) {
                        return false;
                    } else {
                        if (a < e) {
                            e = a;
                        }
                    }
                }
            }
            c = l - i.yt;
            if (j === 0 && c < 0) {
                return false;
            }
            a = -c / j;
            if (j < 0) {
                if (a < f) {
                    return false;
                } else {
                    if (a < e) {
                        e = a;
                    }
                }
            } else {
                if (j > 0) {
                    if (a > e) {
                        return false;
                    } else {
                        if (a > f) {
                            f = a;
                        }
                    }
                }
            }
            c = i.yb - l;
            if (j === 0 && c < 0) {
                return false;
            }
            a = c / j;
            if (j < 0) {
                if (a > e) {
                    return false;
                } else {
                    if (a > f) {
                        f = a;
                    }
                }
            } else {
                if (j > 0) {
                    if (a < f) {
                        return false;
                    } else {
                        if (a < e) {
                            e = a;
                        }
                    }
                }
            }
            if (f > 0) {
                d.va = new this.Vertex(b + f * k, l + f * j);
            }
            if (e < 1) {
                d.vb = new this.Vertex(b + e * k, l + e * j);
            }
            return true;
        };
        Voronoi.prototype.clipEdges = function (e) {
            var a = this.edges,
                d = a.length,
                c,
                b = Math.abs;
            while (d--) {
                c = a[d];
                if (!this.connectEdge(c, e) || !this.clipEdge(c, e) || (b(c.va.x - c.vb.x) < 1e-9 && b(c.va.y - c.vb.y) < 1e-9)) {
                    c.va = c.vb = null;
                    a.splice(d, 1);
                }
            }
        };
        Voronoi.prototype.closeCells = function (a) {
            var n = a.xl,
                m = a.xr,
                q = a.yt,
                e = a.yb,
                g = this.cells,
                f = g.length,
                b,
                h,
                r,
                o,
                p,
                j,
                l,
                i,
                d,
                c,
                k = Math.abs;
            while (f--) {
                b = g[f];
                if (!b.prepare()) {
                    continue;
                }
                o = b.halfedges;
                p = o.length;
                h = 0;
                while (h < p) {
                    r = (h + 1) % p;
                    i = o[h].getEndpoint();
                    l = o[r].getStartpoint();
                    if (k(i.x - l.x) >= 1e-9 || k(i.y - l.y) >= 1e-9) {
                        d = i;
                        if (this.equalWithEpsilon(i.x, n) && this.lessThanWithEpsilon(i.y, e)) {
                            c = new this.Vertex(n, this.equalWithEpsilon(l.x, n) ? l.y : e);
                        } else {
                            if (this.equalWithEpsilon(i.y, e) && this.lessThanWithEpsilon(i.x, m)) {
                                c = new this.Vertex(this.equalWithEpsilon(l.y, e) ? l.x : m, e);
                            } else {
                                if (this.equalWithEpsilon(i.x, m) && this.greaterThanWithEpsilon(i.y, q)) {
                                    c = new this.Vertex(m, this.equalWithEpsilon(l.x, m) ? l.y : q);
                                } else {
                                    if (this.equalWithEpsilon(i.y, q) && this.greaterThanWithEpsilon(i.x, n)) {
                                        c = new this.Vertex(this.equalWithEpsilon(l.y, q) ? l.x : n, q);
                                    }
                                }
                            }
                        }
                        j = this.createBorderEdge(b.site, d, c);
                        o.splice(h + 1, 0, new this.Halfedge(j, b.site, null));
                        p = o.length;
                    }
                    h++;
                }
            }
        };
        Voronoi.prototype.compute = function (h, i) {
            var d = new Date(),
                g,
                b,
                k,
                f,
                e,
                j,
                a,
                c,
                l;
            this.reset();
            g = h.slice(0);
            g.sort(function (n, m) {
                var o = m.y - n.y;
                if (o) {
                    return o;
                }
                return m.x - n.x;
            });
            b = g.pop();
            k = 0;
            f = Number.MIN_VALUE;
            e = Number.MIN_VALUE;
            j = this.cells;
            for (;;) {
                a = this.firstCircleEvent;
                if (b && (!a || b.y < a.y || (b.y === a.y && b.x < a.x))) {
                    if (b.x !== f || b.y !== e) {
                        j[k] = new this.Cell(b);
                        b.voronoiId = k++;
                        this.addBeachsection(b);
                        e = b.y;
                        f = b.x;
                    }
                    b = g.pop();
                } else {
                    if (a) {
                        this.removeBeachsection(a.arc);
                    } else {
                        break;
                    }
                }
            }
            this.clipEdges(i);
            this.closeCells(i);
            c = new Date();
            l = {
                cells : this.cells,
                edges : this.edges,
                execTime : c.getTime() - d.getTime()
            };
            this.reset();
            return l;
        };


        var VoronoiInit = {
            voronoi: new Voronoi(),
            sites: [],
            diagram: null,
            margin: 0.1,
            canvas: null,
            bbox: {
                xl: 0,
                xr: 800,
                yt: 0,
                yb: 600
            },
            init: function (opts) {
                this.canvas = opts.canvas;
                this.feather = opts.feather;
                this.bbox.xr = opts.canvas.width;
                this.bbox.yb = opts.canvas.height;
                this.iterations = opts.iterations;
                this.randomSites(opts.iterations, true);
                this.render();
            },

            clearSites: function () {
                this.sites = [];
                this.diagram = this.voronoi.compute(this.sites, this.bbox);
                this.updateStats();
            },
            // create vertices
            randomSites: function (n, clear) {
                var xmargin = this.canvas.width * this.margin,
                    ymargin = this.canvas.height * this.margin,
                    xo = xmargin,
                    dx = this.canvas.width - xmargin * 2,
                    yo = ymargin,
                    dy = this.canvas.height - ymargin * 2;
                    if (clear) {
                        this.sites = [];
                    }
                    for (var i = 0; i < n; i++) {
                        this.sites.push({
                x: Math.round((xo + Math.random() * dx) * 10) / 10,
                y: Math.round((yo + Math.random() * dy) * 10) / 10
            });
                    }
                    this.diagram = this.voronoi.compute(this.sites, this.bbox);
                    this.updateStats();
            },
            recompute: function () {
                this.diagram = this.voronoi.compute(this.sites, this.bbox);
                this.updateStats();
            },
            updateStats: function () {
                return;
                /*if (!this.diagram) {return;}
                var e = document.getElementById('voronoiStats');
                if (!e) {return;}
                e.innerHTML = '('+this.diagram.cells.length+' Voronoi cells computed from '+this.diagram.cells.length+' Voronoi sites in '+this.diagram.execTime+' ms &ndash; rendering <i>not</i> included)';*/
            },
            render: function () {
                    var arr = this.diagram.cells;
                    var edges = this.diagram.edges,
                        iEdge = edges.length,
                        edge;
                var cells = this.diagram.cells,
                    iCell = cells.length,
                    cell,
                    halfedges, nHalfedges, iHalfedge, v,
                    mustFill,
                    layer = this.canvas;
                layer.voronoi = {};
                var m = layer.Masks.addProperty("Mask");
                layer.voronoi.mask = m;
                //layer.active = false;
                layer.voronoi.duplicates = [];
                while (iCell--) {
                    var dupl = layer.duplicate();
                    dupl.name = dupl.name + ' [piece ' + (cells.length - iCell) + ']';
                    dupl.isVoronoiPiece = true;
                    layer.voronoi.duplicates.push(dupl);
                    var dm = dupl.Masks;
                    var mask = jQuery(dupl).prop('Masks.1')
                    var shape = new Shape();
                    var verts = [];
                    mask.property('Mask Feather').setValue([this.feather, this.feather]);
                    cell = cells[iCell];
                    halfedges = cell.halfedges;
                    nHalfedges = halfedges.length;
                    if (nHalfedges) {
                        if (true) {
                            v = halfedges[0].getStartpoint();
                            verts.push([v.x, v.y]);
                            for (iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
                                v = halfedges[iHalfedge].getEndpoint();
                                verts.push([v.x, v.y]);
                            }
                        }
                    }
                    shape.vertices = verts;
                    shape.closed = true;
                    mask.maskShape.setValue(shape);
                }
                this.canvas.enabled = false;
                layer.name = layer.name + ' [source]';
            }
        };
        var opts = $.extend({
            canvas: null,
            feather: 5,
            iterations: 100
        }, options);
        app.beginUndoGroup('jQuery.breakVoronoi [' + this.length + ' elements');
        var ret = this.each(function () {
            opts.canvas = this;
            VoronoiInit.init(opts);
        });
        app.endUndoGroup();
        return ret;
    };
    
    $.fn.repairVoronoi = function () {
        var ret;
        app.beginUndoGroup('jQuery.repairVoronoi [' + this.length + ' elements');
        ret = this.each(function () {
            if ($.def(this.voronoi.duplicates)) {
                for (var i = 0; i < this.voronoi.duplicates.length; i++) {
                    this.voronoi.duplicates[i].remove();
                    delete this.voronoi.duplicates[i];
                }
                delete this.voronoi.duplicates;
                this.enabled = true;
                this.selected = true;
                this.voronoi.mask.remove();
            }
        });
        app.endUndoGroup();
        return ret;
    };
    
    $.breakDeltas = {
		deltas: {
			spikes: function (i, cnt, ch) {
				return (cnt % 2 === 0 ? 150 : 0);
			}
		}
	};
}(jQuery));