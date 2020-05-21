import { ApiMetadata } from './ApiMetadata';

export interface EndpointGroups {
	[groupName: string]: ApiMetadata[];
}
