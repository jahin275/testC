// Global variables
let startTime;
let timerInterval;
let timeLeft = 5400; // 90 minutes in seconds (90 * 60)
let totalQuestions = 0;
let questionsData = [];
let correctAnswers = {};
let redirectTimer;
let redirectSeconds = 5;
let questionSections = new Set();

// UPDATED: 90 minutes, -0.25 penalty
let testConfig = {
    duration: 5400, // 90 minutes in seconds
    correctMark: 1,
    wrongPenalty: 0.25, // -0.25 for wrong
    allowNegative: true,
    passingMarks: {
        english: 8.75,
        math: 4.5,
        analytical: 3.5
    }
};

// Store user responses for detailed analysis
let userResponses = {};

// Security variables for tab switching
let switchCount = 0;
const maxSwitches = 3;
let isTestActive = false;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Apps Script URL - DU IBA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DU IBA Mock Test System Initialized');
    console.log('Mobile device:', isMobile);
    
    loadQuestions();
    setupEventListeners();
    setupTouchEvents();
});

// Set up event listeners
function setupEventListeners() {
    // Input validation
    document.getElementById('name').addEventListener('input', validateName);
    document.getElementById('email').addEventListener('input', validateEmail);
    document.getElementById('phone').addEventListener('input', validatePhone);
    
    // Enter key to start test
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.getElementById('testForm').style.display !== 'none') {
            validateAndStartTest();
        }
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            updateFixedTimer();
            if (window.MathJax && MathJax.typeset) {
                MathJax.typeset();
            }
        }, 300);
    });
    
    // Security: Prevent tab switching
    document.addEventListener('visibilitychange', function() {
        if (isTestActive && document.hidden) {
            switchCount++;
            document.getElementById('switchCount').textContent = maxSwitches - switchCount;
            
            alert(`Warning ${switchCount}/${maxSwitches}: Tab switching is prohibited!`);
            
            if (switchCount >= maxSwitches) {
                alert('Test terminated due to multiple tab switches!');
                submitTest();
            }
        }
    });
    
    // Prevent right-click during test
    document.addEventListener('contextmenu', function(e) {
        if (isTestActive) {
            e.preventDefault();
            alert('Right-click is disabled during the test!');
        }
    });
    
    // Prevent keyboard shortcuts during test
    document.addEventListener('keydown', function(e) {
        if (isTestActive) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                alert('Developer tools are disabled during the test!');
            }
            
            if (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
                e.preventDefault();
                alert('Copy/paste is disabled during the test!');
            }
        }
    });
}

// Setup touch events for better mobile interaction
function setupTouchEvents() {
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('.option')) {
            e.target.closest('.option').classList.add('touch-active');
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        const activeElement = document.querySelector('.option.touch-active');
        if (activeElement) {
            setTimeout(() => activeElement.classList.remove('touch-active'), 150);
        }
    }, { passive: true });
}

// Fetch questions from Google Sheets
async function loadQuestions() {
    try {
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        document.getElementById('questionSourceInfo').textContent = 'Loading questions...';
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        
        const url = APPS_SCRIPT_URL + "?t=" + Date.now();
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.questions && result.questions.length > 0) {
            questionsData = result.questions;
            totalQuestions = questionsData.filter(q => {
                const type = q.Type || '';
                return !type.includes('Text Row') && q.Question;
            }).length;
            
            console.log(`Loaded ${questionsData.length} rows, ${totalQuestions} actual questions from Google Sheets`);
            
            // Store config if available
            if (result.config) {
                testConfig = { ...testConfig, ...result.config };
            }
            
            processQuestions();
            
        } else {
            throw new Error("No questions found in Google Sheets");
        }
        
    } catch (error) {
        console.error("Error loading questions:", error);
        loadSampleQuestions();
    }
}

