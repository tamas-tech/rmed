(function() {
    var $ = jQuery,
        undefined, _, jQueryDataKey = '[[mathquill internal data]]',
        min = Math.min,
        max = Math.max;

    function MathElement() {}
    _ = MathElement.prototype;
    _.prev = 0;
    _.next = 0;
    _.parent = 0;
    _.firstChild = 0;
    _.lastChild = 0;
    _.eachChild = function(fn) {
        for (var child = this.firstChild; child; child = child.next)
            if (fn.call(this, child) === false) break;
        return this;
    };
    _.foldChildren = function(fold, fn) { this.eachChild(function(child) { fold = fn.call(this, fold, child); }); return fold; };
    _.keydown = function(e) { return this.parent.keydown(e); };
    _.textInput = function(ch) { return this.parent.textInput(ch); };

    function MathCommand() {}
    _ = MathCommand.prototype = new MathElement;
    _.init = function(cmd, html_template, text_template, replacedFragment) {
        var self = this;
        if (cmd) self.cmd = cmd;
        if (html_template) self.html_template = html_template;
        if (text_template) self.text_template = text_template;
        self.jQ = $(self.html_template[0]).data(jQueryDataKey, { cmd: self });
        self.initBlocks(replacedFragment);
    };
    _.initBlocks = function(replacedFragment) {
        var self = this;
        if (self.html_template.length === 1) {
            self.firstChild = self.lastChild = self.jQ.data(jQueryDataKey).block = (replacedFragment && replacedFragment.blockify()) || new MathBlock;
            self.firstChild.parent = self;
            self.firstChild.jQ = self.jQ.append(self.firstChild.jQ);
            return;
        }
        var newBlock, prev, num_blocks = self.html_template.length;
        this.firstChild = newBlock = prev = (replacedFragment && replacedFragment.blockify()) || new MathBlock;
        newBlock.parent = self;
        newBlock.jQ = $(self.html_template[1]).data(jQueryDataKey, { block: newBlock }).append(newBlock.jQ).appendTo(self.jQ);
        newBlock.blur();
        for (var i = 2; i < num_blocks; i += 1) {
            newBlock = new MathBlock;
            newBlock.parent = self;
            newBlock.prev = prev;
            prev.next = newBlock;
            prev = newBlock;
            newBlock.jQ = $(self.html_template[i]).data(jQueryDataKey, { block: newBlock }).appendTo(self.jQ);
            newBlock.blur();
        }
        self.lastChild = newBlock;
    };
    _.latex = function() { return this.foldChildren(this.cmd, function(latex, child) { return latex + '{' + (child.latex() || ' ') + '}'; }); };
    _.text_template = [''];
    _.text = function() {
        var i = 0;
        return this.foldChildren(this.text_template[i], function(text, child) {
            i += 1;
            var child_text = child.text();
            if (text && this.text_template[i] === '(' && child_text[0] === '(' && child_text.slice(-1) === ')')
                return text + child_text.slice(1, -1) + this.text_template[i];
            return text + child.text() + (this.text_template[i] || '');
        });
    };
    _.insertAt = function(cursor) {
        var cmd = this;
        cmd.parent = cursor.parent;
        cmd.next = cursor.next;
        cmd.prev = cursor.prev;
        if (cursor.prev)
            cursor.prev.next = cmd;
        else
            cursor.parent.firstChild = cmd;
        if (cursor.next)
            cursor.next.prev = cmd;
        else
            cursor.parent.lastChild = cmd;
        cursor.prev = cmd;
        cmd.jQ.insertBefore(cursor.jQ);
        cmd.respace();
        if (cmd.next)
            cmd.next.respace();
        if (cmd.prev)
            cmd.prev.respace();
        cmd.placeCursor(cursor);
        cursor.redraw();
    };
    _.respace = $.noop;
    _.placeCursor = function(cursor) { cursor.appendTo(this.foldChildren(this.firstChild, function(prev, child) { return prev.isEmpty() ? prev : child; })); };
    _.isEmpty = function() { return this.foldChildren(true, function(isEmpty, child) { return isEmpty && child.isEmpty(); }); };
    _.remove = function() {
        var self = this,
            prev = self.prev,
            next = self.next,
            parent = self.parent;
        if (prev)
            prev.next = next;
        else
            parent.firstChild = next;
        if (next)
            next.prev = prev;
        else
            parent.lastChild = prev;
        self.jQ.remove();
        return self;
    };

    function Symbol(cmd, html, text) { this.init(cmd, [html], [text || (cmd && cmd.length > 1 ? cmd.slice(1) : cmd)]); }
    _ = Symbol.prototype = new MathCommand;
    _.initBlocks = $.noop;
    _.latex = function() { return this.cmd; };
    _.text = function() { return this.text_template; };
    _.placeCursor = $.noop;
    _.isEmpty = function() { return true; };

    function MathBlock() {}
    _ = MathBlock.prototype = new MathElement;
    _.latex = function() { return this.foldChildren('', function(latex, child) { return latex + child.latex(); }); };
    _.text = function() { return this.firstChild === this.lastChild ? this.firstChild.text() : this.foldChildren('(', function(text, child) { return text + child.text(); }) + ')'; };
    _.isEmpty = function() { return this.firstChild === 0 && this.lastChild === 0; };
    _.focus = function() {
        this.jQ.addClass('hasCursor');
        if (this.isEmpty())
            this.jQ.removeClass('empty');
        return this;
    };
    _.blur = function() {
        this.jQ.removeClass('hasCursor');
        if (this.isEmpty())
            this.jQ.addClass('empty');
        return this;
    };

    function MathFragment(parent, prev, next) {
        if (!arguments.length) return;
        var self = this;
        self.parent = parent;
        self.prev = prev || 0;
        self.next = next || 0;
        self.jQinit(self.fold($(), function(jQ, child) { return child.jQ.add(jQ); }));
    }
    _ = MathFragment.prototype;
    _.remove = MathCommand.prototype.remove;
    _.jQinit = function(children) { this.jQ = children; };
    _.each = function(fn) {
        for (var el = this.prev.next || this.parent.firstChild; el !== this.next; el = el.next)
            if (fn.call(this, el) === false) break;
        return this;
    };
    _.fold = function(fold, fn) { this.each(function(el) { fold = fn.call(this, fold, el); }); return fold; };
    _.latex = function() { return this.fold('', function(latex, el) { return latex + el.latex(); }); };
    _.blockify = function() {
        var self = this,
            prev = self.prev,
            next = self.next,
            parent = self.parent,
            newBlock = new MathBlock,
            newFirstChild = newBlock.firstChild = prev.next || parent.firstChild,
            newLastChild = newBlock.lastChild = next.prev || parent.lastChild;
        if (prev)
            prev.next = next;
        else
            parent.firstChild = next;
        if (next)
            next.prev = prev;
        else
            parent.lastChild = prev;
        newFirstChild.prev = self.prev = 0;
        newLastChild.next = self.next = 0;
        self.parent = newBlock;
        self.each(function(el) { el.parent = newBlock; });
        newBlock.jQ = self.jQ;
        return newBlock;
    };

    function createRoot(jQ, root, textbox, editable) {
        var contents = jQ.contents().detach();
        if (!textbox) { jQ.addClass('mathquill-rendered-math'); }
        root.jQ = jQ.data(jQueryDataKey, { block: root, revert: function() { jQ.empty().unbind('.mathquill').removeClass('mathquill-rendered-math mathquill-editable mathquill-textbox').append(contents); } });
        var cursor = root.cursor = new Cursor(root);
        root.renderLatex(contents.text());
        var textareaSpan = root.textarea = $('<span class="textarea"><textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea></span>'),
            textarea = textareaSpan.children();
        var textareaSelectionTimeout;
        root.selectionChanged = function() {
            if (textareaSelectionTimeout === undefined) { textareaSelectionTimeout = setTimeout(setTextareaSelection); }
            forceIERedraw(jQ[0]);
        };

        function setTextareaSelection() {
            textareaSelectionTimeout = undefined;
            var latex = cursor.selection ? '$' + cursor.selection.latex() + '$' : '';
            textarea.val(latex);
            if (latex) { textarea[0].select(); }
        }
        jQ.bind('selectstart.mathquill', function(e) {
            if (e.target !== textarea[0]) e.preventDefault();
            e.stopPropagation();
        });
        var anticursor, blink = cursor.blink;
        jQ.bind('mousedown.mathquill', function(e) {
            function mousemove(e) {
                cursor.seek($(e.target), e.pageX, e.pageY);
                if (cursor.prev !== anticursor.prev || cursor.parent !== anticursor.parent) { cursor.selectFrom(anticursor); }
                return false;
            }

            function docmousemove(e) { delete e.target; return mousemove(e); }

            function mouseup(e) {
                anticursor = undefined;
                cursor.blink = blink;
                if (!cursor.selection) {
                    if (editable) { cursor.show(); } else { textareaSpan.detach(); }
                }
                jQ.unbind('mousemove', mousemove);
                $(document).unbind('mousemove', docmousemove).unbind('mouseup', mouseup);
            }
            setTimeout(function() { textarea.focus(); });
            cursor.blink = $.noop;
            cursor.seek($(e.target), e.pageX, e.pageY);
            anticursor = new MathFragment(cursor.parent, cursor.prev, cursor.next);
            if (!editable) jQ.prepend(textareaSpan);
            jQ.mousemove(mousemove);
            $(document).mousemove(docmousemove).mouseup(mouseup);
            jQuery(document.activeElement).parents('.mathquill-editable').focusout().blur();
            return false;
        });
        if (!editable) {
            jQ.bind('cut paste', false).bind('copy', setTextareaSelection).prepend('<span class="selectable">$' + root.latex() + '$</span>');
            textarea.blur(function() {
                cursor.clearSelection();
                setTimeout(detach);
            });

            function detach() { textareaSpan.detach(); }
            return;
        }
        jQ.prepend(textareaSpan);
        jQ.addClass('mathquill-editable');
        if (textbox)
            jQ.addClass('mathquill-textbox');
        textarea.focus(function(e) {
            if (!cursor.parent)
                cursor.appendTo(root);
            cursor.parent.jQ.addClass('hasCursor');
            if (cursor.selection) {
                cursor.selection.jQ.removeClass('blur');
                setTimeout(root.selectionChanged);
            } else
                cursor.show();
            e.stopPropagation();
        }).blur(function(e) {
            cursor.hide().parent.blur();
            if (cursor.selection)
                cursor.selection.jQ.addClass('blur');
            e.stopPropagation();
        });
        jQ.bind('focus.mathquill blur.mathquill', function(e) { textarea.trigger(e); }).blur();
        jQ.bind('cut', function(e) {
            setTextareaSelection();
            if (cursor.selection) {
                setTimeout(function() {
                    cursor.deleteSelection();
                    cursor.redraw();
                });
            }
            e.stopPropagation();
        }).bind('copy', function(e) {
            setTextareaSelection();
            e.stopPropagation();
        }).bind('paste', function(e) {
            pasting = true;
            setTimeout(paste);
            e.stopPropagation();
        });

        function paste() {
            var latex = textarea.val();
            latex = latex.replace('NOPE@', '');
            if (latex.slice(0, 1) === '$' && latex.slice(-1) === '$') { latex = latex.slice(1, -1); } else if (latex.slice(0, 2) === '$$' && latex.slice(-2) === '$$') { latex = latex.slice(2, -2); } else { latex = '\\text{' + latex + '}'; }
            cursor.writeLatex(latex).show();
            textarea.val('');
            pasting = false;
        }
        var lastKeydn, lastKeydnHappened, lastKeypressWhich, pasting = false;
        var event = "keypress";
        if (is_touch_device()) event = "keyup";
        jQ.bind('keydown.mathquill', function(e) {
            lastKeydn = e;
            lastKeydnHappened = true;
            if (cursor.parent.keydown(e) === false)
                e.preventDefault();
        }).bind(event + '.mathquill', function(e) {
            if (lastKeydnHappened)
                lastKeydnHappened = false;
            else {
                if (lastKeypressWhich !== e.which)
                    return;
                else
                    cursor.parent.keydown(lastKeydn);
            }
            lastKeypressWhich = e.which;
            if (textareaSelectionTimeout !== undefined)
                clearTimeout(textareaSelectionTimeout);
            setTimeout(textInput);
        });

        function textInput() {
            if (pasting || ('selectionStart' in textarea[0] && textarea[0].selectionStart !== textarea[0].selectionEnd)) return;
            var text = textarea.val();
            if (text) {
                text = text.replace('NOPE@', '');
                textarea.val('NOPE@');
                for (var i = 0; i < text.length; i += 1) { cursor.parent.textInput(text.charAt(i)); }
                textareaSelectionTimeout = undefined;
            } else {
                if (textareaSelectionTimeout !== undefined)
                    setTextareaSelection();
            }
        }
    }

    function RootMathBlock() {}
    _ = RootMathBlock.prototype = new MathBlock;
    _.latex = function() { return MathBlock.prototype.latex.call(this).replace(/(\\[a-z]+) (?![a-z])/ig, '$1'); };
    _.text = function() { return this.foldChildren('', function(text, child) { return text + child.text(); }); };
    _.renderLatex = function(latex) {
        var jQ = this.jQ;
        jQ.children().slice(1).remove();
        this.firstChild = this.lastChild = 0;
        var next = jQ[0].nextSibling,
            parent = jQ[0].parentNode;
        jQ.detach();
        this.cursor.appendTo(this).writeLatex(latex);
        next ? jQ.insertBefore(next) : jQ.appendTo(parent);
        this.jQ.mathquill('redraw');
        this.blur();
    };
    _.keydown = function(e) {
        e.ctrlKey = e.ctrlKey || e.metaKey;
        switch ((e.originalEvent && e.originalEvent.keyIdentifier) || e.which) {
            case 8:
            case 'Backspace':
            case 'U+0008':
                if (e.ctrlKey)
                    while (this.cursor.prev || this.cursor.selection)
                        this.cursor.backspace();
                else
                    this.cursor.backspace();
                break;
            case 27:
            case 'Esc':
            case 'U+001B':
            case 9:
            case 'Tab':
            case 'U+0009':
                if (e.ctrlKey) break;
                var parent = this.cursor.parent;
                if (e.shiftKey) {
                    if (parent === this.cursor.root)
                        return this.skipTextInput = true;
                    else if (parent.prev)
                        this.cursor.appendTo(parent.prev);
                    else
                        this.cursor.insertBefore(parent.parent);
                } else {
                    if (parent === this.cursor.root)
                        return this.skipTextInput = true;
                    else if (parent.next)
                        this.cursor.prependTo(parent.next);
                    else
                        this.cursor.insertAfter(parent.parent);
                }
                this.cursor.clearSelection();
                break;
            case 35:
            case 'End':
                if (e.shiftKey)
                    while (this.cursor.next || (e.ctrlKey && this.cursor.parent !== this))
                        this.cursor.selectRight();
                else
                    this.cursor.clearSelection().appendTo(e.ctrlKey ? this : this.cursor.parent);
                break;
            case 36:
            case 'Home':
                if (e.shiftKey)
                    while (this.cursor.prev || (e.ctrlKey && this.cursor.parent !== this))
                        this.cursor.selectLeft();
                else
                    this.cursor.clearSelection().prependTo(e.ctrlKey ? this : this.cursor.parent);
                break;
            case 37:
            case 'Left':
                if (e.ctrlKey) break;
                if (e.shiftKey)
                    this.cursor.selectLeft();
                else
                    this.cursor.moveLeft();
                break;
            case 38:
            case 'Up':
                if (e.ctrlKey) break;
                if (e.shiftKey) {
                    if (this.cursor.prev)
                        while (this.cursor.prev)
                            this.cursor.selectLeft();
                    else
                        this.cursor.selectLeft();
                } else if (this.cursor.parent.prev)
                    this.cursor.clearSelection().appendTo(this.cursor.parent.prev);
                else if (this.cursor.prev)
                    this.cursor.clearSelection().prependTo(this.cursor.parent);
                else if (this.cursor.parent !== this)
                    this.cursor.clearSelection().insertBefore(this.cursor.parent.parent);
                break;
            case 39:
            case 'Right':
                if (e.ctrlKey) break;
                if (e.shiftKey)
                    this.cursor.selectRight();
                else
                    this.cursor.moveRight();
                break;
            case 40:
            case 'Down':
                if (e.ctrlKey) break;
                if (e.shiftKey) {
                    if (this.cursor.next)
                        while (this.cursor.next)
                            this.cursor.selectRight();
                    else
                        this.cursor.selectRight();
                } else if (this.cursor.parent.next)
                    this.cursor.clearSelection().prependTo(this.cursor.parent.next);
                else if (this.cursor.next)
                    this.cursor.clearSelection().appendTo(this.cursor.parent);
                else if (this.cursor.parent !== this)
                    this.cursor.clearSelection().insertAfter(this.cursor.parent.parent);
                break;
            case 46:
            case 'Del':
            case 'U+007F':
                if (e.ctrlKey)
                    while (this.cursor.next || this.cursor.selection)
                        this.cursor.deleteForward();
                else
                    this.cursor.deleteForward();
                break;
            case 65:
            case 'A':
            case 'U+0041':
                if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                    if (this !== this.cursor.root)
                        return this.parent.keydown(e);
                    this.cursor.clearSelection().appendTo(this);
                    while (this.cursor.prev)
                        this.cursor.selectLeft();
                    break;
                }
            default:
                this.skipTextInput = false;
                return true;
        }
        this.skipTextInput = true;
        return false;
    };
    _.textInput = function(ch) {
        if (!this.skipTextInput)
            this.cursor.write(ch);
    };

    function RootMathCommand(cursor) {
        this.init('$');
        this.firstChild.cursor = cursor;
        this.firstChild.textInput = function(ch) {
            if (this.skipTextInput) return;
            if (ch !== '$' || cursor.parent !== this)
                cursor.write(ch);
            else if (this.isEmpty()) { cursor.insertAfter(this.parent).backspace().insertNew(new VanillaSymbol('\\$', '$')).show(); } else if (!cursor.next)
                cursor.insertAfter(this.parent);
            else if (!cursor.prev)
                cursor.insertBefore(this.parent);
            else
                cursor.write(ch);
        };
    }
    _ = RootMathCommand.prototype = new MathCommand;
    _.html_template = ['<span class="mathquill-rendered-math"></span>'];
    _.initBlocks = function() {
        this.firstChild = this.lastChild = this.jQ.data(jQueryDataKey).block = new RootMathBlock;
        this.firstChild.parent = this;
        this.firstChild.jQ = this.jQ;
    };
    _.latex = function() { return '$' + this.firstChild.latex() + '$'; };

    function RootTextBlock() {}
    _ = RootTextBlock.prototype = new MathBlock;
    _.renderLatex = function(latex) {
        var self = this,
            cursor = self.cursor;
        self.jQ.children().slice(1).remove();
        self.firstChild = self.lastChild = 0;
        cursor.show().appendTo(self);
        latex = latex.match(/(?:\\\$|[^$])+|\$(?:\\\$|[^$])*\$|\$(?:\\\$|[^$])*$/g) || '';
        for (var i = 0; i < latex.length; i += 1) {
            var chunk = latex[i];
            if (chunk[0] === '$') {
                if (chunk[-1 + chunk.length] === '$' && chunk[-2 + chunk.length] !== '\\')
                    chunk = chunk.slice(1, -1);
                else
                    chunk = chunk.slice(1);
                var root = new RootMathCommand(cursor);
                cursor.insertNew(root);
                root.firstChild.renderLatex(chunk);
                cursor.show().insertAfter(root);
            } else {
                for (var j = 0; j < chunk.length; j += 1)
                    this.cursor.insertNew(new VanillaSymbol(chunk[j]));
            }
        }
    };
    _.keydown = RootMathBlock.prototype.keydown;
    _.textInput = function(ch) {
        if (this.skipTextInput) return;
        this.cursor.deleteSelection();
        if (ch === '$')
            this.cursor.insertNew(new RootMathCommand(this.cursor));
        else
            this.cursor.insertNew(new VanillaSymbol(ch));
    };
    var CharCmds = {},
        LatexCmds = {};
    var scale, forceIERedraw = $.noop,
        div = document.createElement('div'),
        div_style = div.style,
        transformPropNames = { transform: 1, WebkitTransform: 1, MozTransform: 1, OTransform: 1, msTransform: 1 },
        transformPropName;
    for (var prop in transformPropNames) { if (prop in div_style) { transformPropName = prop; break; } }
    if (transformPropName) { scale = function(jQ, x, y) { jQ.css(transformPropName, 'scale(' + x + ',' + y + ')'); }; } else if ('filter' in div_style) {
        forceIERedraw = function(el) { el.className = el.className; };
        scale = function(jQ, x, y) {
            x /= (1 + (y - 1) / 2);
            jQ.addClass('matrixed').css({
                fontSize: y + 'em',
                marginTop: '-.1em',
                filter: 'progid:DXImageTransform.Microsoft' +
                    '.Matrix(M11=' + x + ",SizingMethod='auto expand')"
            });

            function calculateMarginRight() { jQ.css('marginRight', (1 + jQ.width()) * (x - 1) / x + 'px'); }
            calculateMarginRight();
            var intervalId = setInterval(calculateMarginRight);
            $(window).load(function() {
                clearTimeout(intervalId);
                calculateMarginRight();
            });
        };
    } else { scale = function(jQ, x, y) { jQ.css('fontSize', y + 'em'); }; }

    function proto(parent, child) { child.prototype = parent.prototype; return child; }

    function bind(cons) { var args = Array.prototype.slice.call(arguments, 1); return proto(cons, function() { cons.apply(this, Array.prototype.concat.apply(args, arguments)); }); }

    function Style(cmd, html_template, replacedFragment) { this.init(cmd, [html_template], undefined, replacedFragment); }
    proto(MathCommand, Style);
    LatexCmds.mathrm = bind(Style, '\\mathrm', '<span class="roman font"></span>');
    LatexCmds.mathit = bind(Style, '\\mathit', '<i class="font"></i>');
    LatexCmds.mathbf = bind(Style, '\\mathbf', '<b class="font"></b>');
    LatexCmds.mathsf = bind(Style, '\\mathsf', '<span class="sans-serif font"></span>');
    LatexCmds.mathtt = bind(Style, '\\mathtt', '<span class="monospace font"></span>');
    LatexCmds.unit = bind(Style, '\\unit', '<span style="margin-left: 0.2em;" class="roman font unit"></span>');
    LatexCmds.solution = bind(Style, '\\solution', '<span class="solution"></span>');
    LatexCmds.extramot = bind(Style, '\\extramot', '<span class="extramotivation"></span>');
    LatexCmds.underline = bind(Style, '\\underline', '<span class="underline"></span>');
    LatexCmds.overline = LatexCmds.bar = bind(Style, '\\overline', '<span class="overline"></span>');
    LatexCmds.red = bind(Style, '\\red', '<span class="color_red"></span>');
    LatexCmds.blue = bind(Style, '\\blue', '<span class="color_blue"></span>');
    LatexCmds.green = bind(Style, '\\green', '<span class="color_green"></span>');
    LatexCmds.violet = bind(Style, '\\violet', '<span class="color_violet"></span>');
    LatexCmds.orange = bind(Style, '\\orange', '<span class="color_orange"></span>');
    LatexCmds.yellow = bind(Style, '\\yellow', '<span class="color_yellow"></span>');

    function SupSub(cmd, html, text, replacedFragment) { this.init(cmd, [html], [text], replacedFragment); }
    _ = SupSub.prototype = new MathCommand;
    _.latex = function() {
        var latex = this.firstChild.latex();
        if (latex.length === 1)
            return this.cmd + latex;
        else
            return this.cmd + '{' + (latex || ' ') + '}';
    };
    _.redraw = function() {
        if (this.prev)
            this.prev.respace();
        if (!(this.prev instanceof SupSub)) {
            this.respace();
            if (this.next && !(this.next instanceof SupSub))
                this.next.respace();
        }
    };
    _.respace = function() {
        if (this.prev.cmd === '\\int ' || (this.prev instanceof SupSub && this.prev.cmd != this.cmd && this.prev.prev && this.prev.prev.cmd === '\\int ')) {
            if (!this.limit) {
                this.limit = true;
                this.jQ.addClass('limit');
            }
        } else {
            if (this.limit) {
                this.limit = false;
                this.jQ.removeClass('limit');
            }
        }
        this.respaced = this.prev instanceof SupSub && this.prev.cmd != this.cmd && !this.prev.respaced;
        if (this.respaced) {
            var fontSize = +this.jQ.css('fontSize').slice(0, -2),
                prevWidth = this.prev.jQ.outerWidth()
            thisWidth = this.jQ.outerWidth();
            this.jQ.css({ left: (this.limit && this.cmd === '_' ? -.25 : 0) - prevWidth / fontSize + 'em', marginRight: .1 - min(thisWidth, prevWidth) / fontSize + 'em' });
        } else if (this.limit && this.cmd === '_') { this.jQ.css({ left: '-.25em', marginRight: '' }); } else { this.jQ.css({ left: '', marginRight: '' }); }
        if (this.next instanceof SupSub)
            this.next.respace();
        return this;
    };
    LatexCmds.subscript = LatexCmds._ = proto(SupSub, function(replacedFragment) { SupSub.call(this, '_', '<sub></sub>', '_', replacedFragment); });
    LatexCmds.superscript = LatexCmds.supscript = LatexCmds['^'] = proto(SupSub, function(replacedFragment) { SupSub.call(this, '^', '<sup></sup>', '**', replacedFragment); });

    function Fraction(replacedFragment) {
        this.init('\\frac', undefined, undefined, replacedFragment);
        this.jQ.append('<span style="display:inline-block;width:0">&nbsp;</span>');
    }
    _ = Fraction.prototype = new MathCommand;
    _.html_template = ['<span class="fraction"></span>', '<span class="numerator"></span>', '<span class="denominator"></span>'];
    _.text_template = ['(', '/', ')'];
    LatexCmds.frac = LatexCmds.dfrac = LatexCmds.cfrac = LatexCmds.fraction = Fraction;

    function LiveFraction() { Fraction.apply(this, arguments); }
    _ = LiveFraction.prototype = new Fraction;
    _.placeCursor = function(cursor) {
        if (this.firstChild.isEmpty()) {
            var prev = this.prev;
            while (prev && !(prev instanceof BinaryOperator || prev instanceof TextBlock || prev instanceof BigSymbol))
                prev = prev.prev;
            if (prev instanceof BigSymbol && prev.next instanceof SupSub) {
                prev = prev.next;
                if (prev.next instanceof SupSub && prev.next.cmd != prev.cmd)
                    prev = prev.next;
            }
            if (prev !== this.prev) {
                var newBlock = new MathFragment(this.parent, prev, this).blockify();
                newBlock.jQ = this.firstChild.jQ.empty().removeClass('empty').append(newBlock.jQ).data(jQueryDataKey, { block: newBlock });
                newBlock.next = this.lastChild;
                newBlock.parent = this;
                this.firstChild = this.lastChild.prev = newBlock;
            }
        }
        cursor.appendTo(this.lastChild);
    };
    LatexCmds.over = CharCmds['/'] = LiveFraction;

    function SquareRoot(replacedFragment) { this.init('\\sqrt', undefined, undefined, replacedFragment); }
    _ = SquareRoot.prototype = new MathCommand;
    _.html_template = ['<span class="block"><span class="sqrt-prefix">&radic;</span></span>', '<span class="sqrt-stem"></span>'];
    _.text_template = ['sqrt(', ')'];
    _.redraw = function() {
        var block = this.lastChild.jQ;
        scale(block.prev(), 1, block.innerHeight() / +block.css('fontSize').slice(0, -2) - .1);
    };
    _.optional_arg_command = 'nthroot';
    LatexCmds.sqrt = LatexCmds['√'] = SquareRoot;

    function NthRoot(replacedFragment) {
        SquareRoot.call(this, replacedFragment);
        this.jQ = this.firstChild.jQ.detach().add(this.jQ);
    }
    _ = NthRoot.prototype = new SquareRoot;
    _.html_template = ['<span class="block"><span class="sqrt-prefix">&radic;</span></span>', '<sup class="nthroot"></sup>', '<span class="sqrt-stem"></span>'];
    _.text_template = ['sqrt[', '](', ')'];
    _.latex = function() { return '\\sqrt[' + this.firstChild.latex() + ']{' + this.lastChild.latex() + '}'; };
    LatexCmds.nthroot = NthRoot;

    function Bracket(open, close, cmd, end, replacedFragment) {
        this.init('\\left' + cmd, ['<span class="block"><span class="paren">' + open + '</span><span class="block"></span><span class="paren">' + close + '</span></span>'], [open, close], replacedFragment);
        this.end = '\\right' + end;
    }
    _ = Bracket.prototype = new MathCommand;
    _.initBlocks = function(replacedFragment) {
        this.firstChild = this.lastChild = (replacedFragment && replacedFragment.blockify()) || new MathBlock;
        this.firstChild.parent = this;
        this.firstChild.jQ = this.jQ.children(':eq(1)').data(jQueryDataKey, { block: this.firstChild }).append(this.firstChild.jQ);
        var block = this.blockjQ = this.firstChild.jQ;
        this.bracketjQs = block.prev().add(block.next());
    };
    _.latex = function() { return this.cmd + this.firstChild.latex() + this.end; };
    _.redraw = function() {
        var height = this.blockjQ.outerHeight() / +this.blockjQ.css('fontSize').slice(0, -2);
        scale(this.bracketjQs, min(1 + .2 * (height - 1), 1.2), 1.05 * height);
    };
    LatexCmds.lbrace = CharCmds['{'] = proto(Bracket, function(replacedFragment) { Bracket.call(this, '{', '}', '\\{', '\\}', replacedFragment); });
    LatexCmds.langle = LatexCmds.lang = proto(Bracket, function(replacedFragment) { Bracket.call(this, '&lang;', '&rang;', '\\langle ', '\\rangle ', replacedFragment); });

    function CloseBracket(open, close, cmd, end, replacedFragment) { Bracket.apply(this, arguments); }
    _ = CloseBracket.prototype = new Bracket;
    _.placeCursor = function(cursor) {
        if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
            cursor.backspace().insertAfter(this.parent.parent);
        else {
            this.firstChild.blur();
            this.redraw();
        }
    };
    LatexCmds.rbrace = CharCmds['}'] = proto(CloseBracket, function(replacedFragment) { CloseBracket.call(this, '{', '}', '\\{', '\\}', replacedFragment); });
    LatexCmds.rangle = LatexCmds.rang = proto(CloseBracket, function(replacedFragment) { CloseBracket.call(this, '&lang;', '&rang;', '\\langle ', '\\rangle ', replacedFragment); });

    function Paren(open, close, replacedFragment) { Bracket.call(this, open, close, open, close, replacedFragment); }
    Paren.prototype = Bracket.prototype;
    LatexCmds.lparen = CharCmds['('] = proto(Paren, function(replacedFragment) { Paren.call(this, '(', ')', replacedFragment); });
    LatexCmds.lbrack = LatexCmds.lbracket = CharCmds['['] = proto(Paren, function(replacedFragment) { Paren.call(this, '[', ']', replacedFragment); });

    function CloseParen(open, close, replacedFragment) { CloseBracket.call(this, open, close, open, close, replacedFragment); }
    CloseParen.prototype = CloseBracket.prototype;
    LatexCmds.rparen = CharCmds[')'] = proto(CloseParen, function(replacedFragment) { CloseParen.call(this, '(', ')', replacedFragment); });
    LatexCmds.rbrack = LatexCmds.rbracket = CharCmds[']'] = proto(CloseParen, function(replacedFragment) { CloseParen.call(this, '[', ']', replacedFragment); });

    function Pipes(replacedFragment) { Paren.call(this, '|', '|', replacedFragment); }
    _ = Pipes.prototype = new Paren;
    _.placeCursor = function(cursor) {
        if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
            cursor.backspace().insertAfter(this.parent.parent);
        else
            cursor.appendTo(this.firstChild);
    };
    LatexCmds.lpipe = LatexCmds.rpipe = CharCmds['|'] = Pipes;

    function TextBlock(replacedText) {
        if (replacedText instanceof MathFragment)
            this.replacedText = replacedText.remove().jQ.text();
        else if (typeof replacedText === 'string')
            this.replacedText = replacedText;
        this.init();
    }
    _ = TextBlock.prototype = new MathCommand;
    _.cmd = '\\text';
    _.html_template = ['<span class="text"></span>'];
    _.text_template = ['"', '"'];
    _.initBlocks = function() {
        this.firstChild = this.lastChild = this.jQ.data(jQueryDataKey).block = new InnerTextBlock;
        this.firstChild.parent = this;
        this.firstChild.jQ = this.jQ.append(this.firstChild.jQ);
    };
    _.placeCursor = function(cursor) {
        (this.cursor = cursor).appendTo(this.firstChild);
        if (this.replacedText)
            for (var i = 0; i < this.replacedText.length; i += 1)
                this.write(this.replacedText.charAt(i));
    };
    _.write = function(ch) { this.cursor.insertNew(new VanillaSymbol(ch)); };
    _.keydown = function(e) {
        if (!this.cursor.selection && ((e.which === 8 && !this.cursor.prev) || (e.which === 46 && !this.cursor.next))) {
            if (this.isEmpty())
                this.cursor.insertAfter(this);
            return false;
        }
        return this.parent.keydown(e);
    };
    _.textInput = function(ch) {
        this.cursor.deleteSelection();
        if (ch !== '$')
            this.write(ch);
        else if (this.isEmpty())
            this.cursor.insertAfter(this).backspace().insertNew(new VanillaSymbol('\\$', '$'));
        else if (!this.cursor.next)
            this.cursor.insertAfter(this);
        else if (!this.cursor.prev)
            this.cursor.insertBefore(this);
        else {
            var next = new TextBlock(new MathFragment(this.firstChild, this.cursor.prev));
            next.placeCursor = function(cursor) {
                this.prev = 0;
                delete this.placeCursor;
                this.placeCursor(cursor);
            };
            next.firstChild.focus = function() { return this; };
            this.cursor.insertAfter(this).insertNew(next);
            next.prev = this;
            this.cursor.insertBefore(next);
            delete next.firstChild.focus;
        }
    };

    function InnerTextBlock() {}
    _ = InnerTextBlock.prototype = new MathBlock;
    _.blur = function() {
        this.jQ.removeClass('hasCursor');
        if (this.isEmpty()) {
            var textblock = this.parent,
                cursor = textblock.cursor;
            if (cursor.parent === this)
                this.jQ.addClass('empty');
            else {
                cursor.hide();
                textblock.remove();
                if (cursor.next === textblock)
                    cursor.next = textblock.next;
                else if (cursor.prev === textblock)
                    cursor.prev = textblock.prev;
                cursor.show().redraw();
            }
        }
        return this;
    };
    _.focus = function() {
        MathBlock.prototype.focus.call(this);
        var textblock = this.parent;
        if (textblock.next.cmd === textblock.cmd) {
            var innerblock = this,
                cursor = textblock.cursor,
                next = textblock.next.firstChild;
            next.eachChild(function(child) {
                child.parent = innerblock;
                child.jQ.appendTo(innerblock.jQ);
            });
            if (this.lastChild)
                this.lastChild.next = next.firstChild;
            else
                this.firstChild = next.firstChild;
            next.firstChild.prev = this.lastChild;
            this.lastChild = next.lastChild;
            next.parent.remove();
            if (cursor.prev)
                cursor.insertAfter(cursor.prev);
            else
                cursor.prependTo(this);
            cursor.redraw();
        } else if (textblock.prev.cmd === textblock.cmd) {
            var cursor = textblock.cursor;
            if (cursor.prev)
                textblock.prev.firstChild.focus();
            else
                cursor.appendTo(textblock.prev.firstChild);
        }
        return this;
    };
    CharCmds.$ = LatexCmds.text = LatexCmds.textnormal = LatexCmds.textrm = LatexCmds.textup = LatexCmds.textmd = TextBlock;

    function makeTextBlock(latex, html) {
        function SomeTextBlock() { TextBlock.apply(this, arguments); }
        _ = SomeTextBlock.prototype = new TextBlock;
        _.cmd = latex;
        _.html_template = [html];
        return SomeTextBlock;
    }
    LatexCmds.em = LatexCmds.italic = LatexCmds.italics = LatexCmds.emph = LatexCmds.textit = LatexCmds.textsl = makeTextBlock('\\textit', '<i class="text"></i>');
    LatexCmds.strong = LatexCmds.bold = LatexCmds.textbf = makeTextBlock('\\textbf', '<b class="text"></b>');
    LatexCmds.sf = LatexCmds.textsf = makeTextBlock('\\textsf', '<span class="sans-serif text"></span>');
    LatexCmds.tt = LatexCmds.texttt = makeTextBlock('\\texttt', '<span class="monospace text"></span>');
    LatexCmds.textsc = makeTextBlock('\\textsc', '<span style="font-variant:small-caps" class="text"></span>');
    LatexCmds.uppercase = makeTextBlock('\\uppercase', '<span style="text-transform:uppercase" class="text"></span>');
    LatexCmds.lowercase = makeTextBlock('\\lowercase', '<span style="text-transform:lowercase" class="text"></span>');

    function LatexCommandInput(replacedFragment) {
        this.init('\\');
        if (replacedFragment) {
            this.replacedFragment = replacedFragment.detach();
            this.isEmpty = function() { return false; };
        }
    }
    _ = LatexCommandInput.prototype = new MathCommand;
    _.html_template = ['<span class="latex-command-input">\\</span>'];
    _.text_template = ['\\'];
    _.placeCursor = function(cursor) {
        this.cursor = cursor.appendTo(this.firstChild);
        if (this.replacedFragment)
            this.jQ = this.jQ.add(this.replacedFragment.jQ.addClass('blur').bind('mousedown mousemove', function(e) { $(e.target = this.nextSibling).trigger(e); return false; }).insertBefore(this.jQ));
    };
    _.latex = function() { return '\\' + this.firstChild.latex() + ' '; };
    _.keydown = function(e) {
        if (e.which === 9 || e.which === 13) { this.renderCommand(); return false; }
        return this.parent.keydown(e);
    };
    _.textInput = function(ch) {
        if (ch.match(/[a-z:;,%&]/i)) {
            this.cursor.deleteSelection();
            this.cursor.insertNew(new VanillaSymbol(ch));
            return;
        }
        this.renderCommand();
        if (ch === ' ' || (ch === '\\' && this.firstChild.isEmpty()))
            return;
        this.cursor.parent.textInput(ch);
    };
    _.renderCommand = function() {
        this.jQ = this.jQ.last();
        this.remove();
        if (this.next)
            this.cursor.insertBefore(this.next);
        else
            this.cursor.appendTo(this.parent);
        var latex = this.firstChild.latex();
        if (latex)
            this.cursor.insertCmd(latex, this.replacedFragment);
        else {
            var cmd = new VanillaSymbol('\\backslash ', '\\');
            this.cursor.insertNew(cmd);
            if (this.replacedFragment)
                this.replacedFragment.remove();
        }
    };
    CharCmds['\\'] = LatexCommandInput;

    function Binomial(replacedFragment) {
        this.init('\\binom', undefined, undefined, replacedFragment);
        this.jQ.wrapInner('<span class="array"></span>');
        this.blockjQ = this.jQ.children();
        this.bracketjQs = $('<span class="paren">(</span>').prependTo(this.jQ).add($('<span class="paren">)</span>').appendTo(this.jQ));
    }
    _ = Binomial.prototype = new MathCommand;
    _.html_template = ['<span class="block"></span>', '<span></span>', '<span></span>'];
    _.text_template = ['choose(', ',', ')'];
    _.redraw = Bracket.prototype.redraw;
    LatexCmds.binom = LatexCmds.binomial = Binomial;

    function Choose() { Binomial.apply(this, arguments); }
    _ = Choose.prototype = new Binomial;
    _.placeCursor = LiveFraction.prototype.placeCursor;
    LatexCmds.choose = Choose;

    function Cases(replacedFragment) {
        this.init('\\cases', undefined, undefined, replacedFragment);
        this.jQ.wrapInner('<span class="array"></span>');
        this.blockjQ = this.jQ.children();
        this.bracketjQs = $('<span class="paren">{</span>').prependTo(this.jQ).add($('<span class="paren"></span>').appendTo(this.jQ));
    }
    _ = Cases.prototype = new MathCommand;
    _.html_template = ['<span class="block cases"></span>', '<span></span>', '<span></span>'];
    _.text_template = ['case(', ',', ')'];
    _.redraw = Bracket.prototype.redraw;
    LatexCmds.cases = LatexCmds.cases = Cases;

    function Vector(replacedFragment) { this.init('\\vector', undefined, undefined, replacedFragment); }
    _ = Vector.prototype = new MathCommand;
    _.html_template = ['<span class="array vector"><span class="vectorborder">&nbsp;</span><span class="vectortop">&nbsp;</span></span>', '<span></span>'];
    _.latex = function() { return '\\vector{' + this.foldChildren([], function(latex, child) { latex.push(child.latex()); return latex; }).join('\\\\') + '}'; };
    _.text = function() { return '[' + this.foldChildren([], function(text, child) { text.push(child.text()); return text; }).join() + ']'; }
    _.placeCursor = function(cursor) { this.cursor = cursor.appendTo(this.firstChild); };
    _.keydown = function(e) {
        var currentBlock = this.cursor.parent;
        if (currentBlock.parent === this) {
            if (e.which === 13) { return false; } else if (e.which === 9 && !e.shiftKey && !currentBlock.next) {
                if (currentBlock.isEmpty()) {
                    if (currentBlock.prev) {
                        this.cursor.insertAfter(this);
                        delete currentBlock.prev.next;
                        this.lastChild = currentBlock.prev;
                        currentBlock.jQ.remove();
                        this.cursor.redraw();
                        return false;
                    } else
                        return this.parent.keydown(e);
                }
                var newBlock = new MathBlock;
                newBlock.parent = this;
                newBlock.jQ = $('<span></span>').data(jQueryDataKey, { block: newBlock }).appendTo(this.jQ);
                this.lastChild = newBlock;
                currentBlock.next = newBlock;
                newBlock.prev = currentBlock;
                this.cursor.appendTo(newBlock).redraw();
                return false;
            } else if (e.which === 8) {
                if (currentBlock.isEmpty()) {
                    if (currentBlock.prev) {
                        this.cursor.appendTo(currentBlock.prev)
                        currentBlock.prev.next = currentBlock.next;
                    } else {
                        this.cursor.insertBefore(this);
                        this.firstChild = currentBlock.next;
                    }
                    if (currentBlock.next)
                        currentBlock.next.prev = currentBlock.prev;
                    else
                        this.lastChild = currentBlock.prev;
                    currentBlock.jQ.remove();
                    if (this.isEmpty())
                        this.cursor.deleteForward();
                    else
                        this.cursor.redraw();
                    return false;
                } else if (!this.cursor.prev)
                    return false;
            }
        }
        return this.parent.keydown(e);
    };
    LatexCmds.vector = Vector;


    LatexCmds.editable = proto(RootMathCommand, function() {
        this.init('\\editable');
        createRoot(this.jQ, this.firstChild, false, true);
        var cursor;
        this.placeCursor = function(c) { cursor = c.appendTo(this.firstChild); };
        this.firstChild.blur = function() {
            if (cursor.prev !== this.parent) return;
            delete this.blur;
            this.cursor.appendTo(this);
            MathBlock.prototype.blur.call(this);
        };
        this.latex = function() { return this.firstChild.latex(); };
        this.text = function() { return this.firstChild.text(); };
    });
    LatexCmds.f = bind(Symbol, '\\f', '<var class="florin">&fnof;</var><span style="display:inline-block;width:0">&nbsp;</span>');

    function Variable(ch, html) { Symbol.call(this, ch, '<var>' + (html || ch) + '</var>'); }
    _ = Variable.prototype = new Symbol;
    _.text = function() {
        var text = this.cmd;
        if (this.prev && !(this.prev instanceof Variable) && !(this.prev instanceof BinaryOperator))
            text = '*' + text;
        if (this.next && !(this.next instanceof BinaryOperator) && !(this.next.cmd === '^'))
            text += '*';
        return text;
    };

    function VanillaSymbol(ch, html) {
        if (html == ' ') { Symbol.call(this, ch, '<var>' + (html || ch) + '</var>'); } else {
            if (html) html = str_replace(' ', '', html);
            Symbol.call(this, ch, '<span>' + (html || ch) + '</span>');
        }
    }
    VanillaSymbol.prototype = Symbol.prototype;
    LatexCmds.enter = bind(VanillaSymbol, '\\enter', '\n');
    CharCmds['\n'] = bind(VanillaSymbol, '\\enter', '\n');
    CharCmds[' '] = bind(VanillaSymbol, '\\:', ' ');
    LatexCmds.prime = CharCmds["'"] = bind(VanillaSymbol, "'", '&prime;');

    function NonSymbolaSymbol(ch, html) { Symbol.call(this, ch, '<span class="nonSymbola">' + (html || ch) + '</span>'); }
    NonSymbolaSymbol.prototype = Symbol.prototype;
    /* sajat az1507-dik sorban jobb megoldas
        LatexCmds['á'] = bind(Variable, '\u00E1', '&#xe1');
        LatexCmds['é'] = bind(Variable, '\u00E9', '&#xe9');
        LatexCmds['í'] = bind(Variable, '\u00ED', '&#xed');
        LatexCmds['ó'] = bind(Variable, '\u00F3', '&#xf3');
        LatexCmds['ö'] = bind(Variable, '\u00F6', '&#xf6');
        LatexCmds['ő'] = bind(Variable, '\u0151', '&#x151');
        LatexCmds['ú'] = bind(Variable, '\u00FA', '&#xfa');
        LatexCmds['ü'] = bind(Variable, '\u00FC', '&#xfc');
        LatexCmds['ű'] = bind(Variable, '\u0171', '&#x171');
        LatexCmds['Á'] = bind(Variable, '\u00C1', '&#xc1');
        LatexCmds['É'] = bind(Variable, '\u00C9', '&#xc9');
        LatexCmds['Í'] = bind(Variable, '\u00CD', '&#xcd');
        LatexCmds['Ó'] = bind(Variable, '\u00D3', '&#xd3');
        LatexCmds['Ö'] = bind(Variable, '\u00D6', '&#xd6');
        LatexCmds['Ő'] = bind(Variable, '\u0150', '&#x150');
        LatexCmds['Ú'] = bind(Variable, '\u00DA', '&#xda');
        LatexCmds['Ü'] = bind(Variable, '\u00DC', '&#xdc');
        LatexCmds['Ű'] = bind(Variable, '\u0170', '&#x170');
    sajat vege */
    LatexCmds['@'] = NonSymbolaSymbol;
    LatexCmds['&'] = bind(NonSymbolaSymbol, '\\&', '&');
    LatexCmds['%'] = bind(NonSymbolaSymbol, '\\%', '%');
    LatexCmds.alpha = LatexCmds.beta = LatexCmds.gamma = LatexCmds.delta = LatexCmds.zeta = LatexCmds.eta = LatexCmds.theta = LatexCmds.iota = LatexCmds.kappa = LatexCmds.mu = LatexCmds.nu = LatexCmds.xi = LatexCmds.rho = LatexCmds.sigma = LatexCmds.tau = LatexCmds.chi = LatexCmds.psi = LatexCmds.omega = proto(Symbol, function(replacedFragment, latex) { Variable.call(this, '\\' + latex + ' ', '&' + latex + ';'); });
    LatexCmds.phi = bind(Variable, '\\phi ', '&#981;');
    LatexCmds.phiv = LatexCmds.varphi = bind(Variable, '\\varphi ', '&phi;');
    LatexCmds.epsilon = bind(Variable, '\\epsilon ', '&#1013;');
    LatexCmds.epsiv = LatexCmds.varepsilon = bind(Variable, '\\varepsilon ', '&epsilon;');
    LatexCmds.piv = LatexCmds.varpi = bind(Variable, '\\varpi ', '&piv;');
    LatexCmds.sigmaf = LatexCmds.sigmav = LatexCmds.varsigma = bind(Variable, '\\varsigma ', '&sigmaf;');
    LatexCmds.thetav = LatexCmds.vartheta = LatexCmds.thetasym = bind(Variable, '\\vartheta ', '&thetasym;');
    LatexCmds.upsilon = LatexCmds.upsi = bind(Variable, '\\upsilon ', '&upsilon;');
    LatexCmds.gammad = LatexCmds.Gammad = LatexCmds.digamma = bind(Variable, '\\digamma ', '&#989;');
    LatexCmds.kappav = LatexCmds.varkappa = bind(Variable, '\\varkappa ', '&#1008;');
    LatexCmds.rhov = LatexCmds.varrho = bind(Variable, '\\varrho ', '&#1009;');
    LatexCmds.pi = LatexCmds['π'] = bind(NonSymbolaSymbol, '\\pi ', '&pi;');
    LatexCmds.lambda = bind(NonSymbolaSymbol, '\\lambda ', '&lambda;');
    LatexCmds.Upsilon = LatexCmds.Upsi = LatexCmds.upsih = LatexCmds.Upsih = bind(Symbol, '\\Upsilon ', '<var style="font-family: serif">&upsih;</var>');
    LatexCmds.Gamma = LatexCmds.Delta = LatexCmds.Theta = LatexCmds.Lambda = LatexCmds.Xi = LatexCmds.Pi = LatexCmds.Sigma = LatexCmds.Phi = LatexCmds.Psi = LatexCmds.Omega = LatexCmds.forall = proto(Symbol, function(replacedFragment, latex) { VanillaSymbol.call(this, '\\' + latex + ' ', '&' + latex + ';'); });

    function BinaryOperator(cmd, html, text) { Symbol.call(this, cmd, '<span class="binary-operator">' + html + '</span>', text); }
    BinaryOperator.prototype = new Symbol;

    function PlusMinus(cmd, html) { VanillaSymbol.apply(this, arguments); }
    _ = PlusMinus.prototype = new BinaryOperator;
    _.respace = function() {
        if (!this.prev) { this.jQ[0].className = ''; } else if (this.prev instanceof BinaryOperator && this.next && !(this.next instanceof BinaryOperator)) { this.jQ[0].className = 'unary-operator'; } else { this.jQ[0].className = 'binary-operator'; }
        return this;
    };
    LatexCmds['+'] = bind(PlusMinus, '+', '+');
    LatexCmds['–'] = LatexCmds['-'] = bind(PlusMinus, '-', '&minus;');
    LatexCmds['±'] = LatexCmds.pm = LatexCmds.plusmn = LatexCmds.plusminus = bind(PlusMinus, '\\pm ', '&plusmn;');
    LatexCmds.mp = LatexCmds.mnplus = LatexCmds.minusplus = bind(PlusMinus, '\\mp ', '&#8723;');
    CharCmds['*'] = LatexCmds.sdot = LatexCmds.cdot = bind(BinaryOperator, '\\cdot ', '&middot;');
    LatexCmds['='] = bind(BinaryOperator, '=', '=');
    LatexCmds['lt'] = bind(BinaryOperator, '\\lt ', '&lt;');
    LatexCmds['gt'] = bind(BinaryOperator, '\\gt ', '&gt;');
    LatexCmds.notin = LatexCmds.sim = LatexCmds.cong = LatexCmds.equiv = LatexCmds.oplus = LatexCmds.otimes = proto(BinaryOperator, function(replacedFragment, latex) { BinaryOperator.call(this, '\\' + latex + ' ', '&' + latex + ';'); });
    LatexCmds.times = proto(BinaryOperator, function(replacedFragment, latex) { BinaryOperator.call(this, '\\times ', '&times;', '[x]') });
    LatexCmds['÷'] = LatexCmds.div = LatexCmds.divide = LatexCmds.divides = bind(BinaryOperator, '\\div ', '&divide;', '[/]');
    LatexCmds['≠'] = LatexCmds.ne = LatexCmds.neq = bind(BinaryOperator, '\\ne ', '&ne;');
    LatexCmds.ast = LatexCmds.star = LatexCmds.loast = LatexCmds.lowast = bind(BinaryOperator, '\\ast ', '&lowast;');
    LatexCmds.therefor = LatexCmds.therefore = bind(BinaryOperator, '\\therefore ', '&there4;');
    LatexCmds.cuz = LatexCmds.because = bind(BinaryOperator, '\\because ', '&#8757;');
    LatexCmds.prop = LatexCmds.propto = bind(BinaryOperator, '\\propto ', '&prop;');
    LatexCmds['≈'] = LatexCmds.asymp = LatexCmds.approx = bind(BinaryOperator, '\\approx ', '&asymp;');
    LatexCmds['<'] = bind(BinaryOperator, '\\lt ', '&lt;');
    LatexCmds['>'] = bind(BinaryOperator, '\\gt ', '&gt;');
    LatexCmds['≤'] = LatexCmds.le = LatexCmds.leq = bind(BinaryOperator, '\\le ', '&le;');
    LatexCmds['≥'] = LatexCmds.ge = LatexCmds.geq = bind(BinaryOperator, '\\ge ', '&ge;');
    LatexCmds.isin = LatexCmds['in'] = bind(BinaryOperator, '\\in ', '&isin;');
    LatexCmds.ni = LatexCmds.contains = bind(BinaryOperator, '\\ni ', '&ni;');
    LatexCmds.notni = LatexCmds.niton = LatexCmds.notcontains = LatexCmds.doesnotcontain = bind(BinaryOperator, '\\not\\ni ', '&#8716;');
    LatexCmds.sub = LatexCmds.subset = bind(BinaryOperator, '\\subset ', '&sub;');
    LatexCmds.sup = LatexCmds.supset = LatexCmds.superset = bind(BinaryOperator, '\\supset ', '&sup;');
    LatexCmds.nsub = LatexCmds.notsub = LatexCmds.nsubset = LatexCmds.notsubset = bind(BinaryOperator, '\\not\\subset ', '&#8836;');
    LatexCmds.nsup = LatexCmds.notsup = LatexCmds.nsupset = LatexCmds.notsupset = LatexCmds.nsuperset = LatexCmds.notsuperset = bind(BinaryOperator, '\\not\\supset ', '&#8837;');
    LatexCmds.sube = LatexCmds.subeq = LatexCmds.subsete = LatexCmds.subseteq = bind(BinaryOperator, '\\subseteq ', '&sube;');
    LatexCmds.supe = LatexCmds.supeq = LatexCmds.supsete = LatexCmds.supseteq = LatexCmds.supersete = LatexCmds.superseteq = bind(BinaryOperator, '\\supseteq ', '&supe;');
    LatexCmds.nsube = LatexCmds.nsubeq = LatexCmds.notsube = LatexCmds.notsubeq = LatexCmds.nsubsete = LatexCmds.nsubseteq = LatexCmds.notsubsete = LatexCmds.notsubseteq = bind(BinaryOperator, '\\not\\subseteq ', '&#8840;');
    LatexCmds.nsupe = LatexCmds.nsupeq = LatexCmds.notsupe = LatexCmds.notsupeq = LatexCmds.nsupsete = LatexCmds.nsupseteq = LatexCmds.notsupsete = LatexCmds.notsupseteq = LatexCmds.nsupersete = LatexCmds.nsuperseteq = LatexCmds.notsupersete = LatexCmds.notsuperseteq = bind(BinaryOperator, '\\not\\supseteq ', '&#8841;');

    function BigSymbol(ch, html) { Symbol.call(this, ch, '<big>' + html + '</big>'); }
    BigSymbol.prototype = new Symbol;
    LatexCmds['∑'] = LatexCmds.sum = LatexCmds.summation = bind(BigSymbol, '\\sum ', '&sum;');
    LatexCmds['∏'] = LatexCmds.prod = LatexCmds.product = bind(BigSymbol, '\\prod ', '&prod;');
    LatexCmds.coprod = LatexCmds.coproduct = bind(BigSymbol, '\\coprod ', '&#8720;');
    LatexCmds['∫'] = LatexCmds['int'] = LatexCmds.integral = bind(BigSymbol, '\\int ', '&int;');
    LatexCmds.N = LatexCmds.naturals = LatexCmds.Naturals = bind(VanillaSymbol, '\\N', '&#8469;');
    LatexCmds.P = LatexCmds.primes = LatexCmds.Primes = LatexCmds.projective = LatexCmds.Projective = LatexCmds.probability = LatexCmds.Probability = bind(VanillaSymbol, '\\P', '&#8473;');
    LatexCmds.Z = LatexCmds.integers = LatexCmds.Integers = bind(VanillaSymbol, '\\Z', '&#8484;');
    LatexCmds.Q = LatexCmds.rationals = LatexCmds.Rationals = bind(VanillaSymbol, '\\Q', '&#8474;');
    LatexCmds.R = LatexCmds.reals = LatexCmds.Reals = bind(VanillaSymbol, '\\R', '&#8477;');
    LatexCmds.C = LatexCmds.complex = LatexCmds.Complex = LatexCmds.complexes = LatexCmds.Complexes = LatexCmds.complexplane = LatexCmds.Complexplane = LatexCmds.ComplexPlane = bind(VanillaSymbol, '\\C', '&#8450;');
    LatexCmds.H = LatexCmds.Hamiltonian = LatexCmds.quaternions = LatexCmds.Quaternions = bind(VanillaSymbol, '\\H', '&#8461;');
    LatexCmds.NN = bind(VanillaSymbol, '\\NN', '&#8469;');
    LatexCmds.PP = bind(VanillaSymbol, '\\PP', '&#8473;');
    LatexCmds.ZZ = bind(VanillaSymbol, '\\ZZ', '&#8484;');
    LatexCmds.QQ = bind(VanillaSymbol, '\\QQ', '&#8474;');
    LatexCmds.RR = bind(VanillaSymbol, '\\RR', '&#8477;');
    LatexCmds.CC = bind(VanillaSymbol, '\\CC', '&#8450;');
    LatexCmds.HH = bind(VanillaSymbol, '\\HH', '&#8461;');
    LatexCmds.AA = bind(VanillaSymbol, '\\AA', '&#120120;');
    LatexCmds.BB = bind(VanillaSymbol, '\\BB', '&#120121;');
    LatexCmds.DD = bind(VanillaSymbol, '\\DD', '&#120123;');
    LatexCmds.EE = bind(VanillaSymbol, '\\EE', '&#120124;');
    LatexCmds.FF = bind(VanillaSymbol, '\\FF', '&#120125;');
    LatexCmds.GG = bind(VanillaSymbol, '\\GG', '&#120126;');
    LatexCmds.II = bind(VanillaSymbol, '\\II', '&#120128;');
    LatexCmds.JJ = bind(VanillaSymbol, '\\JJ', '&#120129;');
    LatexCmds.KK = bind(VanillaSymbol, '\\KK', '&#120130;');
    LatexCmds.LL = bind(VanillaSymbol, '\\LL', '&#120131;');
    LatexCmds.MM = bind(VanillaSymbol, '\\MM', '&#120132;');
    LatexCmds.OO = bind(VanillaSymbol, '\\OO', '&#120134;');
    LatexCmds.SS = bind(VanillaSymbol, '\\SS', '&#120138;');
    LatexCmds.TT = bind(VanillaSymbol, '\\TT', '&#120139;');
    LatexCmds.UU = bind(VanillaSymbol, '\\UU', '&#120140;');
    LatexCmds.VV = bind(VanillaSymbol, '\\VV', '&#120141;');
    LatexCmds.XX = bind(VanillaSymbol, '\\XX', '&#120142;');
    LatexCmds.YY = bind(VanillaSymbol, '\\YY', '&#120143;');
    LatexCmds.quad = LatexCmds.emsp = bind(VanillaSymbol, '\\quad ', '    ');
    LatexCmds.qquad = bind(VanillaSymbol, '\\qquad ', '        ');
    LatexCmds[','] = bind(VanillaSymbol, '\\, ', ' ');
    LatexCmds[':'] = bind(VanillaSymbol, '\\: ', ' ');
    LatexCmds[';'] = bind(VanillaSymbol, '\\; ', '   ');
    LatexCmds['%'] = bind(VanillaSymbol, '\\% ', '<span style="margin-left:0.2em;margin-right:0.2em;">%</span>');
    LatexCmds['&'] = bind(VanillaSymbol, '\\& ', '<span style="margin-left:0.2em;margin-right:0.2em;">&</span>');
    LatexCmds.diamond = bind(VanillaSymbol, '\\diamond ', '&#9671;');
    LatexCmds.bigtriangleup = bind(VanillaSymbol, '\\bigtriangleup ', '&#9651;');
    LatexCmds.ominus = bind(VanillaSymbol, '\\ominus ', '&#8854;');
    LatexCmds.uplus = bind(VanillaSymbol, '\\uplus ', '&#8846;');
    LatexCmds.bigtriangledown = bind(VanillaSymbol, '\\bigtriangledown ', '&#9661;');
    LatexCmds.sqcap = bind(VanillaSymbol, '\\sqcap ', '&#8851;');
    LatexCmds.triangleleft = bind(VanillaSymbol, '\\triangleleft ', '&#8882;');
    LatexCmds.sqcup = bind(VanillaSymbol, '\\sqcup ', '&#8852;');
    LatexCmds.triangleright = bind(VanillaSymbol, '\\triangleright ', '&#8883;');
    LatexCmds.odot = bind(VanillaSymbol, '\\odot ', '&#8857;');
    LatexCmds.bigcirc = bind(VanillaSymbol, '\\bigcirc ', '&#9711;');
    LatexCmds.dagger = bind(VanillaSymbol, '\\dagger ', '&#0134;');
    LatexCmds.ddagger = bind(VanillaSymbol, '\\ddagger ', '&#135;');
    LatexCmds.wr = bind(VanillaSymbol, '\\wr ', '&#8768;');
    LatexCmds.amalg = bind(VanillaSymbol, '\\amalg ', '&#8720;');
    LatexCmds.models = bind(VanillaSymbol, '\\models ', '&#8872;');
    LatexCmds.prec = bind(VanillaSymbol, '\\prec ', '&#8826;');
    LatexCmds.succ = bind(VanillaSymbol, '\\succ ', '&#8827;');
    LatexCmds.preceq = bind(VanillaSymbol, '\\preceq ', '&#8828;');
    LatexCmds.succeq = bind(VanillaSymbol, '\\succeq ', '&#8829;');
    LatexCmds.simeq = bind(VanillaSymbol, '\\simeq ', '&#8771;');
    LatexCmds.mid = bind(VanillaSymbol, '\\mid ', '&#8739;');
    LatexCmds.ll = bind(VanillaSymbol, '\\ll ', '&#8810;');
    LatexCmds.gg = bind(VanillaSymbol, '\\gg ', '&#8811;');
    LatexCmds.parallel = bind(VanillaSymbol, '\\parallel ', '&#8741;');
    LatexCmds.nparallel = bind(VanillaSymbol, '\\nparallel ', '&#8742;');
    LatexCmds.bowtie = bind(VanillaSymbol, '\\bowtie ', '&#8904;');
    LatexCmds.sqsubset = bind(VanillaSymbol, '\\sqsubset ', '&#8847;');
    LatexCmds.sqsupset = bind(VanillaSymbol, '\\sqsupset ', '&#8848;');
    LatexCmds.smile = bind(VanillaSymbol, '\\smile ', '&#8995;');
    LatexCmds.sqsubseteq = bind(VanillaSymbol, '\\sqsubseteq ', '&#8849;');
    LatexCmds.sqsupseteq = bind(VanillaSymbol, '\\sqsupseteq ', '&#8850;');
    LatexCmds.doteq = bind(VanillaSymbol, '\\doteq ', '&#8784;');
    LatexCmds.frown = bind(VanillaSymbol, '\\frown ', '&#8994;');
    LatexCmds.vdash = bind(VanillaSymbol, '\\vdash ', '&#8870;');
    LatexCmds.dashv = bind(VanillaSymbol, '\\dashv ', '&#8867;');
    LatexCmds.Vdash = bind(VanillaSymbol, '\\Vdash ', '&#8873;');
    LatexCmds.nmid = bind(VanillaSymbol, '\\nmid ', '&#8740;');
    LatexCmds.square = bind(VanillaSymbol, '\\square ', '&#9633;');
    LatexCmds.rightleftharpoons = bind(VanillaSymbol, '\\rightleftharpoons ', '&#8652;');
    LatexCmds.leftrightharpoons = bind(VanillaSymbol, '\\leftrightharpoons ', '&#8651;');
    LatexCmds.longleftarrow = bind(VanillaSymbol, '\\longleftarrow ', '&#8592;');
    LatexCmds.longrightarrow = bind(VanillaSymbol, '\\longrightarrow ', '&#8594;');
    LatexCmds.Longleftarrow = bind(VanillaSymbol, '\\Longleftarrow ', '&#8656;');
    LatexCmds.Longrightarrow = bind(VanillaSymbol, '\\Longrightarrow ', '&#8658;');
    LatexCmds.longleftrightarrow = bind(VanillaSymbol, '\\longleftrightarrow ', '&#8596;');
    LatexCmds.updownarrow = bind(VanillaSymbol, '\\updownarrow ', '&#8597;');
    LatexCmds.Longleftrightarrow = bind(VanillaSymbol, '\\Longleftrightarrow ', '&#8660;');
    LatexCmds.Updownarrow = bind(VanillaSymbol, '\\Updownarrow ', '&#8661;');
    LatexCmds.mapsto = bind(VanillaSymbol, '\\mapsto ', '&#8614;');
    LatexCmds.nearrow = bind(VanillaSymbol, '\\nearrow ', '&#8599;');
    LatexCmds.hookleftarrow = bind(VanillaSymbol, '\\hookleftarrow ', '&#8617;');
    LatexCmds.hookrightarrow = bind(VanillaSymbol, '\\hookrightarrow ', '&#8618;');
    LatexCmds.searrow = bind(VanillaSymbol, '\\searrow ', '&#8600;');
    LatexCmds.leftharpoonup = bind(VanillaSymbol, '\\leftharpoonup ', '&#8636;');
    LatexCmds.rightharpoonup = bind(VanillaSymbol, '\\rightharpoonup ', '&#8640;');
    LatexCmds.swarrow = bind(VanillaSymbol, '\\swarrow ', '&#8601;');
    LatexCmds.leftharpoondown = bind(VanillaSymbol, '\\leftharpoondown ', '&#8637;');
    LatexCmds.rightharpoondown = bind(VanillaSymbol, '\\rightharpoondown ', '&#8641;');
    LatexCmds.nwarrow = bind(VanillaSymbol, '\\nwarrow ', '&#8598;');
    LatexCmds.ldots = bind(VanillaSymbol, '\\ldots ', '&#8230;');
    LatexCmds.cdots = bind(VanillaSymbol, '\\cdots ', '&#8943;');
    LatexCmds.vdots = bind(VanillaSymbol, '\\vdots ', '&#8942;');
    LatexCmds.ddots = bind(VanillaSymbol, '\\ddots ', '&#8944;');
    LatexCmds.surd = bind(VanillaSymbol, '\\surd ', '&#8730;');
    LatexCmds.triangle = bind(VanillaSymbol, '\\triangle ', '&#9653;');
    LatexCmds.ell = bind(VanillaSymbol, '\\ell ', '&#8467;');
    LatexCmds.top = bind(VanillaSymbol, '\\top ', '&#8868;');
    LatexCmds.flat = bind(VanillaSymbol, '\\flat ', '&#9837;');
    LatexCmds.natural = bind(VanillaSymbol, '\\natural ', '&#9838;');
    LatexCmds.sharp = bind(VanillaSymbol, '\\sharp ', '&#9839;');
    LatexCmds.wp = bind(VanillaSymbol, '\\wp ', '&#8472;');
    LatexCmds.bot = bind(VanillaSymbol, '\\bot ', '&#8869;');
    LatexCmds.clubsuit = bind(VanillaSymbol, '\\clubsuit ', '&#9827;');
    LatexCmds.diamondsuit = bind(VanillaSymbol, '\\diamondsuit ', '&#9826;');
    LatexCmds.heartsuit = bind(VanillaSymbol, '\\heartsuit ', '&#9825;');
    LatexCmds.spadesuit = bind(VanillaSymbol, '\\spadesuit ', '&#9824;');
    LatexCmds.oint = bind(VanillaSymbol, '\\oint ', '&#8750;');
    LatexCmds.bigcap = bind(VanillaSymbol, '\\bigcap ', '&#8745;');
    LatexCmds.bigcup = bind(VanillaSymbol, '\\bigcup ', '&#8746;');
    LatexCmds.bigsqcup = bind(VanillaSymbol, '\\bigsqcup ', '&#8852;');
    LatexCmds.bigvee = bind(VanillaSymbol, '\\bigvee ', '&#8744;');
    LatexCmds.bigwedge = bind(VanillaSymbol, '\\bigwedge ', '&#8743;');
    LatexCmds.bigodot = bind(VanillaSymbol, '\\bigodot ', '&#8857;');
    LatexCmds.bigotimes = bind(VanillaSymbol, '\\bigotimes ', '&#8855;');
    LatexCmds.bigoplus = bind(VanillaSymbol, '\\bigoplus ', '&#8853;');
    LatexCmds.biguplus = bind(VanillaSymbol, '\\biguplus ', '&#8846;');
    LatexCmds.lfloor = bind(VanillaSymbol, '\\lfloor ', '&#8970;');
    LatexCmds.rfloor = bind(VanillaSymbol, '\\rfloor ', '&#8971;');
    LatexCmds.lceil = bind(VanillaSymbol, '\\lceil ', '&#8968;');
    LatexCmds.rceil = bind(VanillaSymbol, '\\rceil ', '&#8969;');
    LatexCmds.slash = bind(VanillaSymbol, '\\slash ', '&#47;');
    LatexCmds.opencurlybrace = bind(VanillaSymbol, '\\opencurlybrace ', '&#123;');
    LatexCmds.closecurlybrace = bind(VanillaSymbol, '\\closecurlybrace ', '&#125;');
    LatexCmds.caret = bind(VanillaSymbol, '\\caret ', '^');
    LatexCmds.underscore = bind(VanillaSymbol, '\\underscore ', '_');
    LatexCmds.backslash = bind(VanillaSymbol, '\\backslash ', '\\');
    LatexCmds.vert = bind(VanillaSymbol, '|');
    LatexCmds.perp = LatexCmds.perpendicular = bind(VanillaSymbol, '\\perp ', '&perp;');
    LatexCmds.nabla = LatexCmds.del = bind(VanillaSymbol, '\\nabla ', '&nabla;');
    LatexCmds.hbar = bind(VanillaSymbol, '\\hbar ', '&#8463;');
    LatexCmds.AA = LatexCmds.Angstrom = LatexCmds.angstrom = bind(VanillaSymbol, '\\text\\AA ', '&#8491;');
    LatexCmds.ring = LatexCmds.circ = LatexCmds.circle = bind(VanillaSymbol, '\\circ ', '&#8728;');
    LatexCmds.bull = LatexCmds.bullet = bind(VanillaSymbol, '\\bullet ', '&bull;');
    LatexCmds.setminus = LatexCmds.smallsetminus = bind(VanillaSymbol, '\\setminus ', '&#8726;');
    LatexCmds.not = LatexCmds['¬'] = LatexCmds.neg = bind(VanillaSymbol, '\\neg ', '&not;');
    LatexCmds['…'] = LatexCmds.dots = LatexCmds.ellip = LatexCmds.hellip = LatexCmds.ellipsis = LatexCmds.hellipsis = bind(VanillaSymbol, '\\dots ', '&hellip;');
    LatexCmds.converges = LatexCmds.darr = LatexCmds.dnarr = LatexCmds.dnarrow = LatexCmds.downarrow = bind(VanillaSymbol, '\\downarrow ', '&darr;');
    LatexCmds.dArr = LatexCmds.dnArr = LatexCmds.dnArrow = LatexCmds.Downarrow = bind(VanillaSymbol, '\\Downarrow ', '&dArr;');
    LatexCmds.diverges = LatexCmds.uarr = LatexCmds.uparrow = bind(VanillaSymbol, '\\uparrow ', '&uarr;');
    LatexCmds.uArr = LatexCmds.Uparrow = bind(VanillaSymbol, '\\Uparrow ', '&uArr;');
    LatexCmds.to = bind(BinaryOperator, '\\to ', '&rarr;');
    LatexCmds.rarr = LatexCmds.rightarrow = bind(BinaryOperator, '\\rightarrow ', '&rarr;');
    LatexCmds.implies = bind(BinaryOperator, '\\Rightarrow ', '&rArr;');
    LatexCmds.rArr = LatexCmds.Rightarrow = bind(BinaryOperator, '\\Rightarrow ', '&rArr;');
    LatexCmds.gets = bind(BinaryOperator, '\\gets ', '&larr;');
    LatexCmds.larr = LatexCmds.leftarrow = bind(BinaryOperator, '\\leftarrow ', '&larr;');
    LatexCmds.impliedby = bind(BinaryOperator, '\\Leftarrow ', '&lArr;');
    LatexCmds.lArr = LatexCmds.Leftarrow = bind(BinaryOperator, '\\Leftarrow ', '&lArr;');
    LatexCmds.harr = LatexCmds.lrarr = LatexCmds.leftrightarrow = bind(BinaryOperator, '\\leftrightarrow ', '&harr;');
    LatexCmds.iff = bind(BinaryOperator, '\\Leftrightarrow ', '&hArr;');
    LatexCmds.hArr = LatexCmds.lrArr = LatexCmds.Leftrightarrow = bind(BinaryOperator, '\\Leftrightarrow ', '&hArr;');
    LatexCmds.Re = LatexCmds.Real = LatexCmds.real = bind(VanillaSymbol, '\\Re ', '&real;');
    LatexCmds.Im = LatexCmds.imag = LatexCmds.image = LatexCmds.imagin = LatexCmds.imaginary = LatexCmds.Imaginary = bind(VanillaSymbol, '\\Im ', '&image;');
    LatexCmds.part = LatexCmds.partial = bind(VanillaSymbol, '\\partial ', '&part;');
    LatexCmds.inf = LatexCmds.infin = LatexCmds.infty = LatexCmds.infinity = bind(VanillaSymbol, '\\infty ', '&infin;');
    LatexCmds.alef = LatexCmds.alefsym = LatexCmds.aleph = LatexCmds.alephsym = bind(VanillaSymbol, '\\aleph ', '&alefsym;');
    LatexCmds.xist = LatexCmds.xists = LatexCmds.exist = LatexCmds.exists = bind(VanillaSymbol, '\\exists ', '&exist;');
    LatexCmds.and = LatexCmds.land = LatexCmds.wedge = bind(BinaryOperator, '\\wedge ', '&and;');
    LatexCmds.or = LatexCmds.lor = LatexCmds.vee = bind(BinaryOperator, '\\vee ', '&or;');
    LatexCmds.o = LatexCmds.O = LatexCmds.empty = LatexCmds.emptyset = LatexCmds.oslash = LatexCmds.Oslash = LatexCmds.nothing = LatexCmds.varnothing = bind(BinaryOperator, '\\varnothing ', '&empty;');
    LatexCmds.cup = LatexCmds.union = bind(BinaryOperator, '\\cup ', '&cup;');
    LatexCmds.cap = LatexCmds.intersect = LatexCmds.intersection = bind(BinaryOperator, '\\cap ', '&cap;');
    LatexCmds.deg = LatexCmds.degree = bind(VanillaSymbol, '^\\circ ', '&deg;');
    LatexCmds.ang = LatexCmds.angle = bind(VanillaSymbol, '\\angle ', '&ang;');

    function NonItalicizedFunction(replacedFragment, fn) { Symbol.call(this, '\\' + fn + ' ', '<span>' + fn + '</span>'); }
    _ = NonItalicizedFunction.prototype = new Symbol;
    _.respace = function() { this.jQ[0].className = (this.next instanceof SupSub || this.next instanceof Bracket) ? '' : 'non-italicized-function'; };
    LatexCmds.ln = LatexCmds.lg = LatexCmds.log = LatexCmds.span = LatexCmds.proj = LatexCmds.det = LatexCmds.dim = LatexCmds.min = LatexCmds.max = LatexCmds.mod = LatexCmds.lcm = LatexCmds.gcd = LatexCmds.gcf = LatexCmds.hcf = LatexCmds.lim = NonItalicizedFunction;
    (function() { var trig = ['sin', 'cos', 'tan', 'sec', 'cosec', 'csc', 'cotan', 'cot']; for (var i in trig) { LatexCmds[trig[i]] = LatexCmds[trig[i] + 'h'] = LatexCmds['a' + trig[i]] = LatexCmds['arc' + trig[i]] = LatexCmds['a' + trig[i] + 'h'] = LatexCmds['arc' + trig[i] + 'h'] = NonItalicizedFunction; } }());

    function Cursor(root) {
        this.parent = this.root = root;
        var jQ = this.jQ = this._jQ = $('<span class="cursor">&zwj;</span>');
        this.blink = function() { jQ.toggleClass('blink'); }
    }
    _ = Cursor.prototype;
    _.prev = 0;
    _.next = 0;
    _.parent = 0;
    _.show = function() {
        this.jQ = this._jQ.removeClass('blink');
        if ('intervalId' in this)
            clearInterval(this.intervalId);
        else {
            if (this.next) {
                if (this.selection && this.selection.prev === this.prev)
                    this.jQ.insertBefore(this.selection.jQ);
                else
                    this.jQ.insertBefore(this.next.jQ.first());
            } else
                this.jQ.appendTo(this.parent.jQ);
            this.parent.focus();
        }
        this.intervalId = setInterval(this.blink, 500);
        return this;
    };
    _.hide = function() {
        if ('intervalId' in this)
            clearInterval(this.intervalId);
        delete this.intervalId;
        this.jQ.detach();
        this.jQ = $();
        return this;
    };
    _.redraw = function() {
        for (var ancestor = this.parent; ancestor; ancestor = ancestor.parent)
            if (ancestor.redraw)
                ancestor.redraw();
    };
    _.insertAt = function(parent, prev, next) {
        var old_parent = this.parent;
        this.parent = parent;
        this.prev = prev;
        this.next = next;
        old_parent.blur();
    };
    _.insertBefore = function(el) {
        this.insertAt(el.parent, el.prev, el)
        this.parent.jQ.addClass('hasCursor');
        this.jQ.insertBefore(el.jQ.first());
        return this;
    };
    _.insertAfter = function(el) {
        this.insertAt(el.parent, el, el.next);
        this.parent.jQ.addClass('hasCursor');
        this.jQ.insertAfter(el.jQ.last());
        return this;
    };
    _.prependTo = function(el) {
        this.insertAt(el, 0, el.firstChild);
        if (el.textarea)
            this.jQ.insertAfter(el.textarea);
        else
            this.jQ.prependTo(el.jQ);
        el.focus();
        return this;
    };
    _.appendTo = function(el) {
        this.insertAt(el, el.lastChild, 0);
        this.jQ.appendTo(el.jQ);
        el.focus();
        return this;
    };
    _.hopLeft = function() {
        this.jQ.insertBefore(this.prev.jQ.first());
        this.next = this.prev;
        this.prev = this.prev.prev;
        return this;
    };
    _.hopRight = function() {
        this.jQ.insertAfter(this.next.jQ.last());
        this.prev = this.next;
        this.next = this.next.next;
        return this;
    };
    _.moveLeft = function() {
        if (this.selection)
            this.insertBefore(this.selection.prev.next || this.parent.firstChild).clearSelection();
        else {
            if (this.prev) {
                if (this.prev.lastChild)
                    this.appendTo(this.prev.lastChild)
                else
                    this.hopLeft();
            } else {
                if (this.parent.prev)
                    this.appendTo(this.parent.prev);
                else if (this.parent !== this.root)
                    this.insertBefore(this.parent.parent);
            }
        }
        return this.show();
    };
    _.moveRight = function() {
        if (this.selection)
            this.insertAfter(this.selection.next.prev || this.parent.lastChild).clearSelection();
        else {
            if (this.next) {
                if (this.next.firstChild)
                    this.prependTo(this.next.firstChild)
                else
                    this.hopRight();
            } else {
                if (this.parent.next)
                    this.prependTo(this.parent.next);
                else if (this.parent !== this.root)
                    this.insertAfter(this.parent.parent);
            }
        }
        return this.show();
    };
    _.seek = function(target, pageX, pageY) {
        var cursor = this.clearSelection();
        if (target.hasClass('empty')) { cursor.prependTo(target.data(jQueryDataKey).block); return cursor; }
        var data = target.data(jQueryDataKey);
        if (data) {
            if (data.cmd && !data.block) {
                if (target.outerWidth() > 2 * (pageX - target.offset().left))
                    cursor.insertBefore(data.cmd);
                else
                    cursor.insertAfter(data.cmd);
                return cursor;
            }
        } else {
            target = target.parent();
            data = target.data(jQueryDataKey);
            if (!data)
                data = { block: cursor.root };
        }
        if (data.cmd)
            cursor.insertAfter(data.cmd);
        else
            cursor.appendTo(data.block);
        var dist = cursor.offset().left - pageX,
            prevDist;
        do {
            cursor.moveLeft();
            prevDist = dist;
            dist = cursor.offset().left - pageX;
        }
        while (dist > 0 && (cursor.prev || cursor.parent !== cursor.root));
        if (-dist > prevDist)
            cursor.moveRight();
        return cursor;
    };
    _.offset = function() {
        var jQ = this.jQ.removeClass('cursor'),
            offset = jQ.offset();
        jQ.addClass('cursor');
        return offset;
    };
    _.writeLatex = function(latex) {
        this.deleteSelection();
        latex = (latex && latex.match(/\\text\{([^}]|\\\})*\}|\\:|\\;|\\,|\\%|\\&|\\[a-z]*|[^\s]/ig)) || 0;
        (function writeLatexBlock(cursor) {
            while (latex.length) {
                var token = latex.shift();
                if (!token || token === '}' || token === ']') return;
                var cmd;
                if (token.slice(0, 6) === '\\text{') {
                    cmd = new TextBlock(token.slice(6, -1));
                    cursor.insertNew(cmd).insertAfter(cmd);
                    continue;
                } else if (token === '\\left' || token === '\\right') {
                    token = latex.shift();
                    if (token === '\\')
                        token = latex.shift();
                    cursor.insertCh(token);
                    cmd = cursor.prev || cursor.parent.parent;
                    if (cursor.prev)
                        return;
                    else
                        latex.unshift('{');
                } else if (/^\\[a-z:;,%&]+$/i.test(token)) {
                    token = token.slice(1);
                    var cmd = LatexCmds[token];
                    if (cmd) {
                        cmd = new cmd(undefined, token);
                        if (latex[0] === '[' && cmd.optional_arg_command) {
                            token = cmd.optional_arg_command;
                            cmd = new LatexCmds[token](undefined, token);
                        }
                        cursor.insertNew(cmd);
                    } else {
                        cmd = new TextBlock(token);
                        cursor.insertNew(cmd).insertAfter(cmd);
                        continue;
                    }
                } else {
                    if (token.match(/[a-zA-ZáÁéÉíÍóÓöÖőŐúÚüÜűŰ]/))
                        cmd = new Variable(token);
                    else if (token.match(/[:;,]/))
                        cmd = new VanillaSymbol(token);
                    else if (cmd = LatexCmds[token])
                        cmd = new cmd;
                    else
                        cmd = new VanillaSymbol(token);
                    cursor.insertNew(cmd);
                }
                cmd.eachChild(function(child) {
                    cursor.appendTo(child);
                    var token = latex.shift();
                    if (!token) return false;
                    if (token === '{' || token === '[')
                        writeLatexBlock(cursor);
                    else
                        cursor.insertCh(token);
                });
                cursor.insertAfter(cmd);
            }
        }(this));
        return this.hide();
    };
    _.write = function(ch) { return this.show().insertCh(ch); };
    _.insertCh = function(ch) {
        if (this.selection) {
            this.prev = this.selection.prev;
            this.next = this.selection.next;
        }
        var cmd;
        if (ch.match(/^[a-zA-Z]$/))
            cmd = new Variable(ch);
        else if ((cmd = CharCmds[ch] || LatexCmds[ch]) && !(ch.match(/[:;,]/)))
            cmd = new cmd(this.selection, ch);
        else
            cmd = new VanillaSymbol(ch);
        if (this.selection) {
            if (cmd instanceof Symbol)
                this.selection.remove();
            delete this.selection;
        }
        return this.insertNew(cmd);
    };
    _.insertNew = function(cmd) { cmd.insertAt(this); return this; };
    _.insertCmd = function(latexCmd, replacedFragment) {
        var cmd = LatexCmds[latexCmd];
        if (cmd) {
            cmd = new cmd(replacedFragment, latexCmd);
            this.insertNew(cmd);
            if (cmd instanceof Symbol && replacedFragment)
                replacedFragment.remove();
        } else {
            cmd = new TextBlock(latexCmd);
            cmd.firstChild.focus = function() { delete this.focus; return this; };
            this.insertNew(cmd).insertAfter(cmd);
            if (replacedFragment)
                replacedFragment.remove();
        }
        return this;
    };
    _.unwrapGramp = function() {
        var gramp = this.parent.parent,
            greatgramp = gramp.parent,
            prev = gramp.prev,
            cursor = this;
        gramp.eachChild(function(uncle) {
            if (uncle.isEmpty()) return;
            uncle.eachChild(function(cousin) {
                cousin.parent = greatgramp;
                cousin.jQ.insertBefore(gramp.jQ.first());
            });
            uncle.firstChild.prev = prev;
            if (prev)
                prev.next = uncle.firstChild;
            else
                greatgramp.firstChild = uncle.firstChild;
            prev = uncle.lastChild;
        });
        prev.next = gramp.next;
        if (gramp.next)
            gramp.next.prev = prev;
        else
            greatgramp.lastChild = prev;
        if (!this.next) {
            if (this.prev)
                this.next = this.prev.next;
            else {
                while (!this.next) {
                    this.parent = this.parent.next;
                    if (this.parent)
                        this.next = this.parent.firstChild;
                    else {
                        this.next = gramp.next;
                        this.parent = greatgramp;
                        break;
                    }
                }
            }
        }
        if (this.next)
            this.insertBefore(this.next);
        else
            this.appendTo(greatgramp);
        gramp.jQ.remove();
        if (gramp.prev)
            gramp.prev.respace();
        if (gramp.next)
            gramp.next.respace();
    };
    _.backspace = function() {
        if (this.deleteSelection());
        else if (this.prev) {
            if (this.prev.isEmpty())
                this.prev = this.prev.remove().prev;
            else
                this.selectLeft();
        } else if (this.parent !== this.root) {
            if (this.parent.parent.isEmpty())
                return this.insertAfter(this.parent.parent).backspace();
            else
                this.unwrapGramp();
        }
        if (this.prev)
            this.prev.respace();
        if (this.next)
            this.next.respace();
        this.redraw();
        return this;
    };
    _.deleteForward = function() {
        if (this.deleteSelection());
        else if (this.next) {
            if (this.next.isEmpty())
                this.next = this.next.remove().next;
            else
                this.selectRight();
        } else if (this.parent !== this.root) {
            if (this.parent.parent.isEmpty())
                return this.insertBefore(this.parent.parent).deleteForward();
            else
                this.unwrapGramp();
        }
        if (this.prev)
            this.prev.respace();
        if (this.next)
            this.next.respace();
        this.redraw();
        return this;
    };
    _.selectFrom = function(anticursor) {
        var oneA = this,
            otherA = anticursor;
        loopThroughAncestors: while (true) {
            for (var oneI = this; oneI !== oneA.parent.parent; oneI = oneI.parent.parent)
                if (oneI.parent === otherA.parent) {
                    left = oneI;
                    right = otherA;
                    break loopThroughAncestors;
                }
            for (var otherI = anticursor; otherI !== otherA.parent.parent; otherI = otherI.parent.parent)
                if (oneA.parent === otherI.parent) {
                    left = oneA;
                    right = otherI;
                    break loopThroughAncestors;
                }
            if (oneA.parent.parent)
                oneA = oneA.parent.parent;
            if (otherA.parent.parent)
                otherA = otherA.parent.parent;
        }
        var left, right, leftRight;
        if (left.next !== right) {
            for (var next = left; next; next = next.next) { if (next === right.prev) { leftRight = true; break; } }
            if (!leftRight) {
                leftRight = right;
                right = left;
                left = leftRight;
            }
        }
        this.hide().selection = new Selection(left.parent, left.prev, right.next);
        this.insertAfter(right.next.prev || right.parent.lastChild);
        this.root.selectionChanged();
    };
    _.selectLeft = function() {
        if (this.selection) {
            if (this.selection.prev === this.prev) {
                if (this.prev) {
                    this.hopLeft().next.jQ.prependTo(this.selection.jQ);
                    this.selection.prev = this.prev;
                } else if (this.parent !== this.root)
                    this.insertBefore(this.parent.parent).selection.levelUp();
            } else {
                this.prev.jQ.insertAfter(this.selection.jQ);
                this.hopLeft().selection.next = this.next;
                if (this.selection.prev === this.prev) { this.deleteSelection(); return; }
            }
        } else {
            if (this.prev)
                this.hopLeft();
            else
            if (this.parent !== this.root)
                this.insertBefore(this.parent.parent);
            else
                return;
            this.hide().selection = new Selection(this.parent, this.prev, this.next.next);
        }
        this.root.selectionChanged();
    };
    _.selectRight = function() {
        if (this.selection) {
            if (this.selection.next === this.next) {
                if (this.next) {
                    this.hopRight().prev.jQ.appendTo(this.selection.jQ);
                    this.selection.next = this.next;
                } else if (this.parent !== this.root)
                    this.insertAfter(this.parent.parent).selection.levelUp();
            } else {
                this.next.jQ.insertBefore(this.selection.jQ);
                this.hopRight().selection.prev = this.prev;
                if (this.selection.next === this.next) { this.deleteSelection(); return; }
            }
        } else {
            if (this.next)
                this.hopRight();
            else
            if (this.parent !== this.root)
                this.insertAfter(this.parent.parent);
            else
                return;
            this.hide().selection = new Selection(this.parent, this.prev.prev, this.next);
        }
        this.root.selectionChanged();
    };
    _.clearSelection = function() {
        if (this.show().selection) {
            this.selection.clear();
            delete this.selection;
            this.root.selectionChanged();
        }
        return this;
    };
    _.deleteSelection = function() {
        if (!this.show().selection) return false;
        this.prev = this.selection.prev;
        this.next = this.selection.next;
        this.selection.remove();
        delete this.selection;
        this.root.selectionChanged();
        return true;
    };

    function Selection(parent, prev, next) { MathFragment.apply(this, arguments); }
    _ = Selection.prototype = new MathFragment;
    _.jQinit = function(children) { this.jQ = children.wrapAll('<span class="selection"></span>').parent(); };
    _.levelUp = function() {
        this.clear().jQinit(this.parent.parent.jQ);
        this.prev = this.parent.parent.prev;
        this.next = this.parent.parent.next;
        this.parent = this.parent.parent.parent;
        return this;
    };
    _.clear = function() { this.jQ.replaceWith(this.jQ.children()); return this; };
    _.blockify = function() { this.jQ.replaceWith(this.jQ = this.jQ.children()); return MathFragment.prototype.blockify.call(this); };
    _.detach = function() {
        var block = MathFragment.prototype.blockify.call(this);
        this.blockify = function() { this.jQ.replaceWith(block.jQ = this.jQ = this.jQ.children()); return block; };
        return this;
    };
    $.fn.mathquill = function(cmd, latex) {
        switch (cmd) {
            case 'redraw':
                this.find(':not(:has(:first))').each(function() { var data = $(this).data(jQueryDataKey); if (data && (data.cmd || data.block)) Cursor.prototype.redraw.call(data.cmd || data.block); });
                return this;
            case 'revert':
                return this.each(function() {
                    var data = $(this).data(jQueryDataKey);
                    if (data && data.revert)
                        data.revert();
                });
            case 'latex':
                if (arguments.length > 1) {
                    return this.each(function() {
                        var data = $(this).data(jQueryDataKey);
                        if (data && data.block && data.block.renderLatex)
                            data.block.renderLatex(latex);
                    });
                }
                var data = this.data(jQueryDataKey);
                return data && data.block && data.block.latex();
            case 'text':
                var data = this.data(jQueryDataKey);
                return data && data.block && data.block.text();
            case 'html':
                return this.html().replace(/ ?hasCursor|hasCursor /, '').replace(/ class=(""|(?= |>))/g, '').replace(/<span class="?cursor( blink)?"?><\/span>/i, '').replace(/<span class="?textarea"?><textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><\/textarea><\/span>/i, '');
            case 'write':
                if (arguments.length > 1)
                    return this.each(function() {
                        var data = $(this).data(jQueryDataKey),
                            block = data && data.block,
                            cursor = block && block.cursor;
                        if (cursor)
                            cursor.writeLatex(latex).parent.blur();
                    });
            case 'cmd':
                if (arguments.length > 1)
                    return this.each(function() {
                        var data = $(this).data(jQueryDataKey),
                            block = data && data.block,
                            cursor = block && block.cursor;
                        if (cursor) {
                            cursor.show();
                            if (/^\\[a-z]+$/i.test(latex)) {
                                if (cursor.selection) {
                                    cursor.prev = cursor.selection.prev;
                                    cursor.next = cursor.selection.next;
                                }
                                cursor.insertCmd(latex.slice(1), cursor.selection);
                                delete cursor.selection;
                            } else
                                cursor.insertCh(latex);
                            cursor.hide().parent.blur();
                        }
                    });
            default:
                var textbox = cmd === 'textbox',
                    editable = textbox || cmd === 'editable',
                    RootBlock = textbox ? RootTextBlock : RootMathBlock;
                return this.each(function() { createRoot($(this), new RootBlock, textbox, editable); });
        }
    };
    $.getHTMLTemplate = function(cmd) { var obj = new LatexCmds[cmd](undefined, cmd); return obj.html_template.join(''); }
    $(function() {
        $('.mathquill-editable:not(.mathquill-rendered-math)').mathquill('editable');
        $('.mathquill-textbox:not(.mathquill-rendered-math)').mathquill('textbox');
        $('.mathquill-embedded-latex').mathquill();
    });
}());