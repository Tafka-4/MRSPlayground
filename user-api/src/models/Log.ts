import { BaseModel } from './BaseModel.js';
import { RowDataPacket } from 'mysql2';
import { pool, requestPool } from '../config/database.js';

export interface ILog {
    request_id: string;
    user_id?: string;
    is_authenticated: boolean;
    route?: string;
    method?: string;
    status: 'pending' | 'success' | 'failed';
    created_at: Date;
    updated_at: Date;
    client_ip?: string;
    user_agent?: string;
    error_code?: string;
    error_message?: string;
    retry_count: number;
}

type QueryObject = { [key: string]: any };

export class Log {
    private static tableName = 'user_requests';

    constructor(data: ILog) {
        // Object.assign(this, data) is not needed as this class is not instantiated with data
    }

    static async find(query: QueryObject, limit?: number, page?: number, sort?: { by: string; order: 'ASC' | 'DESC' }): Promise<ILog[]> {
        const context = { 
            tableName: this.tableName, 
            buildWhereClause: BaseModel.buildWhereClause,
            pool: requestPool
        };
        const results = await BaseModel.find(context, query, limit, page, sort);
        return results as ILog[];
    }

    static async count(query: QueryObject): Promise<number> {
        const context = { 
            tableName: this.tableName, 
            buildWhereClause: BaseModel.buildWhereClause,
            pool: requestPool
        };
        return BaseModel.count(context, query);
    }

    static async delete(query: QueryObject): Promise<number> {
        const context = { 
            tableName: this.tableName, 
            buildWhereClause: BaseModel.buildWhereClause,
            pool: requestPool
        };
        return BaseModel.delete(context, query);
    }

    static async aggregate(pipeline: (QueryObject | { $group: { _id: any; [key: string]: any; }; })[]): Promise<any[]> {
        const context = { 
            tableName: this.tableName, 
            buildWhereClause: BaseModel.buildWhereClause,
            pool: requestPool
        };
        return BaseModel.aggregate(context, pipeline);
    }
} 