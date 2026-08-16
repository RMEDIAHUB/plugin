/**
 * RMEDIA Comments for Lampa
 * Безопасный просмотр комментариев HDRezka без обязательного английского названия.
 *
 * Version: 1.0.0
 * License: MIT
 */
(function () {
  'use strict';

  if (window.rmediahub_comments_ready) return;
  window.rmediahub_comments_ready = true;

  var ID = 'rmediahub_comments';
  var NAME = 'RMEDIA Comments';
  var VERSION = '1.0.0';
  var BUTTON_CLASS = 'button--rmedia-comments';
  var DEFAULT_HOST = 'https://rezka.ag';
  var DEFAULT_PROXY = 'https://worker-patient-dream-26d8.bdvburik.workers.dev:8443/';

  var KEYS = {
    mode: 'rmedia_comments_mode',
    host: 'rmedia_comments_host',
    proxy: 'rmedia_comments_proxy'
  };

  function storageGet(key, fallback) {
    try {
      var value = Lampa.Storage.get(key, fallback);
      return typeof value === 'string' ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function settings() {
    var mode = storageGet(KEYS.mode, 'auto');
    var host = storageGet(KEYS.host, DEFAULT_HOST).trim().replace(/\/+$/, '');
    var proxy = storageGet(KEYS.proxy, DEFAULT_PROXY).trim();

    if (!host) host = DEFAULT_HOST;
    if (proxy && proxy.slice(-1) !== '/') proxy += '/';

    return { mode: mode, host: host, proxy: proxy };
  }

  function notify(message) {
    try { Lampa.Noty.show(message); }
    catch (error) { console.warn(NAME + ': ' + message); }
  }

  function loading(active) {
    try {
      if (active) Lampa.Loading.start();
      else Lampa.Loading.stop();
    } catch (error) {}
  }

  function cleanTitle(value) {
    return String(value || '')
      .replace(/[\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/ё/g, 'е')
      .replace(/[\s.,:;’'`!?"“”()\[\]{}]+/g, ' ')
      .trim();
  }

  function normalized(value) {
    return cleanTitle(value).toLowerCase();
  }

  function uniqueTitles(values) {
    var result = [];
    var seen = {};

    values.forEach(function (value) {
      var title = cleanTitle(value);
      var key = normalized(title);
      if (!title || !key || seen[key]) return;
      seen[key] = true;
      result.push(title);
    });

    return result.slice(0, 6);
  }

  function movieType(movie, method) {
    if (method === 'tv' || method === 'serial' || movie.first_air_date || movie.name) return 'tv';
    return 'movie';
  }

  function movieYear(movie) {
    var date = movie.release_date || movie.first_air_date || '';
    var match = String(date).match(/\d{4}/);
    return match ? match[0] : '';
  }

  function baseTitles(movie) {
    return uniqueTitles([
      movie.original_title,
      movie.original_name,
      movie.title,
      movie.name,
      movie.alternative_title
    ]);
  }

  function tmdbDetails(movie, type) {
    return new Promise(function (resolve) {
      if (!movie.id || !Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) {
        resolve([]);
        return;
      }

      var finished = false;
      var timer = setTimeout(function () {
        if (!finished) {
          finished = true;
          resolve([]);
        }
      }, 7000);

      try {
        Lampa.Api.sources.tmdb.get(
          type + '/' + movie.id + '?append_to_response=translations,alternative_titles',
          {},
          function (data) {
            if (finished) return;
            finished = true;
            clearTimeout(timer);

            var titles = [data.original_title, data.original_name, data.title, data.name];
            var translations = data && data.translations;
            translations = translations && (translations.translations || translations.results || translations);

            if (Array.isArray(translations)) {
              translations.forEach(function (translation) {
                var code = translation.iso_639_1 || translation.iso_3166_1 || '';
                var item = translation.data || translation;
                if (/^(en|ru|uk|US|GB|UA)$/i.test(code)) {
                  titles.push(item.title, item.name);
                }
              });
            }

            var alternatives = data && data.alternative_titles;
            alternatives = alternatives && (alternatives.titles || alternatives.results || alternatives);
            if (Array.isArray(alternatives)) {
              alternatives.slice(0, 10).forEach(function (item) {
                titles.push(item.title, item.name);
              });
            }

            resolve(uniqueTitles(titles));
          },
          function () {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve([]);
          }
        );
      } catch (error) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve([]);
        }
      }
    });
  }

  function proxyUrl(target, referer) {
    var config = settings();
    if (!config.proxy) return target;
    if (config.proxy.indexOf('{url}') >= 0) return config.proxy.replace('{url}', encodeURIComponent(target));
    if (referer) return config.proxy + 'param/Referer=' + encodeURIComponent(referer) + '/' + target;
    return config.proxy + target;
  }

  function requestText(target, contentType, referer) {
    return new Promise(function (resolve, reject) {
      var complete = false;
      var timer = setTimeout(function () {
        if (complete) return;
        complete = true;
        reject(new Error('Превышено время ожидания'));
      }, 15000);

      fetch(proxyUrl(target, referer), {
        method: 'GET',
        headers: { 'Content-Type': contentType || 'text/plain' }
      }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      }).then(function (text) {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        resolve(text);
      }).catch(function (error) {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function antiBot(text) {
    return /проверяем, что вы не бот|anubis|cloudflare.*challenge|just a moment/i.test(String(text || ''));
  }

  function resultData(item) {
    var link = item.querySelector('.b-content__inline_item-link a, .b-content__inline_item-link');
    var title = link ? (link.textContent || '') : '';
    var href = link ? (link.getAttribute('href') || '') : '';
    var id = item.getAttribute('data-id') || '';
    var text = item.textContent || '';
    var yearMatch = text.match(/(?:19|20)\d{2}/);

    return {
      id: id,
      url: href,
      title: cleanTitle(title),
      year: yearMatch ? yearMatch[0] : '',
      text: text
    };
  }

  function scoreResult(result, wantedTitle, wantedYear) {
    var wanted = normalized(wantedTitle);
    var found = normalized(result.title);
    var score = 0;

    if (wanted && found === wanted) score += 100;
    else if (wanted && found && (found.indexOf(wanted) >= 0 || wanted.indexOf(found) >= 0)) score += 55;
    if (wantedYear && result.year === wantedYear) score += 45;
    if (result.id) score += 5;

    return score;
  }

  function searchOne(title, year) {
    var config = settings();
    var query = title + (year ? ' ' + year : '');
    var target = config.host + '/search/?do=search&subaction=search&q=' + encodeURIComponent(query);

    return requestText(target, 'text/html').then(function (html) {
      if (antiBot(html)) throw new Error('Rezka включила защиту от ботов');

      var dom = new DOMParser().parseFromString(html, 'text/html');
      var items = Array.prototype.slice.call(dom.querySelectorAll('.b-content__inline_item'));
      if (!items.length) return null;

      var results = items.map(resultData).filter(function (item) { return item.id; });
      results.sort(function (a, b) {
        return scoreResult(b, title, year) - scoreResult(a, title, year);
      });

      return results.length ? results[0] : null;
    });
  }

  function searchAll(titles, year, index) {
    index = index || 0;
    if (index >= titles.length) return Promise.resolve(null);

    return searchOne(titles[index], year).then(function (result) {
      if (result && scoreResult(result, titles[index], year) >= 45) return result;
      return searchAll(titles, year, index + 1);
    });
  }

  function directChildList(item) {
    var children = item.children || [];
    for (var i = 0; i < children.length; i++) {
      if (children[i].tagName === 'OL' && children[i].classList.contains('comments-tree-list')) return children[i];
    }
    return null;
  }

  function commentNode(item) {
    var userNode = item.querySelector('.name, .b-comment__user');
    var dateNode = item.querySelector('.date, .b-comment__time');
    var textNode = item.querySelector('.message .text, .comment-text, .text');
    var user = cleanTitle(userNode ? userNode.textContent : '') || 'Без имени';
    var date = cleanTitle(dateNode ? dateNode.textContent : '');
    var message = String(textNode ? textNode.textContent : '').replace(/\s+/g, ' ').trim();
    var row = document.createElement('div');
    var avatar = document.createElement('div');
    var body = document.createElement('div');
    var head = document.createElement('div');
    var name = document.createElement('span');
    var time = document.createElement('span');
    var content = document.createElement('div');

    row.className = 'rm-comment';
    avatar.className = 'rm-comment__avatar';
    body.className = 'rm-comment__body';
    head.className = 'rm-comment__head';
    name.className = 'rm-comment__name';
    time.className = 'rm-comment__date';
    content.className = 'rm-comment__text';

    avatar.textContent = user.slice(0, 1).toUpperCase();
    name.textContent = user;
    time.textContent = date;
    content.textContent = message || 'Комментарий без текста';

    head.appendChild(name);
    head.appendChild(time);
    body.appendChild(head);
    body.appendChild(content);
    row.appendChild(avatar);
    row.appendChild(body);

    return row;
  }

  function buildComments(list, level, state) {
    var fragment = document.createDocumentFragment();
    var children = list ? list.children : [];

    for (var i = 0; i < children.length && state.count < 250; i++) {
      var item = children[i];
      if (item.tagName !== 'LI') continue;

      var wrap = document.createElement('div');
      wrap.className = 'rm-comment-wrap';
      wrap.style.marginLeft = Math.min(level, 4) * 1.15 + 'em';
      wrap.appendChild(commentNode(item));
      fragment.appendChild(wrap);
      state.count += 1;

      var nested = directChildList(item);
      if (nested) fragment.appendChild(buildComments(nested, level + 1, state));
    }

    return fragment;
  }

  function ensureStyles() {
    if (document.getElementById(ID + '-style')) return;

    var style = document.createElement('style');
    style.id = ID + '-style';
    style.textContent = [
      '.rm-comments{padding:.2em .4em 1em}',
      '.rm-comments__source{opacity:.55;font-size:.85em;margin:0 0 1em .2em}',
      '.rm-comment-wrap{margin-bottom:.45em}',
      '.rm-comment{display:flex;align-items:flex-start}',
      '.rm-comment__avatar{width:2.45em;height:2.45em;border-radius:50%;flex:0 0 auto;',
      'display:flex;align-items:center;justify-content:center;margin-right:.7em;',
      'background:#343434;color:#fff;font-weight:700}',
      '.rm-comment__body{min-width:0;flex:1;background:#1b1b1b;border-radius:.65em;padding:.65em .8em}',
      '.rm-comment__head{display:flex;justify-content:space-between;gap:1em;margin-bottom:.35em}',
      '.rm-comment__name{font-weight:700;overflow:hidden;text-overflow:ellipsis}',
      '.rm-comment__date{font-size:.78em;opacity:.55;white-space:nowrap}',
      '.rm-comment__text{line-height:1.42;white-space:normal;overflow-wrap:anywhere}',
      '.full-start__button.' + BUTTON_CLASS + ' svg{width:1.5em;height:1.5em}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function openComments(result) {
    var config = settings();
    var target = config.host + '/ajax/get_comments/?t=' + Date.now() +
      '&news_id=' + encodeURIComponent(result.id) +
      '&cstart=1&type=0&comment_id=0&skin=hdrezka';

    var referer = result.url || config.host;
    if (referer.charAt(0) === '/') referer = config.host + referer;

    return requestText(target, 'text/plain', referer).then(function (responseText) {
      if (antiBot(responseText)) throw new Error('Rezka включила защиту от ботов');

      var json;
      try { json = JSON.parse(responseText); }
      catch (error) { throw new Error('Сервер комментариев вернул неверный ответ'); }

      if (!json || !json.comments) throw new Error('Комментарии отсутствуют');

      var dom = new DOMParser().parseFromString(json.comments, 'text/html');
      var root = dom.querySelector('.comments-tree-list');
      if (!root) throw new Error('Комментарии отсутствуют');

      var state = { count: 0 };
      var container = document.createElement('div');
      var source = document.createElement('div');
      container.className = 'rm-comments';
      source.className = 'rm-comments__source';
      source.textContent = 'Источник: HDRezka • показано до 250 комментариев';
      container.appendChild(source);
      container.appendChild(buildComments(root, 0, state));

      if (!state.count) throw new Error('Комментарии отсутствуют');

      ensureStyles();
      Lampa.Modal.open({
        title: 'Комментарии • ' + (result.title || 'HDRezka'),
        html: window.$ ? window.$(container) : container,
        size: 'large',
        mask: true,
        onBack: function () {
          Lampa.Modal.close();
          try { Lampa.Controller.toggle('content'); } catch (error) {}
        }
      });
    });
  }

  function loadForMovie(movie, method) {
    var config = settings();
    var type = movieType(movie, method);
    var year = movieYear(movie);
    var initial = baseTitles(movie);

    if (config.mode === 'cub') {
      openCub(movie);
      return;
    }

    loading(true);
    tmdbDetails(movie, type).then(function (extra) {
      var titles = uniqueTitles(initial.concat(extra));
      if (!titles.length) throw new Error('В карточке отсутствует название');
      return searchAll(titles, year, 0);
    }).then(function (result) {
      if (!result) throw new Error('Фильм или сериал на Rezka не найден');
      return openComments(result);
    }).catch(function (error) {
      console.warn(NAME + ':', error);
      if (config.mode === 'auto') {
        loading(false);
        notify('HDRezka недоступна — открываю комментарии CUB');
        openCub(movie);
      } else {
        notify(error && error.message ? error.message : 'Не удалось загрузить комментарии');
      }
    }).then(function () {
      loading(false);
    });
  }

  function openCub(movie) {
    loading(false);
    try {
      if (!Lampa.Router || typeof Lampa.Router.call !== 'function') {
        throw new Error('Раздел CUB недоступен');
      }
      Lampa.Router.call('discuss', movie);
    } catch (error) {
      notify(error.message || 'Не удалось открыть комментарии CUB');
    }
  }

  function buttonHtml() {
    return '<div class="full-start__button selector ' + BUTTON_CLASS + '">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg><span>Комментарии</span></div>';
  }

  function installButton(event) {
    setTimeout(function () {
      var movie = event && event.data && event.data.movie;
      var method = event && event.object && event.object.method;
      var container = document.querySelector('.full-start-new__buttons, .full-start__buttons');
      if (!movie || !container) return;

      Array.prototype.slice.call(document.querySelectorAll('.button--comment, .' + BUTTON_CLASS)).forEach(function (item) {
        if (item.parentNode) item.parentNode.removeChild(item);
      });

      var holder = document.createElement('div');
      holder.innerHTML = buttonHtml();
      var button = holder.firstChild;
      container.appendChild(button);

      if (window.$) {
        window.$(button).on('hover:enter.rmediaComments', function () {
          loadForMovie(movie, method);
        });
      } else {
        button.addEventListener('click', function () {
          loadForMovie(movie, method);
        });
      }
    }, 120);
  }

  function registerSettings() {
    if (!Lampa.SettingsApi || window.rmediahub_comments_settings_ready) return;
    window.rmediahub_comments_settings_ready = true;

    Lampa.SettingsApi.addComponent({
      component: ID,
      name: 'RMEDIA Comments',
      icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    });

    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: KEYS.mode,
        type: 'select',
        default: 'auto',
        values: {
          auto: 'Авто: HDRezka → CUB',
          cub: 'Только CUB',
          rezka: 'Только HDRezka'
        }
      },
      field: {
        name: 'Источник комментариев',
        description: 'Авто откроет CUB, если HDRezka или прокси не отвечают'
      },
      onChange: function (value) { Lampa.Storage.set(KEYS.mode, value); }
    });

    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: KEYS.host,
        type: 'input',
        placeholder: DEFAULT_HOST,
        values: storageGet(KEYS.host, DEFAULT_HOST),
        default: DEFAULT_HOST
      },
      field: {
        name: 'Зеркало HDRezka',
        description: 'Меняйте только если основной адрес перестал отвечать'
      },
      onChange: function (value) { Lampa.Storage.set(KEYS.host, value); }
    });

    Lampa.SettingsApi.addParam({
      component: ID,
      param: {
        name: KEYS.proxy,
        type: 'input',
        placeholder: DEFAULT_PROXY,
        values: storageGet(KEYS.proxy, DEFAULT_PROXY),
        default: DEFAULT_PROXY
      },
      field: {
        name: 'Прокси для запросов',
        description: 'Cookie и данные авторизации не используются'
      },
      onChange: function (value) { Lampa.Storage.set(KEYS.proxy, value); }
    });
  }

  function registerManifest() {
    try {
      Lampa.Manifest = Lampa.Manifest || {};
      Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
      Lampa.Manifest.plugins[ID] = {
        type: 'other',
        name: NAME,
        version: VERSION,
        description: 'Комментарии HDRezka с надёжным поиском названий.'
      };
    } catch (error) {}
  }

  function start() {
    if (typeof Lampa === 'undefined') {
      setTimeout(start, 300);
      return;
    }

    ensureStyles();
    registerSettings();
    registerManifest();

    if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('full', function (event) {
        if (event && (event.type === 'complite' || event.type === 'complete')) installButton(event);
      });
    }

    console.log(NAME + ' v' + VERSION + ' loaded');
  }

  if (window.appready) start();
  else if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
    Lampa.Listener.follow('app', function (event) {
      if (event && event.type === 'ready') start();
    });
  } else setTimeout(start, 500);
}());
