import { map, toPath } from 'lodash';
import {
	DefaultedOptions,
	Definition,
	HttpMethod,
	HttpMethodInfo,
	KeyValueObject,
	Method,
	ParsedOpenApi,
	ParsedSchema,
	Property,
	Schema,
	StatusCode,
	TypeDefinition,
} from './Models';
import { IsDefined } from './Utils';

const defaultTypeMap: KeyValueObject = {
	integer: 'number',
	DateTime: 'string',
};

export default class SwaggerParser {
	private readonly swagger: any;
	private readonly options: DefaultedOptions;
	private readonly controllerNameParser?: (path: string) => string;

	constructor(options: DefaultedOptions) {
		this.options = options;
		this.swagger = JSON.parse(options.swagger);
	}

	public ParseSwagger(): ParsedOpenApi {
		const { openapi, info } = this.swagger;

		const methods = this.BuildMethods();
		const definitions = this.BuildDefinitions();

		return {
			info: {
				title: info.title,
				simplifiedTitle: info.title.replace(' ', ''),
				version: info.version,
				openApiSpecVersion: openapi,
			},
			methods,
			definitions,
		};
	}

	public BuildMethods(): Method[] {
		const { paths } = this.swagger;

		return Object.keys(paths)
			.map((path: string) => {
				let _: string, rest: string[], controller: string;

				if (this.options.controllerNameParser !== undefined) {
					controller = this.options.controllerNameParser(path);

					const parts = path.split('/').filter(part => part.length && !part.includes('{'));
					const indexOfController = parts.findIndex(part => part === controller);

					rest = parts.slice(indexOfController + 1);
				} else [controller, ...rest] = path.split('/').filter(part => part.length && !part.includes('{'));

				const pathObject = paths[path];

				const httpMethod = Object.keys(pathObject)[0];

				const { tags, summary, parameters, requestBody, responses } = Object.values(pathObject)[0] as HttpMethodInfo;
				const successResponse = responses[Object.keys(responses).sort()[0] as StatusCode];

				const parsedParameters = parameters?.map(parameter => ({
					in: parameter.in,
					name: parameter.name,
					required: parameter.required,
					...this.BuildSchema(parameter.schema ?? parameter),
				}));

				const pathParameters = parsedParameters?.filter(parameter => parameter.in === 'path') ?? [];

				return {
					httpMethod: httpMethod.toUpperCase() as HttpMethod,
					controller,
					name: rest.length > 0 ? rest.join('') : controller,
					fullPath: path,
					tags,
					summary,
					hasParameters: (parsedParameters !== undefined && parsedParameters.length > 0) || requestBody !== undefined,
					hasPathParameters: pathParameters.length > 0,
					parameters: {
						all: parsedParameters?.filter(parameter => parameter.in !== 'body') ?? [],
						path: pathParameters,
						query: parsedParameters?.filter(parameter => parameter.in === 'query') ?? [],
						headers: parsedParameters?.filter(parameter => parameter.in === 'header') ?? [],
					},
					requestBody:
						(requestBody && this.BuildSchema(requestBody?.content?.['application/json'].schema)) ??
						parsedParameters?.find(parameter => parameter.in === 'body'),
					successResponse:
						successResponse &&
						this.BuildSchema(successResponse.schema ?? successResponse.content?.['application/json']?.schema),
				};
			})
			.filter(IsDefined);
	}

	public BuildSchema(schema: Schema | undefined): ParsedSchema {
		if (schema === undefined)
			return {
				type: 'void',
				isTypeDefinition: false,
			};

		let type: string = 'unknown';
		let isTypeDefinition = false;

		if (schema.type !== undefined) {
			type = schema.type === 'array' && schema.items ? `Array<${this.BuildSchema(schema.items)?.type}>` : schema.type;
		} else if (schema.$ref !== undefined) {
			const schemaRefParts = schema.$ref.split('/');

			const typeDefinition: TypeDefinition = schemaRefParts.slice(1).reduce((obj, refPart) => obj[refPart], this.swagger);

			isTypeDefinition = true;
			type =
				typeDefinition.type === 'object' || typeDefinition.enum !== undefined
					? schemaRefParts[schemaRefParts.length - 1]
					: typeDefinition.type;
		}

		return {
			description: schema.description,
			type: this.MapType(type),
			isTypeDefinition,
		};
	}

	public MapType(type: string): string {
		const typeMap = { ...defaultTypeMap, ...this.options.typeMap };
		const mappedType = typeMap[type];

		if (mappedType) return mappedType;

		return Object.entries(typeMap).reduce(
			(mappedType, [search, replacement]) => mappedType.replace(search, replacement),
			type
		);
	}

	public BuildDefinitions(): Definition[] {
		const definitions: { [key: string]: TypeDefinition } = this.swagger?.definitions ?? this.swagger.components.schemas;

		return Object.keys(definitions).map(definitionKey => {
			const definition = definitions[definitionKey];

			const isEnum = definition.enum !== undefined;
			const isObject = definition.type === 'object';

			return {
				isEnum,
				isObject,
				name: definitionKey,
				enum: definition.enum,
				properties: this.BuildProperties(definition),
			};
		});
	}

	public BuildProperties(definition: TypeDefinition): Property[] {
		return Object.keys(definition.properties ?? {}).map(propertyKey => {
			return {
				name: propertyKey,
				...this.BuildSchema(definition.properties[propertyKey]),
				required: definition.required?.includes(propertyKey) ?? false,
			};
		});
	}
}
