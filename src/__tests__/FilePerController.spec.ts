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

test('File per controller generation should produce the correct output', () => {
	const generatedOutput = GenerateTypescriptCodeFromSwagger({
		outputDirectory: 'api',
		swagger: JSON.stringify(ExampleSwagger),
		templates: [{ type: 'File per Controller' }],
		baseUrlEnvironmentVariableName: 'API_BASE_URL',
	});

	expect(MockFileSystem.mkdirSync).toBeCalledTimes(5);
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(1, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(2, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(3, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(4, 'api', { recursive: true });
	expect(MockFileSystem.mkdirSync).toHaveBeenNthCalledWith(5, 'api', { recursive: true });

	expect(MockFileSystem.writeFileSync).toBeCalledTimes(5);
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(1, 'api/Models.d.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(2, 'api/Pet.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(3, 'api/Store.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(4, 'api/User.ts', expect.any(String));
	expect(MockFileSystem.writeFileSync).toHaveBeenNthCalledWith(5, 'api/index.ts', expect.any(String));

	const [models, pet, store, user, index, ...rest] = generatedOutput;

	expect(models).toMatchObject({
		type: 'Models',
		file: 'api/Models.d.ts',
		content: expect.any(String),
	});

	expect(pet).toMatchObject({
		type: 'File per Controller',
		file: 'api/Pet.ts',
		content: expect.any(String),
	});

	expect(store).toMatchObject({
		type: 'File per Controller',
		file: 'api/Store.ts',
		content: expect.any(String),
	});

	expect(user).toMatchObject({
		type: 'File per Controller',
		file: 'api/User.ts',
		content: expect.any(String),
	});

	expect(index).toMatchObject({
		type: 'Index',
		file: 'api/index.ts',
		content: expect.any(String),
	});

	expect(models.content).toMatchSnapshot('Models Content');
	expect(pet.content).toMatchSnapshot('Pet Content');
	expect(store.content).toMatchSnapshot('Store Content');
	expect(user.content).toMatchSnapshot('User Content');
	expect(index.content).toMatchSnapshot('Index Content');

	expect(rest).toHaveLength(0);
});
