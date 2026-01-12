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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DU IBA Mock Test System Initialized');
    loadQuestions();
    setupEventListeners();
    
    // Show mobile submit button on mobile devices
    if (window.innerWidth <= 768) {
        document.getElementById('mobileSubmit').style.display = 'block';
    }
});

// Setup event listeners
function setupEventListeners() {
    // Input validation
    document.getElementById('name').addEventListener('input', validateName);
    document.getElementById('email').addEventListener('input', validateEmail);
    document.getElementById('phone').addEventListener('input', validatePhone);
    
    // Prevent tab switching during test
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Prevent right-click during test
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

// Security functions
function handleVisibilityChange() {
    if (isTestActive && document.hidden) {
        switchCount++;
        document.getElementById('switchCount').textContent = maxSwitches - switchCount;
        
        alert(`Warning ${switchCount}/${maxSwitches}: Tab switching is prohibited!`);
        
        if (switchCount >= maxSwitches) {
            alert('Test terminated due to multiple tab switches!');
            submitTest();
        }
    }
}

function handleContextMenu(e) {
    if (isTestActive) {
        e.preventDefault();
        alert('Right-click is disabled during the test!');
    }
}

function handleKeyDown(e) {
    if (isTestActive) {
        // Prevent developer tools
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            alert('Developer tools are disabled during the test!');
        }
        
        // Prevent copy/paste
        if (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
            e.preventDefault();
            alert('Copy/paste is disabled during the test!');
        }
    }
}

