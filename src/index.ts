import { Command, flags } from '@oclif/command';

import fs from 'fs';
import Handlebars from 'handlebars';

import SwaggerParser from '@apidevtools/swagger-parser';
import SwaggerFactory from './SwaggerFactory';

// eslint-disable-next-line @typescript-eslint/class-name-casing
class swagger2typescript extends Command {
	static description = 'describe the command here';

	static flags = {
		// add --version flag to show CLI version
		version: flags.version({ char: 'v' }),

		prefix: flags.string({
			char: 'p',
			default: '',
			helpValue: '/api',
			description:
				'A route part prefixing endpoint groups. Note that an initial / may need to be escaped with a second //',
		}),

		outputDir: flags.string({
			char: 'o',
			default: 'api/',
			description: 'The directory to output the generated code.',
		}),

		name: flags.string({
			char: 'n',
			default: 'Api',
			description: 'Name used when defining types namespace',
		}),

		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'file', required: true }];

	async run() {
		const { args, flags } = this.parse(swagger2typescript);

		const document = await SwaggerParser.validate(args.file);

		const factory = new SwaggerFactory(flags.prefix, flags.name);

		const { groups, schemas: responseBodyTypes } = factory.GenerateEndpointGroups(document);

		Handlebars.registerHelper('StripSingleQuotes', function (options) {
			return options.fn(this).replace(/(: )"(.*)"(,?)/g, '$1$2$3');
		});

		const typesTemplate = Handlebars.compile(fs.readFileSync('src/templates/types.handlebars').toString());
		const serviceTemplate = Handlebars.compile(fs.readFileSync('src/templates/service.handlebars').toString());

		const services = Object.fromEntries(
			Object.keys(groups).map(group => {
				return [
					`${group}Service`,
					serviceTemplate({ typesNamespace: flags.name, name: group, endpoints: groups[group] }),
				];
			})
		);

		if (!fs.existsSync(flags.outputDir)) fs.mkdirSync(flags.outputDir);

		Object.keys(services).forEach(service => {
			fs.writeFileSync(`${flags.outputDir}${service}.ts`, services[service]);
			this.log(`${flags.outputDir}${service}.ts Generated`);
		});

		fs.writeFileSync(
			`${flags.outputDir}${flags.name}.ts`,
			typesTemplate({ name: flags.name, types: responseBodyTypes })
		);

		// this.log(groups);

		// this.log(`Parsing: ${args.file}`);
	}
}

export = swagger2typescript;
