/**
 * MEDIA Parser for Lampa
 * RMEDIAHUB parser health check, automatic selection and hot switcher.
 *
 * Version: 1.1.0
 * License: MIT
 */
(function () {
    'use strict';

    if (window.rmediahub_parser_ready) return;
    window.rmediahub_parser_ready = true;

    var VERSION = '1.1.0';
    var PREFIX = 'rmediahub_parser_';
    var KEY_LIST = PREFIX + 'list';
    var KEY_ACTIVE = PREFIX + 'active';
    var KEY_AUTO = PREFIX + 'auto';
    var KEY_BACKUP = PREFIX + 'backup';
    var KEY_CATALOG_VERSION = PREFIX + 'catalog_version';
    var CATALOG_VERSION = 2;
    var CHECK_TTL = 2 * 60 * 1000;
    var CHECK_TIMEOUT = 12000;
    var PERIODIC_CHECK = 10 * 60 * 1000;

    var DEFAULT_PARSERS = [
        { id: 'maxvol', name: 'jr.maxvol.pro', url: 'https://jr.maxvol.pro', key: '' },
        { id: 'jacred_su', name: 'JacRed.su', url: 'https://jacred.su', key: '' },
        { id: 'jacred_ru', name: 'jac-red.ru', url: 'https://jac-red.ru', key: '' },
        { id: 'jacred', name: 'Jac.red', url: 'https://jac.red', key: '' },
        { id: 'lampa_app', name: 'Lampa.app', url: 'https://lampa.app', key: '' },
        { id: 'bylampa_http', name: 'ByLampa HTTP', url: 'http://87.120.84.218:9117', key: '333' }
    ];

    var state = {
        checking: false,
        checkedAt: 0,
        results: {},
        waiters: [],
        observer: null,
        timer: null
    };

    function storageGet(name, fallback) {
        var value = Lampa.Storage.get(name, fallback);
        return typeof value === 'undefined' || value === null ? fallback : value;
    }

    function boolValue(name, fallback) {
        var value = storageGet(name, fallback);
        return value !== false && value !== 'false' && value !== 0 && value !== '0';
    }

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(DEFAULT_PARSERS));
    }

    function normalizeUrl(value) {
        var url = String(value || '').trim();
        if (!url) return '';
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        return url.replace(/\/+$/, '');
    }

    function hostFromUrl(value) {
        return normalizeUrl(value)
            .replace(/^https?:\/\//i, '')
            .replace(/\/.*/, '')
            .toLowerCase();
    }

    function getParsers() {
        var raw = storageGet(KEY_LIST, '');
        var parsed;

        try {
            parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
            parsed = null;
        }

        if (!Array.isArray(parsed) || !parsed.length) return cloneDefaults();

        return parsed.filter(function (parser) {
            return parser && parser.id && parser.url;
        }).map(function (parser) {
            return {
                id: String(parser.id),
                name: String(parser.name || hostFromUrl(parser.url)),
                url: normalizeUrl(parser.url),
                key: String(parser.key || '')
            };
        });
    }

    function saveParsers(list) {
        Lampa.Storage.set(KEY_LIST, JSON.stringify(list));
    }

    function migrateCatalog() {
        var storedVersion = parseInt(storageGet(KEY_CATALOG_VERSION, 0), 10) || 0;
        var raw = storageGet(KEY_LIST, '');
        var list = raw ? getParsers() : [];
        var changed = false;

        if (storedVersion >= CATALOG_VERSION && list.length) return;

        DEFAULT_PARSERS.forEach(function (candidate) {
            var candidateHost = hostFromUrl(candidate.url);
            var exists = list.some(function (parser) {
                return parser.id === candidate.id ||
                    (hostFromUrl(parser.url) === candidateHost && String(parser.key || '') === String(candidate.key || ''));
            });

            if (!exists) {
                list.push(JSON.parse(JSON.stringify(candidate)));
                changed = true;
            }
        });

        if (changed || !raw) saveParsers(list);
        Lampa.Storage.set(KEY_CATALOG_VERSION, CATALOG_VERSION);
    }

    function parserById(id) {
        var list = getParsers();
        var found = null;

        list.some(function (parser) {
            if (parser.id === id) {
                found = parser;
                return true;
            }
            return false;
        });

        return found;
    }

    function detectActiveId() {
        var saved = storageGet(KEY_ACTIVE, '');
        if (saved && parserById(saved)) return saved;

        var currentHost = hostFromUrl(storageGet('jackett_url', ''));
        var list = getParsers();
        var detected = '';

        list.some(function (parser) {
            if (hostFromUrl(parser.url) === currentHost) {
                detected = parser.id;
                return true;
            }
            return false;
        });

        return detected || list[0].id;
    }

    function activeParser() {
        return parserById(detectActiveId()) || getParsers()[0];
    }

    function healthUrl(parser) {
        return normalizeUrl(parser.url) +
            '/api/v2.0/indexers/all/results?apikey=' +
            encodeURIComponent(parser.key || '') +
            '&Query=' + encodeURIComponent('матрица');
    }

    function checkParser(parser, done) {
        var started = Date.now();

        $.ajax({
            url: healthUrl(parser),
            method: 'GET',
            dataType: 'json',
            cache: false,
            timeout: CHECK_TIMEOUT,
            success: function (response, textStatus, xhr) {
                var valid = response && Array.isArray(response.Results);
                done({
                    ok: valid,
                    status: valid ? 'ok' : 'invalid',
                    code: xhr && xhr.status ? xhr.status : 200,
                    latency: Date.now() - started
                });
            },
            error: function (xhr, textStatus) {
                done({
                    ok: false,
                    status: xhr && xhr.status === 401 ? 'auth' : (textStatus || 'error'),
                    code: xhr && xhr.status ? xhr.status : 0,
                    latency: Date.now() - started
                });
            }
        });
    }

    function flushWaiters() {
        var queue = state.waiters.slice(0);
        state.waiters = [];
        queue.forEach(function (callback) {
            try { callback(state.results); } catch (e) {}
        });
    }

    function checkAll(force, callback) {
        if (typeof callback === 'function') state.waiters.push(callback);

        if (state.checking) return;

        if (!force && state.checkedAt && Date.now() - state.checkedAt < CHECK_TTL) {
            flushWaiters();
            return;
        }

        state.checking = true;
        state.results = {};

        var list = getParsers();
        var pending = list.length;

        if (!pending) {
            state.checking = false;
            state.checkedAt = Date.now();
            flushWaiters();
            return;
        }

        list.forEach(function (parser) {
            checkParser(parser, function (result) {
                state.results[parser.id] = result;
                pending--;

                if (!pending) {
                    state.checking = false;
                    state.checkedAt = Date.now();
                    updateButtons();
                    flushWaiters();
                }
            });
        });
    }

    function healthyParsers() {
        return getParsers().filter(function (parser) {
            return state.results[parser.id] && state.results[parser.id].ok;
        });
    }

    function applyPair(primary, secondary) {
        if (!primary) return false;

        var useBackup = boolValue(KEY_BACKUP, true) && secondary;

        Lampa.Storage.set('parser_use', true);
        Lampa.Storage.set('parser_torrent_type', 'jackett');
        Lampa.Storage.set('jackett_url', normalizeUrl(primary.url));
        Lampa.Storage.set('jackett_key', primary.key || '');
        Lampa.Storage.set('jackett_url_two', useBackup ? normalizeUrl(secondary.url) : '');
        Lampa.Storage.set('jackett_key_two', useBackup ? (secondary.key || '') : '');
        Lampa.Storage.set('parser_use_link', useBackup ? 'both' : 'one');
        Lampa.Storage.set('parser', normalizeUrl(primary.url));
        Lampa.Storage.set(KEY_ACTIVE, primary.id);

        updateButtons();
        return true;
    }

    function chooseAndApply(showNotice, allowReload) {
        var healthy = healthyParsers();
        var current = activeParser();
        var primary = null;
        var secondary = null;

        if (!healthy.length) {
            if (showNotice) Lampa.Noty.show('MEDIA Парсер: доступных адресов не найдено');
            return false;
        }

        healthy.some(function (parser) {
            if (current && parser.id === current.id) {
                primary = parser;
                return true;
            }
            return false;
        });

        if (!primary) primary = healthy[0];

        healthy.some(function (parser) {
            if (parser.id !== primary.id) {
                secondary = parser;
                return true;
            }
            return false;
        });

        var changed = !current || current.id !== primary.id ||
            normalizeUrl(storageGet('jackett_url', '')) !== normalizeUrl(primary.url);

        applyPair(primary, secondary);

        if (showNotice) {
            var message = 'MEDIA Парсер: ' + primary.name;
            if (boolValue(KEY_BACKUP, true) && secondary) message += ' + резерв ' + secondary.name;
            Lampa.Noty.show(message);
        }

        if (changed && allowReload) reloadTorrents();
        return true;
    }

    function runAuto(force, showNotice, allowReload) {
        if (!boolValue(KEY_AUTO, true)) return;

        checkAll(force, function () {
            chooseAndApply(showNotice, allowReload);
        });
    }

    function reloadTorrents() {
        var activity = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
        if (!activity || activity.component !== 'torrents') return;

        setTimeout(function () {
            Lampa.Activity.replace({
                component: 'torrents',
                url: activity.url,
                title: activity.title,
                search: activity.search,
                search_one: activity.search_one,
                search_two: activity.search_two,
                movie: activity.movie,
                page: 1,
                params: activity.params
            });
        }, 100);
    }

    function statusText(parser) {
        var result = state.results[parser.id];
        if (!result) return 'не проверен';
        if (result.ok) return 'доступен · ' + result.latency + ' мс';
        if (result.status === 'auth') return 'ошибка ключа';
        if (result.status === 'timeout') return 'тайм-аут';
        return result.code ? 'ошибка ' + result.code : 'недоступен';
    }

    function inputDialog(title, value, callback) {
        Lampa.Input.show({
            title: title,
            value: value || '',
            placeholder: title,
            onComplite: callback,
            onBack: function () { Lampa.Controller.toggle('content'); }
        });
    }

    function addCustomParser(enabledController) {
        inputDialog('Название парсера', '', function (name) {
            if (!name) return;

            inputDialog('Адрес, например https://parser.example', '', function (url) {
                var normalized = normalizeUrl(url);
                if (!normalized) return;

                inputDialog('API-ключ — можно оставить пустым', '', function (key) {
                    var list = getParsers();
                    list.push({
                        id: 'custom_' + Date.now(),
                        name: String(name).trim(),
                        url: normalized,
                        key: String(key || '').trim()
                    });
                    saveParsers(list);
                    state.checkedAt = 0;
                    Lampa.Noty.show('MEDIA Парсер: адрес добавлен');
                    Lampa.Controller.toggle(enabledController || 'content');
                });
            });
        });
    }

    function openMenu(button) {
        var enabled = Lampa.Controller.enabled().name;
        var current = detectActiveId();
        var items = [
            {
                title: 'Автовыбор: ' + (boolValue(KEY_AUTO, true) ? 'включён' : 'выключен'),
                subtitle: 'Проверять адреса и переключаться при отказе',
                action: 'auto'
            },
            {
                title: 'Проверить сейчас',
                subtitle: 'Реальный запрос к API всех парсеров',
                action: 'check'
            }
        ];

        getParsers().forEach(function (parser) {
            items.push({
                title: parser.name,
                subtitle: normalizeUrl(parser.url) + ' · ' + statusText(parser),
                parserId: parser.id,
                selected: parser.id === current
            });
        });

        items.push({ title: '+ Добавить свой адрес', action: 'add' });
        items.push({ title: 'Вернуть заводской список', action: 'reset' });

        Lampa.Select.show({
            title: 'MEDIA Парсер · v' + VERSION,
            items: items,
            onSelect: function (item) {
                if (item.action === 'auto') {
                    var next = !boolValue(KEY_AUTO, true);
                    Lampa.Storage.set(KEY_AUTO, next);
                    Lampa.Noty.show('MEDIA Парсер: автовыбор ' + (next ? 'включён' : 'выключен'));
                    if (next) runAuto(true, true, true);
                    Lampa.Controller.toggle(enabled);
                } else if (item.action === 'check') {
                    Lampa.Noty.show('MEDIA Парсер: проверяем адреса…');
                    checkAll(true, function () {
                        if (boolValue(KEY_AUTO, true)) chooseAndApply(true, true);
                        else Lampa.Noty.show('MEDIA Парсер: проверка завершена');
                    });
                    Lampa.Controller.toggle(enabled);
                } else if (item.action === 'add') {
                    addCustomParser(enabled);
                } else if (item.action === 'reset') {
                    saveParsers(cloneDefaults());
                    Lampa.Storage.set(KEY_CATALOG_VERSION, CATALOG_VERSION);
                    Lampa.Storage.set(KEY_ACTIVE, DEFAULT_PARSERS[0].id);
                    state.checkedAt = 0;
                    state.results = {};
                    Lampa.Noty.show('MEDIA Парсер: список восстановлен');
                    runAuto(true, true, true);
                    Lampa.Controller.toggle(enabled);
                } else if (item.parserId) {
                    var selected = parserById(item.parserId);
                    var backup = null;

                    healthyParsers().some(function (parser) {
                        if (parser.id !== item.parserId) {
                            backup = parser;
                            return true;
                        }
                        return false;
                    });

                    applyPair(selected, backup);
                    Lampa.Noty.show('MEDIA Парсер: выбран ' + selected.name);
                    Lampa.Controller.toggle(enabled);
                    reloadTorrents();
                }
            },
            onBack: function () { Lampa.Controller.toggle(enabled); }
        });
    }

    function buttonLabel() {
        var parser = activeParser();
        var result = parser ? state.results[parser.id] : null;
        var dot = result ? (result.ok ? '● ' : '● ') : '';
        return 'MEDIA · ' + dot + (parser ? parser.name : 'Парсер');
    }

    function updateButtons() {
        $('.rmediahub-parser-button .rmediahub-parser-name').text(buttonLabel());
        $('.rmediahub-parser-button').each(function () {
            var parser = activeParser();
            var result = parser ? state.results[parser.id] : null;
            $(this).toggleClass('is-ok', !!(result && result.ok));
            $(this).toggleClass('is-error', !!(result && !result.ok));
        });
    }

    function buildButton() {
        var button = $('<div class="simple-button selector filter--parser rmediahub-parser-button"><div class="rmediahub-parser-name"></div></div>');
        button.find('.rmediahub-parser-name').text(buttonLabel());
        button.on('hover:enter click', function () { openMenu(button); });
        return button;
    }

    function injectButton(container) {
        if (!container || !container.length || container.find('.rmediahub-parser-button').length) return;

        var button = buildButton();
        var search = container.find('.filter--search');
        var sort = container.find('.filter--sort');

        if (search.length) button.insertAfter(search);
        else if (sort.length) button.insertBefore(sort);
        else container.prepend(button);

        runAuto(false, false, true);
    }

    function addStyles() {
        if ($('#rmediahub-parser-style').length) return;

        $('body').append(
            '<style id="rmediahub-parser-style">' +
            '.rmediahub-parser-button{padding:.45em .7em;border-radius:.45em;background:rgba(255,255,255,.12);white-space:nowrap}' +
            '.rmediahub-parser-button.is-ok{box-shadow:inset .22em 0 #22c983}' +
            '.rmediahub-parser-button.is-error{box-shadow:inset .22em 0 #ff4d57}' +
            '.rmediahub-parser-name{font-size:.78em}' +
            '</style>'
        );
    }

    function addSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;

        Lampa.SettingsApi.addParam({
            component: 'parser',
            param: { name: KEY_AUTO, type: 'trigger', 'default': true },
            field: {
                name: 'MEDIA Парсер — автовыбор',
                description: 'Проверяет API и автоматически выбирает рабочий адрес'
            },
            onChange: function () {
                if (boolValue(KEY_AUTO, true)) runAuto(true, true, true);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'parser',
            param: { name: KEY_BACKUP, type: 'trigger', 'default': true },
            field: {
                name: 'MEDIA Парсер — резерв',
                description: 'Подключает второй рабочий адрес как резервный'
            },
            onChange: function () {
                runAuto(true, true, true);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'parser',
            param: { name: PREFIX + 'manage', type: 'button' },
            field: {
                name: 'Открыть MEDIA Парсер',
                description: 'Проверка, ручной выбор и добавление адресов'
            },
            onChange: function () { openMenu(null); }
        });
    }

    function startObserver() {
        if (state.observer) return;

        state.observer = new MutationObserver(function () {
            var filter = $('.torrent-filter');
            if (filter.length) injectButton(filter);
        });

        state.observer.observe(document.body, { childList: true, subtree: true });

        var current = $('.torrent-filter');
        if (current.length) injectButton(current);
    }

    function init() {
        migrateCatalog();
        if (typeof Lampa.Storage.get(KEY_AUTO) === 'undefined') Lampa.Storage.set(KEY_AUTO, true);
        if (typeof Lampa.Storage.get(KEY_BACKUP) === 'undefined') Lampa.Storage.set(KEY_BACKUP, true);

        addStyles();
        addSettings();
        startObserver();

        setTimeout(function () { runAuto(true, false, false); }, 800);
        state.timer = setInterval(function () { runAuto(true, false, true); }, PERIODIC_CHECK);

        console.log('[MEDIA Parser] loaded v' + VERSION);
    }

    function start() {
        if (window.appready) init();
        else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        }
    }

    if (window.Lampa && Lampa.Storage && window.$) start();
    else document.addEventListener('lampa:ready', start);
})();
