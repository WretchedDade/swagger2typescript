import Prettier from 'prettier';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type StatusCode = '200' | '201' | '202' | '203' | '204' | '205' | '206';
export type SchemaType = 'string' | 'array';
export type ContentType = 'application/json';
export type ParameterLocation = 'query' | 'header' | 'path' | 'body';
export type TypeDefinitionType = 'object';

export type KeyValueObject<TValue = string> = { [key: string]: TValue };
export interface Schema {
	description?: string;
	$ref?: string;
	pattern?: string;
	nullable?: boolean;
	type?: SchemaType;
	items?: Schema;
}

export type Content = {
	[contentType in ContentType]: {
		schema: Schema;
	};
};

export interface HttpMethodInfo {
	tags: string[];
	summary: string;
	operationId: string;
	parameters?: {
		name: string;
		schema: Schema;
		required: boolean;
		in: ParameterLocation;
	}[];
	requestBody?: {
		description: string;
		content: Content;
	};
	responses: {
		[key in StatusCode]: {
			description: string;
			content?: Content;
			schema?: Schema;
		};
	};
}

export interface TypeDefinition {
	required: string[];
	type: 'object';
	properties: {
		[key: string]: Schema;
	};
	enum?: (string | number)[];
	additionalProperties: boolean;
}

export interface ParsedSchema {
	description?: string;
	type?: string;
	isTypeDefinition?: boolean;
}

export interface Parameter extends ParsedSchema {
	in: ParameterLocation;
	name: string;
	required: boolean;
}

export interface Method {
	name: string;
	fullPath: string;
	httpMethod: HttpMethod;
	controller: string;
	tags?: string[];
	summary?: string;
	hasParameters: boolean;
	hasPathParameters: boolean;
	parameters: {
		all: Parameter[];
		path: Parameter[];
		query: Parameter[];
		headers: Parameter[];
	};
	requestBody?: ParsedSchema;
	successResponse?: ParsedSchema;
}

export interface Property extends ParsedSchema {
	name: string;
	required: boolean;
}

export interface Definition<T = string | number> {
	isEnum: boolean;
	isObject: boolean;
	name: string;
	enum?: T[];
	properties: Property[];
}

export interface ParsedOpenApi {
	info: {
		title: string;
		simplifiedTitle: string;
		version: string;
		openApiSpecVersion: string;
	};
	methods: Method[];
	definitions: Definition[];
}

export interface ParsedOpenApiGroupedByControllers {
	info: {
		title: string;
		version: string;
		openApiSpecVersion: string;
	};
	methods: { [controller: string]: Method[] };
	definitions: Definition[];
}

export type TemplateOptionType = 'Single File' | 'File per Method' | 'File per Controller';

export type TemplateOption<TKey extends TemplateOptionType> = {
	type: TKey;

	template?: string;
	imports?: string[];
	outputDirectory?: string;

	fileNameBuilder?: (
		data: TKey extends 'Single File' ? ParsedOpenApi : TKey extends 'File per Method' ? Method : string
	) => string;

	buildAdditionalData?: (
		data: TKey extends 'Single File' ? ParsedOpenApi : TKey extends 'File per Method' ? Method : string
	) => {
		[key: string]: string | number | boolean | (() => (text: string, render: MustacheRender) => string | null | undefined);
	};
};

export type TemplateOptions =
	| TemplateOption<'Single File'>
	| TemplateOption<'File per Method'>
	| TemplateOption<'File per Controller'>;

export interface Options {
	swagger: string;

	/**
	 * The name of the environment variable that contains the baseUrl
	 */
	baseUrlEnvironmentVariableName: string;

	/**
	 * The directory to output generated content.
	 * @default 'api'
	 */
	outputDirectory?: string;

	/**
	 * Templates used to generate content.
	 */
	templates: TemplateOptions[];

	controllerNameParser?: (path: string) => string;

	/**
	 * Name to use for the file containing types/models.
	 * @default 'Models'
	 */
	modelsFileName?: string;

	/**
	 * Used to filter the array of models to be generated.
	 */
	modelsFilter?: (model: Definition) => boolean;

	/**
	 * Used to map a type in Open API to a relevant typescript type. e.g. integer -> number
	 * @default
	 * {
	 * 	integer: 'number',
	 * 	DateTime: 'string',
	 * }
	 */
	typeMap?: KeyValueObject;

	/**
	 * Config to use when formatting with prettier.
	 */
	prettierConfig?: Prettier.Options;

	/**
	 * Additional models to include in models.d.ts. Useful when there is a generic type wrapping some of your other models.
	 * @default []
	 */
	additionalModels?: string[];
}

export type DefaultOptions = Required<
	Omit<Options, 'baseUrlEnvironmentVariableName' | 'swagger' | 'templates' | 'controllerNameParser' | 'modelsFilter'>
>;
export type DefaultedOptions = Options & DefaultOptions;

export type MustacheRender = (text: string) => string;

export interface FileGenerationOutput {
	type: 'Models' | TemplateOptions['type'] | 'Index';
	file: string;
	content: string;
	exportName?: string;
}

export interface FileGenerationOptions<TTemplateType extends TemplateOptionType> {
	api: ParsedOpenApi;
	defaultedOptions: DefaultedOptions;
	templateOption: TemplateOption<TTemplateType>;
}
