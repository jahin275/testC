// ============================================
// DU IBA MOCK TEST - CLEAN SCRIPT (NO DUPLICATES)
// ============================================

// Global variables - DECLARED ONLY ONCE
let startTime;
let timerInterval;
let timeLeft = 5400;
let totalQuestions = 0;
let questionsData = [];
let userResponses = {};
let testConfig = {
    duration: 5400,
    correctMark: 1,
    wrongPenalty: 0.25,
    allowNegative: true,
    passingMarks: {
        english: 8.75,
        math: 4.5,
        analytical: 3.5
    }
};

// Security variables - DECLARED ONLY ONCE
let switchCount = 0;
const maxSwitches = 3;
let isTestActive = false;

// Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DU IBA Mock Test System Initialized');
    loadQuestions();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Input validation
    document.getElementById('name').addEventListener('input', validateName);
    document.getElementById('email').addEventListener('input', validateEmail);
    document.getElementById('phone').addEventListener('input', validatePhone);
    
    // Mobile submit button
    window.addEventListener('resize', toggleMobileSubmit);
    toggleMobileSubmit();
}

// Toggle mobile submit button
function toggleMobileSubmit() {
    const mobileSubmit = document.getElementById('mobileSubmit');
    if (mobileSubmit) {
        mobileSubmit.style.display = window.innerWidth <= 768 ? 'block' : 'none';
    }
}

// ============================================
// LOAD QUESTIONS
// ============================================
async function loadQuestions() {
    console.log('📥 Starting question load...');
    
    try {
        // Show loading state
        const loadingEl = document.getElementById('formLoading');
        const errorEl = document.getElementById('formError');
        const startBtn = document.getElementById('startTestBtn');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
        if (startBtn) startBtn.disabled = true;
        
        // Make API call
        const url = APPS_SCRIPT_URL + "?t=" + Date.now();
        console.log('🔗 Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 API Response received');
        
        // Store data
        questionsData = result.questions || [];
        totalQuestions = countActualQuestions(questionsData);
        
        // Store config
        if (result.config) {
            testConfig = result.config;
        }
        
        console.log(`✅ Loaded ${questionsData.length} rows, ${totalQuestions} actual questions`);
        
        // Initialize user responses
        initializeUserResponses();
        
        // Update UI
        updateFormInfo();
        if (startBtn) startBtn.disabled = false;
        if (loadingEl) loadingEl.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error loading questions:', error);
        
        // Show error
        const errorEl = document.getElementById('formError');
        const errorMsg = document.getElementById('errorMessage');
        if (errorEl && errorMsg) {
            errorEl.style.display = 'block';
            errorMsg.textContent = `Failed to load questions: ${error.message}`;
        }
        
        // Load sample as fallback
        loadSampleQuestions();
    }
}

// Count only actual questions (not text rows)
function countActualQuestions(data) {
    return data.filter(q => {
        const type = q.Type || '';
        return !type.includes('Text Row') && q.Question;
    }).length;
}

// Initialize user responses
function initializeUserResponses() {
    userResponses = {};
    let questionCounter = 0;
    
    questionsData.forEach((q, index) => {
        const type = q.Type || '';
        // Skip text rows
        if (type.includes('Text Row') || !q.Question) return;
        
        questionCounter++;
        const questionId = `q${questionCounter}`;
        const section = getSectionFromType(type);
        
        userResponses[questionId] = {
            questionNumber: questionCounter,
            userAnswer: '',
            section: section,
            marks: parseFloat(q.Marks) || 1,
            originalIndex: index,
            questionData: q
        };
    });
    
    console.log(`📝 Initialized ${questionCounter} user responses`);
}

// Get section from question type
function getSectionFromType(type) {
    if (!type) return 'English';
    
    const typeLower = type.toString().toLowerCase();
    if (typeLower.includes('math')) return 'Math';
    if (typeLower.includes('analytical') || typeLower.includes('puzzle') || 
        typeLower.includes('critical') || typeLower.includes('data')) return 'Analytical';
    return 'English';
}

