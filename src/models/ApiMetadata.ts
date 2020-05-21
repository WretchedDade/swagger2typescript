import { Parameter } from '.';

export interface ApiMetadata {
	endpoint: string;

	method: 'get' | 'post' | 'put' | 'delete' | 'patch';

	tags?: string[];
	summary?: string;
	description?: string;
	operationId?: string;
	deprecated?: boolean;
	responseBodyType: string;

	parameters: Parameter[];
	request: string;

	// consumes?: MimeTypes;
	// produces?: MimeTypes;
	// parameters?: Parameters;
	// responses: ResponsesObject;
	// schemes?: string[];
	// security?: SecurityRequirementObject[];
	// [index: string]: any;
}
