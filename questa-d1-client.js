/**
 * Questa D1 Client Library - Real Implementation
 * Cloudflare D1 Database Integration for Question Management
 */

class QuestaD1Client {
    constructor(config = {}) {
        this.accountId = config.accountId || 'ba21c5b4812c8151fe16474a782a12d8';
        this.databaseId = config.databaseId || '591e73d7-50a4-48a7-8732-5d752669b7ab';
        this.apiToken = config.apiToken || '979qaSPTwReNQMzibGKohQiHPELJBbQVLNJerYBy';
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
        
        // Initialize database schema on first use
        this.initialized = false;
    }

    /**
     * Execute SQL query against D1
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async executeQuery(sql, params = []) {
        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sql: sql,
                    params: params
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.errors?.[0]?.message || 'D1 query failed');
            }

            return {
                success: true,
                results: result.result?.[0]?.results || [],
                meta: result.result?.[0]?.meta || {}
            };
        } catch (error) {
            console.error('D1 Query Error:', error);
            
            // フォールバックとしてローカルストレージを使用
            if (this.enableLocalFallback) {
                return this.executeLocalQuery(sql, params);
            }
            
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Initialize database tables
     */
    async initializeDatabase() {
        if (this.initialized) return { success: true };

        try {
            // Create questions table
            const createQuestionsTable = `
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
            `;

            const result1 = await this.executeQuery(createQuestionsTable);
            if (!result1.success) {
                throw new Error('Failed to create questions table: ' + result1.error);
            }

            // Create statistics table
            const createStatsTable = `
                CREATE TABLE IF NOT EXISTS question_stats (
                    question_id TEXT PRIMARY KEY,
                    times_used INTEGER DEFAULT 0,
                    correct_attempts INTEGER DEFAULT 0,
                    total_attempts INTEGER DEFAULT 0,
                    avg_time_spent REAL DEFAULT 0,
                    last_used DATETIME,
                    FOREIGN KEY (question_id) REFERENCES questions(id)
                )
            `;

            const result2 = await this.executeQuery(createStatsTable);
            if (!result2.success) {
                throw new Error('Failed to create stats table: ' + result2.error);
            }

            // Create comments table
            const createCommentsTable = `
                CREATE TABLE IF NOT EXISTS comments (
                    id TEXT PRIMARY KEY,
                    problem_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    author_inquiry_number TEXT,
                    content TEXT NOT NULL,
                    media_urls TEXT, -- JSON string for media attachments
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    likes INTEGER DEFAULT 0,
                    parent_id TEXT NULL, -- For reply comments
                    is_reported BOOLEAN DEFAULT FALSE,
                    is_deleted BOOLEAN DEFAULT FALSE
                )
            `;

            const result3 = await this.executeQuery(createCommentsTable);
            if (!result3.success) {
                throw new Error('Failed to create comments table: ' + result3.error);
            }

            // Create comment likes table
            const createCommentLikesTable = `
                CREATE TABLE IF NOT EXISTS comment_likes (
                    id TEXT PRIMARY KEY,
                    comment_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(comment_id, user_id),
                    FOREIGN KEY (comment_id) REFERENCES comments(id)
                )
            `;

            const result4 = await this.executeQuery(createCommentLikesTable);
            if (!result4.success) {
                throw new Error('Failed to create comment_likes table: ' + result4.error);
            }

            // Create indexes for faster queries
            const createIndexes = [
                `CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject, created_at DESC)`,
                `CREATE INDEX IF NOT EXISTS idx_comments_problem ON comments(problem_id, created_at DESC)`,
                `CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at ASC)`,
                `CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id)`
            ];

            for (const indexSql of createIndexes) {
                const indexResult = await this.executeQuery(indexSql);
                if (!indexResult.success) {
                    console.warn('Failed to create index:', indexResult.error);
                }
            }

            this.initialized = true;
            return { success: true, message: 'Database initialized successfully' };
        } catch (error) {
            console.error('Database initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save question data to D1
     * @param {Object} question - Question data
     * @returns {Promise<Object>} Save result
     */
    async saveQuestion(question) {
        try {
            await this.initializeDatabase();

            const questionData = {
                id: question.id || this.generateId(),
                subject: question.subject || 'english',
                title: question.title || '',
                question_text: question.questionText || question.question_text || '',
                answer_format: question.answerFormat || question.answer_format || 'A1',
                difficulty_level: question.difficultyLevel || question.difficulty_level || 'B',
                difficulty_amount: question.difficultyAmount || question.difficulty_amount || 2,
                field_code: question.fieldCode || question.field_code || '',
                choices: question.choices ? JSON.stringify(question.choices) : null,
                correct_answer: question.correctAnswer || question.correct_answer || null,
                explanation: question.explanation || '',
                estimated_time: question.estimatedTime || question.estimated_time || 5,
                tags: question.tags ? JSON.stringify(question.tags) : null,
                media_urls: question.mediaUrls ? JSON.stringify(question.mediaUrls) : null
            };

            const sql = `
                INSERT OR REPLACE INTO questions (
                    id, subject, title, question_text, answer_format, 
                    difficulty_level, difficulty_amount, field_code, 
                    choices, correct_answer, explanation, estimated_time, 
                    tags, media_urls, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            const params = [
                questionData.id,
                questionData.subject,
                questionData.title,
                questionData.question_text,
                questionData.answer_format,
                questionData.difficulty_level,
                questionData.difficulty_amount,
                questionData.field_code,
                questionData.choices,
                questionData.correct_answer,
                questionData.explanation,
                questionData.estimated_time,
                questionData.tags,
                questionData.media_urls
            ];

            const result = await this.executeQuery(sql, params);
            
            if (result.success) {
                return {
                    success: true,
                    data: { ...questionData, created_at: new Date().toISOString() }
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Save Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get questions by subject
     * @param {string} subject - Subject name
     * @param {Object} filters - Optional filters
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} Questions list
     */
    async getQuestionsBySubject(subject, filters = {}, limit = 50, offset = 0) {
        try {
            await this.initializeDatabase();

            let sql = `
                SELECT q.*, 
                       s.times_used, s.correct_attempts, s.total_attempts, s.avg_time_spent
                FROM questions q
                LEFT JOIN question_stats s ON q.id = s.question_id
                WHERE q.subject = ?
            `;
            
            let params = [subject];

            // Apply filters
            if (filters.difficulty_level) {
                sql += ' AND q.difficulty_level = ?';
                params.push(filters.difficulty_level);
            }

            if (filters.answer_format) {
                sql += ' AND q.answer_format = ?';
                params.push(filters.answer_format);
            }

            if (filters.field_code) {
                sql += ' AND q.field_code = ?';
                params.push(filters.field_code);
            }

            if (filters.search) {
                sql += ' AND (q.title LIKE ? OR q.question_text LIKE ? OR q.tags LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Apply sorting
            const sortColumn = filters.sort_by || 'updated_at';
            const sortOrder = filters.sort_order || 'DESC';
            sql += ` ORDER BY q.${sortColumn} ${sortOrder}`;

            // Apply pagination
            sql += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const result = await this.executeQuery(sql, params);
            
            if (result.success) {
                return {
                    success: true,
                    questions: result.results.map(q => this.formatQuestion(q)),
                    total: result.results.length,
                    hasMore: result.results.length === limit
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Get Questions Error:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        }
    }

    /**
     * Search questions across all subjects
     * @param {string} query - Search query
     * @param {Object} filters - Search filters
     * @param {string} sort - Sort option
     * @param {number} limit - Results limit
     * @param {number} offset - Results offset
     * @returns {Promise<Array>} Search results
     */
    async searchQuestions(query = '', filters = {}, sort = 'created_desc', limit = 20, offset = 0) {
        try {
            await this.initializeDatabase();

            let sql = `
                SELECT q.*, 
                       s.times_used, s.correct_attempts, s.total_attempts, s.avg_time_spent
                FROM questions q
                LEFT JOIN question_stats s ON q.id = s.question_id
                WHERE 1=1
            `;
            
            let params = [];

            // Apply text search
            if (query && query.trim()) {
                sql += ' AND (q.title LIKE ? OR q.question_text LIKE ? OR q.tags LIKE ?)';
                const searchTerm = `%${query.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Apply subject filter
            if (filters.subjects && filters.subjects.length > 0) {
                const placeholders = filters.subjects.map(() => '?').join(',');
                sql += ` AND q.subject IN (${placeholders})`;
                params.push(...filters.subjects);
            }

            // Apply difficulty filter
            if (filters.difficulties && filters.difficulties.length > 0) {
                const placeholders = filters.difficulties.map(() => '?').join(',');
                sql += ` AND q.difficulty_level IN (${placeholders})`;
                params.push(...filters.difficulties);
            }

            // Apply answer format filter
            if (filters.answer_formats && filters.answer_formats.length > 0) {
                const placeholders = filters.answer_formats.map(() => '?').join(',');
                sql += ` AND q.answer_format IN (${placeholders})`;
                params.push(...filters.answer_formats);
            }

            // Apply sorting
            switch (sort) {
                case 'created_desc':
                    sql += ' ORDER BY q.created_at DESC';
                    break;
                case 'created_asc':
                    sql += ' ORDER BY q.created_at ASC';
                    break;
                case 'difficulty_asc':
                    sql += ' ORDER BY q.difficulty_level ASC, q.created_at DESC';
                    break;
                case 'difficulty_desc':
                    sql += ' ORDER BY q.difficulty_level DESC, q.created_at DESC';
                    break;
                case 'relevance':
                    if (query) {
                        sql += ` ORDER BY (
                            CASE WHEN q.title LIKE ? THEN 10 ELSE 0 END +
                            CASE WHEN q.question_text LIKE ? THEN 5 ELSE 0 END +
                            CASE WHEN q.tags LIKE ? THEN 3 ELSE 0 END
                        ) DESC, q.created_at DESC`;
                        const searchTerm = `%${query}%`;
                        params.push(searchTerm, searchTerm, searchTerm);
                    } else {
                        sql += ' ORDER BY q.created_at DESC';
                    }
                    break;
                default:
                    sql += ' ORDER BY q.created_at DESC';
            }

            // Apply pagination
            sql += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const result = await this.executeQuery(sql, params);
            
            if (result.success) {
                return result.results.map(q => this.formatQuestion(q));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Search Error:', error);
            // Fallback to local storage search
            return this.searchQuestionsFromLocalStorage(query, filters, sort, limit, offset);
        }
    }

    /**
     * Get search suggestions
     * @param {string} query - Query for suggestions
     * @param {number} limit - Limit suggestions
     * @returns {Promise<Array>} Suggestions
     */
    async getSearchSuggestions(query, limit = 10) {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            await this.initializeDatabase();

            // Get title suggestions
            let sql = `
                SELECT DISTINCT title 
                FROM questions 
                WHERE title LIKE ? 
                LIMIT ?
            `;
            let params = [`%${query}%`, Math.floor(limit / 2)];
            
            const titleResult = await this.executeQuery(sql, params);
            
            // Get tag suggestions
            sql = `
                SELECT DISTINCT tags 
                FROM questions 
                WHERE tags LIKE ? 
                LIMIT ?
            `;
            params = [`%${query}%`, Math.floor(limit / 2)];
            
            const tagResult = await this.executeQuery(sql, params);
            
            const suggestions = [];
            
            // Add title suggestions
            if (titleResult.success) {
                titleResult.results.forEach(row => {
                    if (row.title) suggestions.push(row.title);
                });
            }
            
            // Add tag suggestions
            if (tagResult.success) {
                tagResult.results.forEach(row => {
                    if (row.tags) {
                        try {
                            const tags = JSON.parse(row.tags);
                            if (Array.isArray(tags)) {
                                tags.forEach(tag => {
                                    if (tag.toLowerCase().includes(query.toLowerCase())) {
                                        suggestions.push(tag);
                                    }
                                });
                            }
                        } catch (e) {
                            // Ignore malformed JSON
                        }
                    }
                });
            }
            
            return [...new Set(suggestions)].slice(0, limit);
            
        } catch (error) {
            console.error('Suggestions Error:', error);
            return [];
        }
    }

    /**
     * Search questions from localStorage as fallback
     */
    async searchQuestionsFromLocalStorage(query, filters, sort, limit, offset) {
        console.log('🔍 Searching from localStorage fallback');
        
        const allQuestions = await this.getAllQuestionsFromLocalStorage();
        let filteredQuestions = allQuestions;

        // Apply text search
        if (query && query.trim()) {
            const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
            filteredQuestions = filteredQuestions.filter(question => {
                const searchText = `${question.title || ''} ${question.question_text || question.question || ''} ${(question.tags || []).join(' ')}`.toLowerCase();
                return searchTerms.some(term => searchText.includes(term));
            });
        }

        // Apply filters
        if (filters.subjects && filters.subjects.length > 0) {
            filteredQuestions = filteredQuestions.filter(q => filters.subjects.includes(q.subject));
        }

        if (filters.difficulties && filters.difficulties.length > 0) {
            filteredQuestions = filteredQuestions.filter(q => filters.difficulties.includes(q.difficulty_level || q.difficulty));
        }

        if (filters.answer_formats && filters.answer_formats.length > 0) {
            filteredQuestions = filteredQuestions.filter(q => filters.answer_formats.includes(q.answer_format || q.answerFormat));
        }

        // Apply sorting
        filteredQuestions.sort((a, b) => {
            switch (sort) {
                case 'created_desc':
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                case 'created_asc':
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                case 'difficulty_asc':
                    return (a.difficulty_level || a.difficulty || 0) - (b.difficulty_level || b.difficulty || 0);
                case 'difficulty_desc':
                    return (b.difficulty_level || b.difficulty || 0) - (a.difficulty_level || a.difficulty || 0);
                case 'relevance':
                    if (!query) return 0;
                    const scoreA = this.calculateRelevanceScore(a, query);
                    const scoreB = this.calculateRelevanceScore(b, query);
                    return scoreB - scoreA;
                default:
                    return 0;
            }
        });

        // Apply pagination
        return filteredQuestions.slice(offset, offset + limit);
    }

    /**
     * Get all questions from localStorage
     */
    async getAllQuestionsFromLocalStorage() {
        const questions = [];
        const subjects = ['math', 'english', 'chemistry', 'physics', 'japanese', 'biology'];
        
        for (const subject of subjects) {
            const subjectQuestions = await this.getQuestionsFromLocalStorage(subject);
            if (subjectQuestions.success && subjectQuestions.questions) {
                questions.push(...subjectQuestions.questions.map(q => ({ 
                    ...q, 
                    subject: q.subject || subject,
                    // Normalize field names
                    question_text: q.question_text || q.question,
                    difficulty_level: q.difficulty_level || q.difficulty,
                    answer_format: q.answer_format || q.answerFormat,
                    created_at: q.created_at || q.createdAt || new Date().toISOString()
                })));
            }
        }
        
        // Also check for individual question items
        for (let key in localStorage) {
            if (key.startsWith('question_')) {
                try {
                    const questionData = JSON.parse(localStorage.getItem(key));
                    if (questionData && questionData.id) {
                        questions.push({
                            ...questionData,
                            question_text: questionData.question_text || questionData.question,
                            difficulty_level: questionData.difficulty_level || questionData.difficulty,
                            answer_format: questionData.answer_format || questionData.answerFormat,
                            created_at: questionData.created_at || questionData.createdAt || new Date().toISOString()
                        });
                    }
                } catch (e) {
                    // Ignore malformed data
                }
            }
        }
        
        return questions;
    }

    /**
     * Calculate relevance score for search sorting
     */
    calculateRelevanceScore(question, query) {
        const searchTerms = query.toLowerCase().split(' ');
        const title = (question.title || '').toLowerCase();
        const content = (question.question_text || question.question || '').toLowerCase();
        const tags = (question.tags || []).join(' ').toLowerCase();
        
        let score = 0;
        
        searchTerms.forEach(term => {
            // Title matches get higher score
            if (title.includes(term)) {
                score += 10;
            }
            
            // Content matches
            if (content.includes(term)) {
                score += 5;
            }
            
            // Tag matches
            if (tags.includes(term)) {
                score += 3;
            }
        });
        
        return score;
    }

    /**
     * Get questions from localStorage by subject
     */
    async getQuestionsFromLocalStorage(subject) {
        const storageKeys = [
            `${subject}_questions_backup`,
            `${subject}Questions`, // Legacy format
            `${subject}_questions`
        ];
        
        for (const storageKey of storageKeys) {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    let questions = [];
                    
                    if (Array.isArray(data)) {
                        questions = data;
                    } else if (data.questions && Array.isArray(data.questions)) {
                        questions = data.questions;
                    }
                    
                    console.log(`📁 Retrieved ${questions.length} questions from localStorage:`, storageKey);
                    return { success: true, questions, mode: 'localStorage' };
                } catch (e) {
                    console.warn(`Failed to parse localStorage data for key: ${storageKey}`, e);
                }
            }
        }
        
        return { success: false, questions: [], mode: 'localStorage' };
    }

    /**
     * Format question object
     */
    formatQuestion(question) {
        const formatted = { ...question };
        
        // Parse JSON fields safely
        try {
            if (formatted.choices && typeof formatted.choices === 'string') {
                formatted.choices = JSON.parse(formatted.choices);
            }
        } catch (e) {
            formatted.choices = [];
        }
        
        try {
            if (formatted.tags && typeof formatted.tags === 'string') {
                formatted.tags = JSON.parse(formatted.tags);
            }
        } catch (e) {
            formatted.tags = [];
        }
        
        try {
            if (formatted.media_urls && typeof formatted.media_urls === 'string') {
                formatted.media_urls = JSON.parse(formatted.media_urls);
            }
        } catch (e) {
            formatted.media_urls = [];
        }
        
        return formatted;
    }

    /**
     * Get question statistics for a subject
     * @param {string} subject - Subject name
     * @returns {Promise<Object>} Statistics data
     */
    async getSubjectStatistics(subject) {
        try {
            await this.initializeDatabase();

            const sql = `
                SELECT 
                    COUNT(*) as total_questions,
                    AVG(estimated_time) as avg_estimated_time,
                    difficulty_level,
                    answer_format,
                    field_code,
                    COUNT(*) as count
                FROM questions 
                WHERE subject = ?
                GROUP BY difficulty_level, answer_format, field_code
            `;

            const result = await this.executeQuery(sql, [subject]);

            if (result.success) {
                const stats = {
                    totalQuestions: 0,
                    byDifficulty: {},
                    byType: {},
                    byField: {},
                    avgEstimatedTime: 0
                };

                result.results.forEach(row => {
                    stats.totalQuestions += row.count;
                    
                    if (row.difficulty_level) {
                        stats.byDifficulty[row.difficulty_level] = 
                            (stats.byDifficulty[row.difficulty_level] || 0) + row.count;
                    }
                    
                    if (row.answer_format) {
                        stats.byType[row.answer_format] = 
                            (stats.byType[row.answer_format] || 0) + row.count;
                    }
                    
                    if (row.field_code) {
                        stats.byField[row.field_code] = 
                            (stats.byField[row.field_code] || 0) + row.count;
                    }
                });

                // Get average estimated time
                const avgSql = `SELECT AVG(estimated_time) as avg_time FROM questions WHERE subject = ?`;
                const avgResult = await this.executeQuery(avgSql, [subject]);
                
                if (avgResult.success && avgResult.results.length > 0) {
                    stats.avgEstimatedTime = Math.round((avgResult.results[0].avg_time || 0) * 10) / 10;
                }

                return {
                    success: true,
                    data: stats
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Statistics Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete question
     * @param {string} questionId - Question ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteQuestion(questionId) {
        try {
            const sql = 'DELETE FROM questions WHERE id = ?';
            const result = await this.executeQuery(sql, [questionId]);

            // Also delete stats
            const statsSql = 'DELETE FROM question_stats WHERE question_id = ?';
            await this.executeQuery(statsSql, [questionId]);

            return result;
        } catch (error) {
            console.error('D1 Delete Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sync local data to D1
     * @param {string} subject - Subject to sync
     * @returns {Promise<Object>} Sync result
     */
    async syncLocalToD1(subject) {
        try {
            const localKeys = {
                english: ['vocabQuestions', 'grammarQuestions', 'readingQuestions', 'listeningQuestions', 'summaryQuestions'],
                math: ['mathQuestions'],
                japanese: ['japaneseQuestions']
            };

            let syncCount = 0;
            const syncLog = [];

            const keys = localKeys[subject] || [];
            
            for (const key of keys) {
                const localData = localStorage.getItem(key);
                if (localData) {
                    const questions = JSON.parse(localData);
                    
                    for (const question of questions) {
                        const result = await this.saveQuestion({
                            ...question,
                            subject: subject
                        });
                        
                        if (result.success) {
                            syncCount++;
                            syncLog.push(`✅ ${question.title || question.questionText?.substring(0, 30)} を同期`);
                        } else {
                            syncLog.push(`❌ 同期失敗: ${result.error}`);
                        }
                    }
                }
            }

            return {
                success: true,
                syncCount: syncCount,
                syncLog: syncLog
            };
        } catch (error) {
            console.error('Sync Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add a problem to the database
     * @param {Object} problem - Problem object to add
     * @returns {Promise<Object>} Add result
     */
    async addProblem(problem) {
        try {
            // Ensure database is initialized
            await this.initializeDatabase();

            const sql = `
                INSERT INTO problems (subject, title, content, difficulty, author, created_at, views, solved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                problem.subject,
                problem.title,
                problem.content,
                problem.difficulty,
                problem.author,
                problem.createdAt || new Date().toISOString(),
                problem.views || 0,
                problem.solved || 0
            ];

            const result = await this.executeQuery(sql, params);

            if (result.success) {
                return {
                    success: true,
                    id: result.meta.last_row_id,
                    message: 'Problem added successfully'
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to add problem:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get problems by user
     * @param {string} author - Author name
     * @returns {Promise<Object>} Problems result
     */
    async getProblemsByUser(author) {
        try {
            const sql = `
                SELECT * FROM problems
                WHERE author = ?
                ORDER BY created_at DESC
            `;

            const result = await this.executeQuery(sql, [author]);

            if (result.success) {
                return {
                    success: true,
                    problems: result.results
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to get user problems:', error);
            return {
                success: false,
                error: error.message,
                problems: []
            };
        }
    }

    /**
     * Delete a problem from the database
     * @param {number} problemId - Problem ID to delete
     * @returns {Promise<Object>} Delete result
     */
    async deleteProblem(problemId) {
        try {
            const sql = `DELETE FROM problems WHERE id = ?`;
            const result = await this.executeQuery(sql, [problemId]);

            if (result.success) {
                return {
                    success: true,
                    message: 'Problem deleted successfully'
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to delete problem:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save comment to D1
     * @param {Object} comment - Comment data
     * @returns {Promise<Object>} Save result
     */
    async saveComment(comment) {
        try {
            await this.initializeDatabase();

            const commentData = {
                id: comment.id || this.generateCommentId(),
                problem_id: comment.problemId || comment.problem_id,
                user_id: comment.userId || comment.user_id,
                author_name: comment.authorName || comment.author_name || comment.author,
                author_inquiry_number: comment.authorInquiryNumber || comment.author_inquiry_number,
                content: comment.content,
                media_urls: comment.mediaUrls ? JSON.stringify(comment.mediaUrls) : null,
                parent_id: comment.parentId || comment.parent_id || null
            };

            const sql = `
                INSERT INTO comments (
                    id, problem_id, user_id, author_name, author_inquiry_number,
                    content, media_urls, parent_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            const params = [
                commentData.id,
                commentData.problem_id,
                commentData.user_id,
                commentData.author_name,
                commentData.author_inquiry_number,
                commentData.content,
                commentData.media_urls,
                commentData.parent_id
            ];

            const result = await this.executeQuery(sql, params);

            if (result.success) {
                return {
                    success: true,
                    comment: { ...commentData, created_at: new Date().toISOString() }
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Save Comment Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get comments by problem ID
     * @param {string} problemId - Problem ID
     * @param {number} limit - Limit results
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object>} Comments list
     */
    async getCommentsByProblem(problemId, limit = 50, offset = 0) {
        try {
            await this.initializeDatabase();

            const sql = `
                SELECT c.*,
                       (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes
                FROM comments c
                WHERE c.problem_id = ? AND c.parent_id IS NULL AND c.is_deleted = FALSE
                ORDER BY c.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const result = await this.executeQuery(sql, [problemId, limit, offset]);

            if (result.success) {
                const comments = result.results.map(comment => this.formatComment(comment));

                // Get replies for each comment
                for (const comment of comments) {
                    const replies = await this.getCommentReplies(comment.id);
                    comment.replies = replies.success ? replies.comments : [];
                }

                return {
                    success: true,
                    comments: comments,
                    total: result.results.length,
                    hasMore: result.results.length === limit
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Get Comments Error:', error);
            return {
                success: false,
                error: error.message,
                comments: []
            };
        }
    }

    /**
     * Get replies to a comment
     * @param {string} commentId - Parent comment ID
     * @returns {Promise<Object>} Replies list
     */
    async getCommentReplies(commentId) {
        try {
            const sql = `
                SELECT c.*,
                       (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as likes
                FROM comments c
                WHERE c.parent_id = ? AND c.is_deleted = FALSE
                ORDER BY c.created_at ASC
            `;

            const result = await this.executeQuery(sql, [commentId]);

            if (result.success) {
                return {
                    success: true,
                    comments: result.results.map(comment => this.formatComment(comment))
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Get Replies Error:', error);
            return {
                success: false,
                error: error.message,
                comments: []
            };
        }
    }

    /**
     * Like/unlike a comment
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Like result
     */
    async toggleCommentLike(commentId, userId) {
        try {
            await this.initializeDatabase();

            // Check if already liked
            const checkSql = `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`;
            const checkResult = await this.executeQuery(checkSql, [commentId, userId]);

            if (checkResult.success && checkResult.results.length > 0) {
                // Unlike
                const deleteSql = `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`;
                const deleteResult = await this.executeQuery(deleteSql, [commentId, userId]);

                if (deleteResult.success) {
                    return { success: true, action: 'unliked' };
                }
            } else {
                // Like
                const likeId = this.generateId();
                const insertSql = `INSERT INTO comment_likes (id, comment_id, user_id) VALUES (?, ?, ?)`;
                const insertResult = await this.executeQuery(insertSql, [likeId, commentId, userId]);

                if (insertResult.success) {
                    return { success: true, action: 'liked' };
                }
            }

            throw new Error('Failed to toggle like');
        } catch (error) {
            console.error('D1 Toggle Like Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete a comment (soft delete)
     * @param {string} commentId - Comment ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Promise<Object>} Delete result
     */
    async deleteComment(commentId, userId) {
        try {
            await this.initializeDatabase();

            console.log('D1 deleteComment called with:', { commentId, userId });

            // First check if the comment exists and user has permission
            const checkSql = `
                SELECT id, user_id, author_name
                FROM comments
                WHERE id = ? AND is_deleted = FALSE
            `;
            const checkResult = await this.executeQuery(checkSql, [commentId]);

            if (!checkResult.success) {
                throw new Error('Failed to check comment: ' + checkResult.error);
            }

            if (checkResult.results.length === 0) {
                throw new Error('Comment not found or already deleted');
            }

            const comment = checkResult.results[0];
            console.log('Found comment:', comment);

            // Check permission
            if (comment.user_id !== userId) {
                throw new Error('Permission denied: You can only delete your own comments');
            }

            // Perform soft delete
            const sql = `
                UPDATE comments
                SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `;

            const result = await this.executeQuery(sql, [commentId, userId]);
            console.log('D1 delete query result:', result);

            if (result.success) {
                return { success: true, message: 'Comment deleted successfully' };
            } else {
                throw new Error(result.error || 'Delete query failed');
            }
        } catch (error) {
            console.error('D1 Delete Comment Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Report a comment
     * @param {string} commentId - Comment ID
     * @param {string} userId - Reporter user ID
     * @param {string} reason - Report reason
     * @returns {Promise<Object>} Report result
     */
    async reportComment(commentId, userId, reason = '') {
        try {
            // Mark comment as reported
            const sql = `UPDATE comments SET is_reported = TRUE WHERE id = ?`;
            const result = await this.executeQuery(sql, [commentId]);

            // Here you could also create a reports table for detailed tracking

            if (result.success) {
                return { success: true, message: 'Comment reported successfully' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('D1 Report Comment Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get comment statistics for a problem
     * @param {string} problemId - Problem ID
     * @returns {Promise<Object>} Comment statistics
     */
    async getCommentStats(problemId) {
        try {
            const sql = `
                SELECT
                    COUNT(*) as total_comments,
                    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_comments,
                    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as replies,
                    AVG((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)) as avg_likes
                FROM comments c
                WHERE c.problem_id = ? AND c.is_deleted = FALSE
            `;

            const result = await this.executeQuery(sql, [problemId]);

            if (result.success && result.results.length > 0) {
                return {
                    success: true,
                    stats: {
                        totalComments: result.results[0].total_comments || 0,
                        topLevelComments: result.results[0].top_level_comments || 0,
                        replies: result.results[0].replies || 0,
                        avgLikes: Math.round((result.results[0].avg_likes || 0) * 10) / 10
                    }
                };
            } else {
                return {
                    success: true,
                    stats: {
                        totalComments: 0,
                        topLevelComments: 0,
                        replies: 0,
                        avgLikes: 0
                    }
                };
            }
        } catch (error) {
            console.error('D1 Comment Stats Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format comment object
     */
    formatComment(comment) {
        const formatted = { ...comment };

        // Parse JSON fields safely
        try {
            if (formatted.media_urls && typeof formatted.media_urls === 'string') {
                formatted.media_urls = JSON.parse(formatted.media_urls);
            }
        } catch (e) {
            formatted.media_urls = [];
        }

        // Ensure likes is a number
        formatted.likes = parseInt(formatted.likes) || 0;

        return formatted;
    }

    /**
     * Generate comment ID
     */
    generateCommentId() {
        return 'comment_d1_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    // Helper methods
    generateId() {
        return 'q_d1_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
}

// Global instance with real configuration
window.questaD1 = new QuestaD1Client();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestaD1Client;
}