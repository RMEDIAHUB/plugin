(function () {
    'use strict';

    if (window.rmedia_player_v8_ready) return;
    window.rmedia_player_v8_ready = true;

    const COMPONENT = 'rmedia_player';
    const ENABLED   = 'rmedia_player_enabled';
    const PLAYER    = 'rmedia_player_type';

    const PLAYER_LABELS = {
        'inner':     'Встроенный плеер Lampa',
        'vlc':       'VLC',
        'mpc-be':    'MPC-BE',
        'mpc-hc':    'MPC-HC',
        'mpc-qt':    'MPC-QT',
        'kmplayer':  'KMPlayer',
        'potplayer': 'PotPlayer',
        'ask':       'Спрашивать каждый раз'
    };

    let bypassOnce = false;

    function isWindowsBrowser() {
        const ua = navigator.userAgent || '';
        return /Windows NT/i.test(ua) && !/Electron/i.test(ua);
    }

    function isIOS() {
        const ua = navigator.userAgent || '';
        return /iPhone|iPad|iPod/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    let iosEventHookInstalled = false;

    const IOS_PLAYERS_V8 = [
        { title: 'VLC',         value: 'vlc',         runas: 'vlc' },
        { title: 'Infuse',      value: 'infuse',      runas: 'infuse' },
        { title: 'nPlayer',     value: 'nplayer',     runas: 'nplayer' },
        { title: 'VidHub',      value: 'vidhub',      runas: 'vidhub' },
        { title: 'SVPlayer',    value: 'svplayer',    runas: 'svplayer' },
        { title: 'TracyPlayer', value: 'tracyplayer', runas: 'tracyplayer' },
        { title: 'SenPlayer',   value: 'senplayer',   runas: 'senplayer' },
        { title: 'Встроенный',  value: 'inner',       runas: 'lampa' }
    ];

    function isApplePlatform() {
        try {
            if (window.Lampa && Lampa.Platform &&
                (Lampa.Platform.is('apple') || Lampa.Platform.is('apple_tv'))) return true;
        } catch (e) {}

        return isIOS();
    }

    function forceTorrentVLC() {
        if (!isApplePlatform() || !window.Lampa || !Lampa.Storage) return;

        try {
            if (Lampa.Storage.get('player_torrent', '') !== 'vlc') {
                Lampa.Storage.set('player_torrent', 'vlc');
            }
        } catch (e) {}
    }

    function showTorrentPlayerPicker(row, originalLongHandler) {
        if (!window.Lampa || !Lampa.Select) return;

        let current = 'vlc';
        try {
            current = Lampa.Storage.get('player_torrent', 'vlc');
        } catch (e) {}

        const items = IOS_PLAYERS_V8.map(function (p) {
            return {
                title: p.title + (current === p.value ? ' ✓' : ''),
                rmedia_player: p.value,
                rmedia_runas: p.runas
            };
        });

        items.push({
            title: 'Ещё действия',
            rmedia_more: true
        });

        const enabled = Lampa.Controller && Lampa.Controller.enabled
            ? Lampa.Controller.enabled()
            : null;

        Lampa.Select.show({
            title: 'Открыть торрент в плеере',
            items: items,

            onBack: function () {
                if (enabled && enabled.name && Lampa.Controller) {
                    Lampa.Controller.toggle(enabled.name);
                }
            },

            onSelect: function (item) {
                if (!item) return;

                if (item.rmedia_more) {
                    // Open Lampa's original long-press actions.
                    if (enabled && enabled.name && Lampa.Controller) {
                        Lampa.Controller.toggle(enabled.name);
                    }

                    setTimeout(function () {
                        originalLongHandler.call(row[0]);
                    }, 30);
                    return;
                }

                if (!item.rmedia_player) return;

                try {
                    if (item.rmedia_player === 'inner') {
                        Lampa.Storage.set('player_torrent', 'inner');
                    } else {
                        Lampa.Storage.set('player_torrent', item.rmedia_player);
                    }
                } catch (e) {}

                if (enabled && enabled.name && Lampa.Controller) {
                    Lampa.Controller.toggle(enabled.name);
                }

                try {
                    if (Lampa.Player && typeof Lampa.Player.runas === 'function') {
                        Lampa.Player.runas(item.rmedia_runas);
                    }
                } catch (e) {}

                setTimeout(function () {
                    row.trigger('hover:enter');
                }, 40);
            }
        });
    }

    function installIOSTorrentEventHook() {
        if (!isApplePlatform() || iosEventHookInstalled || !window.jQuery) return;

        const $ = window.jQuery;
        const originalOn = $.fn.on;

        $.fn.on = function () {
            const args = Array.prototype.slice.call(arguments);
            const events = args[0];

            // Torrent rows are created dynamically; intercept handlers at registration time.
            if (typeof events === 'string' &&
                this && this.length &&
                this.first().is &&
                (this.first().is('.torrent-file') || this.first().is('.torrent-serial'))) {

                // Find handler: .on(events, handler) or .on(events, selector, handler)
                let handlerIndex = -1;
                for (let i = args.length - 1; i >= 1; i--) {
                    if (typeof args[i] === 'function') {
                        handlerIndex = i;
                        break;
                    }
                }

                if (handlerIndex >= 0) {
                    const originalHandler = args[handlerIndex];

                    if (events.indexOf('hover:enter') >= 0) {
                        args[handlerIndex] = function () {
                            // Default iOS/iPad torrent behavior: VLC.
                            forceTorrentVLC();
                            return originalHandler.apply(this, arguments);
                        };
                    }

                    if (events.indexOf('hover:long') >= 0) {
                        args[handlerIndex] = function () {
                            const row = $(this);
                            showTorrentPlayerPicker(row, originalHandler);
                            return false;
                        };
                    }
                }
            }

            return originalOn.apply(this, args);
        };

        iosEventHookInstalled = true;
        console.log('[RMEDIA Player v8] iOS/iPad torrent event hook installed');
    }

    function configureIOS() {
        if (!isApplePlatform() || !window.Lampa || !Lampa.Storage) return;

        installIOSTorrentEventHook();
        forceTorrentVLC();

        console.log('[RMEDIA Player v8] iPhone/iPad: torrent default VLC + direct long-press picker');
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        const icon =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path fill="currentColor" d="M8 5v14l11-7z"/>' +
            '<path fill="currentColor" opacity=".45" d="M3 4h2v16H3z"/>' +
            '</svg>';

        Lampa.SettingsApi.addComponent({
            component: COMPONENT,
            name: 'RMEDIA Player',
            icon: icon
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: ENABLED,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Использовать RMEDIA Player',
                description: 'Выбор встроенного или внешнего плеера на Windows'
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: PLAYER,
                type: 'select',
                values: {
                    'inner':     'Встроенный плеер Lampa',
                    'vlc':       'VLC',
                    'mpc-be':    'MPC-BE',
                    'mpc-hc':    'MPC-HC',
                    'mpc-qt':    'MPC-QT',
                    'kmplayer':  'KMPlayer',
                    'potplayer': 'PotPlayer',
                    'ask':       'Спрашивать каждый раз'
                },
                default: 'vlc'
            },
            field: {
                name: 'Плеер по умолчанию',
                description: 'Встроенный режим не вмешивается в штатный запуск Lampa'
            }
        });
    }

    function init() {
        if (isApplePlatform()) {
            configureIOS();

            // Lampa/CUB can initialize settings after plugins, so repeat.
            setTimeout(configureIOS, 300);
            setTimeout(configureIOS, 1000);
            setTimeout(configureIOS, 3000);
            setTimeout(configureIOS, 7000);

            return;
        }

        if (!isWindowsBrowser()) return;

        addSettings();
        Lampa.Player.listener.follow('create', onCreate);

        console.log('[RMEDIA Player v8] Windows bridge ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
