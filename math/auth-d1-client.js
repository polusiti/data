// D1 Integration for browse.html
// Replace the existing loadAllProblems() function with this D1 version

async function loadAllProblems() {
    showLoading('すべての問題を読み込み中...');

    try {
        // Try to load from D1 first
        const allProblems = await loadProblemsFromD1();

        if (allProblems && allProblems.length > 0) {
            // Successfully loaded from D1
            mathProblems = allProblems.filter(p => p.subject === 'math' || !p.subject);
            physicsProblems = allProblems.filter(p => p.subject === 'physics');
            chemistryProblems = allProblems.filter(p => p.subject === 'chemistry');

            addStatus('✅ D1から問題を読み込みました', 'success');
        } else {
            // Fallback to localStorage
            await loadProblemsFromLocalStorage();
            addStatus('⚠️ D1から読み込めなかったため、ローカルから読み込みました', 'warning');
        }

        // Combine all problems
        allProblemsArray = [...mathProblems, ...physicsProblems, ...chemistryProblems];

        // Update display
        updateProblemDisplay();
        updateStatistics();

    } catch (error) {
        console.error('問題の読み込みに失敗しました:', error);

        // Fallback to localStorage on error
        await loadProblemsFromLocalStorage();
        addStatus('❌ エラーが発生したため、ローカルから読み込みました', 'error');

        // Combine all problems
        allProblemsArray = [...mathProblems, ...physicsProblems, ...chemistryProblems];

        // Update display
        updateProblemDisplay();
        updateStatistics();
    }

    hideLoading();
}

async function loadProblemsFromD1() {
    try {
        const apiUrl = getComputedStyle(document.documentElement).getPropertyValue('--api-base-url').trim();
        const response = await fetch(`${apiUrl}/api/questions`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.questions) {
            // Transform D1 data to match existing format
            return data.questions.map(q => ({
                id: q.id,
                title: q.title,
                content: q.question_text,
                field: q.field_code || 'general',
                subject: q.subject || 'math',
                normalized: q.normalized_content || '',
                mode: q.answer_format || 'katex',
                created: q.created_at,
                updated: q.updated_at,
                choices: q.choices ? JSON.parse(q.choices) : [],
                correctAnswer: q.correct_answer,
                explanation: q.explanation || '',
                difficulty: q.difficulty_level || 'medium',
                tags: q.tags ? JSON.parse(q.tags) : [],
                mediaUrls: q.media_urls ? JSON.parse(q.media_urls) : []
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('D1 loading error:', error);
        throw error;
    }
}

async function loadProblemsFromLocalStorage() {
    // Fallback to original localStorage logic
    mathProblems = JSON.parse(localStorage.getItem('mathQuestions') || '[]');
    physicsProblems = JSON.parse(localStorage.getItem('physicsQuestions') || '[]');
    chemistryProblems = JSON.parse(localStorage.getItem('chemistryQuestions') || '[]');

    // Load created problems
    const createdProblems = JSON.parse(localStorage.getItem('createdProblems') || '[]');

    // Add created problems to respective subject arrays
    createdProblems.forEach(problem => {
        if (problem.subject === 'physics') {
            physicsProblems.push(problem);
        } else if (problem.subject === 'chemistry') {
            chemistryProblems.push(problem);
        } else {
            mathProblems.push(problem);
        }
    });

    // Add sample data if empty
    if (mathProblems.length === 0 && physicsProblems.length === 0 && chemistryProblems.length === 0) {
        addSampleData();
    }
}

// Update the saveProblem function to save to D1
async function saveProblem(problem) {
    try {
        // Try to save to D1 first
        const d1Success = await saveProblemToD1(problem);

        if (d1Success) {
            addStatus('✅ 問題をD1に保存しました', 'success');
            return true;
        } else {
            // Fallback to localStorage
            saveProblemToLocalStorage(problem);
            addStatus('⚠️ D1に保存できなかったため、ローカルに保存しました', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Problem save error:', error);

        // Fallback to localStorage
        saveProblemToLocalStorage(problem);
        addStatus('❌ エラーが発生したため、ローカルに保存しました', 'error');
        return false;
    }
}

async function saveProblemToD1(problem) {
    try {
        const apiUrl = getComputedStyle(document.documentElement).getPropertyValue('--api-base-url').trim();
        const response = await fetch(`${apiUrl}/api/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: problem.id,
                subject: problem.subject || 'math',
                title: problem.title,
                question_text: problem.content,
                field_code: problem.field,
                normalized_content: problem.normalized,
                mode: problem.mode,
                created_at: problem.created || new Date().toISOString()
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.success;
        } else {
            return false;
        }
    } catch (error) {
        console.error('D1 save error:', error);
        return false;
    }
}

function saveProblemToLocalStorage(problem) {
    // Original localStorage logic
    let problems;

    if (problem.subject === 'physics') {
        problems = JSON.parse(localStorage.getItem('physicsQuestions') || '[]');
    } else if (problem.subject === 'chemistry') {
        problems = JSON.parse(localStorage.getItem('chemistryQuestions') || '[]');
    } else {
        problems = JSON.parse(localStorage.getItem('mathQuestions') || '[]');
    }

    // Check if problem with same ID already exists
    const existingIndex = problems.findIndex(p => p.id === problem.id);

    if (existingIndex !== -1) {
        // Update existing problem
        problems[existingIndex] = problem;
    } else {
        // Add new problem
        problems.push(problem);
    }

    // Save to localStorage
    if (problem.subject === 'physics') {
        localStorage.setItem('physicsQuestions', JSON.stringify(problems));
    } else if (problem.subject === 'chemistry') {
        localStorage.setItem('chemistryQuestions', JSON.stringify(problems));
    } else {
        localStorage.setItem('mathQuestions', JSON.stringify(problems));
    }
}

// Add D1 health check
async function checkD1Connection() {
    try {
        const apiUrl = getComputedStyle(document.documentElement).getPropertyValue('--api-base-url').trim();
        const response = await fetch(`${apiUrl}/api/health`);

        if (response.ok) {
            const data = await response.json();
            return data.success;
        } else {
            return false;
        }
    } catch (error) {
        console.error('D1 health check error:', error);
        return false;
    }
}

// Update status display to show D1 connection
function updateD1Status() {
    checkD1Connection().then(connected => {
        const statusElement = document.getElementById('d1-status');
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<span class="text-green-600">✅ D1接続済み</span>';
            } else {
                statusElement.innerHTML = '<span class="text-red-600">❌ D1未接続</span>';
            }
        }
    });
}

// Add refresh button to manually reload from D1
function addRefreshButton() {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-outline-primary';
        refreshButton.innerHTML = '🔄 D1から再読み込み';
        refreshButton.onclick = () => {
            loadAllProblems();
            updateD1Status();
        };
        toolbar.appendChild(refreshButton);
    }
}

// Initialize D1 integration
document.addEventListener('DOMContentLoaded', function() {
    // Check D1 connection status
    updateD1Status();

    // Add refresh button
    addRefreshButton();

    // Update D1 status every 30 seconds
    setInterval(updateD1Status, 30000);
});
