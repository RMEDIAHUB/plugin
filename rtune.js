/**
 * RTune for Lampa
 * Лёгкий тюнинг главной страницы без тяжёлой полноэкранной карточки.
 * Version: 1.0.4
 * License: MIT
 */
(function () {
    'use strict';

    var VERSION = '1.0.4';
    if (window.rtune_plugin_version === VERSION) return;
    window.rtune_plugin_version = VERSION;
    window.rtune_plugin_ready = true;

    if (typeof Lampa === 'undefined') return;

    var COMPONENT = 'rtune';
    var STYLE_ID = 'rtune_style';
    var DETAILS_CACHE = 'rtune_tv_details_cache';
    var DAY = 24 * 60 * 60 * 1000;
    var tvQueue = [];
    var tvActive = 0;

    var services = [
        { id: 'netflix', name: 'NETFLIX', provider: 8, color: '#e50914' },
        { id: 'disney', name: 'Disney+', provider: 337, color: '#1f80e0' },
        { id: 'hbo', name: 'HBO', provider: 384, color: '#111111' },
        { id: 'apple', name: 'Apple TV+', provider: 350, color: '#111111' },
        { id: 'prime', name: 'prime video', provider: 119, color: '#00a8e1' },
        { id: 'hulu', name: 'hulu', provider: 15, color: '#1ce783' },
        { id: 'paramount', name: 'Paramount+', provider: 531, color: '#1487ff' }
    ];

    var moods = [
        { title: 'До слёз / Катарсис', genres: '18' },
        { title: 'Чистый позитив', genres: '35,10751' },
        { title: 'Вкусный просмотр', genres: '35,10749' },
        { title: 'Адреналин', genres: '28,53' },
        { title: 'Бабочки в животе', genres: '10749' },
        { title: 'На грани / Напряжение', genres: '53,80' },
        { title: 'В поисках приключений', genres: '12,14' }
    ];

    function setting(name, fallback) {
        var value = Lampa.Storage.get(name, fallback);
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    function language() {
        var lang = String(Lampa.Storage.get('language', 'ru') || 'ru').toLowerCase();
        return lang.indexOf('uk') === 0 ? 'uk-UA' : lang.indexOf('en') === 0 ? 'en-US' : 'ru-RU';
    }

    function apiKey() {
        var custom = String(Lampa.Storage.get('rtune_tmdb_key', '') || '').trim();
        if (custom) return custom;
        try { return Lampa.TMDB.key(); } catch (e) { return ''; }
    }

    function tmdb(path) {
        var glue = path.indexOf('?') >= 0 ? '&' : '?';
        var url = path + glue + 'api_key=' + encodeURIComponent(apiKey()) + '&language=' + language();
        return Lampa.TMDB.api(url);
    }

    function request(path, success, error) {
        new Lampa.Reguest().silent(tmdb(path), function (data) {
            success(data || {});
        }, function () {
            if (error) error();
        });
    }

    function markTmdb(items, mediaType) {
        return (items || []).map(function (item) {
            item.source = 'tmdb';
            if (mediaType && !item.media_type) item.media_type = mediaType;
            return item;
        });
    }

    function openMovie(movie) {
        Lampa.Activity.push({
            url: '',
            component: 'full',
            id: movie.id,
            method: (movie.media_type === 'tv' || movie.name || movie.first_air_date) ? 'tv' : 'movie',
            card: movie,
            source: 'tmdb'
        });
    }

    function openCategory(title, path) {
        Lampa.Activity.push({
            url: path,
            title: title,
            component: 'category_full',
            page: 1,
            source: 'tmdb'
        });
    }

    function customCard(config) {
        return {
            title: config.title,
            params: {
                createInstance: function (element) {
                    return Lampa.Maker.make('Card', element, function (module) {
                        return module.only('Card', 'Callback');
                    });
                },
                emit: {
                    onCreate: function () {
                        var item = $(this.html);
                        item.addClass(config.className);
                        item.find('.card__view,.card__title,.card__age').remove();
                        item.append(config.html);
                        if (config.background) item.css('background-image', 'url("' + config.background + '")');
                    },
                    onlyEnter: function () { config.enter(); }
                }
            }
        };
    }

    function heroCard(movie) {
        var title = movie.title || movie.name || '';
        var date = movie.release_date || movie.first_air_date || '';
        var year = date ? String(date).slice(0, 4) : '';
        var rating = parseFloat(movie.vote_average || 0);
        var image = movie.backdrop_path ? Lampa.TMDB.image('t/p/w780' + movie.backdrop_path) : '';
        var meta = (rating > 0 ? '<b>★ ' + rating.toFixed(1) + '</b> ' : '') + year;
        var overview = String(movie.overview || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return customCard({
            title: title,
            className: 'rtune-hero',
            background: image,
            html: '<div class="rtune-hero__shade"><div class="rtune-hero__title">' + title + '</div>' +
                '<div class="rtune-hero__meta">' + meta + '</div>' +
                '<div class="rtune-hero__text">' + overview + '</div>' +
                '<div class="rtune-hero__button">▶ Подробнее</div></div>',
            enter: function () { openMovie(movie); }
        });
    }

    function serviceCard(service) {
        return customCard({
            title: service.name,
            className: 'rtune-service rtune-service--' + service.id,
            html: '<div class="rtune-service__logo" style="color:' + service.color + '">' + service.name + '</div>',
            enter: function () {
                openCategory(service.name, 'discover/movie?with_watch_providers=' + service.provider + '&watch_region=US&sort_by=popularity.desc');
            }
        });
    }

    function moodCard(mood) {
        return customCard({
            title: mood.title,
            className: 'rtune-mood',
            html: '<div class="rtune-mood__title">' + mood.title + '</div>',
            enter: function () {
                openCategory(mood.title, 'discover/movie?with_genres=' + mood.genres + '&sort_by=popularity.desc&vote_count.gte=100');
            }
        });
    }

    function addRows() {
        if (!Lampa.ContentRows || !Lampa.ContentRows.add) return;

        (window.rtune_content_rows || []).forEach(function (row) {
            try { Lampa.ContentRows.remove(row); } catch (error) {}
        });
        window.rtune_content_rows = [];

        function addRow(row) {
            window.rtune_content_rows.push(row);
            Lampa.ContentRows.add(row);
        }

        addRow({
            name: 'rtune_releases',
            title: '🔥 Новинки фильмов',
            index: 0,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_releases', true)) return;
                return function (done) {
                    request('movie/now_playing?region=US&page=1', function (json) {
                        var list = markTmdb(json.results, 'movie').filter(function (item) { return item.backdrop_path; }).slice(0, 6);
                        done({
                            title: '🔥 Новинки фильмов',
                            results: list.map(heroCard),
                            params: { items: { mapping: 'line', view: 2 } }
                        });
                    }, function () { done({ results: [] }); });
                };
            }
        });

        addRow({
            name: 'rtune_tv_new',
            title: '📡 Новинки сериалов',
            index: 1,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_tv', true)) return;
                return function (done) {
                    request('tv/on_the_air?page=1', function (json) {
                        json.title = '📡 Новинки сериалов';
                        json.results = markTmdb(json.results, 'tv');
                        done(json);
                    }, function () { done({ results: [] }); });
                };
            }
        });

        addRow({
            name: 'rtune_ru_new',
            title: '🇷🇺 Новинки русской ленты',
            index: 2,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_ru', true)) return;
                return function (done) {
                    var year = new Date().getFullYear();
                    request('discover/movie?with_original_language=ru&primary_release_date.gte=' + (year - 1) + '-01-01&sort_by=primary_release_date.desc&page=1', function (json) {
                        json.title = '🇷🇺 Новинки русской ленты';
                        json.results = markTmdb(json.results, 'movie');
                        done(json);
                    }, function () { done({ results: [] }); });
                };
            }
        });

        addRow({
            name: 'rtune_ua_new',
            title: '🇺🇦 Новинки украинской ленты',
            index: 3,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_ua', true)) return;
                return function (done) {
                    var completed = 0;
                    var combined = [];

                    function finish(items) {
                        combined = combined.concat(items || []);
                        completed++;
                        if (completed < 2) return;

                        var seen = {};
                        var unique = combined.filter(function (item) {
                            if (!item || !item.id || seen[item.id]) return false;
                            seen[item.id] = true;
                            return true;
                        }).sort(function (a, b) {
                            return String(b.release_date || '').localeCompare(String(a.release_date || ''));
                        });

                        done({
                            title: '🇺🇦 Новинки украинской ленты',
                            results: markTmdb(unique, 'movie')
                        });
                    }

                    request('discover/movie?with_original_language=uk&sort_by=primary_release_date.desc&page=1', function (json) {
                        finish(json.results);
                    }, function () { finish([]); });
                    request('discover/movie?with_origin_country=UA&sort_by=primary_release_date.desc&page=1', function (json) {
                        finish(json.results);
                    }, function () { finish([]); });
                };
            }
        });

        addRow({
            name: 'rtune_streamings',
            title: '📺 Стриминги',
            index: 4,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_streamings', true)) return;
                return function (done) {
                    done({
                        title: '📺 Стриминги',
                        results: services.map(serviceCard),
                        params: { items: { mapping: 'line', view: 7 } }
                    });
                };
            }
        });

        addRow({
            name: 'rtune_moods',
            title: '🎭 Кино по настроению',
            index: 5,
            screen: ['main'],
            call: function () {
                if (!setting('rtune_home_moods', true)) return;
                return function (done) {
                    done({
                        title: '🎭 Кино по настроению',
                        results: moods.map(moodCard),
                        params: { items: { mapping: 'line', view: 7 } }
                    });
                };
            }
        });
    }

    function seasonText(data) {
        if (!data) return '';
        var last = data.last_episode_to_air;
        if (last && last.season_number) {
            var season = 'S' + last.season_number;
            var total = 0;
            (data.seasons || []).some(function (item) {
                if (item.season_number === last.season_number) {
                    total = item.episode_count || 0;
                    return true;
                }
                return false;
            });
            if (last.episode_number && total && last.episode_number < total) season += ' ' + last.episode_number + '/' + total;
            return season;
        }
        if (data.number_of_seasons) return 'S' + data.number_of_seasons;
        return '';
    }

    function cacheGet(id) {
        var cache = Lampa.Storage.get(DETAILS_CACHE, {}) || {};
        var item = cache[id];
        return item && Date.now() - item.time < DAY * 7 ? item.data : null;
    }

    function cacheSet(id, data) {
        var cache = Lampa.Storage.get(DETAILS_CACHE, {}) || {};
        cache[id] = { time: Date.now(), data: data };
        var keys = Object.keys(cache);
        if (keys.length > 120) {
            keys.sort(function (a, b) { return cache[a].time - cache[b].time; }).slice(0, keys.length - 100).forEach(function (key) { delete cache[key]; });
        }
        Lampa.Storage.set(DETAILS_CACHE, cache);
    }

    function addSeasonBadge(card, data) {
        if (!card || card.querySelector('.rtune-season')) return;
        var text = seasonText(data);
        if (!text) return;
        var view = card.querySelector('.card__view');
        if (!view) return;
        var badge = document.createElement('div');
        badge.className = 'rtune-season';
        badge.textContent = text;
        view.appendChild(badge);
    }

    function runTvQueue() {
        while (tvActive < 2 && tvQueue.length) {
            var job = tvQueue.shift();
            tvActive++;
            (function (current) {
                request('tv/' + current.data.id, function (details) {
                    cacheSet(current.data.id, details);
                    addSeasonBadge(current.card, details);
                    tvActive--;
                    runTvQueue();
                }, function () {
                    tvActive--;
                    runTvQueue();
                });
            })(job);
        }
    }

    function processCard(card) {
        if (!card || card.dataset.rtuneDone === '1' || card.classList.contains('rtune-hero') || card.classList.contains('rtune-service') || card.classList.contains('rtune-mood')) return;
        card.dataset.rtuneDone = '1';
        var data = card.card_data || (window.$ ? $(card).data('card') : null);
        if (!data) return;

        var isTv = !!(data.name || data.original_name || data.first_air_date || data.media_type === 'tv');
        if (!isTv || !setting('rtune_badge_seasons', true)) return;

        var ready = seasonText(data);
        if (ready) return addSeasonBadge(card, data);

        var cached = cacheGet(data.id);
        if (cached) return addSeasonBadge(card, cached);

        tvQueue.push({ card: card, data: data });
        runTvQueue();
    }

    function observeCards() {
        Array.prototype.forEach.call(document.querySelectorAll('.card'), processCard);
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('card')) processCard(node);
                    if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll('.card'), processCard);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function restoreCompactCard(render) {
        if (!render || !render.length) return;
        render.removeClass('applecation').addClass('rtune-compact');
        render.find('.applecation__left,.applecation__overlay').remove();
        var line = render.find('.full-start-new__rate-line').first();
        var tagline = render.find('.full-start-new__tagline').first();
        if (line.length && tagline.length) line.insertAfter(tagline);
        if (setting('rtune_hide_metadata', true)) render.find('.full-metadata').remove();
    }

    function watchFull() {
        if (!Lampa.Listener || !Lampa.Listener.follow) return;
        Lampa.Listener.follow('full', function (event) {
            if (!event || event.type !== 'complite' || !event.object || !event.object.activity) return;
            var activity = event.object.activity;
            [0, 250, 900].forEach(function (delay) {
                setTimeout(function () {
                    try { restoreCompactCard(activity.render()); } catch (e) { }
                }, delay);
            });
        });
    }

    function addStyles() {
        $('#' + STYLE_ID).remove();
        $('body').append('<style id="' + STYLE_ID + '">' +
            '.rtune-hero{width:48vw!important;height:19em!important;margin-right:1em!important;border-radius:.8em!important;background-size:cover!important;background-position:center!important;position:relative!important;overflow:hidden!important}' +
            '.rtune-hero.focus{box-shadow:0 0 0 .22em #fff!important}' +
            '.rtune-hero__shade{position:absolute;inset:0;padding:1.2em;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(0deg,rgba(0,0,0,.94),rgba(0,0,0,.05) 78%)}' +
            '.rtune-hero__title{font-size:1.65em;font-weight:700;max-width:80%;text-shadow:0 .08em .16em #000}' +
            '.rtune-hero__meta{margin-top:.3em;color:#ddd}.rtune-hero__meta b{color:#ffd54a}' +
            '.rtune-hero__text{font-size:.82em;line-height:1.3;max-width:72%;margin-top:.35em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#ddd}' +
            '.rtune-hero__button{display:inline-block;align-self:flex-start;margin-top:.6em;padding:.35em .65em;border-radius:.25em;background:rgba(255,255,255,.22);font-weight:600}' +
            '.rtune-service{width:12em!important;height:6em!important;margin-right:.8em!important;background:#f3f3f3!important;border-radius:.65em!important;display:flex!important;align-items:center!important;justify-content:center!important}' +
            '.rtune-service.focus,.rtune-mood.focus{box-shadow:0 0 0 .22em #fff!important;transform:scale(1.035)}' +
            '.rtune-service__logo{font-size:1.25em;font-weight:800;text-align:center;letter-spacing:-.03em}' +
            '.rtune-service--hbo .rtune-service__logo,.rtune-service--apple .rtune-service__logo{color:#111!important;-webkit-text-fill-color:#111!important;text-shadow:none!important;opacity:1!important}' +
            '.rtune-mood{width:12em!important;height:4em!important;margin-right:.8em!important;border-radius:.65em!important;background:#242424!important;display:flex!important;align-items:center!important;justify-content:center!important}' +
            '.rtune-mood__title{font-size:1em;font-weight:600;text-align:center;padding:0 .6em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.rtune-season{position:absolute;left:0;top:0;z-index:4;padding:.18em .42em;border-radius:0 0 .45em 0;background:rgba(45,45,45,.92);color:#fff;font-weight:700;font-size:.9em}' +
            '.rtune-compact .full-start-new__body{height:auto!important;min-height:34em!important}' +
            '.rtune-compact .full-start-new__left{display:block!important;flex:0 0 15em!important;max-width:15em!important}' +
            '.rtune-compact .full-start-new__poster{display:block!important;width:100%!important}' +
            '.rtune-compact .full-start-new__right{display:block!important;align-self:center!important}' +
            '.rtune-compact .full-start-new__head,.rtune-compact .full-start-new__title,.rtune-compact .full-start-new__tagline,.rtune-compact .full-start-new__rate-line,.rtune-compact .full-start-new__details,.rtune-compact .full-start-new__reactions,.rtune-compact .full-start-new__buttons{display:flex!important}' +
            '.rtune-compact .full-start-new__title{display:block!important}' +
            '.rtune-compact .full-start-new__tagline{display:block!important}' +
            '.rtune-compact .full-start-new__reactions:empty{display:none!important}' +
            (setting('rtune_hide_metadata', true) ? '.full-metadata{display:none!important}' : '') +
            '@media screen and (max-width:700px){.rtune-hero{width:78vw!important;height:16em!important}.rtune-hero__text{display:none}.rtune-service{width:9.5em!important;height:5em!important}.rtune-mood{width:10.5em!important}.rtune-compact .full-start-new__left{flex-basis:11em!important;max-width:11em!important}}' +
            '</style>');
    }

    function setupSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;

        try { Lampa.SettingsApi.removeParams(COMPONENT); } catch (error) {}
        try { Lampa.SettingsApi.removeComponent(COMPONENT); } catch (error) {}

        Lampa.SettingsApi.addComponent({
            component: COMPONENT,
            name: 'RTune',
            icon: '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M10 14v6"/></svg>'
        });

        Lampa.SettingsApi.addParam({ component: COMPONENT, param: { type: 'title' }, field: { name: 'Главная страница' } });
        [
            ['rtune_home_releases', 'Новинки фильмов', 'Большие баннеры только на главной', true],
            ['rtune_home_tv', 'Новинки сериалов', 'Свежие сериалы TMDB', true],
            ['rtune_home_ru', 'Новинки русской ленты', 'Свежие фильмы на русском языке', true],
            ['rtune_home_ua', 'Новинки украинской ленты', 'Украинские фильмы за последние два года', true],
            ['rtune_home_streamings', 'Стриминги', 'Netflix, HBO, Apple TV+ и другие', true],
            ['rtune_home_moods', 'Кино по настроению', 'Быстрые подборки по жанрам', true]
        ].forEach(function (item) {
            Lampa.SettingsApi.addParam({ component: COMPONENT, param: { name: item[0], type: 'trigger', default: item[3] }, field: { name: item[1], description: item[2] } });
        });

        Lampa.SettingsApi.addParam({ component: COMPONENT, param: { type: 'title' }, field: { name: 'Карточки' } });
        Lampa.SettingsApi.addParam({ component: COMPONENT, param: { name: 'rtune_badge_seasons', type: 'trigger', default: true }, field: { name: 'Сезон и серии', description: 'Подгружается лениво и хранится в кеше 7 дней' } });
        Lampa.SettingsApi.addParam({ component: COMPONENT, param: { name: 'rtune_hide_metadata', type: 'trigger', default: true }, field: { name: 'Скрывать метаданные', description: 'Оставляет лёгкую карточку и реакции со смайлами' } });
    }

    function refreshHomeOnce() {
        var refreshKey = 'rtune_home_rows_applied_' + VERSION.replace(/\./g, '_');
        if (Lampa.Storage.get(refreshKey, false)) return;

        setTimeout(function () {
            try {
                var active = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
                if (!active || active.component !== 'main') return;

                Lampa.Storage.set(refreshKey, true);
                Lampa.Activity.refresh();
            } catch (error) {}
        }, 1200);
    }

    function start() {
        addStyles();
        addRows();
        setupSettings();
        observeCards();
        watchFull();
        refreshHomeOnce();
        if (Lampa.Manifest && Lampa.Manifest.plugins) Lampa.Manifest.plugins = Lampa.Manifest.plugins.filter(function (item) { return item !== 'RTune'; });
        if (Lampa.Noty && !Lampa.Storage.get('rtune_welcome_' + VERSION, false)) {
            Lampa.Storage.set('rtune_welcome_' + VERSION, true);
            Lampa.Noty.show('RTune ' + VERSION + ' установлен');
        }
    }

    if (window.appready) start();
    else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) { if (event.type === 'ready') start(); });
    }
})();
