import { pool } from '../config/database.js';
import { BaseModel } from './BaseModel.js';
import { OkPacket } from 'mysql2';

export interface IFeedback {
    id: number;
    title: string;
    type: 'bug' | 'feature' | 'improvement' | 'vulnerability' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    steps_to_reproduce?: string | null;
    expected_behavior?: string | null;
    actual_behavior?: string | null;
    browser_info?: string | null;
    screenshot_url?: string | null;
    status: 'pending' | 'confirmed' | 'in_progress' | 'testing' | 'resolved' | 'closed' | 'rejected';
    userid?: string | null;
    admin_notes?: string | null;
    admin_userid?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

type QueryObject = { [key: string]: any };

export class Feedback {
    private static tableName = 'feedback';

    static async create(data: Omit<IFeedback, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<IFeedback | null> {
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

    static async find(query: QueryObject, limit?: number, page?: number, sort?: { by: string; order: 'ASC' | 'DESC' }): Promise<IFeedback[]> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        const results = await BaseModel.find(context, query, limit, page, sort);
        return results as IFeedback[];
    }

    static async findOne(query: QueryObject): Promise<IFeedback | null> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        const result = await BaseModel.findOne(context, query);
        return result as IFeedback | null;
    }

    static async count(query: QueryObject): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.count(context, query);
    }

    static async update(query: QueryObject, data: Partial<IFeedback>): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.update(context, query, data);
    }

    static async delete(query: QueryObject): Promise<number> {
        const context = { tableName: this.tableName, buildWhereClause: BaseModel.buildWhereClause };
        return BaseModel.delete(context, query);
    }
} 