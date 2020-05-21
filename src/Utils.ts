import { OpenAPIV2 } from 'openapi-types';

export const IsReferenceObject = (value: unknown | OpenAPIV2.ReferenceObject): value is OpenAPIV2.ReferenceObject => {
	return (value as OpenAPIV2.ReferenceObject)?.$ref !== undefined;
};

export const IsGeneralParamterObject = (value: unknown): value is OpenAPIV2.GeneralParameterObject => {
	return (
		(value as OpenAPIV2.GeneralParameterObject).in !== undefined &&
		(value as OpenAPIV2.GeneralParameterObject).type !== undefined
	);
};

export const CapitalizeFirstLetter = (value: string): string =>
	value.replace(/(.{1})(.*)/g, (_, a, b) => `${a.toUpperCase()}${b}`);
