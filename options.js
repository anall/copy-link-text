function reinit_context_menus() {
    chrome.contextMenus.removeAll(
        init_context_menus
    );
}

function init_context_menus() {
    var formats = get_saved_options();
    for(var formatType in formats["enabled"]) {
        if ( ! formats["enabled"][formatType] )
            continue;

        var builtin = (formatType == "text" || formatType == "mediawiki" || formatType == "html" );
        var outputformat = builtin ? formatType : formats["custom"][formatType + "_text"];

        if ( ! outputformat )
            continue;

        var title = builtin
            ? chrome.i18n.getMessage("contextMenu_command_menu_"+formatType)
            : formats["custom"][formatType+"_label"] || formats["custom"][formatType+"_text"];

        chrome.contextMenus.create({
            "type": "normal",
            "title": title,
            "contexts": ["link"],
            "documentUrlPatterns": ["http://*/*", "https://*/*"],
            "onclick": (function(output) {
                return function( link, tab ) {
                    var win = chrome.extension.getBackgroundPage();
                    var doc = win.document;
                    var textarea = doc.getElementById("tmp-clipboard");

                    var message = win.lastClicked.message || {
                        "linktext"  : link.selectionText,
                        "linkurl"   : link.linkUrl,
                        "linktitle" : undefined,
                        "pageurl"   : tab.url,
                        "pagetitle" : tab.title
                    };
                    var text = format( message, output );
                    if ( text ) {
                        textarea.value = text;

                        textarea.select();
                        doc.execCommand("copy", false, null);
                    }

                    var highlight = JSON.parse( localStorage["highlight"] );
                    if( highlight && win.lastClicked.callback) {
                        win.lastClicked.callback({action: "highlightCopied"});
                    }
                    win["lastClicked"] = {};
                };
            })(outputformat)
          });
    }
}


function log(message) {
    document.getElementById("status").innerHTML = "<div class='message'>"+message+"</div>" + document.getElementById("status").innerHTML;
}

function save_options() {
    var options = { enabled: {}, custom: {} };

    var elements = document.getElementsByName("outputformat");
    for(var i = 0; i < elements.length; i++) {
        var ele = elements[i];
        if (ele.checked)
            options["enabled"][ele.id] = true;
    }

    elements = document.getElementsByName("custom");
    for(var i = 0; i < elements.length; i++) {
        var ele = elements[i];
        if(ele.value && ele.value != "")
            options["custom"][ele.id] = ele.value;
    }
    elements = document.getElementsByName("custom_label");
    for(var i = 0; i < elements.length; i++) {
        var ele = elements[i];
        if(ele.value && ele.value != "")
            options["custom"][ele.id] = ele.value;
    }

    localStorage["outputformats"] = JSON.stringify(options);

    localStorage["highlight"] = document.getElementById("highlight").checked;

    reinit_context_menus();

    log("Your options have been saved.");
}

function get_saved_options() {
    if ( localStorage["outputformats"] )
        return JSON.parse(localStorage["outputformats"]);
    else
        return { enabled: { text: true } }; 
}


function restore_options() {
    var options = get_saved_options();

    for(var id in options["enabled"])
        document.getElementById(id).checked = options["enabled"][id];

    for(var id in options["custom"])
        document.getElementById(id).value = options["custom"][id];

    // default to enabled unless the user has explicitly set their option
    document.getElementById("highlight").checked
        = JSON.parse( localStorage["highlight"] || "true" );
}

var warned = false;
function register_multiple_warning() {
    var elements = document.getElementsByName("outputformat");

    // if we started out with more than one element checked
    // then we don't need to warn anymore
    var checked = 0;
    for(var i = 0; i < elements.length; i++) {
        if (elements[i].checked)
            checked++;
    }
    if ( checked > 1 )
        return;
    
    for(var i = 0; i < elements.length; i++) {
        var input = elements[i];
        input.addEventListener("change", function(event) {
            if (warned)
                return;

            var checked = 0;
            for(var j = 0; j < elements.length; j++) {
                if (elements[j].checked)
                    checked++;
            }

            if ( checked > 1 ) {
                log("Note: Checking more than one format will create a second level of menus.");
                warned = 1;
            }
        }, false);
    }
}

function init() {
    restore_options();
    register_multiple_warning();
}

