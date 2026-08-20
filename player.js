(function () {
    'use strict';

    if (window.rmedia_player_v3_ready) return;
    window.rmedia_player_v3_ready = true;

    const COMPONENT = 'rmedia_player';
    const ENABLED   = 'rmedia_player_enabled';
    const PLAYER    = 'rmedia_player_type';

    const PLAYER_LABELS = {
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
        if (!PLAYER_LABELS[playerSlug] || playerSlug === 'ask') {
            notify('RMEDIA Player: неизвестный плеер');
            return false;
        }

        const url = getPlayableUrl(data);

        if (!url) {
            notify('RMEDIA Player: не удалось получить ссылку');
            return false;
        }

        const protocolUrl = 'rmedia://play/' + encodeURIComponent(playerSlug) + '/' + toBase64Url(url);

        console.log('[RMEDIA Player] Open:', PLAYER_LABELS[playerSlug], url);
        window.location.assign(protocolUrl);

        return true;
    }

    function playInsideLampa(data) {
        bypassOnce = true;

        try {
            if (Lampa.Player && typeof Lampa.Player.play === 'function') {
                Lampa.Player.play(data);
            } else {
                bypassOnce = false;
                notify('Не удалось вернуть встроенный плеер');
            }
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

        const items = [
            { title: 'VLC',       player: 'vlc' },
            { title: 'MPC-BE',    player: 'mpc-be' },
            { title: 'MPC-HC',    player: 'mpc-hc' },
            { title: 'MPC-QT',    player: 'mpc-qt' },
            { title: 'KMPlayer',  player: 'kmplayer' },
            { title: 'PotPlayer', player: 'potplayer' },
            { title: 'Встроенный плеер Lampa', inner: true }
        ];

        Lampa.Select.show({
            title: 'Открыть в плеере',
            items: items,
            onSelect: function (item) {
                if (item.inner) playInsideLampa(data);
                else openExternal(data, item.player);
            },
            onBack: function () {
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
                name: 'Использовать внешний плеер',
                description: 'Windows: открывать видео из Lampa во внешнем плеере'
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: PLAYER,
                type: 'select',
                values: {
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
                description: 'Выберите плеер или режим выбора при каждом запуске'
            }
        });
    }

    function init() {
        if (!isWindowsBrowser()) {
            console.log('[RMEDIA Player] Non-Windows browser: inactive');
            return;
        }

        addSettings();
        Lampa.Player.listener.follow('create', onCreate);

        console.log('[RMEDIA Player v3] Ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
