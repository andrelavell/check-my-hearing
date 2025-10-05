// Netlify Function: klaviyo-subscribe
// Subscribes an email to a Klaviyo list using the PRIVATE API key (server-side only)

const ALLOWED_ORIGIN = '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { email, utm } = JSON.parse(event.body || '{}')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid email' }) }
    }

    const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY
    const KLAVIYO_LIST_ID = process.env.KLAVIYO_LIST_ID

    if (!KLAVIYO_PRIVATE_KEY || !KLAVIYO_LIST_ID) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server not configured' }) }
    }

    // Use new Klaviyo API: profile-subscription-bulk-create-jobs
    const url = 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/'
    const headers = {
      'Authorization': `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'revision': '2023-10-15',
    }

    const payload = {
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email,
                  properties: { ...(utm || {}) },
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: 'SUBSCRIBED',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: {
              type: 'list',
              id: KLAVIYO_LIST_ID,
            },
          },
        },
      },
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Klaviyo subscribe failed', status: resp.status, response: text }),
      }
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) }
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Unexpected server error', details: String(err) }) }
  }
}
