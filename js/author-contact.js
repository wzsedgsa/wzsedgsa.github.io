(() => {
  if (window.__authorContactInitialized) return
  window.__authorContactInitialized = true

  const updateAuthorLinks = () => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (mobile) {
      document.querySelectorAll('.card-info-button[data-mobile-link]').forEach(button => {
        button.href = button.dataset.mobileLink
      })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAuthorLinks, { once: true })
  } else {
    updateAuthorLinks()
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.card-info-button[data-message]')
    if (button && !button.disabled) window.alert(button.dataset.message)
  })

  // 点击复制按钮（QQ 临时会话通道已下线，改为复制号码）。
  // document.execCommand('copy') 作为 Clipboard API 的兜底，
  // 因为 http:// 预览、公众号内置浏览器等场景下 navigator.clipboard 常常不可用。
  const legacyCopy = text => {
    const input = document.createElement('textarea')
    input.value = text
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.top = '-9999px'
    document.body.appendChild(input)
    input.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(input)
    return ok
  }

  const flashResult = (button, ok) => {
    const label = button.querySelector('span')
    if (!label) return
    const original = button.dataset.originalText
    button.dataset.originalText = original ?? label.textContent
    label.textContent = ok ? '已复制' : '复制失败'
    window.clearTimeout(Number(button.dataset.copyTimer))
    button.dataset.copyTimer = window.setTimeout(() => {
      label.textContent = button.dataset.originalText
    }, 1600)
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.card-info-button[data-copy]')
    if (!button || button.disabled) return

    const text = button.dataset.copy
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => flashResult(button, true))
        .catch(() => flashResult(button, legacyCopy(text)))
      return
    }
    flashResult(button, legacyCopy(text))
  })

  document.addEventListener('pjax:complete', updateAuthorLinks)
})()
