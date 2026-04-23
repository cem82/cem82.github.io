(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  };
  const escapeHTML = (s = '') =>
    String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  function renderHero() {
    const name = CONFIG.name || '—';
    const match = name.match(/^(.+?)([IVX]+|\d+)$/);
    const nameEl = $('#hero-name');
    if (match) {
      const main = document.createElement('span');
      main.textContent = match[1];
      const accent = document.createElement('span');
      accent.className = 'accent';
      accent.textContent = match[2];
      nameEl.append(main, accent);
    } else {
      nameEl.textContent = name;
    }

    $('#hero-role').textContent         = CONFIG.role || '';
    $('#hero-role-detail').textContent  = CONFIG.role || '—';
    $('#hero-stack').textContent        = CONFIG.stack || '—';

    document.title = `${name} — ${CONFIG.role || 'portfolio'}`;
  }

  function startClock() {
    const clock = $('#clock');
    if (!clock) return;
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      clock.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- About ---------- */
  function renderAbout() {
    const host = $('#about-content');
    const paragraphs = Array.isArray(CONFIG.about) ? CONFIG.about : [String(CONFIG.about || '')];
    host.innerHTML = '';
    paragraphs.forEach(text => {
      if (!text) return;
      const p = document.createElement('p');
      p.textContent = text;
      host.appendChild(p);
    });
  }

  function statusLabel(status) {
    return {
      live:       'live',
      in_dev:     'in development',
      prototype:  'prototype',
      archived:   'archived'
    }[status] || (status || 'unknown');
  }

  function renderCards(items, hostId, countId, emptyLabel) {
    const host  = $(`#${hostId}`);
    const count = countId ? $(`#${countId}`) : null;
    host.innerHTML = '';

    if (count) count.textContent = `[ ${String(items.length).padStart(2, '0')} ]`;

    if (!items || items.length === 0) {
      const card = el('div', 'card empty');
      const txt  = el('div', 'empty-text', emptyLabel || '// nothing here yet');
      card.appendChild(txt);
      host.appendChild(card);
      return;
    }

    items.forEach((item, i) => {
      const card = el('div', 'card');
      card.dataset.link = item.link || '';
      if (item.link) {
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => window.open(item.link, '_blank', 'noopener'));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(item.link, '_blank', 'noopener');
          }
        });
      }

      const head  = el('div', 'card-head');
      const idx   = el('span', 'card-index', `REF/${String(i + 1).padStart(3, '0')}`);
      const tagValues = Array.isArray(item.tags) ? item.tags
                      : item.tag                 ? [item.tag]
                      : ['—'];
      const tagsWrap = el('div', 'card-tags');
      tagValues.forEach(t => tagsWrap.appendChild(el('span', 'card-tag', t)));
      head.append(idx, tagsWrap);

      const title = el('h3', 'card-title', item.title || 'untitled');

      const desc  = el('p', 'card-desc', item.description || '');

      const foot  = el('div', 'card-foot');
      const stat  = el('span', 'card-status', statusLabel(item.status));
      stat.dataset.status = item.status || 'in_dev';

      foot.appendChild(stat);
      if (item.link) {
        const link = el('span', 'card-link', 'open');
        foot.appendChild(link);
      } else {
        const link = el('span', 'card-link', 'soon');
        link.style.opacity = '0.4';
        foot.appendChild(link);
      }

      card.append(head, title, desc, foot);
      host.appendChild(card);
    });
  }

  async function renderRepos() {
    const host     = $('#repos-grid');
    const linkEl   = $('#gh-link');
    const username = CONFIG.github?.username;
    const max      = CONFIG.github?.maxRepos || 6;
    const noFork   = CONFIG.github?.excludeForks !== false;

    if (!username) {
      host.innerHTML = '<div class="repos-error">// no github username set</div>';
      return;
    }

    linkEl.href        = `https://github.com/${username}`;
    linkEl.textContent = `@${username}`;

    host.innerHTML = '<div class="repos-loading">fetching repos</div>';

    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`
      );
      if (!res.ok) throw new Error(`status ${res.status}`);

      let repos = await res.json();
      if (noFork) repos = repos.filter(r => !r.fork);
      repos.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      repos = repos.slice(0, max);

      host.innerHTML = '';

      if (repos.length === 0) {
        host.innerHTML = '<div class="repos-error">// no public repos found</div>';
        return;
      }

      repos.forEach(repo => {
        const card = el('div', 'repo');
        card.addEventListener('click', () => window.open(repo.html_url, '_blank', 'noopener'));

        const name = el('div', 'repo-name', repo.name);
        const desc = el('p', 'repo-desc', repo.description || '// no description');
        const foot = el('div', 'repo-foot');

        const lang = el('span', 'repo-lang', repo.language || 'none');
        const meta = el('span', 'repo-stars', `★ ${repo.stargazers_count || 0}`);

        foot.append(lang, meta);
        card.append(name, desc, foot);
        host.appendChild(card);
      });
    } catch (err) {
      host.innerHTML = `
        <div class="repos-error">
          // couldn't reach github api — <a href="https://github.com/${encodeURIComponent(username)}" target="_blank" rel="noopener" style="border-bottom:1px solid var(--line-strong);color:var(--fg-muted)">visit @${escapeHTML(username)} directly</a>
        </div>`;
    }
  }

  function renderContact() {
    const host  = $('#contact-content');
    const links = Array.isArray(CONFIG.links) ? CONFIG.links : [];
    host.innerHTML = '';

    if (links.length === 0) {
      host.innerHTML = '<div class="repos-error">// no contacts configured</div>';
      return;
    }

    links.forEach((link, i) => {
      const row = document.createElement('a');
      row.className = 'contact-row';
      row.href = link.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      if (i === 0) row.dataset.primary = 'true';

      const label  = el('span', 'contact-label', link.label || '—');
      const handle = el('span', 'contact-handle', link.handle || link.url || '—');
      const arrow  = el('span', 'contact-arrow', '↗');

      row.append(label, handle, arrow);
      host.appendChild(row);
    });
  }

  function renderFooter() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function initReveal() {
    const targets = $$('.section, .hero-details, .card, .repo, .contact-row');
    targets.forEach(t => t.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(t => io.observe(t));
  }

  function init() {
    if (typeof CONFIG === 'undefined') {
      console.error('CONFIG is missing — make sure config.js is loaded before main.js');
      return;
    }
    renderHero();
    startClock();
    renderAbout();
    renderCards(CONFIG.games    || [], 'games-grid',    'games-count',    '// no games yet — add some in config.js');
    renderCards(CONFIG.projects || [], 'projects-grid', 'projects-count', '// no projects yet — add some in config.js');
    renderRepos();
    renderContact();
    renderFooter();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
