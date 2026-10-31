// RMediaHub: ТЕСТ перехода в свою Лампу.
// Ставится только вручную на тестовый телевизор. Клиентам НЕ добавлять.
// Ничего не делает сам: показывает меню, переход только по нажатию.
(function () {
    var TARGET = 'https://rmediahub.github.io/plugin/app/';

    function info() {
        return 'Сейчас открыто: ' + location.protocol + '//' + location.host + location.pathname;
    }

    function go() {
        try { Lampa.Noty.show('Переходим в RMediaHub…'); } catch (e) {}
        setTimeout(function () {
            try {
                window.location.href = TARGET;
            } catch (e) {
                try { Lampa.Noty.show('Телевизор не разрешил переход: ' + e.message, { time: 10000 }); } catch (x) {}
            }
        }, 800);
    }

    function menu() {
        Lampa.Select.show({
            title: 'Тест RMediaHub',
            items: [
                { title: 'Перейти в RMediaHub', subtitle: TARGET, go: true },
                { title: 'Остаться здесь', subtitle: info() }
            ],
            onSelect: function (item) {
                Lampa.Controller.toggle('content');
                if (item.go) go();
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function start() {
        setTimeout(menu, 3000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
