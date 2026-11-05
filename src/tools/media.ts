import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiUpload } from '../client.js'
import { downloadMedia } from '../media.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Upload a file from a public https link and get back a MessengerFlow media link.

- type 'image' (max 10 MB): use the link in manage_inbox send_message image_urls
- type 'video' (max 50 MB): use it in send_message video_urls, or campaign data video { url, slot }
- type 'voice' (max 5 MB, up to 60 seconds): also returns duration. Use it in send_message voice_url and voice_duration, or campaign data voice_message { url, duration, slot }
- type 'profile_picture' or 'profile_banner' (max 10 MB, needs id = account ID): use the link in manage_accounts update_profile

slot is the zero-based position in the campaign's messages. The link must point straight at the file, without redirects.`

const PROFILE_TYPES = { profile_picture: 'picture', profile_banner: 'banner' } as const

export function registerMediaTools(server: McpServer) {
  server.tool(
    'upload_media',
    DESCRIPTION,
    {
      type: z.enum(['image', 'video', 'voice', 'profile_picture', 'profile_banner']).describe('What the file is for'),
      url: z.string().describe('Public https link to the file'),
      id: z.guid().optional().describe('Account ID, for profile uploads'),
    },
    { title: 'Upload media', openWorldHint: true },
    async ({ type, url, id }) => {
      try {
        if (type === 'image' || type === 'video' || type === 'voice') {
          const path = { image: '/images/upload', video: '/videos/upload', voice: '/voice/upload' }[type]
          return success(await apiUpload(path, await downloadMedia(url)))
        }

        if (!id) return failure('Account ID is required for profile uploads')
        const file = await downloadMedia(url)
        return success(await apiUpload(`/accounts/${id}/profile/upload`, file, { type: PROFILE_TYPES[type] }))
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
