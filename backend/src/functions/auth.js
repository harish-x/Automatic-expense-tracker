const { app } = require('@azure/functions');
const { z } = require('zod');
const { register, login, refreshAccessToken } = require('../auth');

const registerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

function validateRequest(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.issues?.map(e => e.message).join(', ') 
            || result.error.message 
            || 'Validation failed';
        return { error: errors, status: 400 };
    }
    return { data: result.data };
}

app.http('register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const validation = validateRequest(registerSchema, body);
            if (validation.error) {
                return { status: validation.status, jsonBody: { error: validation.error } };
            }

            const { name, email, password } = validation.data;

            const result = await register(name, email, password);
            return { status: 201, jsonBody: result };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 400, jsonBody: { error: error.message } };
        }
    }
});

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const validation = validateRequest(loginSchema, body);
            if (validation.error) {
                return { status: validation.status, jsonBody: { error: validation.error } };
            }

            const { email, password } = validation.data;

            const result = await login(email, password);
            return { jsonBody: result };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 401, jsonBody: { error: error.message } };
        }
    }
});

app.http('refreshToken', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const validation = validateRequest(refreshTokenSchema, body);
            if (validation.error) {
                return { status: validation.status, jsonBody: { error: validation.error } };
            }

            const { refreshToken } = validation.data;

            const result = await refreshAccessToken(refreshToken);
            return { jsonBody: result };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 401, jsonBody: { error: error.message } };
        }
    }
});
