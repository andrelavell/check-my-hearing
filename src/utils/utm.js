// UTM parameter utility
// Captures and preserves UTM parameters from initial page load

let cachedUtmParams = null

/**
 * Captures UTM parameters from the current URL
 * @returns {Object} Object containing all UTM parameters
 */
export const captureUtmParams = () => {
  if (cachedUtmParams) {
    return cachedUtmParams
  }

  const params = new URLSearchParams(window.location.search)
  const utmParams = {}
  
  // Common UTM parameters
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id'
  ]
  
  utmKeys.forEach(key => {
    const value = params.get(key)
    if (value) {
      utmParams[key] = value
    }
  })
  
  // Cache the parameters
  cachedUtmParams = utmParams
  return utmParams
}

/**
 * Appends UTM parameters to a URL
 * @param {string} baseUrl - The base URL to append parameters to
 * @param {Object} utmParams - UTM parameters object (optional, will use cached if not provided)
 * @returns {string} URL with UTM parameters appended
 */
export const appendUtmParams = (baseUrl, utmParams = null) => {
  const params = utmParams || cachedUtmParams || captureUtmParams()
  
  // If no UTM params, return original URL
  if (Object.keys(params).length === 0) {
    return baseUrl
  }
  
  const url = new URL(baseUrl)
  
  // Append each UTM parameter
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  
  return url.toString()
}

/**
 * Gets the cached UTM parameters
 * @returns {Object} Cached UTM parameters
 */
export const getUtmParams = () => {
  return cachedUtmParams || captureUtmParams()
}
