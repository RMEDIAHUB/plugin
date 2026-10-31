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
        'http://si.skaz.tv/s.js', // работает на http://rmediahub.cc (на https-копии GitHub — нет)
        // 'https://app.bwa.ad/online.js', // BWA (показывался как KINOPUB) — убран по просьбе
        'https://bwa.ad/re',
        'https://levende.github.io/lampa-plugins/tmdb-networks.js',
        'https://lampaplugins.github.io/store/store.js',
        'https://lampaplugins.github.io/store/p.js',
        // 'https://lampame.github.io/main/cts.js', // Concert Search — убран по просьбе
        'https://lampame.github.io/td/infuseSave.js',
        'https://nb557.github.io/plugins/reset_subs.js',

        // --- От CUB (cub.best, защищённый адрес) ---
        'https://cub.best/plugin/iptv',
        'https://cub.best/plugin/etor',
        'https://cub.best/plugin/quality',
        'https://cub.best/plugin/interface',
        'https://cub.best/plugin/tracks',
        'https://cub.best/plugin/tmdb-proxy'

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

    // --- Настройки RMediaHub по умолчанию (один раз на устройство, дальше клиент меняет сам) ---
    try {
        if (!localStorage.getItem('rmedia_defaults_v1')) {
            Lampa.Storage.set('torrserver_preload', false); // буфер пред.загрузки TorrServer — выкл
            localStorage.setItem('rmedia_defaults_v1', '1');
        }
    } catch (e) {}

    // --- Всегда стартовать с «Главной» ---
    // IPTV-плагин при открытии сам ставит «Стартовая страница: Последняя».
    // Возвращаем «Главную» при каждом запуске и при сворачивании/закрытии.
    function startFromMain() {
        try { if (Lampa.Storage.get('start_page', 'main') !== 'main') Lampa.Storage.set('start_page', 'main'); } catch (e) {}
    }
    startFromMain();
    try {
        window.addEventListener('beforeunload', startFromMain);
        document.addEventListener('visibilitychange', function () { if (document.hidden) startFromMain(); });
        setInterval(startFromMain, 30000);
    } catch (e) {}

    // --- Лишние пункты левого меню (их добавляют чужие плагины) — прячем ---
    var HIDE_MENU = ['concert search', 'мультфильмы (cub)', 'xsena.red', 'спорт', 'sport',
                     'подписки', 'расписание', 'торренты'];

    function hideMenuItems() {
        try {
            var items = document.querySelectorAll('.menu__item');
            for (var i = 0; i < items.length; i++) {
                var t = items[i].querySelector('.menu__text');
                var text = (t ? t.textContent : items[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                if (HIDE_MENU.indexOf(text) >= 0) items[i].style.display = 'none';
            }
        } catch (e) {}
    }

    hideMenuItems();
    setInterval(hideMenuItems, 2000);
    var menuWatched = false;
    function watchMenu() {
        var menu = document.querySelector('.menu');
        if (!menu || menuWatched || !window.MutationObserver) return;
        menuWatched = true;
        var pending = false;
        new MutationObserver(function () {
            if (pending) return;
            pending = true;
            setTimeout(function () { pending = false; hideMenuItems(); }, 50);
        }).observe(menu, { childList: true, subtree: true });
    }
    watchMenu();
    setTimeout(watchMenu, 3000);
})();
