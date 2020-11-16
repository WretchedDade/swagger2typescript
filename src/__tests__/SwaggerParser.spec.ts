import SwaggerParser from '../SwaggerParser';
import ExampleSwagger from './example-swagger.json';

// describe('SwaggerParser.ParseSwagger()', () => {
// 	it('should parse the information correctly', () => {
// 		const result = SwaggerParser.ParseSwagger(
// 			JSON.stringify({
// 				...ExampleSwagger,
// 				openapi: '3.0.1',
// 				info: {
// 					title: 'My API',
// 					version: '1.2.3',
// 				},
// 			})
// 		);

// 		expect(result.info.title).toBe('My API');
// 		expect(result.info.version).toBe('1.2.3');
// 		expect(result.info.openApiSpecVersion).toBe('3.0.1');
// 	});
// });

// describe('SwaggerParser.ParseSchema()', () => {
// 	it('should correctly get the description', () => {
// 		const schema = SwaggerParser.ParseSchema({ description: 'This is my test description!' }, {});

// 		expect(schema?.description).toBeDefined();
// 		expect(schema?.description).toBe('This is my test description!');
// 	});

// 	it('should default the type to unknown when `type` and `$ref` are undefined', () => {
// 		const schema = SwaggerParser.ParseSchema({}, {});

// 		expect(schema?.type).toBeDefined();
// 		expect(schema?.type).toBe('unknown');
// 	});

// 	it('should use `type` when it is defined in the schema', () => {
// 		const schema = SwaggerParser.ParseSchema({ type: 'string' }, {});

// 		expect(schema?.type).toBeDefined();
// 		expect(schema?.type).toBe('string');
// 	});

// 	describe("when `$ref` is defined and `type` isn't", () => {
// 		it('should traverse the swagger object for the type definition and use the name when `type` is `object`', () => {
// 			const schema = SwaggerParser.ParseSchema(
// 				{ $ref: '#/components/schema/Request' },
// 				{
// 					components: {
// 						schema: {
// 							Request: {
// 								type: 'object',
// 							},
// 						},
// 					},
// 				}
// 			);

// 			expect(schema?.type).toBeDefined();
// 			expect(schema?.type).toBe('Request');
// 		});

// 		it('should traverse the swagger object for the type definition and use the name when `enum` is defined', () => {
// 			const schema = SwaggerParser.ParseSchema(
// 				{ $ref: '#/components/schema/Request' },
// 				{
// 					components: {
// 						schema: {
// 							Request: {
// 								enum: [],
// 							},
// 						},
// 					},
// 				}
// 			);

// 			expect(schema?.type).toBeDefined();
// 			expect(schema?.type).toBe('Request');
// 		});

// 		it.each(['Envelope<string>', 'string', 'integer'])(
// 			'should traverse the swagger object for the type definition and use the contained type (%p)',
// 			type => {
// 				const schema = SwaggerParser.ParseSchema(
// 					{ $ref: '#/components/schema/Request' },
// 					{
// 						components: {
// 							schema: {
// 								Request: { type },
// 							},
// 						},
// 					}
// 				);

// 				expect(schema?.type).toBeDefined();
// 				expect(schema?.type).toBe(type);
// 			}
// 		);
// 	});
// });
