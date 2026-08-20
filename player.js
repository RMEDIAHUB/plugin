(function () {
    'use strict';

    if (window.rmedia_player_v2_ready) return;
    window.rmedia_player_v2_ready = true;

    const COMPONENT = 'rmedia_player';
    const ENABLED   = 'rmedia_player_enabled';
    const PLAYER    = 'rmedia_player_type';

    const PLAYERS = {
        'VLC':       'vlc',
        'MPC-BE':    'mpc-be',
        'MPC-HC':    'mpc-hc',
        'MPC-QT':    'mpc-qt',
        'KMPlayer':  'kmplayer',
        'PotPlayer': 'potplayer'
    };

    const ASK = 'Спрашивать каждый раз';
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
            if (
                window.Lampa &&
                Lampa.Torserver &&
                typeof Lampa.Torserver.toPlayUrl === 'function'
            ) {
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

    function openExternal(data, displayName) {
        const slug = PLAYERS[displayName];

        if (!slug) {
            notify('RMEDIA Player: неизвестный плеер');
            return false;
        }

        const url = getPlayableUrl(data);

        if (!url) {
            notify('RMEDIA Player: не удалось получить ссылку');
            return false;
        }

        const protocolUrl =
            'rmedia://play/' +
            encodeURIComponent(slug) +
            '/' +
            toBase64Url(url);

        console.log('[RMEDIA Player] Open:', displayName, url);
        window.location.assign(protocolUrl);

        return true;
    }

    function playInsideLampa(data) {
        // Prevent our create handler from intercepting the replay.
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
            { title: 'VLC',       player: 'VLC' },
            { title: 'MPC-BE',    player: 'MPC-BE' },
            { title: 'MPC-HC',    player: 'MPC-HC' },
            { title: 'MPC-QT',    player: 'MPC-QT' },
            { title: 'KMPlayer',  player: 'KMPlayer' },
            { title: 'PotPlayer', player: 'PotPlayer' },
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

            // Keep YouTube inside Lampa.
            if (/youtube\.com|youtu\.be/i.test(event.data.url)) return;

            const selected = Lampa.Storage.field(PLAYER) || 'VLC';

            if (selected === ASK) {
                // Stop the original launch while we show our own picker.
                if (typeof event.abort === 'function') event.abort();
                showPlayerPicker(event.data);
                return;
            }

            if (PLAYERS[selected]) {
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
                values: 'VLC,MPC-BE,MPC-HC,MPC-QT,KMPlayer,PotPlayer,Спрашивать каждый раз',
                default: 'VLC'
            },
            field: {
                name: 'Плеер по умолчанию',
                description: 'Можно выбрать один плеер или спрашивать при каждом запуске'
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

        console.log('[RMEDIA Player v2] Ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
