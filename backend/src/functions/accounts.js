const { app } = require('@azure/functions');
const { z } = require('zod');
const { connectToDatabase } = require('../db');
const Account = require('../models/accounts');
const { authMiddleware } = require('../middleware/auth');

const createAccountSchema = z.object({
    bank_name: z.string().min(1, 'Bank name is required'),
    account_mask: z.string().min(1, 'Account mask is required')
});

const updateAccountSchema = z.object({
    bank_name: z.string().min(1, 'Bank name cannot be empty').optional(),
    account_mask: z.string().min(1, 'Account mask cannot be empty').optional()
}).refine(data => data.bank_name || data.account_mask, {
    message: 'At least one field (bank_name or account_mask) is required'
});

const idQuerySchema = z.object({
    id: z.string().min(1, 'Account ID is required')
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

app.http('createAccount', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const auth = authMiddleware(request);
            if (auth.error) {
                return { status: auth.status, jsonBody: { error: auth.error } };
            }

            const body = await request.json();
            const validation = validateRequest(createAccountSchema, body);
            if (validation.error) {
                return { status: validation.status, jsonBody: { error: validation.error } };
            }

            const { bank_name, account_mask } = validation.data;

            await connectToDatabase();

            const account = new Account({
                user: auth.user.userId,
                bank_name,
                account_mask
            });

            await account.save();

            return { status: 201, jsonBody: { account } };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});

app.http('updateAccount', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const auth = authMiddleware(request);
            if (auth.error) {
                return { status: auth.status, jsonBody: { error: auth.error } };
            }

            const queryValidation = validateRequest(idQuerySchema, { id: request.query.get('id') });
            if (queryValidation.error) {
                return { status: queryValidation.status, jsonBody: { error: queryValidation.error } };
            }
            const accountId = queryValidation.data.id;

            const body = await request.json();
            const bodyValidation = validateRequest(updateAccountSchema, body);
            if (bodyValidation.error) {
                return { status: bodyValidation.status, jsonBody: { error: bodyValidation.error } };
            }

            const { bank_name, account_mask } = bodyValidation.data;

            await connectToDatabase();

            const account = await Account.findOne({ _id: accountId, user: auth.user.userId });
            if (!account) {
                return { status: 404, jsonBody: { error: 'Account not found' } };
            }

            if (bank_name) account.bank_name = bank_name;
            if (account_mask) account.account_mask = account_mask;

            await account.save();

            return { jsonBody: { account } };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});

app.http('deleteAccount', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const auth = authMiddleware(request);
            if (auth.error) {
                return { status: auth.status, jsonBody: { error: auth.error } };
            }
            context.log("heeeeeeeeeeeeeeeeeeeeeeeeeeeeelo", request.query.get('id'))
            const queryValidation = validateRequest(idQuerySchema, { id: request.query.get('id') });
            if (queryValidation.error) {
                return { status: queryValidation.status, jsonBody: { error: queryValidation.error } };
            }
            const accountId = queryValidation.data.id;

            await connectToDatabase();

            const account = await Account.findOneAndDelete({ _id: accountId, user: auth.user.userId });
            if (!account) {
                return { status: 404, jsonBody: { error: 'Account not found' } };
            }

            return { jsonBody: { message: 'Account deleted successfully' } };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});

app.http('getAccounts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const auth = authMiddleware(request);
            if (auth.error) {
                return { status: auth.status, jsonBody: { error: auth.error } };
            }

            await connectToDatabase();

            const accounts = await Account.find({ user: auth.user.userId }).sort({ createdAt: -1 });

            return { jsonBody: { accounts } };
        } catch (error) {
            context.log('ERROR:', error.message);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});