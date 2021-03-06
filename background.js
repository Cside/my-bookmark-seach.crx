function c (s) { console.log(s) }
function a (s) { alert(s) }

var INDEX = [];
var lastQuery;
function onInputChangedListener (query, suggest) {
    if (lastQuery == query || query.length == 0) return;
    lastQuery = query;

    var limit  = 5;
    var offset = 0;
    var match;
    if (match = query.match(/(\.+)$/)) {
        offset = limit * (match[1].split(/\./).length - 1);
        query = query.replace(/\.+$/, '');
    }

    var targets = [];
    var count = 0;
    for (var i = 0; i < INDEX.length; i++) {
        var index   = INDEX[i];
        var match   = 0;
        query.split(/\s/).forEach(function (q) {
            var re = new RegExp(q.replace(/\W/g, '\\$&'), 'ig');
            if ((index[0] + index[1] + index[2]).match(re)) match++
        });
        if (query.split(/\s/).length == match) {
            count++;
            if (count <= offset) continue;
            if ((limit + offset) < count) break;
            targets.push(index);
        }
    }

    var suggests = [];
    targets.forEach(function (index) {
        var title   = index[0];
            title   = title.replace(/[<>&"']/g, '')
          //title   = truncate(title, 64);
        var comment = index[1];
        var url     = index[2];

        query.split(/\s/).forEach(function (q) {
            var re = new RegExp(q.replace(/\W/g, '\\$&'), 'ig');
            title = title.replace(re, '<match>$&</match>');
        });

        suggests.push({
            description: title + ' <url>' + url + '</url>',
            content:     url,
        });
    });

    suggest(suggests);
}

function setupOnInputListener () {
    chrome.omnibox.setDefaultSuggestion({
        description: 'Search my bookmarks for <match>%s</match>'
    });

    chrome.omnibox.onInputChanged.addListener(onInputChangedListener);

    chrome.omnibox.onInputEntered.addListener(
        function(text) {
            if (text.match(/^http:/)) {
                chrome.tabs.getSelected(null, function (tab) {
                    chrome.tabs.update(tab.id, { url: text });
                });
            }
        }
    );
}

chrome.omnibox.onInputStarted.addListener(
    function () {
        // make index
        var req = new XMLHttpRequest();
        req.open('GET', 'http://b.hatena.ne.jp/my/search.data', true);
        req.onreadystatechange = function (e) {
            if (req.readyState == 4) {
                if (req.status == 200) {
                    var lines = req.responseText.split(/\n/);
                    var index = [];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.match(/^[\d]+\t[\d]+\n?$/)) break;

                        index[i % 3] = line;
                        if (i % 3 === 2) {
                            INDEX.push(index);
                            index = [];
                        }
                    }
                    setupOnInputListener();

                } else {
                    console.log(e);
                }
            }
        };
        req.send(null);
    }
);

// Utils.
function truncate(str, size, suffix) {
    if (!str)    str = '';
    if (!size)   size = 32;
    if (!suffix) suffix = '...';
    var b = 0;
    for (var i = 0;  i < str.length; i++) {
        b += str.charCodeAt(i) <= 255 ? 1 : 2;
        if (b > size) {
            return str.substr(0, i) + suffix;
        }
    }
    return str;
}
