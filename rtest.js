// RMediaHub: ТЕСТ перехода в свою Лампу.
// Ставится только вручную на тестовый телевизор. Клиентам НЕ добавлять.
// Ничего не делает сам: показывает окно, переход только по нажатию.
(function () {
    var TARGET = 'http://rmediahub.cc/';
    var box = null;
    var prevController = 'content';
    var chosen = false; // true — когда нажали одну из двух кнопок

    function say(text) {
        try { Lampa.Noty.show(text, { time: 8000 }); } catch (e) {}
        var s = box && box.querySelector('.rtest-status');
        if (s) s.textContent = text;
    }

    function go() {
        chosen = true;
        say('Переходим в RMediaHub…');
        setTimeout(function () {
            try {
                window.location.href = TARGET;
            } catch (e) {
                say('Телевизор не разрешил переход: ' + e.message);
            }
        }, 600);
        // Если через 6 секунд мы всё ещё здесь — переход не сработал
        setTimeout(function () {
            say('Переход не сработал (остались на ' + location.host + '). Сфоткай этот экран.');
        }, 6000);
    }

    function hide() {
        if (box && box.parentNode) box.parentNode.removeChild(box);
        box = null;
        try { Lampa.Controller.toggle(prevController || 'content'); } catch (e) {}
    }

    // «Остаться здесь» — выбор сделан, больше не показываем
    function stay() {
        chosen = true;
        hide();
    }

    // «Назад» на пульте — прячем, но через 3 секунды покажем снова
    function back() {
        hide();
        setTimeout(show, 3000);
    }

    function button(text, action) {
        var b = document.createElement('div');
        b.className = 'selector rtest-btn';
        b.textContent = text;
        b.style.cssText = 'padding:1em 1.5em;margin:.6em 0;border-radius:.6em;background:#1c2a44;color:#fff;font-size:1.4em;cursor:pointer;text-align:center;border:3px solid transparent';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); action(); });
        try { $(b).on('hover:enter', action); } catch (e) {}
        return b;
    }

    function show() {
        if (chosen || box) return;
        try { prevController = Lampa.Controller.enabled().name; } catch (e) {}

        box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:999999;background:rgba(5,8,15,.92);display:flex;align-items:center;justify-content:center;font-family:sans-serif';

        var inner = document.createElement('div');
        inner.style.cssText = 'width:32em;max-width:90%;text-align:center;color:#fff';
        inner.innerHTML = '<div style="font-size:2.2em;font-weight:700;margin-bottom:.4em">Тест RMediaHub</div>' +
            '<div style="opacity:.7;margin-bottom:1em">Сейчас открыто: ' + location.protocol + '//' + location.host + '</div>';

        inner.appendChild(button('Перейти в RMediaHub', go));
        inner.appendChild(button('Остаться здесь', stay));

        var status = document.createElement('div');
        status.className = 'rtest-status';
        status.style.cssText = 'margin-top:1em;color:#22d6f1;min-height:1.5em';
        inner.appendChild(status);

        box.appendChild(inner);
        document.body.appendChild(box);

        // Пульт: стрелки + ОК
        try {
            Lampa.Controller.add('rtest', {
                toggle: function () {
                    Lampa.Controller.collectionSet(box);
                    Lampa.Controller.collectionFocus(box.querySelector('.rtest-btn'), box);
                },
                up: function () { Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                back: back
            });
            Lampa.Controller.toggle('rtest');
        } catch (e) {}

        // Подсветка выбранной кнопки
        var style = document.createElement('style');
        style.textContent = '.rtest-btn.focus,.rtest-btn:hover{border-color:#22d6f1 !important;background:#24406b !important}';
        box.appendChild(style);
    }

    function start() {
        setTimeout(show, 3000);
        // Подстраховка: если окно пропало само (что-то другое его закрыло),
        // а выбор не сделан — показываем снова каждые 3 секунды
        setInterval(function () {
            if (chosen) return;
            if (box && !document.body.contains(box)) box = null;
            if (!box) show();
        }, 3000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
