// RMedia: встроенные плагины.
// Лампа сама загружает этот файл при каждом запуске.
// Чтобы добавить ещё плагин — допиши его адрес в список ниже.
(function () {
    var RMEDIA_PLUGINS = [
        'https://rmediahub.github.io/plugin/lock.js'
    ];

    // Какие плагины уже стоят у клиента вручную (чтобы не загрузить дважды)
    var installed = [];
    try {
        installed = (Lampa.Storage.get('plugins', '[]') || []).map(function (p) {
            return p && p.url;
        });
    } catch (e) {}

    RMEDIA_PLUGINS.forEach(function (url) {
        if (installed.indexOf(url) >= 0) return;

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Math.floor(Date.now() / 9e5);
        script.onerror = function () {
            console.log('RMedia', 'не удалось загрузить плагин', url);
        };
        document.head.appendChild(script);
    });
})();
