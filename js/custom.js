/* Reader enhancements; all article content remains usable without this file. */
(() => {
  'use strict';

  const scripts = new Map();
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (scripts.has(src)) return scripts.get(src);
    const task = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => finish(new Error('script-timeout')), 12000);
      function finish(error) {
        window.clearTimeout(timeout);
        script.onload = script.onerror = null;
        if (error || !window[globalName]) {
          script.remove();
          scripts.delete(src);
          reject(error || new Error('script-unavailable'));
        } else resolve(window[globalName]);
      }
      script.async = true;
      script.src = src;
      script.onload = () => finish();
      script.onerror = () => finish(new Error('script-unavailable'));
      document.head.appendChild(script);
    });
    scripts.set(src, task);
    return task;
  }

  function withTimeout(promise, milliseconds) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('service-timeout')), milliseconds);
      Promise.resolve(promise).then(value => {
        window.clearTimeout(timeout);
        resolve(value);
      }, error => {
        window.clearTimeout(timeout);
        reject(error);
      });
    });
  }

  function lazyComments() {
    const element = document.getElementById('vcomment');
    const data = document.getElementById('blog-comment-config');
    if (!element || !data) return;
    let settings;
    try { settings = JSON.parse(data.textContent); } catch (_) { return; }

    const status = document.createElement('div');
    status.className = 'blog-comment-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const message = document.createElement('span');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新连接';
    retry.hidden = true;
    status.append(message, retry);
    element.before(status);
    const privacy = document.createElement('p');
    privacy.className = 'blog-comment-privacy';
    privacy.textContent = '评论由 Valine / LeanCloud 提供；提交时填写的资料会交给评论服务处理。';
    element.after(privacy);
    element.hidden = true;
    message.textContent = '滚动到这里时连接评论服务。';
    let busy = false;

    async function connect() {
      if (busy) return;
      busy = true;
      retry.hidden = true;
      status.dataset.state = 'loading';
      message.textContent = '正在连接评论服务…';
      try {
        const AV = await loadScript('/vendor/leancloud/av-min.js?v=3.15.0', 'AV');
        const init = { appId: settings.appId, appKey: settings.appKey };
        if (settings.serverURLs) init.serverURLs = settings.serverURLs;
        if (!AV.applicationId) AV.init(init);
        // Valine stores decodeURI(pathname) as the Comment.url key.
        // A successful backend read, rather than the rendered editor, proves connectivity.
        const query = new AV.Query((settings.option && settings.option.clazzName) || 'Comment');
        query.equalTo('url', decodeURI(window.location.pathname));
        query.limit(1);
        await withTimeout(query.find(), 12000);
        const Valine = await loadScript(settings.script, 'Valine');
        if (!element.firstElementChild) {
          new Valine({
            ...settings,
            ...(settings.option || {}),
            el: '#vcomment',
            appId: settings.appId,
            appKey: settings.appKey,
            // Never replace this with title/canonical: that would orphan old comments.
            path: window.location.pathname,
            visitor: false,
            recordIP: false
          });
        }
        element.hidden = false;
        status.dataset.state = 'ready';
        message.textContent = '已连接评论服务。提交结果以评论区提示为准。';
      } catch (_) {
        status.dataset.state = 'error';
        message.textContent = '评论服务正在检修，暂时无法连接。你可以重新连接，或通过关于页联系作者。正文与 RSS 阅读不受影响。';
        retry.hidden = false;
      } finally {
        busy = false;
      }
    }
    retry.addEventListener('click', connect);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          connect();
        }
      }, { rootMargin: '100px' });
      observer.observe(status);
    } else connect();
  }

  function accessibleControls() {
    const main = document.getElementById('content-inner');
    if (main) {
      main.tabIndex = -1;
      const skip = document.createElement('a');
      skip.className = 'skip-to-content';
      skip.href = '#content-inner';
      skip.textContent = '跳到正文';
      document.body.prepend(skip);
    }
    const labels = {
      'toggle-menu': '打开导航菜单',
      'darkmode': '切换深色与浅色模式',
      'readmode': '切换阅读模式',
      'hide-aside-btn': '显示或隐藏侧栏',
      'go-up': '回到页首',
      'mobile-toc-button': '显示文章目录',
      'rightside-config': '更多阅读设置'
    };
    Object.entries(labels).forEach(([id, label]) => {
      const control = document.getElementById(id);
      if (control) control.setAttribute('aria-label', label);
    });
    document.querySelectorAll('#search-button .site-page, #toggle-menu .site-page, .site-page.group').forEach(control => {
      control.tabIndex = 0;
      control.setAttribute('role', 'button');
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          control.click();
        }
      });
    });
    document.querySelectorAll('#nav .site-page.group').forEach(control => {
      control.setAttribute('aria-expanded', 'false');
      control.addEventListener('click', () => {
        const expanded = control.closest('.menus_item').classList.toggle('is-open');
        control.setAttribute('aria-expanded', String(expanded));
      });
      control.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          control.closest('.menus_item').classList.remove('is-open');
          control.setAttribute('aria-expanded', 'false');
          control.blur();
        }
      });
    });
    const search = document.querySelector('#local-search .search-dialog');
    const closeSearch = document.querySelector('#local-search .search-close-button');
    const searchTrigger = document.querySelector('#search-button .site-page');
    if (search) {
      search.setAttribute('role', 'dialog');
      search.setAttribute('aria-modal', 'true');
      search.setAttribute('aria-label', '搜索本站文章');
      const searchInput = document.querySelector('#local-search .local-search-input input, #local-search-input input');
      if (searchInput) searchInput.setAttribute('aria-label', '搜索文章标题与正文');
      closeSearch.setAttribute('aria-label', '关闭搜索');
      document.getElementById('local-search-results').setAttribute('aria-live', 'polite');
      closeSearch.addEventListener('click', () => searchTrigger && searchTrigger.focus());
    }
    const drawer = document.getElementById('sidebar-menus');
    const menuTrigger = document.querySelector('#toggle-menu .site-page');
    const menuMask = document.getElementById('menu-mask');
    if (drawer && menuTrigger) {
      drawer.setAttribute('aria-label', '站点导航');
      drawer.setAttribute('role', 'navigation');
      menuTrigger.setAttribute('aria-controls', 'sidebar-menus');
      menuTrigger.setAttribute('aria-expanded', 'false');
      const setState = () => {
        const open = drawer.classList.contains('open');
        menuTrigger.setAttribute('aria-expanded', String(open));
        drawer.inert = !open;
        if (open) {
          const first = drawer.querySelector('a');
          if (first) first.focus();
        }
      };
      new MutationObserver(setState).observe(drawer, { attributes: true, attributeFilter: ['class'] });
      setState();
    }
    document.addEventListener('keydown', event => {
      const searchOpen = search && getComputedStyle(search).display !== 'none';
      const drawerOpen = drawer && drawer.classList.contains('open');
      const activeDialog = searchOpen ? search : (drawerOpen ? drawer : null);
      if (!activeDialog) return;
      if (event.key === 'Escape') {
        if (searchOpen && searchTrigger) window.setTimeout(() => searchTrigger.focus(), 0);
        else if (drawerOpen && menuMask) { menuMask.click(); menuTrigger.focus(); }
      }
      if (event.key !== 'Tab') return;
      const controls = [...activeDialog.querySelectorAll('a, button, input, [tabindex="0"]')].filter(control => control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    // The original menu remains fully usable when this enhancement is unavailable.
  }

  function copyArticleLink() {
    const article = document.getElementById('post');
    if (!article) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blog-copy-link';
    button.textContent = '复制文章链接';
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      // Share the directory route used by existing article links and comments.
      // Hexo's SEO canonical may include index.html, which is a different Valine key.
      const url = (document.querySelector('link[rel="canonical"]')?.href || window.location.href.split('#')[0])
        .replace(/\/index\.html(?=$|[?#])/, '/');
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
        else {
          const field = document.createElement('textarea');
          field.value = url;
          field.setAttribute('readonly', '');
          field.style.cssText = 'position:fixed;left:-9999px;';
          document.body.appendChild(field);
          field.select();
          const copied = document.execCommand('copy');
          field.remove();
          button.focus();
          if (!copied) throw new Error('clipboard-unavailable');
        }
        button.textContent = '链接已复制';
      } catch (_) { button.textContent = '暂时无法复制，请复制地址栏链接'; }
      window.setTimeout(() => { button.textContent = '复制文章链接'; }, 3500);
    });
    const anchor = article.querySelector('.tag_share') || article.querySelector('.post-copyright');
    if (anchor) anchor.before(button);
  }

  function deferredAnalytics() {
    const id = document.querySelector('meta[name="blog-baidu-analytics"]')?.content;
    if (!/^[a-f0-9]{32}$/i.test(id || '') || navigator.doNotTrack === '1') return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      window._hmt = window._hmt || [];
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://hm.baidu.com/hm.js?${id}`;
      document.head.appendChild(script);
    };
    const idle = () => 'requestIdleCallback' in window
      ? window.requestIdleCallback(start, { timeout: 3000 }) : window.setTimeout(start, 1200);
    ['pointerdown', 'keydown', 'scroll'].forEach(name => window.addEventListener(name, idle, { once: true, passive: true }));
    window.setTimeout(idle, 6000);
  }

  function init() {
    accessibleControls();
    copyArticleLink();
    lazyComments();
    deferredAnalytics();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
