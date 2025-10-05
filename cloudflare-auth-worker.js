/**
 * Data Manager Authentication Cloudflare Worker
 * Handles user registration, passkey authentication, and session management
 * Compatible with Cloudflare D1 database and simplified WebAuthn API
 */

// Simplified WebAuthn implementation for Cloudflare Workers
class SimpleWebAuthn {
    static generateRegistrationOptions(options) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        // Convert challenge to base64 string for frontend compatibility
        const challengeBase64 = btoa(String.fromCharCode(...challenge));
        
        return {
            challenge: challengeBase64,
            rp: { name: options.rpName, id: options.rpID },
            user: {
                id: btoa(options.userID), // Convert to base64 string
                name: options.userName,
                displayName: options.userDisplayName
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: options.authenticatorSelection || {
                userVerification: 'preferred',
                residentKey: 'preferred'
            },
            timeout: 300000,
            attestation: options.attestationType || 'none'
        };
    }

    static generateAuthenticationOptions(options) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        // Convert challenge to base64 string for frontend compatibility
        const challengeBase64 = btoa(String.fromCharCode(...challenge));
        
        return {
            challenge: challengeBase64,
            rpId: options.rpID,
            allowCredentials: options.allowCredentials || [],
            userVerification: options.userVerification || 'preferred',
            timeout: 300000
        };
    }

    static async verifyRegistrationResponse(options) {
        // Simplified verification for demo purposes
        // In production, implement proper CBOR decoding and signature verification
        return {
            verified: true,
            registrationInfo: {
                credentialPublicKey: 'mock_public_key',
                credentialID: options.response.id,
                counter: 0
            }
        };
    }

    static async verifyAuthenticationResponse(options) {
        // Simplified verification for demo purposes
        return {
            verified: true,
            authenticationInfo: {
                newCounter: 1
            }
        };
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // Dynamic CORS headers based on origin
        const origin = request.headers.get('Origin');
        const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [
            'https://data.allfrom0.top',
            'https://polusiti.github.io',
            'http://localhost:3000',
            'http://127.0.0.1:5500'
        ];
        
        const corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Allow-Credentials': 'true'
        };
        
        // Set CORS origin (must be specific when credentials are enabled)
        if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        } else {
            // For credentials, cannot use wildcard - must use specific origin
            corsHeaders['Access-Control-Allow-Origin'] = 'https://data.allfrom0.top';
        }

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Initialize database
            if (path === '/api/auth/init') {
                return await this.initializeDatabase(env, corsHeaders);
            }

            // User registration
            if (path === '/api/auth/register') {
                return await this.registerUser(request, env, corsHeaders);
            }

            // Passkey registration
            if (path === '/api/auth/passkey/register/begin') {
                return await this.beginPasskeyRegistration(request, env, corsHeaders);
            }
            
            if (path === '/api/auth/passkey/register/complete') {
                return await this.completePasskeyRegistration(request, env, corsHeaders);
            }

            // Passkey authentication
            if (path === '/api/auth/passkey/login/begin') {
                return await this.beginPasskeyLogin(request, env, corsHeaders);
            }
            
            if (path === '/api/auth/passkey/login/complete') {
                return await this.completePasskeyLogin(request, env, corsHeaders);
            }

            // Session management
            if (path === '/api/auth/me') {
                return await this.getCurrentUser(request, env, corsHeaders);
            }
            
            if (path === '/api/auth/logout') {
                return await this.logout(request, env, corsHeaders);
            }

            // User management
            if (path.startsWith('/api/auth/user/inquiry/')) {
                const inquiryNumber = path.split('/').pop();
                return await this.getUserByInquiryNumber(inquiryNumber, env, corsHeaders);
            }
            
            if (path === '/api/auth/profile') {
                return await this.updateUserProfile(request, env, corsHeaders);
            }

            // Media management endpoints
            if (path === '/api/media/upload') {
                return await this.uploadMedia(request, env, corsHeaders);
            }
            
            if (path === '/api/media/list') {
                return await this.listUserMedia(request, env, corsHeaders);
            }
            
            if (path.startsWith('/api/media/') && request.method === 'GET') {
                const mediaId = path.split('/').pop();
                return await this.getMediaFile(mediaId, request, env, corsHeaders);
            }
            
            if (path.startsWith('/api/media/') && request.method === 'DELETE') {
                const mediaId = path.split('/').pop();
                return await this.deleteMediaFile(mediaId, request, env, corsHeaders);
            }
            
            if (path.startsWith('/api/media/') && request.method === 'PUT') {
                const mediaId = path.split('/').pop();
                return await this.updateMediaFile(mediaId, request, env, corsHeaders);
            }

            // Admin endpoints
            if (path === '/api/admin/stats') {
                return await this.getAdminStats(request, env, corsHeaders);
            }
            
            if (path === '/api/admin/users') {
                return await this.getAdminUsers(request, env, corsHeaders);
            }
            
            if (path === '/api/admin/promote') {
                return await this.promoteUserToAdmin(request, env, corsHeaders);
            }

            // Initial admin setup (uses admin token instead of session)
            if (path === '/api/admin/setup/promote') {
                return await this.setupInitialAdmin(request, env, corsHeaders);
            }

            // Initial admin user listing
            if (path === '/api/admin/setup/users') {
                return await this.getSetupUsers(request, env, corsHeaders);
            }

            // TikZ Templates endpoints
            if (path === '/api/templates/tikz' && request.method === 'GET') {
                return await this.getTikzTemplates(request, env, corsHeaders);
            }
            if (path === '/api/templates/tikz' && request.method === 'POST') {
                return await this.saveTikzTemplate(request, env, corsHeaders);
            }

            // Public media access (no authentication required)
            if (path.startsWith('/api/public/media/')) {
                const mediaId = path.split('/').pop();
                return await this.getPublicMediaFile(mediaId, env, corsHeaders);
            }

            // Problems endpoints
            if (path === '/api/problems' && request.method === 'GET') {
                return await this.getRecentProblems(request, env, corsHeaders);
            }
            if (path === '/api/problems' && request.method === 'POST') {
                return await this.createProblem(request, env, corsHeaders);
            }
            if (path.startsWith('/api/problems/') && request.method === 'GET') {
                const problemId = path.split('/').pop();
                return await this.getProblemById(problemId, request, env, corsHeaders);
            }

            // Comments endpoints
            if (path.startsWith('/api/comments/problem/') && request.method === 'GET') {
                const problemId = path.split('/').pop();
                return await this.getCommentsByProblem(problemId, request, env, corsHeaders);
            }
            if (path === '/api/comments' && request.method === 'POST') {
                return await this.createComment(request, env, corsHeaders);
            }
            if (path.startsWith('/api/comments/') && request.method === 'DELETE') {
                const commentId = path.split('/').pop();
                return await this.deleteComment(commentId, request, env, corsHeaders);
            }

            // Search endpoints
            if (path === '/api/search/questions') {
                return await this.searchQuestions(request, env, corsHeaders);
            }

            // Admin data management endpoints
            if (path === '/api/admin/seed-sample-data') {
                return await this.seedSampleData(request, env, corsHeaders);
            }

            return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders);
            
        } catch (error) {
            console.error('Authentication error:', error);
            return this.jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
        }
    },

    // Initialize authentication database tables
    async initializeDatabase(env, corsHeaders) {
        try {
            // Create users table
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    userId TEXT UNIQUE NOT NULL,
                    displayName TEXT NOT NULL,
                    email TEXT,
                    inquiryNumber TEXT UNIQUE NOT NULL,
                    registeredAt TEXT NOT NULL,
                    lastLoginAt TEXT,
                    status TEXT DEFAULT 'active',
                    role TEXT DEFAULT 'user',
                    profileData TEXT,
                    storageQuota INTEGER DEFAULT 104857600,
                    storageUsed INTEGER DEFAULT 0
                )
            `).run();

            // Create passkeys table
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS passkeys (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    credentialId TEXT UNIQUE NOT NULL,
                    publicKey TEXT NOT NULL,
                    counter INTEGER DEFAULT 0,
                    createdAt TEXT NOT NULL,
                    lastUsedAt TEXT,
                    FOREIGN KEY (userId) REFERENCES users (id)
                )
            `).run();

            // Create sessions table
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    sessionToken TEXT UNIQUE NOT NULL,
                    createdAt TEXT NOT NULL,
                    expiresAt TEXT NOT NULL,
                    ipAddress TEXT,
                    userAgent TEXT,
                    FOREIGN KEY (userId) REFERENCES users (id)
                )
            `).run();

            // Create challenges table for WebAuthn
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS challenges (
                    id TEXT PRIMARY KEY,
                    challenge TEXT UNIQUE NOT NULL,
                    userId TEXT,
                    type TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    expiresAt TEXT NOT NULL
                )
            `).run();

            // Create media files table for R2 storage metadata
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS media_files (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    originalName TEXT NOT NULL,
                    fileType TEXT NOT NULL,
                    fileSize INTEGER NOT NULL,
                    r2Path TEXT NOT NULL,
                    r2Key TEXT NOT NULL,
                    publicUrl TEXT,
                    subject TEXT,
                    category TEXT DEFAULT 'general',
                    description TEXT,
                    metadata TEXT,
                    uploadDate TEXT NOT NULL,
                    lastAccessed TEXT,
                    isPublic BOOLEAN DEFAULT FALSE,
                    downloadCount INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'active',
                    FOREIGN KEY (userId) REFERENCES users (id)
                )
            `).run();

            // Create media access log table for analytics
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS media_access_log (
                    id TEXT PRIMARY KEY,
                    mediaId TEXT NOT NULL,
                    userId TEXT,
                    accessType TEXT NOT NULL,
                    ipAddress TEXT,
                    userAgent TEXT,
                    accessDate TEXT NOT NULL,
                    FOREIGN KEY (mediaId) REFERENCES media_files (id),
                    FOREIGN KEY (userId) REFERENCES users (id)
                )
            `).run();

            // Create indexes for better performance
            await env.DB.prepare(`
                CREATE INDEX IF NOT EXISTS idx_media_files_user ON media_files(userId)
            `).run();

            await env.DB.prepare(`
                CREATE INDEX IF NOT EXISTS idx_media_files_subject ON media_files(subject, category)
            `).run();

            await env.DB.prepare(`
                CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(fileType)
            `).run();

            // Create questions table for search functionality
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS questions (
                    id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    title TEXT,
                    question_text TEXT NOT NULL,
                    answer_format TEXT,
                    difficulty_level TEXT,
                    difficulty_amount INTEGER,
                    field_code TEXT,
                    choices TEXT, -- JSON string for multiple choice
                    correct_answer INTEGER,
                    explanation TEXT,
                    estimated_time INTEGER,
                    tags TEXT, -- JSON string for tags
                    media_urls TEXT, -- JSON string for media file URLs
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Create question statistics table
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS question_stats (
                    question_id TEXT PRIMARY KEY,
                    times_used INTEGER DEFAULT 0,
                    correct_attempts INTEGER DEFAULT 0,
                    total_attempts INTEGER DEFAULT 0,
                    avg_time_spent REAL DEFAULT 0,
                    last_used DATETIME,
                    FOREIGN KEY (question_id) REFERENCES questions(id)
                )
            `).run();

            // Create indexes for questions
            await env.DB.prepare(`
                CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject, created_at DESC)
            `).run();

            await env.DB.prepare(`
                CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_amount)
            `).run();

            // Create TikZ templates table
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS tikz_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    code TEXT NOT NULL,
                    category TEXT,
                    userId TEXT,
                    createdAt TEXT NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users (id)
                )
            `).run();

            return this.jsonResponse({
                success: true,
                message: 'Authentication and media database initialized successfully',
                tables: ['users', 'passkeys', 'sessions', 'challenges', 'media_files', 'media_access_log', 'questions', 'question_stats', 'tikz_templates']
            }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Database initialization error:', error);
            return this.jsonResponse({
                error: 'Database initialization failed',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // ... (rest of the existing methods from registerUser to the end) ...

    // --- TikZ Template Methods ---

    async getTikzTemplates(request, env, corsHeaders) {
        try {
            const templates = await env.DB.prepare(
                'SELECT * FROM tikz_templates ORDER BY category, name'
            ).all();
            return this.jsonResponse({ success: true, templates: templates.results }, 200, corsHeaders);
        } catch (error) {
            console.error('Get TikZ templates error:', error);
            return this.jsonResponse({ error: 'Failed to fetch TikZ templates' }, 500, corsHeaders);
        }
    },

    async saveTikzTemplate(request, env, corsHeaders) {
        try {
            // Authentication
            const sessionToken = this.getSessionTokenFromRequest(request);
            if (!sessionToken) {
                return this.jsonResponse({ error: 'Authentication required' }, 401, corsHeaders);
            }
            const session = await env.DB.prepare('SELECT userId FROM sessions WHERE sessionToken = ? AND expiresAt > ?').bind(sessionToken, new Date().toISOString()).first();
            if (!session) {
                return this.jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            const data = await request.json();
            const { name, description, code, category } = data;

            if (!name || !code) {
                return this.jsonResponse({ error: 'Missing required fields: name, code' }, 400, corsHeaders);
            }

            const templateId = this.generateId();
            const now = new Date().toISOString();

            await env.DB.prepare(
                `INSERT INTO tikz_templates (id, name, description, code, category, userId, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(templateId, name, description || '', code, category || 'general', session.userId, now).run();

            return this.jsonResponse({ success: true, id: templateId }, 201, corsHeaders);
        } catch (error) {
            console.error('Save TikZ template error:', error);
            return this.jsonResponse({ error: 'Failed to save TikZ template' }, 500, corsHeaders);
        }
    },

    // Helper Methods

    generateId() {
        return crypto.randomUUID();
    },

    generateSessionToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    getSessionTokenFromRequest(request) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.replace('Bearer ', '');
        }
        return null;
    },

    getRpId(request) {
        // Use the Origin header to get the frontend domain, not the Worker domain
        const origin = request.headers.get('Origin');
        if (origin) {
            const originUrl = new URL(origin);
            return originUrl.hostname;
        }
        
        // Fallback to known domains
        const allowedDomains = [
            'data.allfrom0.top',
            'polusiti.github.io',
            'localhost'
        ];
        
        // Default to the primary domain
        return 'data.allfrom0.top';
    },

    getOrigin(request) {
        // Use the Origin header to get the frontend origin, not the Worker origin
        const origin = request.headers.get('Origin');
        if (origin) {
            return origin;
        }
        
        // Fallback to default origin
        return 'https://data.allfrom0.top';
    },

    jsonResponse(data, status = 200, headers = {}) {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });
    },

    // Problems API methods
    async getRecentProblems(request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            const query = `
                SELECT q.id,
                       q.subject,
                       q.title,
                       q.question_text as content,
                       q.difficulty_level as difficulty,
                       q.field_code,
                       q.answer_format as answerFormat,
                       q.choices,
                       q.correct_answer as correctAnswer,
                       q.explanation,
                       q.estimated_time as estimatedTime,
                       q.tags,
                       q.created_at as createdAt,
                       q.updated_at as updatedAt,
                       COALESCE(v.views, 0) as views,
                       0 as solved
                FROM questions q
                LEFT JOIN question_views v ON q.id = v.question_id
                WHERE q.active = 'active'
                ORDER BY q.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const results = await env.DB.prepare(query)
                .bind(limit, offset)
                .all();

            // Parse JSON fields for each problem
            const problems = (results.results || []).map(problem => ({
                ...problem,
                choices: problem.choices ? JSON.parse(problem.choices) : [],
                tags: problem.tags ? JSON.parse(problem.tags) : [],
                difficulty: parseInt(problem.difficulty || 1),
                estimatedTime: parseInt(problem.estimatedTime || 5),
                views: parseInt(problem.views || 0),
                solved: parseInt(problem.solved || 0)
            }));

            return this.jsonResponse({
                success: true,
                problems: problems,
                total: problems.length
            }, 200, corsHeaders);

        } catch (error) {
            console.error('Error fetching recent problems:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to fetch problems'
            }, 500, corsHeaders);
        }
    },

    async createProblem(request, env, corsHeaders) {
        try {
            const problemData = await request.json();

            // Validate required fields
            if (!problemData.title || !problemData.content) {
                return this.jsonResponse({
                    success: false,
                    error: 'Title and content are required'
                }, 400, corsHeaders);
            }

            const problemId = `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const query = `
                INSERT INTO questions (
                    id, subject, title, question_text, answer_format,
                    difficulty_level, difficulty_amount, field_code,
                    choices, correct_answer, explanation, estimated_time,
                    tags, created_at, updated_at, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
            `;

            await env.DB.prepare(query).bind(
                problemId,
                problemData.subject || 'general',
                problemData.title || '',
                problemData.content || '',
                problemData.answerFormat || 'text',
                problemData.difficultyLevel || 'A',
                problemData.difficultyAmount || 1,
                problemData.fieldCode || '',
                JSON.stringify(problemData.choices || []),
                problemData.correctAnswer || 0,
                problemData.explanation || '',
                problemData.estimatedTime || 5,
                JSON.stringify(problemData.tags || [])
            ).run();

            return this.jsonResponse({
                success: true,
                id: problemId,
                message: 'Problem created successfully'
            }, 201, corsHeaders);

        } catch (error) {
            console.error('Error creating problem:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to create problem'
            }, 500, corsHeaders);
        }
    },

    async getProblemById(problemId, request, env, corsHeaders) {
        try {
            const query = `
                SELECT q.*,
                       COALESCE(v.views, 0) as views,
                       COALESCE(s.solved_count, 0) as solved
                FROM questions q
                LEFT JOIN question_views v ON q.id = v.question_id
                LEFT JOIN problem_solved s ON q.id = s.problem_id
                WHERE q.id = ? AND q.active = 'active'
            `;

            const result = await env.DB.prepare(query).bind(problemId).first();

            if (!result) {
                return this.jsonResponse({
                    success: false,
                    error: 'Problem not found'
                }, 404, corsHeaders);
            }

            // Increment view count
            await env.DB.prepare(`
                INSERT INTO question_views (question_id, views, viewed_at)
                VALUES (?, 1, datetime('now'))
                ON CONFLICT(question_id) DO UPDATE SET
                    views = views + 1,
                    viewed_at = datetime('now')
            `).bind(problemId).run();

            return this.jsonResponse({
                success: true,
                problem: result
            }, 200, corsHeaders);

        } catch (error) {
            console.error('Error fetching problem:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to fetch problem'
            }, 500, corsHeaders);
        }
    },

    // Comments API methods
    async getCommentsByProblem(problemId, request, env, corsHeaders) {
        try {
            const url = new URL(request.url);
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');

            const query = `
                SELECT c.id, c.problem_id, c.content, c.author_name, c.likes, c.created_at,
                       u.displayName as author_display_name
                FROM comments c
                LEFT JOIN users u ON c.author_id = u.id
                WHERE c.problem_id = ?
                ORDER BY c.created_at ASC
                LIMIT ? OFFSET ?
            `;

            const results = await env.DB.prepare(query)
                .bind(problemId, limit, offset)
                .all();

            const comments = (results.results || []).map(comment => ({
                id: comment.id,
                problem_id: comment.problem_id,
                content: comment.content,
                author: comment.author_name || comment.author_display_name || '匿名',
                likes: parseInt(comment.likes || 0),
                created_at: comment.created_at
            }));

            return this.jsonResponse({
                success: true,
                comments: comments,
                total: comments.length
            }, 200, corsHeaders);

        } catch (error) {
            console.error('Error fetching comments:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to fetch comments'
            }, 500, corsHeaders);
        }
    },

    async createComment(request, env, corsHeaders) {
        try {
            const commentData = await request.json();

            // Validate required fields
            if (!commentData.problem_id || !commentData.content) {
                return this.jsonResponse({
                    success: false,
                    error: 'Problem ID and content are required'
                }, 400, corsHeaders);
            }

            const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const query = `
                INSERT INTO comments (
                    id, problem_id, author_id, author_name, content, likes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `;

            await env.DB.prepare(query).bind(
                commentId,
                commentData.problem_id,
                commentData.author_id || null,
                commentData.author_name || '匿名',
                commentData.content,
                0
            ).run();

            return this.jsonResponse({
                success: true,
                id: commentId,
                message: 'Comment created successfully'
            }, 201, corsHeaders);

        } catch (error) {
            console.error('Error creating comment:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to create comment'
            }, 500, corsHeaders);
        }
    },

    async deleteComment(commentId, request, env, corsHeaders) {
        try {
            const result = await env.DB.prepare('DELETE FROM comments WHERE id = ?')
                .bind(commentId)
                .run();

            if (result.changes === 0) {
                return this.jsonResponse({
                    success: false,
                    error: 'Comment not found'
                }, 404, corsHeaders);
            }

            return this.jsonResponse({
                success: true,
                message: 'Comment deleted successfully'
            }, 200, corsHeaders);

        } catch (error) {
            console.error('Error deleting comment:', error);
            return this.jsonResponse({
                success: false,
                error: 'Failed to delete comment'
            }, 500, corsHeaders);
        }
    }
};