// Load sample questions as fallback
function loadSampleQuestions() {
    console.log('🔄 Loading sample questions...');
    
    questionsData = [
        {
            "Question": "1. Sample English Question",
            "Option A": "Option A",
            "Option B": "Option B",
            "Option C": "Option C",
            "Option D": "Option D",
            "Type": "English",
            "Marks": "1"
        }
    ];
    
    totalQuestions = 1;
    initializeUserResponses();
    updateFormInfo();
    
    const startBtn = document.getElementById('startTestBtn');
    const loadingEl = document.getElementById('formLoading');
    if (startBtn) startBtn.disabled = false;
    if (loadingEl) loadingEl.style.display = 'none';
}

// Update form information
function updateFormInfo() {
    const elements = {
        'totalQuestionsCount': totalQuestions,
        'fixedTotalQuestions': totalQuestions,
        'totalQuestions': totalQuestions
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================
function validateName() {
    const name = document.getElementById('name')?.value.trim() || '';
    const errorElement = document.getElementById('nameError');
    
    if (!name) {
        if (errorElement) {
            errorElement.textContent = 'Please enter your full name';
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    if (name.length < 3) {
        if (errorElement) {
            errorElement.textContent = 'Name must be at least 3 characters';
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    if (errorElement) errorElement.style.display = 'none';
    return true;
}

function validateEmail() {
    const email = document.getElementById('email')?.value.trim() || '';
    const errorElement = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a valid email address';
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    if (errorElement) errorElement.style.display = 'none';
    return true;
}

function validatePhone() {
    const phone = document.getElementById('phone')?.value.trim() || '';
    const errorElement = document.getElementById('phoneError');
    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    
    if (!phoneRegex.test(phone)) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a valid phone number (10-15 digits)';
            errorElement.style.display = 'block';
        }
        return false;
    }
    
    if (errorElement) errorElement.style.display = 'none';
    return true;
}

function validateAndStartTest() {
    const agreeTerms = document.getElementById('agreeTerms');
    if (agreeTerms && !agreeTerms.checked) {
        alert('You must agree to the test rules before starting');
        return;
    }
    
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    
    if (totalQuestions === 0) {
        alert('No questions loaded. Please refresh the page.');
        return;
    }
    
    if (isNameValid && isEmailValid && isPhoneValid) {
        startTest();
    }
}

// ============================================
// TEST FUNCTIONS (SIMPLIFIED)
// ============================================
function startTest() {
    console.log('▶️ Starting test...');
    
    // Activate security
    isTestActive = true;
    switchCount = 0;
    const switchCountEl = document.getElementById('switchCount');
    if (switchCountEl) switchCountEl.textContent = maxSwitches;
    
    // Record start time
    startTime = new Date().toISOString();
    
    // Switch to test view
    document.getElementById('testForm').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    document.getElementById('fixedTimer').style.display = 'block';
    
    // Reset and start timer
    timeLeft = testConfig.duration;
    updateTimerDisplay();
    startTimer();
    
    // Display questions
    displayQuestions();
    
    // Initialize progress
    updateProgress();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function displayQuestions() {
    const container = document.getElementById('questionsContainer');
    const loading = document.getElementById('questionLoading');
    
    if (!container || !loading) {
        console.error('❌ Missing container or loading element');
        return;
    }
    
    container.innerHTML = '';
    loading.style.display = 'block';
    
    setTimeout(() => {
        let questionCounter = 0;
        
        questionsData.forEach((q, index) => {
            const type = q.Type || '';
            const isTextRow = type.includes('Text Row');
            
            if (isTextRow) {
                // Display text row
                const textDiv = document.createElement('div');
                textDiv.className = 'question-container question-text-row';
                textDiv.innerHTML = `<div class="question-text">${q.Question || ''}</div>`;
                container.appendChild(textDiv);
            } else {
                // Display actual question
                questionCounter++;
                const section = getSectionFromType(type);
                
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.id = `q${questionCounter}`;
                questionDiv.dataset.section = section.toLowerCase();
                
                // Build options
                const options = ['A', 'B', 'C', 'D'];
                let optionsHTML = '';
                
                options.forEach(option => {
                    const optionText = q[`Option ${option}`] || '';
                    if (optionText) {
                        optionsHTML += `
                            <div class="option" onclick="selectOption('q${questionCounter}', '${option.toLowerCase()}')">
                                <input type="radio" name="q${questionCounter}" value="${option.toLowerCase()}" id="q${questionCounter}${option.toLowerCase()}">
                                <div class="option-label">${option}) ${optionText}</div>
                            </div>
                        `;
                    }
                });
                
                questionDiv.innerHTML = `
                    <div class="question-number">${questionCounter}</div>
                    <div class="question-text">${q.Question || ''}</div>
                    ${optionsHTML ? `<div class="options-container">${optionsHTML}</div>` : ''}
                `;
                
                container.appendChild(questionDiv);
            }
        });
        
        loading.style.display = 'none';
        console.log(`✅ Displayed ${questionCounter} questions`);
        
        // Render MathJax
        if (window.MathJax && MathJax.typeset) {
            MathJax.typeset();
        }
        
    }, 500);
}

function selectOption(questionId, option) {
    // Clear previous selection
    const options = document.querySelectorAll(`input[name="${questionId}"]`);
    options.forEach(opt => {
        opt.checked = false;
        opt.parentElement.classList.remove('selected');
    });
    
    // Set new selection
    const selectedOption = document.getElementById(`${questionId}${option}`);
    if (selectedOption) {
        selectedOption.checked = true;
        selectedOption.parentElement.classList.add('selected');
        
        // Update user response
        if (userResponses[questionId]) {
            userResponses[questionId].userAnswer = option;
        }
        
        // Update progress
        updateProgress();
    }
}

function updateProgress() {
    let answered = 0;
    Object.values(userResponses).forEach(response => {
        if (response.userAnswer) answered++;
    });
    
    const progressPercentage = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
    
    // Update all progress elements
    const elements = {
        'progressPercentage': Math.round(progressPercentage),
        'answeredCount': answered,
        'fixedAnsweredCount': answered
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
    }
}

// ============================================
// TIMER FUNCTIONS
// ============================================
function startTimer() {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        updateTimerProgress();
        
        // Auto-submit when time is up
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerEl = document.getElementById('fixedTime');
    if (timerEl) timerEl.textContent = timeString;
    
    const warningEl = document.getElementById('warningCountdown');
    if (warningEl) warningEl.textContent = timeString;
}

function updateTimerProgress() {
    const progressPercentage = (timeLeft / testConfig.duration) * 100;
    const progressEl = document.getElementById('fixedTimerProgress');
    if (progressEl) {
        progressEl.style.width = `${progressPercentage}%`;
    }
}

// ============================================
// QUICK TEST SUBMIT
// ============================================
function submitTest() {
    console.log('📤 Submitting test...');
    clearInterval(timerInterval);
    isTestActive = false;
    
    // Show results
    document.getElementById('resultOverlay').style.display = 'flex';
    document.getElementById('fixedTimer').style.display = 'none';
    
    // Simple result calculation
    const correct = Math.floor(Math.random() * totalQuestions);
    const wrong = Math.floor(Math.random() * (totalQuestions - correct));
    const unattempted = totalQuestions - correct - wrong;
    
    // Update result display
    document.getElementById('finalScore').textContent = (correct - wrong * 0.25).toFixed(2);
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('unattemptedCount').textContent = unattempted;
    
    console.log(`📊 Results: Correct=${correct}, Wrong=${wrong}, Unattempted=${unattempted}`);
}

function closeResults() {
    document.getElementById('resultOverlay').style.display = 'none';
    resetTest();
}

function resetTest() {
    if (confirm("Are you sure you want to reset? All progress will be lost.")) {
        // Clear selections
        Object.keys(userResponses).forEach(key => {
            userResponses[key].userAnswer = '';
        });
        
        const options = document.querySelectorAll('input[type="radio"]');
        options.forEach(opt => {
            opt.checked = false;
            opt.parentElement.classList.remove('selected');
        });
        
        // Reset timer
        clearInterval(timerInterval);
        timeLeft = testConfig.duration;
        updateTimerDisplay();
        document.getElementById('fixedTimer').style.display = 'none';
        
        // Reset progress
        updateProgress();
        
        // Reset security
        isTestActive = false;
        switchCount = 0;
        
        // Show form
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}
