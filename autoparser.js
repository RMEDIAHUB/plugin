(function () {
    'use strict';
    // RMediaHub: автопарсер переехал на сервер RMediaHub. Этот файл только подгружает его оттуда,
    // чтобы у тех, кто поставил плагин по старой ссылке, всё работало без изменений.
    if (!window.Lampa || !Lampa.Storage) return;
    if (window.rmediahub_parser_ready || window.rmediahub_parser_loading) return;
    window.rmediahub_parser_loading = true;
    var tag = document.createElement('script');
    tag.src = 'http://rmediahub.cc/autoparser.js';
    tag.onerror = function () { window.rmediahub_parser_loading = false; };
    (document.head || document.documentElement).appendChild(tag);
})();
