// Global variables
let startTime;
let timerInterval;
let timeLeft = 3600; // 60 minutes in seconds (60 * 60)
let totalQuestions = 0;
let questionsData = [];
let correctAnswers = {};
let redirectTimer;
let redirectSeconds = 5;
let questionSections = new Set();
let testConfig = {
    duration: 3600, // 60 minutes in seconds
    correctMark: 1,
    wrongPenalty: 0.5, // 0.5 negative marks per wrong answer
    allowNegative: true
};

// Store user responses for detailed analysis
let userResponses = {};

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('BUP Test System Initialized');
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
            // Re-render MathJax after orientation change
            if (window.MathJax && MathJax.typeset) {
                MathJax.typeset();
            }
        }, 300);
    });
}

// Setup touch events for better mobile interaction
function setupTouchEvents() {
    // Add touch feedback to options
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

// Function to process LaTeX - FIXED
function processLaTeX(text) {
    if (!text || typeof text !== 'string') return text || '';
    
    // Preserve LaTeX exactly as it is - don't convert $...$
    // MathJax will handle it directly
    return text;
}

// Fetch questions from Google Sheets
async function loadQuestions() {
    try {
        // Show loading state
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        document.getElementById('questionSourceInfo').textContent = 'Loading questions...';
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        
        // Try to load from Google Sheets
        const url = "https://script.google.com/macros/s/AKfycbyoYPdDK8clXKIJrKSuQSG6mERPP20LPfz-9YBnyWWyG8XkLjAhGzrKEKi62FvFyXoDbw/exec";
        
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
            
            // Process questions
            processQuestions();
            
        } else {
            throw new Error("No questions found in Google Sheets");
        }
        
    } catch (error) {
        console.error("Error loading questions:", error);
        
        // Fallback to sample questions
        loadSampleQuestions();
    }
}

// Process questions data - FIXED
function processQuestions() {
    // Clear previous data
    correctAnswers = {};
    questionSections.clear();
    userResponses = {};
    
    console.log("Processing questions...");
    
    // Process questions data
    questionsData.forEach((q, index) => {
        const questionId = `q${index + 1}`;
        
        // Extract data - handle different possible property names
        let questionText = q.Question || q.question || q['Question'] || '';
        let optionA = q['Option A'] || q.optionA || q.optiona || '';
        let optionB = q['Option B'] || q.optionB || q.optionb || '';
        let optionC = q['Option C'] || q.optionC || q.optionc || '';
        let optionD = q['Option D'] || q.optionD || q.optiond || '';
        
        // Normalize the answer
        let answer = '';
        if (q.Answer !== undefined) answer = String(q.Answer).trim().toLowerCase();
        else if (q.answer !== undefined) answer = String(q.answer).trim().toLowerCase();
        
        // Get question type
        let type = 'General';
        if (q.Type !== undefined) type = q.Type;
        else if (q.type !== undefined) type = q.type;
        
        // Get marks
        let marksValue = testConfig.correctMark;
        if (q.Marks !== undefined) marksValue = parseFloat(q.Marks) || testConfig.correctMark;
        else if (q.marks !== undefined) marksValue = parseFloat(q.marks) || testConfig.correctMark;
        
        // Store processed data
        q.questionText = questionText;
        q.optionA = optionA;
        q.optionB = optionB;
        q.optionC = optionC;
        q.optionD = optionD;
        
        if (answer) {
            correctAnswers[questionId] = answer;
        }
        
        // Store type
        questionSections.add(type);
        
        // Initialize user response
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
        
        // Debug first 3 questions
        if (index < 3) {
            console.log(`Question ${index + 1}:`, {
                question: questionText.substring(0, 50) + '...',
                optionA: optionA,
                optionB: optionB,
                answer: answer,
                type: type
            });
        }
    });
    
    // Update UI with loaded data
    updateFormInfo();
    
    // Enable start button
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} questions from Google Sheets`;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    console.log(`Processed ${totalQuestions} questions`);
}

// Load sample questions (fallback)
function loadSampleQuestions() {
    console.log('Loading sample questions...');
    
    // Use actual data with LaTeX
    questionsData = [
        {
            "Question": "If $f(x) = \\frac{x+2}{x-2}$ for all integers except $x=2$, which has the greatest value?",
            "Option A": "$f(-1)$",
            "Option B": "$f(0)$",
            "Option C": "$f(1)$",
            "Option D": "$f(3)$",
            "Answer": "D",
            "Type": "Math",
            "Marks": "1"
        },
        {
            "Question": "Solve: $x^2 + x = 1$",
            "Option A": "$\\frac{-1 \\pm \\sqrt{5}}{2}$",
            "Option B": "$\\frac{-2 \\pm \\sqrt{5}}{1}$",
            "Option C": "$\\frac{1 \\pm \\sqrt{5}}{2}$",
            "Option D": "$\\frac{-5 \\pm \\sqrt{1}}{2}$",
            "Answer": "A",
            "Type": "Math",
            "Marks": "1"
        },
        {
            "Question": "If 2 men or 3 women can do a piece of work in 42 days, then 6 men and 12 women together can finish it in—",
            "Option A": "4 days",
            "Option B": "6 days",
            "Option C": "8 days",
            "Option D": "9 days",
            "Answer": "B",
            "Type": "Math",
            "Marks": "1"
        }
    ];
    
    totalQuestions = questionsData.length;
    
    // Process the sample questions
    processQuestions();
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} sample questions`;
}

