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
 * Downloads a file from a URL, or passes through an already-collected DownloadResponse
 * (returned by P2P transport).
 * @param {string | DownloadResponse} urlOrData - HTTP URL or pre-collected P2P response
 * @param {number} [index] - The file index, used as fallback filename for URL downloads
 * @returns {Promise<DownloadResponse>}
 */
export async function downloadFile(
  urlOrData: string | DownloadResponse,
  index?: number
): Promise<DownloadResponse> {
  if (typeof urlOrData !== 'string') {
    return urlOrData
  }

  const response = await fetch(urlOrData)
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
      filename = urlOrData.split('/').pop()
    } catch {
      filename = `file${index}`
    }
  }

  return { data: await response.arrayBuffer(), filename }
}
