(function () {
    'use strict';

    if (window.rmedia_lock_test48_ready) return;
    window.rmedia_lock_test48_ready = true;

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
    let menuPinBusy = false;
    let remoteUpPresses = [];
    let suppressNextSyncEnter = false;
    let clientMenuRegistered = false;

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

        /*
         * Settings/Profile icons were hidden while Head collection was built.
         * On Android simply showing them is not enough: Navigator still uses
         * the old collection and skips Settings. Re-toggle Head so Lampa
         * rebuilds collectionSet() from currently visible selectors.
         */
        setTimeout(function () {
            try {
                const enabled = Lampa.Controller && Lampa.Controller.enabled
                    ? Lampa.Controller.enabled()
                    : null;

                if (enabled && enabled.name === 'head' &&
                    Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                    Lampa.Controller.toggle('head');
                }
            } catch (e) {}
        }, 80);

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

    function askSpecificPin(expected, title, onSuccess, wrongMode, onDone) {
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

        let finished = false;
        function finishOnce() {
            if (finished) return;
            finished = true;
            try {
                if (typeof onDone === 'function') onDone();
            } catch (e) {}
        }

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
                        finishOnce();
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
        if (entered === null) {
            finishOnce();
            return;
        }

        if (String(entered).trim() === String(expected)) onSuccess();
        else {
            finishOnce();
            try {
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show('Неверный PIN');
            } catch (e) {}
        }
    }

    function askPin(onSuccess) {
        askSpecificPin(getPin(), 'RMEDIA ADMIN PIN', onSuccess, 'admin');
    }

    function askMenuPin(onSuccess) {
        // Chrome/desktop may emit both Lampa hover:enter and native click
        // for the same activation. Allow only one menu PIN dialog at a time.
        if (menuPinBusy) return;

        menuPinBusy = true;

        askSpecificPin(
            getMenuPin(),
            'PIN меню',
            function () {
                menuPinBusy = false;
                onSuccess();
            },
            'menu',
            function () {
                menuPinBusy = false;
            }
        );
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

    function bindSafePlayerButton() {
        // Open a native Lampa settings component that contains only approved items.
        let openingTimer = null;

        $(document)
            .off('click.rmedia-player hover:enter.rmedia-player', '.open--settings')
            .on(
                'click.rmedia-player hover:enter.rmedia-player',
                '.open--settings',
                function (e) {
                    if (!isEnabled() || unlocked) return;

                    if (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }

                    // Touch can send both hover:enter and click for one press.
                    if (openingTimer !== null) clearTimeout(openingTimer);
                    openingTimer = setTimeout(function () {
                        openingTimer = null;
                        if (!isEnabled() || unlocked) return;
                        try {
                            if (Lampa.Settings && typeof Lampa.Settings.create === 'function') {
                                if (Lampa.Settings.main && Lampa.Settings.main().render) {
                                    Lampa.Settings.main().render().detach();
                                }
                                Lampa.Settings.create('rmedia_client_menu');
                            }
                        } catch (err) {
                            try {
                                if (Lampa.Noty && Lampa.Noty.show) {
                                    Lampa.Noty.show('Не удалось открыть Плеер');
                                }
                            } catch (e2) {}
                        }
                    }, 30);

                    return false;
                }
            );
    }

    function collectPluginSettings() {
        const found = [];
        try {
            if (!Lampa.Settings || !Lampa.Settings.main) return found;
            const root = Lampa.Settings.main().render();
            root.find('.settings-folder[data-component]').each(function () {
                const item = $(this);
                const component = String(item.attr('data-component') || '').trim();
                const title = String(item.find('.settings-folder__name').text() || item.text() || '').trim();
                if (!component || !title || isProtectedSettingsFolder(item)) return;
                if (/^(player|account|interface|channels|parser|server|tmdb|plugins|parent_control|rmedia_client_menu)$/i.test(component)) return;
                if (component.indexOf('rmedia_') === 0) return;
                found.push({component: component, title: title});
            });
        } catch (e) {}
        const seen = {};
        return found.filter(function (plugin) {
            if (seen[plugin.component]) return false;
            seen[plugin.component] = true;
            return true;
        });
    }

    function leaveClientSettings(action) {
        closeSettingsToContent();
        setTimeout(action, 80);
    }

    function addClientMenuSettings() {
        if (clientMenuRegistered || !window.Lampa || !Lampa.SettingsApi) return;
        clientMenuRegistered = true;

        Lampa.SettingsApi.addComponent({
            component: 'rmedia_client_menu',
            name: 'Настройки',
            icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94a7.5 7.5 0 0 0 .05-.94 7.5 7.5 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.2 7.2 0 0 0-1.63-.94L14.87 3h-3.84l-.36 3.18a7.2 7.2 0 0 0-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.5 7.5 0 0 0-.05.94 7.5 7.5 0 0 0 .05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.4 1.05.72 1.63.94l.36 3.18h3.84l.36-3.18a7.2 7.2 0 0 0 1.63-.94l2.39.96 1.92-3.32-2.03-1.58ZM12.95 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>'
        });

        function addButton(name, title, callback) {
            Lampa.SettingsApi.addParam({
                component: 'rmedia_client_menu',
                param: {name: name, type: 'button'},
                field: {name: title},
                onChange: callback
            });
        }

        addButton('rmedia_client_player', '▶　Плеер', function () {
            leaveClientSettings(function () { Lampa.Settings.create('player', {onBack: closeSettingsToContent}); });
        });
        addButton('rmedia_client_sync', '↻　Синхронизация', function () {
            leaveClientSettings(openSafeSync);
        });
        addButton('rmedia_client_speed', '🚀　Тест скорости сервера', function () {
            leaveClientSettings(runServerSpeedTest);
        });

        collectPluginSettings().forEach(function (plugin, index) {
            addButton('rmedia_client_plugin_' + index, '🧩　' + plugin.title, function () {
                leaveClientSettings(function () {
                    Lampa.Settings.create(plugin.component, {onBack: closeSettingsToContent});
                });
            });
        });
    }

    function runServerSpeedTest() {
        let complete = false;
        const attempt = function () {
            if (complete) return false;
            const candidates = $('.settings__body').find('.selector, .settings-param, .settings-param__item').filter(function () {
                const label = String($(this).text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
                return label === 'тестировать скорость' || label.indexOf('тестировать скорость') === 0 || label.indexOf('test speed') === 0;
            });
            if (!candidates.length) return false;
            complete = true;
            $('.settings__body').find('.settings-param, .settings-param__item').hide();
            candidates.first().show();
            candidates.first().trigger('hover:enter');
            return true;
        };
        const fail = function () {
            if (complete) return;
            complete = true;
            closeSettingsToContent();
            try { Lampa.Noty && Lampa.Noty.show && Lampa.Noty.show('Не удалось найти тест скорости в этой версии TorrServer'); } catch (e) {}
        };
        try {
            if (Lampa.Settings.listener && Lampa.Settings.listener.follow) {
                const onOpen = function (e) {
                    if (!e || e.name !== 'server') return;
                    Lampa.Settings.listener.remove && Lampa.Settings.listener.remove('open', onOpen);
                    let tries = 0;
                    const timer = setInterval(function () {
                        if (attempt() || ++tries >= 20) {
                            clearInterval(timer);
                            if (!complete) fail();
                        }
                    }, 150);
                };
                Lampa.Settings.listener.follow('open', onOpen);
            }
            Lampa.Settings.create('server', {onBack: closeSettingsToContent});
            let tries = 0;
            const timer = setInterval(function () {
                if (attempt() || ++tries > 20) {
                    clearInterval(timer);
                    if (!complete) fail();
                }
            }, 150);
            setTimeout(fail, 3500);
        } catch (e) { fail(); }
    }

    function protectAdminClicks() {
        $(document).on(
            'click.rmedia-lock hover:enter.rmedia-lock',
            '.open--profile, .open--console, .open--terminal, .head__action[data-action="console"], .head__action[data-action="terminal"], .menu__item[data-action="settings"], .menu__item[data-action="about"], .menu__item[data-action="console"], .menu__item[data-action="edit"], .navigation-bar__item[data-action="settings"]',
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

        // Protect the third-party extensions catalog shown as
        // «Пиратские плагины». Different builds may use different
        // component ids, so check both component and visible title.
        if (component.indexOf('pirat') >= 0 || component.indexOf('pirate') >= 0) return true;
        if (title.indexOf('пиратские плагины') >= 0) return true;

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

            item.attr('data-rmedia-protected', '1');

            const component = item.attr('data-component');

            /*
             * DO NOT skip already-marked rows.
             * Lampa Settings Main.update() re-binds native hover:enter every
             * time the main settings screen is opened. Therefore our PIN gate
             * must replace that native handler again on every pass.
             */
            item.off('hover:enter');

            item.on('hover:enter.rmedia-protected', function (e) {
                item.data('rmedia-last-enter', Date.now());

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

                const lastEnter = Number(item.data('rmedia-last-enter') || 0);

                // Same physical click already handled by Lampa hover:enter.
                if (Date.now() - lastEnter < 700) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return false;
                }

                // Desktop Chrome does not need a second native click path.
                // Keep this only as fallback for touch/mobile browsers.
                const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
                if (!isTouch) return;

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

            askMenuPin(function () {
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
                        setTimeout(bindProtectedComponentsGate, 700);
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
    // Migration target: 2.28.75.180. The public port/protocol must be verified
    // from docker-compose / reverse-proxy configuration before changing this.
    // Set a verified full URL here for all installations, or in admin settings.
    const REMOTE_API_VERIFIED = '';
    const REMOTE_API_KEY = 'rmedia_remote_api_url';
    const REMOTE_ID_KEY = 'rmedia_remote_client_id';
    const REMOTE_KEY_KEY = 'rmedia_remote_client_key';
    const REMOTE_CACHE_KEY = 'rmedia_remote_last_status';
    const REMOTE_CACHE_TIME_KEY = 'rmedia_remote_last_ok_at';
    const REMOTE_INSTALL_ID_KEY = 'rmedia_install_id';
    const REMOTE_GRACE_MS = 24 * 60 * 60 * 1000;

    let remoteOverlay = null;
    let remoteTimer = null;
    let remoteClockTimer = null;
    let remoteData = null;
    let remoteOverlaySignature = '';
    let remoteOriginController = 'content';
    let remoteChecking = false;
    const CONTACT_FALLBACK = 'https://t.me/rznvroman';

    function remoteApi() {
        const candidate = remoteClean(remoteGet(REMOTE_API_KEY, '')) || REMOTE_API_VERIFIED || REMOTE_API;
        const parsed = new URL(candidate);
        if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
            throw new Error('Invalid RMEDIA API URL');
        }
        return candidate.replace(/\/+$/, '');
    }

    function remoteScope() {
        return remoteClientId() + ':' + remoteClientKey() + ':' + makeInstallId() + ':' + remoteApi();
    }

    function remoteNow(data) {
        const server = Date.parse(data && data.server_time);
        const received = Number(data && data._received_at);
        return Number.isFinite(server) && received ? server + (Date.now() - received) : Date.now();
    }

    function remoteEscape(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
        });
    }

    function remoteContact(data) {
        const value = String(data && data.admin_contact_url || CONTACT_FALLBACK);
        try {
            const parsed = new URL(value);
            if (/^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password) return value;
        } catch(e) {}
        return CONTACT_FALLBACK;
    }

    function focusRemoteOverlay() {
        if (!remoteOverlay) return;
        try { Lampa.Controller.toggle('rmedia_remote_lock'); } catch(e) {}
        const button = remoteOverlay.find('.rmedia-contact');
        if (button.length && button[0].focus) button[0].focus();
    }

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

    function makeInstallId() {
        let id = remoteClean(remoteGet(REMOTE_INSTALL_ID_KEY, ''));
        if (id) return id;

        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                id = 'DEV-' + window.crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
            }
        } catch(e) {}

        if (!id) {
            const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let s = '';
            for (let i = 0; i < 12; i++) {
                s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            }
            id = 'DEV-' + s;
        }

        remoteSet(REMOTE_INSTALL_ID_KEY, id);
        return id;
    }

    function detectDeviceInfo() {
        const ua = String((navigator && navigator.userAgent) || '');
        const platformRaw = String((navigator && navigator.platform) || '');
        let platform = platformRaw || 'Web';
        let name = '';

        if (/Tizen/i.test(ua)) {
            platform = 'Tizen';
            name = 'Samsung TV';
        } else if (/Web0S|webOS/i.test(ua)) {
            platform = 'webOS';
            name = 'LG TV';
        } else if (/Android/i.test(ua) && /TV|BRAVIA|AFT|MiTV|SmartTV/i.test(ua)) {
            platform = 'Android TV';
            name = 'Android TV';
        } else if (/Android/i.test(ua)) {
            platform = 'Android';
            name = 'Android';
        } else if (/iPad/i.test(ua) || (platformRaw === 'MacIntel' && navigator.maxTouchPoints > 1)) {
            platform = 'iPadOS';
            name = 'iPad';
        } else if (/iPhone/i.test(ua)) {
            platform = 'iOS';
            name = 'iPhone';
        } else if (/Windows/i.test(ua)) {
            platform = 'Windows';
            name = 'Windows PC';
        } else if (/Macintosh|Mac OS X/i.test(ua)) {
            platform = 'macOS';
            name = 'Mac';
        } else if (/Linux/i.test(ua)) {
            platform = 'Linux';
            name = 'Linux';
        }

        // Some TV user agents expose a model token.
        const modelPatterns = [
            /\b(SM-[A-Z0-9-]+)\b/i,
            /\b(BRAVIA[\w-]*)\b/i,
            /\b(TV-[A-Z0-9-]+)\b/i,
            /\b(LM\d+[A-Z0-9-]*)\b/i,
            /\b(OLED\d+[A-Z0-9-]*)\b/i
        ];

        for (let i = 0; i < modelPatterns.length; i++) {
            const m = ua.match(modelPatterns[i]);
            if (m && m[1]) {
                name = name ? (name + ' · ' + m[1]) : m[1];
                break;
            }
        }

        return {
            install_id: makeInstallId(),
            device_name: name || platform || 'Lampa',
            platform: platform || 'Web',
            user_agent: ua.slice(0, 500)
        };
    }

    function removeRemoteOverlay() {
        if (remoteOverlay) {
            remoteOverlay.remove();
            remoteOverlay = null;
            remoteOverlaySignature = '';
            try { Lampa.Controller.toggle(remoteOriginController || 'content'); } catch(e) {}
        }
    }

    function showRemoteOverlay(status, message, data) {
        const isTestExpired = status === 'expired' && data && data.test &&
            !data.test.converted_at && remoteNow(data) >= Date.parse(data.test.ends_at);
        const creditUntil = Date.parse(data && data.credit_until);
        const creditVisible = isTestExpired && data.credit_available !== false &&
            Number.isFinite(creditUntil) && remoteNow(data) < creditUntil;
        const contact = remoteContact(data);
        const signature = JSON.stringify([status, message, isTestExpired, creditVisible, contact]);
        if (!remoteOverlay) {
            try {
                const origin = Lampa.Controller.enabled();
                remoteOriginController = origin && origin.name || 'content';
            } catch(e) {}
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
            remoteOverlay.attr('role', 'dialog').attr('aria-modal', 'true');
            $('body').append(remoteOverlay);
        }

        const title =
            isTestExpired ? 'ULTIMATE TEST завершён' : status === 'pending'
                ? 'Ожидаем подтверждение оплаты'
                : status === 'expired'
                    ? 'Срок доступа закончился'
                    : status === 'device_limit'
                        ? 'Достигнут лимит устройств'
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

        if (signature !== remoteOverlaySignature) {
          remoteOverlaySignature = signature;
          remoteOverlay.html(
            '<div style="max-width:720px">' +
                '<div style="font-size:42px;font-weight:700;margin-bottom:18px">RMEDIAHUB</div>' +
                '<div style="font-size:28px;margin-bottom:12px">' + title + '</div>' +
                (extraMessage
                    ? '<div style="font-size:20px;opacity:.75;margin-bottom:10px">' + remoteEscape(extraMessage) + '</div>'
                    : '') +
                (creditVisible ? '<div class="rmedia-credit" style="font-size:20px;margin-top:20px">' +
                    '10€ теста можно зачесть в подписку.<br>Осталось: <span class="rmedia-credit-time"></span></div>' : '') +
                '<div style="font-size:18px;opacity:.9;margin-top:26px">' +
                    '<a class="rmedia-contact selector" tabindex="0" href="' + remoteEscape(contact) + '" target="_blank" rel="noopener noreferrer" ' +
                    'style="display:inline-block;padding:14px 20px;border:2px solid #8ab4ff;border-radius:12px;color:#8ab4ff;font-weight:600;">Связаться с администратором</a>' +
                    '<div style="margin-top:12px;overflow-wrap:anywhere">' + remoteEscape(contact.replace(/^https?:\/\//, '')) + '</div>' +
                '</div>' +
            '</div>'
          );
          const button = remoteOverlay.find('.rmedia-contact');
          button.on('hover:enter.rmedia-contact', function () {
              if (this.click) this.click();
          });
          focusRemoteOverlay();
        }
        if (creditVisible) {
            const seconds = Math.max(0, Math.ceil((creditUntil - remoteNow(data)) / 1000));
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor(seconds % 3600 / 60);
            const remainder = seconds % 60;
            remoteOverlay.find('.rmedia-credit-time').text(hours + ' ч ' + minutes + ' мин ' + remainder + ' сек');
        }
    }

    function applyRemoteStatus(data) {
        if (!data || !data.status) return;
        data._received_at = Date.now();
        data._scope = remoteScope();
        remoteData = data;
        remoteSet(REMOTE_CACHE_KEY, JSON.stringify(data));
        remoteSet(REMOTE_CACHE_TIME_KEY, String(Date.now()));
        renderRemoteStatus(data);
    }

    function renderRemoteStatus(data) {
        if (!data) return;
        if (data._scope !== remoteScope()) {
            remoteData = null;
            removeRemoteOverlay();
            return;
        }

        // A test expires locally at its exact server timestamp, even offline.
        if (data.test && !data.test.converted_at && data.status !== 'blocked' &&
            remoteNow(data) >= Date.parse(data.test.ends_at)) {
            showRemoteOverlay('expired', 'ULTIMATE TEST завершён.', data);
            return;
        }
        if (data.device_allowed === false) {
            showRemoteOverlay(data.test_repeat_detected ? 'blocked' : 'device_limit',
                data.message || 'Достигнут лимит устройств. Обратитесь к администратору.', data);
            return;
        }
        const last = Number(data._received_at);
        const liveTest = data.test && !data.test.converted_at && remoteNow(data) < Date.parse(data.test.ends_at);
        if (data.status === 'active' && !liveTest && last && Date.now() - last > REMOTE_GRACE_MS) {
            showRemoteOverlay('blocked', 'Не удалось подтвердить статус доступа. Повторите позже.', data);
            return;
        }
        if (data.status === 'active') removeRemoteOverlay();
        else showRemoteOverlay(data.status, data.message || '', data);
    }

    async function checkRemoteStatus() {
        const id = remoteClientId();
        const key = remoteClientKey();

        // Пока клиент не привязан — не блокируем. Привязку делает админ.
        if (!id || !key) { remoteData = null; removeRemoteOverlay(); return; }
        if (remoteChecking) return;

        const device = detectDeviceInfo();
        let requestScope = '';
        let timeout = null;
        let abort = null;
        remoteChecking = true;
        try {
            requestScope = remoteScope();
            const url = remoteApi() + '/v1/client/heartbeat?_=' + Date.now();
            if (typeof AbortController !== 'undefined') {
                abort = new AbortController();
                timeout = setTimeout(function () { abort.abort(); }, 10000);
            }
            const r = await fetch(url, {
                method: 'POST',
                cache: 'no-store',
                headers: {'Content-Type':'application/json'},
                signal: abort ? abort.signal : undefined,
                body: JSON.stringify({
                    id: id,
                    key: key,
                    install_id: device.install_id,
                    device_name: device.device_name,
                    platform: device.platform,
                    user_agent: device.user_agent
                })
            });
            if (requestScope !== remoteScope()) return;
            if (r.status === 401 || r.status === 403 || r.status === 404) {
                applyRemoteStatus({id:id,status:'blocked',message:'Клиент не найден или ключ доступа изменён.'});
                return;
            }
            if (!r.ok) throw new Error('HTTP '+r.status);
            const data = await r.json();
            if (!data || data.id !== id || !data.status) throw new Error('Invalid RMEDIA response');
            if (requestScope !== remoteScope()) return;
            applyRemoteStatus(data);
        } catch(e) {
            console.warn('[RMEDIA Remote] status check failed', e);

            let cached = null;
            try { cached = JSON.parse(remoteGet(REMOTE_CACHE_KEY,'null')); } catch(e2) {}
            try {
                if (cached && cached._scope === remoteScope()) {
                    remoteData = cached;
                    renderRemoteStatus(cached);
                } else if (!requestScope) {
                    showRemoteOverlay('blocked', 'Проверьте адрес RMEDIA API в админских настройках.');
                }
            } catch(e2) {
                showRemoteOverlay('blocked', 'Проверьте адрес RMEDIA API в админских настройках.');
            }
        } finally {
            if (timeout) clearTimeout(timeout);
            remoteChecking = false;
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
            param: { name: REMOTE_API_KEY, type: 'input', values: '', default: '' },
            field: {
                name: 'RMEDIA API URL',
                description: 'Полный проверенный адрес сервера. Пусто — адрес из сборки.'
            }
        });

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

        Lampa.SettingsApi.addParam({
            component: 'rmedia_lock',
            param: { name: REMOTE_INSTALL_ID_KEY, type: 'input', values: '', default: '' },
            field: {
                name: 'RMEDIA Installation ID',
                description: 'Уникальный ID этой установки. Создаётся автоматически.'
            }
        });
    }

    function initRemoteControl() {
        addRemoteAdminSettings();
        try {
            Lampa.Controller.add('rmedia_remote_lock', {
                invisible: true,
                toggle: function () {
                    if (!remoteOverlay) return;
                    Lampa.Controller.collectionSet(remoteOverlay);
                    Lampa.Controller.collectionFocus(false, remoteOverlay);
                },
                back: focusRemoteOverlay,
                up: focusRemoteOverlay,
                down: focusRemoteOverlay,
                left: focusRemoteOverlay,
                right: focusRemoteOverlay
            });
        } catch(e) {}
        try {
            const cached = JSON.parse(remoteGet(REMOTE_CACHE_KEY, 'null'));
            if (cached && cached._scope === remoteScope()) {
                remoteData = cached;
                renderRemoteStatus(cached);
            }
        } catch(e) {}
        checkRemoteStatus();

        if (remoteTimer) clearInterval(remoteTimer);
        remoteTimer = setInterval(checkRemoteStatus, 60 * 1000);
        if (remoteClockTimer) clearInterval(remoteClockTimer);
        remoteClockTimer = setInterval(function () {
            try { if (remoteData) renderRemoteStatus(remoteData); } catch(e) {}
        }, 1000);

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
        addClientMenuSettings();
        guardConsoleController();
        hideClientHeadExtras();
        initRemoteControl();
        addClientSyncMenu();
        addClientSyncHead();
        bindTvAdminShortcut();
        watchSettings();
        hideRestrictedUI();
        bindSecretGesture();
        bindSafePlayerButton();
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

            if ($('body').hasClass('settings--open') || $('.settings__body').length) {
                bindProtectedComponentsGate();
            }
        }, 1000);

        console.log('[RMEDIA Lock TEST48 + Device Binding + Client Settings] Ready');
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
