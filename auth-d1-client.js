/**
 * Data Manager Authentication D1 Client
 * Handles user registration, passkey authentication, and user management
 * Based on sys repository patterns but enhanced for multi-user authentication
 */

class AuthD1Client {
    constructor() {
        this.baseUrl = 'https://data-manager-auth.t88596565.workers.dev'; // Production Worker URL
        // For local development: 'http://localhost:8787'
        this.adminToken = localStorage.getItem('adminToken') || 'questa-admin-2024';
        this.currentUser = null;
        this.sessionToken = localStorage.getItem('sessionToken');
        
        // Initialize user session if token exists
        if (this.sessionToken) {
            this.loadCurrentUser();
        }
    }

    /**
     * Initialize the authentication database schema
     */
    async initializeAuthDatabase() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/init`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('Auth database initialization:', result);
            return result;
        } catch (error) {
            console.error('Auth database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Generate a unique inquiry number for new users
     */
    generateInquiryNumber() {
        // Format: DM-YYYY-NNNNNN (DM = Data Manager, YYYY = year, NNNNNN = 6-digit sequence)
        const year = new Date().getFullYear();
        const sequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
        return `DM-${year}-${sequence}`;
    }

    /**
     * Register a new user with ID and passkey
     */
    async registerUser(userData) {
        try {
            // Generate inquiry number
            const inquiryNumber = this.generateInquiryNumber();
            
            // Prepare user data
            const userRegistration = {
                userId: userData.userId,
                displayName: userData.displayName || userData.userId,
                email: userData.email,
                inquiryNumber: inquiryNumber,
                registeredAt: new Date().toISOString(),
                status: 'active',
                role: 'user'
            };

            // Step 1: Create user account
            const userResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userRegistration)
            });

            if (!userResponse.ok) {
                console.error('Registration failed with status:', userResponse.status, userResponse.statusText);
                console.error('Response headers:', Object.fromEntries(userResponse.headers.entries()));
                
                let errorData;
                try {
                    errorData = await userResponse.json();
                    console.error('Error response data:', errorData);
                } catch (e) {
                    // If response isn't JSON, get it as text
                    const errorText = await userResponse.text();
                    console.error('Error response text:', errorText);
                    errorData = { message: `HTTP ${userResponse.status}: ${errorText}` };
                }
                
                throw new Error(errorData.message || `User registration failed (${userResponse.status})`);
            }

            const userResult = await userResponse.json();

            // Step 2: Set up WebAuthn passkey registration
            const passkeyOptions = await this.initiatePasskeyRegistration(userResult.user.id);
            
            // Create WebAuthn credential
            const credential = await navigator.credentials.create({
                publicKey: passkeyOptions
            });

            // Step 3: Complete passkey registration
            await this.completePasskeyRegistration(userResult.user.id, credential);

            console.log('User registered successfully:', userResult);
            return {
                success: true,
                user: userResult.user,
                inquiryNumber: inquiryNumber
            };

        } catch (error) {
            console.error('User registration failed:', error);
            throw error;
        }
    }

    /**
     * Initiate passkey registration process
     */
    async initiatePasskeyRegistration(userId) {
        const response = await fetch(`${this.baseUrl}/api/auth/passkey/register/begin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            throw new Error('Failed to initiate passkey registration');
        }

        const options = await response.json();
        
        // Convert challenge and user ID to ArrayBuffer
        options.challenge = this.base64ToArrayBuffer(options.challenge);
        options.user.id = this.base64ToArrayBuffer(options.user.id);

        return options;
    }

    /**
     * Complete passkey registration
     */
    async completePasskeyRegistration(userId, credential) {
        const credentialData = {
            id: credential.id,
            rawId: this.arrayBufferToBase64(credential.rawId),
            response: {
                clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON),
                attestationObject: this.arrayBufferToBase64(credential.response.attestationObject)
            },
            type: credential.type
        };

        const response = await fetch(`${this.baseUrl}/api/auth/passkey/register/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                credential: credentialData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to complete passkey registration');
        }

        return await response.json();
    }

    /**
     * Login user with passkey
     */
    async loginWithPasskey(userId) {
        try {
            // Step 1: Get authentication options
            const optionsResponse = await fetch(`${this.baseUrl}/api/auth/passkey/login/begin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });

            if (!optionsResponse.ok) {
                const error = await optionsResponse.json();
                throw new Error(error.message || 'Login initialization failed');
            }

            const options = await optionsResponse.json();
            
            // Convert challenge to ArrayBuffer
            options.challenge = this.base64ToArrayBuffer(options.challenge);
            if (options.allowCredentials) {
                options.allowCredentials = options.allowCredentials.map(cred => ({
                    ...cred,
                    id: this.base64ToArrayBuffer(cred.id)
                }));
            }

            // Step 2: Get WebAuthn assertion
            const assertion = await navigator.credentials.get({
                publicKey: options
            });

            // Step 3: Complete authentication
            const loginData = {
                id: assertion.id,
                rawId: this.arrayBufferToBase64(assertion.rawId),
                response: {
                    clientDataJSON: this.arrayBufferToBase64(assertion.response.clientDataJSON),
                    authenticatorData: this.arrayBufferToBase64(assertion.response.authenticatorData),
                    signature: this.arrayBufferToBase64(assertion.response.signature),
                    userHandle: assertion.response.userHandle ? this.arrayBufferToBase64(assertion.response.userHandle) : null
                },
                type: assertion.type
            };

            const loginResponse = await fetch(`${this.baseUrl}/api/auth/passkey/login/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    assertion: loginData
                })
            });

            if (!loginResponse.ok) {
                const error = await loginResponse.json();
                throw new Error(error.message || 'Login verification failed');
            }

            const loginResult = await loginResponse.json();
            
            // Store session token and user data
            this.sessionToken = loginResult.sessionToken;
            this.currentUser = loginResult.user;
            localStorage.setItem('sessionToken', this.sessionToken);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            console.log('Login successful:', loginResult);
            return {
                success: true,
                user: this.currentUser,
                sessionToken: this.sessionToken
            };

        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Load current user from session
     */
    async loadCurrentUser() {
        if (!this.sessionToken) return null;

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return this.currentUser;
            } else {
                // Session expired or invalid
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
            this.logout();
            return null;
        }
    }

    /**
     * Get current user for profile display (with demo data)
     */
    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
            // ログアウト後は null を返す（自動デモユーザー生成を削除）
        }
        return this.currentUser;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!(this.sessionToken && this.getCurrentUser());
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            if (this.sessionToken) {
                await fetch(`${this.baseUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            // Clear local session data
            this.sessionToken = null;
            this.currentUser = null;
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('currentUser');
        }
    }

    /**
     * Get user by inquiry number
     */
    async getUserByInquiryNumber(inquiryNumber) {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/user/inquiry/${inquiryNumber}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });

            if (response.ok) {
                return await response.json();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to get user by inquiry number:', error);
            return null;
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(updates) {
        if (!this.sessionToken) {
            throw new Error('User not logged in');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const updatedUser = await response.json();
                this.currentUser = updatedUser;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return updatedUser;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Profile update failed');
            }
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    /**
     * Get authentication headers for API requests
     */
    getAuthHeaders() {
        if (this.sessionToken) {
            return {
                'Authorization': `Bearer ${this.sessionToken}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Utility functions for WebAuthn credential conversion
     */
    base64ToArrayBuffer(base64) {
        // Type check and conversion
        if (!base64) {
            throw new Error('base64 parameter is required');
        }
        
        // Convert to string if it's an array
        if (Array.isArray(base64)) {
            base64 = String.fromCharCode(...base64);
        } else if (typeof base64 !== 'string') {
            // If it's ArrayBuffer or Uint8Array, convert to base64 string first
            if (base64 instanceof ArrayBuffer) {
                base64 = btoa(String.fromCharCode(...new Uint8Array(base64)));
            } else if (base64 instanceof Uint8Array) {
                base64 = btoa(String.fromCharCode(...base64));
            } else {
                base64 = String(base64);
            }
        }
        
        // URL-safe base64 to standard base64
        const standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
        
        // Add padding if needed
        const paddedBase64 = standardBase64 + '='.repeat((4 - standardBase64.length % 4) % 4);
        
        try {
            const binaryString = atob(paddedBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (error) {
            console.error('Base64 decode error:', error, 'Input:', base64);
            throw new Error(`Failed to decode base64: ${error.message}`);
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    /**
     * Demo login for testing purposes
     */
    async demoLogin(userId = 'demo_user', displayName = '田中太郎') {
        const demoUser = {
            id: 'demo_user_123',
            userId: userId,
            displayName: displayName,
            email: `${userId}@example.com`,
            joinDate: '2024-01-15T00:00:00.000Z',
            verified: true,
            stats: {
                totalProblems: 42,
                solvedProblems: 156,
                totalPoints: 2340,
                currentRank: 15
            }
        };

        this.currentUser = demoUser;
        this.sessionToken = `demo_token_${Date.now()}`;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('sessionToken', this.sessionToken);

        return {
            success: true,
            user: this.currentUser,
            sessionToken: this.sessionToken
        };
    }

    /**
     * Get user statistics for profile display
     */
    async getUserStats() {
        return {
            success: true,
            stats: {
                totalProblems: 42,
                solvedProblems: 156,
                totalPoints: 2340,
                currentRank: 15,
                weeklyStats: {
                    solved: 12,
                    posted: 3,
                    points: 156,
                    studyTime: 5.2
                },
                progress: {
                    math: 78,
                    english: 65,
                    science: 52
                }
            }
        };
    }

    /**
     * Check WebAuthn support
     */
    static isWebAuthnSupported() {
        return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get);
    }

    /**
     * Check if platform authenticator (like Touch ID, Face ID) is available
     */
    static async isPlatformAuthenticatorAvailable() {
        if (!this.isWebAuthnSupported()) return false;
        
        try {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (error) {
            console.error('Platform authenticator check failed:', error);
            return false;
        }
    }
}

// Global authentication client instance
if (typeof window !== 'undefined') {
    window.authClient = new AuthD1Client();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthD1Client;
}