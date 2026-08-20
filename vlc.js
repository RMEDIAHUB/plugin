(function () {
    'use strict';

    if (window.rmedia_vlc_bridge_ready) return;
    window.rmedia_vlc_bridge_ready = true;

    const COMPONENT = 'rmedia_vlc';
    const ENABLED_KEY = 'rmedia_vlc_enabled';

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
            console.warn('[RMEDIA VLC] Torserver.toPlayUrl failed:', e);
        }

        return url;
    }

    function openInVlc(data) {
        const url = getPlayableUrl(data);

        if (!url) {
            console.warn('[RMEDIA VLC] Empty playback URL');
            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show('RMEDIA VLC: не удалось получить ссылку');
            }
            return false;
        }

        console.log('[RMEDIA VLC] Opening:', url);

        const protocolUrl = 'rmedia://play/' + toBase64Url(url);
        window.location.assign(protocolUrl);

        return true;
    }

    function onPlayerCreate(event) {
        try {
            if (!isWindowsBrowser()) return;
            if (!Lampa.Storage.field(ENABLED_KEY)) return;
            if (!event || !event.data || !event.data.url) return;

            if (/youtube\.com|youtu\.be/i.test(event.data.url)) return;

            const opened = openInVlc(event.data);

            if (opened && typeof event.abort === 'function') {
                event.abort();
            }
        } catch (e) {
            console.error('[RMEDIA VLC] create handler error:', e);
        }
    }

    function initSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: COMPONENT,
            name: 'RMEDIA VLC',
            icon: ''
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: ENABLED_KEY,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Открывать видео в VLC',
                description: 'Windows Chrome: передавать поток из Lampa в VLC через RMEDIA Player Bridge'
            }
        });
    }

    function init() {
        if (!isWindowsBrowser()) {
            console.log('[RMEDIA VLC] Not Windows browser, plugin inactive');
            return;
        }

        initSettings();
        Lampa.Player.listener.follow('create', onPlayerCreate);

        console.log('[RMEDIA VLC] Ready');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
