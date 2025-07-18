import { pool } from '../config/database.js';
import { OkPacket, RowDataPacket } from 'mysql2/promise';

type QueryObject = { [key: string]: any };

export class BaseModel {
    static async find(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        query: QueryObject,
        limit?: number,
        page?: number,
        sort?: { by: string; order: 'ASC' | 'DESC' }
    ): Promise<RowDataPacket[]> {
        let sql = `SELECT * FROM ${context.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = context.buildWhereClause(query, values);
            sql += ` WHERE ${conditions}`;
        }

        if (sort) {
            sql += ` ORDER BY ${pool.escapeId(sort.by)} ${
                sort.order === 'ASC' ? 'ASC' : 'DESC'
            }`;
        }

        if (limit && limit > 0) {
            const limitValue = Math.max(1, Math.min(100, Number(limit) || 10));
            const pageValue = Math.max(1, Number(page) || 1);
            const offset = (pageValue - 1) * limitValue;
            sql += ` LIMIT ? OFFSET ?`;
            values.push(limitValue, offset);
        }

        const [rows] = await pool.query(sql, values);
        return rows as RowDataPacket[];
    }

    static async findOne(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        query: QueryObject
    ): Promise<RowDataPacket | null> {
        let sql = `SELECT * FROM ${context.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = context.buildWhereClause(query, values);
            sql += ` WHERE ${conditions}`;
        }
        sql += ` LIMIT 1`;

        const [rows] = await pool.query(sql, values);
        if ((rows as RowDataPacket[]).length === 0) {
            return null;
        }
        return (rows as RowDataPacket[])[0];
    }

    static async update(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        query: QueryObject,
        updateData: QueryObject
    ): Promise<number> {
        let sql = `UPDATE ${context.tableName} SET `;
        const values: any[] = [];

        const updateFields = Object.keys(updateData)
            .map((key) => {
                values.push(updateData[key]);
                return `${pool.escapeId(key)} = ?`;
            })
            .join(', ');

        sql += updateFields;

        if (Object.keys(query).length > 0) {
            const conditions = context.buildWhereClause(query, values);
            sql += ` WHERE ${conditions}`;
        }

        const [result] = await pool.execute<OkPacket>(sql, values);
        return result.affectedRows;
    }

    static async delete(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        query: QueryObject
    ): Promise<number> {
        let sql = `DELETE FROM ${context.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = context.buildWhereClause(query, values);
            sql += ` WHERE ${conditions}`;
        }

        const [result] = await pool.execute<OkPacket>(sql, values);
        return result.affectedRows;
    }

    static async count(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        query: QueryObject
    ): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM ${context.tableName}`;
        const values: any[] = [];

        if (Object.keys(query).length > 0) {
            const conditions = context.buildWhereClause(query, values);
            sql += ` WHERE ${conditions}`;
        }

        const [rows] = await pool.query(sql, values);
        return (rows as RowDataPacket[]).length > 0 ? (rows as RowDataPacket[])[0].count : 0;
    }

    static buildWhereClause(
        query: QueryObject,
        values: any[]
    ): string {
        const conditions: string[] = [];
        Object.entries(query).forEach(([key, value]) => {
            if (
                typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value)
            ) {
                const operator = Object.keys(value)[0];
                const operand = value[operator];
                switch (operator) {
                    case '$regex':
                        conditions.push(`${pool.escapeId(key)} LIKE ?`);
                        values.push(`%${operand}%`);
                        break;
                    case '$lt':
                        conditions.push(`${pool.escapeId(key)} < ?`);
                        values.push(operand);
                        break;
                    case '$lte':
                        conditions.push(`${pool.escapeId(key)} <= ?`);
                        values.push(operand);
                        break;
                    case '$gt':
                        conditions.push(`${pool.escapeId(key)} > ?`);
                        values.push(operand);
                        break;
                    case '$gte':
                        conditions.push(`${pool.escapeId(key)} >= ?`);
                        values.push(operand);
                        break;
                    default:
                        conditions.push(`${pool.escapeId(key)} = ?`);
                        values.push(value);
                        break;
                }
            } else {
                conditions.push(`${pool.escapeId(key)} = ?`);
                values.push(value);
            }
        });
        return conditions.join(' AND ');
    }

    static async aggregate(
        context: { tableName: string; buildWhereClause: (query: QueryObject, values: any[]) => string },
        pipeline: (QueryObject | { $group: { _id: any; [key: string]: any; }; })[]
    ): Promise<any[]> {
        let sql = `SELECT `;
        const values: any[] = [];
        let groupByFields: string[] = [];
        let whereClause = '';

        const groupStage = pipeline.find(p => '$group' in p) as { $group: { _id: any; [key: string]: any; } } | undefined;
        
        if (groupStage) {
            const selectFields: string[] = [];
            
            if (typeof groupStage.$group._id === 'string') {
                const fieldName = groupStage.$group._id.replace('$', '');
                selectFields.push(`${pool.escapeId(fieldName)}`);
                groupByFields.push(`${pool.escapeId(fieldName)}`);
            } else if (typeof groupStage.$group._id === 'object' && groupStage.$group._id !== null) {
                Object.values(groupStage.$group._id).forEach((field: any) => {
                    const fieldName = field.replace('$', '');
                    selectFields.push(`${pool.escapeId(fieldName)}`);
                    groupByFields.push(`${pool.escapeId(fieldName)}`);
                });
            }

            Object.entries(groupStage.$group).forEach(([key, value]) => {
                if (key !== '_id' && typeof value === 'object') {
                    const operator = Object.keys(value)[0];
                    const field = Object.values(value)[0];
                    if (operator === '$sum' || operator === '$count') {
                        selectFields.push(`COUNT(*) as ${pool.escapeId(key)}`);
                    }
                }
            });
            sql += selectFields.join(', ');
        } else {
            sql += '*';
        }

        sql += ` FROM ${context.tableName}`;

        const matchStage = pipeline.find(p => '$match' in p) as { $match: QueryObject } | undefined;
        if (matchStage) {
            whereClause = ' WHERE ' + context.buildWhereClause(matchStage.$match, values);
            sql += whereClause;
        }

        if (groupByFields.length > 0) {
            sql += ` GROUP BY ${groupByFields.join(', ')}`;
        }

        const [rows] = await pool.query(sql, values);
        return rows as any[];
    }
} 