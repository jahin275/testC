// Global variables
let startTime;
let timerInterval;
let timeLeft = 3600; // 60 minutes in seconds (60 * 60)
let totalQuestions = 0;
let questionsData = [];
let correctAnswers = {};
let userAnswers = {}; // Store user answers for analysis
let redirectTimer;
let redirectSeconds = 5;
let questionSections = new Set();
let testConfig = {
    duration: 3600, // 60 minutes in seconds
    correctMark: 1,
    wrongPenalty: 0.5, // 0.5 negative marks per wrong answer
    allowNegative: true,
    totalMcqMarks: 75, // Total MCQ marks
    convertedMcqMarks: 55 // Converted to 55 marks
};

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('BUP Admission Test System Initialized');
    
    // Setup viewport for mobile
    if (isMobile) {
        setupMobileViewport();
    }
    
    loadQuestions();
    setupEventListeners();
    
    // Setup touch events for better mobile support
    setupTouchEvents();
    
    // Setup scroll handling
    setupScrollHandling();
    
    // Initialize education marks calculation
    initializeEducationMarks();
});

// Education marks functions
function initializeEducationMarks() {
    // Set default values
    document.getElementById('ssc_obtained').value = '';
    document.getElementById('hsc_obtained').value = '';
    document.getElementById('o_level_gpa').value = '';
    document.getElementById('a_level_points').value = '';
    
    // Calculate initial percentages
    calculatePercentage('ssc');
    calculatePercentage('hsc');
}

function showMarksInput(type) {
    if (type === 'ssc') {
        document.getElementById('sscMarks').style.display = 'block';
        document.getElementById('oLevelMarks').style.display = 'none';
        calculatePercentage('ssc');
    } else if (type === 'o_level') {
        document.getElementById('sscMarks').style.display = 'none';
        document.getElementById('oLevelMarks').style.display = 'block';
        calculateOLvlMarks();
    } else if (type === 'hsc') {
        document.getElementById('hscMarks').style.display = 'block';
        document.getElementById('aLevelMarks').style.display = 'none';
        calculatePercentage('hsc');
    } else if (type === 'a_level') {
        document.getElementById('hscMarks').style.display = 'none';
        document.getElementById('aLevelMarks').style.display = 'block';
        calculateALvlMarks();
    }
}

function calculatePercentage(type) {
    let obtained, percentageField;
    
    if (type === 'ssc') {
        obtained = parseFloat(document.getElementById('ssc_obtained').value) || 0;
        percentageField = document.getElementById('ssc_percentage');
        if (obtained > 0) {
            const percentage = ((obtained / 1300) * 100).toFixed(2);
            percentageField.value = percentage;
        } else {
            percentageField.value = '';
        }
    } else if (type === 'hsc') {
        obtained = parseFloat(document.getElementById('hsc_obtained').value) || 0;
        percentageField = document.getElementById('hsc_percentage');
        if (obtained > 0) {
            const percentage = ((obtained / 1300) * 100).toFixed(2);
            percentageField.value = percentage;
        } else {
            percentageField.value = '';
        }
    }
}

function calculateOLvlMarks() {
    const gpa = parseFloat(document.getElementById('o_level_gpa').value) || 0;
    const equivalentField = document.getElementById('o_level_equivalent');
    
    if (gpa > 0) {
        // O-Level: GPA * 260 = Equivalent marks out of 1300
        const equivalentMarks = (gpa * 260).toFixed(0);
        equivalentField.value = equivalentMarks;
        
        // Also calculate percentage
        const percentage = ((equivalentMarks / 1300) * 100).toFixed(2);
        document.getElementById('ssc_percentage').value = percentage;
    } else {
        equivalentField.value = '';
        document.getElementById('ssc_percentage').value = '';
    }
}

function calculateALvlMarks() {
    const points = parseFloat(document.getElementById('a_level_points').value) || 0;
    const equivalentField = document.getElementById('a_level_equivalent');
    
    if (points > 0) {
        // A-Level: Points * 65 = Equivalent marks out of 1300
        const equivalentMarks = (points * 65).toFixed(0);
        equivalentField.value = equivalentMarks;
        
        // Also calculate percentage
        const percentage = ((equivalentMarks / 1300) * 100).toFixed(2);
        document.getElementById('hsc_percentage').value = percentage;
    } else {
        equivalentField.value = '';
        document.getElementById('hsc_percentage').value = '';
    }
}

