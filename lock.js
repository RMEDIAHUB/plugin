(function () {
    'use strict';

    if (window.rmedia_lock_v2_ready) return;
    window.rmedia_lock_v2_ready = true;

    const PIN_KEY = 'rmedia_lock_pin';
    const ENABLED_KEY = 'rmedia_lock_enabled';
    const SECRET_TAPS = 5;
    const SECRET_WINDOW_MS = 2200;

    let taps = [];
    let unlocked = false;

    function storageGet(name, fallback) {
        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                return Lampa.Storage.get(name, fallback);
            }
        } catch (e) {}

        try {
            const value = localStorage.getItem(name);
            return value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function isEnabled() {
        return String(storageGet(ENABLED_KEY, 'true')) !== 'false';
    }

    function getPin() {
        let pin = String(storageGet(PIN_KEY, '2580') || '2580').trim();
        if (!/^\d{4,8}$/.test(pin)) pin = '2580';
        return pin;
    }

    function restrictedSelectors() {
        return [
            // Top header gear
            '.open--settings',

            // Side-menu administrative items
            '.menu__item[data-action="settings"]',
            '.menu__item[data-action="about"]',
            '.menu__item[data-action="console"]',
            '.menu__item[data-action="edit"]',

            // Plugin/extension shortcuts that may be added by other plugins
            '.open--extensions',
            '.open--plugins',
            '.settings--shortcut',
            '[data-component="plugins"]',
            '[data-component="extensions"]',
            '[data-name="plugins"]',
            '[data-name="extensions"]'
        ].join(',');
    }

    function hideRestrictedUI() {
        if (!isEnabled() || unlocked) return;
        $(restrictedSelectors()).hide();
    }

    function showRestrictedUI() {
        $(restrictedSelectors()).show();
    }

    function lockNow() {
        unlocked = false;
        hideRestrictedUI();

        try {
            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show('RMEDIA: настройки заблокированы');
            }
        } catch (e) {}
    }

    function unlockNow() {
        unlocked = true;
        showRestrictedUI();

        try {
            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show('RMEDIA: админ-режим до перезапуска');
            }
        } catch (e) {}
    }

    function askPin(onSuccess) {
        const expected = getPin();

        if (window.Lampa && Lampa.Input && typeof Lampa.Input.edit === 'function') {
            Lampa.Input.edit({
                title: 'RMEDIA PIN',
                value: '',
                free: true,
                nosave: true,
                nomic: true
            }, function (value) {
                if (String(value || '').trim() === expected) {
                    onSuccess();
                } else {
                    try {
                        if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Неверный PIN');
                    } catch (e) {}
                }
            });
            return;
        }

        const entered = window.prompt('RMEDIA PIN');
        if (entered === null) return;

        if (String(entered).trim() === expected) onSuccess();
        else alert('Неверный PIN');
    }

    function secretTap() {
        const now = Date.now();
        taps.push(now);
        taps = taps.filter(t => now - t <= SECRET_WINDOW_MS);

        if (taps.length >= SECRET_TAPS) {
            taps = [];

            if (unlocked) lockNow();
            else askPin(unlockNow);
        }
    }

    function bindSecretGesture() {
        function attach() {
            const candidates = $('.head__time, .time, .head__time-now, .head__clock');

            candidates.each(function () {
                const el = $(this);

                if (el.data('rmedia-lock-bound')) return;
                el.data('rmedia-lock-bound', true);

                el.on('click.rmedia-lock', secretTap);
            });
        }

        attach();

        const observer = new MutationObserver(function () {
            attach();
            hideRestrictedUI();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function protectClicks() {
        $(document).on(
            'click.rmedia-lock hover:enter.rmedia-lock',
            '.open--settings, .menu__item[data-action="settings"], .menu__item[data-action="about"], .menu__item[data-action="console"], .menu__item[data-action="edit"]',
            function (e) {
                if (!isEnabled() || unlocked) return;

                e.preventDefault();
                e.stopImmediatePropagation();

                askPin(function () {
                    unlockNow();

                    try {
                        if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.toggle('settings');
                        }
                    } catch (err) {}
                });

                return false;
            }
        );
    }

    function addAdminSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'rmedia_lock',
            name: 'RMEDIA Lock',
            icon:
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
                '<path fill="currentColor" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm2 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>' +
                '</svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: {
                name: ENABLED_KEY,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Клиентский режим',
                description: 'Скрывает Настройки, Информацию, Консоль и Редактор меню'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: {
                name: PIN_KEY,
                type: 'input',
                default: '2580'
            },
            field: {
                name: 'PIN администратора',
                description: '5 быстрых кликов по часам → PIN'
            }
        });
    }

    function init() {
        addAdminSettings();
        hideRestrictedUI();
        bindSecretGesture();
        protectClicks();

        // Menu/header may be redrawn after plugins or CUB sync.
        setInterval(hideRestrictedUI, 1000);

        console.log('[RMEDIA Lock v2] Ready');
    }

    if (window.appready) {
        init();
    } else if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    } else {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    }
})();
