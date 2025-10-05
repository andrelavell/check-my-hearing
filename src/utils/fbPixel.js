// Facebook Pixel utility
export const FB_PIXEL_ID = '1099152278399519'

export const pageview = () => {
  if (window.fbq) {
    window.fbq('track', 'PageView')
  }
}

export const event = (name, options = {}) => {
  if (window.fbq) {
    window.fbq('track', name, options)
  }
}

// Initialize Facebook Pixel
export const initFacebookPixel = () => {
  if (window.fbq) return // Already initialized

  // Facebook Pixel Code
  !(function(f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  window.fbq('init', FB_PIXEL_ID)
  window.fbq('track', 'PageView')
}
