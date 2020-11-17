import _ from 'lodash';
import Path from 'path';
import FileSystem from 'fs';
import Mustache from 'mustache';
import Prettier from 'prettier';

import { JoinPathSegments, ToForwardSlashes, ToPascalCase } from './Utils';
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
	TemplateOptionType,
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

	GenerateIndexFile(generatedOutputs, {
		api,
		defaultedOptions,
	});

	return generatedOutputs;
}

function GenerateModelsFile(api: ParsedOpenApi, defaultedOptions: DefaultedOptions): FileGenerationOutput {
	const { outputDirectory, modelsFileName, modelsFilter, prettierConfig } = defaultedOptions;

	const template = FileSystem.readFileSync(Path.resolve(__dirname, '../templates/Models.mustache')).toString();

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

function GenerateClassFile(
	fileName: string,
	options: FileGenerationOptions<'Single File' | 'File per Controller'>
): FileGenerationOutput {
	const { api, defaultedOptions, templateOption } = options;

	fileName = ToPascalCase(fileName);

	const { prettierConfig } = defaultedOptions;
	const outputDirectory = JoinPathSegments(defaultedOptions.outputDirectory, templateOption.outputDirectory ?? '');

	const template =
		templateOption.template ?? FileSystem.readFileSync(Path.resolve(__dirname, '../templates/Class.mustache')).toString();

	const output = Mustache.render(template, AddHelpers(api, options, { name: fileName }));

	const file = JoinPathSegments(outputDirectory, `${fileName}.ts`);
	const content = Prettier.format(output, prettierConfig);

	FileSystem.mkdirSync(outputDirectory, { recursive: true });
	FileSystem.writeFileSync(file, content);

	return {
		type: templateOption.type,
		file,
		exportName: fileName,
		content,
	};
}

function GenerateMethodFile(method: Method, options: FileGenerationOptions<'File per Method'>): FileGenerationOutput {
	const { defaultedOptions, templateOption } = options;

	const fileName = templateOption.fileNameBuilder
		? (templateOption.fileNameBuilder as (method: Method) => string)(method)
		: ToPascalCase(method.name);

	const { prettierConfig } = defaultedOptions;
	const outputDirectory = JoinPathSegments(defaultedOptions.outputDirectory, templateOption.outputDirectory ?? '');

	const template =
		templateOption.template ?? FileSystem.readFileSync(Path.resolve(__dirname, '../templates/Method.mustache')).toString();

	const output = Mustache.render(template, AddHelpers(method, options, templateOption.buildAdditionalData?.(method) ?? {}));

	const file = JoinPathSegments(outputDirectory, `${fileName}.ts`);
	const content = Prettier.format(output, prettierConfig);

	FileSystem.mkdirSync(outputDirectory, { recursive: true });
	FileSystem.writeFileSync(file, content);

	return {
		type: templateOption.type,
		file,
		exportName: fileName,
		content,
	};
}

function GenerateIndexFile(
	fileGenerationOutputs: FileGenerationOutput[],
	options: Omit<FileGenerationOptions<'Single File'>, 'templateOption'>
) {
	const { api, defaultedOptions } = options;
	const { outputDirectory, prettierConfig } = defaultedOptions;

	const template = FileSystem.readFileSync(Path.resolve(__dirname, '../templates/Index.mustache')).toString();

	const output = Mustache.render(
		template,
		AddHelpers(api, options, {
			files: fileGenerationOutputs.filter(output => output.type !== 'Models'),
			ParseFileName: () => (text: string, render: MustacheRender) => {
				const path = ToForwardSlashes(Path.relative(outputDirectory, render(text)));
				const extension = Path.extname(path);
				return path.replace(extension, '');
			},
		})
	);

	FileSystem.writeFileSync(`${outputDirectory}/index.ts`, Prettier.format(output, prettierConfig));
}

function AddHelpers<TData extends {}, TTemplateType extends TemplateOptionType>(
	data: TData,
	options: Partial<FileGenerationOptions<TTemplateType>>,
	additionalData: { [key: string]: any } = {}
) {
	const { additionalModels } = options.defaultedOptions ?? {};

	return {
		...data,
		...additionalData,
		additionalModels,
		imports: options.templateOption?.imports ?? [],
		baseUrl: options.defaultedOptions?.baseUrlEnvironmentVariableName,
		CamelCase: () => (text: string, render: MustacheRender) => _.camelCase(render(text)),
		PascalCase: () => (text: string, render: MustacheRender) => ToPascalCase(render(text)),
		UpperCase: () => (text: string, render: MustacheRender) => render(text).toUpperCase(),
		WrapInCurlyBrackets: () => (text: string, render: MustacheRender) => `{${render(text)}}`,
	};
}
