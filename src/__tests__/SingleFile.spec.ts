import ExampleSwagger from './example-swagger.json';
import { GenerateTypescriptCodeFromSwagger } from '..';

import FileSystem from 'fs';

jest.mock('fs', () => ({
	...jest.requireActual<typeof FileSystem>('fs'),
	mkdirSync: jest.fn(),
	writeFileSync: jest.fn(),
}));

const MockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

beforeEach(() => {
	MockFileSystem.mkdirSync.mockReset();
	MockFileSystem.writeFileSync.mockReset();
});

test('Single file generation should produce the correct output', () => {
	const generatedOutput = GenerateTypescriptCodeFromSwagger({
		outputDirectory: 'api',
		templates: [{ type: 'Single File' }],
		swagger: JSON.stringify(ExampleSwagger),
	});

	expect(MockFileSystem.mkdirSync).toBeCalledTimes(1);
	expect(MockFileSystem.mkdirSync).toBeCalledWith('api', { recursive: true });

	expect(MockFileSystem.writeFileSync).toBeCalledTimes(2);
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(1, 'api/Models.d.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(2, 'api/SwaggerPetstore.ts', expect.any(String));

	const [models, petstore, ...rest] = generatedOutput;

	expect(models).toMatchObject({
		type: 'Models',
		file: 'api/Models.d.ts',
		content: expect.any(String),
	});

	expect(petstore).toMatchObject({
		type: 'Single File',
		file: 'api/SwaggerPetstore.ts',
		content: expect.any(String),
	});

	expect(models.content).toMatchSnapshot('Models Content');
	expect(petstore.content).toMatchSnapshot('Single File Content');

	expect(rest).toHaveLength(0);
});
