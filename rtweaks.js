/**
 * RMEDIA Tweaks for Lampa
 * Небольшие улучшения интерфейса без рекламы, аналитики и внешних запросов.
 *
 * Version: 1.1.0
 * License: MIT
 */
(function () {
  'use strict';

  if (window.rmediahub_tweaks_ready) return;
  window.rmediahub_tweaks_ready = true;

  var ID = 'rmediahub_tweaks';
  var NAME = 'RMEDIA Tweaks';
  var VERSION = '1.1.0';
  var observer = null;
  var refreshTimer = null;
  var clockTimer = null;
  var clockDelayTimer = null;
  var currentPlayer = null;

  var KEYS = {
    buttons: 'rmedia_tweaks_buttons',
    reload: 'rmedia_tweaks_reload',
    console: 'rmedia_tweaks_console',
    playerStyle: 'rmedia_tweaks_player_style',
    clock: 'rmedia_tweaks_clock',
    clockPosition: 'rmedia_tweaks_clock_position',
    hideTrailers: 'rmedia_tweaks_hide_trailers',
    hideSaverClock: 'rmedia_tweaks_hide_saver_clock',
    hideAnime: 'rmedia_tweaks_hide_anime',
    hideStrawberry: 'rmedia_tweaks_hide_strawberry'
  };

  var DEFAULTS = {};
  DEFAULTS[KEYS.buttons] = true;
  DEFAULTS[KEYS.reload] = true;
  DEFAULTS[KEYS.console] = true;
  DEFAULTS[KEYS.playerStyle] = true;
  DEFAULTS[KEYS.clock] = false;
  DEFAULTS[KEYS.clockPosition] = 'right_top';
  DEFAULTS[KEYS.hideTrailers] = false;
  DEFAULTS[KEYS.hideSaverClock] = false;
  DEFAULTS[KEYS.hideAnime] = false;
  DEFAULTS[KEYS.hideStrawberry] = false;

  function value(key) {
    try {
      var stored = Lampa.Storage.field(key);
      return typeof stored === 'undefined' || stored === null ? DEFAULTS[key] : stored;
    } catch (error) {
      return DEFAULTS[key];
    }
  }

  function enabled(key) {
    var stored = value(key);
    return stored === true || stored === 'true' || stored === 1 || stored === '1';
  }

  function setStyle(name, css, active) {
    var styleId = ID + '-' + name;
    var old = document.getElementById(styleId);

    if (!active) {
      if (old) old.remove();
      return;
    }

    if (old) {
      if (old.textContent !== css) old.textContent = css;
      return;
    }

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function baseStyles() {
    setStyle('base', [
      '.rm-tweaks-hidden{display:none!important}',
      '.rm-tweaks-head-button svg{width:1.65em!important;height:1.65em!important}',
      '#rm-tweaks-player-clock{position:absolute;z-index:60;color:#fff;font-size:1.45em;',
      'font-weight:700;line-height:1;padding:.28em .5em;border-radius:.45em;',
      'background:rgba(0,0,0,.48);text-shadow:0 .08em .18em #000;pointer-events:none}',
      '#rm-tweaks-player-clock.rm-left-top{left:2.2%;top:3%}',
      '#rm-tweaks-player-clock.rm-left-bottom{left:2.2%;bottom:4%}',
      '#rm-tweaks-player-clock.rm-right-top{right:2.2%;top:3%}',
      '#rm-tweaks-player-clock.rm-right-bottom{right:2.2%;bottom:4%}',
      '#rm-tweaks-player-clock.rm-center-top{left:50%;top:3%;transform:translateX(-50%)}'
    ].join(''), true);
  }

  function applyButtonStyles() {
    var css = [
      '.full-start__button.button--play{',
      'background:#111!important;border:.11em solid transparent!important;color:#fff!important}',
      '.full-start__button.button--play.focus{',
      'background:#111!important;color:#fff!important;border-color:#ffb340!important;',
      'box-shadow:0 0 .42em rgba(255,159,10,.7)!important}',
      '.full-start__button.button--play svg,.full-start__button.button--play span{color:#fff!important}',
      '.full-start__button.view--torrent,.full-start__button[class*="torrent"]{',
      'background:rgba(48,209,88,.22)!important;border:.11em solid transparent!important}',
      '.full-start__button.view--trailer{',
      'background:rgba(255,69,58,.22)!important;border:.11em solid transparent!important}',
      '.full-start__button.view--online,.full-start__button.view--onlines_v1,',
      '.full-start__button.view--streamv1,.full-start__button.open--menu{',
      'background:rgba(10,132,255,.22)!important;border:.11em solid transparent!important}',
      '.full-start__button.view--bazon,.full-start__button.view--filmixpva{',
      'background:rgba(191,90,242,.22)!important;border:.11em solid transparent!important}',
      '.full-start__button.button--play,.full-start__button.view--torrent,.full-start__button.view--trailer,',
      '.full-start__button.view--online,.full-start__button.view--onlines_v1,',
      '.full-start__button.view--streamv1,.full-start__button.open--menu,',
      '.full-start__button.view--bazon,.full-start__button.view--filmixpva{',
      'border-radius:.7em!important;transition:filter .18s ease,transform .18s ease!important}',
      '.full-start__button.selector.focus{filter:brightness(1.22)!important;transform:scale(1.035)!important}',
      '.full-start__button.view--torrent.focus,.full-start__button[class*="torrent"].focus{border-color:#30d158!important}',
      '.full-start__button.view--trailer.focus{border-color:#ff453a!important}',
      '.full-start__button.view--online.focus,.full-start__button.view--onlines_v1.focus,',
      '.full-start__button.view--streamv1.focus,.full-start__button.open--menu.focus{border-color:#0a84ff!important}',
      '.full-start__button.view--bazon.focus,.full-start__button.view--filmixpva.focus{border-color:#bf5af2!important}',
      '.selectbox[data-rmedia-source-box="1"] .selectbox-item{',
      'margin:.18em .7em!important;border:.11em solid transparent!important;',
      'border-radius:.75em!important;transition:background .16s ease,border-color .16s ease,transform .16s ease!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-torrent{',
      'background:rgba(48,209,88,.18)!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-online{',
      'background:rgba(10,132,255,.18)!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-trailer{',
      'background:rgba(255,69,58,.18)!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-torrent .selectbox-item__icon{color:#30d158!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-online .selectbox-item__icon{color:#4aa3ff!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-trailer .selectbox-item__icon{color:#ff6961!important}',
      '.selectbox[data-rmedia-source-box="1"] .selectbox-item.focus{',
      'filter:brightness(1.28)!important;transform:scale(1.025)!important;color:#fff!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-torrent.focus{',
      'background:rgba(48,209,88,.38)!important;border-color:#30d158!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-online.focus{',
      'background:rgba(10,132,255,.38)!important;border-color:#0a84ff!important}',
      '.selectbox[data-rmedia-source-box="1"] .rm-source-trailer.focus{',
      'background:rgba(255,69,58,.38)!important;border-color:#ff453a!important}'
    ].join('');
    setStyle('buttons', css, enabled(KEYS.buttons));
  }

  function applySourceButtonClasses() {
    var active = enabled(KEYS.buttons);

    document.querySelectorAll('.selectbox').forEach(function (box) {
      var heading = box.querySelector('.selectbox__title');
      var title = String(heading ? heading.textContent : '').trim().toLowerCase();
      var sourceBox = /^(источник|джерело|source)$/.test(title);

      if (!active || !sourceBox) {
        box.removeAttribute('data-rmedia-source-box');
        box.querySelectorAll('.rm-source-torrent,.rm-source-online,.rm-source-trailer').forEach(function (item) {
          item.classList.remove('rm-source-torrent', 'rm-source-online', 'rm-source-trailer');
        });
        return;
      }

      box.setAttribute('data-rmedia-source-box', '1');
      box.querySelectorAll('.selectbox-item').forEach(function (item) {
        var itemTitle = item.querySelector('.selectbox-item__title');
        var itemSubtitle = item.querySelector('.selectbox-item__subtitle');
        var subtitle = String(itemSubtitle ? itemSubtitle.textContent : '').trim().toLowerCase();

        if (itemTitle && /online_mod/.test(subtitle)) itemTitle.textContent = 'FILMIX';
        else if (itemTitle && /bwarc/.test(subtitle)) itemTitle.textContent = 'KINOPUB';

        var text = String(itemTitle ? itemTitle.textContent : '').trim().toLowerCase();

        item.classList.remove('rm-source-torrent', 'rm-source-online', 'rm-source-trailer');

        if (/^(торрент|torrent)/.test(text)) item.classList.add('rm-source-torrent');
        else if (/^(онлайн|online|filmix|kinopub)/.test(text) || /online_mod|bwarc/.test(subtitle)) item.classList.add('rm-source-online');
        else if (/^(трейлер|трейлеры|трейлери|trailer)/.test(text)) item.classList.add('rm-source-trailer');
      });
    });
  }

  function applyPlayerStyle() {
    var css = [
      '.player-panel__position{background:#ff0033!important}',
      '.player-panel__position>div:after{background:#ff0033!important;',
      'box-shadow:0 0 .35em rgba(255,0,51,.9)!important}',
      '.player-panel__timeline.selector.focus .player-panel__position>div:after{',
      'box-shadow:0 0 .5em .12em rgba(255,0,51,.95)!important}'
    ].join('');
    setStyle('player', css, enabled(KEYS.playerStyle));
  }

  function applySaverClock() {
    setStyle(
      'saver-clock',
      '.screensaver__datetime{display:none!important;opacity:0!important}',
      enabled(KEYS.hideSaverClock)
    );
  }

  function iconButton(id, title, svg, action) {
    var old = document.getElementById(id);
    if (old) return old;

    var head = document.querySelector('.head__actions');
    if (!head) return null;

    var button = document.createElement('div');
    button.id = id;
    button.className = 'head__action selector rm-tweaks-head-button';
    button.setAttribute('title', title);
    button.innerHTML = svg;
    head.appendChild(button);

    if (window.$) {
      window.$(button).on('hover:enter.rmediaTweaks click.rmediaTweaks', action);
    } else {
      button.addEventListener('click', action);
    }

    return button;
  }

  function applyHeaderButtons() {
    var reloadId = 'rm-tweaks-reload';
    var consoleId = 'rm-tweaks-console';

    if (enabled(KEYS.reload)) {
      iconButton(
        reloadId,
        'Перезагрузить Lampa',
        '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6v5h-5M4 18v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        function () { window.location.reload(); }
      );
    } else {
      var reload = document.getElementById(reloadId);
      if (reload) reload.remove();
    }

    if (enabled(KEYS.console)) {
      iconButton(
        consoleId,
        'Открыть консоль',
        '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="m8 9 3 3-3 3M13 15h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        function () {
          try { Lampa.Controller.toggle('console'); } catch (error) { console.warn(NAME, error); }
        }
      );
    } else {
      var consoleButton = document.getElementById(consoleId);
      if (consoleButton) consoleButton.remove();
    }
  }

  function menuText(element) {
    var textNode = element.querySelector('.menu__text');
    return String(textNode ? textNode.textContent : element.textContent || '').trim().toLowerCase();
  }

  function applyMenuVisibility() {
    document.querySelectorAll('[data-action="anime"]').forEach(function (element) {
      element.classList.toggle('rm-tweaks-hidden', enabled(KEYS.hideAnime));
    });

    document.querySelectorAll('[data-action="sisi"],.menu__item').forEach(function (element) {
      var strawberry = element.getAttribute('data-action') === 'sisi' || /клубнич|клубника/.test(menuText(element));
      if (strawberry) element.classList.toggle('rm-tweaks-hidden', enabled(KEYS.hideStrawberry));
    });
  }

  function isTrailerLine(element) {
    var title = element.querySelector('.items-line__title,.category-full__title,.main__title,h2,h3');
    if (!title) return false;
    return /трейлеры[\s-]*новинки|новинки[\s-]*трейлеров/i.test(String(title.textContent || ''));
  }

  function applyTrailerVisibility() {
    var hide = enabled(KEYS.hideTrailers);
    document.querySelectorAll('[data-rmedia-trailer-line="1"]').forEach(function (element) {
      if (!hide) {
        element.classList.remove('rm-tweaks-hidden');
        element.removeAttribute('data-rmedia-trailer-line');
      }
    });

    if (!hide) return;
    document.querySelectorAll('.items-line,.category-full,.main__line,.content__line').forEach(function (element) {
      if (isTrailerLine(element)) {
        element.setAttribute('data-rmedia-trailer-line', '1');
        element.classList.add('rm-tweaks-hidden');
      }
    });
  }

  function clockClass() {
    var positions = {
      left_top: 'rm-left-top',
      left_bottom: 'rm-left-bottom',
      right_top: 'rm-right-top',
      right_bottom: 'rm-right-bottom',
      center_top: 'rm-center-top'
    };
    return positions[value(KEYS.clockPosition)] || positions.right_top;
  }

  function renderClock() {
    var clock = document.getElementById('rm-tweaks-player-clock');
    if (!clock) return;
    var now = new Date();
    clock.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  function removeClock() {
    clearTimeout(clockDelayTimer);
    clockDelayTimer = null;
    currentPlayer = null;
    var old = document.getElementById('rm-tweaks-player-clock');
    if (old) old.remove();
  }

  function applyClock() {
    if (!enabled(KEYS.clock)) {
      removeClock();
      return;
    }

    var player = document.querySelector('.player');
    if (!player) {
      removeClock();
      return;
    }

    var clock = document.getElementById('rm-tweaks-player-clock');
    if (clock && clock.parentNode === player) {
      clock.className = clockClass();
      renderClock();
      return;
    }

    if (currentPlayer === player && clockDelayTimer) return;
    removeClock();
    currentPlayer = player;
    clockDelayTimer = setTimeout(function () {
      if (!enabled(KEYS.clock) || !document.body.contains(player)) return;
      var element = document.createElement('div');
      element.id = 'rm-tweaks-player-clock';
      element.className = clockClass();
      player.appendChild(element);
      renderClock();
      clockDelayTimer = null;
    }, 5000);
  }

  function applyAll() {
    baseStyles();
    applyButtonStyles();
    applySourceButtonClasses();
    applyPlayerStyle();
    applySaverClock();
    applyHeaderButtons();
    applyMenuVisibility();
    applyTrailerVisibility();
    applyClock();
  }

  function scheduleApply() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      applyAll();
    }, 80);
  }

  function addToggle(key, title, description, defaultValue) {
    Lampa.SettingsApi.addParam({
      component: ID,
      param: { name: key, type: 'trigger', default: defaultValue },
      field: { name: title, description: description || '' },
      onChange: scheduleApply
    });
  }

  function registerSettings() {
    if (!Lampa.SettingsApi || window.rmediahub_tweaks_settings_ready) return;
    window.rmediahub_tweaks_settings_ready = true;

    Lampa.SettingsApi.addComponent({
      component: ID,
      name: 'RMEDIA Tweaks',
      icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M10 14v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="17" r="2" stroke="currentColor" stroke-width="2"/></svg>'
    });

    addToggle(KEYS.buttons, 'Цветные кнопки просмотра', 'Выделяет Смотреть, Торренты и Трейлеры разными цветами', true);
    addToggle(KEYS.reload, 'Кнопка перезагрузки', 'Добавляет кнопку в верхнюю панель', true);
    addToggle(KEYS.console, 'Кнопка консоли', 'Быстрый доступ к консоли Lampa', true);
    addToggle(KEYS.playerStyle, 'Красная шкала плеера', 'Оформление линии перемотки в стиле YouTube', true);
    addToggle(KEYS.clock, 'Часы в плеере', 'Появляются через 5 секунд после запуска', false);

    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: KEYS.clockPosition,
        type: 'select',
        default: 'right_top',
        values: {
          left_top: 'Слева сверху',
          left_bottom: 'Слева снизу',
          right_top: 'Справа сверху',
          right_bottom: 'Справа снизу',
          center_top: 'По центру сверху'
        }
      },
      field: { name: 'Положение часов', description: 'Выберите угол экрана' },
      onChange: scheduleApply
    });

    addToggle(KEYS.hideTrailers, 'Скрыть трейлеры-новинки', 'Убирает трейлерную ленту с главной страницы', false);
    addToggle(KEYS.hideSaverClock, 'Скрыть часы на заставке', 'Полезно для OLED-экранов', false);
    addToggle(KEYS.hideAnime, 'Скрыть «Аниме»', 'Убирает пункт из бокового меню', false);
    addToggle(KEYS.hideStrawberry, 'Скрыть «Клубничку»', 'Убирает пункт из бокового меню', false);
  }

  function registerManifest() {
    try {
      Lampa.Manifest = Lampa.Manifest || {};
      Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
      Lampa.Manifest.plugins[ID] = {
        type: 'other',
        name: NAME,
        version: VERSION,
        description: 'Безопасные улучшения интерфейса Lampa без рекламы и аналитики.'
      };
    } catch (error) {
      console.warn(NAME + ': manifest error', error);
    }
  }

  function observe() {
    if (observer || !window.MutationObserver || !document.body) return;
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    if (typeof Lampa === 'undefined') {
      setTimeout(start, 300);
      return;
    }

    registerSettings();
    registerManifest();
    observe();
    applyAll();

    if (!clockTimer) clockTimer = setInterval(renderClock, 1000);
    console.log(NAME + ' v' + VERSION + ' loaded');
  }

  if (window.appready) {
    start();
  } else if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
    Lampa.Listener.follow('app', function (event) {
      if (event && event.type === 'ready') start();
    });
  } else {
    setTimeout(start, 500);
  }
}());
