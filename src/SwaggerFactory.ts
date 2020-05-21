import { OpenAPI, OpenAPIV2 } from 'openapi-types';

import { ApiMetadata, EndpointGroups, Schema, Parameter } from './models';

import { IsReferenceObject, CapitalizeFirstLetter, IsGeneralParamterObject } from './Utils';

type PathItem = OpenAPIV2.PathItemObject;
type OperationObject = OpenAPIV2.OperationObject;
type Response = OpenAPIV2.ResponseObject | OpenAPIV2.ReferenceObject;

export default class SwaggerFactory {
	private readonly prefix: string;

	private readonly typesNamespace: string;

	private readonly schemas: Set<Schema>;

	constructor(prefix: string, typesNamespace: string) {
		this.prefix = prefix;
		this.typesNamespace = typesNamespace;
		this.schemas = new Set<Schema>();
	}

	public GenerateEndpointGroups(document: OpenAPI.Document) {
		const paths = Object.keys(document.paths).map(path => path.replace(this.prefix, ''));

		const groupNames = [...new Set(paths.map(path => path.split('/')[1]))];

		const groups: EndpointGroups = Object.fromEntries(
			[...groupNames].map(groupName => [
				groupName,
				paths
					.filter(path => path.includes(`/${groupName}/`))
					.map(path =>
						this.PathItemToApiMetadata(
							path.replace(`/${groupName}/`, '').replace(/[/-]*/gm, ''),
							document.paths[`${this.prefix}${path}`]
						)
					),
			])
		);

		return { groups, schemas: this.schemas };
	}

	public PathItemToApiMetadata(endpoint: string, pathItem: PathItem): ApiMetadata {
		const method = this.PathItemToMethod(pathItem);

		const operation = pathItem[method];

		const parameters = this.GetParametersFromOperation(operation);

		const metadata: ApiMetadata = {
			endpoint,
			method,
			tags: operation?.tags ?? [],
			summary: operation?.summary ?? '',
			deprecated: operation?.deprecated ?? false,
			description: operation?.description ?? '',
			operationId: operation?.operationId ?? '',
			responseBodyType: this.OperationToResponseType(operation),
			parameters,
			request: this.GenerateParamType(parameters, operation.operationId),
		};

		console.log(metadata);

		return metadata;
	}

	public PathItemToMethod(pathItem: PathItem): ApiMetadata['method'] {
		if (pathItem?.get !== undefined) return 'get';
		if (pathItem?.post !== undefined) return 'post';
		if (pathItem?.put !== undefined) return 'put';
		if (pathItem?.patch !== undefined) return 'patch';
		if (pathItem?.delete !== undefined) return 'delete';

		throw new Error('One of the expected HTTP Methods was not found');
	}

	public GetParametersFromOperation(operation: OperationObject | undefined): Parameter[] {
		if (operation === undefined) return [];

		return operation.parameters.map<Parameter>(parameter => {
			if (IsReferenceObject(parameter)) throw new Error('Reference object parameters');

			let type: string;

			if (IsGeneralParamterObject(parameter)) {
				type = parameter.type;
			} else {
				type = this.SchemaToType(
					parameter.schema,
					`${operation.operationId}${CapitalizeFirstLetter(parameter.name)}`
				);
			}

			if (type === 'integer') {
				type = 'number';
			}

			return {
				isBody: parameter.in === 'body',
				isHeader: parameter.in === 'header',
				isQuery: parameter.in === 'query',
				isRequired: parameter.required,
				description: parameter.description,
				name: parameter.name,
				type,
			};
		});
	}

	public GenerateParamType(parameters: Parameter[], operationId: string): string {
		if (parameters.length === 0) return '';

		this.schemas.add(
			new Schema(
				`${operationId}Request`,
				Object.fromEntries(parameters.map(parameter => [parameter.name, parameter.type]))
			)
		);

		return `request: ${this.typesNamespace}.${operationId}Request`;
	}

	public OperationToResponseType(operation: OperationObject | undefined): string {
		if (operation === undefined) return 'void';

		const response: Response = operation.responses['200'] ?? operation.responses['201'];

		if (IsReferenceObject(response)) throw new Error('Reference object responses are not supported');

		if (response === undefined) return 'void';

		if (response.schema === undefined) return 'void';

		return this.SchemaToType(response.schema, operation.operationId);
	}

	public SchemaToType(schema: OpenAPIV2.Schema, name: string): string {
		if (IsReferenceObject(schema)) throw new Error('Reference schema types are not supported');

		if (schema.type !== 'object' && !Array.isArray(schema.type)) return schema.type;

		if (schema.type === 'object') {
			this.schemas.add(new Schema(name, this.SchemaPropertiesToObject(schema.properties, name)));

			return `${this.typesNamespace}.${name}`;
		}

		throw new Error('Multiple schema types are not supported');
	}

	public SchemaPropertiesToObject(properties: OpenAPIV2.SchemaObject['properties'], name: string) {
		let property: OpenAPIV2.SchemaObject;

		return Object.fromEntries(
			Object.keys(properties).map(key => {
				property = properties[key];

				if (property.type === 'integer') {
					return [key, 'number'];
				}

				if (property.type === 'object') {
					return [
						key,
						this.SchemaPropertiesToObject(property.properties, `${name}${CapitalizeFirstLetter(key)}`),
					];
				}

				if (property.type === 'array') {
					return [
						key,
						this.SchemaItemsToStringifiedType(property.items, `${name}${CapitalizeFirstLetter(key)}`),
					];
				}

				return [key, properties[key].type];
			})
		);
	}

	public SchemaItemsToStringifiedType(items: OpenAPIV2.ItemsObject, name: string) {
		if (items.type === 'object') {
			this.schemas.add(new Schema(name, this.SchemaPropertiesToObject((items as any).properties, name)));

			return `${name}[]`;
		}

		return items.type;
	}
}
