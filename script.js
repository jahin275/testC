// Global variables
let startTime;
let timerInterval;
let timeLeft = 3600; // 60 minutes in seconds
let totalQuestions = 0;
let questionsData = [];
let correctAnswers = {};
let redirectTimer;
let redirectSeconds = 5;
let questionSections = new Set();

// UPDATED: Changed wrong penalty to 0.20
let testConfig = {
    duration: 3600, // 60 minutes in seconds
    correctMark: 1,
    wrongPenalty: 0.20, // CHANGED FROM 0.5 TO 0.20
    allowNegative: true
};

// Store user responses for detailed analysis
let userResponses = {};

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('JU IBA Test System Initialized');
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
    // NEW: JU IBA Roll validation
    document.getElementById('juIbaRoll').addEventListener('input', validateJuIbaRoll);
    
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
}

// NEW: Validate JU IBA Roll
function validateJuIbaRoll() {
    const juIbaRoll = document.getElementById('juIbaRoll').value.trim();
    const errorElement = document.getElementById('juIbaRollError');
    
    if (juIbaRoll === '') {
        errorElement.textContent = 'Please enter your JU IBA Roll number';
        errorElement.style.display = 'block';
        return false;
    }
    
    if (juIbaRoll.length < 7) {
        errorElement.textContent = 'Roll number must be at least 3 characters';
        errorElement.style.display = 'block';
        return false;
    }
    
    errorElement.style.display = 'none';
    return true;
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
        
        // UPDATED: New Google Apps Script URL
        const url = "https://script.google.com/macros/s/AKfycbxyU5YiGXEG_BJ01lppuER_wENTpLE7wsbV0wqSB71QE-Kg9Xz43LbNKdoHm3pKf7Fo/exec";
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.questions && result.questions.length > 0) {
            questionsData = result.questions;
            totalQuestions = questionsData.length;
            
            console.log(`Loaded ${totalQuestions} questions from Google Sheets`);
            console.log("First question data:", questionsData[0]);
            
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
    console.log("First question data structure:", questionsData[0]);
    
    questionsData.forEach((q, index) => {
        const questionId = `q${index + 1}`;
        
        if (index < 3) {
            console.log(`=== Question ${index + 1} Debug ===`);
            console.log("Full object:", q);
            console.log("All keys:", Object.keys(q));
        }
        
        let questionText = '';
        let optionA = '';
        let optionB = '';
        let optionC = '';
        let optionD = '';
        let answer = '';
        let type = 'General';
        let marksValue = testConfig.correctMark;
        
        for (let key in q) {
            const value = q[key];
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('question')) questionText = value || '';
            else if (lowerKey.includes('option a') || lowerKey === 'optiona') optionA = value || '';
            else if (lowerKey.includes('option b') || lowerKey === 'optionb') optionB = value || '';
            else if (lowerKey.includes('option c') || lowerKey === 'optionc') optionC = value || '';
            else if (lowerKey.includes('option d') || lowerKey === 'optiond') optionD = value || '';
            else if (lowerKey.includes('answer')) answer = String(value).trim().toLowerCase();
            else if (lowerKey.includes('type')) type = value || 'General';
            else if (lowerKey.includes('mark')) marksValue = parseFloat(value) || testConfig.correctMark;
        }
        
        if (!questionText && q.Question) questionText = q.Question;
        if (!questionText && q.question) questionText = q.question;
        if (!optionA && q['Option A']) optionA = q['Option A'];
        if (!optionA && q.optionA) optionA = q.optionA;
        if (!answer && q.Answer) answer = String(q.Answer).trim().toLowerCase();
        
        if (index < 3) {
            console.log(`Extracted Q${index + 1}: "${questionText.substring(0, 50)}..."`);
            console.log("Options:", optionA, optionB, optionC, optionD);
            console.log("Answer:", answer, "Type:", type, "Marks:", marksValue);
        }
        
        q.questionText = questionText;
        q.optionA = optionA;
        q.optionB = optionB;
        q.optionC = optionC;
        q.optionD = optionD;
        q.type = type;
        q.answer = answer;
        q.marks = marksValue;
        
        if (answer) {
            correctAnswers[questionId] = answer;
        }
        
        questionSections.add(type);
        
        userResponses[questionId] = {
            questionNumber: index + 1,
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
            section: type,
            marks: marksValue
        };
    });
    
    updateFormInfo();
    
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} questions from Google Sheets`;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    console.log(`Processed ${totalQuestions} questions`);
}

// Load sample questions (fallback)
function loadSampleQuestions() {
    console.log('Loading sample questions...');
    
    questionsData = [
        {
            "Question": "What is the value of π to two decimal places?",
            "Option A": "3.14",
            "Option B": "3.15",
            "Option C": "3.16",
            "Option D": "3.17",
            "Answer": "A",
            "Type": "Math",
            "Marks": "1"
        },
        {
            "Question": "If 2x + 3 = 7, what is the value of x?",
            "Option A": "1",
            "Option B": "2",
            "Option C": "3",
            "Option D": "4",
            "Answer": "B",
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
    
    const sectionsArray = Array.from(questionSections);
    let sectionsText = "";
    
    if (sectionsArray.length > 0) {
        const sectionCounts = {};
        questionsData.forEach(q => {
            const type = q.type || q.Type || 'General';
            sectionCounts[type] = (sectionCounts[type] || 0) + 1;
        });
        
        sectionsText = sectionsArray.map(section => {
            const count = sectionCounts[section] || 0;
            return `${section} (${count})`;
        }).join(", ");
    } else {
        sectionsText = "All Subjects";
    }
    
    document.getElementById('sectionsInfo').textContent = sectionsText;
    
    const durationMinutes = testConfig.duration / 60;
    document.getElementById('testDurationInfo').textContent = durationMinutes;
    document.getElementById('autoSubmitInfo').textContent = `Auto-submission after ${durationMinutes} minutes`;
    
    // UPDATED: Display 0.20 instead of 0.5
    document.getElementById('correctMarking').textContent = testConfig.correctMark;
    document.getElementById('wrongMarking').textContent = testConfig.wrongPenalty;
    document.getElementById('marksPerQuestion').textContent = testConfig.correctMark;
    document.getElementById('negativeMarks').textContent = testConfig.wrongPenalty;
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

// UPDATED: Include JU IBA Roll validation
function validateAndStartTest() {
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isJuIbaRollValid = validateJuIbaRoll(); // NEW
    
    if (questionsData.length === 0) {
        alert("Questions are not loaded. Please refresh the page or check your connection.");
        loadQuestions();
        return;
    }
    
    if (isNameValid && isEmailValid && isPhoneValid && isJuIbaRollValid) { // UPDATED
        startTest();
    }
}

function startTest() {
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
        if (document.getElementById('quiz').style.display !== 'none') {
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
    
    const questionsByType = {};
    questionsData.forEach((question, index) => {
        let type = question.type || question.Type || 'General';
        if (!questionsByType[type]) {
            questionsByType[type] = [];
        }
        questionsByType[type].push({
            ...question,
            index: index + 1,
            questionText: question.questionText || question.Question || '',
            optionA: question.optionA || question['Option A'] || '',
            optionB: question.optionB || question['Option B'] || '',
            optionC: question.optionC || question['Option C'] || '',
            optionD: question.optionD || question['Option D'] || ''
        });
    });
    
    Object.keys(questionsByType).forEach(type => {
        const typeQuestions = questionsByType[type];
        
        const sectionHeader = document.createElement('h3');
        sectionHeader.className = 'section-title';
        sectionHeader.style.fontSize = '1.2rem';
        sectionHeader.style.marginTop = '20px';
        sectionHeader.innerHTML = `<i class="fas fa-book"></i> ${type} (${typeQuestions.length} Questions)`;
        questionsContainer.appendChild(sectionHeader);
        
        typeQuestions.forEach(q => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-container';
            questionDiv.id = `q${q.index}`;
            
            const questionText = q.questionText || `Question ${q.index}`;
            const optionA = q.optionA || '';
            const optionB = q.optionB || '';
            const optionC = q.optionC || '';
            const optionD = q.optionD || '';
            
            questionDiv.innerHTML = `
                <div class="question-number">${q.index}</div>
                <div class="question-text">${escapeHtml(questionText)}</div>
                <div class="options-container">
                    <div class="option" onclick="selectOption('q${q.index}', 'a')">
                        <input type="radio" name="q${q.index}" value="a" id="q${q.index}a">
                        <div class="option-label">A) ${escapeHtml(optionA)}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'b')">
                        <input type="radio" name="q${q.index}" value="b" id="q${q.index}b">
                        <div class="option-label">B) ${escapeHtml(optionB)}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'c')">
                        <input type="radio" name="q${q.index}" value="c" id="q${q.index}c">
                        <div class="option-label">C) ${escapeHtml(optionC)}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'd')">
                        <input type="radio" name="q${q.index}" value="d" id="q${q.index}d">
                        <div class="option-label">D) ${escapeHtml(optionD)}</div>
                    </div>
                </div>
            `;
            
            questionsContainer.appendChild(questionDiv);
        });
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
        if (timeLeft <= Math.floor(testConfig.duration * 0.25)) {
            timerElement.className = 'fixed-timer-container danger';
        } else if (timeLeft <= Math.floor(testConfig.duration * 0.5)) {
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
    if (timeLeft <= testConfig.duration * 0.25) {
        progressFill.style.background = 'linear-gradient(to right, #ff4500, #ff6a00)';
    } else if (timeLeft <= testConfig.duration * 0.5) {
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
        background: #002147;
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
const style = document.createElement('style');
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
        
        const qNum = parseInt(questionId.replace('q', ''));
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
}

// Submit test
function submitTest() {
    clearInterval(timerInterval);
    
    const endTime = new Date().toISOString();
    
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    let totalMarks = 0;
    let totalPossibleMarks = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;
    
    const detailedAnalysis = [];
    
    for (let i = 1; i <= totalQuestions; i++) {
        const questionId = `q${i}`;
        const selected = document.querySelector(`input[name=${questionId}]:checked`);
        const questionData = questionsData[i - 1];
        const marksForQuestion = questionData.marks || questionData.Marks || testConfig.correctMark;
        
        totalPossibleMarks += parseFloat(marksForQuestion) || testConfig.correctMark;
        
        if (!selected) {
            unattempted++;
            if (userResponses[questionId]) {
                userResponses[questionId].userAnswer = '';
                userResponses[questionId].selectedOption = '';
                userResponses[questionId].isCorrect = false;
            }
        } else {
            const userAnswer = selected.value.toLowerCase().trim();
            const correctAnswer = correctAnswers[questionId];
            
            if (userResponses[questionId]) {
                detailedAnalysis.push({
                    questionNumber: i,
                    questionText: userResponses[questionId].questionText.substring(0, 100) + (userResponses[questionId].questionText.length > 100 ? '...' : ''),
                    userAnswer: userAnswer.toUpperCase(),
                    correctAnswer: correctAnswer ? correctAnswer.toUpperCase() : '',
                    isCorrect: correctAnswer && userAnswer === correctAnswer,
                    section: userResponses[questionId].section,
                    marks: marksForQuestion
                });
                
                if (correctAnswer && userAnswer === correctAnswer) {
                    correct++;
                    positiveMarks += parseFloat(marksForQuestion) || testConfig.correctMark;
                } else {
                    wrong++;
                    // UPDATED: Using 0.20 penalty
                    const penalty = (parseFloat(marksForQuestion) || testConfig.correctMark) * testConfig.wrongPenalty;
                    negativeMarks += penalty;
                }
            }
        }
    }
    
    totalMarks = positiveMarks - negativeMarks;
    const percentage = totalPossibleMarks > 0 ? ((totalMarks / totalPossibleMarks) * 100).toFixed(2) : 0;
    
    // UPDATED: Changed prefix to JU-
    const testId = "JU-" + Date.now().toString().substr(-8);
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.round((end - start) / 1000);
    const durationMinutes = (durationSeconds / 60).toFixed(2);
    
    showResults(correct, wrong, unattempted, totalMarks, percentage, testId, durationMinutes, positiveMarks, negativeMarks);
    sendToGoogleSheets(correct, wrong, unattempted, totalMarks, percentage, testId, durationSeconds, positiveMarks, negativeMarks, detailedAnalysis);
}

function showResults(correct, wrong, unattempted, totalMarks, percentage, testId, durationMinutes, positiveMarks, negativeMarks) {
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
    
    // UPDATED: Added JU IBA Roll display
    document.getElementById('resultName').textContent = document.getElementById('name').value;
    document.getElementById('resultEmail').textContent = document.getElementById('email').value;
    document.getElementById('resultJuIbaRoll').textContent = document.getElementById('juIbaRoll').value; // NEW
    document.getElementById('testId').textContent = testId;
    document.getElementById('testDuration').textContent = durationMinutes;
    document.getElementById('questionsAttempted').textContent = totalQuestions - unattempted;
    
    let message = "";
    const percentageNum = parseFloat(percentage);
    if (percentageNum >= 80) {
        message = "Outstanding! You have an excellent chance of getting admission.";
    } else if (percentageNum >= 60) {
        message = "Good job! You have a decent chance of getting admission.";
    } else if (percentageNum >= 40) {
        message = "Fair performance. Consider practicing more.";
    } else if (percentageNum >= 0) {
        message = "You need more preparation. Keep practicing!";
    } else {
        message = "Negative score! Review the concepts and try again.";
    }
    document.getElementById('resultMessage').textContent = message;
    
    document.getElementById('resultOverlay').style.display = 'flex';
    document.getElementById('fixedTimer').style.display = 'none';
    
    startRedirectCountdown();
}

// UPDATED: Send data to new Google Apps Script
function sendToGoogleSheets(correct, wrong, unattempted, totalMarks, percentage, testId, durationSeconds, positiveMarks, negativeMarks, detailedAnalysis) {
    const url = "https://script.google.com/macros/s/AKfycbxyU5YiGXEG_BJ01lppuER_wENTpLE7wsbV0wqSB71QE-Kg9Xz43LbNKdoHm3pKf7Fo/exec";
    
    // UPDATED: Added juIbaRoll to data
    const data = {
        testId: testId,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        juIbaRoll: document.getElementById("juIbaRoll").value, // NEW
        startTime: startTime,
        endTime: new Date().toISOString(),
        duration: durationSeconds.toString(),
        correct: correct,
        wrong: wrong,
        unattempted: unattempted,
        positiveMarks: positiveMarks.toFixed(2),
        negativeMarks: negativeMarks.toFixed(2),
        totalMarks: totalMarks.toFixed(2),
        percentage: percentage,
        totalQuestions: totalQuestions,
        source: "JU IBA Test System by Plan C",
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
        for (let i = 1; i <= totalQuestions; i++) {
            const options = document.querySelectorAll(`input[name=q${i}]`);
            options.forEach(opt => {
                opt.checked = false;
                opt.parentElement.classList.remove('selected');
            });
        }
        
        clearInterval(timerInterval);
        timeLeft = testConfig.duration;
        updateFixedTimerDisplay();
        document.getElementById('fixedTimer').className = 'fixed-timer-container';
        document.getElementById('autoSubmitWarning').style.display = 'none';
        
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('fixedAnsweredCount').textContent = '0';
        
        document.getElementById('fixedTimer').style.display = 'none';
        document.getElementById('mobileFloatingSubmit').style.display = 'none';
        
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // UPDATED: Keep form data except clear roll (optional)
        // Uncomment if you want to clear roll too:
        // document.getElementById('juIbaRoll').value = '';
        
        window.scrollTo(0, 0);
    }
}
