//import { randomBytes } from 'crypto'

export class Hello {
    // types
    id: number;
    title: String;
    description: String;

    constructor(title, description) {
        this.title = title;
        this.description = description;
    }
}

export const HelloSchema = {
    name: 'Hello',
    target: Hello,
    columns: {
        id: {
            // This property has objectId: true instead of type: int in MongoDB
            primary: true,
            type: 'int',
            generated: true
        },
        title: {
            type: 'varchar',
        },
        description: {
            type: 'varchar'
        }
    }
}