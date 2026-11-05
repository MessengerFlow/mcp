import { lookup as dnsLookup } from 'node:dns'
import { BlockList, isIP } from 'node:net'
import https from 'node:https'
import type { LookupFunction } from 'node:net'

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024

const REQUEST_TIMEOUT_MS = 30_000

const privateAddresses = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  privateAddresses.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) {
  privateAddresses.addSubnet(network, prefix, 'ipv6')
}

export function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return privateAddresses.check(mapped[1], 'ipv4')
  const family = isIP(address)
  if (!family) return true
  return privateAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4')
}

// Checking the address inside lookup means the connection uses exactly the address
// that was checked, so a hostname cannot resolve publicly here and privately later.
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0)
    const list = addresses as unknown as { address: string; family: number }[]
    if (!list.length || list.some(entry => isPrivateAddress(entry.address))) {
      return callback(new Error('That address is not allowed'), '', 0)
    }
    if (options.all) return callback(null, list as never, 0)
    callback(null, list[0].address, list[0].family)
  })
}

export interface RemoteFile {
  data: Buffer
  contentType: string
  filename: string
}

export function parseMediaUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('url must be a valid https link')
  }
  if (url.protocol !== 'https:') throw new Error('url must be a valid https link')
  if (url.username || url.password) throw new Error('url must not contain a username or password')
  if (isIP(url.hostname.replace(/^\[|\]$/g, '')) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error('That address is not allowed')
  }
  return url
}

export function downloadMedia(raw: string, maxBytes = MAX_MEDIA_BYTES): Promise<RemoteFile> {
  const url = parseMediaUrl(raw)

  return new Promise((resolve, reject) => {
    const request = https.get(url, { lookup: publicOnlyLookup, timeout: REQUEST_TIMEOUT_MS }, (response) => {
      const status = response.statusCode ?? 0
      if (status < 200 || status >= 300) {
        response.resume()
        reject(new Error(status >= 300 && status < 400
          ? 'That link redirects. Use the direct link to the file.'
          : `Could not download the file (${status})`))
        return
      }

      const chunks: Buffer[] = []
      let received = 0
      response.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received > maxBytes) {
          request.destroy(new Error(`File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`))
          return
        }
        chunks.push(chunk)
      })
      response.on('end', () => resolve({
        data: Buffer.concat(chunks),
        contentType: (response.headers['content-type'] ?? 'application/octet-stream').split(';')[0].trim(),
        filename: url.pathname.split('/').pop() || 'file',
      }))
      response.on('error', reject)
    })
    request.on('timeout', () => request.destroy(new Error('Timed out downloading the file')))
    request.on('error', reject)
  })
}
