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
        };
        
        // Set CORS origin
        if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        } else {
            corsHeaders['Access-Control-Allow-Origin'] = '*'; // Fallback for testing
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

            // Public media access (no authentication required)
            if (path.startsWith('/api/public/media/')) {
                const mediaId = path.split('/').pop();
                return await this.getPublicMediaFile(mediaId, env, corsHeaders);
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

            return this.jsonResponse({
                success: true,
                message: 'Authentication and media database initialized successfully',
                tables: ['users', 'passkeys', 'sessions', 'challenges', 'media_files', 'media_access_log', 'questions', 'question_stats']
            }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Database initialization error:', error);
            return this.jsonResponse({
                error: 'Database initialization failed',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Register new user
    async registerUser(request, env, corsHeaders) {
        try {
            const userData = await request.json();
            const { userId, displayName, email, inquiryNumber } = userData;

            // Validate required fields
            if (!userId || !displayName || !inquiryNumber) {
                return this.jsonResponse({
                    error: 'Missing required fields: userId, displayName, inquiryNumber' 
                }, 400, corsHeaders);
            }

            // Check if user already exists
            const existingUser = await env.DB.prepare(
                'SELECT id FROM users WHERE userId = ? OR inquiryNumber = ?'
            ).bind(userId, inquiryNumber).first();

            if (existingUser) {
                return this.jsonResponse({
                    error: 'User ID or inquiry number already exists' 
                }, 409, corsHeaders);
            }

            // Create new user
            const userIdGenerated = this.generateId();
            const now = new Date().toISOString();
            
            await env.DB.prepare(`
                INSERT INTO users (id, userId, displayName, email, inquiryNumber, registeredAt, status, role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                userIdGenerated,
                userId,
                displayName,
                email || null,
                inquiryNumber,
                now,
                'active',
                'user'
            ).run();

            const newUser = {
                id: userIdGenerated,
                userId,
                displayName,
                email,
                inquiryNumber,
                registeredAt: now,
                status: 'active',
                role: 'user'
            };

            return this.jsonResponse({
                success: true, 
                user: newUser 
            }, 201, corsHeaders);
            
        } catch (error) {
            console.error('User registration error:', error);
            return this.jsonResponse({
                error: 'User registration failed',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Begin passkey registration
    async beginPasskeyRegistration(request, env, corsHeaders) {
        try {
            const { userId } = await request.json();
            
            // Get user
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE id = ?'
            ).bind(userId).first();

            if (!user) {
                return this.jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            }

            // Generate registration options
            const options = SimpleWebAuthn.generateRegistrationOptions({
                rpName: 'Data Manager',
                rpID: this.getRpId(request),
                userID: userId,
                userName: user.userId,
                userDisplayName: user.displayName,
                attestationType: 'none',
                authenticatorSelection: {
                    userVerification: 'preferred',
                    residentKey: 'preferred'
                }
            });

            // Store challenge
            const challengeId = this.generateId();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
            
            await env.DB.prepare(`
                INSERT INTO challenges (id, challenge, userId, type, createdAt, expiresAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                challengeId,
                options.challenge,
                userId,
                'registration',
                new Date().toISOString(),
                expiresAt
            ).run();

            return this.jsonResponse(options, 200, corsHeaders);
            
        } catch (error) {
            console.error('Passkey registration begin error:', error);
            return this.jsonResponse({
                error: 'Failed to begin passkey registration',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Complete passkey registration
    async completePasskeyRegistration(request, env, corsHeaders) {
        try {
            const { userId, credential } = await request.json();
            
            // Get stored challenge
            const challenge = await env.DB.prepare(
                'SELECT challenge FROM challenges WHERE userId = ? AND type = ? AND expiresAt > ?'
            ).bind(userId, 'registration', new Date().toISOString()).first();

            if (!challenge) {
                return this.jsonResponse({
                    error: 'Invalid or expired challenge' 
                }, 400, corsHeaders);
            }

            // Verify registration response
            const verification = await SimpleWebAuthn.verifyRegistrationResponse({
                response: credential,
                expectedChallenge: challenge.challenge,
                expectedOrigin: this.getOrigin(request),
                expectedRPID: this.getRpId(request)
            });

            if (!verification.verified) {
                return this.jsonResponse({
                    error: 'Passkey registration verification failed' 
                }, 400, corsHeaders);
            }

            // Store passkey
            const passkeyId = this.generateId();
            const now = new Date().toISOString();
            
            await env.DB.prepare(`
                INSERT INTO passkeys (id, userId, credentialId, publicKey, counter, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                passkeyId,
                userId,
                credential.id,
                JSON.stringify(verification.registrationInfo),
                verification.registrationInfo.counter,
                now
            ).run();

            // Clean up challenge
            await env.DB.prepare(
                'DELETE FROM challenges WHERE userId = ? AND type = ?'
            ).bind(userId, 'registration').run();

            return this.jsonResponse({
                success: true, 
                verified: true 
            }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Passkey registration complete error:', error);
            return this.jsonResponse({
                error: 'Failed to complete passkey registration',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Begin passkey login
    async beginPasskeyLogin(request, env, corsHeaders) {
        try {
            const { userId } = await request.json();
            
            // Get user
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE userId = ?'
            ).bind(userId).first();

            if (!user) {
                return this.jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            }

            // Get user's passkeys
            const passkeys = await env.DB.prepare(
                'SELECT credentialId FROM passkeys WHERE userId = ?'
            ).bind(user.id).all();

            // Generate authentication options
            const options = SimpleWebAuthn.generateAuthenticationOptions({
                rpID: this.getRpId(request),
                allowCredentials: passkeys.results.map(pk => ({
                    id: pk.credentialId,
                    type: 'public-key'
                })),
                userVerification: 'preferred'
            });

            // Store challenge
            const challengeId = this.generateId();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
            
            await env.DB.prepare(`
                INSERT INTO challenges (id, challenge, userId, type, createdAt, expiresAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                challengeId,
                options.challenge,
                user.id,
                'authentication',
                new Date().toISOString(),
                expiresAt
            ).run();

            return this.jsonResponse(options, 200, corsHeaders);
            
        } catch (error) {
            console.error('Passkey login begin error:', error);
            return this.jsonResponse({
                error: 'Failed to begin passkey login',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Complete passkey login
    async completePasskeyLogin(request, env, corsHeaders) {
        try {
            const { userId, assertion } = await request.json();
            
            // Get user
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE userId = ?'
            ).bind(userId).first();

            if (!user) {
                return this.jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            }

            // Get stored challenge
            const challenge = await env.DB.prepare(
                'SELECT challenge FROM challenges WHERE userId = ? AND type = ? AND expiresAt > ?'
            ).bind(user.id, 'authentication', new Date().toISOString()).first();

            if (!challenge) {
                return this.jsonResponse({
                    error: 'Invalid or expired challenge' 
                }, 400, corsHeaders);
            }

            // Get passkey
            const passkey = await env.DB.prepare(
                'SELECT * FROM passkeys WHERE credentialId = ? AND userId = ?'
            ).bind(assertion.id, user.id).first();

            if (!passkey) {
                return this.jsonResponse({
                    error: 'Passkey not found' 
                }, 404, corsHeaders);
            }

            // Verify authentication response
            const verification = await SimpleWebAuthn.verifyAuthenticationResponse({
                response: assertion,
                expectedChallenge: challenge.challenge,
                expectedOrigin: this.getOrigin(request),
                expectedRPID: this.getRpId(request),
                authenticator: JSON.parse(passkey.publicKey),
                expectedType: 'webauthn.get'
            });

            if (!verification.verified) {
                return this.jsonResponse({
                    error: 'Passkey authentication verification failed' 
                }, 400, corsHeaders);
            }

            // Update passkey counter and last used
            const now = new Date().toISOString();
            await env.DB.prepare(
                'UPDATE passkeys SET counter = ?, lastUsedAt = ? WHERE id = ?'
            ).bind(verification.authenticationInfo.newCounter, now, passkey.id).run();

            // Update user last login
            await env.DB.prepare(
                'UPDATE users SET lastLoginAt = ? WHERE id = ?'
            ).bind(now, user.id).run();

            // Create session
            const sessionToken = this.generateSessionToken();
            const sessionId = this.generateId();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
            
            await env.DB.prepare(`
                INSERT INTO sessions (id, userId, sessionToken, createdAt, expiresAt, ipAddress, userAgent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                sessionId,
                user.id,
                sessionToken,
                now,
                expiresAt,
                request.headers.get('cf-connecting-ip') || 'unknown',
                request.headers.get('user-agent') || 'unknown'
            ).run();

            // Clean up challenge
            await env.DB.prepare(
                'DELETE FROM challenges WHERE userId = ? AND type = ?'
            ).bind(user.id, 'authentication').run();

            return this.jsonResponse({
                success: true,
                sessionToken,
                user: {
                    id: user.id,
                    userId: user.userId,
                    displayName: user.displayName,
                    email: user.email,
                    inquiryNumber: user.inquiryNumber,
                    role: user.role
                }
            }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Passkey login complete error:', error);
            return this.jsonResponse({
                error: 'Failed to complete passkey login',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Get current user from session
    async getCurrentUser(request, env, corsHeaders) {
        try {
            const sessionToken = this.getSessionTokenFromRequest(request);
            if (!sessionToken) {
                return this.jsonResponse({ error: 'No session token' }, 401, corsHeaders);
            }

            const session = await env.DB.prepare(`
                SELECT s.*, u.* FROM sessions s 
                JOIN users u ON s.userId = u.id 
                WHERE s.sessionToken = ? AND s.expiresAt > ?
            `).bind(sessionToken, new Date().toISOString()).first();

            if (!session) {
                return this.jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            return this.jsonResponse({
                id: session.id,
                userId: session.userId,
                displayName: session.displayName,
                email: session.email,
                inquiryNumber: session.inquiryNumber,
                role: session.role
            }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Get current user error:', error);
            return this.jsonResponse({
                error: 'Failed to get current user',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Logout user
    async logout(request, env, corsHeaders) {
        try {
            const sessionToken = this.getSessionTokenFromRequest(request);
            if (sessionToken) {
                await env.DB.prepare(
                    'DELETE FROM sessions WHERE sessionToken = ?'
                ).bind(sessionToken).run();
            }

            return this.jsonResponse({ success: true }, 200, corsHeaders);
            
        } catch (error) {
            console.error('Logout error:', error);
            return this.jsonResponse({
                error: 'Logout failed',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Get user by inquiry number
    async getUserByInquiryNumber(inquiryNumber, env, corsHeaders) {
        try {
            // This endpoint requires admin authentication
            const user = await env.DB.prepare(
                'SELECT id, userId, displayName, email, inquiryNumber, registeredAt, lastLoginAt, status, role FROM users WHERE inquiryNumber = ?'
            ).bind(inquiryNumber).first();

            if (!user) {
                return this.jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            }

            return this.jsonResponse(user, 200, corsHeaders);
            
        } catch (error) {
            console.error('Get user by inquiry number error:', error);
            return this.jsonResponse({
                error: 'Failed to get user',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Update user profile
    async updateUserProfile(request, env, corsHeaders) {
        try {
            const sessionToken = this.getSessionTokenFromRequest(request);
            if (!sessionToken) {
                return this.jsonResponse({ error: 'Authentication required' }, 401, corsHeaders);
            }

            const session = await env.DB.prepare(
                'SELECT userId FROM sessions WHERE sessionToken = ? AND expiresAt > ?'
            ).bind(sessionToken, new Date().toISOString()).first();

            if (!session) {
                return this.jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            const updates = await request.json();
            const allowedFields = ['displayName', 'email'];
            const updateFields = [];
            const updateValues = [];

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(updates[field]);
                }
            }

            if (updateFields.length === 0) {
                return this.jsonResponse({ error: 'No valid fields to update' }, 400, corsHeaders);
            }

            updateValues.push(session.userId);
            
            await env.DB.prepare(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
            ).bind(...updateValues).run();

            // Get updated user
            const updatedUser = await env.DB.prepare(
                'SELECT id, userId, displayName, email, inquiryNumber, role FROM users WHERE id = ?'
            ).bind(session.userId).first();

            return this.jsonResponse(updatedUser, 200, corsHeaders);
            
        } catch (error) {
            console.error('Update user profile error:', error);
            return this.jsonResponse({
                error: 'Failed to update profile',
                details: error.message 
            }, 500, corsHeaders);
        }
    },

    // Media Management Methods

    // Upload media file to R2 with authentication
    async uploadMedia(request, env, corsHeaders) {
        try {
            const sessionToken = this.getSessionTokenFromRequest(request);
            if (!sessionToken) {
                return this.jsonResponse({ error: 'Authentication required' }, 401, corsHeaders);
            }

            // Verify session
            const session = await env.DB.prepare(
                'SELECT userId FROM sessions WHERE sessionToken = ? AND expiresAt > ?'
            ).bind(sessionToken, new Date().toISOString()).first();

            if (!session) {
                return this.jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            // Get user info
            const user = await env.DB.prepare(
                'SELECT id, displayName, storageQuota, storageUsed FROM users WHERE id = ?'
            ).bind(session.userId).first();

            if (!user) {
                return this.jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            }

            // Parse multipart form data
            const formData = await request.formData();
            const file = formData.get('file');
            const subject = formData.get('subject') || 'general';
            const category = formData.get('category') || 'general';
            const description = formData.get('description') || '';
            const isPublic = formData.get('isPublic') === 'true';

            if (!file) {
                return this.jsonResponse({ error: 'No file provided' }, 400, corsHeaders);
            }

            // Validate file type and size
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                                'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
            
            if (!allowedTypes.includes(file.type)) {
                return this.jsonResponse({
                    error: 'Unsupported file type',
                    allowedTypes: allowedTypes 
                }, 400, corsHeaders);
            }

            const maxFileSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxFileSize) {
                return this.jsonResponse({
                    error: 'File too large',
                    maxSize: maxFileSize,
                    fileSize: file.size 
                }, 400, corsHeaders);
            }

            // Check user storage quota
            if (user.storageUsed + file.size > user.storageQuota) {
                return this.jsonResponse({
                    error: 'Storage quota exceeded',
                    quota: user.storageQuota,
                    used: user.storageUsed,
                    needed: file.size 
                }, 413, corsHeaders);
            }

            // Generate unique filename and R2 path
            const fileExtension = file.name.split('.').pop();
            const mediaId = this.generateId();
            const filename = `${mediaId}.${fileExtension}`;
            const r2Key = `users/${user.id}/${subject}/${category}/${filename}`;

            // Upload to R2
            await env.MEDIA_BUCKET.put(r2Key, file.stream(), {
                httpMetadata: {
                    contentType: file.type,
                    contentDisposition: `attachment; filename="${file.name}"