(function($, d){
    'use strict';
    var w = this, isMac = w.navigator.platform == 'MacIntel',
        mouseX = 0,
        mouseY = 0,
        cache = {
            command: false,
            shift: false,
            isSelecting: false
        },
        modifiers = {
            66: 'bold',
            73: 'italic',
            85: 'underline',
            112: 'h1',
            113: 'h2',
            122: 'undo'
        },
        options,
        utils = {
            keyboard: {
                isCommand: function(e, callbackTrue, callbackFalse) {
                    if (isMac && e.metaKey || !isMac && e.ctrlKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isShift: function(e, callbackTrue, callbackFalse) {
                    if (e.shiftKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isModifier: function(e, callback) {
                    var key = e.which,
                        cmd = modifiers[key];
                    if (cmd) {
                        callback.call(this, cmd);
                    }
                },
                isEnter: function(e, callback) {
                    if (e.which === 13) {
                        callback();
                    }
                },
                isArrow: function(e, callback) {
                    if (e.which >= 37 || e.which <= 40) {
                        callback();
                    }
                }
            },
            html: {
                addTag: function(elem, tag, focus, editable) {
                    var newElement = $(d.createElement(tag));
                    newElement.attr('contenteditable', Boolean(editable));
                    newElement.append(' ');
                    elem.append(newElement);
                    if (focus) {
                        cache.focusedElement = elem.children().last();
                        utils.cursor.set(elem, 0, cache.focusedElement);
                    }
                    return newElement;
                }
            },
            cursor: {
                set: function(editor, pos, elem) {
                    var range;
                    if (d.createRange) {
                        range = d.createRange();
                        var selection = w.getSelection(),
                            lastChild = editor.children().last(),
                            length = lastChild.html().length - 1,
                            toModify = elem ? elem[0] : lastChild[0],
                            theLength = typeof pos !== 'undefined' ? pos : length;
                        range.setStart(toModify, theLength);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        range = d.body.createTextRange();
                        range.moveToElementText(elem);
                        range.collapse(false);
                        range.select();
                    }
                }
            },
            selection: {
                save: function() {
                    if (w.getSelection) {
                        var sel = w.getSelection();
                        if (sel.rangeCount > 0) {
                            return sel.getRangeAt(0);
                        }
                    } else if (d.selection && d.selection.createRange) { // IE
                        return d.selection.createRange();
                    }
                    return null;
                },
                restore: function(range) {
                    if (range) {
                        if (w.getSelection) {
                            var sel = w.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } else if (d.selection && range.select) { // IE
                            range.select();
                        }
                    }
                },
                getText: function() {
                    var txt = '';
                    if (w.getSelection) {
                        txt = w.getSelection().toString();
                    } else if (d.getSelection) {
                        txt = d.getSelection().toString();
                    } else if (d.selection) {
                        txt = d.selection.createRange().text;
                    }
                    return txt;
                },
                clear: function() {
                    if (w.getSelection) {
                        if (w.getSelection().empty) { // Chrome
                            w.getSelection().empty();
                        } else if (w.getSelection().removeAllRanges) { // Firefox
                            w.getSelection().removeAllRanges();
                        }
                    } else if (document.selection) { // IE?
                        document.selection.empty();
                    }
                },
                getContainer: function(sel) {
                    if (w.getSelection && sel && sel.commonAncestorContainer) {
                        return sel.commonAncestorContainer;
                    } else if (d.selection && sel && sel.parentElement) {
                        return sel.parentElement();
                    }
                    return null;
                },
                getSelection: function() {
                    if (w.getSelection) {
                        return w.getSelection();
                    } else if (d.selection && d.selection.createRange) { // IE
                        return d.selection;
                    }
                    return null;
                }
            },
            validation: {
                isUrl: function(url) {
                    return (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/).test(url);
                }
            }
        },
        bubble = {
            /*
             * This is called to position the bubble above the selection.
             */
            updatePos: function(editor, elem) {
                var sel = w.getSelection(),
                    range = sel.getRangeAt(0),
                    boundary = range.getBoundingClientRect(),
                    bubbleWidth = elem.width(),
                    bubbleHeight = elem.height(),
                    offset = editor.offset().left,
                    pos = {
                        x: (boundary.left + boundary.width / 2) - (bubbleWidth / 2),
                        y: boundary.top - bubbleHeight - 8 + $(document).scrollTop()
                    };
                transform.translate(elem, pos.x, pos.y);
            },
            /*
             * Updates the bubble to set the active formats for the current selection.
             */
            updateState: function(editor, elem) {
                elem.find('button').removeClass('active');
                var sel = w.getSelection(),
                    formats = [];
                bubble.checkForFormatting(sel.focusNode, formats);
                var formatDict = {
                    'b': 'bold',
                    'i': 'italic',
                    'u': 'underline',
                    'h1': 'h1',
                    'h2': 'h2',
                    'a': 'anchor',
                    'ul': 'ul',
                    'ol': 'ol'
                };
                for (var i = 0; i < formats.length; i++) {
                    var format = formats[i];
                    elem.find('button.' + formatDict[format]).addClass('active');
                }
            },
            /*
             * Recursively navigates upwards in the DOM to find all the format
             * tags enclosing the selection.
             */
            checkForFormatting: function(currentNode, formats) {
                var validFormats = ['b', 'i', 'u', 'h1', 'h2', 'ol', 'ul', 'li', 'a'];
                if (currentNode.nodeName === '#text' ||
                    validFormats.indexOf(currentNode.nodeName.toLowerCase()) != -1) {
                    if (currentNode.nodeName != '#text') {
                        formats.push(currentNode.nodeName.toLowerCase());
                    }
                    bubble.checkForFormatting(currentNode.parentNode, formats);
                }
            },
            buildMenu: function(editor, elem) {
                var ul = utils.html.addTag(elem, 'ul', false, false);
                for (var cmd in options.modifiers) {
                    var li = utils.html.addTag(ul, 'li', false, false);
                    var btn = utils.html.addTag(li, 'button', false, false);
                    btn.attr('editor-command', options.modifiers[cmd]);
                    btn.addClass(options.modifiers[cmd]);
                }
                elem.find('button').click(function(e) {
                    e.preventDefault();
                    var cmd = $(this).attr('editor-command');
                    events.commands[cmd].call(editor, e);
                });
                var linkArea = utils.html.addTag(elem, 'div', false, false);
                linkArea.addClass('link-area');
                var linkInput = utils.html.addTag(linkArea, 'input', false, false);
                linkInput.attr({
                    type: 'text'
                });
                var closeBtn = utils.html.addTag(linkArea, 'button', false, false);
                closeBtn.click(function(e) {
                    e.preventDefault();
                    var editor = $(this).closest('.editor');
                    $(this).closest('.link-area').hide();
                    $(this).closest('.bubble').find('ul').show();
                });
            },
            show: function() {
                var tag = $(this).parent().find('.bubble');
                if (!tag.length) {
                    tag = utils.html.addTag($(this).parent(), 'div', false, false);
                    tag.addClass('rich-text-popup bubble');
                }
                tag.empty();
                bubble.buildMenu(this, tag);
                tag.show();
                bubble.updateState(this, tag);
                if (!tag.hasClass('active')) {
                    tag.addClass('jump');
                } else {
                    tag.removeClass('jump');
                }
                bubble.updatePos($(this), tag);
                tag.addClass('active');
            },
            update: function() {
                var tag = $(this).parent().find('.bubble');
                bubble.updateState(this, tag);
            },
            clear: function() {
                var elem = $(this).parent().find('.bubble');
                if (!elem.hasClass('active')) return;
                elem.removeClass('active');
                bubble.hideLinkInput.call(this);
                bubble.showButtons.call(this);
                setTimeout(function() {
                    if (elem.hasClass('active')) return;
                    elem.hide();
                }, 500);
            },
            hideButtons: function() {
                $(this).parent().find('.bubble').find('ul').hide();
            },
            showButtons: function() {
                $(this).parent().find('.bubble').find('ul').show();
            },
            showLinkInput: function(selection) {
                bubble.hideButtons.call(this);
                var editor = this;
                var elem = $(this).parent().find('.bubble').find('input[type=text]');
                var hasLink = elem.closest('.rich-text-popup').find('button.anchor').hasClass('active');
                elem.unbind('keydown');
                elem.keydown(function(e) {
                    var elem = $(this);
                    utils.keyboard.isEnter(e, function() {
                        e.preventDefault();
                        var url = elem.val();
                        if (utils.validation.isUrl(url)) {
                            e.url = url;
                            events.commands.createLink(e, selection);
                            bubble.clear.call(editor);
                        } else if (url === '' && hasLink) {
                            events.commands.removeLink(e, selection);
                            bubble.clear.call(editor);
                        }
                    });
                });
                elem.bind('paste', function(e) {
                    var elem = $(this);
                    setTimeout(function() {
                        var text = elem.val();
                        if (/http:\/\/https?:\/\//.test(text)) {
                            text = text.substring(7);
                            elem.val(text);
                        }
                    }, 1);
                });
                var linkText = 'http://';
                if (hasLink) {
                    var anchor = $(utils.selection.getContainer(selection)).closest('a');
                    linkText = anchor.prop('href') || linkText;
                }
                $(this).parent().find('.link-area').show();
                elem.val(linkText).focus();
            },
            hideLinkInput: function() {
                $(this).parent().find('.bubble').find('.link-area').hide();
            }
        },
        actions = {
            bindEvents: function(elem) {
                elem.keydown(rawEvents.keydown);
                elem.keyup(rawEvents.keyup);
                elem.focus(rawEvents.focus);
                elem.bind('paste', events.paste);
                elem.mousedown(rawEvents.mouseClick);
                elem.mouseup(rawEvents.mouseUp);
                elem.mousemove(rawEvents.mouseMove);
                elem.blur(rawEvents.blur);
                $('body').mouseup(function(e) {
                    if (e.target == e.currentTarget && cache.isSelecting) {
                        rawEvents.mouseUp.call(elem, e);
                    }
                });
            },
            setPlaceholder: function(e) {
                if (/^\s*$/.test($(this).text())) {
                    $(this).empty();
                    var placeholder = utils.html.addTag($(this), 'p').addClass('placeholder');
                    placeholder.append($(this).attr('editor-placeholder'));
                    utils.html.addTag($(this), 'p', typeof e.focus != 'undefined' ? e.focus : false, true);
                } else {
                    $(this).find('.placeholder').remove();
                }
            },
            removePlaceholder: function(e) {
                $(this).find('.placeholder').remove();
            },
            preserveElementFocus: function() {
                var anchorNode = w.getSelection() ? w.getSelection().anchorNode : d.activeElement;
                if (anchorNode) {
                    var current = anchorNode.parentNode,
                        diff = current !== cache.focusedElement,
                        children = this.children,
                        elementIndex = 0;
                    if (current === this) {
                        current = anchorNode;
                    }
                    for (var i = 0; i < children.length; i++) {
                        if (current === children[i]) {
                            elementIndex = i;
                            break;
                        }
                    }
                    if (diff) {
                        cache.focusedElement = current;
                        cache.focusedElementIndex = elementIndex;
                    }
                }
            },
            setContentArea: function(elem) {
                var id = $('body').find('.jquery-editor').length + 1,
                body = $('body'),
                contentArea = $('<textarea></textarea>');
                elem.attr('data-rich-text-popup-id', id);
                contentArea.css({
                    position: 'absolute',
                    left: -1000
                });
                contentArea.attr('id', 'rich-text-popup-content-' + id);
                body.append(contentArea);
            },
            prepare: function(elem, customOptions) {
                options = customOptions;
                actions.setContentArea(elem);
                elem.attr('editor-mode', options.mode);
                elem.attr('editor-placeholder', options.placeholder);
                elem.attr('contenteditable', true);
                elem.css('position', 'relative');
                elem.addClass('rich-text-popup editor');
                actions.setPlaceholder.call(elem, {});
                actions.preserveElementFocus.call(elem);
                if (options.autoFocus === true) {
                    var firstP = elem.find('p:not(.placeholder)');
                    utils.cursor.set(elem, 0, firstP);
                }
            }
        },
        rawEvents = {
            keydown: function(e) {
                var elem = this;
                if (cache.command && e.which === 65) {
                    setTimeout(function() {
                        bubble.show.call(elem);
                    }, 50);
                }
                utils.keyboard.isCommand(e, function() {
                    cache.command = true;
                }, function() {
                    cache.command = false;
                });
                utils.keyboard.isShift(e, function() {
                    cache.shift = true;
                }, function() {
                    cache.shift = false;
                });
                utils.keyboard.isModifier.call(this, e, function(modifier) {
                    if (cache.command) {
                        events.commands[modifier].call(this, e);
                    }
                });

                if (cache.shift) {
                    utils.keyboard.isArrow.call(this, e, function() {
                        setTimeout(function() {
                            var txt = utils.selection.getText();
                            if (txt !== '') {
                                bubble.show.call(elem);
                            } else {
                                bubble.clear.call(elem);
                            }
                        }, 100);
                    });
                } else {
                    utils.keyboard.isArrow.call(this, e, function() {
                        bubble.clear.call(elem);
                    });
                }

                if (e.which === 13) {
                    events.enterKey.call(this, e);
                }
                if (e.which === 27) {
                    bubble.clear.call(this);
                }
                if (e.which === 86 && cache.command) {
                    events.paste.call(this, e);
                }
                if (e.which === 90 && cache.command) {
                    events.commands.undo.call(this, e);
                }
            },
            keyup: function(e) {
                utils.keyboard.isCommand(e, function() {
                    cache.command = false;
                }, function() {
                    cache.command = true;
                });
                actions.preserveElementFocus.call(this);
                actions.removePlaceholder.call(this);

                /*
                 * This breaks the undo when the whole text is deleted but so far
                 * it is the only way that I fould to solve the more serious bug
                 * that the editor was losing the p elements after deleting the whole text
                 */
                if (/^\s*$/.test($(this).text())) {
                    $(this).empty();
                    utils.html.addTag($(this), 'p', true, true);
                }
                events.change.call(this);
            },
            focus: function(e) {
                cache.command = false;
                cache.shift = false;
            },
            mouseClick: function(e) {
                var elem = this;
                cache.isSelecting = true;
                if ($(this).parent().find('.bubble:visible').length) {
                    var bubbleTag = $(this).parent().find('.bubble:visible'),
                        bubbleX = bubbleTag.offset().left,
                        bubbleY = bubbleTag.offset().top,
                        bubbleWidth = bubbleTag.width(),
                        bubbleHeight = bubbleTag.height();
                    if (mouseX > bubbleX && mouseX < bubbleX + bubbleWidth &&
                        mouseY > bubbleY && mouseY < bubbleY + bubbleHeight) {
                        return;
                    }
                }
            },
            mouseUp: function(e) {
                var elem = this;
                cache.isSelecting = false;
                setTimeout(function() {
                    var s = utils.selection.save();
                    if (s) {
                        if (s.collapsed) {
                            bubble.clear.call(elem);
                        } else {
                            bubble.show.call(elem);
                            e.preventDefault();
                        }
                    }
                }, 50);
            },
            mouseMove: function(e) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            },
            blur: function(e) {
                actions.setPlaceholder.call(this, {
                    focus: false
                });
            }
        },
        events = {
            commands: {
                bold: function(e) {
                    e.preventDefault();
                    d.execCommand('bold', false);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                italic: function(e) {
                    e.preventDefault();
                    d.execCommand('italic', false);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                underline: function(e) {
                    e.preventDefault();
                    d.execCommand('underline', false);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                anchor: function(e) {
                    e.preventDefault();
                    var s = utils.selection.save();
                    bubble.showLinkInput.call(this, s);
                    events.change.call(this);
                },
                createLink: function(e, s) {
                    utils.selection.restore(s);
                    d.execCommand('createLink', false, e.url);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                removeLink: function(e, s) {
                    var el = $(utils.selection.getContainer(s)).closest('a');
                    el.contents().first().unwrap();
                    events.change.call(this);
                },
                h1: function(e) {
                    e.preventDefault();
                    if ($(w.getSelection().anchorNode.parentNode).is('h1')) {
                        d.execCommand('formatBlock', false, '<p>');
                    } else {
                        d.execCommand('formatBlock', false, '<h1>');
                    }
                    bubble.update.call(this);
                    events.change.call(this);
                },
                h2: function(e) {
                    e.preventDefault();
                    if ($(w.getSelection().anchorNode.parentNode).is('h2')) {
                        d.execCommand('formatBlock', false, '<p>');
                    } else {
                        d.execCommand('formatBlock', false, '<h2>');
                    }
                    bubble.update.call(this);
                    events.change.call(this);
                },
                ul: function(e) {
                    e.preventDefault();
                    d.execCommand('insertUnorderedList', false);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                ol: function(e) {
                    e.preventDefault();
                    d.execCommand('insertOrderedList', false);
                    bubble.update.call(this);
                    events.change.call(this);
                },
                undo: function(e) {
                    e.preventDefault();
                    d.execCommand('undo', false);
                    var sel = w.getSelection(),
                        range = sel.getRangeAt(0),
                        boundary = range.getBoundingClientRect();
                    $(document).scrollTop($(document).scrollTop() + boundary.top);
                    events.change.call(this);
                }
            },
            enterKey: function(e) {
                if ($(this).attr('editor-mode') === 'inline') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                var sel = utils.selection.getSelection();
                var elem = $(sel.focusNode.parentElement);
                var nextElem = elem.next();
                if(!nextElem.length && elem.prop('tagName') != 'LI') {
                    var tagName = elem.prop('tagName');
                    if(tagName === 'OL' || tagName === 'UL') {
                        var lastLi = elem.children().last();
                        if(lastLi.length && lastLi.text() === '') {
                            lastLi.remove();
                        }
                    }
                    utils.html.addTag($(this), 'p', true, true);
                    e.preventDefault();
                    e.stopPropagation();
                }
                events.change.call(this);
            },
            paste: function(e) {
                var elem = $(this),
                    id = 'jqeditor-temparea',
                    range = utils.selection.save(),
                    tempArea = $('#' + id);
                if (tempArea.length < 1) {
                    var body = $('body');
                    tempArea = $('<textarea></textarea>');
                    tempArea.css({
                        position: 'absolute',
                        left: -1000
                    });
                    tempArea.attr('id', id);
                    body.append(tempArea);
                }
                tempArea.focus();

                setTimeout(function() {
                    var clipboardContent = '',
                        paragraphs = tempArea.val().split('\n');
                    for(var i = 0; i < paragraphs.length; i++) {
                        clipboardContent += ['<p>', paragraphs[i], '</p>'].join('');
                    }
                    tempArea.val('');
                    utils.selection.restore(range);
                    d.execCommand('delete');
                    d.execCommand('insertHTML', false, clipboardContent);
                    events.change.call(this);
                }, 500);
            },
            change: function(e) {
                var contentArea = $('#rich-text-popup-content-' + $(this).attr('data-rich-text-popup-id'));
                contentArea.val($(this).html());
                var content = contentArea.val();
                var changeEvent = new CustomEvent('contentChange', { 'detail': { 'content' : content }});
                this.dispatchEvent(changeEvent);
            }
        },
        transform = (function() {
        var matrixToArray = function(str) {
            if (!str || str == 'none') {
                return [1, 0, 0, 1, 0, 0];
            }
            return str.match(/(-?[0-9\.]+)/g);
        };

        var getPreviousTransforms = function(elem) {
            return elem.css('-webkit-transform') || elem.css('transform') || elem.css('-moz-transform') ||
                elem.css('-o-transform') || elem.css('-ms-transform');
        };

        var getMatrix = function(elem) {
            var previousTransform = getPreviousTransforms(elem);
            return matrixToArray(previousTransform);
        };

        var applyTransform = function(elem, transform) {
            elem.css('-webkit-transform', transform);
            elem.css('-moz-transform', transform);
            elem.css('-o-transform', transform);
            elem.css('-ms-transform', transform);
            elem.css('transform', transform);
        };

        var buildTransformString = function(matrix) {
            return 'matrix(' + matrix[0] +
                ', ' + matrix[1] +
                ', ' + matrix[2] +
                ', ' + matrix[3] +
                ', ' + matrix[4] +
                ', ' + matrix[5] + ')';
        };

        var getTranslate = function(elem) {
            var matrix = getMatrix(elem);
            return {
                x: parseInt(matrix[4]),
                y: parseInt(matrix[5])
            };
        };

        var scale = function(elem, _scale) {
            var matrix = getMatrix(elem);
            matrix[0] = matrix[3] = _scale;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var translate = function(elem, x, y) {
            var matrix = getMatrix(elem);
            matrix[4] = x;
            matrix[5] = y;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var rotate = function(elem, deg) {
            var matrix = getMatrix(elem);
            var rad1 = deg * (Math.PI / 180);
            var rad2 = rad1 * -1;
            matrix[1] = rad1;
            matrix[2] = rad2;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        return {
            scale: scale,
            translate: translate,
            rotate: rotate,
            getTranslate: getTranslate
        };
    })();
    $.createTemplate = function (me, opt) {
        var dt = {
            version: '0.1',
            obj: {
                $me: $(me),
                $container: null,
                $toolbar: null,
                $themeBtn: null,
                $addBtn: null,
                $saveBtn: null,
                $editBtn: null,
                $previewBtn: null,
                $deleteBtn: null,
                $upBtn: null,
                $downBtn: null,
                $noTemplateMsg: null,
                $templateDropdown: null,
                $template: $(),
                $allRichText: $(),
                $allRichImage: $()
            },
            count: 0,
            id: {
                templateBtn : 'template_menu'
            },
            cons: {
                col: 12
            },
            cl: {
                container: 'container',
                row: 'row',
                col: opt.col || 'col-md-',
                toolbar: 'dt-toolbar',
                previewRichImage: 'preview-rich-img',
                previewText: 'preview-text',
                template: 'template-container',
                prevTemplate: 'prev-template'
            },
            templates: {
                t1: {
                    name: 'Template 1',
                    template: [
                        [
                            {
                                type: 'text',
                                html: null,
                                col: 12
                            }
                        ]
                    ],
                    addMore: false
                },
                t2: {
                    name: 'Template 2',
                    template: [
                        [
                            {
                                type: 'image',
                                path: null,
                                col: 12
                            },
                            {
                                type: 'text',
                                html: null,
                                col: 12
                            }
                        ]
                    ],
                    addMore: false
                },
                t3: {
                    name: 'Template 3',
                    template: [
                        [
                            {
                                type: 'image',
                                path: null,
                                col: 4,
                            },
                            {
                                type: 'text',
                                html: null,
                                col: 8
                            }
                        ]
                    ],
                    addMore: true
                }
            },
            func:{
                init: function () {
                    opt.data = opt.data || [];
                    dt.func.createContainer();
                    dt.func.createToolbar();
                    dt.func.createRows();
                },
                createContainer: function () {
                    dt.obj.$container = $('<div></div>').addClass(dt.cl.container).appendTo(dt.obj.$me);
                },
                createRows: function () {
                    var msg = null;
                    if (dt.templates.hasOwnProperty(opt.template)) {
                        if (opt.recreate) {
                            opt.data = dt.templates[opt.template].template;
                        }
                        var i = 0, l = opt.data.length;
                        if (l > 0) {
                            for (; i < l; i++) {
                                dt.func.createRow(i);
                            }
                        }
                        else {
                            msg = 'Template data doesn\'t exist, Please choose a template then store template data';
                            dt.obj.$templateDropdown.find('>li.active').removeClass('active');
                            opt.template = null;
                        }
                    }
                    else {
                        msg = 'No template selected, Please choose a template.';
                    }
                    if (null !== msg) {
                        var $row = $('<div></div>'), $col = $('<div></div>');
                        dt.obj.$addBtn.attr('disabled', 'disabled').addClass('disabled');
                        dt.obj.$noTemplateMsg = $('<p></p>').addClass('center-text').text(msg).appendTo($col.appendTo($row));
                        $row.appendTo(dt.obj.$container);
                    }
                },
                createRow: function (ind) {
                    var template = $.extend(true, [], opt.data[ind]), i = 0, j, ln = template.length, $template, $row, $col, col, colCount, $div;
                    // Set no template exit message null
                    dt.obj.$noTemplateMsg = null;
                    
                    $template = $('<div></div>').addClass(dt.cl.template);
                    // create rich text or image
                    
                    col = template;
                    colCount = col.length;
                    $row = $('<div></div>').addClass(dt.cl.row);
                    for (j = 0;j<colCount;j++) {
                        $col = $('<div></div>').addClass(dt.cl.col + col[j]['col']);
                        $div = $('<div></div>');
                        if (col[j]['type'] == 'text') {
                            $div.data('index',j);
                            $div.html(col[j]['html']);
                            $div.richText();
                            dt.obj.$allRichText = dt.obj.$allRichText.add($div);
                        }
                        else if (col[j]['type'] == 'image') {
                            $div.data('index',j);
                            $div.richImage($.extend({
                                images: opt.images
                            },col[j]));
                            dt.obj.$allRichImage = dt.obj.$allRichImage.add($div);
                        }
                        $div.appendTo($col);
                        $col.appendTo($row);
                    }
                    $row.appendTo($template);
                    
                    // add template options to move and delete template
                    dt.func.templateOption().appendTo($template);

                    // disable and enable add button
                    if (dt.templates[opt.template].addMore){
                        dt.obj.$addBtn.removeAttr('disabled').removeClass('disabled');
                        dt.obj.$upBtn.removeAttr('disabled').removeClass('disabled');
                        dt.obj.$downBtn.removeAttr('disabled').removeClass('disabled');
                    }
                    else {
                        dt.obj.$addBtn.attr('disabled', 'disabled').addClass('disabled');
                        dt.obj.$upBtn.attr('disabled', 'disabled').addClass('disabled');
                        dt.obj.$downBtn.attr('disabled', 'disabled').addClass('disabled');
                    }

                    // append template into dom
                    $template.data('dt', template);
                    $template.appendTo(dt.obj.$container);
                    dt.obj.$template = dt.obj.$template.add($template);
                    dt.count++;
                },
                createToolbar: function () {
                    var $row = $('<div></div>').addClass(dt.cl.row),
                    $col = $('<div></div>').addClass(dt.cl.col + '12'),
                    $div = $('<div></div>').addClass(dt.cl.toolbar);
                    dt.func.toolbarBtn($div);
                    $div.appendTo($col.appendTo($row.appendTo(dt.obj.$container)));
                    dt.obj.$toolbar = $row;
                },
                templateOption: function() {
                    var $div = $('<div class="template-option dt-toolbar"></div>'), $ul = $('<ul></ul>'), $li, $btn;

                    // delete button
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Delete').click(function(e){
                        dt.evnt.deleteTemplate(e, this);
                    });
                    $('<i></i>').addClass('fa fa-trash').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$deleteBtn = $btn;

                    // up button
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Move Up').click(function(e){
                        dt.evnt.moveUp(e, this);
                    });
                    $('<i></i>').addClass('fa fa-arrow-circle-up').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$upBtn = $btn;

                    //down button
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Move Down').click(function(e){
                        dt.evnt.moveDown(e, this);
                    });
                    $('<i></i>').addClass('fa fa-arrow-circle-down').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$downBtn = $btn;

                    $ul.appendTo($div);

                    return $div;
                },
                toolbarBtn: function ($div) {
                    var $ul = $('<ul></ul>'), $li, $btn;

                    // themes
                    $li = $('<li></li>').addClass('dropdown');
                    $btn = $('<button></button>').attr({
                        title: 'Change Template',
                        id: dt.id.templateBtn,
                        'data-toggle':'dropdown'
                    });
                    $('<i></i>').addClass('fa fa-tumblr').appendTo($btn);
                    dt.func.templateDropdown().appendTo($li);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$themeBtn = $btn;

                    // add
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Add More').click(function(e) {
                        dt.evnt.addMore(e, this);
                    });
                    $('<i></i>').addClass('fa fa-plus').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$addBtn = $btn;

                    // save
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Save').click(function(e) {
                        dt.evnt.saveData(e, this);
                    });
                    $('<i></i>').addClass('fa fa-save').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$saveBtn = $btn;

                    // edit
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Edit').click(function(e) {
                        dt.evnt.editTemplate(e, this);
                    }).hide();
                    $('<i></i>').addClass('fa fa-pencil').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$editBtn = $btn;

                    // preview
                    $li = $('<li></li>');
                    $btn = $('<button></button>').attr('title', 'Preview').click(function(e) {
                        dt.evnt.previewTemplate(e, this);
                    });
                    $('<i></i>').addClass('fa fa-eye').appendTo($btn);
                    $btn.appendTo($li);
                    $li.appendTo($ul);
                    dt.obj.$previewBtn = $btn;

                    $ul.appendTo($div);
                },
                templateDropdown: function() {
                    var $ul = $('<ul></ul>').addClass('dropdown-menu').attr({
                        'role': 'menu',
                        'aria-labelledby': dt.id.templateBtn,

                    }), $li, $a , tmp;

                    for (tmp in dt.templates) {
                        $li = $('<li></li>').attr('role', 'presentation').addClass(opt.template == tmp ? 'active' : '');
                        $a = $('<a></a>').attr({
                            role: 'menuitem',
                            tabindex: '-1',
                            href:'#'
                        }).data('template', tmp).html(dt.templates[tmp].name).click(function(e) {
                            dt.evnt.changeTemplate(e, this);
                        });
                        $a.appendTo($li);
                        $li.appendTo($ul);
                    };
                    dt.obj.$templateDropdown = $ul;
                    return $ul;
                },
                destroyTemplate: function () {
                    dt.obj.$me.empty();
                    dt.count = 0;
                    //opt.data = [];
                },
                previewRichImage: function () {
                    dt.obj.$allRichImage.addClass(dt.cl.previewRichImage)
                },
                previewRichText: function () {
                    dt.obj.$allRichText.find('p').removeAttr('contenteditable');
                    dt.obj.$allRichText.removeAttr('contenteditable');
                    dt.obj.$allRichText.addClass('preview-text');
                },
                previewOption: function() {
                    dt.obj.$themeBtn.hide();
                    dt.obj.$addBtn.hide();
                    dt.obj.$saveBtn.hide();
                    dt.obj.$editBtn.show();
                    dt.obj.$previewBtn.hide();
                    dt.obj.$toolbar.addClass('fixed-bar');
                    dt.obj.$noTemplateMsg && dt.obj.$noTemplateMsg.hide();
                    dt.obj.$template.addClass(dt.cl.prevTemplate);
                },
                editRichImage: function () {
                    dt.obj.$allRichImage.removeClass(dt.cl.previewRichImage)
                },
                editRichText: function () {
                    dt.obj.$allRichText.find('p').attr('contenteditable', true);
                    dt.obj.$allRichText.attr('contenteditable', true);
                    dt.obj.$allRichText.removeClass('preview-text');
                },
                editOption: function () {
                    dt.obj.$themeBtn.show();
                    dt.obj.$addBtn.show();
                    dt.obj.$saveBtn.show();
                    dt.obj.$editBtn.hide();
                    dt.obj.$previewBtn.show();
                    dt.obj.$toolbar.removeClass('fixed-bar');
                    dt.obj.$noTemplateMsg && dt.obj.$noTemplateMsg.show();
                    dt.obj.$template.removeClass(dt.cl.prevTemplate);
                },
                moveUp: function ($me) {
                    if (dt.count > 0) {
                        var $current = $me.parents('.' + dt.cl.template),
                        $prev = $current.prev('.' + dt.cl.template);
                        $prev && $current.insertBefore($prev);
                    }
                },
                moveDown: function ($me) {
                    if (dt.count > 0) {
                        var $current = $me.parents('.' + dt.cl.template),
                        $next = $current.next('.' + dt.cl.template);
                        $next && $current.insertAfter($next);
                    }
                },
                destroyRow: function ($me) {
                    var $current = $me.parents('.' + dt.cl.template);
                    $current && $current.remove();
                    dt.count--;
                    if (dt.count == 0) {
                        opt.template = null;
                        opt.recreate = false;
                        dt.obj.$templateDropdown.find('>li.active').removeClass('active');
                        opt.data = [];
                        dt.func.createRows();
                    }
                }
            },
            evnt:{
                changeTemplate: function (e, me) {
                    e.preventDefault();
                    var template = $(me).data('template');
                    dt.func.destroyTemplate();
                    dt.obj.$me.dynamicTemplate($.extend(opt, {
                        template: template,
                        recreate: true
                    }));
                },
                addMore: function (e, me) {
                    opt.data.push($.extend(true, [], dt.templates[opt.template].template[0]));
                    dt.func.createRow(opt.data.length - 1);
                },
                previewTemplate: function (e, me) {
                    dt.func.previewRichImage();
                    dt.func.previewRichText();
                    dt.func.previewOption();
                },
                editTemplate: function (e, me) {
                    dt.func.editRichImage();
                    dt.func.editRichText();
                    dt.func.editOption();
                },
                moveUp: function (e, me) {
                    dt.func.moveUp($(me));
                },
                moveDown: function (e, me) {
                    dt.func.moveDown($(me));
                },
                deleteTemplate: function (e, me) {
                    dt.func.destroyRow($(me));
                },
                saveData: function (e, me) {
                    var $allTemplate = dt.obj.$me.find('.' + dt.cl.template), i =0 , ln = $allTemplate.length, data = [], 
                        $currentTemplate, $richText, $richTextClone;
                    for (; i < ln; i++) {
                        $currentTemplate = $allTemplate.eq(i);
                        data[i] = $currentTemplate.data('dt');
                        $richText = $currentTemplate.find('.rich-text-popup');
                        $richTextClone = $richText.clone();
                        $richTextClone.find('p.placeholder').remove();
                        $richTextClone.find('p').removeAttr('contenteditable');
                        data[i][$richText.data('index')].html = $richTextClone.html();
                    }
                    console.log(data);
                }
            }
        };
        dt.func.init();
    }
    $.createImage = function (me, opt) {
        var ri = {
            version: '0.1',
            obj: {
                $me: $(me),
                $image: null,
                $toolbar: null,
                $chooseImage: null,
                $sBox: $(),
                $selectBtn: null
            },
            cl: {
                main: 'rich-img',
                imgBtn: 'img-btn',
                toolbar: 'rich-img-toolbar',
                noImgText: 'no-img-text',
                chooseImage: 'choose-img',
                chooseImageBox: 'choose-img-box',
                chooseImageSBox: 'choose-img-sbox',
                selectImageSBox: 'select',
                chooseImageBtn: 'choose-img-btn',
                img: 'image'
            },
            val: {
                selectedImage: null
            },
            func:{
                init: function () {
                    ri.func.prepare();
                },
                prepare: function () {
                    ri.obj.$me.addClass(ri.cl.main).resizable({
                        handles: 's',
                        start: function(e, ui) {
                            //alert('resizing started');
                        },
                        resize: function(e, ui) {

                        },
                        stop: function(e, ui) {
                            //alert('resizing stopped');
                        }
                    });
                    if (opt.path) {
                        ri.func.imageContainer().appendTo(ri.obj.$me);
                    }
                    else {
                        ri.func.noImageMsg().appendTo(ri.obj.$me);
                    }
                    ri.func.imageToolbar().appendTo(ri.obj.$me);
                },
                noImageMsg: function () {
                    var $div = $('<p></p>').addClass(ri.cl.noImgText).text(opt.noImageText);
                    ri.obj.$image = $div;
                    return $div;
                },
                imageToolbar: function () {
                    var $div = $('<div></div>').addClass(ri.cl.toolbar);
                    ri.func.chooseImgBtn().appendTo($div);
                    ri.obj.$toolbar = $div;
                    return $div;
                },
                chooseImgBtn: function () {
                    var $div = $('<div></div>').addClass(ri.cl.imgBtn).attr('title', 'Choose Image');
                    $('<i></i>').addClass('fa fa-image fa-1').appendTo($div);
                    $div.click(function(e) {
                        ri.evnt.chooseImage(e, this);
                    });
                    return $div;
                },
                imageContainer: function () {
                    var $div = $('<div></div>').css({
                        'top': opt.x,
                        'left': opt.y,
                        'height': opt.height,
                        'width': opt.width
                    }).draggable().resizable();
                    $('<img/>').css({
                        'height': '100%',
                        'width': '100%'
                    }).attr({'src': opt.path}).addClass(ri.cl.img).appendTo($div);
                    ri.obj.$image = $div;
                    return $div;
                },
                createImageContainer: function() {
                    var $div = $('<div></div>'), $p, $box, $sBox, i = 0, ln = opt.images.length;
                    $div.addClass(ri.cl.chooseImage);

                    // body of the choose image
                    $box = $('<div></div>').addClass(ri.cl.chooseImageBox).bind( 'mousewheel DOMMouseScroll', function ( e ) {
                        var e0 = e.originalEvent,
                        delta = e0.wheelDelta || -e0.detail;

                        this.scrollTop += ( delta < 0 ? 1 : -1 ) * 30;
                        e.preventDefault();
                    });
                    ri.obj.$sBox = $();
                    for (; i < ln; i++) {
                        $sBox = $('<div></div>').addClass(ri.cl.chooseImageSBox).data('path', opt.images[i].path);
                        $('<img/>').attr('src',opt.images[i].path).appendTo($('<div></div>').appendTo($sBox));
                        $('<p></p>').text(opt.images[i].name).appendTo($sBox);
                        ri.obj.$sBox = ri.obj.$sBox.add($sBox);
                        $sBox.click(function(e) {
                            ri.evnt.clickOnImage(e, this);
                        }).appendTo($box);
                    }
                    $box.appendTo($div);

                    // footer of the choose image
                    $p = $('<p></p>').addClass(ri.cl.chooseImageBtn);
                    ri.obj.$selectBtn = $('<button></button>').addClass('btn btn-success disabled').attr('disabled', 'disabled').text('Select').click(function(e) {
                        ri.evnt.selectChooseImage(e, this);
                    }).appendTo($p);
                    $('<button></button>').addClass('btn  btn-default').text('Cancel').click(function(e) {
                        ri.evnt.cancelChooseImage(e, this);
                    }).appendTo($p);
                    $p.appendTo($div);
                    ri.obj.$chooseImage = $div;
                    $div.insertAfter(ri.obj.$me.parents('div.row'));
                }
            },
            evnt:{
                chooseImage: function (e, me) {
                    ri.val.selectedImage = null;
                    ri.func.createImageContainer();
                    ri.obj.$me.parents('div.row').hide();
                },
                cancelChooseImage: function (e, me) {
                    ri.obj.$chooseImage.remove();
                    ri.obj.$me.parents('div.row').show();
                },
                selectChooseImage: function (e, me) {
                    // select choose image code
                    var ind = ri.obj.$me.data('index'), data = ri.obj.$me.parents('.template-container').data('dt'), $p;
                    if (ind != void 0 && data != void 0) {
                        data[ind].path = ri.val.selectedImage;

                        if ('p' == ri.obj.$image.prop('tagName').toLowerCase()) {
                            $p = ri.obj.$image;
                            opt.path = ri.val.selectedImage;
                            ri.func.imageContainer().insertAfter($p);
                            $p.remove();
                        }
                        else {
                            ri.obj.$image.find('img').attr('src', ri.val.selectedImage);
                        }
                        ri.evnt.cancelChooseImage(e, me);
                    }
                    else {
                        alert('Error in data, please contact Administrator');
                    }
                    
                },
                clickOnImage: function (e, me) {
                    var $me = $(me);
                    ri.obj.$sBox.removeClass(ri.cl.selectImageSBox);
                    $me.addClass(ri.cl.selectImageSBox);
                    ri.val.selectedImage = $me.data('path');
                    ri.obj.$selectBtn.removeClass('disabled').removeAttr('disabled');
                }
            }
        };
        ri.func.init();
    }

    $.fn.extend({
        // rich text editor
        richText: function(options){
            options = $.extend({
                autoFocus: false,
                placeholder: 'Your text here...',
                mode: 'multiline',
                modifiers: ['bold', 'italic', 'underline', 'h1', 'h2', 'ol', 'ul', 'anchor']
            }, options);
            this.each(function () {
                var $this = $(this);
                actions.prepare($this, options);
                actions.bindEvents($this);
            });
            return this;
        },
        richImage: function (options) {
            options = $.extend({
                noImageText: 'Choose an Image to bring your template to life',
                images: [],
                path: null,
                x: 0,
                y: 0,
                width: '100%',
                height: '100%'
            }, options);
            this.each(function () {
                new $.createImage(this, options);       // creating object for all elements
            });
            return this;
        },
        // dynamic template
        dynamicTemplate: function (options) {
            options = $.extend({
                template: 't2',
                images: [
                    {
                        name: 'Motivation Quate',
                        path: 'img/img-1.jpg'
                    },
                    {
                        name: 'Twilite',
                        path: 'img/img-2.jpg'
                    },
                    {
                        name: 'Motivation Quate 2',
                        path: 'img/img-1.jpg'
                    },
                    {
                        name: 'Twilite 2',
                        path: 'img/img-2.jpg'
                    },
                    {
                        name: 'Motivation Quate3',
                        path: 'img/img-1.jpg'
                    },
                    {
                        name: 'Twilite 3',
                        path: 'img/img-2.jpg'
                    }
                ],
                recreate: false,
                data:[
                    [
                        {
                            type: 'image',
                            path: 'img/img-1.jpg',
                            col: 12
                        },
                        {
                            type: 'text',
                            html: '<h1>Yogesh Kumar</h1><p>Gurgaon</p><p>Pin: 122001</p>',
                            col: 12
                        }
                    ]
                ]
            },options);
            this.each(function () {
                new $.createTemplate(this, options);    // creating object for all elements
            });
            return this;
        }
    });
}).call(window, jQuery, document);
