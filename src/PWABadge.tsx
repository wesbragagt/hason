import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

function PWABadge() {
  // check for updates every hour
  const period = 60 * 60 * 1000

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return
      if (r?.active?.state === 'activated') {
        registerPeriodicSync(period, swUrl, r)
      }
      else if (r?.installing) {
        r.installing.addEventListener('statechange', (e) => {
          const sw = e.target as ServiceWorker
          if (sw.state === 'activated')
            registerPeriodicSync(period, swUrl, r)
        })
      }
    },
  })

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className="fixed bottom-4 left-4 z-50" role="alert" aria-labelledby="toast-message">
      { (offlineReady || needRefresh)
      && (
        <div className="bg-card border border-border text-card-foreground p-4 rounded-xl shadow-lg backdrop-blur-sm max-w-sm">
          <div className="mb-3">
            { offlineReady
              ? <span id="toast-message" className="text-sm">App ready to work offline</span>
              : <span id="toast-message" className="text-sm">New content available, click on reload button to update.</span>}
          </div>
          <div className="flex gap-2">
            { needRefresh && 
              <Button 
                size="sm" 
                onClick={() => updateServiceWorker(true)}
                className="bg-primary hover:bg-primary/90"
              >
                Reload
              </Button> 
            }
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => close()}
              className="border-border hover:bg-accent"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PWABadge

/**
 * This function will register a periodic sync check every hour, you can modify the interval as needed.
 */
function registerPeriodicSync(period: number, swUrl: string, r: ServiceWorkerRegistration) {
  if (period <= 0) return

  setInterval(async () => {
    if ('onLine' in navigator && !navigator.onLine)
      return

    const resp = await fetch(swUrl, {
      cache: 'no-store',
      headers: {
        'cache': 'no-store',
        'cache-control': 'no-cache',
      },
    })

    if (resp?.status === 200)
      await r.update()
  }, period)
}
