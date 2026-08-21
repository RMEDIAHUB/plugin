(function () {
    'use strict';

    if (window.rmedia_lock_v3_ready) return;
    window.rmedia_lock_v3_ready = true;

    const PIN_KEY = 'rmedia_lock_pin';
    const ENABLED_KEY = 'rmedia_lock_enabled';
    const SECRET_TAPS = 5;
    const SECRET_WINDOW_MS = 2200;

    let taps = [];
    let unlocked = false;
    let safeSyncOpening = false;
    let syncButtonAdded = false;

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
            '.open--settings',
            '.menu__item[data-action="settings"]',
            '.menu__item[data-action="about"]',
            '.menu__item[data-action="console"]',
            '.menu__item[data-action="edit"]',
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
                Lampa.Noty.show('RMEDIA: клиентский режим');
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

    function protectAdminClicks() {
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
                        if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.toggle('settings');
                        }
                    } catch (err) {}
                });

                return false;
            }
        );
    }

    function pruneAccountPanel(body) {
        if (!safeSyncOpening || unlocked) return;

        /*
         * The native CUB account panel has these signed-in actions:
         * .settings--account-user-sync
         * .settings--account-user-backup
         * .settings--account-user-info
         * .settings--account-user-profile
         * .settings--account-user-out
         *
         * Client view keeps only Sync + Backup.
         * If the device is not signed in yet, the native Sign In block remains
         * so the account can be connected during initial setup.
         */
        const signedBlock = body.find('.settings--account-user');

        if (signedBlock.length) {
            signedBlock.children().each(function () {
                const row = $(this);

                if (
                    row.hasClass('settings--account-user-sync') ||
                    row.hasClass('settings--account-user-backup')
                ) {
                    return;
                }

                row.hide();
            });

            body.find('.settings--account-user-info').hide();
            body.find('.settings--account-user-profile').hide();
            body.find('.settings--account-user-out').hide();

            body.find('.settings--account-user-sync').show();
            body.find('.settings--account-user-backup').show();
        }

        // Hide CUB promo/header and generic account controls in client mode.
        body.find('.ad-server').hide();
        body.find('[data-name="account_use"]').hide();
        body.find('.settings-param__label').hide();

        // Keep sign-in visible only when account is not signed in.
        body.find('.settings--account-signin').not('.hide').show();

        // Keep our mode until the component is left; this also survives Settings.update().
        setTimeout(function () {
            if (safeSyncOpening && !unlocked) pruneAccountPanel(body);
        }, 50);
    }

    function openSafeSync() {
        safeSyncOpening = true;

        try {
            if (Lampa.Settings && typeof Lampa.Settings.create === 'function') {
                Lampa.Settings.create('account');
                return;
            }
        } catch (e) {}

        // Fallback through global settings controller/API.
        try {
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('settings');
            }
        } catch (e) {}
    }

    function addClientSyncMenu() {
        if (syncButtonAdded || !window.Lampa || !Lampa.Menu || typeof Lampa.Menu.addButton !== 'function') return;

        const icon =
            '<svg viewBox="0 0 24 24">' +
            '<path fill="currentColor" d="M12 4a8 8 0 0 1 7.45 5.1l1.85-.62-2.58 4.3-4.32-2.55 1.95-.65A4.8 4.8 0 0 0 12 7.2a4.79 4.79 0 0 0-4.15 2.4L5.08 8A8 8 0 0 1 12 4Zm-7.45 10.9-1.85.62 2.58-4.3 4.32 2.55-1.95.65A4.8 4.8 0 0 0 12 16.8a4.79 4.79 0 0 0 4.15-2.4L18.92 16A8 8 0 0 1 12 20a8 8 0 0 1-7.45-5.1Z"/>' +
            '</svg>';

        const button = Lampa.Menu.addButton(icon, 'Синхронизация', function () {
            openSafeSync();
        });

        if (button && button.attr) {
            button.attr('data-action', 'rmedia_sync');
            button.addClass('rmedia-sync-menu');
        }

        syncButtonAdded = true;
    }

    function watchSettings() {
        try {
            if (Lampa.Settings && Lampa.Settings.listener && Lampa.Settings.listener.follow) {
                Lampa.Settings.listener.follow('open', function (e) {
                    if (e.name === 'account' && safeSyncOpening && !unlocked) {
                        setTimeout(function () {
                            pruneAccountPanel(e.body);
                        }, 0);
                    }
                    else if (e.name !== 'account') {
                        safeSyncOpening = false;
                    }
                });

                Lampa.Settings.listener.follow('close', function () {
                    safeSyncOpening = false;
                });
            }
        } catch (e) {}
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
                description: 'Скрывает административные пункты и оставляет безопасную синхронизацию'
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
        addClientSyncMenu();
        watchSettings();
        hideRestrictedUI();
        bindSecretGesture();
        protectAdminClicks();

        setInterval(function () {
            addClientSyncMenu();
            hideRestrictedUI();
        }, 1000);

        console.log('[RMEDIA Lock v3 Client Sync] Ready');
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
