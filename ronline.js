/**
 * RMEDIA Online for Lampa
 * Unified source menu over Online Mod, Filmix and an installed KinoPub engine.
 * Version: 4.0.0
 */
(function () {
    'use strict';

    if (window.rmedia_online_ready) return;
    window.rmedia_online_ready = true;

    var VERSION = '4.0.0';
    var UPSTREAM = 'https://nb557.github.io/plugins/online_mod.js';
    var DEFAULT_FREE = 'cdnvideohub';
    var lastMovie = null;
    var observer = null;

    function notify(message) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message);
    }

    function textOf(node) {
        return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function storageGet(name, fallback) {
        try {
            var value = Lampa.Storage.get(name, fallback);
            return value === undefined || value === null || value === '' ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(name, value) {
        try { Lampa.Storage.set(name, value); } catch (e) {}
    }

    function movieFromPage() {
        try {
            var activity = Lampa.Activity.active();
            return activity && activity.activity && (activity.activity.movie || activity.activity.card);
        } catch (e) {
            return lastMovie;
        }
    }

    function fullButtons() {
        return Array.prototype.slice.call(document.querySelectorAll('.full-start__buttons .selector, .full-start-new__buttons .selector'));
    }

    function findButton(pattern) {
        return fullButtons().find(function (node) { return pattern.test(textOf(node)); });
    }

    function upstreamButton() {
        return document.querySelector('.view--online_mod');
    }

    function triggerUpstream(balancer) {
        var button = upstreamButton();
        if (!button) {
            notify('Движок Online Mod ещё загружается. Повторите через пару секунд.');
            return;
        }

        storageSet('online_mod_balanser', balancer);
        if (balancer !== 'filmix' && balancer !== 'rezka') storageSet('rmedia_free_balancer', balancer);

        try {
            var event = new CustomEvent('hover:enter', { bubbles: true });
            button.dispatchEvent(event);
            if (window.jQuery) window.jQuery(button).trigger('hover:enter');
        } catch (e) {
            button.click();
        }
    }

    function icon(type) {
        var icons = {
            filmix: '<svg viewBox="0 0 48 48"><rect x="8" y="5" width="32" height="38" rx="5" fill="none" stroke="currentColor" stroke-width="4"/><path d="M19 14h14M19 24h10M19 34h6" stroke="currentColor" stroke-width="4"/><b></b></svg>',
            free: '<svg viewBox="0 0 48 48"><path d="M18 11l21 13-21 13z" fill="currentColor"/><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
            kino: '<svg viewBox="0 0 48 48"><path d="M7 16l17-10 17 10-17 10zM7 20l17 10 17-10v18L24 46 7 38z" fill="currentColor"/></svg>'
        };
        return icons[type] || icons.free;
    }

    function makeButton(kind, title, subtitle, action) {
        var node = document.createElement('div');
        node.className = 'full-start__button selector view--rmedia-' + kind;
        node.setAttribute('data-rmedia-source', kind);
        node.innerHTML = '<div class="full-start__button-icon">' + icon(kind) + '</div>' +
            '<div class="full-start__button-body"><div class="full-start__button-title">' + title + '</div>' +
            '<div class="full-start__button-subtitle">' + subtitle + '</div></div>';
        node.addEventListener('hover:enter', action);
        node.addEventListener('click', action);
        return node;
    }

    function kinoEngineButton() {
        return fullButtons().find(function (node) {
            if (node.hasAttribute('data-rmedia-source')) return false;
            return /kinopub|bwarc/i.test(textOf(node)) || /kinopub|bwarc/i.test(node.className || '');
        });
    }

    function openKinoPub() {
        var engine = kinoEngineButton();
        if (engine) {
            try {
                engine.dispatchEvent(new CustomEvent('hover:enter', { bubbles: true }));
                if (window.jQuery) window.jQuery(engine).trigger('hover:enter');
            } catch (e) { engine.click(); }
        } else {
            notify('KinoPub: сначала установите движок BwaRC/KinoPub и подключите устройство в его настройках.');
        }
    }

    function installStyle() {
        if (document.getElementById('rmedia-online-style')) return;
        var style = document.createElement('style');
        style.id = 'rmedia-online-style';
        style.textContent =
            '.view--online_mod{display:none!important}' +
            '.view--rmedia-filmix .full-start__button-icon{color:#fff}' +
            '.view--rmedia-kino .full-start__button-icon{color:#55aaff}' +
            '.view--rmedia-free .full-start__button-icon{color:#55d98b}' +
            '.full-start__button-icon svg{width:1.7em;height:1.7em}' +
            '.full-start__button-subtitle{opacity:.65;font-size:.78em;margin-top:.15em}';
        document.head.appendChild(style);
    }

    function removeDuplicates(container) {
        Array.prototype.slice.call(container.querySelectorAll('[data-rmedia-source]')).forEach(function (node) { node.remove(); });
        fullButtons().forEach(function (node) {
            if (/^rmedia online$/i.test(textOf(node))) node.style.display = 'none';
        });
    }

    function arrangeSources() {
        var container = document.querySelector('.full-start__buttons, .full-start-new__buttons');
        if (!container || !upstreamButton()) return;
        if (container.querySelectorAll('[data-rmedia-source]').length === 3) return;
        removeDuplicates(container);

        var torrent = findButton(/торрент|torrent/i);
        var trailer = findButton(/трейлер|trailer/i);
        var shots = findButton(/^shots/i);
        var existingKino = kinoEngineButton();
        if (existingKino) existingKino.style.display = 'none';

        var filmix = makeButton('filmix', 'Filmix', 'Ваш аккаунт и подписка', function () { triggerUpstream('filmix'); });
        var kino = makeButton('kino', 'KinoPub', existingKino ? 'Подключённый источник' : 'Требуется движок KinoPub', openKinoPub);
        var free = makeButton('free', 'Бесплатные', 'Балансиры Online Mod', function () {
            triggerUpstream(storageGet('rmedia_free_balancer', DEFAULT_FREE));
        });

        var anchor = torrent || container.firstElementChild;
        if (anchor && anchor.nextSibling) {
            container.insertBefore(filmix, anchor.nextSibling);
        } else container.appendChild(filmix);
        container.insertBefore(kino, filmix.nextSibling);
        container.insertBefore(free, kino.nextSibling);

        if (trailer) container.insertBefore(trailer, free.nextSibling);
        if (shots && trailer && shots !== trailer) container.insertBefore(shots, trailer.nextSibling);
    }

    function openSettings(component, template) {
        try { Lampa.Settings.create(component, { template: template }); }
        catch (e) { notify('Раздел настроек пока не загружен'); }
    }

    function addSettings() {
        if (!Lampa.SettingsApi || window.rmedia_online_settings_ready) return;
        window.rmedia_online_settings_ready = true;

        Lampa.SettingsApi.addComponent({
            component: 'rmedia_online',
            name: 'RMEDIA Online',
            icon: icon('free')
        });
        Lampa.SettingsApi.addParam({
            component: 'rmedia_online',
            param: { name: 'rmedia_filmix_settings', type: 'button' },
            field: { name: 'Filmix', description: 'Аккаунт, токен и привязка устройства' },
            onChange: function () { openSettings('filmix', 'settings_filmix'); }
        });
        Lampa.SettingsApi.addParam({
            component: 'rmedia_online',
            param: { name: 'rmedia_kinopub_settings', type: 'button' },
            field: { name: 'KinoPub', description: 'Открыть настройки установленного BwaRC/KinoPub' },
            onChange: function () {
                notify('Откройте раздел BwaRC/KinoPub в настройках установленного движка и привяжите устройство.');
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'rmedia_online',
            param: { name: 'rmedia_free_settings', type: 'button' },
            field: { name: 'Бесплатные источники', description: 'Балансир, фильтры и параметры Online Mod' },
            onChange: function () { openSettings('online_mod', 'settings_online_mod'); }
        });
        Lampa.SettingsApi.addParam({
            component: 'rmedia_online',
            param: { name: 'rmedia_online_version', type: 'static', default: VERSION },
            field: { name: 'Версия', description: VERSION }
        });
    }

    function hideOldSettings() {
        Array.prototype.slice.call(document.querySelectorAll('.settings-folder')).forEach(function (node) {
            var value = textOf(node);
            if (/^online mod$/i.test(value) || /^filmix$/i.test(value)) node.style.display = 'none';
        });
    }

    function watch() {
        if (observer) return;
        observer = new MutationObserver(function () {
            arrangeSources();
            hideOldSettings();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function loadUpstream(done) {
        if (window.online_mod_plugin || document.querySelector('script[data-rmedia-online-engine]')) {
            done();
            return;
        }
        var script = document.createElement('script');
        script.src = UPSTREAM;
        script.async = true;
        script.setAttribute('data-rmedia-online-engine', '1');
        script.onload = done;
        script.onerror = function () { notify('Не удалось загрузить движок Online Mod'); };
        document.head.appendChild(script);
    }

    function start() {
        installStyle();
        addSettings();
        watch();
        loadUpstream(function () {
            [300, 900, 1800, 3500].forEach(function (delay) { setTimeout(arrangeSources, delay); });
        });

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', function (event) {
                if (event && event.data && event.data.movie) lastMovie = event.data.movie;
                if (event && (event.type === 'complite' || event.type === 'complete')) setTimeout(arrangeSources, 150);
            });
        }
    }

    if (window.appready) start();
    else if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) { if (event.type === 'ready') start(); });
    }
})();