// Process questions data
function processQuestions() {
    correctAnswers = {};
    questionSections.clear();
    userResponses = {};
    
    console.log("Processing questions...");
    
    let questionCounter = 0;
    
    questionsData.forEach((q, index) => {
        const type = q.Type || '';
        
        // Skip text rows
        if (type.includes('Text Row') || !q.Question) return;
        
        questionCounter++;
        const questionId = `q${questionCounter}`;
        
        let questionText = '';
        let optionA = '';
        let optionB = '';
        let optionC = '';
        let optionD = '';
        let answer = '';
        let section = 'English';
        let marksValue = testConfig.correctMark;
        
        // Extract data
        for (let key in q) {
            const value = q[key];
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('question')) questionText = value || '';
            else if (lowerKey.includes('option a')) optionA = value || '';
            else if (lowerKey.includes('option b')) optionB = value || '';
            else if (lowerKey.includes('option c')) optionC = value || '';
            else if (lowerKey.includes('option d')) optionD = value || '';
            else if (lowerKey.includes('answer')) answer = String(value).trim().toLowerCase();
            else if (lowerKey.includes('mark')) marksValue = parseFloat(value) || testConfig.correctMark;
        }
        
        // Determine section
        const typeLower = type.toLowerCase();
        if (typeLower.includes('math')) section = 'Math';
        if (typeLower.includes('analytical') || typeLower.includes('puzzle') || 
            typeLower.includes('critical') || typeLower.includes('data')) section = 'Analytical';
        
        // Store processed data
        q.questionText = questionText;
        q.optionA = optionA;
        q.optionB = optionB;
        q.optionC = optionC;
        q.optionD = optionD;
        q.section = section;
        q.answer = answer;
        q.marks = marksValue;
        
        if (answer) {
            correctAnswers[questionId] = answer;
        }
        
        questionSections.add(section);
        
        userResponses[questionId] = {
            questionNumber: questionCounter,
            questionText: questionText,
            userAnswer: '',
            correctAnswer: answer,
            isCorrect: false,
            selectedOption: '',
            options: {
                A: optionA,
                B: optionB,
                C: optionC,
                D: optionD
            },
            section: section,
            marks: marksValue
        };
    });
    
    updateFormInfo();
    
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('questionSourceInfo').textContent = `Loaded ${questionCounter} questions from Google Sheets`;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    console.log(`Processed ${questionCounter} questions`);
}

