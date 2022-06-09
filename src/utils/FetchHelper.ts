import fetch from 'cross-fetch'
import { DownloadResponse } from '../@types'

export async function downloadFileBrowser(url: string): Promise<void> {
  const anchor = document.createElement('a')
  anchor.download = ''
  anchor.href = url
  anchor.click()
}

export async function downloadFile(
  url: string,
  index?: number
): Promise<DownloadResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Response error.')
  }
  let filename: string
  try {
    filename = response.headers
      .get('content-disposition')
      .match(/attachment;filename=(.+)/)[1]
  } catch {
    try {
      filename = url.split('/').pop()
    } catch {
      filename = `file${index}`
    }
  }

  return { data: await response.arrayBuffer(), filename }
}