// Calculate educational scores
function calculateEducationalScores() {
    let sscScore = 0;
    let hscScore = 0;
    
    // SSC/O-Level Calculation (25 marks)
    const sscType = document.querySelector('input[name="ssc_type"]:checked').value;
    
    if (sscType === 'ssc') {
        const obtained = parseFloat(document.getElementById('ssc_obtained').value) || 0;
        if (obtained > 0) {
            sscScore = (obtained / 1300) * 25;
        }
    } else if (sscType === 'o_level') {
        const gpa = parseFloat(document.getElementById('o_level_gpa').value) || 0;
        if (gpa > 0) {
            const equivalentMarks = gpa * 260;
            sscScore = (equivalentMarks / 1300) * 25;
        }
    }
    
    // HSC/A-Level Calculation (20 marks)
    const hscType = document.querySelector('input[name="hsc_type"]:checked').value;
    
    if (hscType === 'hsc') {
        const obtained = parseFloat(document.getElementById('hsc_obtained').value) || 0;
        if (obtained > 0) {
            hscScore = (obtained / 1300) * 20;
        }
    } else if (hscType === 'a_level') {
        const points = parseFloat(document.getElementById('a_level_points').value) || 0;
        if (points > 0) {
            const equivalentMarks = points * 65;
            hscScore = (equivalentMarks / 1300) * 20;
        }
    }
    
    // Apply default/adjustment rule
    const defaultScore = 35; // out of 45
    const totalEducational = sscScore + hscScore;
    
    if (totalEducational === 0) {
        // No marks provided, use default
        sscScore = (25/45) * defaultScore;
        hscScore = (20/45) * defaultScore;
    } else if (totalEducational < 35) {
        // Below minimum, adjust to 35
        const adjustmentFactor = 35 / totalEducational;
        sscScore *= adjustmentFactor;
        hscScore *= adjustmentFactor;
    }
    // If total > 45, keep as is (no cap)
    
    return {
        sscScore: parseFloat(sscScore.toFixed(2)),
        hscScore: parseFloat(hscScore.toFixed(2)),
        sscType: sscType,
        hscType: hscType,
        sscMarks: sscType === 'ssc' ? document.getElementById('ssc_obtained').value || 'Not provided' : 
                  document.getElementById('o_level_gpa').value ? document.getElementById('o_level_gpa').value + ' GPA' : 'Not provided',
        hscMarks: hscType === 'hsc' ? document.getElementById('hsc_obtained').value || 'Not provided' :
                  document.getElementById('a_level_points').value ? document.getElementById('a_level_points').value + ' Points' : 'Not provided'
    };
}

// Set up mobile viewport
function setupMobileViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes";
    }
}

// Set up event listeners
function setupEventListeners() {
    // Input validation
    document.getElementById('name').addEventListener('input', validateName);
    document.getElementById('email').addEventListener('input', validateEmail);
    document.getElementById('phone').addEventListener('input', validatePhone);
    
    // Education marks validation
    document.getElementById('ssc_obtained').addEventListener('input', validateSSCMarks);
    document.getElementById('hsc_obtained').addEventListener('input', validateHSCMarks);
    document.getElementById('o_level_gpa').addEventListener('input', validateOLvlGPA);
    document.getElementById('a_level_points').addEventListener('input', validateALvlPoints);
    
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
            if (window.MathJax && MathJax.typesetPromise) {
                MathJax.typesetPromise();
            }
        }, 300);
    });
    
    // Handle resize
    window.addEventListener('resize', updateFixedTimer);
}

// Validation functions for education marks
function validateSSCMarks() {
    const marks = document.getElementById('ssc_obtained');
    if (marks.value && (parseFloat(marks.value) < 0 || parseFloat(marks.value) > 1300)) {
        marks.setCustomValidity('Marks must be between 0 and 1300');
        marks.reportValidity();
    } else {
        marks.setCustomValidity('');
    }
}

function validateHSCMarks() {
    const marks = document.getElementById('hsc_obtained');
    if (marks.value && (parseFloat(marks.value) < 0 || parseFloat(marks.value) > 1300)) {
        marks.setCustomValidity('Marks must be between 0 and 1300');
        marks.reportValidity();
    } else {
        marks.setCustomValidity('');
    }
}

function validateOLvlGPA() {
    const gpa = document.getElementById('o_level_gpa');
    if (gpa.value && (parseFloat(gpa.value) < 0 || parseFloat(gpa.value) > 5)) {
        gpa.setCustomValidity('GPA must be between 0 and 5');
        gpa.reportValidity();
    } else {
        gpa.setCustomValidity('');
    }
}