function updateFormInfo() {
    // Update total questions count
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('fixedTotalQuestions').textContent = totalQuestions;
    document.getElementById('totalQuestionsResult').textContent = totalQuestions;
    
    // Update sections info
    const sectionsArray = Array.from(questionSections);
    let sectionsText = "";
    
    if (sectionsArray.length > 0) {
        // Count questions per section
        const sectionCounts = {};
        questionsData.forEach(q => {
            const type = q.Type || q.type || 'General';
            sectionCounts[type] = (sectionCounts[type] || 0) + 1;
        });
        
        // Create sections text
        sectionsText = sectionsArray.map(section => {
            const count = sectionCounts[section] || 0;
            return `${section} (${count})`;
        }).join(", ");
    } else {
        sectionsText = "All Subjects";
    }
    
    document.getElementById('sectionsInfo').textContent = sectionsText;
    
    // Update test duration
    const durationMinutes = testConfig.duration / 60;
    document.getElementById('testDurationInfo').textContent = durationMinutes;
    document.getElementById('autoSubmitInfo').textContent = `Auto-submission after ${durationMinutes} minutes`;
    
    // Update marking system display
    document.getElementById('correctMarking').textContent = testConfig.correctMark;
    document.getElementById('wrongMarking').textContent = testConfig.wrongPenalty;
    document.getElementById('marksPerQuestion').textContent = testConfig.correctMark;
    document.getElementById('negativeMarks').textContent = testConfig.wrongPenalty;
}

// Validation functions (unchanged)
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
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    
    // Validate that questions are loaded
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
    startTime = new Date().toISOString();
    
    // Hide form and show quiz
    document.getElementById('testForm').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    
    // Show fixed timer
    document.getElementById('fixedTimer').style.display = 'block';
    
    // Show mobile floating submit button if on mobile
    if (isMobile) {
        document.getElementById('mobileFloatingSubmit').style.display = 'block';
    }
    
    // Reset timer
    timeLeft = testConfig.duration;
    updateFixedTimerDisplay();
    document.getElementById('fixedTimer').className = 'fixed-timer-container';
    document.getElementById('autoSubmitWarning').style.display = 'none';
    
    // Display questions
    displayQuestions();
    
    // Start the timer
    startTimer();
    
    // Update progress bar
    updateProgressBar();
    
    // Update fixed timer position
    updateFixedTimer();
    
    // Setup beforeunload warning
    window.addEventListener('beforeunload', function(e) {
        if (document.getElementById('quiz').style.display !== 'none') {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
            return e.returnValue;
        }
    });
    
    // Scroll to top
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
}

function updateFixedTimer() {
    // Ensure timer is at top
    const timer = document.getElementById('fixedTimer');
    if (timer) {
        timer.style.top = '0';
        timer.style.left = '0';
        timer.style.right = '0';
    }
}

