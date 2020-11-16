import _ from 'lodash';

export function IsDefined<T>(value: T | null | undefined): value is T {
	return value !== null;
}

export function ToPascalCase(value: string): string {
	return _.upperFirst(_.camelCase(value));
}