function validateALvlPoints() {
    const points = document.getElementById('a_level_points');
    if (points.value && (parseFloat(points.value) < 0 || parseFloat(points.value) > 20)) {
        points.setCustomValidity('Points must be between 0 and 20');
        points.reportValidity();
    } else {
        points.setCustomValidity('');
    }
}

// Setup touch events
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

// Setup scroll handling
function setupScrollHandling() {
    document.addEventListener('touchmove', function(e) {
        // Allow all touch moves for scrolling
    }, { passive: true });
}

// Warn before leaving test
function setupBeforeUnload() {
    window.addEventListener('beforeunload', function(e) {
        if (document.getElementById('quiz').style.display !== 'none') {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
            return e.returnValue;
        }
    });
}

// Function to process LaTeX
function processLaTeX(text) {
    if (!text || typeof text !== 'string') return text || '';
    let processed = text.replace(/\$(.*?)\$/g, '\\($1\\)');
    return processed;
}

// Fetch questions from Google Sheets
async function loadQuestions() {
    try {
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        document.getElementById('questionSourceInfo').textContent = 'Loading questions...';
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        
        const url = "https://script.google.com/macros/s/AKfycbyoYPdDK8clXKIJrKSuQSG6mERPP20LPfz-9YBnyWWyG8XkLjAhGzrKEKi62FvFyXoDbw/exec";
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.questions && result.questions.length > 0) {
            questionsData = result.questions;
            totalQuestions = questionsData.length;
            
            console.log(`Loaded ${totalQuestions} questions`);
            
            processQuestions();
            
        } else {
            throw new Error("No questions found");
        }
        
    } catch (error) {
        console.error("Error loading questions:", error);
        loadSampleQuestions();
    }
}

// Process questions data
function processQuestions() {
    correctAnswers = {};
    userAnswers = {};
    questionSections.clear();
    
    questionsData.forEach((q, index) => {
        const questionId = `q${index + 1}`;
        
        // Normalize the answer
        let answer = '';
        if (q.answer) answer = String(q.answer).trim().toLowerCase();
        else if (q.Answer) answer = String(q.Answer).trim().toLowerCase();
        else if (q.ANSWER) answer = String(q.ANSWER).trim().toLowerCase();
        else if (q['Answer']) answer = String(q['Answer']).trim().toLowerCase();
        
        if (answer) {
            correctAnswers[questionId] = answer;
        }
        
        // Get question type
        const type = q.Type || q.type || q['Type'] || 'General';
        questionSections.add(type);
        
        // Store marks per question
        q.marksValue = parseFloat(q.Marks || q.marks || q['Marks'] || testConfig.correctMark) || testConfig.correctMark;
        
        // Store question text and options
        q.questionText = processLaTeX(q.Question || q.question || q['Question'] || '');
        q.optionA = processLaTeX(q['Option A'] || q.optiona || q['option a'] || q.optionA || '');
        q.optionB = processLaTeX(q['Option B'] || q.optionb || q['option b'] || q.optionB || '');
        q.optionC = processLaTeX(q['Option C'] || q.optionc || q['option c'] || q.optionC || '');
        q.optionD = processLaTeX(q['Option D'] || q.optiond || q['option d'] || q.optionD || '');
    });
    
    updateFormInfo();
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} questions`;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
}

// Load sample questions (fallback)
function loadSampleQuestions() {
    console.log('Loading sample questions...');
    
    questionsData = [
        {
            Question: "What is the capital of Bangladesh?",
            "Option A": "Chittagong",
            "Option B": "Dhaka", 
            "Option C": "Khulna",
            "Option D": "Rajshahi",
            Answer: "B",
            Type: "General Knowledge",
            Marks: "1"
        },
        {
            Question: "Solve: \\(2x + 3 = 11\\)",
            "Option A": "x = 2",
            "Option B": "x = 3",
            "Option C": "x = 4", 
            "Option D": "x = 5",
            Answer: "C",
            Type: "Mathematics",
            Marks: "1"
        },
        {
            Question: "Which planet is known as the Red Planet?",
            "Option A": "Venus",
            "Option B": "Mars",
            "Option C": "Jupiter",
            "Option D": "Saturn",
            Answer: "B",
            Type: "Science",
            Marks: "1"
        }
    ];
    
    totalQuestions = questionsData.length;
    processQuestions();
    document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} sample questions`;
}

