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

    // Набор тарифа BASIC (бесплатные плагины). Тариф приходит из админки.
    var BASIC_PLUGINS = [
        'https://rmediahub.github.io/plugin/lock.js', // активация по коду и настройки из админки (в BASIC ничего не прячет)
        'http://cub.rip/plugin/etor',
        'http://bwa.ad/rc',
        'http://cub.rip/plugin/lgbt',
        'https://app.bwa.ad/online.js',
        'http://si.skaz.tv/s.js',
        'https://rmediahub.github.io/plugin/studios.js',
        'https://nb557.github.io/plugins/online_mod.js',
        'https://rmediahub.github.io/plugin/autoparser.js',
        'https://lampame.github.io/main/bo.js',
        'https://aviamovie.github.io/surs.js',
        'https://tvigl.github.io/plugins/Flixio.js',
        'https://levende.github.io/lampa-plugins/custom-favs.js',
        'https://and7ey.github.io/lampa/head_filter.js',
        'https://lampa.qzz.io/',
        'https://lampame.github.io/main/cw.js',
        'https://cub.red/plugin/iptv',
        // --- добавлены 31.10 ---
        'https://uakino.ax/lampa.js',                               // UAKino — фильмы и сериалы на украинском
        'https://nb557.github.io/plugins/rating.js',                // рейтинги Кинопоиска и IMDb на карточках
        'https://levende.github.io/lampa-plugins/tmdb-networks.js', // подборки по студиям и стримингам
        'https://cub.red/plugin/interface'                          // новый красивый интерфейс от CUB
    ];

    var IS_BASIC = false;
    try { IS_BASIC = localStorage.getItem('rmedia_tariff') === 'basic'; } catch (e) {}

    var LOCK_URL = 'https://rmediahub.github.io/plugin/lock.js';
    var BASIC_MARK = 'rmedia_basic_plugins_v1';

    function lampaList() {
        try { return (Lampa.Storage.get('plugins', '[]') || []).filter(function (p) { return p && p.url; }); } catch (e) { return []; }
    }

    // Какие плагины мы уже ставили этому устройству в BASIC (чтобы удалённые клиентом не возвращать).
    var ADDED_KEY = 'rmedia_basic_added';
    var added = [];
    try { added = JSON.parse(localStorage.getItem(ADDED_KEY) || '[]') || []; } catch (e) { added = []; }
    // Устройства со старой меткой: тогда ставился первый набор (16 шт.).
    if (!added.length && localStorage.getItem(BASIC_MARK)) added = BASIC_PLUGINS.slice(0, 17);
    function saveAdded() { try { localStorage.setItem(ADDED_KEY, JSON.stringify(added)); localStorage.setItem(BASIC_MARK, '1'); } catch (e) {} }

    // Переход BASIC -> ULTIMATE: убираем из «Расширений» то, что ставили для BASIC.
    if (!IS_BASIC) {
        try {
            if ((added.length || localStorage.getItem(BASIC_MARK)) && Lampa.Plugins && Lampa.Plugins.remove) {
                Lampa.Plugins.get().forEach(function (p) {
                    if (p && p.url !== LOCK_URL && (added.indexOf(p.url) >= 0 || BASIC_PLUGINS.indexOf(p.url) >= 0)) Lampa.Plugins.remove(p);
                });
                localStorage.removeItem(BASIC_MARK);
                localStorage.removeItem(ADDED_KEY);
            }
        } catch (e) {}
    }

    // Что уже стоит у клиента в «Расширениях» (чтобы не загрузить дважды)
    var installed = lampaList().map(function (p) { return p.url; });

    var stamp = Math.floor(Date.now() / 9e5); // обновление раз в 15 минут

    function inject(url) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + stamp;
        script.onerror = function () {
            console.log('RMedia', 'не удалось загрузить плагин', url);
        };
        document.head.appendChild(script);
    }

    // Устройство ещё не активировано — грузим только экран активации (lock.js).
    // Остальные плагины ему пока не нужны, а слабым приставкам (Apple TV) так легче.
    // После ввода кода lock.js перезапустит Лампу уже с полным набором.
    var ACTIVATED = false;
    try {
        ACTIVATED = !!(localStorage.getItem('rmedia_remote_client_id') ||
            String(Lampa.Storage.get('rmedia_remote_client_id', '') || ''));
    } catch (e) { ACTIVATED = true; }

    if (!ACTIVATED) {
        try { localStorage.setItem('rmedia_light_start', '1'); } catch (e) {}
        if (installed.indexOf(LOCK_URL) < 0) inject(LOCK_URL);
    } else if (IS_BASIC) {
        // BASIC: ничего не прячем — все плагины видны клиенту в «Расширениях».
        // Ставим их туда один раз на устройство; дальше клиент сам включает/удаляет,
        // а Лампа загружает их сама. lock.js (код активации) грузим отдельно.
        if (installed.indexOf(LOCK_URL) < 0) inject(LOCK_URL);
        var canAdd = false;
        try { canAdd = !!(Lampa.Plugins && Lampa.Plugins.add); } catch (e) {}
        var changed = false;
        BASIC_PLUGINS.forEach(function (url) {
            if (url === LOCK_URL || installed.indexOf(url) >= 0) return;
            if (added.indexOf(url) >= 0) return; // уже ставили, клиент сам удалил — не навязываем
            if (canAdd) {
                try { Lampa.Plugins.add({ url: url, status: 1 }); added.push(url); changed = true; return; } catch (e) {}
            }
            inject(url);
        });
        if (changed) saveAdded();
    } else {
        RMEDIA_PLUGINS.forEach(function (url) {
            if (installed.indexOf(url) >= 0) return;
            inject(url);
        });
    }

    // --- Настройки RMediaHub по умолчанию (один раз на устройство, дальше клиент меняет сам) ---
    try {
        if (!localStorage.getItem('rmedia_defaults_v1')) {
            Lampa.Storage.set('torrserver_preload', false); // буфер пред.загрузки TorrServer — выкл
            localStorage.setItem('rmedia_defaults_v1', '1');
        }
    } catch (e) {}

    // --- Shots (нарезки CUB) — выключаем: кнопка в карточке, в плеере, ряд на главной, раздел настроек ---
    try {
        ['shots_in_card', 'shots_in_player', 'content_rows_shots_main'].forEach(function (k) {
            if (String(Lampa.Storage.get(k, 'true')) !== 'false') Lampa.Storage.set(k, 'false'); // строкой: так Лампа читает надёжно
        });
        var shotsCss = document.createElement('style');
        shotsCss.textContent = '.settings-folder[data-component="shots"],.shots-view-button{display:none!important}';
        document.head.appendChild(shotsCss);
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
    var HIDE_MENU = ['shots', 'в качестве', 'concert search', 'мультфильмы (cub)', 'xsena.red', 'спорт', 'sport',
                     'подписки', 'расписание', 'торренты'];

    function hideMenuItems() {
        if (IS_BASIC) return; // BASIC — ничего не прячем
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