// Load questions from Google Sheets
async function loadQuestions() {
    try {
        console.log('Starting to load questions...');
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        
        // USE YOUR GOOGLE APPS SCRIPT URL HERE
        const url = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
        console.log('Fetching from URL:', url);
        
        // Add timestamp to prevent caching issues
        const fetchUrl = url + "?t=" + new Date().getTime();
        
        const response = await fetch(fetchUrl, {
            method: 'GET',
            mode: 'no-cors' // Remove this line if it causes issues, or try 'cors'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Response data received:', result);
        
        if (result.success && result.questions && result.questions.length > 0) {
            questionsData = result.questions;
            totalQuestions = result.questions.length;
            testConfig = result.config || testConfig;
            
            console.log(`Successfully loaded ${totalQuestions} questions`);
            console.log('Sample question:', questionsData[0]);
            
            // Initialize user responses
            initializeUserResponses();
            
            // Update UI
            updateFormInfo();
            document.getElementById('startTestBtn').disabled = false;
            document.getElementById('formLoading').style.display = 'none';
            
        } else {
            throw new Error("No questions found or invalid response format");
        }
        
    } catch (error) {
        console.error("Error loading questions:", error);
        document.getElementById('formLoading').style.display = 'none';
        document.getElementById('formError').style.display = 'block';
        document.getElementById('errorMessage').textContent = 
            `Failed to load questions: ${error.message}. Please check: 
            1. Google Sheets has data in 'Questions' sheet
            2. Apps Script is deployed as web app
            3. Access is set to 'Anyone'`;
    }
}

// Alternative load method for CORS issues
async function loadQuestionsAlternative() {
    try {
        console.log('Trying alternative loading method...');
        
        // Use JSONP approach for CORS issues
        const url = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec?callback=handleQuestions";
        
        // Create script tag
        const script = document.createElement('script');
        script.src = url;
        document.head.appendChild(script);
        
    } catch (error) {
        console.error('Alternative load failed:', error);
        // Load sample questions as fallback
        loadSampleQuestions();
    }
}

// Handle JSONP callback
function handleQuestions(data) {
    console.log('JSONP response:', data);
    if (data.success) {
        questionsData = data.questions;
        totalQuestions = data.questions.length;
        initializeUserResponses();
        updateFormInfo();
        document.getElementById('startTestBtn').disabled = false;
        document.getElementById('formLoading').style.display = 'none';
    }
}

// Load sample questions as fallback
function loadSampleQuestions() {
    console.log('Loading sample questions as fallback...');
    
    questionsData = [
        {
            "Question": "If $f(x) = \\frac{x+2}{x-2}$ for all integers except $x=2$, which has the greatest value?",
            "Option A": "$f(-1)$",
            "Option B": "$f(0)$",
            "Option C": "$f(1)$",
            "Option D": "$f(3)$",
            "Option E": "None of these",
            "Type": "Math",
            "Marks": "1"
        },
        {
            "Question": "The CEO's __________ management style discouraged open communication and reduced employee morale.",
            "Option A": "conciliatory",
            "Option B": "autocratic",
            "Option C": "benevolent",
            "Option D": "lenient",
            "Option E": "ambiguous",
            "Type": "English",
            "Marks": "1"
        },
        {
            "Question": "Section 1- English (30)",
            "Type": "Text Row"
        },
        {
            "Question": "Question 1 to 4: Fill in the blanks with the best word/words:",
            "Type": "Text Row"
        }
    ];
    
    totalQuestions = 4; // Only count actual questions, not text rows
    
    initializeUserResponses();
    updateFormInfo();
    
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('formError').style.display = 'block';
    document.getElementById('errorMessage').textContent = 
        "Using sample questions. Could not connect to Google Sheets. Please check your internet connection and Apps Script deployment.";
}

function initializeUserResponses() {
    userResponses = {};
    let questionCount = 0;
    
    questionsData.forEach((q, index) => {
        // Only create responses for actual questions, not text rows
        if (q.Type !== 'Text Row') {
            questionCount++;
            const questionId = `q${questionCount}`;
            userResponses[questionId] = {
                questionNumber: questionCount,
                userAnswer: '',
                section: q.Type || 'General',
                marks: parseFloat(q.Marks) || 1,
                originalIndex: index
            };
        }
    });
    
    console.log(`Initialized ${questionCount} user responses`);
}

function updateFormInfo() {
    const actualQuestions = questionsData.filter(q => q.Type !== 'Text Row').length;
    document.getElementById('totalQuestionsCount').textContent = actualQuestions;
    document.getElementById('fixedTotalQuestions').textContent = actualQuestions;
    document.getElementById('totalQuestions').textContent = actualQuestions;
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
    if (!document.getElementById('agreeTerms').checked) {
        alert('You must agree to the test rules before starting');
        return;
    }
    
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    
    // Check if we have questions loaded
    const actualQuestions = questionsData.filter(q => q.Type !== 'Text Row').length;
    if (actualQuestions === 0) {
        alert('No questions loaded. Please refresh the page or check your connection.');
        return;
    }
    
    if (isNameValid && isEmailValid && isPhoneValid) {
        startTest();
    }
}

function startTest() {
    // Set test as active
    isTestActive = true;
    startTime = new Date().toISOString();
    
    // Hide form and show quiz
    document.getElementById('testForm').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';
    
    // Show fixed timer
    document.getElementById('fixedTimer').style.display = 'block';
    
    // Reset and start timer
    timeLeft = testConfig.duration;
    updateTimerDisplay();
    startTimer();
    
    // Display questions
    displayQuestions();
    
    // Update progress
    updateProgress();
    
    // Setup beforeunload warning
    window.addEventListener('beforeunload', function(e) {
        if (isTestActive) {
            e.preventDefault();
            e.returnValue = 'Your test is in progress. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function displayQuestions() {
    const container = document.getElementById('questionsContainer');
    const loading = document.getElementById('questionLoading');
    
    container.innerHTML = '';
    loading.style.display = 'block';
    
    setTimeout(() => {
        // Filter out text rows for section grouping
        const actualQuestions = questionsData.filter(q => q.Type !== 'Text Row');
        const textRows = questionsData.filter(q => q.Type === 'Text Row');
        
        // Group questions by section
        const sections = {
            english: [],
            math: [],
            analytical: [],
            general: []
        };
        
        let questionCounter = 0;
        
        // First add text rows
        textRows.forEach(row => {
            const textRowDiv = document.createElement('div');
            textRowDiv.className = 'question-container question-text-row';
            textRowDiv.innerHTML = `
                <div class="question-text">${row.Question || ''}</div>
            `;
            container.appendChild(textRowDiv);
        });
        
        // Then add actual questions
        actualQuestions.forEach((q, index) => {
            questionCounter++;
            const type = q.Type || 'General';
            let section = 'general';
            
            if (type.includes('English')) section = 'english';
            else if (type.includes('Math')) section = 'math';
            else if (type.includes('Analytical')) section = 'analytical';
            
            sections[section].push({
                ...q,
                displayNumber: questionCounter,
                questionId: `q${questionCounter}`,
                originalIndex: index
            });
        });
        
        // Display questions by section
        Object.entries(sections).forEach(([section, questions]) => {
            if (questions.length > 0 && section !== 'general') {
                // Add section header
                const sectionHeader = document.createElement('div');
                sectionHeader.className = 'question-container question-text-row';
                sectionHeader.innerHTML = `
                    <h3>${section.charAt(0).toUpperCase() + section.slice(1)} Section</h3>
                    <p>${questions.length} question${questions.length > 1 ? 's' : ''}</p>
                `;
                container.appendChild(sectionHeader);
            }
            
            // Add questions for this section
            questions.forEach(q => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.id = `question-${q.displayNumber}`;
                questionDiv.dataset.section = section;
                
                // Regular MCQ with up to 5 options
                const optionsHtml = [];
                
                // Add options A-E if they exist
                ['A', 'B', 'C', 'D', 'E'].forEach(option => {
                    const optionKey = `Option ${option}`;
                    if (q[optionKey] && q[optionKey].trim() !== '') {
                        optionsHtml.push(`
                            <div class="option" onclick="selectOption('${q.questionId}', '${option.toLowerCase()}')">
                                <input type="radio" name="${q.questionId}" value="${option.toLowerCase()}" id="${q.questionId}${option.toLowerCase()}">
                                <div class="option-label">${option}) ${q[optionKey]}</div>
                            </div>
                        `);
                    }
                });
                
                questionDiv.innerHTML = `
                    <div class="question-number">${q.displayNumber}</div>
                    <div class="question-text">${q.Question || ''}</div>
                    <div class="options-container">
                        ${optionsHtml.join('')}
                    </div>
                `;
                
                container.appendChild(questionDiv);
            });
        });
        
        loading.style.display = 'none';
        
        // Render MathJax for LaTeX equations
        if (window.MathJax && MathJax.typeset) {
            setTimeout(() => {
                MathJax.typeset();
            }, 500);
        }
        
    }, 500);
}

function selectOption(questionId, option) {
    const questionNum = parseInt(questionId.replace('q', ''));
    
    // Update UI
    const options = document.querySelectorAll(`input[name="${questionId}"]`);
    options.forEach(opt => {
        opt.checked = false;
        opt.parentElement.classList.remove('selected');
    });
    
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
    const questions = document.querySelectorAll('.question-container:not(.question-text-row)');
    questions.forEach(q => {
        if (section === 'all' || q.dataset.section === section) {
            q.style.display = 'block';
        } else {
            q.style.display = 'none';
        }
    });
}

// Timer functions
function startTimer() {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        updateTimerProgress();
        
        // Update warning display
        const minutesLeft = Math.ceil(timeLeft / 60);
        const warningElement = document.getElementById('warningCountdown');
        if (warningElement) {
            warningElement.textContent = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
        }
        
        // Change timer color
        const timerElement = document.getElementById('fixedTimer');
        if (timeLeft <= 300) { // 5 minutes
            timerElement.className = 'fixed-timer-container danger';
        } else if (timeLeft <= 900) { // 15 minutes
            timerElement.className = 'fixed-timer-container warning';
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
    document.getElementById('fixedTime').textContent = timeString;
}

function updateTimerProgress() {
    const progressPercentage = (timeLeft / testConfig.duration) * 100;
    document.getElementById('fixedTimerProgress').style.width = `${progressPercentage}%`;
}

function updateProgress() {
    let answered = 0;
    Object.values(userResponses).forEach(response => {
        if (response.userAnswer !== '') {
            answered++;
        }
    });
    
    const totalQuestionsCount = Object.keys(userResponses).length;
    const progressPercentage = totalQuestionsCount > 0 ? (answered / totalQuestionsCount) * 100 : 0;
    
    document.getElementById('progressPercentage').textContent = Math.round(progressPercentage);
    document.getElementById('answeredCount').textContent = answered;
    document.getElementById('fixedAnsweredCount').textContent = answered;
    document.getElementById('progressBar').style.width = `${progressPercentage}%`;
}

// Submit test
async function submitTest() {
    clearInterval(timerInterval);
    isTestActive = false;
    
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
        duration: duration.toString(),
        totalQuestions: Object.keys(userResponses).length,
        responses: {},
        config: testConfig
    };
    
    // Collect responses
    Object.keys(userResponses).forEach(key => {
        submissionData.responses[key] = userResponses[key].userAnswer;
    });
    
    try {
        // Send to Google Sheets
        const response = await fetch("https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec", {
            method: "POST",
            mode: 'no-cors', // Remove if causing issues
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(submissionData)
        });
        
        console.log('Submission response:', response);
        
        // Show results even if submission fails
        displaySampleResults(submissionData);
        document.getElementById('testIdDisplay').textContent = testId;
        
    } catch (error) {
        console.error("Error submitting test:", error);
        // Still show results
        displaySampleResults(submissionData);
        document.getElementById('testIdDisplay').textContent = testId;
        alert("Test submitted locally. Results may not have been saved to server.");
    }
}

function displaySampleResults(submissionData) {
    // Calculate simple results for demo
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    
    Object.values(userResponses).forEach(response => {
        if (response.userAnswer === '') {
            unattempted++;
        } else {
            // For demo, randomly assign correct/wrong
            const isCorrect = Math.random() > 0.5;
            if (isCorrect) {
                correct++;
            } else {
                wrong++;
            }
        }
    });
    
    const totalMarks = (correct * 1) - (wrong * 0.25);
    const percentage = (totalMarks / Object.keys(userResponses).length) * 100;
    
    const scoreData = {
        correct: correct,
        wrong: wrong,
        unattempted: unattempted,
        totalMarks: totalMarks.toFixed(2),
        percentage: percentage.toFixed(2),
        sectionScores: {
            English: { 
                score: (Math.random() * 15).toFixed(2), 
                correct: Math.floor(Math.random() * 10),
                wrong: Math.floor(Math.random() * 5)
            },
            Math: { 
                score: (Math.random() * 10).toFixed(2), 
                correct: Math.floor(Math.random() * 8),
                wrong: Math.floor(Math.random() * 3)
            },
            Analytical: { 
                score: (Math.random() * 8).toFixed(2), 
                correct: Math.floor(Math.random() * 6),
                wrong: Math.floor(Math.random() * 2)
            }
        },
        passStatus: {
            English: Math.random() > 0.5,
            Math: Math.random() > 0.5,
            Analytical: Math.random() > 0.5
        }
    };
    
    // Update overall scores
    document.getElementById('finalScore').textContent = scoreData.totalMarks;
    document.getElementById('correctCount').textContent = scoreData.correct;
    document.getElementById('wrongCount').textContent = scoreData.wrong;
    document.getElementById('unattemptedCount').textContent = scoreData.unattempted;
    
    // Update section scores
    const sections = ['English', 'Math', 'Analytical'];
    sections.forEach(section => {
        const sectionData = scoreData.sectionScores[section];
        if (sectionData) {
            document.getElementById(`${section.toLowerCase()}Score`).textContent = sectionData.score;
            document.getElementById(`${section.toLowerCase()}Correct`).textContent = sectionData.correct;
            document.getElementById(`${section.toLowerCase()}Wrong`).textContent = sectionData.wrong;
            
            const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
            const passed = scoreData.passStatus[section];
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
        }
    });
    
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
    const resultCard = document.querySelector('.result-card');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>DU IBA Mock Test Results</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .result-card { max-width: 800px; margin: 0 auto; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                .pass { color: green; }
                .fail { color: red; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${resultCard.outerHTML}
            <div style="text-align: center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()">Print</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function resetTest() {
    if (confirm("Are you sure you want to reset? All progress will be lost.")) {
        // Clear all selections
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
        
        // Show form again
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('mobileSubmit').style.display = 'none';
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}

// Resize listener for mobile submit button
window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
        document.getElementById('mobileSubmit').style.display = 'block';
    } else {
        document.getElementById('mobileSubmit').style.display = 'none';
    }
});

// Debug function to check connection
async function testConnection() {
    try {
        console.log('Testing connection to Google Apps Script...');
        const response = await fetch("https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec");
        console.log('Connection test response:', response);
        return response.ok;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}
