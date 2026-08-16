/**
 * RMEDIA Torrent Styles for Lampa
 * Цветовые индикаторы и яркая рамка выбранной раздачи.
 *
 * Version: 1.0.0
 * License: MIT
 * Внешние запросы не выполняет и работу парсеров не изменяет.
 */
(function () {
  'use strict';

  if (window.rmediahub_torrents_ready) return;
  window.rmediahub_torrents_ready = true;

  var PLUGIN_ID = 'rmediahub_torrents';
  var PLUGIN_NAME = 'RMEDIA Торренты';
  var VERSION = '1.0.0';
  var updateTimer = null;
  var observer = null;

  var COLORS = {
    red: '#ff453a',
    orange: '#ff9f0a',
    yellow: '#ffd60a',
    green: '#30d158',
    blue: '#0a84ff',
    mint: '#58f3c6'
  };

  function rgba(hex, alpha) {
    var value = String(hex).replace('#', '');
    var r = parseInt(value.slice(0, 2), 16);
    var g = parseInt(value.slice(2, 4), 16);
    var b = parseInt(value.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function badge(color, background) {
    return [
      'color:' + color,
      'border:0.12em solid ' + color,
      'background:' + rgba(color, background || 0.12),
      'box-shadow:0 0 0.35em ' + rgba(color, 0.16),
      'text-shadow:none'
    ].join('!important;') + '!important;';
  }

  function injectStyles() {
    if (document.getElementById(PLUGIN_ID + '-styles')) return;

    var style = document.createElement('style');
    style.id = PLUGIN_ID + '-styles';
    style.textContent = [
      '.torrent-item{position:relative!important;transform:scale(1);transform-origin:center center;',
      'transition:transform .2s ease,filter .2s ease!important}',

      '.torrent-item.selector.focus,.torrent-item.focus,.torrent-item.selector.hover{',
      'outline:none!important;transform:scale(1.018)!important;filter:brightness(1.035);z-index:5!important}',

      '.torrent-item.selector.focus::after,.torrent-item.focus::after,.torrent-item.selector.hover::after{',
      'content:""!important;display:block!important;position:absolute!important;',
      'inset:-0.12em!important;box-sizing:border-box!important;pointer-events:none!important;',
      'border:0.18em solid ' + COLORS.mint + '!important;border-radius:.9em!important;',
      'box-shadow:0 0 .3em ' + rgba(COLORS.mint, 0.95) + ',0 0 .8em ' + rgba(COLORS.mint, 0.58) +
        ',inset 0 0 .25em ' + rgba(COLORS.mint, 0.42) + '!important;opacity:1!important}',

      '.torrent-serial.selector.focus,.torrent-file.selector.focus{outline:none!important;',
      'box-shadow:inset 0 0 0 .16em ' + COLORS.mint + ',0 0 .5em ' + rgba(COLORS.mint, 0.45) + '!important}',

      '.rm-ts-badge{display:inline-flex!important;align-items:center!important;justify-content:center!important;',
      'box-sizing:border-box!important;min-height:1.65em!important;padding:.12em .42em!important;',
      'border-radius:.48em!important;font-weight:700!important;font-size:.9em!important;',
      'line-height:1!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}',

      '.torrent-item__seeds>span.rm-ts-seeds{' + badge(COLORS.orange, 0.14) + '}',
      '.torrent-item__seeds>span.rm-ts-seeds.rm-low{' + badge(COLORS.red, 0.15) + '}',
      '.torrent-item__seeds>span.rm-ts-seeds.rm-good{' + badge(COLORS.yellow, 0.14) + '}',
      '.torrent-item__seeds>span.rm-ts-seeds.rm-high{' + badge(COLORS.green, 0.16) + '}',

      '.torrent-item__grabs>span.rm-ts-peers{' + badge(COLORS.blue, 0.12) + '}',
      '.torrent-item__grabs>span.rm-ts-peers.rm-high{' + badge(COLORS.blue, 0.19) + '}',

      '.torrent-item__bitrate>span.rm-ts-bitrate{' + badge(COLORS.green, 0.12) + '}',
      '.torrent-item__bitrate>span.rm-ts-bitrate.rm-warn{' + badge(COLORS.yellow, 0.14) + '}',
      '.torrent-item__bitrate>span.rm-ts-bitrate.rm-high{' + badge(COLORS.orange, 0.17) + '}',
      '.torrent-item__bitrate>span.rm-ts-bitrate.rm-danger{' + badge(COLORS.red, 0.18) + '}',

      '.torrent-item__size.rm-ts-size{' + badge(COLORS.green, 0.12) + '}',
      '.torrent-item__size.rm-ts-size.rm-warn{' + badge(COLORS.yellow, 0.14) + '}',
      '.torrent-item__size.rm-ts-size.rm-high{' + badge(COLORS.orange, 0.17) + '}',
      '.torrent-item__size.rm-ts-size.rm-danger{' + badge(COLORS.red, 0.18) + '}',

      '.torrent-item__bitrate,.torrent-item__grabs,.torrent-item__seeds{margin-right:.5em!important}',
      '.scroll__body{padding-top:.15em!important;padding-bottom:.15em!important}'
    ].join('');

    (document.head || document.documentElement).appendChild(style);
  }

  function numberFrom(text) {
    var match = String(text || '').replace(',', '.').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function sizeInGb(text) {
    var match = String(text || '').replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb|кб|мб|гб|тб)/i);
    if (!match) return null;

    var value = Number(match[1]);
    var unit = match[2].toLowerCase();
    if (unit === 'tb' || unit === 'тб') return value * 1024;
    if (unit === 'gb' || unit === 'гб') return value;
    if (unit === 'mb' || unit === 'мб') return value / 1024;
    return value / 1048576;
  }

  function setTier(element, baseClass, tier) {
    if (!element) return;
    element.classList.add('rm-ts-badge', baseClass);
    element.classList.remove('rm-low', 'rm-good', 'rm-high', 'rm-warn', 'rm-danger');
    if (tier) element.classList.add(tier);
  }

  function paint(root) {
    var scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.torrent-item__seeds span').forEach(function (element) {
      var value = numberFrom(element.textContent);
      if (value === null) return;
      var tier = value < 5 ? 'rm-low' : value >= 20 ? 'rm-high' : value >= 10 ? 'rm-good' : '';
      setTier(element, 'rm-ts-seeds', tier);
    });

    scope.querySelectorAll('.torrent-item__grabs span').forEach(function (element) {
      var value = numberFrom(element.textContent);
      if (value === null) return;
      setTier(element, 'rm-ts-peers', value > 10 ? 'rm-high' : '');
    });

    scope.querySelectorAll('.torrent-item__bitrate span').forEach(function (element) {
      var value = numberFrom(element.textContent);
      if (value === null) return;
      var tier = value > 100 ? 'rm-danger' : value >= 75 ? 'rm-high' : value >= 50 ? 'rm-warn' : '';
      setTier(element, 'rm-ts-bitrate', tier);
    });

    scope.querySelectorAll('.torrent-item__size').forEach(function (element) {
      var value = sizeInGb(element.textContent);
      if (value === null) return;
      var tier = value > 200 ? 'rm-danger' : value >= 100 ? 'rm-high' : value >= 50 ? 'rm-warn' : '';
      setTier(element, 'rm-ts-size', tier);
    });
  }

  function schedulePaint(delay) {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(function () {
      updateTimer = null;
      paint(document);
    }, typeof delay === 'number' ? delay : 60);
  }

  function observe() {
    if (observer || !window.MutationObserver || !document.body) return;
    observer = new MutationObserver(function (changes) {
      for (var i = 0; i < changes.length; i++) {
        if (changes[i].addedNodes && changes[i].addedNodes.length) {
          schedulePaint(50);
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function register() {
    try {
      if (typeof Lampa === 'undefined') return;
      Lampa.Manifest = Lampa.Manifest || {};
      Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
      Lampa.Manifest.plugins[PLUGIN_ID] = {
        type: 'other',
        name: PLUGIN_NAME,
        version: VERSION,
        description: 'Цветовые индикаторы и яркая рамка выбранной раздачи.'
      };
    } catch (error) {
      console.warn(PLUGIN_NAME + ': manifest error', error);
    }
  }

  function start() {
    injectStyles();
    paint(document);
    observe();
    register();

    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('torrent', function (event) {
        if (!event || event.type !== 'render') return;
        var raw = event.element || event.item;
        var node = raw && raw.nodeType === 1 ? raw : raw && raw[0] ? raw[0] : null;
        if (node) paint(node);
        schedulePaint(30);
      });
    }

    console.log(PLUGIN_NAME + ' v' + VERSION + ' loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());
