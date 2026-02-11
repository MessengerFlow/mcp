export const config = {
  apiKey: process.env.MESSENGERFLOW_API_KEY || '',
  baseUrl: process.env.MESSENGERFLOW_BASE_URL || 'https://app.messengerflow.com/api/v1',
}

export function validateConfig() {
  if (!config.apiKey) {
    console.error('MESSENGERFLOW_API_KEY environment variable is required')
    process.exit(1)
  }
  if (!config.apiKey.startsWith('mf_')) {
    console.error('MESSENGERFLOW_API_KEY must start with "mf_"')
    process.exit(1)
  }
}
