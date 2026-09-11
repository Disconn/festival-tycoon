const CHECK_INTERVAL_MS = 5 * 60 * 1000
// Guards the visibilitychange listener: some environments (background tab
// throttling, automation tooling) fire that event far more often than an
// actual user switching tabs, so re-checking on every one of them could
// otherwise turn into a rapid poll loop.
const MIN_CHECK_GAP_MS = 60 * 1000

export function mountUpdateNotice(): void {
  const notice = document.createElement('div')
  notice.className = 'update-notice panel'
  notice.hidden = true
  notice.innerHTML = '<span>Eine neue Version ist verfügbar.</span><button type="button" data-reload>🔄 Jetzt aktualisieren</button>'
  document.body.append(notice)
  notice.querySelector('[data-reload]')!.addEventListener('click', () => location.reload())

  let timer: ReturnType<typeof setInterval> | undefined
  let lastCheck = 0
  const checkForUpdate = async (): Promise<void> => {
    lastCheck = Date.now()
    try {
      const response = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as { buildId?: string }
      if (data.buildId && data.buildId !== __BUILD_ID__) {
        notice.hidden = false
        if (timer) clearInterval(timer)
      }
    } catch {
      // Offline or a flaky connection - just retry on the next interval/focus.
    }
  }
  timer = setInterval(checkForUpdate, CHECK_INTERVAL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > MIN_CHECK_GAP_MS) void checkForUpdate()
  })
}
