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

  document.addEventListener('pjax:complete', updateAuthorLinks)
})()
