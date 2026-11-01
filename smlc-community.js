/* ==========================================================================
   File: smlc-community.js  |  v1  |  2026-10-31 11:45 PM ET
   Community Corner: "Where in Clay County?", Town Trivia, Readers' Choice.

   CONTENT comes from the SMLC Google Sheet (synced by Code.gs - no Code.gs
   change needed). Add these tabs; Column A is "Global" or a town name:

   Tab "Where In Clay County"
     Town | Week Of | Photo | Hint | Choice A | Choice B | Choice C | Choice D | Answer | Reveal
     (Answer = A, B, C or D. The newest row whose Week Of has arrived is shown;
      the row before it is revealed with how many people got it right.)

   Tab "Trivia"
     Town | Week Of | Question | Choice A | Choice B | Choice C | Choice D | Answer | Explanation
     (Town pages use their own town's question, or a Global one if they have none.)

   Tab "Readers Choice"
     Town | Year | Category | Nominee | Nominee Town | Opens | Closes
     (One row per nominee. Voting runs from Opens to Closes. Results stay
      hidden until voting closes, then the winners are shown.)

   VOTES are counted in the Realtime Database under /engagement.
   One vote per device (remembered in the browser). No names, no accounts.

   PREVIEW with sample content: add ?community=demo to any page address.
   ========================================================================== */
