(function($) {
    {
        {
            Math.logTen = function(x) { return Math.log(x) * Math.LOG10E; }
            Math.factorial = function(num) { if ((typeof(num) === 'number') && (num >= 0)) { if (num >= 1000) return (Number.POSITIVE_INFINITY); var result = 1; for (var i = 2; i <= num; i++) result *= i; return (result); } else return (undefined); }
            Math.sinh = function(aValue) { return (Math.pow(Math.E, aValue) - Math.pow(Math.E, -aValue)) / 2; }
            Math.cosh = function(aValue) { return (Math.pow(Math.E, aValue) + Math.pow(Math.E, -aValue)) / 2; }
            Math.ans = function(n, randomName) { return typeof randomName != 'undefined' ? parseFloat(randomName.data('ans-' + n)) : undefined; }
            Math.inp = function(n, randomName) { return typeof randomName != 'undefined' ? randomName.data('inp-' + n) : undefined; }
        }
        var mathjs = function(st) {
            st = st.replace(/\s/g, "");
            if (st.indexOf("^-1") != -1) {
                st = st.replace(/sec\^-1/g, "Math.arcsec");
                st = st.replace(/csc\^-1/g, "Math.arccsc");
                st = st.replace(/cot\^-1/g, "Math.arccot");
                st = st.replace(/sinh\^-1/g, "Math.arcsinh");
                st = st.replace(/cosh\^-1/g, "Math.arccosh");
                st = st.replace(/tanh\^-1/g, "Math.arctanh");
                st = st.replace(/sech\^-1/g, "Math.arcsech");
                st = st.replace(/csch\^-1/g, "Math.arccsch");
                st = st.replace(/coth\^-1/g, "Math.arccoth");
            }
            st = st.replace(/pi/g, "Math.PI");
            st = st.replace(/([0-9])([\(a-zA-Z])/g, "$1*$2");
            st = st.replace(/\)([\(0-9a-zA-Z])/g, "\)*$1");
            var i, j, k, ch, nested;
            while ((i = st.indexOf("^")) != -1) {
                if (i == 0) return "Error: missing argument";
                j = i - 1;
                ch = st.charAt(j);
                if (ch >= "0" && ch <= "9") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "0" && ch <= "9") j--; if (ch == ".") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "0" && ch <= "9") j--; } } else if (ch == ")") {
                    nested = 1;
                    j--;
                    while (j >= 0 && nested > 0) {
                        ch = st.charAt(j);
                        if (ch == "(") nested--;
                        else if (ch == ")") nested++;
                        j--;
                    }
                    while (j >= 0 && (ch = st.charAt(j)) >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") j--;
                } else if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") j--; } else { return "Error: incorrect syntax in " + st + " at position " + j; }
                if (i == st.length - 1) return "Error: missing argument";
                k = i + 1;
                ch = st.charAt(k);
                if (ch >= "0" && ch <= "9" || ch == "-") { k++; while (k < st.length && (ch = st.charAt(k)) >= "0" && ch <= "9") k++; if (ch == ".") { k++; while (k < st.length && (ch = st.charAt(k)) >= "0" && ch <= "9") k++; } } else if (ch == "(") {
                    nested = 1;
                    k++;
                    while (k < st.length && nested > 0) {
                        ch = st.charAt(k);
                        if (ch == "(") nested++;
                        else if (ch == ")") nested--;
                        k++;
                    }
                } else if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") { k++; while (k < st.length && (ch = st.charAt(k)) >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") k++; } else { return "Error: incorrect syntax in " + st + " at position " + k; }
                st = st.slice(0, j + 1) + "Math.pow(" + st.slice(j + 1, i) + "," + st.slice(i + 1, k) + ")" +
                    st.slice(k);
            }
            while ((i = st.indexOf("!")) != -1) {
                if (i == 0) return "Error: missing argument";
                j = i - 1;
                ch = st.charAt(j);
                if (ch >= "0" && ch <= "9") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "0" && ch <= "9") j--; if (ch == ".") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "0" && ch <= "9") j--; } } else if (ch == ")") {
                    nested = 1;
                    j--;
                    while (j >= 0 && nested > 0) {
                        ch = st.charAt(j);
                        if (ch == "(") nested--;
                        else if (ch == ")") nested++;
                        j--;
                    }
                    while (j >= 0 && (ch = st.charAt(j)) >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") j--;
                } else if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") { j--; while (j >= 0 && (ch = st.charAt(j)) >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") j--; } else { return "Error: incorrect syntax in " + st + " at position " + j; }
                st = st.slice(0, j + 1) + "Math.factorial(" + st.slice(j + 1, i) + ")" + st.slice(i + 1);
            }
            return st;
        }
        var latexeval = function(place, expression, parseOnly) {
            expression = '' + expression;
            var randomName = 'r' + Math.ceil(Math.random() * 10000000);
            Math[randomName] = place;
            var latexrep = [
                [/((?:[\-+]?[0-9]+)|(?:\\left\([^\(\)]+\\right\)))!/ig, 'factorial($1)'],
                [/\\sqrt{([^{}]+)}/ig, 'sqrt($1)'],
                [/\\frac{([^{}]+)}{([^{}]+)}/ig, '(($1)/($2))'],
                [/\\left\|([^\|]*)\\right\|/g, 'abs($1)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\^((?:[\-+]?[0-9\.]+)|(?:{[^{}]+}))/ig, 'pow($1, $2)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2070/ig, 'pow($1, 0)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u00B9/ig, 'pow($1, 1)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u00B2/ig, 'pow($1, 2)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u00B3/ig, 'pow($1, 3)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2074/ig, 'pow($1, 4)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2075/ig, 'pow($1, 5)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2076/ig, 'pow($1, 6)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2077/ig, 'pow($1, 7)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2078/ig, 'pow($1, 8)'],
                [/((?:[\-+]?[0-9\.]+|\\pi|\\exp1)|(?:\\left\([^\(\)]+\\right\)))\u2079/ig, 'pow($1, 9)']
            ];
            var reponce = [
                [/\\sin\^{-1}|\\arcsin|\\asin/ig, 'asin'],
                [/\\cos\^{-1}|\\arccos|\\acos/ig, 'acos'],
                [/\\tan\^{-1}|\\arctan|\\atan/ig, 'atan'],
                [/(?:\\ans|ans|\\text{ans})\\left\(([0-9]+)\\right\)/ig, 'ans($1, ' + randomName + ')'],
                [/\\sin/ig, 'sin'],
                [/\\cos/ig, 'cos'],
                [/\\tan/ig, 'tan'],
                [/\\ln/ig, 'log'],
                [/\\log/ig, 'logTen'],
                [/\\pi/ig, 'PI'],
                [/\\left\(/ig, '('],
                [/\\right\)/ig, ')'],
                [/(sin|cos|tan)\(([^\^\)]+)\^{\\circ}/ig, '$1($2*PI/180'],
                [/{/ig, '('],
                [/}/ig, ')'],
                [/\)\(/ig, ')*('],
                [/\\cdot/ig, '*'],
                [/\\exp1/ig, 'exp(1)'],
            ]
            var oldexpr = '';
            expression = expression.replace(/,/ig, '.');
            expression = expression.replace(/\\mathrm{e}|\\e|\\text{e}/ig, '\\exp1');
            while (oldexpr !== expression) { oldexpr = expression; for (var i = 0; i < latexrep.length; i++) { expression = expression.replace(latexrep[i][0], latexrep[i][1]); } }
            for (var i = 0; i < reponce.length; i++) { expression = expression.replace(reponce[i][0], reponce[i][1]); }
            var reg = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>^\\?:])/ig;
            var valid = true;
            expression = expression.replace(reg, function(word) {
                if (Math.hasOwnProperty(word)) { return 'Math.' + word; } else if ((word.toLowerCase() == 'x') || (word.toLowerCase() == 'y') || (word.toLowerCase() == 'z') || (word.toLowerCase() == 't')) return word;
                else { valid = false; return word; }
            });
            if (!valid) { throw 'Invalidexpression1'; } else {
                try {
                    expression = mathjs(expression);
                    if (parseOnly) return expression;
                    var s = (new Function('return (' + expression + ')'))();
                    delete Math[randomName];
                    return s;
                } catch (err) { throw 'Invalidexpression2'; }
            }
        }
        var calculate = function(place, inputId, outputId) {
            var str = pruneStr(place.find('#' + inputId).mathquill('latex'));
            var err = "";
            var str2 = str;
            try { var res = latexeval(place, str2); } catch (e) { err = "syntax incomplete"; }
            if (!isNaN(res) && res != "Infinity")
                str2 = (Math.abs(res - Math.round(res * 1000000) / 1000000) < 1e-15 ? Math.round(res * 1000000) / 1000000 : res) + err;
            else if (res == "Infinity") str2 = '\\text{Big enough to be numerically } \\infty \\text{.}';
            else if (str2 != '') str2 = "undefined";
            place.find('#' + outputId).mathquill('revert').empty().html(str2).mathquill();
        }
        var pruneStr = function(str) { return (str.replace(/\\:/ig, '')); }
        var copyToCurrent = function(place, from) {
            var str = from.mathquill('latex');
            var str = str.replace(/\\:/ig, '').replace(/\²/ig, '^2');
            place.find('#in').mathquill('write', str).focus();
        }
        var insert = function(place, st, diff) {
            if (st == "@enterkey") {
                var elemIn = place.find('span#in');
                if (pruneStr(elemIn.mathquill('latex')) != '') {
                    var elemOut = place.find('span#out');
                    var idNum = place.find('div.inOld').length;
                    var ansCount = place.data('ansCount');
                    place.find('div#inCurrent').before('<div class="inOld">' + '<span  id="in-' + idNum + '" class=\"mathquill-embedded-latex\">' + pruneStr(elemIn.mathquill('latex')) + '</span></div>');
                    place.find('div#inCurrent').before('<div class="outOld"><span class="lineId">ans(' + ansCount + ') := </span><span  id="out-' + idNum + '">' + pruneStr(elemOut.mathquill('latex')) + '</span></div>');
                    clearInput(place, false);
                    place.find('span#in-' + idNum).mathquill().click(function() { copyToCurrent(place, $(this)); });
                    place.find('span#out-' + idNum).mathquill().click(function() { copyToCurrent(place, $(this)); });
                    place.data('inp-' + ansCount, pruneStr(place.find('span#in-' + idNum).mathquill('latex')));
                    place.data('ans-' + ansCount, pruneStr(place.find('span#out-' + idNum).mathquill('latex')));
                    place.data('ansCount', ++ansCount);
                }
            } else {
                {
                    var $math_box = place.find('#in');
                    var data = $math_box.data('[[mathquill internal data]]');
                    var block = data && data.block;
                    var cursor = block && block.cursor;
                    var latex = cursor.selection ? cursor.selection.latex() : '';
                    if (st == '\\frac{%1}{}') {
                        if (latex == '' && cursor.prev) latex = cursor.prev.latex();
                        cursor.backspace();
                    } else {
                        if (latex != '') {
                            if ((st == '%1!') || (st == '%1^2') || (st == '%1^'))
                                latex = '\\left(' + latex + '\\right)';
                            diff = (st == '%1^') ? -1 : 0;
                        }
                    }
                    if (st.length === 1) { cursor.write(st); } else { place.find('#in').mathquill('write', st.replace('%1', latex)); }
                    if (diff != 0) {
                        if (diff < 0)
                            for (var i = 0; i < -1 * diff; i++) cursor.moveLeft();
                        else
                            for (var j = 0; i < diff; i++) cursor.moveRight();
                    }
                }
            }
            if (typeof(place.find(".inputDisplay").prop) === "undefined")
                place.find(".inputDisplay").animate({ scrollTop: place.find(".inputDisplay").attr("scrollHeight") }, 100);
            else
                place.find(".inputDisplay").animate({ scrollTop: place.find(".inputDisplay").prop("scrollHeight") }, 100);
            $("#medit textarea").focus();
        }
        var keyUpFunction = function(place) {}
        var clearInput = function(place, allowAll) {
            if ((pruneStr(place.find('#in').mathquill('latex')) == '') && (allowAll)) { place.find('.inOld, .outOld').remove(); } else {
                place.find('#out').mathquill('latex', '');
                place.find('#in').mathquill('latex', '').focus();
            }
        }
        var init = function(place, params) {
            var button_tabs = [{
                name: lang['formula_basics'],
                tabname: "basics",
                example: '+',
                button_groups: [
                    ["subscript", "supscript", "frac", "sqrt", "nthroot", "binomial", "vector", "prime", "langle"],
                    ["+", "-", "pm", "mp", "cdot", "=", "times", "div", "ast"],
                    ["therefore", "because"],
                    ["sum", "prod", "coprod", "int", "forall", "exists", "le", "ge", "in", "notin"],
                    ["N", "P", "Z", "Q", "R", "C", "H"]
                ]
            }, {
                name: lang['formula_greek'],
                tabname: "greek",
                example: '&pi;',
                button_groups: [
                    ["alpha", "beta", "gamma", "delta", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "chi", "psi", "omega"],
                    ["varepsilon", "vartheta", "varpi", "varsigma", "varphi"],
                    ["Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega"],
                    ["digamma", "epsilon", "phi", "varkappa", "varrho"]
                ]
            }, {
                name: lang['formula_operators'],
                tabname: "operators",
                example: '&oplus;',
                button_groups: [
                    ["wedge", "vee", "cup", "cap", "diamond", "bigtriangleup", "otimes", "oplus", "bigtriangledown", "odot", "bigcirc", "dagger", "ddagger"],
                    ["ominus", "uplus", "sqcap", "triangleleft", "sqcup", "triangleright", "wr", "amalg"]
                ]
            }, {
                name: lang['formula_relationships'],
                tabname: "relationships",
                example: '&le;',
                button_groups: [
                    ["<", ">", "equiv", "cong", "sim", "ne", "propto", "approx", "ni", "notni", "subset", "supset", "notsubset", "notsupset", "subseteq", "supseteq", "mid", "ll", "gg", "parallel", "varnothing"],
                    ["notsubseteq", "notsupseteq", "models", "prec", "succ", "preceq", "succeq", "simeq", "bowtie", "sqsubset", "sqsupset", "smile", "sqsubseteq", "sqsupseteq", "doteq", "frown", "vdash", "dashv"]
                ]
            }, {
                name: lang['formula_arrows'],
                tabname: "arrows",
                example: '&hArr;',
                button_groups: [
                    ["leftarrow", "rightarrow", "leftrightarrow", "uparrow", "downarrow", "updownarrow", "mapsto", "nearrow", "hookleftarrow", "hookrightarrow", "searrow", "leftharpoonup", "rightharpoonup", "swarrow", "leftharpoondown", "rightharpoondown", "nwarrow", "leftrightarrow", "Leftarrow", "Rightarrow", "Leftrightarrow", "Uparrow", "Downarrow", "Updownarrow", "leftrightharpoons", "rightleftharpoons"]
                ]
            }, {
                name: lang['formula_delimiters'],
                tabname: "delimiters",
                example: '{',
                button_groups: [
                    ["lfloor", "rfloor", "lceil", "rceil", "slash", "opencurlybrace", "closecurlybrace"]
                ]
            }, {
                name: lang['formula_misc'],
                tabname: "misc",
                example: '&infin;',
                button_groups: [
                    ["dots", "cdots", "vdots", "ddots", "surd", "ell", "flat", "natural", "sharp", "wp", "bot", "clubsuit", "diamondsuit", "heartsuit", "spadesuit", "caret", "underscore", "backslash", "vert", "perp", "nabla", "AA", "bullet", "neg", "Re", "Im", "partial", "infty", "aleph", "deg", "angle"],
                    ["triangle", "top", "hbar", "circ", "setminus"]
                ]
            }, {
                name: lang['formula_mathformat'],
                tabname: "mathformat",
                example: '',
                button_groups: [
                    ["mathrm", "mathit", "mathsf", "mathbf", "mathtt", "underline", "overline", "orange"]
                ]
            }];
            var cursorBack = ["subscript", "supscript", "sqrt", "vector", "mathrm", "mathit", "mathsf", "mathbf", "mathtt", "underline", "overline", "orange"];
            var cursorBackTwice = ["frac", "nthroot", "binomial"];
            var html_template_overrides = { binomial: '<span style="font-size: 0.5em;position:relative;top:-2px"><span class="paren" style="font-size: 2.087912087912088em; ">(</span><span class="array"><span><var>n</var></span><span><var>m</var></span></span><span class="paren" style="font-size: 2.087912087912088em; ">)</span></span>', frac: '<span style="font-size: 0.55em;position:relative;top:-11px;margin-top: 10px;" class="fraction"><span class="numerator"><var>n</var></span><span class="denominator"><var>m</var></span><span style="width:0"></span></span>', sqrt: '<span style="font-size: 0.8em; padding-top: 3px"><span class="sqrt-prefix">&radic;</span><span class="sqrt-stem" style="border-top-width: 1.7142857142857144px;">&nbsp;</span></span>', nthroot: '<span style="font-size: 0.7em"><sup class="nthroot" style="position:relative;top:-2px"><var>n</var></sup><span><span class="sqrt-prefix" style="top:3px">&radic;</span><span class="sqrt-stem" style="border-top-width: 1.7142857142857144px;position:relative;top:-1px">&nbsp;</span></span></span>', supscript: '<sup style="font-size: 0.6em">sup</sup>', subscript: '<sub style="font-size: 0.6em; line-height: 3.5;">sub</sub>', vector: '<span class="array vector"><span class="vectorborder">&nbsp;</span><span class="vectortop">&nbsp;</span><span class="" style="font-size: 0.7em;padding-top: 2px">AB</span></span>', sum: '<big style="position:relative;top:-2px">∑</big>', prod: '<big style="position:relative;top:-2px">∏</big>', mathrm: '<span "font-family: serif" ">Antikva</span>', mathit: '<span style="font-style: italic">Dőlt</span>', mathsf: '<span style="font-family: sans-serif">Groteszk</span>', mathbf: '<span  style="font-weight: bold">Félkövér</span>', mathtt: '<span style="font-family: monospace">Írógép</span>', underline: '<span class="underline">Aláhúzott</span>', overline: '<span class="overline">Felűlhúzott</span>', orange: '<span class="color_orange">Narancs</span>' };
            var tabs = [];
            var panes = [];
            $.each(button_tabs, function(index, tab) {
                tabs.push('<li><a href="#' + tab.tabname + '_tab" onclick="return false">' + tab.name + '</a></li>');
                var buttons = [];
                $.each(tab.button_groups, function(index, group) {
                    $.each(group, function(index, cmd) {
                        var templ = $.getHTMLTemplate(cmd);
                        if (html_template_overrides[cmd]) { templ = html_template_overrides[cmd]; }
                        buttons.push('<li><a title="' + (cmd.match(/^[A-z]+$/) ? '\\' + cmd : cmd) + '" class="btn mathquill-rendered-math">' + templ + '</a></li>');
                    });
                });
                panes.push('<div class="mathquill-tab-pane" id="' + tab.tabname + '_tab"><ul>' + buttons.join('') + '</ul></div>');
            });
            var $this = $(place).addClass('calculator').html('<div class="mathquill-toolbar"><ul class="mathquill-tab-bar">' + tabs.join('') + '</ul><div class="mathquill-toolbar-panes">' + panes.join('') + '</div></div>' + "<div class=\"inputDisplay\">" +
                "<div class=\"calcInput\" id=\"inCurrent\"><span id=\"in\"></span></div>" +
                "<div class=\"calcResult\" id=\"outCurrent\"><span id=\"out\"></span></div>" +
                "</div>");
            $this.find('a.btn').click(function() {
                var diff = 0;
                var cmd = this.getAttribute("title");
                if (cmd.substr(0, 1) == "\\") { cmd = cmd.substr(1); }
                if (cursorBack.indexOf(cmd) >= 0) { diff = -1; }
                if (cursorBackTwice.indexOf(cmd) >= 0) { diff = -2; }
                insert($this, this.getAttribute("title"), diff);
                $("#medit textarea").focus();
            });
            $('.mathquill-tab-bar li a').click(function() {
                $('.mathquill-tab-bar li').removeClass('mathquill-tab-selected');
                $('.mathquill-tab-pane').removeClass('mathquill-tab-pane-selected');
                $(this).parent().addClass('mathquill-tab-selected');
                $(this.href.replace(/.*#/, '#')).addClass('mathquill-tab-pane-selected');
            });
            $('.mathquill-tab-bar li:first-child a').click();
            $("#medit #in").click(function() { $("#medit textarea").focus(); }); {
                $this.find('button').keydown(function(e) {
                    var $math_box = place.find('#in');
                    var data = $math_box.data('[[mathquill internal data]]');
                    var block = data && data.block;
                    var cursor = block && block.cursor;
                    e.ctrlKey = e.ctrlKey || e.metaKey;
                    switch ((e.originalEvent && e.originalEvent.keyIdentifier) || e.which) {
                        case 8:
                        case 'Backspace':
                        case 'U+0008':
                            if (e.ctrlKey)
                                while (cursor.prev || cursor.selection)
                                    cursor.backspace();
                            else
                                cursor.backspace();
                            break;
                    }
                });
            }
            $this.data('ansCount', 0);
            $this.data('buttonIDs', params.buttonIDs);
            $this.find('span#in').mathquill(params.editable ? "editable" : undefined).focus().keyup(function(e) {
                if (e.keyCode == '13' && !(e.shiftKey || e.ctrlKey || e.altKey))
                    $this.find('button#enterBtn').click();
                else keyUpFunction($this);
            });
            var announced = { senderID: $this.attr('id'), fnName: 'calculator' };
            $this.trigger('announce', announced);
        }
    } {
        var methods = {
            'init': function(params) { params = $.extend({ editable: true, buttonIDs: ['piBtn', 'expBtn', 'clearBtn', 'powBtn', 'quadBtn', 'decimalBtn', 'enterBtn', 'addBtn', 'subBtn', 'divBtn', 'sqrtBtn', 'logBtn', 'ansBtn', 'lnBtn', 'arcsinBtn', 'arcCosBtn', 'arctanBtn', 'sinBtn', 'cosBtn', 'tanBtn', 'prodBtn', 'leftParenBtn', 'absBtn', 'factorialBtn', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'], }, params); return this.each(function() { init($(this), params); }); },
            'parse': function(params) { return latexeval($(this), params, true); },
            'calculate': function(params) { return latexeval($(this), params, false); },
            'attachables': function(params) { return [{ 'eventType': 'calculator_press', 'action': 'press' }]; },
            'unittest': function(params) {
                tests = [{ method: 'calculate', clause: '5!', check: function(ans) { return ans == '120'; } }, { method: 'calculate', clause: '1+1', check: function(ans) { return ans == '2'; } }, { method: 'calculate', clause: '1+2+3', check: function(ans) { return ans == '6'; } }, { method: 'calculate', clause: '\\left|-8\\right|', check: function(ans) { return ans == '8'; } }, { method: 'calculate', clause: '1-(3*4)', check: function(ans) { return ans == '-11'; } }, { method: 'calculate', clause: '\\frac{8}{12}', check: function(ans) { return Math.abs(0.66666666 - ans) < 0.00001; } }, { method: 'calculate', clause: '2^2^2', check: function(ans) { return ans == '16'; } }, { method: 'calculate', clause: '\\sin\\left(\\pi\\right)', check: function(ans) { return Math.abs(0 - ans) < 0.00001; } }, { method: 'calculate', clause: '\\sin\\left(\\arccos\\left( 1 \\right)\\right)', check: function(ans) { return Math.abs(0 - ans) < 0.00001; } }, ];
                var total = 0;
                var passed = 0;
                for (i in tests) {
                    var result = methods[tests[i].method](tests[i].clause);
                    var outcome = (result == 'Invalidexpression' ? false : tests[i].check(result));
                    if (!outcome) console.error('Unit test failed for "' + tests[i].clause + '":\n\tGot "' + result + '".')
                    passed += outcome;
                    ++total;
                }
                if (passed == total) { return true; } else { return false; }
            },
            'press': function(params) {
                return this.each(function() {
                    var buttonIDs = $(this).data('buttonIDs');
                    if (buttonIDs.indexOf(params.buttonID) >= 0) {
                        $(this).data('params', params);
                        $(this).find('button#' + params.buttonID).click();
                        $(this).removeData('params');
                    } else console.error('Calculator: Invalid button ID "' + params.buttonID + '".');
                });
            }
        }
        $.fn.calculator = function(method) { if (methods[method]) { return methods[method].apply(this, Array.prototype.slice.call(arguments, 1)); } else if (typeof method === 'object' || !method) { return methods.init.apply(this, arguments); } else { $.error('Method ' + method + ' does not exist on jQuery.calculator'); return false; } }
    }
})(jQuery)
if (typeof config == 'undefined') {
    var config = new Object();
    config.macros = new Object();
}
config.macros.calculator = {
    handler: function(place, macroName, params, wikifier, paramString, tiddler) {
        var calculatordiv = '{{calculator{\n}}}';
        wikify(calculatordiv, place, null, tiddler);
        jQuery(place).find('.calculator').last().calculator('init');
    }
}