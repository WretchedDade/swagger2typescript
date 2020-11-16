import _ from 'lodash';
import Path from 'path';
import FileSystem from 'fs';
import Mustache from 'mustache';
import Prettier from 'prettier';

import { ToPascalCase } from './Utils';
import SwaggerParser from './SwaggerParser';
import {
	DefaultedOptions,
	DefaultOptions,
	FileGenerationOptions,
	FileGenerationOutput,
	Method,
	MustacheRender,
	Options,
	ParsedOpenApi,
	TemplateOptions,
} from './Models';

const defaultOptions: DefaultOptions = {
	outputDirectory: 'api',
	modelsFileName: 'Models',
	typeMap: {},
	prettierConfig: {
		useTabs: true,
		tabWidth: 4,
		semi: true,
		singleQuote: true,
		parser: 'typescript',
		printWidth: 130,
	},
	additionalModels: [],
};

export function GenerateTypescriptCodeFromSwagger(options: Options): FileGenerationOutput[] {
	const defaultedOptions = { ...defaultOptions, ...options };
	const { outputDirectory, templates } = defaultedOptions;

	const swaggerParser = new SwaggerParser(defaultedOptions);
	const api = swaggerParser.ParseSwagger();

	FileSystem.mkdirSync(outputDirectory, { recursive: true });

	const generatedOutputs: FileGenerationOutput[] = [];

	generatedOutputs.push(GenerateModelsFile(api, defaultedOptions));

	templates.forEach(templateOption => {
		switch (templateOption.type) {
			case 'Single File':
				generatedOutputs.push(
					GenerateClassFile(templateOption.fileNameBuilder?.(api) ?? api.info.simplifiedTitle, {
						api,
						defaultedOptions,
						templateOption,
					})
				);
				break;

			case 'File per Controller':
				Array.from(new Set(api.methods.map(method => method.controller))).forEach(controller =>
					generatedOutputs.push(
						GenerateClassFile(templateOption.fileNameBuilder?.(controller) ?? controller, {
							api: { ...api, methods: api.methods.filter(method => method.controller === controller) },
							defaultedOptions,
							templateOption,
						})
					)
				);
				break;

			case 'File per Method':
				api.methods.forEach(method => {
					generatedOutputs.push(GenerateMethodFile(method, { api, defaultedOptions, templateOption }));
				});
				break;

			default:
				throw new Error(`Unexpected template type of ${templateOption!.type} detected`);
		}
	});

	return generatedOutputs;
}

function GenerateModelsFile(api: ParsedOpenApi, defaultedOptions: DefaultedOptions): FileGenerationOutput {
	const { outputDirectory, modelsFileName, modelsFilter, prettierConfig } = defaultedOptions;

	const template = FileSystem.readFileSync(Path.resolve(__dirname, './templates/Models.mustache')).toString();

	const output = Mustache.render(
		template,
		AddHelpers(
			{ ...api, definitions: modelsFilter ? api.definitions.filter(modelsFilter) : api.definitions },
			{ defaultedOptions }
		)
	);

	const file = `${outputDirectory}/${modelsFileName}.d.ts`;
	const content = Prettier.format(output, prettierConfig);

	FileSystem.writeFileSync(file, content);

	return {
		type: 'Models',
		file,
		content,
	};
}

function GenerateClassFile(fileName: string, options: FileGenerationOptions): FileGenerationOutput {
	fileName = ToPascalCase(fileName);

	const { outputDirectory, prettierConfig } = options.defaultedOptions;

	const template = FileSystem.readFileSync(Path.resolve(__dirname, './templates/Class.mustache')).toString();

	const output = Mustache.render(template, AddHelpers(options.api, options, { name: fileName }));

	const file = `${outputDirectory}/${fileName}.ts`;
	const content = Prettier.format(output, prettierConfig);

	FileSystem.writeFileSync(file, content);

	return {
		type: options.templateOption.type,
		file,
		content,
	};
}

function GenerateMethodFile(method: Method, options: FileGenerationOptions): FileGenerationOutput {
	const fileName = ToPascalCase(method.name);

	const { outputDirectory, prettierConfig } = options.defaultedOptions;

	const template = FileSystem.readFileSync(Path.resolve(__dirname, './templates/Class.mustache')).toString();

	const output = Mustache.render(template, AddHelpers(method, options));

	const file = `${outputDirectory}/${fileName}.ts`;
	const content = Prettier.format(output, prettierConfig);

	FileSystem.writeFileSync(file, content);

	return {
		type: options.templateOption.type,
		file,
		content,
	};
}

// function GenerateIndexFile(fileName: string, options: FileGenerationOptions) {
// 	const { outputDirectory, prettierConfig } = options.defaultedOptions;

// 	const template = FileSystem.readFileSync(Path.resolve(__dirname, './templates/Class.mustache')).toString();

// 	const output = Mustache.render(template, AddHelpers(options.api, options, { name: fileName }));

// 	FileSystem.writeFileSync(`${outputDirectory}/${fileName}.ts`, Prettier.format(output, prettierConfig));
// }

function AddHelpers<TData extends {}>(
	data: TData,
	options: Partial<FileGenerationOptions>,
	additionalData: { [key: string]: any } = {}
) {
	const { additionalModels } = options.defaultedOptions ?? {};

	return {
		...data,
		...additionalData,
		...(options?.templateOption?.imports ?? []),
		additionalModels,
		CamelCase: () => (text: string, render: MustacheRender) => _.camelCase(render(text)),
		PascalCase: () => (text: string, render: MustacheRender) => ToPascalCase(render(text)),
		WrapInCurlyBrackets: () => (text: string, render: MustacheRender) => `{${render(text)}}`,
	};
}