(function () {
    'use strict';
    if (window.__smlcCommunityLoaded) return;
    window.__smlcCommunityLoaded = true;

    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg",
        authDomain: "smlc-fuel-monitor.firebaseapp.com",
        databaseURL: "https://smlc-fuel-monitor-default-rtdb.firebaseio.com",
        projectId: "smlc-fuel-monitor"
    };
    var CT = 'America/Chicago';
    var DEMO = /[?&]community=demo\b/i.test(location.search);
    var LETTERS = ['A', 'B', 'C', 'D'];

    /* ---------------- helpers ---------------- */
    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function safeImg(u) {
        var s = String(u || '').trim();
        var m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([\w-]+)/);
        if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600';
        return /^https:\/\//i.test(s) ? s : '';
    }
    function keyOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; }
    function list(v) { return !v ? [] : (Array.isArray(v) ? v : Object.keys(v).map(function (k) { return v[k]; })).filter(Boolean); }
    function pick(o) {   // first non-empty of several possible column names
        for (var i = 1; i < arguments.length; i++) { var v = o[arguments[i]]; if (v !== undefined && v !== null && String(v).trim() !== '') return v; }
        return '';
    }
    function toDate(v) {
        if (!v) return null;
        if (v instanceof Date) return v;
        var s = String(v).trim();
        var d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
        return isNaN(d) ? null : d;
    }
    function ctDayKey(d) {   // YYYY-MM-DD in Central time
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: CT, year: 'numeric', month: '2-digit', day: '2-digit' })
            .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
        return p.year + '-' + p.month + '-' + p.day;
    }
    function niceDate(d) { return d ? d.toLocaleDateString('en-US', { timeZone: CT, month: 'long', day: 'numeric' }) : ''; }
    function choicesOf(row) {
        return LETTERS.map(function (L) {
            return { letter: L, text: String(pick(row, 'choice_' + L.toLowerCase(), L.toLowerCase(), 'option_' + L.toLowerCase())).trim() };
        }).filter(function (c) { return c.text; });
    }
    function answerLetter(row) {
        var a = String(pick(row, 'answer', 'correct', 'correct_answer')).trim();
        if (/^[a-d]$/i.test(a)) return a.toUpperCase();
        var hit = choicesOf(row).filter(function (c) { return c.text.toLowerCase() === a.toLowerCase(); })[0];
        return hit ? hit.letter : '';
    }
    /** rows with a date that has arrived, newest first */
    function datedRows(rows, dateField) {
        var now = new Date();
        return rows.map(function (r) { return { row: r, date: toDate(pick(r, dateField, 'week_of', 'week', 'date')) }; })
            .filter(function (x) { return x.date && x.date <= now; })
            .sort(function (a, b) { return b.date - a.date; });
    }

    /* ---------------- per-device memory ---------------- */
    function remembered(key) { try { return localStorage.getItem('smlc-cc:' + key); } catch (e) { return null; } }
    function remember(key, val) { try { localStorage.setItem('smlc-cc:' + key, val); } catch (e) { /* private mode */ } }

    /* ---------------- Firebase ---------------- */
    var db = null;
    function getDb() {
        if (db || DEMO) return db;
        try {
            if (!window.firebase || !firebase.initializeApp) return null;
            var app = (firebase.apps || []).filter(function (a) { return a.name === 'smlcCommunity'; })[0] ||
                      firebase.initializeApp(FIREBASE_CONFIG, 'smlcCommunity');
            db = app.database();
        } catch (e) { console.warn('Community Corner: Firebase not available', e.message); }
        return db;
    }
    var demoCounts = {};
    function addVote(path) {
        if (DEMO) { demoCounts[path] = (demoCounts[path] || 0) + 1; return Promise.resolve(true); }
        var d = getDb();
        if (!d) return Promise.resolve(false);
        return d.ref('engagement/' + path).transaction(function (n) { return (n || 0) + 1; })
            .then(function () { return true; })
            .catch(function (e) { console.warn('Community Corner: vote not saved', e.message); return false; });
    }
    function readCounts(path, cb) {
        if (DEMO) {
            var demo = { A: 14, B: 41, C: 9, D: 6 };
            Object.keys(demoCounts).forEach(function (p) { if (p.indexOf(path + '/') === 0) { var k = p.slice(path.length + 1); demo[k] = (demo[k] || 0) + demoCounts[p]; } });
            cb(demo); return;
        }
        var d = getDb();
        if (!d) { cb({}); return; }
        d.ref('engagement/' + path).once('value').then(function (s) { cb(s.val() || {}); }).catch(function () { cb({}); });
    }
    function pctBars(choices, counts, correct, mine) {
        var total = choices.reduce(function (t, c) { return t + (Number(counts[c.letter]) || 0); }, 0);
        return '<ul class="cc-results">' + choices.map(function (c) {
            var n = Number(counts[c.letter]) || 0;
            var pct = total ? Math.round(n * 100 / total) : 0;
            var cls = (c.letter === correct ? ' is-correct' : '') + (c.letter === mine ? ' is-mine' : '');
            return '<li class="cc-result' + cls + '"><span class="cc-result-label">' + esc(c.text) +
                (c.letter === correct ? ' <span class="cc-tag">Answer</span>' : '') +
                (c.letter === mine ? ' <span class="cc-tag cc-tag-mine">Your pick</span>' : '') +
                '</span><span class="cc-bar"><span style="width:' + pct + '%"></span></span><span class="cc-pct">' + pct + '%</span></li>';
        }).join('') + '</ul><p class="cc-small">' + total + ' ' + (total === 1 ? 'guess' : 'guesses') + ' so far</p>';
    }

    /* ---------------- Where in Clay County? ---------------- */
    function renderWhere(el, rows) {
        var dated = datedRows(rows, 'week_of');
        if (!dated.length) { el.hidden = true; return false; }
        var cur = dated[0], prev = dated[1];
        var week = ctDayKey(cur.date);
        var r = cur.row, choices = choicesOf(r), correct = answerLetter(r);
        var img = safeImg(pick(r, 'photo', 'image', 'image_url', 'photo_url'));
        var path = 'where/' + week;
        var mine = remembered(path);

        var html = '<h3 class="cc-title">📍 Where in Clay County?</h3>' +
            '<p class="cc-sub">Week of ' + esc(niceDate(cur.date)) + ' &mdash; can you name this spot? The answer is revealed next week.</p>' +
            (img ? '<img class="cc-photo" src="' + esc(img) + '" alt="Mystery Clay County location for the week of ' + esc(niceDate(cur.date)) + '" loading="lazy">' : '') +
            (pick(r, 'hint') ? '<p class="cc-hint"><strong>Hint:</strong> ' + esc(pick(r, 'hint')) + '</p>' : '');
        if (mine) {
            var pickText = (choices.filter(function (c) { return c.letter === mine; })[0] || {}).text || '';
            html += '<p class="cc-done">✅ Your guess: <strong>' + esc(pickText) + '</strong>. Check back next week for the answer!</p>';
        } else if (choices.length) {
            html += '<div class="cc-choices" role="group" aria-label="Your guess">' + choices.map(function (c) {
                return '<button type="button" class="cc-choice" data-letter="' + c.letter + '">' + esc(c.text) + '</button>';
            }).join('') + '</div>';
        }
        if (prev) {
            var pr = prev.row, pChoices = choicesOf(pr), pCorrect = answerLetter(pr);
            var pImg = safeImg(pick(pr, 'photo', 'image', 'image_url', 'photo_url'));
            var pAnswer = (pChoices.filter(function (c) { return c.letter === pCorrect; })[0] || {}).text || pick(pr, 'answer');
            html += '<details class="cc-reveal"><summary>Last week\'s answer: <strong>' + esc(pAnswer) + '</strong></summary>' +
                (pImg ? '<img class="cc-photo cc-photo-small" src="' + esc(pImg) + '" alt="' + esc(pAnswer) + '" loading="lazy">' : '') +
                (pick(pr, 'reveal', 'story', 'about') ? '<p>' + esc(pick(pr, 'reveal', 'story', 'about')) + '</p>' : '') +
                '<div class="cc-prev-results" data-path="where/' + ctDayKey(prev.date) + '"></div></details>';
        }
        el.innerHTML = html;
        el.hidden = false;

        el.querySelectorAll('.cc-choice').forEach(function (b) {
            b.addEventListener('click', function () {
                var L = b.getAttribute('data-letter');
                remember(path, L);
                addVote(path + '/' + L);
                trackEvent('where_in_clay_county_guess', { week: week });
                renderWhere(el, rows);
            });
        });
        var pr2 = el.querySelector('.cc-prev-results');
        if (pr2 && prev) {
            readCounts(pr2.getAttribute('data-path'), function (counts) {
                pr2.innerHTML = pctBars(choicesOf(prev.row), counts, answerLetter(prev.row), remembered('where/' + ctDayKey(prev.date)));
            });
        }
        return true;
    }

    /* ---------------- Town Trivia ---------------- */
    function renderTrivia(el, rows, townName) {
        var townKey = keyOf(townName || 'global');
        var forTown = rows.filter(function (r) { return keyOf(pick(r, 'town')) === townKey; });
        var dated = datedRows(forTown.length ? forTown : rows.filter(function (r) { return keyOf(pick(r, 'town') || 'global') === 'global'; }), 'week_of');
        if (!dated.length) dated = datedRows(rows, 'week_of');
        if (!dated.length) { el.hidden = true; return false; }
        var cur = dated[0], r = cur.row;
        var choices = choicesOf(r), correct = answerLetter(r);
        if (!pick(r, 'question') || !choices.length) { el.hidden = true; return false; }
        var qTown = pick(r, 'town') || 'Global';
        var path = 'trivia/' + keyOf(qTown) + '/' + ctDayKey(cur.date);
        var mine = remembered(path);
        var label = keyOf(qTown) === 'global' ? 'Clay County' : qTown;

        var html = '<h3 class="cc-title">🧠 ' + esc(label) + ' Trivia</h3>' +
            '<p class="cc-sub">This week\'s question &mdash; a new one every week.</p>' +
            '<p class="cc-question">' + esc(pick(r, 'question')) + '</p>';
        if (!mine) {
            html += '<div class="cc-choices" role="group" aria-label="Choose an answer">' + choices.map(function (c) {
                return '<button type="button" class="cc-choice" data-letter="' + c.letter + '">' + esc(c.text) + '</button>';
            }).join('') + '</div>';
        } else {
            var right = mine === correct;
            html += '<p class="cc-verdict ' + (right ? 'is-right' : 'is-wrong') + '">' + (right ? '🎉 Correct!' : '❌ Not quite.') + '</p>' +
                (pick(r, 'explanation', 'why', 'answer_details') ? '<p class="cc-explain">' + esc(pick(r, 'explanation', 'why', 'answer_details')) + '</p>' : '') +
                '<div class="cc-trivia-results"></div>';
        }
        el.innerHTML = html;
        el.hidden = false;
        el.querySelectorAll('.cc-choice').forEach(function (b) {
            b.addEventListener('click', function () {
                var L = b.getAttribute('data-letter');
                remember(path, L);
                addVote(path + '/' + L).then(function () { renderTrivia(el, rows, townName); });
                trackEvent('trivia_answer', { town: label, correct: L === correct });
            });
        });
        var res = el.querySelector('.cc-trivia-results');
        if (res) readCounts(path, function (counts) { res.innerHTML = pctBars(choices, counts, correct, mine).replace(/\bguesses\b/, 'answers').replace(/\bguess\b/, 'answer'); });
        return true;
    }

    /* ---------------- Readers' Choice ---------------- */
    function renderReadersChoice(el, rows) {
        if (!rows.length) { el.hidden = true; return false; }
        // Use the newest year that has rows
        var years = rows.map(function (r) { return String(pick(r, 'year') || new Date().getFullYear()).slice(0, 4); });
        var year = years.sort().pop();
        var yrRows = rows.filter(function (r) { return String(pick(r, 'year') || year).slice(0, 4) === year && pick(r, 'category') && pick(r, 'nominee'); });
        if (!yrRows.length) { el.hidden = true; return false; }

        var opens = null, closes = null;
        yrRows.forEach(function (r) {
            var o = toDate(pick(r, 'opens', 'voting_opens', 'start')), c = toDate(pick(r, 'closes', 'voting_closes', 'end'));
            if (o && (!opens || o < opens)) opens = o;
            if (c && (!closes || c > closes)) closes = c;
        });
        var now = new Date();
        var state = opens && now < opens ? 'soon' : (closes && now > closes ? 'closed' : 'open');

        var cats = [], byCat = {};
        yrRows.forEach(function (r) {
            var cat = String(pick(r, 'category')).trim();
            if (!byCat[cat]) { byCat[cat] = []; cats.push(cat); }
            byCat[cat].push({ name: String(pick(r, 'nominee')).trim(), town: String(pick(r, 'nominee_town', 'business_town')).trim() });
        });

        var head = '<h3 class="cc-title">🏆 ' + esc(year) + ' Readers\' Choice Awards</h3>';
        if (state === 'soon') {
            el.innerHTML = head + '<p class="cc-sub">Vote for your favorite Clay County businesses! Voting opens <strong>' + esc(niceDate(opens)) + '</strong>.</p>' +
                '<p class="cc-small">Categories: ' + cats.map(esc).join(' &bull; ') + '</p>';
            el.hidden = false;
            return true;
        }
        var sub = state === 'open'
            ? 'Vote for your favorites &mdash; one vote per category.' + (closes ? ' Voting closes <strong>' + esc(niceDate(closes)) + '</strong>.' : '') + ' Winners are announced when voting ends.'
            : 'Voting is closed. Here are this year\'s winners, chosen by you!';
        var html = head + '<p class="cc-sub">' + sub + '</p><div class="cc-rc-cats">';
        cats.forEach(function (cat) {
            var path = 'readers_choice/' + year + '/' + keyOf(cat);
            var mine = remembered(path);
            html += '<div class="cc-rc-cat" data-path="' + esc(path) + '" data-cat="' + esc(cat) + '"><h4>' + esc(cat) + '</h4>';
            if (state === 'open') {
                if (mine) {
                    var n = (byCat[cat].filter(function (x) { return keyOf(x.name) === mine; })[0] || {}).name || '';
                    html += '<p class="cc-done">✅ You voted for <strong>' + esc(n) + '</strong></p>';
                } else {
                    html += '<div class="cc-choices cc-choices-list">' + byCat[cat].map(function (x) {
                        return '<button type="button" class="cc-choice" data-nominee="' + esc(keyOf(x.name)) + '">' + esc(x.name) +
                            (x.town ? ' <span class="cc-choice-town">' + esc(x.town) + '</span>' : '') + '</button>';
                    }).join('') + '</div>';
                }
            } else {
                html += '<div class="cc-rc-winner">Counting votes&hellip;</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
        el.hidden = false;

        el.querySelectorAll('.cc-rc-cat').forEach(function (box) {
            var path = box.getAttribute('data-path'), cat = box.getAttribute('data-cat');
            box.querySelectorAll('.cc-choice').forEach(function (b) {
                b.addEventListener('click', function () {
                    var nom = b.getAttribute('data-nominee');
                    remember(path, nom);
                    addVote(path + '/' + nom);
                    trackEvent('readers_choice_vote', { category: cat });
                    renderReadersChoice(el, rows);
                });
            });
            var w = box.querySelector('.cc-rc-winner');
            if (w) readCounts(path, function (counts) {
                var noms = byCat[cat].map(function (x) { return { name: x.name, town: x.town, n: Number(counts[keyOf(x.name)]) || 0 }; })
                    .sort(function (a, b) { return b.n - a.n; });
                if (!noms.length || !noms[0].n) { w.textContent = 'No votes recorded.'; return; }
                w.innerHTML = '🥇 <strong>' + esc(noms[0].name) + '</strong>' + (noms[0].town ? ' <span class="cc-choice-town">' + esc(noms[0].town) + '</span>' : '') +
                    (noms[1] && noms[1].n ? '<div class="cc-small">Runner-up: ' + esc(noms[1].name) + '</div>' : '');
            });
        });
        return true;
    }

    /* ---------------- analytics (optional) ---------------- */
    function trackEvent(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* ignore */ } }

    /* ---------------- styles ---------------- */
    function injectStyles() {
        if (document.getElementById('smlc-community-styles')) return;
        var css = '' +
        '#smlc-community-corner{max-width:1200px;margin:32px auto;padding:0 16px;box-sizing:border-box;scroll-margin-top:90px}' +
        '#smlc-community-corner[hidden]{display:none}' +
        '.cc-heading{text-align:center;font:900 clamp(1.4rem,3vw,2rem)/1.1 Georgia,"Times New Roman",serif;text-transform:uppercase;margin:0 0 4px;color:var(--cc-ink,#111)}' +
        '.cc-heading-sub{text-align:center;margin:0 0 18px;color:var(--cc-muted,#555)}' +
        '.cc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px;align-items:start}' +
        '.cc-card{background:var(--cc-card,#fff);color:var(--cc-ink,#111);border:2px solid var(--cc-border,#1b2a3a);border-radius:10px;padding:18px;box-shadow:5px 5px 0 rgba(0,27,55,.18)}' +
        '.cc-card[hidden]{display:none}' +
        '.cc-title{margin:0 0 4px;font:800 1.2rem/1.2 Georgia,"Times New Roman",serif;color:var(--cc-ink,#111)}' +
        '.cc-sub,.cc-small{margin:0 0 10px;color:var(--cc-muted,#555);font-size:.9rem}.cc-small{font-size:.8rem;margin-top:6px}' +
        '.cc-photo{width:100%;max-height:300px;object-fit:cover;border-radius:6px;display:block;margin:6px 0 10px}.cc-photo-small{max-height:180px}' +
        '.cc-hint,.cc-explain{font-size:.92rem;margin:0 0 10px}.cc-question{font-weight:700;font-size:1.05rem;margin:4px 0 12px}' +
        '.cc-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cc-choices-list{grid-template-columns:1fr}' +
        '.cc-choice{font:inherit;font-size:.95rem;text-align:left;padding:10px 12px;border-radius:8px;border:2px solid #001B37;background:#fff;color:#001B37;cursor:pointer;min-height:44px}' +
        '.cc-choice:hover,.cc-choice:focus-visible{background:#001B37;color:#fff;outline:none}' +
        '.cc-choice-town{font-size:.75rem;opacity:.75;margin-left:4px}' +
        '.cc-done{background:#eef6ee;border-radius:8px;padding:10px 12px;margin:6px 0}' +
        '.cc-verdict{font-weight:800;font-size:1.1rem;margin:4px 0 6px}.cc-verdict.is-right{color:#137333}.cc-verdict.is-wrong{color:#b3261e}' +
        '.cc-results{list-style:none;padding:0;margin:8px 0 0}.cc-result{display:grid;grid-template-columns:1fr 90px 40px;gap:8px;align-items:center;font-size:.88rem;margin:5px 0}' +
        '.cc-bar{height:10px;background:#e6e9ee;border-radius:6px;overflow:hidden}.cc-bar span{display:block;height:100%;background:#7b8794}' +
        '.cc-result.is-correct .cc-bar span{background:#1e8e3e}.cc-pct{text-align:right;font-variant-numeric:tabular-nums}' +
        '.cc-tag{display:inline-block;font-size:.68rem;background:#1e8e3e;color:#fff;border-radius:999px;padding:0 6px;margin-left:4px}.cc-tag-mine{background:#001B37}' +
        '.cc-reveal{margin-top:14px;border-top:1px dashed #b9c2cc;padding-top:10px}.cc-reveal summary{cursor:pointer}' +
        '.cc-rc-cats{display:grid;gap:14px}.cc-rc-cat h4{margin:0 0 6px;font-size:1rem}.cc-rc-winner{font-size:1rem}' +
        '.cc-demo-note{text-align:center;background:#fff3cd;color:#5c4400;border-radius:8px;padding:6px 10px;margin:0 auto 14px;max-width:600px;font-size:.85rem}' +
        '@media (max-width:480px){.cc-choices{grid-template-columns:1fr}}' +
        '@media (prefers-color-scheme:dark){#smlc-community-corner{--cc-card:#1d1d20;--cc-ink:#ececf0;--cc-muted:#b5b5bd;--cc-border:#3b4a5c}' +
        '.cc-choice{background:#14141a;color:#e6eefb;border-color:#6d8fb8}.cc-choice:hover,.cc-choice:focus-visible{background:#6d8fb8;color:#000}' +
        '.cc-done{background:#1f3324}.cc-bar{background:#33363d}.cc-tag-mine{background:#6d8fb8;color:#000}}';
        var st = document.createElement('style');
        st.id = 'smlc-community-styles';
        st.textContent = css;
        document.head.appendChild(st);
    }

    /* ---------------- demo content ---------------- */
    function demoData() {
        var today = new Date(), d = function (days) { var x = new Date(today); x.setDate(x.getDate() + days); return x.toISOString(); };
        return {
            where: [
                { town: 'Global', week_of: d(-9), photo: 'https://raw.githubusercontent.com/skventuresigns-design/media/main/claycounty.png', choice_a: 'Clay County Courthouse', choice_b: 'Flora Depot', choice_c: 'Xenia Library', choice_d: 'Clay City Park', answer: 'A', reveal: 'The Clay County Courthouse in Louisville, the county seat.' },
                { town: 'Global', week_of: d(-2), photo: 'https://raw.githubusercontent.com/skventuresigns-design/media/main/smlc-banner.png', hint: 'You might catch a train here... a long time ago.', choice_a: 'Louisville Square', choice_b: 'Flora Depot', choice_c: 'Sailor Springs', choice_d: 'Iola Grain Elevator', answer: 'B' }
            ],
            trivia: [
                { town: 'Global', week_of: d(-1), question: 'Which town is the county seat of Clay County, Illinois?', choice_a: 'Flora', choice_b: 'Louisville', choice_c: 'Clay City', choice_d: 'Xenia', answer: 'B', explanation: 'Louisville has been the county seat; Flora is the largest city.' }
            ],
            rc: ['Best Breakfast', 'Best Mechanic', 'Best Salon'].reduce(function (all, cat, i) {
                return all.concat([['Sample Diner', 'Flora'], ['Sample Cafe', 'Louisville'], ['Sample Spot', 'Clay City']].map(function (n) {
                    return { town: 'Global', year: String(today.getFullYear()), category: cat, nominee: n[0] + ' ' + (i + 1), nominee_town: n[1], opens: d(-5), closes: d(20) };
                }));
            }, [])
        };
    }

    /* ---------------- mount ---------------- */
    function townName() {
        var t = (document.documentElement.getAttribute('data-town') || '').trim();
        if (!t || /^home$/i.test(t)) return '';
        return t.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function mount() {
        var host = document.getElementById('smlc-community-corner');
        if (!host) return;
        injectStyles();
        host.innerHTML = (DEMO ? '<p class="cc-demo-note">Preview with sample content (remove <code>?community=demo</code> from the address to see the real thing).</p>' : '') +
            '<h2 class="cc-heading">Community Corner</h2><p class="cc-heading-sub">A little fun for Clay County &mdash; new every week.</p>' +
            '<div class="cc-grid"><article class="cc-card" id="cc-where" hidden></article><article class="cc-card" id="cc-trivia" hidden></article>' +
            '<article class="cc-card" id="cc-rc" hidden></article></div>';
        host.hidden = true;

        var data = { where: [], triviaGlobal: [], triviaTown: [], rc: [] };
        var town = townName();
        function draw() {
            var a = renderWhere(document.getElementById('cc-where'), data.where);
            var b = renderTrivia(document.getElementById('cc-trivia'), data.triviaTown.concat(data.triviaGlobal), town || 'global');
            var c = renderReadersChoice(document.getElementById('cc-rc'), data.rc);
            host.hidden = !(a || b || c);   // nothing to show yet -> whole corner stays hidden
        }

        if (DEMO) {
            var demo = demoData();
            data.where = demo.where; data.triviaGlobal = demo.trivia; data.rc = demo.rc;
            draw();
            return;
        }
        var d = getDb();
        if (!d) return;
        var g = 'master_county_data/global/sections/';
        d.ref(g + 'where_in_clay_county').on('value', function (s) { data.where = list(s.val()); draw(); });
        d.ref(g + 'trivia').on('value', function (s) { data.triviaGlobal = list(s.val()); draw(); });
        d.ref(g + 'readers_choice').on('value', function (s) { data.rc = list(s.val()); draw(); });
        if (town) {
            d.ref('master_county_data/towns/' + town + '/sections/trivia').on('value', function (s) { data.triviaTown = list(s.val()); draw(); });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
