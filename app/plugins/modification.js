// RMediaHub: встроенные плагины.
// Лампа сама загружает этот файл при каждом запуске.
// Чтобы добавить или убрать плагин — поменяй список ниже.
(function () {
    var RMEDIA_PLUGINS = [
        // --- Свои (RMediaHub) ---
        'https://rmediahub.github.io/plugin/lock.js',
        'https://rmediahub.github.io/plugin/rmediahub-filmix.js',
        'https://rmediahub.github.io/plugin/rmediahub-kinopub.js',
        'https://rmediahub.github.io/plugin/rtune.js',
        'https://rmediahub.github.io/plugin/rcomments.js',
        'https://rmediahub.github.io/plugin/rtweaks.js',
        'https://rmediahub.github.io/plugin/torrentstyles.js',
        'https://rmediahub.github.io/plugin/studios.js',
        'https://rmediahub.github.io/plugin/autoparser.js',

        // --- Чужие ---
        'http://si.skaz.tv/s.js',
        'https://app.bwa.ad/online.js',
        'https://bwa.ad/re',
        'https://levende.github.io/lampa-plugins/tmdb-networks.js',
        'https://lampaplugins.github.io/store/store.js',
        'https://lampaplugins.github.io/store/p.js',
        'https://lampame.github.io/main/cts.js',
        'https://lampame.github.io/td/infuseSave.js',
        'https://nb557.github.io/plugins/reset_subs.js',

        // --- От cub.red ---
        'http://cub.red/plugin/iptv',
        'http://cub.red/plugin/etor',
        'http://cub.red/plugin/quality',
        'http://cub.red/plugin/interface',
        'http://cub.red/plugin/tracks',
        'http://cub.red/plugin/tmdb-proxy'

        // Личный TS-сервер клиента сюда НЕ пишем —
        // он будет приходить из админки по коду активации.
    ];

    // Что уже стоит у клиента вручную (чтобы не загрузить дважды)
    var installed = [];
    try {
        installed = (Lampa.Storage.get('plugins', '[]') || []).map(function (p) {
            return p && p.url;
        });
    } catch (e) {}

    var stamp = Math.floor(Date.now() / 9e5); // обновление раз в 15 минут

    RMEDIA_PLUGINS.forEach(function (url) {
        if (installed.indexOf(url) >= 0) return;

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + stamp;
        script.onerror = function () {
            console.log('RMedia', 'не удалось загрузить плагин', url);
        };
        document.head.appendChild(script);
    });
})();
