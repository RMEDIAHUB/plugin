(function () {
    'use strict';

    if (window.rmedia_player_v7_2_ready) return;
    window.rmedia_player_v7_2_ready = true;

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
        const platform = navigator.platform || '';
        const touch = navigator.maxTouchPoints || 0;

        return /iPhone|iPad|iPod/i.test(ua) ||
            (/Macintosh|MacIntel/i.test(ua + ' ' + platform) && touch > 1) ||
            (/iPad/i.test(platform)) ||
            (touch > 1 && /Safari/i.test(ua) && !/Windows|Android/i.test(ua));
    }

    let iosSelectPatched = false;
    let iosSelectBypass = false;

    const IOS_PLAYERS = [
        { title: 'VLC',        value: 'vlc' },
        { title: 'Infuse',     value: 'infuse' },
        { title: 'nPlayer',    value: 'nplayer' },
        { title: 'VidHub',     value: 'vidhub' },
        { title: 'SVPlayer',   value: 'svplayer' },
        { title: 'TracyPlayer',value: 'tracyplayer' },
        { title: 'SenPlayer',  value: 'senplayer' },
        { title: 'Встроенный', value: 'ios', runas: 'lampa' }
    ];

    function isTorrentActionMenu(options) {
        if (!options || !Array.isArray(options.items)) return false;

        let hasTimeAction = false;
        let hasLampaRun = false;
        let titleFingerprint = '';

        options.items.forEach(function (item) {
            if (!item) return;

            if (item.timeclear || item.timefull) hasTimeAction = true;
            if (item.player === 'lampa') hasLampaRun = true;

            titleFingerprint += ' ' + String(item.title || '').toLowerCase();
        });

        /*
         * Public/minified Lampa builds and plugins may alter the object shape,
         * so additionally detect the native torrent action menu by visible text.
         */
        const hasResetText =
            titleFingerprint.indexOf('сбросить тайм') >= 0 ||
            titleFingerprint.indexOf('reset time') >= 0;

        const hasViewedText =
            titleFingerprint.indexOf('просмотрено') >= 0 ||
            titleFingerprint.indexOf('viewed') >= 0;

        const hasLampaText =
            titleFingerprint.indexOf('lampa') >= 0 &&
            (
                titleFingerprint.indexOf('плеер') >= 0 ||
                titleFingerprint.indexOf('player') >= 0
            );

        const menuTitle = String(options.title || '').toLowerCase();
        const looksLikeActionTitle =
            menuTitle.indexOf('действ') >= 0 ||
            menuTitle.indexOf('action') >= 0 ||
            !menuTitle;

        return looksLikeActionTitle &&
            (
                (hasTimeAction && hasLampaRun) ||
                ((hasResetText || hasViewedText) && hasLampaText)
            );
    }

    function patchIOSTorrentLongPress() {
        if (!isIOS() || !window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') return;

        if (Lampa.Select.show.__rmedia_ios_picker) {
            iosSelectPatched = true;
            return;
        }

        const originalShow = Lampa.Select.show.bind(Lampa.Select);

        Lampa.Select.show = function (options) {
            if (iosSelectBypass || !isTorrentActionMenu(options)) {
                return originalShow(options);
            }

            const current = (Lampa.Storage && Lampa.Storage.field('player_torrent')) || 'vlc';

            const pickerItems = IOS_PLAYERS.map(function (p) {
                return {
                    title: p.title,
                    rmedia_player: p.value,
                    rmedia_runas: p.runas || p.value,
                    selected: current === p.value
                };
            });

            pickerItems.push({
                title: 'Ещё действия',
                rmedia_more: true
            });

            return originalShow({
                title: 'Открыть торрент в плеере',
                items: pickerItems,

                onBack: function () {
                    if (options.onBack) options.onBack();
                },

                onSelect: function (item) {
                    if (item.rmedia_more) {
                        iosSelectBypass = true;
                        try {
                            originalShow(options);
                        } finally {
                            iosSelectBypass = false;
                        }
                        return;
                    }

                    if (!item.rmedia_player) return;

                    try {
                        Lampa.Storage.set('player_torrent', item.rmedia_player);
                    } catch (e) {}

                    /*
                     * Reuse Lampa's own torrent long-press handler:
                     * it calls Player.runas(a.player) and then triggers the
                     * selected file's normal hover:enter path, preserving
                     * preload, timeline, playlist, callbacks, etc.
                     */
                    if (options.onSelect) {
                        options.onSelect({
                            player: item.rmedia_runas
                        });
                    }
                }
            });
        };

        Lampa.Select.show.__rmedia_ios_picker = true;

        iosSelectPatched = true;
        console.log('[RMEDIA Player v7.2] iOS torrent long-press player menu enabled');
    }

    let torrentRowsListenerBound = false;

    function normalizeIOSPlatform() {
        if (!isIOS() || !window.Lampa || !Lampa.Storage) return;

        try {
            const current = Lampa.Storage.get('platform', '');

            /*
             * Some iPad Safari user-agents expose themselves differently and
             * Lampa can leave platform empty. Without platform='apple',
             * Player.start() never enters the iOS external-player branch.
             */
            if (current !== 'apple' && current !== 'apple_tv') {
                Lampa.Storage.set('platform', 'apple');
                $('body')
                    .removeClass('platform--noname platform--browser')
                    .addClass('platform--apple');
            }
        } catch (e) {
            console.warn('[RMEDIA Player v7.2] iOS platform normalize failed:', e);
        }
    }

    function showIOSPlayerPicker(row) {
        if (!row || !row.length || !window.Lampa || !Lampa.Select) return;

        const enabled = Lampa.Controller && Lampa.Controller.enabled
            ? Lampa.Controller.enabled()
            : null;

        const current = (Lampa.Storage && Lampa.Storage.field('player_torrent')) || 'vlc';

        const items = IOS_PLAYERS.map(function (p) {
            return {
                title: p.title + (current === p.value ? ' ✓' : ''),
                value: p.value,
                runas: p.runas || p.value
            };
        });

        Lampa.Select.show({
            title: 'Открыть торрент в плеере',
            items: items,

            onBack: function () {
                if (enabled && enabled.name && Lampa.Controller) {
                    Lampa.Controller.toggle(enabled.name);
                }
            },

            onSelect: function (item) {
                if (!item || !item.value) return;

                try {
                    Lampa.Storage.set('player_torrent', item.value);
                } catch (e) {}

                if (enabled && enabled.name && Lampa.Controller) {
                    Lampa.Controller.toggle(enabled.name);
                }

                /*
                 * Reuse Lampa's normal torrent-file enter flow. For external
                 * players Player.runas() sets a one-shot launch override.
                 */
                try {
                    if (Lampa.Player && typeof Lampa.Player.runas === 'function') {
                        Lampa.Player.runas(item.runas);
                    }
                } catch (e) {}

                setTimeout(function () {
                    row.trigger('hover:enter');
                }, 40);
            }
        });
    }

    function patchTorrentRowsDirect() {
        if (!isIOS() || !window.Lampa || !Lampa.Listener || torrentRowsListenerBound) return;

        torrentRowsListenerBound = true;

        Lampa.Listener.follow('torrent_file', function (event) {
            if (!event || event.type !== 'list_open') return;

            /*
             * torrent_file:list_open fires before rows are fully appended.
             * Bind after render. We remove only Lampa's hover:long handler;
             * short hover:enter stays untouched.
             */
            [80, 250, 600].forEach(function (delay) {
                setTimeout(function () {
                    $('.torrent-files .torrent-file, .torrent-files .torrent-serial').each(function () {
                        const row = $(this);

                        if (row.attr('data-rmedia-ios-long') === '1') return;

                        row.attr('data-rmedia-ios-long', '1');

                        row.off('hover:long');

                        row.on('hover:long.rmedia-ios-player', function (e) {
                            if (e) {
                                try {
                                    e.preventDefault();
                                    e.stopImmediatePropagation();
                                } catch (err) {}
                            }

                            showIOSPlayerPicker(row);
                            return false;
                        });
                    });
                }, delay);
            });
        });

        console.log('[RMEDIA Player v7.2] direct iOS torrent-row long-press patch enabled');
    }

    function configureIOS() {
        if (!isIOS() || !window.Lampa || !Lampa.Storage) return;

        normalizeIOSPlatform();
        patchTorrentRowsDirect();
        patchIOSTorrentLongPress();

        try {
            /*
             * Lampa uses separate storage fields for each playback type:
             *   player         -> normal/online video
             *   player_torrent -> torrent playback
             *
             * We only force torrent playback to VLC.
             * General/online playback is left untouched, so Filmix/online
             * continues to use the built-in Lampa player.
             */
            if (Lampa.Storage.field('player_torrent') !== 'vlc') {
                Lampa.Storage.set('player_torrent', 'vlc');
            }

            console.log('[RMEDIA Player v7.2] iOS: torrent default VLC + long-press player picker; online unchanged');
        } catch (e) {
            console.warn('[RMEDIA Player v7.2] iOS setup failed:', e);
        }
    }

    function toBase64Url(value) {
        const bytes = new TextEncoder().encode(value);
        let binary = '';

        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    function getPlayableUrl(data) {
        if (!data || !data.url) return '';

        let url = data.url;

        try {
            if (window.Lampa && Lampa.Torserver && typeof Lampa.Torserver.toPlayUrl === 'function') {
                url = Lampa.Torserver.toPlayUrl(url);
            }
        } catch (e) {
            console.warn('[RMEDIA Player] Torserver.toPlayUrl failed:', e);
        }

        return url;
    }

    function notify(text) {
        try {
            if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
        } catch (e) {}
    }

    function openExternal(data, playerSlug) {
        const url = getPlayableUrl(data);

        if (!url) {
            notify('RMEDIA Player: не удалось получить ссылку');
            return false;
        }

        const protocolUrl =
            'rmedia://play/' +
            encodeURIComponent(playerSlug) +
            '/' +
            toBase64Url(url);

        console.log('[RMEDIA Player] Open:', PLAYER_LABELS[playerSlug], url);
        window.location.assign(protocolUrl);

        return true;
    }

    function playInsideLampa(data) {
        try {
            /*
             * Do NOT clone torrent play data.
             * Some torrent integrations may attach properties/functions to the
             * original object. Reuse the exact original object and only
             * temporarily force Lampa's native inner-player branch.
             */
            bypassOnce = true;

            const hadLaunchPlayer = Object.prototype.hasOwnProperty.call(data, 'launch_player');
            const previousLaunchPlayer = data.launch_player;

            data.launch_player = 'inner';

            if (Lampa.Player && typeof Lampa.Player.play === 'function') {
                Lampa.Player.play(data);
            } else {
                bypassOnce = false;
                notify('Не удалось запустить встроенный плеер Lampa');
            }

            // Player.play/start reads launch_player synchronously.
            if (hadLaunchPlayer) data.launch_player = previousLaunchPlayer;
            else delete data.launch_player;
        } catch (e) {
            bypassOnce = false;
            console.error('[RMEDIA Player] Inner player error:', e);
            notify('Ошибка запуска встроенного плеера');
        }
    }

    function showPlayerPicker(data) {
        if (!Lampa.Select || typeof Lampa.Select.show !== 'function') {
            notify('RMEDIA Player: меню выбора недоступно');
            return;
        }

        let enabledController = null;

        try {
            if (Lampa.Controller && typeof Lampa.Controller.enabled === 'function') {
                enabledController = Lampa.Controller.enabled();
            }
        } catch (e) {}

        function restoreController() {
            try {
                if (
                    enabledController &&
                    enabledController.name &&
                    Lampa.Controller &&
                    typeof Lampa.Controller.toggle === 'function'
                ) {
                    Lampa.Controller.toggle(enabledController.name);
                }
            } catch (e) {}
        }

        Lampa.Select.show({
            title: 'Открыть в плеере',
            items: [
                { title: 'Встроенный плеер Lampa', player: 'inner' },
                { title: 'VLC',       player: 'vlc' },
                { title: 'MPC-BE',    player: 'mpc-be' },
                { title: 'MPC-HC',    player: 'mpc-hc' },
                { title: 'MPC-QT',    player: 'mpc-qt' },
                { title: 'KMPlayer',  player: 'kmplayer' },
                { title: 'PotPlayer', player: 'potplayer' }
            ],
            onSelect: function (item) {
                restoreController();

                if (item.player === 'inner') playInsideLampa(data);
                else openExternal(data, item.player);
            },
            onBack: function () {
                restoreController();
                playInsideLampa(data);
            }
        });
    }

    function onCreate(event) {
        try {
            if (!isWindowsBrowser()) return;
            if (!event || !event.data || !event.data.url) return;

            if (bypassOnce) {
                bypassOnce = false;
                return;
            }

            if (!Lampa.Storage.field(ENABLED)) return;
            if (/youtube\.com|youtu\.be/i.test(event.data.url)) return;

            const selected = Lampa.Storage.field(PLAYER) || 'vlc';

            /*
             * Critical v5 behavior:
             * If "Встроенный Lampa" is selected as default, do absolutely
             * nothing. No abort, no replay, no URL modification.
             * Lampa follows its original native torrent playback path.
             */
            if (selected === 'inner') return;

            if (selected === 'ask') {
                if (typeof event.abort === 'function') event.abort();
                showPlayerPicker(event.data);
                return;
            }

            if (PLAYER_LABELS[selected]) {
                if (typeof event.abort === 'function') event.abort();
                openExternal(event.data, selected);
            }
        } catch (e) {
            console.error('[RMEDIA Player] create handler error:', e);
        }
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
        if (isIOS()) {
            configureIOS();

            // CUB/settings sync may restore an older player_torrent value
            // shortly after startup, so re-apply a few times.
            setTimeout(configureIOS, 500);
            setTimeout(configureIOS, 1500);
            setTimeout(configureIOS, 4000);
            setTimeout(configureIOS, 8000);

            return;
        }

        if (!isWindowsBrowser()) return;

        addSettings();
        Lampa.Player.listener.follow('create', onCreate);

        console.log('[RMEDIA Player v7.2] Windows bridge ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