// Display questions - FIXED for LaTeX
function displayQuestions() {
    const questionsContainer = document.getElementById('questionsContainer');
    const questionLoading = document.getElementById('questionLoading');
    const quizError = document.getElementById('quizError');
    
    // Clear previous questions
    questionsContainer.innerHTML = '';
    questionLoading.style.display = 'block';
    quizError.style.display = 'none';
    
    if (questionsData.length === 0) {
        questionLoading.style.display = 'none';
        quizError.style.display = 'block';
        return;
    }
    
    console.log("Displaying questions...");
    
    // Group questions by type
    const questionsByType = {};
    questionsData.forEach((question, index) => {
        let type = 'General';
        if (question.Type) type = question.Type;
        else if (question.type) type = question.type;
        
        if (!questionsByType[type]) {
            questionsByType[type] = [];
        }
        questionsByType[type].push({...question, index: index + 1});
    });
    
    // Display questions by type
    Object.keys(questionsByType).forEach(type => {
        const typeQuestions = questionsByType[type];
        
        // Add section header
        const sectionHeader = document.createElement('h3');
        sectionHeader.className = 'section-title';
        sectionHeader.style.fontSize = '1.2rem';
        sectionHeader.style.marginTop = '20px';
        sectionHeader.innerHTML = `<i class="fas fa-book"></i> ${type} (${typeQuestions.length} Questions)`;
        questionsContainer.appendChild(sectionHeader);
        
        // Add questions for this section
        typeQuestions.forEach(q => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-container';
            questionDiv.id = `q${q.index}`;
            
            // Use raw text - LaTeX will be rendered by MathJax
            questionDiv.innerHTML = `
                <div class="question-number">${q.index}</div>
                <div class="question-text">${escapeHtml(q.questionText || '')}</div>
                <div class="options-container">
                    <div class="option" onclick="selectOption('q${q.index}', 'a')">
                        <input type="radio" name="q${q.index}" value="a" id="q${q.index}a">
                        <div class="option-label">A) ${escapeHtml(q.optionA || '')}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'b')">
                        <input type="radio" name="q${q.index}" value="b" id="q${q.index}b">
                        <div class="option-label">B) ${escapeHtml(q.optionB || '')}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'c')">
                        <input type="radio" name="q${q.index}" value="c" id="q${q.index}c">
                        <div class="option-label">C) ${escapeHtml(q.optionC || '')}</div>
                    </div>
                    <div class="option" onclick="selectOption('q${q.index}', 'd')">
                        <input type="radio" name="q${q.index}" value="d" id="q${q.index}d">
                        <div class="option-label">D) ${escapeHtml(q.optionD || '')}</div>
                    </div>
                </div>
            `;
            
            questionsContainer.appendChild(questionDiv);
        });
    });
    
    questionLoading.style.display = 'none';
    
    // Re-render MathJax after loading questions
    if (window.MathJax && MathJax.typeset) {
        setTimeout(() => {
            console.log("Rendering MathJax...");
            MathJax.typeset();
        }, 500);
    }
}

