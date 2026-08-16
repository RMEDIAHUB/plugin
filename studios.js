/**
 * RMEDIAHUB Studios for Lampa
 * Independent Russian-language catalogue plugin.
 *
 * Version: 1.1.0
 * License: MIT
 *
 * The plugin does not provide video streams. It only opens TMDB catalogue
 * selections through Lampa's built-in TMDB source.
 */
(function () {
    'use strict';

    if (window.rmediahub_studios_ready) return;
    window.rmediahub_studios_ready = true;

    var PLUGIN = 'rmediahub_studios';
    var VERSION = '1.1.0';

    var ICONS = {
        netflix: brandIcon('N', '#e50914'),
        apple: brandIcon('A', '#ffffff'),
        max: brandIcon('M', '#6d5dfc'),
        prime: brandIcon('P', '#00a8e1'),
        disney: brandIcon('D', '#7aa7ff'),
        hulu: brandIcon('H', '#1ce783'),
        paramount: brandIcon('P+', '#4f8cff'),
        syfy: brandIcon('S', '#ffffff'),
        knowledge: questionIcon()
    };

    function brandIcon(label, color) {
        var size = label.length > 1 ? '15' : '22';
        return '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<circle cx="22" cy="22" r="18" fill="none" stroke="' + color + '" stroke-width="3"/>' +
            '<text x="22" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + size + '" font-weight="700" fill="' + color + '">' + label + '</text>' +
            '</svg>';
    }

    function questionIcon() {
        return '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<circle cx="22" cy="22" r="18" fill="#f5a623"/>' +
            '<path d="M16.5 16.5c.7-4 4-6 7.8-5.4 3.7.5 6.2 3 6.2 6.2 0 3.4-2.2 5-4.5 6.5-2 1.3-2.7 2.2-2.7 4.2" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>' +
            '<circle cx="23.2" cy="33" r="1.8" fill="#111"/>' +
            '</svg>';
    }

    function movie(title, query) {
        return { title: title, path: 'discover/movie?' + query };
    }

    function tv(title, query) {
        return { title: title, path: 'discover/tv?' + query };
    }

    function providerMovie(title, provider, extra) {
        return movie(title, 'with_watch_providers=' + provider + '&watch_region={region}&sort_by=popularity.desc' + (extra ? '&' + extra : ''));
    }

    function providerTv(title, provider, extra) {
        return tv(title, 'with_watch_providers=' + provider + '&watch_region={region}&sort_by=popularity.desc' + (extra ? '&' + extra : ''));
    }

    var SERVICES = [
        {
            id: 'netflix', title: 'Netflix', icon: ICONS.netflix, categories: [
                providerMovie('Новые фильмы', 8, 'primary_release_date.lte={date}&sort_by=primary_release_date.desc&vote_count.gte=5'),
                tv('Новые сериалы', 'with_networks=213&first_air_date.lte={date}&sort_by=first_air_date.desc&vote_count.gte=5'),
                tv('В тренде на Netflix', 'with_networks=213&sort_by=popularity.desc'),
                movie('Боевики и блокбастеры', 'with_companies=213&with_genres=28|12&sort_by=popularity.desc'),
                tv('Фантастические миры', 'with_networks=213&with_genres=10765&sort_by=vote_average.desc&vote_count.gte=100'),
                tv('Криминальные сериалы', 'with_networks=213&with_genres=80&sort_by=popularity.desc'),
                tv('Корейские сериалы', 'with_networks=213&with_original_language=ko&sort_by=popularity.desc'),
                tv('Аниме', 'with_networks=213&with_genres=16&sort_by=popularity.desc'),
                movie('Документальные фильмы', 'with_companies=213&with_genres=99&sort_by=release_date.desc'),
                movie('Выбор критиков', 'with_companies=213&vote_average.gte=7.5&vote_count.gte=300&sort_by=vote_average.desc')
            ]
        },
        {
            id: 'apple', title: 'Apple TV+', icon: ICONS.apple, categories: [
                providerMovie('Новые фильмы', 350, 'primary_release_date.lte={date}&sort_by=primary_release_date.desc&vote_count.gte=5'),
                providerTv('Новые сериалы', 350, 'first_air_date.lte={date}&sort_by=first_air_date.desc&vote_count.gte=5'),
                providerTv('Хиты Apple TV+', 350, 'sort_by=popularity.desc'),
                providerMovie('Apple Original Films', 350, 'sort_by=release_date.desc&vote_count.gte=10'),
                providerTv('Фантастика', 350, 'with_genres=10765&sort_by=vote_average.desc&vote_count.gte=100'),
                providerTv('Комедии и хорошее настроение', 350, 'with_genres=35&sort_by=popularity.desc'),
                providerTv('Триллеры и детективы', 350, 'with_genres=9648|80&sort_by=popularity.desc')
            ]
        },
        {
            id: 'max', title: 'HBO / Max', icon: ICONS.max, categories: [
                movie('Новые фильмы WB/HBO', 'with_companies=174|49&primary_release_date.lte={date}&sort_by=primary_release_date.desc&vote_count.gte=10'),
                tv('Новые сериалы HBO/Max', 'with_networks=49|3186&first_air_date.lte={date}&sort_by=first_air_date.desc&vote_count.gte=5'),
                tv('Главные хиты HBO', 'with_networks=49&sort_by=popularity.desc'),
                tv('Оригиналы Max', 'with_networks=3186&sort_by=popularity.desc'),
                movie('Блокбастеры Warner Bros.', 'with_companies=174&sort_by=revenue.desc&vote_count.gte=1000'),
                tv('Золотая коллекция HBO', 'with_networks=49&vote_average.gte=8&vote_count.gte=500&sort_by=vote_average.desc'),
                tv('Фэнтези и фантастика', 'with_networks=49|3186&with_genres=10765&sort_by=popularity.desc'),
                tv('Премиальные драмы', 'with_networks=49&with_genres=18&sort_by=popularity.desc'),
                movie('Вселенная DC', 'with_companies=174&with_keywords=9715&sort_by=release_date.desc')
            ]
        },
        {
            id: 'prime', title: 'Prime Video', icon: ICONS.prime, categories: [
                tv('В тренде на Prime Video', 'with_networks=1024&sort_by=popularity.desc'),
                providerMovie('Новые фильмы', 119, 'primary_release_date.lte={date}&sort_by=primary_release_date.desc&vote_count.gte=5'),
                tv('Новые сериалы', 'with_networks=1024&first_air_date.lte={date}&sort_by=first_air_date.desc&vote_count.gte=5'),
                tv('Боевики и антигерои', 'with_networks=1024&with_genres=10759&sort_by=popularity.desc'),
                movie('Блокбастеры Amazon и MGM', 'with_companies=1024|21&sort_by=revenue.desc'),
                tv('Фантастика и фэнтези', 'with_networks=1024&with_genres=10765&sort_by=popularity.desc'),
                tv('Комедии', 'with_networks=1024&with_genres=35&sort_by=vote_average.desc'),
                tv('Самый высокий рейтинг', 'with_networks=1024&vote_average.gte=8&vote_count.gte=300&sort_by=vote_average.desc')
            ]
        },
        {
            id: 'disney', title: 'Disney+', icon: ICONS.disney, categories: [
                providerMovie('Новые фильмы Disney+', 337, 'primary_release_date.lte={date}&sort_by=primary_release_date.desc&vote_count.gte=5'),
                providerTv('Новые сериалы Disney+', 337, 'first_air_date.lte={date}&sort_by=first_air_date.desc&vote_count.gte=5'),
                movie('Киновселенная Marvel', 'with_companies=420&sort_by=release_date.desc&vote_count.gte=200'),
                tv('Сериалы Marvel', 'with_companies=420&with_networks=2739&sort_by=first_air_date.desc'),
                movie('Звёздные войны', 'with_companies=1&sort_by=release_date.asc'),
                movie('Pixar', 'with_companies=3&sort_by=popularity.desc'),
                movie('Классика Disney', 'with_companies=6125&sort_by=popularity.desc'),
                tv('Хиты FX', 'with_networks=88&sort_by=popularity.desc'),
                tv('Симпсоны и анимация FOX', 'with_networks=19&with_genres=16&sort_by=popularity.desc')
            ]
        },
        {
            id: 'hulu', title: 'Hulu', icon: ICONS.hulu, categories: [
                tv('Оригиналы Hulu: в тренде', 'with_networks=453&sort_by=popularity.desc'),
                tv('Драмы и триллеры', 'with_networks=453&with_genres=18|9648&sort_by=vote_average.desc'),
                tv('Комедии', 'with_networks=453&with_genres=35&sort_by=popularity.desc'),
                tv('Анимация для взрослых', 'with_networks=453&with_genres=16&sort_by=popularity.desc'),
                tv('Мини-сериалы', 'with_networks=453&with_keywords=158718&sort_by=first_air_date.desc')
            ]
        },
        {
            id: 'paramount', title: 'Paramount+', icon: ICONS.paramount, categories: [
                movie('Блокбастеры Paramount', 'with_companies=4&sort_by=revenue.desc'),
                tv('Оригиналы Paramount+', 'with_networks=4330&sort_by=popularity.desc'),
                tv('Вселенная Yellowstone', 'with_networks=318|4330&with_genres=37|18&sort_by=popularity.desc'),
                tv('Звёздный путь', 'with_networks=4330&with_keywords=159223&sort_by=first_air_date.desc'),
                tv('Nickelodeon: детям', 'with_networks=13&sort_by=popularity.desc')
            ]
        },
        {
            id: 'syfy', title: 'Syfy', icon: ICONS.syfy, categories: [
                tv('Популярное на Syfy', 'with_networks=77&sort_by=popularity.desc'),
                tv('Лучшее по оценкам', 'with_networks=77&sort_by=vote_count.desc'),
                tv('Новые сериалы', 'with_networks=77&first_air_date.gte={year}-01-01&sort_by=popularity.desc'),
                tv('Научная фантастика', 'with_networks=77&with_genres=10765&sort_by=popularity.desc'),
                tv('Ужасы и мистика', 'with_networks=77&with_genres=9648&sort_by=popularity.desc')
            ]
        },
        {
            id: 'knowledge', title: 'Познавательные', icon: ICONS.knowledge, categories: [
                tv('Discovery', 'with_networks=64&sort_by=popularity.desc'),
                tv('National Geographic', 'with_networks=43&sort_by=popularity.desc'),
                tv('Animal Planet', 'with_networks=91&sort_by=popularity.desc'),
                tv('BBC: документальные сериалы', 'with_networks=332&with_genres=99&sort_by=popularity.desc'),
                tv('History', 'with_networks=65&sort_by=popularity.desc'),
                tv('Наука и технологии', 'with_genres=99&with_keywords=287501&sort_by=popularity.desc'),
                tv('Путешествия', 'with_genres=99&with_keywords=180547&sort_by=popularity.desc'),
                tv('Выживание', 'with_genres=10764&with_keywords=10349&sort_by=popularity.desc'),
                tv('Кулинария', 'with_genres=10764&with_keywords=18267&sort_by=popularity.desc'),
                movie('Документальные фильмы', 'with_genres=99&sort_by=popularity.desc')
            ]
        }
    ];

    function settingName(id) {
        return PLUGIN + '_show_' + id;
    }

    function getRegion() {
        return Lampa.Storage.get(PLUGIN + '_region', 'UA') || 'UA';
    }

    function enabled(service) {
        return Lampa.Storage.get(settingName(service.id), true) !== false;
    }

    function today() {
        var date = new Date();
        return date.getFullYear() + '-' +
            ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
            ('0' + date.getDate()).slice(-2);
    }

    function prepareValue(value) {
        return String(value)
            .replace(/\{region\}/g, getRegion())
            .replace(/\{year\}/g, String(new Date().getFullYear()))
            .replace(/\{date\}/g, today());
    }

    function parseCategory(category) {
        var parts = category.path.split('?');
        var params = {};

        if (parts[1]) {
            parts[1].split('&').forEach(function (pair) {
                var separator = pair.indexOf('=');
                var key = separator >= 0 ? pair.slice(0, separator) : pair;
                var value = separator >= 0 ? pair.slice(separator + 1) : '';
                if (key) params[decodeURIComponent(key)] = decodeURIComponent(value);
            });
        }

        return { url: parts[0], params: params };
    }

    function tmdbUrl(category, page) {
        var parsed = parseCategory(category);
        var query = [
            'api_key=' + encodeURIComponent(Lampa.TMDB.key()),
            'language=' + encodeURIComponent(Lampa.Storage.get('language', 'ru')),
            'page=' + encodeURIComponent(page || 1)
        ];

        Object.keys(parsed.params).forEach(function (key) {
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(prepareValue(parsed.params[key])));
        });

        return Lampa.TMDB.api(parsed.url + '?' + query.join('&'));
    }

    function serviceById(id) {
        for (var i = 0; i < SERVICES.length; i++) {
            if (SERVICES[i].id === id) return SERVICES[i];
        }
    }

    /** Landing page with several horizontal catalogue rows. */
    function StudiosMain(object) {
        var component = new Lampa.InteractionMain(object);
        var service = serviceById(object.service_id);

        component.create = function () {
            var self = this;
            var categories = service ? service.categories : [];
            var network = new Lampa.Reguest();
            var status = new Lampa.Status(categories.length);

            this.activity.loader(true);

            status.onComplite = function () {
                var rows = [];

                Object.keys(status.data).sort(function (a, b) {
                    return Number(a) - Number(b);
                }).forEach(function (key) {
                    var response = status.data[key];
                    var category = categories[Number(key)];

                    if (!response || !response.results || !response.results.length) return;

                    Lampa.Utils.extendItemsParams(response.results, {
                        style: { name: 'wide' }
                    });

                    rows.push({
                        title: category.title,
                        results: response.results,
                        category_path: category.path
                    });
                });

                self.activity.loader(false);
                if (rows.length) self.build(rows);
                else self.empty();
            };

            categories.forEach(function (category, index) {
                network.silent(tmdbUrl(category, 1), function (response) {
                    status.append(String(index), response);
                }, function () {
                    status.error();
                });
            });

            return this.render();
        };

        component.onMore = function (row) {
            Lampa.Activity.push({
                title: service.title + ' — ' + row.title,
                component: 'rmediahub_studios_view',
                category_path: row.category_path,
                page: 1
            });
        };

        return component;
    }

    /** Full paginated catalogue opened by the "More" button. */
    function StudiosView(object) {
        var component = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();
        var category = { path: object.category_path };

        component.create = function () {
            var self = this;
            network.silent(tmdbUrl(category, 1), function (response) {
                self.build(response);
            }, this.empty.bind(this));
        };

        component.nextPageReuest = function (pageObject, resolve, reject) {
            network.silent(tmdbUrl(category, pageObject.page), resolve, reject);
        };

        return component;
    }

    function openService(service) {
        Lampa.Activity.push({
            title: service.title,
            component: 'rmediahub_studios_main',
            service_id: service.id,
            page: 1
        });
    }

    function makeMenuItem(service) {
        var button = $('<li class="menu__item selector rmediahub-studios-menu" data-rmediahub-service="' + service.id + '">' +
            '<div class="menu__ico">' + service.icon + '</div>' +
            '<div class="menu__text">' + service.title + '</div>' +
            '</li>');

        button.on('hover:enter', function () {
            openService(service);
        });

        return button;
    }

    function refreshMenu() {
        $('.rmediahub-studios-menu').remove();

        var list = $('.menu .menu__list').eq(0);
        if (!list.length) return;

        SERVICES.forEach(function (service) {
            if (enabled(service)) list.append(makeMenuItem(service));
        });
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: PLUGIN,
            name: 'RMEDIAHUB Studios',
            icon: questionIcon()
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN,
            param: { type: 'title' },
            field: { name: 'Каталоги в боковом меню' }
        });

        SERVICES.forEach(function (service) {
            Lampa.SettingsApi.addParam({
                component: PLUGIN,
                param: {
                    name: settingName(service.id),
                    type: 'trigger',
                    default: true
                },
                field: {
                    name: service.title,
                    description: 'Показывать пункт «' + service.title + '» в боковом меню'
                },
                onChange: function () {
                    setTimeout(refreshMenu, 50);
                }
            });
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN,
            param: { type: 'title' },
            field: { name: 'Регион каталогов' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN,
            param: {
                name: PLUGIN + '_region',
                type: 'select',
                values: {
                    UA: 'Украина',
                    US: 'США',
                    GB: 'Великобритания',
                    DE: 'Германия',
                    PL: 'Польша'
                },
                default: 'UA'
            },
            field: {
                name: 'Регион доступности',
                description: 'Влияет на каталоги стримингов, но не предоставляет подписку или просмотр'
            }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN,
            param: { type: 'static' },
            field: {
                name: 'Версия',
                description: VERSION
            }
        });
    }

    function start() {
        Lampa.Manifest.plugins = {
            type: 'other',
            version: VERSION,
            name: 'RMEDIAHUB Studios',
            description: 'Русские подборки стримингов в боковом меню',
            component: PLUGIN
        };

        Lampa.Component.add('rmediahub_studios_main', StudiosMain);
        Lampa.Component.add('rmediahub_studios_view', StudiosView);

        if (!$('#rmediahub-studios-css').length) {
            $('body').append(
                '<style id="rmediahub-studios-css">' +
                '.rmediahub_studios_main .card--wide{width:18.3em!important}' +
                '.rmediahub_studios_view .card--wide{width:18.3em!important}' +
                '.rmediahub_studios_view .category-full{padding-top:1em}' +
                '</style>'
            );
        }

        addSettings();
        refreshMenu();

        // Some Lampa builds redraw the menu after account/profile changes.
        Lampa.Listener.follow('activity', function (event) {
            if (event && (event.type === 'start' || event.type === 'archive')) {
                setTimeout(function () {
                    if (!$('.rmediahub-studios-menu').length) refreshMenu();
                }, 100);
            }
        });
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    }
})();
