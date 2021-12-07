import { MetadataAlgorithm } from './MetadataAlgorithm';
import { File } from './File';
export interface MetadataMain {
    name: string;
    type: 'dataset' | 'algorithm';
    dateCreated: string;
    datePublished?: string;
    author: string;
    license: string;
    files: File[];
    algorithm?: MetadataAlgorithm;
}
