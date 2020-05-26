enum ValueType {
    DID, // DID string e.g. 'did:op:xxx'
    DIDRef, // hash of DID same as in parameter (bytes32 _did) in text 0x0123abc.. or 0123abc..
    URL, // URL string e.g. 'http(s)://xx'
    DDO // DDO string in JSON e.g. '{ "id": "did:op:xxx"...
}

export default ValueType
