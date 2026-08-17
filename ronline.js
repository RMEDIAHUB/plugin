/**
 * RMEDIA Online for Lampa
 * Безопасное подключение личных аккаунтов Filmix и KinoPub.
 * Токены хранятся только локально в Lampa.Storage.
 *
 * Version: 2.0.0
 * License: MIT
 */
(function () {
  'use strict';

  if (window.rmedia_online_ready) return;
  window.rmedia_online_ready = true;

  var ID = 'rmedia_online';
  var NAME = 'RMEDIA Online';
  var VERSION = '2.0.0';
  var FILMIX_API = 'http://filmixapp.cyou/api/v2/';
  var KP_API = 'https://api.srvkp.com/v1/';
  var KP_DEVICE = 'https://api.srvkp.com/oauth2/device';
  var KP_TOKEN = 'https://api.srvkp.com/oauth2/token';
  var filmixPoll = null;
  var kinoPoll = null;
  var onlineLoading = false;

  var KEYS = {
    enabled: 'rmedia_online_enabled',
    source: 'rmedia_online_source',
    first: 'rmedia_online_first',
    resume: 'rmedia_online_resume',
    filmixToken: 'filmix_token',
    filmixStatus: 'rmedia_online_filmix_status',
    filmixDevice: 'rmedia_online_filmix_device',
    filmixPair: 'rmedia_online_filmix_pair',
    filmixClear: 'rmedia_online_filmix_clear',
    kinoClient: 'rmedia_online_kino_client',
    kinoSecret: 'rmedia_online_kino_secret',
    kinoAccess: 'rmedia_online_kino_access',
    kinoRefresh: 'rmedia_online_kino_refresh',
    kinoExpires: 'rmedia_online_kino_expires',
    kinoStatus: 'rmedia_online_kino_status',
    kinoPair: 'rmedia_online_kino_pair',
    kinoClear: 'rmedia_online_kino_clear',
    check: 'rmedia_online_check'
  };

  function get(key, fallback) {
    try {
      var value = Lampa.Storage.get(key, fallback);
      return value === undefined || value === null ? fallback : value;
    } catch (error) { return fallback; }
  }

  function set(key, value) {
    try { Lampa.Storage.set(key, value); } catch (error) {}
  }

  function notify(message) {
    try { Lampa.Noty.show(message); }
    catch (error) { console.log(NAME + ': ' + message); }
  }

  function loading(active) {
    try { active ? Lampa.Loading.start() : Lampa.Loading.stop(); } catch (error) {}
  }

  function randomHex(length) {
    var chars = '0123456789abcdef';
    var result = '';
    for (var i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  function deviceId() {
    var value = String(get(KEYS.filmixDevice, ''));
    if (!value) {
      value = randomHex(16);
      set(KEYS.filmixDevice, value);
    }
    return value;
  }

  function filmixQuery(token) {
    return '?user_dev_id=' + encodeURIComponent(deviceId()) +
      '&user_dev_name=RMEDIA&user_dev_token=' + encodeURIComponent(token || '') +
      '&user_dev_vendor=RMEDIA&user_dev_os=Lampa&user_dev_apk=2.2.0&app_lang=ru-rRU';
  }

  function requestNative(url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var request = new Lampa.Reguest();
      request.timeout(options.timeout || 12000);
      var done = function (data) { resolve(data); };
      var fail = function (a, c) {
        var text = '';
        try { text = request.errorDecode(a, c); } catch (error) {}
        reject(new Error(text || 'Ошибка сети'));
      };
      if (options.form) request.silent(url, done, fail, options.form, options.requestOptions || {});
      else request.native(url, done, fail, false, options.requestOptions || {});
    });
  }

  function form(data) {
    return Object.keys(data).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
    }).join('&');
  }

  function filmixRequestOptions() {
    // Desktop browsers forbid scripts from setting User-Agent. Filmix only
    // needs the Android-style header when Lampa is running as an Android app.
    try {
      if (Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('android')) {
        return { headers: { 'User-Agent': 'okhttp/3.10.0' } };
      }
    } catch (error) {}
    return {};
  }

  function filmixProfile(token) {
    if (!token) return Promise.reject(new Error('Filmix не подключён'));
    return requestNative(FILMIX_API + 'user_profile' + filmixQuery(token), {
      requestOptions: filmixRequestOptions()
    }).then(function (result) {
      if (!result || !result.user_data) throw new Error('Filmix не подтвердил устройство');
      var user = result.user_data;
      set(KEYS.filmixStatus, user);
      return user;
    });
  }

  function cleanTitle(value) {
    return String(value || '').replace(/[\s.,:;’'`!?]+/g, ' ').trim();
  }

  function normalizeTitle(value) {
    return cleanTitle(value).toLowerCase().replace(/ё/g, 'е').replace(/[\-\u2010-\u2015]+/g, '-');
  }

  function movieYear(movie) {
    var date = movie && (movie.release_date || movie.first_air_date || movie.last_air_date) || '';
    return parseInt(String(date).slice(0, 4), 10) || 0;
  }

  function filmixSearch(movie) {
    var token = String(get(KEYS.filmixToken, ''));
    if (!token) return Promise.reject(new Error('Сначала подключите Filmix в настройках RMEDIA Online'));
    var title = movie && (movie.title || movie.name || movie.original_title || movie.original_name) || '';
    var query = cleanTitle(title);
    return requestNative(FILMIX_API + 'search' + filmixQuery(token) + '&story=' + encodeURIComponent(query), {
      requestOptions: filmixRequestOptions(), timeout: 18000
    }).then(function (items) {
      if (!Array.isArray(items) || !items.length) throw new Error('Filmix ничего не нашёл по запросу «' + query + '»');
      var wanted = normalizeTitle(title);
      var year = movieYear(movie);
      var ranked = items.map(function (item) {
        var itemTitle = item.title || item.name || '';
        var original = item.orig_title || item.original_title || item.original_name || '';
        var itemYear = Number(item.year || (item.alt_name && String(item.alt_name).split('-').pop()) || 0);
        var score = 0;
        if (normalizeTitle(itemTitle) === wanted || normalizeTitle(original) === wanted) score += 20;
        if (year && itemYear === year) score += 10;
        else if (year && itemYear && Math.abs(itemYear - year) <= 1) score += 4;
        return { item: item, score: score };
      }).sort(function (a, b) { return b.score - a.score; });
      return ranked[0].item;
    });
  }

  function filmixPost(id) {
    var token = String(get(KEYS.filmixToken, ''));
    return requestNative(FILMIX_API + 'post/' + encodeURIComponent(id) + filmixQuery(token), {
      requestOptions: filmixRequestOptions(), timeout: 18000
    }).then(function (result) {
      if (!result || !result.player_links) throw new Error('Filmix не вернул ссылки для просмотра');
      return result;
    });
  }

  function allowedFilmixQuality() {
    var user = get(KEYS.filmixStatus, {}) || {};
    if (user.is_pro_plus) return 2160;
    if (user.is_pro) return 1080;
    return 720;
  }

  function qualitiesFromLink(link, declared) {
    var list = Array.isArray(declared) ? declared.map(Number) : [];
    var match = String(link || '').match(/\[([\d,]+)\]\.mp4/i);
    if (match) list = match[1].split(',').map(Number);
    var max = allowedFilmixQuality();
    return list.filter(function (q) { return q && q <= max; }).sort(function (a, b) { return b - a; });
  }

  function playerData(link, declared, title) {
    var qualities = qualitiesFromLink(link, declared);
    var map = {};
    var pattern = String(link || '').replace(/\[[\d,]+\](\.mp4)/i, '%s$1');
    qualities.forEach(function (q) { map[q + 'p'] = pattern.replace(/%s(\.mp4)/i, q + '$1'); });
    var first = qualities.length ? map[qualities[0] + 'p'] : String(link || '');
    return { url: first, quality: Object.keys(map).length ? map : false, title: title };
  }

  function flattenFilmix(post, movie) {
    var links = post.player_links || {};
    var result = [];
    var baseTitle = movie.title || movie.name || 'Filmix';
    if (links.movie) Object.keys(links.movie).forEach(function (key) {
      var file = links.movie[key] || {};
      var data = playerData(file.link, file.qualities, baseTitle + ' · ' + (file.translation || key));
      if (data.url) result.push({ title: file.translation || 'Filmix', subtitle: bestQuality(data), player: data });
    });
    if (links.playlist) Object.keys(links.playlist).forEach(function (seasonKey) {
      var season = links.playlist[seasonKey] || {};
      Object.keys(season).forEach(function (voiceKey) {
        var episodes = season[voiceKey] || {};
        Object.keys(episodes).forEach(function (episodeKey) {
          var file = episodes[episodeKey] || {};
          var label = 'Сезон ' + seasonKey + ' · Серия ' + episodeKey + ' · ' + voiceKey;
          var data = playerData(file.link, file.qualities, baseTitle + ' · ' + label);
          if (data.url) result.push({ title: label, subtitle: bestQuality(data), player: data, season: seasonKey, episode: episodeKey });
        });
      });
    });
    return result;
  }

  function bestQuality(data) {
    var keys = data && data.quality ? Object.keys(data.quality) : [];
    return keys.length ? 'Filmix · до ' + keys[0] : 'Filmix';
  }

  function playFilmix(item, all) {
    Lampa.Player.play(item.player);
    if (item.season && Lampa.Platform && Lampa.Platform.version) {
      var playlist = all.filter(function (entry) { return String(entry.season) === String(item.season); })
        .map(function (entry) { return entry.player; });
      if (playlist.length) Lampa.Player.playlist(playlist);
    }
  }

  function filmixLabel(user) {
    if (!user || !user.login) return 'Не подключён';
    var plan = user.is_pro_plus ? 'PRO PLUS' : (user.is_pro ? 'PRO' : 'без подписки');
    return user.login + ' · ' + plan;
  }

  function modal(title, html, onBack, onSelect) {
    Lampa.Modal.open({
      title: title,
      html: $('<div class="rmedia-online-modal">' + html + '</div>'),
      size: 'medium',
      onBack: function () {
        if (onBack) onBack();
        Lampa.Modal.close();
        try { Lampa.Controller.toggle('settings_component'); } catch (error) {}
      },
      onSelect: onSelect || function () {}
    });
  }

  function pairFilmix() {
    clearInterval(filmixPoll);
    loading(true);
    requestNative(FILMIX_API + 'token_request' + filmixQuery(''), {
      requestOptions: filmixRequestOptions()
    }).then(function (result) {
      loading(false);
      if (!result || result.status !== 'ok' || !result.code || !result.user_code) {
        throw new Error('Filmix не выдал код подключения');
      }
      var token = result.code;
      var userCode = result.user_code;
      modal('RMEDIA Online · Filmix',
        '<div style="font-size:1.15em;line-height:1.5">' +
        '<b>1.</b> Войдите в свой аккаунт на <b>https://filmix.gg/consoles</b><br>' +
        '<b>2.</b> Введите код устройства</div>' +
        '<div class="selector" style="margin-top:1.2em;padding:0.8em;text-align:center;background:#fff;color:#111;border-radius:0.35em;font-size:1.35em">' + userCode + '</div>' +
        '<div style="margin-top:0.9em;opacity:.65">Нажмите OK, чтобы скопировать код. Проверка выполняется автоматически.</div>',
        function () { clearInterval(filmixPoll); },
        function () {
          try { Lampa.Utils.copyTextToClipboard(userCode, function () { notify('Код Filmix скопирован'); }); } catch (error) {}
        }
      );
      filmixPoll = setInterval(function () {
        filmixProfile(token).then(function (user) {
          clearInterval(filmixPoll);
          set(KEYS.filmixToken, token);
          Lampa.Modal.close();
          notify('Filmix подключён: ' + filmixLabel(user));
          try { Lampa.Controller.toggle('settings_component'); } catch (error) {}
        }).catch(function () {});
      }, 8000);
    }).catch(function (error) {
      loading(false);
      notify(error.message || 'Не удалось подключить Filmix');
    });
  }

  function kinoCredentials() {
    return {
      client: String(get(KEYS.kinoClient, '')).trim(),
      secret: String(get(KEYS.kinoSecret, '')).trim()
    };
  }

  function kinoHeaders() {
    return { headers: { Authorization: 'Bearer ' + String(get(KEYS.kinoAccess, '')) } };
  }

  function kinoProfile() {
    var token = String(get(KEYS.kinoAccess, ''));
    if (!token) return Promise.reject(new Error('KinoPub не подключён'));
    return requestNative(KP_API + 'user', { requestOptions: kinoHeaders() }).then(function (result) {
      var user = result && (result.user || result);
      if (!user || result.error) throw new Error('KinoPub отклонил токен');
      set(KEYS.kinoStatus, user);
      return user;
    });
  }

  function saveKinoTokens(result) {
    if (!result || !result.access_token) throw new Error('KinoPub не вернул токен');
    set(KEYS.kinoAccess, result.access_token);
    set('kinopub_token', result.access_token);
    if (result.refresh_token) set(KEYS.kinoRefresh, result.refresh_token);
    set(KEYS.kinoExpires, Math.floor(Date.now() / 1000) + Number(result.expires_in || 0));
  }

  function refreshKinoToken() {
    var credentials = kinoCredentials();
    var refresh = String(get(KEYS.kinoRefresh, ''));
    if (!credentials.client || !credentials.secret || !refresh) return Promise.reject(new Error('Нет данных для обновления KinoPub'));
    return requestNative(KP_TOKEN, {
      form: form({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: credentials.client,
        client_secret: credentials.secret
      })
    }).then(function (result) {
      saveKinoTokens(result);
      return result;
    });
  }

  function pairKinoPub() {
    clearInterval(kinoPoll);
    var credentials = kinoCredentials();
    if (!credentials.client || !credentials.secret) {
      notify('Сначала укажите официальный Client ID и Client Secret KinoPub');
      return;
    }
    loading(true);
    requestNative(KP_DEVICE, {
      form: form({ grant_type: 'device_code', client_id: credentials.client, client_secret: credentials.secret })
    }).then(function (result) {
      loading(false);
      if (!result || !result.code || !result.user_code) throw new Error('KinoPub не выдал код устройства');
      var interval = Math.max(5, Number(result.interval || 5));
      var verification = result.verification_uri || 'https://kino.pub/device';
      var closed = false;
      modal('RMEDIA Online · KinoPub',
        '<div style="font-size:1.15em;line-height:1.5"><b>1.</b> Авторизуйтесь на <b>' + verification + '</b><br>' +
        '<b>2.</b> Введите код в поле «Активация устройства»</div>' +
        '<div class="selector" style="margin-top:1.2em;padding:0.8em;text-align:center;background:#fff;color:#111;border-radius:0.35em;font-size:1.35em">' + result.user_code + '</div>' +
        '<div style="margin-top:0.9em;opacity:.65">Нажмите OK, чтобы скопировать код.</div>',
        function () { closed = true; clearInterval(kinoPoll); },
        function () {
          try { Lampa.Utils.copyTextToClipboard(result.user_code, function () { notify('Код KinoPub скопирован'); }); } catch (error) {}
        }
      );
      kinoPoll = setInterval(function () {
        if (closed) return;
        requestNative(KP_DEVICE, {
          form: form({
            grant_type: 'device_token',
            code: result.code,
            client_id: credentials.client,
            client_secret: credentials.secret
          })
        }).then(function (tokens) {
          if (!tokens || !tokens.access_token) return;
          clearInterval(kinoPoll);
          saveKinoTokens(tokens);
          return kinoProfile();
        }).then(function (user) {
          if (!user) return;
          Lampa.Modal.close();
          notify('KinoPub подключён');
          try { Lampa.Controller.toggle('settings_component'); } catch (error) {}
        }).catch(function (error) {
          var message = String(error && error.message || '');
          if (/pending|ожидан|400|429/i.test(message)) return;
        });
      }, interval * 1000);
    }).catch(function (error) {
      loading(false);
      notify(error.message || 'Не удалось подключить KinoPub');
    });
  }

  function clearFilmix() {
    clearInterval(filmixPoll);
    set(KEYS.filmixToken, '');
    set(KEYS.filmixStatus, {});
    notify('Привязка Filmix удалена');
  }

  function clearKino() {
    clearInterval(kinoPoll);
    set(KEYS.kinoAccess, '');
    set(KEYS.kinoRefresh, '');
    set(KEYS.kinoExpires, 0);
    set(KEYS.kinoStatus, {});
    set('kinopub_token', '');
    notify('Привязка KinoPub удалена');
  }

  function checkAccounts() {
    loading(true);
    var filmix = filmixProfile(String(get(KEYS.filmixToken, ''))).catch(function () { return null; });
    var kino = kinoProfile().catch(function () {
      return refreshKinoToken().then(kinoProfile).catch(function () { return null; });
    });
    Promise.all([filmix, kino]).then(function (items) {
      loading(false);
      var text = 'Filmix: ' + (items[0] ? filmixLabel(items[0]) : 'не подключён') + '; KinoPub: ' + (items[1] ? 'подключён' : 'не подключён');
      notify(text);
    });
  }

  function addToggle(key, title, description, fallback, action) {
    Lampa.SettingsApi.addParam({
      component: ID,
      param: { name: key, type: 'trigger', default: fallback },
      field: { name: title, description: description || '' },
      onChange: action || function (value) { set(key, value); }
    });
  }

  function addInput(key, title, description, placeholder) {
    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: key,
        type: 'input',
        placeholder: placeholder || '',
        values: String(get(key, '')),
        default: ''
      },
      field: { name: title, description: description || '' },
      onChange: function (value) { set(key, String(value || '').trim()); }
    });
  }

  function registerSettings() {
    if (!Lampa.SettingsApi || window.rmedia_online_settings_ready) return;
    window.rmedia_online_settings_ready = true;
    Lampa.SettingsApi.addComponent({
      component: ID,
      name: NAME,
      icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    });

    addToggle(KEYS.enabled, 'Включить RMEDIA Online', 'Filmix и KinoPub из ваших личных аккаунтов', true);
    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: KEYS.source,
        type: 'select',
        default: 'filmix',
        values: { filmix: 'Filmix', kinopub: 'KinoPub' }
      },
      field: { name: 'Источник по умолчанию', description: 'Первый источник при открытии Online' },
      onChange: function (value) { set(KEYS.source, value); }
    });
    addToggle(KEYS.first, 'Кнопка Online всегда первая', 'Показывать Online перед торрентами и трейлерами', true);
    addToggle(KEYS.resume, 'Продолжить просмотр', 'Возобновлять просмотр с сохранённой позиции', false);

    addInput(KEYS.filmixToken, 'TOKEN Filmix', 'Можно вставить существующий токен вручную', 'nxjekeb57385b...');
    addToggle(KEYS.filmixPair, 'Добавить устройство Filmix', 'Откроет код для filmix.gg/consoles', false, pairFilmix);
    addToggle(KEYS.filmixClear, 'Очистить Filmix', 'Удалить локальный токен и привязку', false, clearFilmix);

    addInput(KEYS.kinoClient, 'KinoPub Client ID', 'Официальные реквизиты OAuth вашего приложения', 'client_id');
    addInput(KEYS.kinoSecret, 'KinoPub Client Secret', 'Хранится только локально на устройстве', 'client_secret');
    addInput(KEYS.kinoAccess, 'TOKEN KinoPub', 'Можно вставить действующий access token вручную', 'access_token');
    addToggle(KEYS.kinoPair, 'Добавить устройство KinoPub', 'Откроет код для kino.pub/device', false, pairKinoPub);
    addToggle(KEYS.kinoClear, 'Очистить KinoPub', 'Удалить локальные токены и привязку', false, clearKino);
    addToggle(KEYS.check, 'Проверить подключения', 'Проверить Filmix и KinoPub прямо сейчас', false, checkAccounts);
  }

  function itemView(entry) {
    var view = $('<div class="online selector rmedia-online-item">' +
      '<div class="online__body">' +
      '<div class="rmedia-online-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg></div>' +
      '<div class="online__title"></div><div class="online__quality"></div>' +
      '</div></div>');
    view.find('.online__title').text(entry.title);
    view.find('.online__quality').text(entry.subtitle || 'Filmix');
    return view;
  }

  function RMediaOnlineComponent(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var files = new Lampa.Explorer(object);
    var last = null;
    var destroyed = false;
    var entries = [];
    var self = this;

    function showEmpty(message) {
      var empty = Lampa.Template.get('list_empty');
      empty.find('.empty__descr').text(message || 'Нет доступных видео');
      scroll.append(empty);
    }

    function appendItems(items) {
      entries = items;
      if (!items.length) return showEmpty('Filmix не вернул доступных переводов');
      items.forEach(function (entry) {
        var view = itemView(entry);
        view.on('hover:focus', function () { last = view[0]; });
        view.on('hover:enter', function () { playFilmix(entry, entries); });
        scroll.append(view);
      });
      self.start(true);
    }

    this.create = function () {
      this.activity.loader(true);
      scroll.body().addClass('torrent-list rmedia-online-list');
      files.appendFiles(scroll.render());
      filmixSearch(object.movie || object).then(function (found) {
        return filmixPost(found.id);
      }).then(function (post) {
        if (destroyed) return;
        self.activity.loader(false);
        appendItems(flattenFilmix(post, object.movie || object));
      }).catch(function (error) {
        if (destroyed) return;
        self.activity.loader(false);
        showEmpty(error.message || 'Filmix временно недоступен');
        self.start(true);
      });
      return this.render();
    };

    this.start = function (first) {
      if (!this.activity || Lampa.Activity.active().activity !== this.activity) return;
      if (first && !last) last = scroll.render().find('.selector').eq(0)[0];
      try { Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie || object)); } catch (error) {}
      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
        down: function () { Navigator.move('down'); },
        right: function () { Navigator.move('right'); },
        left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
        back: this.back
      });
      Lampa.Controller.toggle('content');
    };
    this.back = function () { Lampa.Activity.backward(); };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return files.render(); };
    this.destroy = function () {
      destroyed = true;
      files.destroy();
      scroll.destroy();
      entries = [];
    };
  }

  function openOnline(movie) {
    if (onlineLoading) return;
    onlineLoading = true;
    setTimeout(function () { onlineLoading = false; }, 700);
    Lampa.Component.add(ID, RMediaOnlineComponent);
    Lampa.Activity.push({
      url: '', title: 'RMEDIA Online', component: ID,
      search: movie.title || movie.name, movie: movie, page: 1
    });
  }

  function registerOnline() {
    if (window.rmedia_online_component_ready) return;
    window.rmedia_online_component_ready = true;
    Lampa.Component.add(ID, RMediaOnlineComponent);
    var style = '<style id="rmedia-online-style">' +
      '.rmedia-online-item{position:relative;padding:.65em 1em .65em 3.3em;min-height:3.2em}' +
      '.rmedia-online-play{position:absolute;left:.65em;top:.55em;width:2em;height:2em}' +
      '.rmedia-online-play svg{width:100%;height:100%}' +
      '.rmedia-online-item.focus{background:rgba(255,255,255,.16);border-radius:.35em}' +
      '</style>';
    if (!document.getElementById('rmedia-online-style')) $('body').append(style);

    Lampa.Listener.follow('full', function (event) {
      if (!event || event.type !== 'complite' || !event.data || !event.data.movie) return;
      if (!get(KEYS.enabled, true) || !String(get(KEYS.filmixToken, ''))) return;
      var root = event.object.activity.render();
      if (root.find('.view--rmedia-online').length) return;
      var button = $('<div class="full-start__button selector view--rmedia-online" data-subtitle="Filmix">' +
        '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg><span>Online</span></div>');
      button.on('hover:enter', function () { openOnline(event.data.movie); });
      var torrent = root.find('.view--torrent');
      var trailer = root.find('.view--trailer');
      if (get(KEYS.first, true)) {
        if (torrent.length) torrent.before(button); else if (trailer.length) trailer.before(button); else root.find('.full-start__buttons').prepend(button);
      } else {
        if (torrent.length) torrent.after(button); else root.find('.full-start__buttons').append(button);
      }
    });
  }

  function registerManifest() {
    try {
      Lampa.Manifest = Lampa.Manifest || {};
      Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
      Lampa.Manifest.plugins[ID] = {
        type: 'online',
        name: NAME,
        version: VERSION,
        description: 'Личные аккаунты Filmix и KinoPub без HDRezka.'
      };
    } catch (error) {}
  }

  function start() {
    if (typeof Lampa === 'undefined') { setTimeout(start, 300); return; }
    registerSettings();
    registerOnline();
    registerManifest();
    console.log(NAME + ' v' + VERSION + ' loaded');
  }

  if (window.appready) start();
  else if (typeof Lampa !== 'undefined' && Lampa.Listener && Lampa.Listener.follow) {
    Lampa.Listener.follow('app', function (event) {
      if (event && event.type === 'ready') start();
    });
  } else setTimeout(start, 500);
}());
