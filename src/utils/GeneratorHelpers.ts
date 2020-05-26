import { v4 } from 'uuid'

export function generateId(length = 64) {
    let id = ''
    while (id.length < length) {
        id += v4().replace(/-/g, '')
    }
    return id.substr(0, length)
}
