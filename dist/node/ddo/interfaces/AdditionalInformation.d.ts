export interface AdditionalInformation {
    description?: string;
    copyrightHolder?: string;
    workExample?: string;
    links?: {
        [name: string]: string;
    }[];
    inLanguage?: string;
    categories?: string[];
    tags?: string[];
    updateFrequency?: string;
    structuredMarkup?: {
        uri: string;
        mediaType: string;
    }[];
}
