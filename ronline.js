/**
 * RMEDIA Online for Lampa
 * Multi-source online catalogue powered by Online Mod.
 * Keeps Filmix authorization in Lampa's filmix_token storage.
 * HDRezka is intentionally hidden by RMEDIA.
 * Version: 3.0.0
 */
(function () {
    'use strict';

    if (window.rmedia_online_ready) return;
    window.rmedia_online_ready = true;

    var VERSION = '3.0.0';
    var ENGINE_URL = 'https://nb557.github.io/plugins/online_mod.js';
    var STYLE_ID = 'rmedia-online-style';

    function storage(name, fallback) {
        try {
            var value = Lampa.Storage.get(name, fallback);
            return value === undefined || value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '.rmedia-online-engine-state{font-size:.9em;opacity:.65;margin-top:.35em}.rmedia-online-engine-state.ok{color:#45e58a;opacity:1}.rmedia-online-engine-state.error{color:#ff6262;opacity:1}';
        document.head.appendChild(style);
    }

    function textOf(node) {
        return (node && node.textContent ? node.textContent : '').replace(/\s+/g, ' ').trim();
    }

    function cleanRezka(root) {
        root = root || document;
        var nodes = root.querySelectorAll('.selectbox-item,.selector,.settings-param,.online-filter__item');
        for (var i = 0; i < nodes.length; i++) {
            if (/hd\s*rezka|hdrezka|rezka2/i.test(textOf(nodes[i]))) nodes[i].style.display = 'none';
        }
    }

    function renameEngine(root) {
        root = root || document;
        var nodes = root.querySelectorAll('.head__title,.activity__title,.settings__title,.settings-folder__name');
        for (var i = 0; i < nodes.length; i++) {
            if (/^(Онлайн Мод|Online Mod|Анлайн Мод)$/i.test(textOf(nodes[i]))) nodes[i].textContent = 'RMEDIA Online';
        }
    }

    function watchUi() {
        if (!window.MutationObserver || !document.body) return;
        var observer = new MutationObserver(function (records) {
            for (var i = 0; i < records.length; i++) {
                for (var j = 0; j < records[i].addedNodes.length; j++) {
                    var node = records[i].addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    cleanRezka(node);
                    renameEngine(node);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        cleanRezka(document);
        renameEngine(document);
    }

    function engineLoaded() {
        try {
            return !!(Lampa.Component && Lampa.Component.get && Lampa.Component.get('online_mod'));
        } catch (e) {
            return !!document.querySelector('.view--online_mod');
        }
    }

    function loadEngine(done) {
        if (engineLoaded() || window.rmedia_online_engine_loading) {
            if (done) done(true);
            return;
        }
        window.rmedia_online_engine_loading = true;
        var script = document.createElement('script');
        script.src = ENGINE_URL + '?rmedia=' + VERSION;
        script.async = true;
        script.onload = function () {
            window.rmedia_online_engine_loading = false;
            setTimeout(function () {
                cleanRezka(document);
                renameEngine(document);
                if (done) done(true);
            }, 250);
        };
        script.onerror = function () {
            window.rmedia_online_engine_loading = false;
            if (done) done(false);
        };
        document.head.appendChild(script);
    }

    function addLang() {
        if (!Lampa.Lang || !Lampa.Lang.add) return;
        Lampa.Lang.add({
            rmedia_online_title: { ru: 'RMEDIA Online', uk: 'RMEDIA Online', en: 'RMEDIA Online' },
            rmedia_online_descr: { ru: 'Балансеры, фильтры и Filmix из вашего аккаунта', uk: 'Балансери, фільтри та Filmix з вашого акаунта', en: 'Balancers, filters and Filmix from your account' }
        });
    }

    function statusText() {
        var token = String(storage('filmix_token', '') || '');
        return (token ? 'Filmix: подключён' : 'Filmix: не подключён') + ' · движок: ' + (engineLoaded() ? 'готов' : 'загрузка');
    }

    function addSettings() {
        if (!Lampa.SettingsApi || !Lampa.Template) return;
        Lampa.Template.add('settings_rmedia_online', '<div><div class="settings-param selector" data-name="rmedia_online_status" data-static="true"><div class="settings-param__name">Подключения</div><div class="settings-param__value"></div><div class="settings-param__descr rmedia-online-engine-state"></div></div><div class="settings-param selector" data-name="rmedia_online_reload" data-static="true"><div class="settings-param__name">Перезапустить онлайн-движок</div><div class="settings-param__descr">Filmix использует токен, сохранённый при привязке устройства</div></div><div class="settings-param"><div class="settings-param__name">Источники</div><div class="settings-param__descr">Выбираются кнопкой «Балансер» внутри RMEDIA Online. HDRezka скрыта.</div></div></div>');
        Lampa.SettingsApi.addComponent({
            component: 'rmedia_online',
            name: 'RMEDIA Online',
            icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>'
        });
        Lampa.SettingsApi.addParam({
            component: 'rmedia_online',
            param: { name: 'rmedia_online', type: 'static' },
            field: { name: 'RMEDIA Online', description: 'Балансеры, фильтры и Filmix из вашего аккаунта' },
            onRender: function (item) {
                item.on('hover:enter', function () {
                    Lampa.Settings.create('rmedia_online', { template: 'settings_rmedia_online' });
                });
            }
        });
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name !== 'rmedia_online') return;
            var state = e.body.find('.rmedia-online-engine-state');
            state.text(statusText()).toggleClass('ok', engineLoaded());
            e.body.find('[data-name="rmedia_online_reload"]').off('hover:enter').on('hover:enter', function () {
                loadEngine(function (ok) {
                    state.text(statusText()).toggleClass('ok', ok).toggleClass('error', !ok);
                });
            });
        });
    }

    function start() {
        if (typeof Lampa === 'undefined') return;
        addStyle();
        addLang();
        watchUi();
        loadEngine();
        addSettings();
    }

    if (window.appready) start();
    else if (typeof Lampa !== 'undefined' && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
    } else {
        var wait = setInterval(function () {
            if (typeof Lampa !== 'undefined') {
                clearInterval(wait);
                start();
            }
        }, 250);
    }
})();
