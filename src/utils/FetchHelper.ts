import fetch from 'cross-fetch'
import { DownloadResponse } from '../@types'

export async function downloadFileBrowser(url: string): Promise<void> {
  const headResponse = await fetch(url, { method: 'HEAD' })
  const contentHeader = headResponse.headers.get('content-disposition')
  const fileName = contentHeader.split('=')[1]
  const xhr = new XMLHttpRequest()
  xhr.responseType = 'blob'
  xhr.open('GET', url)
  xhr.onload = () => {
    const blobURL = window.URL.createObjectURL(xhr.response)
    const a = document.createElement('a')
    a.href = blobURL
    a.setAttribute('download', fileName)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(blobURL)
  }
  xhr.send(null)
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
