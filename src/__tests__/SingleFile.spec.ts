import ExampleSwagger from './example-swagger.json';
import { GenerateTypescriptCodeFromSwagger } from '..';

import FileSystem from 'fs';

jest.mock('fs', () => ({
	...jest.requireActual<typeof FileSystem>('fs'),
	rmdirSync: jest.fn(),
	mkdirSync: jest.fn(),
	writeFileSync: jest.fn(),
}));

const MockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

beforeEach(() => {
	MockFileSystem.rmdirSync.mockReset();
	MockFileSystem.mkdirSync.mockReset();
	MockFileSystem.writeFileSync.mockReset();
});

test('Single file generation should produce the correct output', () => {
	const generatedOutput = GenerateTypescriptCodeFromSwagger({
		outputDirectory: 'api',
		templates: [{ type: 'Single File' }],
		swagger: JSON.stringify(ExampleSwagger),
		baseUrlEnvironmentVariableName: 'API_BASE_URL',
	});

	expect(MockFileSystem.rmdirSync).toBeCalledTimes(1);
	expect(MockFileSystem.rmdirSync).toHaveBeenCalledWith('api', { recursive: true });

	expect(MockFileSystem.mkdirSync).toBeCalledTimes(3);
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(1, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(2, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(3, 'api', { recursive: true });

	expect(MockFileSystem.writeFileSync).toBeCalledTimes(3);
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(1, 'api/Models.d.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(2, 'api/SwaggerPetstore.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(3, 'api/index.ts', expect.any(String));

	const [models, petstore, index, ...rest] = generatedOutput;

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

	expect(index).toMatchObject({
		type: 'Index',
		file: 'api/index.ts',
		content: expect.any(String),
	});

	expect(models.content).toMatchSnapshot('Models Content');
	expect(petstore.content).toMatchSnapshot('Single File Content');
	expect(index.content).toMatchSnapshot('Index Content');

	expect(rest).toHaveLength(0);
});
