(function () {
    'use strict';

    if (window.rmedia_player_v5_ready) return;
    window.rmedia_player_v5_ready = true;

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
        if (!isWindowsBrowser()) return;

        addSettings();
        Lampa.Player.listener.follow('create', onCreate);

        console.log('[RMEDIA Player v5] Ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