// Load sample questions (fallback)
function loadSampleQuestions() {
    console.log('Loading sample questions...');
    
    questionsData = [
        {
            "Question": "1. The CEO's __________ management style discouraged open communication.",
            "Option A": "conciliatory",
            "Option B": "autocratic", 
            "Option C": "benevolent",
            "Option D": "lenient",
            "Answer": "B",
            "Type": "English",
            "Marks": "1"
        },
        {
            "Question": "2. Solve: $x^2 - 5x + 6 = 0$",
            "Option A": "2, 3",
            "Option B": "1, 6",
            "Option C": "-2, -3", 
            "Option D": "None",
            "Answer": "A",
            "Type": "Math",
            "Marks": "1"
        }
    ];
    
    totalQuestions = questionsData.length;
    processQuestions();
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} sample questions`;
}

function updateFormInfo() {
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('fixedTotalQuestions').textContent = totalQuestions;
    document.getElementById('totalQuestionsResult').textContent = totalQuestions;
    
    // Calculate section counts
    const sectionCounts = { English: 0, Math: 0, Analytical: 0 };
    Object.values(userResponses).forEach(response => {
        if (sectionCounts[response.section] !== undefined) {
            sectionCounts[response.section]++;
        }
    });
    
    let sectionsText = "";
    const sections = [];
    if (sectionCounts.English > 0) sections.push(`English (${sectionCounts.English})`);
    if (sectionCounts.Math > 0) sections.push(`Math (${sectionCounts.Math})`);
    if (sectionCounts.Analytical > 0) sections.push(`Analytical (${sectionCounts.Analytical})`);
    
    document.getElementById('sectionsInfo').textContent = sections.join(", ");
    
    const durationMinutes = testConfig.duration / 60;
    document.getElementById('testDurationInfo').textContent = durationMinutes;
    document.getElementById('autoSubmitInfo').textContent = `Auto-submission after ${durationMinutes} minutes`;
    
    // Display marking system
    document.getElementById('correctMarking').textContent = testConfig.correctMark;
    document.getElementById('wrongMarking').textContent = testConfig.wrongPenalty;
    document.getElementById('marksPerQuestion').textContent = testConfig.correctMark;
    document.getElementById('negativeMarks').textContent = testConfig.wrongPenalty;
    
    // Display passing marks
    document.getElementById('passingEnglish').textContent = testConfig.passingMarks.english;
    document.getElementById('passingMath').textContent = testConfig.passingMarks.math;
    document.getElementById('passingAnalytical').textContent = testConfig.passingMarks.analytical;
}

// Validation functions
function validateName() {
    const name = document.getElementById('name').value.trim();
    const errorElement = document.getElementById('nameError');
    
    if (name === '') {
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
    // Check terms agreement
    if (!document.getElementById('agreeTerms').checked) {
        alert('You must agree to the test rules before starting');
        return;
    }
    
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    
    if (questionsData.length === 0) {
        alert("Questions are not loaded. Please refresh the page or check your connection.");
        loadQuestions();
        return;
    }
    
    if (isNameValid && isEmailValid && isPhoneValid) {
        startTest();
    }
}

function startTest() {
    // Activate test and security
    isTestActive = true;
    switchCount = 0;
    document.getElementById('switchCount').textContent = maxSwitches;
    
    startTime = new Date().toISOString();
    
    document.getElementById('testForm').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    document.getElementById('fixedTimer').style.display = 'block';
    
    if (isMobile) {
        document.getElementById('mobileFloatingSubmit').style.display = 'block';
    }
    
    timeLeft = testConfig.duration;
    updateFixedTimerDisplay();
    document.getElementById('fixedTimer').className = 'fixed-timer-container';
    document.getElementById('autoSubmitWarning').style.display = 'none';
    
    displayQuestions();
    startTimer();
    updateProgressBar();
    updateFixedTimer();
    
    window.addEventListener('beforeunload', function(e) {
        if (isTestActive) {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
            return e.returnValue;
        }
    });
    
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}

function updateFixedTimer() {
    const timer = document.getElementById('fixedTimer');
    if (timer) {
        timer.style.top = '0';
        timer.style.left = '0';
        timer.style.right = '0';
    }
}

// Display questions
function displayQuestions() {
    const questionsContainer = document.getElementById('questionsContainer');
    const questionLoading = document.getElementById('questionLoading');
    const quizError = document.getElementById('quizError');
    
    questionsContainer.innerHTML = '';
    questionLoading.style.display = 'block';
    quizError.style.display = 'none';
    
    if (questionsData.length === 0) {
        questionLoading.style.display = 'none';
        quizError.style.display = 'block';
        return;
    }
    
    console.log("Displaying questions...");
    
    // Group questions by section
    const questionsBySection = { English: [], Math: [], Analytical: [] };
    let questionCounter = 0;
    
    questionsData.forEach((q, index) => {
        const type = q.Type || '';
        const isTextRow = type.includes('Text Row');
        
        if (isTextRow) {
            // Display text row
            const textDiv = document.createElement('div');
            textDiv.className = 'question-container question-text-row';
            textDiv.innerHTML = `<div class="question-text">${q.Question || ''}</div>`;
            questionsContainer.appendChild(textDiv);
        } else if (q.Question) {
            // Display actual question
            questionCounter++;
            const section = q.section || 'English';
            
            if (!questionsBySection[section]) {
                questionsBySection[section] = [];
            }
            questionsBySection[section].push({
                ...q,
                index: questionCounter
            });
        }
    });
    
    // Display questions by section
    Object.entries(questionsBySection).forEach(([section, questions]) => {
        if (questions.length > 0) {
            // Add section header
            const sectionHeader = document.createElement('h3');
            sectionHeader.className = 'section-title';
            sectionHeader.style.fontSize = '1.2rem';
            sectionHeader.style.marginTop = '20px';
            sectionHeader.innerHTML = `<i class="fas fa-book"></i> ${section} (${questions.length} Questions)`;
            questionsContainer.appendChild(sectionHeader);
            
            // Add questions for this section
            questions.forEach(q => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.id = `q${q.index}`;
                questionDiv.dataset.section = section.toLowerCase();
                
                questionDiv.innerHTML = `
                    <div class="question-number">${q.index}</div>
                    <div class="question-text">${escapeHtml(q.Question || '')}</div>
                    <div class="options-container">
                        <div class="option" onclick="selectOption('q${q.index}', 'a')">
                            <input type="radio" name="q${q.index}" value="a" id="q${q.index}a">
                            <div class="option-label">A) ${escapeHtml(q['Option A'] || '')}</div>
                        </div>
                        <div class="option" onclick="selectOption('q${q.index}', 'b')">
                            <input type="radio" name="q${q.index}" value="b" id="q${q.index}b">
                            <div class="option-label">B) ${escapeHtml(q['Option B'] || '')}</div>
                        </div>
                        <div class="option" onclick="selectOption('q${q.index}', 'c')">
                            <input type="radio" name="q${q.index}" value="c" id="q${q.index}c">
                            <div class="option-label">C) ${escapeHtml(q['Option C'] || '')}</div>
                        </div>
                        <div class="option" onclick="selectOption('q${q.index}', 'd')">
                            <input type="radio" name="q${q.index}" value="d" id="q${q.index}d">
                            <div class="option-label">D) ${escapeHtml(q['Option D'] || '')}</div>
                        </div>
                    </div>
                `;
                
                questionsContainer.appendChild(questionDiv);
            });
        }
    });
    
    questionLoading.style.display = 'none';
    
    if (window.MathJax && MathJax.typeset) {
        setTimeout(() => {
            console.log("Rendering MathJax for LaTeX...");
            MathJax.typeset();
        }, 1000);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Timer functions
function startTimer() {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        
        updateFixedTimerDisplay();
        updateTimerProgress();
        
        const timerElement = document.getElementById('fixedTimer');
        if (timeLeft <= 300) { // 5 minutes
            timerElement.className = 'fixed-timer-container danger';
        } else if (timeLeft <= 900) { // 15 minutes
            timerElement.className = 'fixed-timer-container warning';
        }
        
        if (timeLeft === 600) {
            document.getElementById('autoSubmitWarning').style.display = 'block';
            showNotification('10 minutes remaining! Auto-submit soon.');
        }
        
        if (timeLeft === 300) {
            showNotification('5 minutes remaining! Hurry up!');
        }
        
        if (timeLeft === 60) {
            showNotification('1 minute remaining! Submit now!');
        }
        
        if (timeLeft <= 600 && timeLeft > 0) {
            const minutesLeft = Math.ceil(timeLeft / 60);
            document.getElementById('warningCountdown').textContent = minutesLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('autoSubmitWarning').style.display = 'none';
            showNotification('Time is up! Auto-submitting...');
            setTimeout(submitTest, 1000);
        }
    }, 1000);
}

function updateFixedTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('fixedTime').textContent = timeString;
}

function updateTimerProgress() {
    const progressPercentage = (timeLeft / testConfig.duration) * 100;
    document.getElementById('fixedTimerProgress').style.width = `${progressPercentage}%`;
    
    const progressFill = document.getElementById('fixedTimerProgress');
    if (timeLeft <= 300) { // 5 minutes
        progressFill.style.background = 'linear-gradient(to right, #ff4500, #ff6a00)';
    } else if (timeLeft <= 900) { // 15 minutes
        progressFill.style.background = 'linear-gradient(to right, #ff9800, #ffb74d)';
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #283593;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10001;
        font-weight: bold;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notification animation
if (!document.querySelector('style#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideDown {
            from { top: -50px; opacity: 0; }
            to { top: 80px; opacity: 1; }
        }
        @keyframes slideUp {
            from { top: 80px; opacity: 1; }
            to { top: -50px; opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function selectOption(questionId, option) {
    const options = document.querySelectorAll(`input[name=${questionId}]`);
    options.forEach(opt => {
        opt.checked = false;
        opt.parentElement.classList.remove('selected');
    });
    
    const selectedOption = document.getElementById(`${questionId}${option}`);
    if (selectedOption) {
        selectedOption.checked = true;
        selectedOption.parentElement.classList.add('selected');
        
        if (userResponses[questionId]) {
            userResponses[questionId].userAnswer = option.toLowerCase();
            userResponses[questionId].selectedOption = option.toUpperCase();
            userResponses[questionId].isCorrect = (option.toLowerCase() === userResponses[questionId].correctAnswer);
        }
        
        if (isMobile && navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    updateProgressBar();
    updateAnsweredCount();
}

function updateProgressBar() {
    let answered = 0;
    for (let i = 1; i <= totalQuestions; i++) {
        const selected = document.querySelector(`input[name=q${i}]:checked`);
        if (selected) answered++;
    }
    
    const progressPercentage = (answered / totalQuestions) * 100;
    document.getElementById('progressBar').style.width = `${progressPercentage}%`;
}

function updateAnsweredCount() {
    let answered = 0;
    for (let i = 1; i <= totalQuestions; i++) {
        const selected = document.querySelector(`input[name=q${i}]:checked`);
        if (selected) answered++;
    }
    
    document.getElementById('fixedAnsweredCount').textContent = answered;
    document.getElementById('answeredCount').textContent = answered;
}

// Submit test
function submitTest() {
    clearInterval(timerInterval);
    isTestActive = false;
    
    const endTime = new Date().toISOString();
    
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    let totalMarks = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;
    
    const detailedAnalysis = [];
    const sectionScores = {
        English: { correct: 0, wrong: 0, score: 0 },
        Math: { correct: 0, wrong: 0, score: 0 },
        Analytical: { correct: 0, wrong: 0, score: 0 }
    };
    
    for (let i = 1; i <= totalQuestions; i++) {
        const questionId = `q${i}`;
        const selected = document.querySelector(`input[name=${questionId}]:checked`);
        const questionData = userResponses[questionId];
        
        if (!selected) {
            unattempted++;
            if (questionData) {
                questionData.userAnswer = '';
                questionData.isCorrect = false;
            }
        } else {
            const userAnswer = selected.value.toLowerCase().trim();
            const correctAnswer = correctAnswers[questionId];
            const section = questionData?.section || 'English';
            
            if (questionData) {
                detailedAnalysis.push({
                    questionNumber: i,
                    questionText: questionData.questionText.substring(0, 100) + (questionData.questionText.length > 100 ? '...' : ''),
                    userAnswer: userAnswer.toUpperCase(),
                    correctAnswer: correctAnswer ? correctAnswer.toUpperCase() : '',
                    isCorrect: correctAnswer && userAnswer === correctAnswer,
                    section: section,
                    marks: questionData.marks
                });
                
                if (correctAnswer && userAnswer === correctAnswer) {
                    correct++;
                    positiveMarks += questionData.marks || 1;
                    sectionScores[section].correct++;
                    sectionScores[section].score += questionData.marks || 1;
                } else {
                    wrong++;
                    const penalty = (questionData.marks || 1) * testConfig.wrongPenalty;
                    negativeMarks += penalty;
                    sectionScores[section].wrong++;
                    sectionScores[section].score -= penalty;
                }
            }
        }
    }
    
    totalMarks = positiveMarks - negativeMarks;
    
    // Calculate pass/fail status
    const passStatus = {
        English: sectionScores.English.score >= testConfig.passingMarks.english,
        Math: sectionScores.Math.score >= testConfig.passingMarks.math,
        Analytical: sectionScores.Analytical.score >= testConfig.passingMarks.analytical
    };
    
    const allPassed = passStatus.English && passStatus.Math && passStatus.Analytical;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.round((end - start) / 1000);
    const durationMinutes = (durationSeconds / 60).toFixed(2);
    
    // Generate test ID
    const testId = "IBA-" + Date.now().toString().substr(-8);
    
    showResults(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationMinutes);
    sendToGoogleSheets(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationSeconds, detailedAnalysis);
}

function showResults(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationMinutes) {
    document.getElementById('finalScore').textContent = totalMarks.toFixed(2);
    if (totalMarks < 0) {
        document.getElementById('finalScore').className = 'score-display negative';
    } else {
        document.getElementById('finalScore').className = 'score-display';
    }
    
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('unattemptedCount').textContent = unattempted;
    document.getElementById('netScore').textContent = totalMarks.toFixed(2);
    
    if (totalMarks < 0) {
        document.getElementById('netScore').className = 'result-value negative';
    } else {
        document.getElementById('netScore').className = 'result-value';
    }
    
    // Update section-wise results
    document.getElementById('resultName').textContent = document.getElementById('name').value;
    document.getElementById('resultEmail').textContent = document.getElementById('email').value;
    document.getElementById('testId').textContent = testId;
    document.getElementById('testDuration').textContent = durationMinutes;
    document.getElementById('questionsAttempted').textContent = totalQuestions - unattempted;
    
    // Update section scores
    ['English', 'Math', 'Analytical'].forEach(section => {
        const score = sectionScores[section].score;
        const passed = passStatus[section];
        
        document.getElementById(`${section.toLowerCase()}Score`).textContent = score.toFixed(2);
        document.getElementById(`${section.toLowerCase()}Correct`).textContent = sectionScores[section].correct;
        document.getElementById(`${section.toLowerCase()}Wrong`).textContent = sectionScores[section].wrong;
        
        const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
        statusElement.textContent = passed ? 'PASS' : 'FAIL';
        statusElement.className = `status-badge ${passed ? 'pass' : 'fail'}`;
        
        // Color code section cards
        const card = document.getElementById(`${section.toLowerCase()}Card`);
        if (card) {
            if (passed) {
                card.style.borderColor = '#4caf50';
                card.style.background = '#f1f8e9';
            } else {
                card.style.borderColor = '#f44336';
                card.style.background = '#ffebee';
            }
        }
    });
    
    // Set result message
    let message = "";
    if (allPassed) {
        message = "Congratulations! You passed all sections! 🎉";
        document.getElementById('resultMessage').innerHTML = '<i class="fas fa-trophy"></i><p>' + message + '</p>';
        document.getElementById('resultMessage').style.background = '#d4edda';
        document.getElementById('resultMessage').style.color = '#155724';
    } else {
        const failedSections = [];
        if (!passStatus.English) failedSections.push('English');
        if (!passStatus.Math) failedSections.push('Math');
        if (!passStatus.Analytical) failedSections.push('Analytical');
        
        message = `Unfortunately you failed ${failedSections.join(', ')} section(s). You need to work more on these.`;
        document.getElementById('resultMessage').innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>' + message + '</p>';
        document.getElementById('resultMessage').style.background = '#f8d7da';
        document.getElementById('resultMessage').style.color = '#721c24';
    }
    
    document.getElementById('resultOverlay').style.display = 'flex';
    document.getElementById('fixedTimer').style.display = 'none';
    document.getElementById('mobileFloatingSubmit').style.display = 'none';
    
    startRedirectCountdown();
}

function sendToGoogleSheets(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationSeconds, detailedAnalysis) {
    const url = APPS_SCRIPT_URL;
    
    const data = {
        testId: testId,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        startTime: startTime,
        endTime: new Date().toISOString(),
        duration: durationSeconds.toString(),
        correct: correct,
        wrong: wrong,
        unattempted: unattempted,
        positiveMarks: (correct * 1).toFixed(2),
        negativeMarks: (wrong * 0.25).toFixed(2),
        totalMarks: totalMarks.toFixed(2),
        percentage: totalQuestions > 0 ? ((totalMarks / totalQuestions) * 100).toFixed(2) : 0,
        totalQuestions: totalQuestions,
        sectionScores: sectionScores,
        passStatus: passStatus,
        allPassed: allPassed,
        source: "DU IBA Mock Test by Plan C",
        timestamp: new Date().toISOString(),
        device: isMobile ? "Mobile" : "Desktop",
        detailedAnalysis: detailedAnalysis
    };
    
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(d => {
        console.log("Data sent to Google Sheets successfully:", d);
    })
    .catch(err => {
        console.error("Failed to send data to Google Sheets:", err);
    });
}

function startRedirectCountdown() {
    clearInterval(redirectTimer);
    redirectSeconds = 5;
    document.getElementById('redirectCountdown').textContent = redirectSeconds;
    
    redirectTimer = setInterval(() => {
        redirectSeconds--;
        document.getElementById('redirectCountdown').textContent = redirectSeconds;
        
        if (redirectSeconds <= 0) {
            clearInterval(redirectTimer);
            redirectNow();
        }
    }, 1000);
}

function redirectNow() {
    clearInterval(redirectTimer);
    window.location.reload();
}

function resetTest() {
    if (confirm("Are you sure you want to reset the test? All your answers will be lost.")) {
        // Clear selections
        for (let i = 1; i <= totalQuestions; i++) {
            const options = document.querySelectorAll(`input[name=q${i}]`);
            options.forEach(opt => {
                opt.checked = false;
                opt.parentElement.classList.remove('selected');
            });
        }
        
        // Reset timer and security
        clearInterval(timerInterval);
        timeLeft = testConfig.duration;
        updateFixedTimerDisplay();
        document.getElementById('fixedTimer').className = 'fixed-timer-container';
        document.getElementById('autoSubmitWarning').style.display = 'none';
        
        // Reset progress
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('fixedAnsweredCount').textContent = '0';
        document.getElementById('answeredCount').textContent = '0';
        
        // Hide elements
        document.getElementById('fixedTimer').style.display = 'none';
        document.getElementById('mobileFloatingSubmit').style.display = 'none';
        
        // Show form
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // Reset security
        isTestActive = false;
        switchCount = 0;
        document.getElementById('switchCount').textContent = maxSwitches;
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}

// Fix for the duplicate declaration issue
if (typeof window.duIbaTestLoaded === 'undefined') {
    window.duIbaTestLoaded = true;
} else {
    console.warn('DU IBA Test script already loaded!');
}