// Helper function to escape HTML but preserve LaTeX
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Timer functions (unchanged)
function startTimer() {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        
        // Update timer display
        updateFixedTimerDisplay();
        
        // Update timer progress
        updateTimerProgress();
        
        // Change timer color based on remaining time
        const timerElement = document.getElementById('fixedTimer');
        if (timeLeft <= Math.floor(testConfig.duration * 0.25)) { // Last 15 minutes
            timerElement.className = 'fixed-timer-container danger';
        } else if (timeLeft <= Math.floor(testConfig.duration * 0.5)) { // Last 30 minutes
            timerElement.className = 'fixed-timer-container warning';
        }
        
        // Show warning when 10 minutes left
        if (timeLeft === 600) { // 10 minutes = 600 seconds
            document.getElementById('autoSubmitWarning').style.display = 'block';
            showNotification('10 minutes remaining! Auto-submit soon.');
        }
        
        // Show warning when 5 minutes left
        if (timeLeft === 300) { // 5 minutes
            showNotification('5 minutes remaining! Hurry up!');
        }
        
        // Show warning when 1 minute left
        if (timeLeft === 60) { // 1 minute
            showNotification('1 minute remaining! Submit now!');
        }
        
        // Update warning countdown
        if (timeLeft <= 600 && timeLeft > 0) {
            const minutesLeft = Math.ceil(timeLeft / 60);
            document.getElementById('warningCountdown').textContent = minutesLeft;
        }
        
        // Auto-submit when time is up
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
    
    // Change progress bar color based on time
    const progressFill = document.getElementById('fixedTimerProgress');
    if (timeLeft <= testConfig.duration * 0.25) {
        progressFill.style.background = 'linear-gradient(to right, #ff4500, #ff6a00)';
    } else if (timeLeft <= testConfig.duration * 0.5) {
        progressFill.style.background = 'linear-gradient(to right, #ff9800, #ffb74d)';
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff8c00;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10001;
        font-weight: bold;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
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
    // Unselect all options for this question
    const options = document.querySelectorAll(`input[name=${questionId}]`);
    options.forEach(opt => {
        opt.checked = false;
        opt.parentElement.classList.remove('selected');
    });
    
    // Select the clicked option
    const selectedOption = document.getElementById(`${questionId}${option}`);
    if (selectedOption) {
        selectedOption.checked = true;
        selectedOption.parentElement.classList.add('selected');
        
        // Update user response
        const qNum = parseInt(questionId.replace('q', ''));
        if (userResponses[questionId]) {
            userResponses[questionId].userAnswer = option.toLowerCase();
            userResponses[questionId].selectedOption = option.toUpperCase();
            userResponses[questionId].isCorrect = (option.toLowerCase() === userResponses[questionId].correctAnswer);
        }
        
        // Add haptic feedback on mobile
        if (isMobile && navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    // Update progress bar and answered count
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

// Submit test and results functions (unchanged)
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
    
    // Prepare detailed analysis data
    const detailedAnalysis = [];
    
    // Check each question
    for (let i = 1; i <= totalQuestions; i++) {
        const questionId = `q${i}`;
        const selected = document.querySelector(`input[name=${questionId}]:checked`);
        const questionData = questionsData[i - 1];
        const marksForQuestion = questionData.Marks || questionData.marks || testConfig.correctMark;
        
        totalPossibleMarks += parseFloat(marksForQuestion) || testConfig.correctMark;
        
        if (!selected) {
            unattempted++;
            // Update user response for unattempted
            if (userResponses[questionId]) {
                userResponses[questionId].userAnswer = '';
                userResponses[questionId].selectedOption = '';
                userResponses[questionId].isCorrect = false;
            }
        } else {
            const userAnswer = selected.value.toLowerCase().trim();
            const correctAnswer = correctAnswers[questionId];
            
            // Add to detailed analysis
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
                    const penalty = (parseFloat(marksForQuestion) || testConfig.correctMark) * testConfig.wrongPenalty;
                    negativeMarks += penalty;
                }
            }
        }
    }
    
    // Calculate net score (allow negative scores)
    totalMarks = positiveMarks - negativeMarks;
    
    // Calculate percentage based on total possible marks
    const percentage = totalPossibleMarks > 0 ? ((totalMarks / totalPossibleMarks) * 100).toFixed(2) : 0;
    
    // Generate test ID
    const testId = "BUP-" + Date.now().toString().substr(-8);
    
    // Calculate time taken (in minutes)
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.round((end - start) / 1000);
    const durationMinutes = (durationSeconds / 60).toFixed(2);
    
    // Show results
    showResults(correct, wrong, unattempted, totalMarks, percentage, testId, durationMinutes, positiveMarks, negativeMarks);
    
    // Send data to Google Sheets
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
    
    document.getElementById('resultName').textContent = document.getElementById('name').value;
    document.getElementById('resultEmail').textContent = document.getElementById('email').value;
    document.getElementById('testId').textContent = testId;
    document.getElementById('testDuration').textContent = durationMinutes;
    document.getElementById('questionsAttempted').textContent = totalQuestions - unattempted;
    
    // Set result message based on score
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
    
    // Show result overlay
    document.getElementById('resultOverlay').style.display = 'flex';
    
    // Hide fixed timer
    document.getElementById('fixedTimer').style.display = 'none';
    
    // Start redirect countdown
    startRedirectCountdown();
}

function sendToGoogleSheets(correct, wrong, unattempted, totalMarks, percentage, testId, durationSeconds, positiveMarks, negativeMarks, detailedAnalysis) {
    const url = "https://script.google.com/macros/s/AKfycbyoYPdDK8clXKIJrKSuQSG6mERPP20LPfz-9YBnyWWyG8XkLjAhGzrKEKi62FvFyXoDbw/exec";
    
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
        positiveMarks: positiveMarks.toFixed(2),
        negativeMarks: negativeMarks.toFixed(2),
        totalMarks: totalMarks.toFixed(2),
        percentage: percentage,
        totalQuestions: totalQuestions,
        source: "BUP Test System",
        timestamp: new Date().toISOString(),
        device: isMobile ? "Mobile" : "Desktop",
        detailedAnalysis: detailedAnalysis // Send detailed question-by-question analysis
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
        // Clear all selections
        for (let i = 1; i <= totalQuestions; i++) {
            const options = document.querySelectorAll(`input[name=q${i}]`);
            options.forEach(opt => {
                opt.checked = false;
                opt.parentElement.classList.remove('selected');
            });
        }
        
        // Reset timer
        clearInterval(timerInterval);
        timeLeft = testConfig.duration;
        updateFixedTimerDisplay();
        document.getElementById('fixedTimer').className = 'fixed-timer-container';
        document.getElementById('autoSubmitWarning').style.display = 'none';
        
        // Reset progress bar and answered count
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('fixedAnsweredCount').textContent = '0';
        document.getElementById('answeredCount').textContent = '0';
        
        // Hide fixed timer and floating submit
        document.getElementById('fixedTimer').style.display = 'none';
        document.getElementById('mobileFloatingSubmit').style.display = 'none';
        
        // Show form again
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // Reset form fields
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}
