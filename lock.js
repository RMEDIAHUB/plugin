(function () {
    'use strict';

    if (window.rmedia_lock_v11_16_ready) return;
    window.rmedia_lock_v11_16_ready = true;

    const PIN_KEY = 'rmedia_lock_pin';
    const MENU_PIN_KEY = 'rmedia_menu_pin';
    const ENABLED_KEY = 'rmedia_lock_enabled';
    const SECRET_TAPS = 5;
    const SECRET_WINDOW_MS = 2200;

    let taps = [];
    let unlocked = false;
    let safeSyncOpening = false;
    let safeSyncAccountReached = false;
    let syncButtonAdded = false;
    let syncHeadAdded = false;
    let extensionGateBound = false;
    let protectedComponentsBound = false;
    let mobileBackBound = false;
    let remoteUpPresses = [];
    let suppressNextSyncEnter = false;

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
        let pin = String(storageGet(PIN_KEY, '1111') || '1111').trim();
        if (!/^\d{4,8}$/.test(pin)) pin = '1111';
        return pin;
    }

    function getMenuPin() {
        let pin = String(storageGet(MENU_PIN_KEY, '2580') || '2580').trim();
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
            '.open--profile',
            '.open--console',
            '.open--terminal',
            '.head__action[data-action="console"]',
            '.head__action[data-action="terminal"]',
            '.settings--shortcut',
            '.navigation-bar__item[data-action="settings"]'
        ].join(',');
    }

    function hideRestrictedUI() {
        if (!isEnabled() || unlocked) return;
        $(restrictedSelectors()).hide();
    }

    function showRestrictedUI() {
        $(restrictedSelectors()).show();
    }

    function hideTorrPromo(body) {
        if (!body || !body.length) return;

        const promoLeafs = body.find('*').filter(function () {
            const el = $(this);
            let own = '';

            el.contents().each(function () {
                if (this.nodeType === 3) own += this.nodeValue || '';
            });

            return /tsarea\.tv/i.test(own) || /аренда\s+TorrServer/i.test(own);
        });

        promoLeafs.each(function () {
            const leaf = $(this);
            leaf.hide();

            const parent = leaf.parent();

            if (parent.length) {
                parent.find('img, canvas, .qrcode, .qr-code, .ad-server__qr').hide();

                const cls = String(parent.attr('class') || '');
                const safeParent =
                    !/settings__body|settings-component|settings__content|scroll|ad-server\b/.test(cls) &&
                    parent.children().length <= 6;

                if (safeParent && /tsarea\.tv/i.test(parent.text() || '')) {
                    parent.hide();
                }
            }
        });
    }

    function lockNow() {
        unlocked = false;
        hideRestrictedUI();

        try {
            if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('RMEDIA: клиентский режим');
        } catch (e) {}
    }

    function unlockNow() {
        unlocked = true;
        showRestrictedUI();

        try {
            if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('RMEDIA: админ-режим до перезапуска');
        } catch (e) {}
    }

    function denyPinAndExit() {
        unlocked = false;
        safeSyncOpening = false;
        safeSyncAccountReached = false;

        try {
            hideRestrictedUI();
        } catch (e) {}

        try {
            // Закрываем любые Settings/Select/Modal состояния,
            // чтобы после неверного PIN Back не мог показать админ-меню.
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('content');
            }
        } catch (e) {}

        setTimeout(function () {
            try {
                $('body').removeClass('settings--open selectbox--open');
                hideRestrictedUI();
            } catch (e) {}
        }, 50);

        try {
            if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Неверный PIN');
        } catch (e) {}
    }

    function askSpecificPin(expected, title, onSuccess, wrongMode) {
        // Remember where PIN was invoked from.
        // Lampa.Input.edit ALWAYS returns to settings_component on close,
        // which freezes Android if PIN was called from Head/Content.
        let originController = null;

        try {
            const enabled = Lampa.Controller && Lampa.Controller.enabled
                ? Lampa.Controller.enabled()
                : null;

            originController = enabled && enabled.name ? enabled.name : null;
        } catch (e) {}

        function restoreOrigin(callback) {
            try {
                if (
                    originController &&
                    Lampa.Controller &&
                    typeof Lampa.Controller.toggle === 'function'
                ) {
                    Lampa.Controller.toggle(originController);
                }
            } catch (e) {}

            // Android needs one tick after controller restoration.
            setTimeout(callback, 80);
        }

        if (window.Lampa && Lampa.Input && typeof Lampa.Input.edit === 'function') {
            Lampa.Input.edit({
                title: title || 'RMEDIA PIN',
                value: '',
                free: true,
                nosave: true,
                nomic: true,
                password: true
            }, function (value) {
                const ok = String(value || '').trim() === String(expected);

                if (ok) {
                    restoreOrigin(function () {
                        onSuccess();
                    });
                } else {
                    restoreOrigin(function () {
                        if (wrongMode === 'menu') {
                            try {
                                if (Lampa.Noty && Lampa.Noty.show) {
                                    Lampa.Noty.show('Неверный PIN');
                                }
                            } catch (e) {}
                        } else {
                            /*
                             * For ADMIN PIN do not call denyPinAndExit after
                             * restoring Head/Content: that would force Content
                             * and can itself break Android navigation.
                             * Just keep client mode and notify.
                             */
                            unlocked = false;
                            hideRestrictedUI();

                            try {
                                if (Lampa.Noty && Lampa.Noty.show) {
                                    Lampa.Noty.show('Неверный PIN');
                                }
                            } catch (e) {}
                        }
                    });
                }
            });

            return;
        }

        const entered = window.prompt(title || 'RMEDIA PIN');
        if (entered === null) return;

        if (String(entered).trim() === String(expected)) onSuccess();
        else {
            try {
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Неверный PIN');
            } catch (e) {}
        }
    }

    function askPin(onSuccess) {
        askSpecificPin(getPin(), 'RMEDIA ADMIN PIN', onSuccess, 'admin');
    }

    function askMenuPin(onSuccess) {
        askSpecificPin(getMenuPin(), 'PIN меню', onSuccess, 'menu');
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
            const candidates = $('.head__title, .head__time, .time, .head__time-now, .head__clock');

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
            bindExtensionsGate();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function protectAdminClicks() {
        $(document).on(
            'click.rmedia-lock hover:enter.rmedia-lock',
            '.open--settings, .open--profile, .open--console, .open--terminal, .head__action[data-action="console"], .head__action[data-action="terminal"], .menu__item[data-action="settings"], .menu__item[data-action="about"], .menu__item[data-action="console"], .menu__item[data-action="edit"], .navigation-bar__item[data-action="settings"]',
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

    function isProtectedSettingsFolder(item) {
        if (!item || !item.length) return false;

        const component = String(item.attr('data-component') || '').toLowerCase();
        const title = String(item.find('.settings-folder__name').text() || item.text() || '').trim().toLowerCase();

        if (component === 'rmedia_lock') return true;
        if (title.indexOf('rmedia lock') >= 0) return true;

        // Filmix component name can differ between plugin versions,
        // so protect both by component id fingerprint and visible title.
        if (component.indexOf('filmix') >= 0) return true;
        if (title === 'filmix' || title.indexOf('filmix') >= 0) return true;

        return false;
    }

    function openProtectedComponent(component) {
        if (!component || !window.Lampa || !Lampa.Settings) return;

        try {
            // Native Settings Main does this before Settings.create().
            // Without detach Android can leave two settings controllers/layers
            // alive and the screen looks frozen.
            if (Lampa.Settings.main && Lampa.Settings.main().render) {
                Lampa.Settings.main().render().detach();
            }
        } catch (e) {}

        setTimeout(function () {
            try {
                if (typeof Lampa.Settings.create === 'function') {
                    Lampa.Settings.create(component);
                }
            } catch (e) {
                try {
                    if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                        Lampa.Controller.toggle('settings');
                    }
                } catch (err) {}
            }
        }, 30);
    }

    function bindProtectedComponentsGate() {
        if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.main) return;

        let root;

        try {
            root = Lampa.Settings.main().render();
        } catch (e) {
            root = $('.settings__body');
        }

        if (!root || !root.length) return;

        root.find('.settings-folder').each(function () {
            const item = $(this);
            if (!isProtectedSettingsFolder(item)) return;

            if (item.attr('data-rmedia-protected') === '1') return;
            item.attr('data-rmedia-protected', '1');

            const component = item.attr('data-component');

            // Settings.main() binds its own hover:enter, so replace only
            // this protected row with our PIN gate.
            item.off('hover:enter');

            item.on('hover:enter.rmedia-protected', function (e) {
                if (!isEnabled()) {
                    openProtectedComponent(component);
                    return;
                }

                if (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }

                askMenuPin(function () {
                    openProtectedComponent(component);
                });

                return false;
            });

            // Touch Safari can dispatch click in addition to hover:enter.
            item.off('click.rmedia-protected').on('click.rmedia-protected', function (e) {
                if (!isEnabled()) return;

                e.preventDefault();
                e.stopImmediatePropagation();

                askMenuPin(function () {
                    openProtectedComponent(component);
                });

                return false;
            });
        });

        protectedComponentsBound = true;
    }

    function closeSettingsToContent() {
        safeSyncOpening = false;
        safeSyncAccountReached = false;

        try {
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('content');
            }
        } catch (e) {}

        setTimeout(function () {
            try {
                $('body').removeClass('settings--open');
                if (Lampa.Settings && Lampa.Settings.render) {
                    Lampa.Settings.render().removeClass('animate animate-down');
                }
                hideRestrictedUI();
                hideClientHeadExtras();
            } catch (e) {}
        }, 0);
    }

    function bindMobileSettingsBackFix() {
        if (mobileBackBound) return;
        mobileBackBound = true;

        $(document).on(
            'click.rmedia-mobileback hover:enter.rmedia-mobileback',
            '.navigation-bar__item[data-action="back"]',
            function (e) {
                if (!$('body').hasClass('settings--open')) return;

                if (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }

                closeSettingsToContent();
                return false;
            }
        );
    }

    function bindExtensionsGate() {
        if (!window.Lampa || !Lampa.Settings || !Lampa.Extensions) return;

        const item = Lampa.Settings.main().render().find('[data-component="plugins"]');
        if (!item.length) return;

        /*
         * Native Lampa binds this row to Extensions.show().
         * Replace that handler with our PIN gate.
         */
        item.unbind('hover:enter.rmedia-extpin');
        item.unbind('hover:enter');

        item.on('hover:enter.rmedia-extpin', function (e) {
            if (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            askPin(function () {
                try {
                    Lampa.Extensions.show();
                } catch (err) {
                    try {
                        if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Не удалось открыть Расширения');
                    } catch (e2) {}
                }
            });

            return false;
        });

        extensionGateBound = true;
    }

    function pruneAccountPanel(body) {
        if (!safeSyncOpening || unlocked || !body || !body.length) return;

        body.find('.settings--account-user-info').hide();
        body.find('.settings--account-user-profile').hide();
        body.find('.settings--account-user-out').hide();

        body.find('.settings--account-user-sync').show();
        body.find('.settings--account-user-backup').show();

        body.find('.ad-server').hide();
        body.find('[data-name="account_use"]').hide();
        body.find('.settings-param__label').hide();

        body.find('.settings--account-signin').not('.hide').show();
    }

    function focusSafeSync(body) {
        if (!safeSyncOpening || unlocked || !body || !body.length) return;

        try {
            const sync = body.find('.settings--account-user-sync:visible').first();
            const backup = body.find('.settings--account-user-backup:visible').first();

            // На ТВ после скрытия лишних пунктов старая коллекция Navigator
            // всё ещё может содержать скрытые элементы. Пересобираем её только
            // из реально видимых selector'ов и сразу ставим фокус на Sync.
            if (Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function') {
                Lampa.Controller.collectionSet(body, false, true);
            }

            let target = sync.length ? sync : backup;

            if (target && target.length &&
                Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function') {
                Lampa.Controller.collectionFocus(target, body, true);
            }
        } catch (err) {
            console.warn('[RMEDIA Lock] TV safe sync focus failed', err);
        }
    }

    function exitSafeSync() {
        safeSyncOpening = false;
        safeSyncAccountReached = false;

        try {
            $('body').removeClass('settings--open');

            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('content');
            }
        } catch (e) {}

        hideRestrictedUI();
    }

    function openSafeSync() {
        safeSyncOpening = true;
        safeSyncAccountReached = false;

        try {
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                Lampa.Controller.toggle('settings');
            }

            setTimeout(function () {
                try {
                    if (Lampa.Settings && typeof Lampa.Settings.create === 'function') {
                        Lampa.Settings.create('account');
                    }
                } catch (err) {}
            }, 80);
        } catch (e) {}
    }

    function addClientSyncMenu() {
        // В v11.7 боковую кнопку синхронизации убираем.
        // Оставляем только верхнюю кнопку, которая лучше работает с ТВ-пультом.
        $('.menu__item[data-action="rmedia_sync"], .rmedia-sync-menu').remove();
        syncButtonAdded = false;
    }

    function addClientSyncHead() {
        if (syncHeadAdded || !window.Lampa || !Lampa.Head || typeof Lampa.Head.addIcon !== 'function') return;

        const icon =
            '<svg viewBox="0 0 24 24">' +
            '<path fill="currentColor" d="M12 4a8 8 0 0 1 7.45 5.1l1.85-.62-2.58 4.3-4.32-2.55 1.95-.65A4.8 4.8 0 0 0 12 7.2a4.79 4.79 0 0 0-4.15 2.4L5.08 8A8 8 0 0 1 12 4Zm-7.45 10.9-1.85.62 2.58-4.3 4.32 2.55-1.95.65A4.8 4.8 0 0 0 12 16.8a4.79 4.79 0 0 0 4.15-2.4L18.92 16A8 8 0 0 1 12 20a8 8 0 0 1-7.45-5.1Z"/>' +
            '</svg>';

        const item = Lampa.Head.addIcon(icon, function () {
            // После hover:long телевизор часто ещё присылает обычный Enter
            // при отпускании OK. Его один раз поглощаем.
            if (suppressNextSyncEnter) {
                suppressNextSyncEnter = false;
                return;
            }

            openSafeSync();
        });

        if (item && item.attr) {
            item.attr('data-rmedia-sync-head', '1');
            item.attr('title', 'Синхронизация');

            item.off('hover:long.rmedia-admin').on('hover:long.rmedia-admin', function (e) {
                if (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }

                // Не даём отпусканию долгого OK открыть Safe Sync/Settings.
                suppressNextSyncEnter = true;

                // Страховка: через 2 сек флаг снимается, даже если TV не пришлёт Enter.
                setTimeout(function () {
                    suppressNextSyncEnter = false;
                }, 2000);

                if (unlocked) {
                    lockNow();
                    try {
                        if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.toggle('content');
                        }
                    } catch (err) {}
                } else {
                    askPin(unlockNow);
                }

                return false;
            });
        }

        syncHeadAdded = true;
    }

    function bindTvAdminShortcut() {
        // v11.9: глобальный секрет по стрелкам отключён.
        // На ТВ админ-вход теперь через ДОЛГОЕ нажатие OK
        // на верхней кнопке «Синхронизация».
    }

    function watchSettings() {
        try {
            if (Lampa.Settings && Lampa.Settings.listener && Lampa.Settings.listener.follow) {
                Lampa.Settings.listener.follow('open', function (e) {
                    if (e && e.name === 'main') {
                        setTimeout(bindExtensionsGate, 0);
                        setTimeout(bindExtensionsGate, 120);

                        setTimeout(bindProtectedComponentsGate, 0);
                        setTimeout(bindProtectedComponentsGate, 120);
                        setTimeout(bindProtectedComponentsGate, 350);
                    }

                    if (e && e.name === 'server') {
                        setTimeout(function () { hideTorrPromo(e.body); }, 0);
                        setTimeout(function () { hideTorrPromo(e.body); }, 150);
                        setTimeout(function () { hideTorrPromo(e.body); }, 500);
                    }

                    if (!safeSyncOpening || unlocked) return;

                    if (e.name === 'account') {
                        safeSyncAccountReached = true;

                        setTimeout(function () {
                            pruneAccountPanel(e.body);
                            focusSafeSync(e.body);
                        }, 0);

                        setTimeout(function () {
                            pruneAccountPanel(e.body);
                            focusSafeSync(e.body);
                        }, 120);

                        setTimeout(function () {
                            focusSafeSync(e.body);
                        }, 350);

                        return;
                    }

                    if (e.name === 'main' && safeSyncAccountReached) {
                        setTimeout(exitSafeSync, 0);
                        return;
                    }

                    if (e.name !== 'main') {
                        setTimeout(exitSafeSync, 0);
                    }
                });

                Lampa.Settings.listener.follow('close', function () {
                    safeSyncOpening = false;
                    safeSyncAccountReached = false;
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
                '<path fill="currentColor" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 1 1 4 0v2h-4V6Zm2 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>' +
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
                name: MENU_PIN_KEY,
                type: 'input',
                values: '',
                default: '1111'
            },
            field: {
                name: 'PIN меню',
                description: 'Для входа в RMEDIA Lock и Filmix'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: {
                name: PIN_KEY,
                type: 'input',
                values: '',
                default: '2580'
            },
            field: {
                name: 'PIN администратора',
                description: 'Используется и для входа в Расширения'
            }
        });
    }


    // ===== RMEDIA REMOTE CONTROL v11 =====
    const REMOTE_API = 'http://178.105.179.72:8787';
    const REMOTE_ID_KEY = 'rmedia_remote_client_id';
    const REMOTE_KEY_KEY = 'rmedia_remote_client_key';
    const REMOTE_CACHE_KEY = 'rmedia_remote_last_status';
    const REMOTE_CACHE_TIME_KEY = 'rmedia_remote_last_ok_at';
    const REMOTE_GRACE_MS = 24 * 60 * 60 * 1000;

    let remoteOverlay = null;
    let remoteTimer = null;

    function remoteGet(name, fallback) {
        try {
            const v = Lampa.Storage.get(name, fallback);
            return v == null ? fallback : v;
        } catch(e) {
            try {
                const v = localStorage.getItem(name);
                return v == null ? fallback : v;
            } catch(e2) { return fallback; }
        }
    }

    function remoteSet(name, value) {
        try { Lampa.Storage.set(name, value); return; } catch(e) {}
        try { localStorage.setItem(name, value); } catch(e2) {}
    }

    function remoteClean(value) {
        value = String(value == null ? '' : value).trim();
        if (value === 'undefined' || value === 'null' || value === 'не задано') return '';
        return value;
    }

    function remoteClientId(){ return remoteClean(remoteGet(REMOTE_ID_KEY,'не задано')); }
    function remoteClientKey(){ return remoteClean(remoteGet(REMOTE_KEY_KEY,'не задано')); }

    function removeRemoteOverlay() {
        if (remoteOverlay) {
            remoteOverlay.remove();
            remoteOverlay = null;
        }
    }

    function showRemoteOverlay(status, message) {
        if (!remoteOverlay) {
            remoteOverlay = $('<div class="rmedia-remote-lock"></div>');
            remoteOverlay.css({
                position: 'fixed',
                inset: '0',
                zIndex: '999999',
                background: '#090909',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px',
                textAlign: 'center'
            });
            $('body').append(remoteOverlay);
        }

        const title =
            status === 'pending'
                ? 'Ожидаем подтверждение оплаты'
                : status === 'expired'
                    ? 'Срок доступа закончился'
                    : 'Доступ временно приостановлен';

        function normalizeText(value) {
            return String(value || '')
                .trim()
                .replace(/[.!\s]+$/g, '')
                .toLowerCase();
        }

        const cleanMessage = String(message || '').trim();
        const extraMessage =
            cleanMessage && normalizeText(cleanMessage) !== normalizeText(title)
                ? cleanMessage
                : '';

        remoteOverlay.html(
            '<div style="max-width:720px">' +
                '<div style="font-size:42px;font-weight:700;margin-bottom:18px">RMEDIAHUB</div>' +
                '<div style="font-size:28px;margin-bottom:12px">' + title + '</div>' +
                (extraMessage
                    ? '<div style="font-size:20px;opacity:.75;margin-bottom:10px">' + extraMessage + '</div>'
                    : '') +
                '<div style="font-size:18px;opacity:.9;margin-top:26px">' +
                    'Для связи: ' +
                    '<a href="https://t.me/rznvroman" target="_blank" rel="noopener" ' +
                    'style="color:#8ab4ff;text-decoration:underline;font-weight:600;">t.me/rznvroman</a>' +
                '</div>' +
            '</div>'
        );

        try { Lampa.Controller.toggle('content'); } catch(e) {}
    }

    function applyRemoteStatus(data) {
        if (!data || !data.status) return;

        remoteSet(REMOTE_CACHE_KEY, JSON.stringify(data));
        remoteSet(REMOTE_CACHE_TIME_KEY, String(Date.now()));

        if (data.status === 'active') removeRemoteOverlay();
        else showRemoteOverlay(data.status, data.message || '');
    }

    async function checkRemoteStatus() {
        const id = remoteClientId();
        const key = remoteClientKey();

        // Пока клиент не привязан — не блокируем. Привязку делает админ.
        if (!id || !key) return;

        const url = REMOTE_API + '/v1/client/status?id=' +
                    encodeURIComponent(id) + '&key=' + encodeURIComponent(key) +
                    '&_=' + Date.now();

        try {
            const r = await fetch(url, {cache:'no-store'});
            if (!r.ok) throw new Error('HTTP '+r.status);
            const data = await r.json();
            applyRemoteStatus(data);
        } catch(e) {
            console.warn('[RMEDIA Remote] status check failed', e);

            // Last-known-blocked stays blocked.
            let cached = null;
            try { cached = JSON.parse(remoteGet(REMOTE_CACHE_KEY,'null')); } catch(e2) {}

            if (cached && cached.status && cached.status !== 'active') {
                showRemoteOverlay(cached.status, cached.message || '');
                return;
            }

            // Active clients get 24h grace during backend outage.
            const last = parseInt(remoteGet(REMOTE_CACHE_TIME_KEY,'0'), 10) || 0;
            if (cached && cached.status === 'active' && (Date.now() - last) <= REMOTE_GRACE_MS) {
                removeRemoteOverlay();
                return;
            }

            // After grace expires, verification is required.
            if (cached && cached.status === 'active' && last) {
                showRemoteOverlay('blocked', 'Не удалось подтвердить статус доступа. Повторите позже.');
            }
        }
    }

    function addRemoteAdminSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        try {
            let oldId = Lampa.Storage.get(REMOTE_ID_KEY, 'не задано');
            let oldKey = Lampa.Storage.get(REMOTE_KEY_KEY, 'не задано');

            if (oldId === undefined || oldId === null || String(oldId) === 'undefined')
                Lampa.Storage.set(REMOTE_ID_KEY, 'не задано');

            if (oldKey === undefined || oldKey === null || String(oldKey) === 'undefined')
                Lampa.Storage.set(REMOTE_KEY_KEY, 'не задано');
        } catch(e) {}

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: { name: REMOTE_ID_KEY, type: 'input', values: '', default: 'не задано' },
            field: {
                name: 'RMEDIA Client ID',
                description: 'Например RM-1A2B3C4D'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: { name: REMOTE_KEY_KEY, type: 'input', values: '', default: 'не задано' },
            field: {
                name: 'RMEDIA Client Key',
                description: 'Секретный ключ клиента из панели RMEDIA Control'
            }
        });
    }

    function initRemoteControl() {
        addRemoteAdminSettings();
        checkRemoteStatus();

        if (remoteTimer) clearInterval(remoteTimer);
        remoteTimer = setInterval(checkRemoteStatus, 60 * 1000);

        // Re-check when app returns to foreground / tab.
        document.addEventListener('visibilitychange', function(){
            if (!document.hidden) checkRemoteStatus();
        });
    }
    // ===== /RMEDIA REMOTE CONTROL v11 =====

    function hideClientHeadExtras() {
        if (unlocked) return;

        try {
            $('.open--profile, .open--console, .open--terminal, .head__action[data-action="console"], .head__action[data-action="terminal"]').hide();

            $('.head__action').each(function () {
                const el = $(this);
                if (el.attr('data-rmedia-sync-head') === '1') return;

                const fingerprint = [
                    el.attr('class') || '',
                    el.attr('title') || '',
                    el.attr('data-action') || '',
                    el.html() || ''
                ].join(' ').toLowerCase();

                if (
                    fingerprint.indexOf('console') >= 0 ||
                    fingerprint.indexOf('terminal') >= 0 ||
                    fingerprint.indexOf('sprite-console') >= 0 ||
                    fingerprint.indexOf('sprite-terminal') >= 0
                ) {
                    el.hide();
                }
            });
        } catch (e) {}
    }

    function guardConsoleController() {
        if (!window.Lampa || !Lampa.Controller || Lampa.Controller.__rmedia_console_guard) return;

        const originalToggle = Lampa.Controller.toggle.bind(Lampa.Controller);

        Lampa.Controller.toggle = function (name) {
            if (!unlocked && (name === 'console' || name === 'console-tabs' || name === 'console-body')) {
                try {
                    hideClientHeadExtras();
                    Lampa.Noty && Lampa.Noty.show && Lampa.Noty.show('Недоступно в клиентском режиме');
                } catch (e) {}
                return;
            }

            return originalToggle.apply(null, arguments);
        };

        Lampa.Controller.__rmedia_console_guard = true;
    }

    function installIphoneCardLayout() {
        if (document.getElementById('rmedia-iphone-card-layout')) return;

        const ua = navigator.userAgent || '';
        const isiOS =
            /iPhone|iPad|iPod/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (!isiOS) return;

        const style = document.createElement('style');
        style.id = 'rmedia-iphone-card-layout';
        style.textContent = `
            @media screen and (max-width: 700px) {
                /* iPhone: показываем постер отдельной карточкой,
                   а весь текст и кнопки — НИЖЕ, без наложения. */

                .full-start-new__body {
                    display: block !important;
                }

                .full-start-new__left {
                    width: 58vw !important;
                    max-width: 240px !important;
                    min-width: 180px !important;
                    margin: 0 auto 1.4em !important;
                }

                .full-start-new__poster {
                    padding-bottom: 150% !important;
                    background: transparent !important;
                    border-radius: 1.2em !important;
                    overflow: hidden !important;
                }

                .full-start-new__img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    transform: none !important;
                    border-radius: 1.2em !important;
                    opacity: 1 !important;
                }

                .full-start-new__right {
                    margin: 0 !important;
                    padding: 0 !important;
                    position: static !important;
                    z-index: auto !important;
                    background: none !important;
                    border-radius: 0 !important;
                    overflow: visible !important;
                }

                .full-start-new__head,
                .full-start-new__title,
                .full-start-new__tagline,
                .full-start-new__rate-line,
                .full-start-new__details,
                .full-start-new__reactions,
                .full-start-new__buttons {
                    position: static !important;
                }

                .full-start-new__title {
                    -webkit-line-clamp: 3 !important;
                    line-clamp: 3 !important;
                    margin-top: 0 !important;
                }

                .full-start-new {
                    padding-bottom: 1.5em !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        installIphoneCardLayout();
        addAdminSettings();
        guardConsoleController();
        hideClientHeadExtras();
        initRemoteControl();
        addClientSyncMenu();
        addClientSyncHead();
        bindTvAdminShortcut();
        watchSettings();
        hideRestrictedUI();
        bindSecretGesture();
        protectAdminClicks();
        bindMobileSettingsBackFix();

        setTimeout(bindExtensionsGate, 300);
        setTimeout(bindExtensionsGate, 1000);

        setTimeout(bindProtectedComponentsGate, 300);
        setTimeout(bindProtectedComponentsGate, 1000);

        setInterval(function () {
            addClientSyncMenu();
            addClientSyncHead();
            hideRestrictedUI();
            hideClientHeadExtras();

            if (!extensionGateBound || $('.settings__body').length) {
                bindExtensionsGate();
            }

            if (!protectedComponentsBound || $('.settings__body').length) {
                bindProtectedComponentsGate();
            }
        }, 1000);

        console.log('[RMEDIA Lock v11.16 Android PIN Controller Restore] Ready');
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
