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
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        
        // USE YOUR GOOGLE APPS SCRIPT URL HERE
        const url = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.questions && result.questions.length > 0) {
            questionsData = result.questions;
            totalQuestions = result.questions.length;
            testConfig = result.config || testConfig;
            
            console.log(`Loaded ${totalQuestions} questions`);
            
            // Initialize user responses
            initializeUserResponses();
            
            // Update UI
            updateFormInfo();
            document.getElementById('startTestBtn').disabled = false;
            document.getElementById('formLoading').style.display = 'none';
            
        } else {
            throw new Error("No questions found in the Google Sheet");
        }
        
    } catch (error) {
        console.error("Error loading questions:", error);
        document.getElementById('formLoading').style.display = 'none';
        document.getElementById('formError').style.display = 'block';
        document.getElementById('errorMessage').textContent = error.message + ". Please check your Google Sheets setup.";
    }
}

function initializeUserResponses() {
    userResponses = {};
    questionsData.forEach((q, index) => {
        const questionId = `q${index + 1}`;
        userResponses[questionId] = {
            questionNumber: index + 1,
            userAnswer: '',
            section: q.Type || 'General',
            marks: parseFloat(q.Marks) || 1
        };
    });
}

function updateFormInfo() {
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('fixedTotalQuestions').textContent = totalQuestions;
    document.getElementById('totalQuestions').textContent = totalQuestions;
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
        // Group questions by section
        const sections = {
            english: [],
            math: [],
            analytical: [],
            general: []
        };
        
        questionsData.forEach((q, index) => {
            const type = q.Type || 'General';
            let section = 'general';
            
            if (type.includes('English')) section = 'english';
            else if (type.includes('Math')) section = 'math';
            else if (type.includes('Analytical')) section = 'analytical';
            
            sections[section].push({
                ...q,
                index: index + 1,
                questionId: `q${index + 1}`
            });
        });
        
        // Display questions
        Object.entries(sections).forEach(([section, questions]) => {
            if (questions.length > 0) {
                // Add section header
                if (section !== 'general') {
                    const sectionHeader = document.createElement('div');
                    sectionHeader.className = 'question-container question-text-row';
                    sectionHeader.innerHTML = `
                        <h3>${section.charAt(0).toUpperCase() + section.slice(1)} Section</h3>
                        <p>${questions.length} question${questions.length > 1 ? 's' : ''}</p>
                    `;
                    container.appendChild(sectionHeader);
                }
                
                // Add questions
                questions.forEach(q => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'question-container';
                    questionDiv.id = `question-${q.index}`;
                    questionDiv.dataset.section = section;
                    
                    // Check if it's a text row
                    if (q.Type === 'Text Row') {
                        questionDiv.classList.add('question-text-row');
                        questionDiv.innerHTML = `
                            <div class="question-text">
                                ${q.Question || ''}
                            </div>
                        `;
                    } else {
                        // Regular MCQ with up to 5 options
                        const optionsHtml = [];
                        
                        // Add options A-E if they exist
                        ['A', 'B', 'C', 'D', 'E'].forEach(option => {
                            if (q[`Option ${option}`]) {
                                optionsHtml.push(`
                                    <div class="option" onclick="selectOption('${q.questionId}', '${option.toLowerCase()}')">
                                        <input type="radio" name="${q.questionId}" value="${option.toLowerCase()}" id="${q.questionId}${option.toLowerCase()}">
                                        <div class="option-label">${option}) ${q[`Option ${option}`]}</div>
                                    </div>
                                `);
                            }
                        });
                        
                        questionDiv.innerHTML = `
                            <div class="question-number">${q.index}</div>
                            <div class="question-text">${q.Question || ''}</div>
                            <div class="options-container">
                                ${optionsHtml.join('')}
                            </div>
                        `;
                    }
                    
                    container.appendChild(questionDiv);
                });
            }
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
    const questionData = questionsData[questionNum - 1];
    
    // Skip if it's a text row
    if (questionData.Type === 'Text Row') return;
    
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
        userResponses[questionId].userAnswer = option;
        
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
    
    const progressPercentage = (answered / totalQuestions) * 100;
    
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
        totalQuestions: totalQuestions,
        responses: {},
        config: testConfig
    };
    
    // Collect responses
    Object.keys(userResponses).forEach(key => {
        submissionData.responses[key] = userResponses[key].userAnswer;
    });
    
    try {
        // Send to Google Sheets - USE YOUR GOOGLE APPS SCRIPT URL HERE
        const response = await fetch("https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(submissionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Display results
            displayResults(result.score);
            document.getElementById('testIdDisplay').textContent = testId;
        } else {
            throw new Error(result.message || "Failed to submit test");
        }
        
    } catch (error) {
        console.error("Error submitting test:", error);
        // Still show results even if submission fails
        displayResults({
            correct: 0,
            wrong: 0,
            unattempted: totalQuestions,
            totalMarks: "0.00",
            percentage: "0.00",
            sectionScores: {
                English: { score: 0, correct: 0, wrong: 0 },
                Math: { score: 0, correct: 0, wrong: 0 },
                Analytical: { score: 0, correct: 0, wrong: 0 }
            },
            passStatus: {
                English: false,
                Math: false,
                Analytical: false
            }
        });
        document.getElementById('testIdDisplay').textContent = testId;
        alert("Results saved locally. Email may not have been sent due to server error.");
    }
}

function displayResults(scoreData) {
    // Update overall scores
    document.getElementById('finalScore').textContent = scoreData.totalMarks || "0.00";
    document.getElementById('correctCount').textContent = scoreData.correct || 0;
    document.getElementById('wrongCount').textContent = scoreData.wrong || 0;
    document.getElementById('unattemptedCount').textContent = scoreData.unattempted || totalQuestions;
    
    // Update section scores
    const sections = ['English', 'Math', 'Analytical'];
    sections.forEach(section => {
        const sectionData = scoreData.sectionScores ? scoreData.sectionScores[section] : null;
        if (sectionData) {
            document.getElementById(`${section.toLowerCase()}Score`).textContent = 
                sectionData.score ? sectionData.score.toFixed(2) : "0.00";
            document.getElementById(`${section.toLowerCase()}Correct`).textContent = 
                sectionData.correct || 0;
            document.getElementById(`${section.toLowerCase()}Wrong`).textContent = 
                sectionData.wrong || 0;
            
            const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
            const passed = scoreData.passStatus ? scoreData.passStatus[section] : false;
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
        } else {
            // Default values if no section data
            document.getElementById(`${section.toLowerCase()}Score`).textContent = "0.00";
            document.getElementById(`${section.toLowerCase()}Correct`).textContent = "0";
            document.getElementById(`${section.toLowerCase()}Wrong`).textContent = "0";
            
            const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
            statusElement.textContent = 'FAIL';
            statusElement.className = 'status-badge fail';
            
            const card = document.getElementById(`${section.toLowerCase()}Card`);
            card.style.borderColor = '#f44336';
            card.style.background = '#ffebee';
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
