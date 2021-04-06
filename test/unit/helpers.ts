import { DDO } from '../../src'

const responsify = async (data) => ({
  ok: true,
  json: () => Promise.resolve(data)
})

const getSearchResults = (
  results: DDO[],
  page = 0,
  total_pages = 1,
  total_results = 1
): any => ({
  results,
  page,
  total_pages,
  total_results
})

export { responsify, getSearchResults }
