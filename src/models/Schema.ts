export class Schema {
	public name: string;

	public properties: string;

	constructor(name: string, properties: object) {
		this.name = name;

		this.properties = JSON.stringify(properties, null, 4);
	}
}
