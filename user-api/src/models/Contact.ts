import { pool } from '../config/database.js';
import { BaseModel } from './BaseModel.js';
import { OkPacket } from 'mysql2';

export interface IContact {
    id: number;
    subject: string;
    category: 'general' | 'technical' | 'feature' | 'account' | 'other';
    email: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    userid?: string | null;
    admin_notes?: string | null;
    admin_userid?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

type QueryObject = { [key: string]: any };

export class Contact {
    private static tableName = 'contacts';

    static async create(data: Omit<IContact, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<IContact | null> {
        const columns = Object.keys(data).map(key => `\`${key}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

        const [result] = await pool.execute<OkPacket>(sql, values);
        if (result.insertId) {
            return this.findOne({ id: result.insertId });
        }
        return null;
    }

    static async find(query: QueryObject, limit?: number, page?: number, sort?: { by: string; order: 'ASC' | 'DESC' }): Promise<IContact[]> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        const results = await BaseModel.find(context, query, limit, page, sort);
        return results as IContact[];
    }

    static async findOne(query: QueryObject): Promise<IContact | null> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        const result = await BaseModel.findOne(context, query);
        return result as IContact | null;
    }

    static async count(query: QueryObject): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.count(context, query);
    }

    static async update(query: QueryObject, data: Partial<IContact>): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.update(context, query, data);
    }

    static async delete(query: QueryObject): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.delete(context, query);
    }
} 