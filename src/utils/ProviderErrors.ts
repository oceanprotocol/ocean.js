import { LoggerInstance } from './Logger'

const PREDEFINED_ERRORS = {
  datasets: {
    invalid: 'Datasets is not a list, as expected'
  },
  algorithm: {
    serviceId: {
      missing: 'The serviceId key is missing from the algorithm s DDO.',
      not_found: 'The provided serviceId does not exist.',
      service_not_access_compute: 'Service type is neither access, nor compute.',
      main_service_compute:
        'If the main service is not compute for this asset when calling initialize endpoint.',
      compute_services_not_in_same_provider:
        'Files attached to the compute service are not decrypted by the correct provider. This occurs when both asset and algorithm are requested by their compute service which cannot be decrypted by a single provider as how it is supposed to be.'
    },
    container: {
      checksum_prefix: 'Container checksum does not start with the prefix sha256:.',
      mising_entrypoint_image_checksum:
        'Either entrypoint, either image, or either checksum are missing from the container dictionary from the algorithm s DDO.'
    },
    documentId: {
      did_not_found:
        'The algorithm s DID could not be retrieved from the metadata store, because the algorithm asset does not exist.',
      missing: 'The documentId key is missing from the algorithm s DDO.'
    },
    transferTxId: {
      missing: 'The transferTxId key is missing from the algorithm s DDO.'
    },
    missing_meta_documentId: 'Either algorithm metadata, or algorithm DID are missing.',
    did_not_found: 'Either algorithm metadata, or algorithm DID are missing.',
    not_algo: 'Either algorithm metadata, or algorithm DID are missing.',
    in_use_or_not_on_chain: 'Either algorithm metadata, or algorithm DID are missing.',
    meta_oneof_url_rawcode_remote:
      'Either algorithm metadata, or algorithm DID are missing.',
    file_unavailable:
      'One possibility is that the asset could not be retrieved from Aquariuss database. Otherwise, there are issues related to services'
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
    'The validUntil value is not correct.': 'validUntil value is most probably expired.',
    'Cannot resolve DID': 'The dataset DID does not exist in the Metadata store.',
    'Invalid serviceId': 'The serviceId of that dataset is not correct.',
    'Unable to get dataset files':
      'The files of that dataset could not be decrypted or retrieved',
    'cannot decrypt files for this service.':
      'The files of that dataset could not be decrypted due to the fact that file object, which contains the structure and the type of specific file, is missing from the validation part.',
    'Unsupported type ': 'The file object type is not supported by Provider.',
    'malformed file object':
      'The file object structure is invalid and does not contain the wanted information for the specific file.'
  },
  order: {
    fees_not_paid: ' Provider fees are not paid.'
  },
  output: {
    invalid:
      'The algorithms validation after the build stage has not been decoded properly as a dictionary.'
  }
}

export function getErrorMessage(err: string): string {
  try {
    const error = JSON.parse(err)
    const key = Object.keys(error)[0]
    if (key === 'error') {
      const message = error[key]
      const errorMessage =
        PREDEFINED_ERRORS[key][message] || `Provider request failed: ${message}`
      return errorMessage
    } else {
      const errorObject = error[key]
      const messagekey = Object.keys(error)[1]
      const errorMessage = error[messagekey]
      return `${errorMessage} : ${errorObject}`
    }
  } catch (e) {
    LoggerInstance.error('[getErrorMessage] error: ', e)
    return err
  }
}