function updateFormInfo() {
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('fixedTotalQuestions').textContent = totalQuestions;
    
    const sectionsArray = Array.from(questionSections);
    let sectionsText = "";
    
    if (sectionsArray.length > 0) {
        const sectionCounts = {};
        questionsData.forEach(q => {
            const type = q.Type || q.type || q['Type'] || 'General';
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
    
    document.getElementById('correctMarking').textContent = testConfig.correctMark;
    document.getElementById('wrongMarking').textContent = testConfig.wrongPenalty;
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

function validateEducationMarks() {
    // SSC validation
    const sscType = document.querySelector('input[name="ssc_type"]:checked').value;
    if (sscType === 'ssc') {
        const sscMarks = document.getElementById('ssc_obtained').value;
        if (sscMarks && (parseFloat(sscMarks) < 0 || parseFloat(sscMarks) > 1300)) {
            alert('SSC marks must be between 0 and 1300');
            return false;
        }
    } else if (sscType === 'o_level') {
        const gpa = document.getElementById('o_level_gpa').value;
        if (gpa && (parseFloat(gpa) < 0 || parseFloat(gpa) > 5)) {
            alert('O-Level GPA must be between 0 and 5');
            return false;
        }
    }
    
    // HSC validation
    const hscType = document.querySelector('input[name="hsc_type"]:checked').value;
    if (hscType === 'hsc') {
        const hscMarks = document.getElementById('hsc_obtained').value;
        if (hscMarks && (parseFloat(hscMarks) < 0 || parseFloat(hscMarks) > 1300)) {
            alert('HSC marks must be between 0 and 1300');
            return false;
        }
    } else if (hscType === 'a_level') {
        const points = document.getElementById('a_level_points').value;
        if (points && (parseFloat(points) < 0 || parseFloat(points) > 20)) {
            alert('A-Level points must be between 0 and 20');
            return false;
        }
    }
    
    return true;
}

function validateAndStartTest() {
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isEducationValid = validateEducationMarks();
    
    if (questionsData.length === 0) {
        alert("Questions are not loaded. Please refresh the page or check your connection.");
        loadQuestions();
        return;
    }
    
    if (isNameValid && isEmailValid && isPhoneValid && isEducationValid) {
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
    setupBeforeUnload();
    
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    
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
    
    // Group questions by type
    const questionsByType = {};
    questionsData.forEach((question, index) => {
        const type = question.Type || question.type || question['Type'] || 'General';
        if (!questionsByType[type]) {
            questionsByType[type] = [];
        }
        questionsByType[type].push({...question, index: index + 1});
    });
    
    // Display questions by type
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
    
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise().catch((err) => {
            console.log('MathJax typeset promise error: ', err.message);
        });
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
        
        // Store user answer for analysis
        userAnswers[questionId] = option;
        
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
    
    // Check each question
    for (let i = 1; i <= totalQuestions; i++) {
        const questionId = `q${i}`;
        const selected = document.querySelector(`input[name=${questionId}]:checked`);
        const questionData = questionsData[i - 1];
        const marksForQuestion = questionData.marksValue || testConfig.correctMark;
        
        totalPossibleMarks += marksForQuestion;
        
        if (!selected) {
            unattempted++;
        } else {
            const userAnswer = selected.value.toLowerCase().trim();
            const correctAnswer = correctAnswers[questionId];
            
            if (correctAnswer && userAnswer === correctAnswer) {
                correct++;
                positiveMarks += marksForQuestion;
            } else {
                wrong++;
                const penalty = marksForQuestion * testConfig.wrongPenalty;
                negativeMarks += penalty;
            }
        }
    }
    
    // Calculate net score
    totalMarks = positiveMarks - negativeMarks;
    if (totalMarks < 0) totalMarks = 0;
    
    // Calculate educational scores
    const educationScores = calculateEducationalScores();
    
    // Calculate test score out of 55
    const testScore55 = (totalMarks / totalPossibleMarks) * testConfig.convertedMcqMarks;
    
    // Calculate total merit score (100)
    const totalMerit = testScore55 + educationScores.sscScore + educationScores.hscScore;
    
    // Generate test ID
    const testId = "BUP-" + Date.now().toString().substr(-8);
    
    // Calculate time taken
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.round((end - start) / 1000);
    const durationMinutes = (durationSeconds / 60).toFixed(2);
    
    // Show results
    showResults(correct, wrong, unattempted, totalMarks, testScore55, educationScores, totalMerit, 
                testId, durationMinutes, positiveMarks, negativeMarks);
    
    // Send data to Google Sheets
    sendToGoogleSheets(correct, wrong, unattempted, totalMarks, testScore55, educationScores, totalMerit,
                      testId, durationSeconds, positiveMarks, negativeMarks);
}

function showResults(correct, wrong, unattempted, totalMarks, testScore55, educationScores, totalMerit,
                    testId, durationMinutes, positiveMarks, negativeMarks) {
    
    document.getElementById('finalScore').textContent = totalMerit.toFixed(2);
    document.getElementById('finalScore').className = 'score-display';
    
    document.getElementById('testScore55').textContent = testScore55.toFixed(2);
    document.getElementById('sscScore25').textContent = educationScores.sscScore.toFixed(2);
    document.getElementById('hscScore20').textContent = educationScores.hscScore.toFixed(2);
    document.getElementById('totalMerit100').textContent = totalMerit.toFixed(2);
    
    document.getElementById('resultName').textContent = document.getElementById('name').value;
    document.getElementById('resultEmail').textContent = document.getElementById('email').value;
    document.getElementById('resultPhone').textContent = document.getElementById('phone').value;
    document.getElementById('testId').textContent = testId;
    document.getElementById('testDuration').textContent = durationMinutes;
    document.getElementById('resultSscType').textContent = educationScores.sscType.toUpperCase();
    document.getElementById('resultSscMarks').textContent = educationScores.sscMarks;
    document.getElementById('resultHscType').textContent = educationScores.hscType.toUpperCase();
    document.getElementById('resultHscMarks').textContent = educationScores.hscMarks;
    
    // Set result message
    let message = "";
    if (totalMerit >= 80) {
        message = "Excellent! You have a very high chance of admission.";
    } else if (totalMerit >= 60) {
        message = "Good performance! You have a decent chance of admission.";
    } else if (totalMerit >= 40) {
        message = "Fair performance. Keep improving!";
    } else {
        message = "Work harder for better results next time.";
    }
    document.getElementById('resultMessage').textContent = message;
    
    // Show result overlay
    document.getElementById('resultOverlay').style.display = 'flex';
    document.getElementById('fixedTimer').style.display = 'none';
    
    // Start redirect countdown
    startRedirectCountdown();
}

function sendToGoogleSheets(correct, wrong, unattempted, totalMarks, testScore55, educationScores, totalMerit,
                           testId, durationSeconds, positiveMarks, negativeMarks) {
    
    // Prepare analysis data (user answers for each question)
    const analysisData = [];
    for (let i = 1; i <= totalQuestions; i++) {
        const questionId = `q${i}`;
        const userAnswer = userAnswers[questionId] || 'Unattempted';
        const correctAnswer = correctAnswers[questionId] || 'Unknown';
        const isCorrect = (userAnswer === correctAnswer && userAnswer !== 'Unattempted');
        
        analysisData.push({
            testId: testId,
            questionNo: i,
            userAnswer: userAnswer.toUpperCase(),
            correctAnswer: correctAnswer.toUpperCase(),
            isCorrect: isCorrect ? 'Yes' : 'No',
            questionText: questionsData[i-1]?.Question || `Question ${i}`,
            timestamp: new Date().toISOString()
        });
    }
    
    const data = {
        // Results data
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
        totalTestMarks: totalMarks.toFixed(2),
        testScore55: testScore55.toFixed(2),
        sscType: educationScores.sscType,
        sscMarks: educationScores.sscMarks,
        sscScore25: educationScores.sscScore.toFixed(2),
        hscType: educationScores.hscType,
        hscMarks: educationScores.hscMarks,
        hscScore20: educationScores.hscScore.toFixed(2),
        totalMerit100: totalMerit.toFixed(2),
        totalQuestions: totalQuestions,
        
        // Analysis data (will be stored in separate sheet)
        analysisData: analysisData,
        
        timestamp: new Date().toISOString(),
        device: isMobile ? "Mobile" : "Desktop"
    };
    
    const url = "https://script.google.com/macros/s/AKfycbyoYPdDK8clXKIJrKSuQSG6mERPP20LPfz-9YBnyWWyG8XkLjAhGzrKEKi62FvFyXoDbw/exec";
    
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
        
        // Remove beforeunload listener
        window.removeEventListener('beforeunload', arguments.callee);
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}
