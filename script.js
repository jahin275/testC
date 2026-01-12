// ============================================
// DU IBA MOCK TEST - COMPLETE FRONTEND SCRIPT
// ============================================

// Global variables
let startTime;
let timerInterval;
let timeLeft = 5400; // 90 minutes in seconds
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

// Security variables
let switchCount = 0;
const maxSwitches = 3;
let isTestActive = false;

// Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DU IBA Mock Test System Initialized');
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
    if (window.innerWidth <= 768 && mobileSubmit) {
        mobileSubmit.style.display = 'block';
    } else if (mobileSubmit) {
        mobileSubmit.style.display = 'none';
    }
}

// ============================================
// LOAD QUESTIONS - FIXED VERSION
// ============================================
async function loadQuestions() {
    console.log('Starting question load...');
    
    try {
        // Show loading state
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        
        // Your working API URL
        const url = APPS_SCRIPT_URL + "?t=" + Date.now();
        console.log('Fetching from:', url);
        
        // Make the API call
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        // Store the data
        questionsData = result.questions || [];
        totalQuestions = countActualQuestions(questionsData);
        
        // Store config
        if (result.config) {
            testConfig = result.config;
        }
        
        console.log(`Loaded ${questionsData.length} rows, ${totalQuestions} actual questions`);
        
        // Initialize user responses
        initializeUserResponses();
        
        // Update UI
        updateFormInfo();
        document.getElementById('startTestBtn').disabled = false;
        document.getElementById('formLoading').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading questions:', error);
        
        // Show error
        document.getElementById('formError').style.display = 'block';
        document.getElementById('errorMessage').textContent = 
            `Failed to load questions: ${error.message}`;
        
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
    
    console.log(`Initialized ${questionCounter} user responses`);
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
    console.log('Loading sample questions...');
    
    questionsData = [
        {
            "Question": "1. Sample English Question",
            "Option A": "Option A",
            "Option B": "Option B",
            "Option C": "Option C",
            "Option D": "Option D",
            "Type": "English",
            "Marks": "1"
        },
        {
            "Question": "2. Sample Math Question",
            "Option A": "Option A",
            "Option B": "Option B",
            "Option C": "Option C",
            "Option D": "Option D",
            "Type": "Math",
            "Marks": "1"
        }
    ];
    
    totalQuestions = 2;
    initializeUserResponses();
    updateFormInfo();
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
}

// Update form information
function updateFormInfo() {
    if (document.getElementById('totalQuestionsCount')) {
        document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    }
    if (document.getElementById('fixedTotalQuestions')) {
        document.getElementById('fixedTotalQuestions').textContent = totalQuestions;
    }
    if (document.getElementById('totalQuestions')) {
        document.getElementById('totalQuestions').textContent = totalQuestions;
    }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================
function validateName() {
    const name = document.getElementById('name').value.trim();
    const errorElement = document.getElementById('nameError');
    
    if (!name) {
        errorElement.textContent = 'Please enter your full name';
        errorElement.style.display = 'block';
        return false;
    }
    
    if (name.length < 3) {
        errorElement.textContent = 'Name must be at least 3 characters';
        errorElement.style.display = 'block';
        return false;
    }
    
    errorElement.style.display = 'none';
    return true;
}

function validateEmail() {
    const email = document.getElementById('email').value.trim();
    const errorElement = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        errorElement.textContent = 'Please enter a valid email address';
        errorElement.style.display = 'block';
        return false;
    }
    
    errorElement.style.display = 'none';
    return true;
}

function validatePhone() {
    const phone = document.getElementById('phone').value.trim();
    const errorElement = document.getElementById('phoneError');
    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    
    if (!phoneRegex.test(phone)) {
        errorElement.textContent = 'Please enter a valid phone number (10-15 digits)';
        errorElement.style.display = 'block';
        return false;
    }
    
    errorElement.style.display = 'none';
    return true;
}

function validateAndStartTest() {
    if (!document.getElementById('agreeTerms')?.checked) {
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
// TEST FUNCTIONS
// ============================================
function startTest() {
    // Activate security
    isTestActive = true;
    switchCount = 0;
    document.getElementById('switchCount').textContent = maxSwitches;
    
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
    
    // Setup beforeunload warning
    window.addEventListener('beforeunload', beforeUnloadHandler);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function displayQuestions() {
    const container = document.getElementById('questionsContainer');
    const loading = document.getElementById('questionLoading');
    
    if (!container || !loading) return;
    
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

function showSection(section) {
    // Update active button
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide questions
    const allQuestions = document.querySelectorAll('.question-container:not(.question-text-row)');
    const sectionHeaders = document.querySelectorAll('.question-container.question-text-row');
    
    if (section === 'all') {
        allQuestions.forEach(q => q.style.display = 'block');
        sectionHeaders.forEach(h => h.style.display = 'block');
    } else {
        allQuestions.forEach(q => {
            q.style.display = q.dataset.section === section ? 'block' : 'none';
        });
        sectionHeaders.forEach(h => {
            const headerText = h.querySelector('.question-text')?.textContent.toLowerCase() || '';
            h.style.display = headerText.includes(section) ? 'block' : 'none';
        });
    }
}

function updateProgress() {
    let answered = 0;
    Object.values(userResponses).forEach(response => {
        if (response.userAnswer) answered++;
    });
    
    const progressPercentage = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
    
    if (document.getElementById('progressPercentage')) {
        document.getElementById('progressPercentage').textContent = Math.round(progressPercentage);
    }
    if (document.getElementById('answeredCount')) {
        document.getElementById('answeredCount').textContent = answered;
    }
    if (document.getElementById('fixedAnsweredCount')) {
        document.getElementById('fixedAnsweredCount').textContent = answered;
    }
    if (document.getElementById('progressBar')) {
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;
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
        
        // Update warning countdown
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (document.getElementById('warningCountdown')) {
            document.getElementById('warningCountdown').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Change timer color
        const timerElement = document.getElementById('fixedTimer');
        if (timerElement) {
            if (timeLeft <= 300) { // 5 minutes
                timerElement.className = 'fixed-timer-container danger';
            } else if (timeLeft <= 900) { // 15 minutes
                timerElement.className = 'fixed-timer-container warning';
            }
        }
        
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
    if (document.getElementById('fixedTime')) {
        document.getElementById('fixedTime').textContent = timeString;
    }
}

function updateTimerProgress() {
    const progressPercentage = (timeLeft / testConfig.duration) * 100;
    if (document.getElementById('fixedTimerProgress')) {
        document.getElementById('fixedTimerProgress').style.width = `${progressPercentage}%`;
    }
}

function beforeUnloadHandler(e) {
    if (isTestActive) {
        e.preventDefault();
        e.returnValue = 'Your test is in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
}

// ============================================
// SUBMIT & RESULTS FUNCTIONS
// ============================================
async function submitTest() {
    clearInterval(timerInterval);
    isTestActive = false;
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
    
    // Generate test ID
    const testId = 'IBA-' + Date.now().toString().substr(-8);
    
    // Prepare submission data
    const submissionData = {
        testId: testId,
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        totalQuestions: totalQuestions,
        responses: {},
        config: testConfig
    };
    
    // Collect responses
    Object.keys(userResponses).forEach(key => {
        submissionData.responses[key] = userResponses[key].userAnswer || '';
    });
    
    try {
        // Send to Google Sheets
        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(submissionData)
        });
        
        const result = await response.json();
        console.log('Submission result:', result);
        
    } catch (error) {
        console.error("Error submitting test:", error);
    }
    
    // Calculate and display results
    calculateAndDisplayResults(submissionData);
}

function calculateAndDisplayResults(data) {
    let correct = 0, wrong = 0, unattempted = 0;
    let totalMarks = 0;
    
    const sectionScores = {
        English: { correct: 0, wrong: 0, score: 0 },
        Math: { correct: 0, wrong: 0, score: 0 },
        Analytical: { correct: 0, wrong: 0, score: 0 }
    };
    
    Object.values(userResponses).forEach(response => {
        const section = response.section;
        
        if (!response.userAnswer) {
            unattempted++;
        } else {
            // For demo, simulate scores (in real app, compare with correct answers)
            const isCorrect = Math.random() > 0.4;
            
            if (isCorrect) {
                correct++;
                totalMarks += 1;
                sectionScores[section].correct++;
                sectionScores[section].score += 1;
            } else {
                wrong++;
                totalMarks -= 0.25;
                sectionScores[section].wrong++;
                sectionScores[section].score -= 0.25;
            }
        }
    });
    
    // Calculate pass/fail
    const passStatus = {
        English: sectionScores.English.score >= testConfig.passingMarks.english,
        Math: sectionScores.Math.score >= testConfig.passingMarks.math,
        Analytical: sectionScores.Analytical.score >= testConfig.passingMarks.analytical
    };
    
    const allPassed = passStatus.English && passStatus.Math && passStatus.Analytical;
    
    // Display results
    displayResults(data.testId, {
        totalMarks: Math.max(totalMarks, 0).toFixed(2),
        correct,
        wrong,
        unattempted,
        sectionScores,
        passStatus,
        allPassed
    });
}

function displayResults(testId, results) {
    // Update test ID
    document.getElementById('testIdDisplay').textContent = testId;
    
    // Update overall scores
    document.getElementById('finalScore').textContent = results.totalMarks;
    document.getElementById('correctCount').textContent = results.correct;
    document.getElementById('wrongCount').textContent = results.wrong;
    document.getElementById('unattemptedCount').textContent = results.unattempted;
    
    // Update section scores
    const sections = ['English', 'Math', 'Analytical'];
    sections.forEach(section => {
        const sectionData = results.sectionScores[section];
        const passed = results.passStatus[section];
        
        document.getElementById(`${section.toLowerCase()}Score`).textContent = sectionData.score.toFixed(2);
        document.getElementById(`${section.toLowerCase()}Correct`).textContent = sectionData.correct;
        document.getElementById(`${section.toLowerCase()}Wrong`).textContent = sectionData.wrong;
        
        const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
        statusElement.textContent = passed ? 'PASS' : 'FAIL';
        statusElement.className = `status-badge ${passed ? 'pass' : 'fail'}`;
        
        // Color code section cards
        const card = document.getElementById(`${section.toLowerCase()}Card`);
        if (passed) {
            card.style.borderColor = '#4caf50';
            card.style.background = '#f1f8e9';
        } else {
            card.style.borderColor = '#f44336';
            card.style.background = '#ffebee';
        }
    });
    
    // Update result message
    const resultMessage = document.getElementById('resultMessage');
    if (results.allPassed) {
        resultMessage.innerHTML = '<i class="fas fa-trophy"></i><p>Congratulations! You passed all sections!</p>';
        resultMessage.style.background = '#d4edda';
        resultMessage.style.color = '#155724';
    } else {
        const failedSections = sections.filter(s => !results.passStatus[s]);
        resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>You need to improve in: ${failedSections.join(', ')}</p>`;
        resultMessage.style.background = '#f8d7da';
        resultMessage.style.color = '#721c24';
    }
    
    // Show result overlay
    document.getElementById('resultOverlay').style.display = 'flex';
    document.getElementById('fixedTimer').style.display = 'none';
    document.getElementById('mobileSubmit').style.display = 'none';
}

function closeResults() {
    document.getElementById('resultOverlay').style.display = 'none';
    resetTest();
}

function printResults() {
    window.print();
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
        document.getElementById('switchCount').textContent = maxSwitches;
        
        // Show form
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}
