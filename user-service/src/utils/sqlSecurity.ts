export class SQLSecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SQLSecurityError';
    }
}

export function safeSanitizeInteger(
    value: any, 
    defaultValue: number = 0, 
    min: number = 0, 
    max: number = Number.MAX_SAFE_INTEGER
): number {
    const num = Math.floor(Number(value));
    
    if (isNaN(num)) {
        return defaultValue;
    }
    
    if (num < min || num > max) {
        throw new SQLSecurityError(`Value ${num} is outside allowed range ${min}-${max}`);
    }
    
    return num;
}

export function validatePaginationParams(page: any, limit: any) {
    const safePage = safeSanitizeInteger(page, 1, 1, 1000000);
    const safeLimit = safeSanitizeInteger(limit, 10, 1, 100);
    
    return { page: safePage, limit: safeLimit };
}

export function sanitizeString(input: any, maxLength: number = 255): string {
    if (typeof input !== 'string') {
        throw new SQLSecurityError('Input must be a string');
    }
    
    if (input.length > maxLength) {
        throw new SQLSecurityError(`String length exceeds maximum ${maxLength}`);
    }
    
    const dangerousPatterns = [
        /\bUNION\b/i, /\bSELECT\b/i, /\bINSERT\b/i, /\bUPDATE\b/i,
        /\bDELETE\b/i, /\bDROP\b/i, /\bCREATE\b/i, /\bALTER\b/i,
        /\bEXEC\b/i, /\bSCRIPT\b/i, /--/, /\/\*/, /\*\//
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            throw new SQLSecurityError(`Input contains dangerous SQL pattern`);
        }
    }
    
    return input.trim();
}