import _ from 'lodash';
import Path from 'path';

export function IsDefined<T>(value: T | null | undefined): value is T {
	return value !== null;
}

export function ToPascalCase(value: string): string {
	return _.upperFirst(_.camelCase(value));
}

export function ToForwardSlashes(value: string): string {
	return value.replace(/\\/g, '/');
}

export function JoinPathSegments(...segments: string[]): string {
	return ToForwardSlashes(Path.join(...segments));
}
