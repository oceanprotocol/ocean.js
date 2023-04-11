const PREDEFINED_ERRORS = {
  datasets: {
    invalid: 'Datasets is not a list, as expected'
  },
  algorithm: {
    missing_meta_documentId: 'Either algorithm metadata, or algorithm DID are missing.',
    did_not_found: 'Either algorithm metadata, or algorithm DID are missing.',
    not_algo: 'Either algorithm metadata, or algorithm DID are missing.',
    in_use_or_not_on_chain: 'Either algorithm metadata, or algorithm DID are missing.',
    meta_oneof_url_rawcode_remote:
      'Either algorithm metadata, or algorithm DID are missing.'
  },
  error: {
    not_trusted_algo_publisher:
      "The owner of the algorithm's DDO is not a trusted algorithms publishers list.",
    not_trusted_algo:
      "The algorithm's DID is not in the asset's trusted algorithms dictionary. ",
    no_publisherTrustedAlgorithms:
      "The algorithm's key publisherTrustedAlgorithms does not exist in the algorithm's DDO.",
    algorithm_file_checksum_mismatch:
      "filesChecksum from the algorithm's DDO is invalid.",
    algorithm_container_checksum_mismatch:
      "The containerChecksum from the algorithm's DDO is invalid.",
    no_raw_algo_allowed: 'The asset does not allow raw algorithms to be run on it.',
    'Asset malformed':
      'The asset published on chain is malformed, missing some required keys or not compliant with our schemas.',
    'Asset is not consumable.':
      'Assets metadata status is not in the range of valid status codes for assets. The recognized states for the metadata are defined on our docs.',
    'DID is not a valid algorithm.':
      'Either the algorithm assets DID is incorrectly typed, either the algorithm timeout expired.',
    'Compute environment does not exist.':
      'The compute environment provided by the user does not exist, it is not served by our compute-to-data feature. The user can use get_c2d_environments to check the list of available compute environments.',
    'The validUntil value is not correct.': 'validUntil value is most probably expired.'
  },
  order: {
    fees_not_paid: ' Provider fees are not paid.'
  }
}

export function getErrorMessage(error: Object): string {
  console.log('lib error', error)
  const key = Object.keys(error)[0]
  console.log('lib error key', key)
  if (key === 'error') {
    const message = error[key]
    console.log('lib error message', message)
    const errorMessage =
      PREDEFINED_ERRORS[key][message] || `Provider request failed: ${message}`
    return errorMessage
  } else {
    const errorObject = error[key]
    console.log('lib error message', errorObject)
    const messagekey = Object.keys(error)[1]
    console.log('lib error message', messagekey)
    const errorMessage = error[messagekey]
    return `${errorMessage} : ${errorObject}`
  }
}
