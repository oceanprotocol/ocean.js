import fetch from 'node-fetch'
import { DownloadResponse } from '../@types/index.js'

/**
 * Triggers  a file download from the specified URL when called from a browser context.
 * @param {string} url - The URL of the file to download
 * @returns {Promise<void>} - A Promise that resolves when the file has been downloaded
 */
export function downloadFileBrowser(url: string): void {
  const xhr = new XMLHttpRequest()
  xhr.responseType = 'blob'
  xhr.open('GET', url)
  xhr.onload = () => {
    const contentDispositionHeader = xhr.getResponseHeader('content-disposition')
    const fileNameMatch = contentDispositionHeader?.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    )
    const fileName = fileNameMatch && fileNameMatch[1] ? fileNameMatch[1] : 'file'

    const blobURL = window.URL.createObjectURL(xhr.response)
    const a = document.createElement('a')
    a.href = blobURL
    a.setAttribute('download', fileName)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(blobURL)
  }
  xhr.send()
}

/**
 * Triggers  a file download from the specified URL when called from a browser context.
 * @param {string} url - The URL of the file to download
 * @param {number} [index] - The file index
 * @returns {Promise<void>} - A Promise that resolves when the file has been downloaded
 */
export async function downloadFile(
  url: string,
  index?: number
): Promise<DownloadResponse> {
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
    },
  })

  if (!response.ok) {
    throw new Error('Response error: ' + response.status)
  }

  let filename: string
  try {
    const contentDisposition = response.headers.get('content-disposition')
    filename = contentDisposition
      ? contentDisposition.match(/attachment;filename=(.+)/)[1]
      : url.split('/').pop() || `file${index}`
  } catch {
    filename = url.split('/').pop() || `file${index}`
  }

  const data = await response.arrayBuffer()
  return { data, filename }
}
