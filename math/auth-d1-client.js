// Enhanced Auth D1 Client for Questions API
class AuthD1Client {
    constructor(baseUrl = 'https://data-manager-auth.t88596565.workers.dev') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('auth_token');
        this.currentUser = null;
    }

    // Authentication Methods
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/passkey/login/begin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            this.currentUser = data.user;
            return data.user;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    async logout() {
        try {
            await fetch(`${this.baseUrl}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            this.token = null;
            this.currentUser = null;
            localStorage.removeItem('auth_token');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Questions API Methods
    async getQuestions(filters = {}) {
        try {
            const url = new URL(`${this.baseUrl}/api/questions`);

            if (filters.subject) {
                url.searchParams.append('subject', filters.subject);
            }
            if (filters.field) {
                url.searchParams.append('field', filters.field);
            }
            if (filters.limit) {
                url.searchParams.append('limit', filters.limit);
            }
            if (filters.offset) {
                url.searchParams.append('offset', filters.offset);
            }

            const response = await fetch(url.toString(), {
                headers: this.token ? {
                    'Authorization': `Bearer ${this.token}`
                } : {}
            });

            if (!response.ok) {
                throw new Error('Failed to fetch questions');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get questions error:', error);
            throw error;
        }
    }

    async createQuestion(questionData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
                },
                body: JSON.stringify(questionData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create question');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Create question error:', error);
            throw error;
        }
    }

    async getQuestionById(questionId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/questions/${questionId}`, {
                headers: this.token ? {
                    'Authorization': `Bearer ${this.token}`
                } : {}
            });

            if (!response.ok) {
                throw new Error('Question not found');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get question by ID error:', error);
            throw error;
        }
    }

    async updateQuestion(questionId, updateData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/questions/${questionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update question');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Update question error:', error);
            throw error;
        }
    }

    async deleteQuestion(questionId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/questions/${questionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete question');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Delete question error:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);

            if (!response.ok) {
                return { success: false, error: 'Health check failed' };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Health check error:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper Methods
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    isAuthenticated() {
        return !!this.token;
    }

    async ensureAuthenticated() {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required');
        }

        // Verify token is still valid
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                this.logout();
                throw new Error('Session expired');
            }
            return user;
        } catch (error) {
            this.logout();
            throw new Error('Authentication required');
        }
    }
}

// Legacy compatibility - global functions for backward compatibility
let authClient = null;

function initializeAuthClient() {
    if (!authClient) {
        authClient = new AuthD1Client();
    }
    return authClient;
}

// Legacy function names for compatibility
async function saveQuestion(questionData) {
    const client = initializeAuthClient();
    return await client.createQuestion(questionData);
}

async function getQuestionsBySubject(subject) {
    const client = initializeAuthClient();
    return await client.getQuestions({ subject });
}

async function getQuestionById(questionId) {
    const client = initializeAuthClient();
    return await client.getQuestionById(questionId);
}

// Export for ES modules
export { AuthD1Client, initializeAuthClient, saveQuestion, getQuestionsBySubject, getQuestionById };

// Global variable for script tag usage
window.AuthD1Client = AuthD1Client;
window.authClient = initializeAuthClient();
