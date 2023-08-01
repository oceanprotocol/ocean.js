import fetch from 'cross-fetch'
import { DownloadResponse } from '../@types'

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
