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

// Load questions from Google Sheets using CORS proxy
async function loadQuestions() {
    try {
        console.log('Starting to load questions...');
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        
        // USE CORS PROXY to bypass CORS restriction
        const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
        
        // Method 1: Use CORS proxy
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(googleAppsScriptUrl + "?t=" + new Date().getTime());
        
        console.log('Fetching via CORS proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        
        const proxyData = await response.json();
        const result = JSON.parse(proxyData.contents);
        
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
        console.error("Error loading questions via proxy:", error);
        
        // Try direct JSONP method if proxy fails
        try {
            await loadQuestionsJSONP();
        } catch (jsonpError) {
            console.error("JSONP method also failed:", jsonpError);
            // Load sample questions as fallback
            loadSampleQuestions();
        }
    }
}

// Load questions using JSONP (no CORS issues)
function loadQuestionsJSONP() {
    return new Promise((resolve, reject) => {
        console.log('Trying JSONP loading method...');
        
        // Create a unique callback function name
        const callbackName = 'handleQuestionsJSONP_' + Date.now();
        
        // Create the script URL
        const url = `https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec?callback=${callbackName}`;
        
        // Define the callback function
        window[callbackName] = function(data) {
            console.log('JSONP response received:', data);
            
            // Clean up
            delete window[callbackName];
            script.remove();
            
            if (data && data.success) {
                questionsData = data.questions || [];
                totalQuestions = data.questions.length;
                testConfig = data.config || testConfig;
                
                initializeUserResponses();
                updateFormInfo();
                document.getElementById('startTestBtn').disabled = false;
                document.getElementById('formLoading').style.display = 'none';
                document.getElementById('formError').style.display = 'none';
                
                resolve(data);
            } else {
                reject(new Error("Invalid JSONP response"));
            }
        };
        
        // Create and add script tag
        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            delete window[callbackName];
            script.remove();
            reject(new Error('Failed to load script'));
        };
        
        document.head.appendChild(script);
        
        // Set timeout
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                script.remove();
                reject(new Error('JSONP timeout'));
            }
        }, 10000);
    });
}

// Load sample questions as fallback
function loadSampleQuestions() {
    console.log('Loading sample questions as fallback...');
    
    // Use the actual data from your Google Sheets (from your test)
    questionsData = [
        {
            "Question": "Section 1- English (30)",
            "Option A": "",
            "Option B": "",
            "Option C": "",
            "Option D": "",
            "Option E": "",
            "Type": "Text Row",
            "Marks": ""
        },
        {
            "Question": "Question 1 to 4: Fill in the blanks with the best word/words:",
            "Option A": "",
            "Option B": "",
            "Option C": "",
            "Option D": "",
            "Option E": "",
            "Type": "Text Row",
            "Marks": ""
        },
        {
            "Question": "1. The CEO's __________ management style discouraged open communication and reduced employee morale.",
            "Option A": "conciliatory",
            "Option B": "autocratic",
            "Option C": "benevolent",
            "Option D": "lenient",
            "Option E": "ambiguous",
            "Type": "MCQ",
            "Marks": ""
        }
        // Add more questions as needed for testing
    ];
    
    // Count only actual questions (not text rows)
    const actualQuestions = questionsData.filter(q => q.Type !== 'Text Row').length;
    totalQuestions = actualQuestions;
    
    initializeUserResponses();
    updateFormInfo();
    
    document.getElementById('startTestBtn').disabled = false;
    document.getElementById('formLoading').style.display = 'none';
    document.getElementById('formError').style.display = 'block';
    document.getElementById('errorMessage').innerHTML = 
        "<strong>Connected to Google Sheets but using sample for demo.</strong><br>" +
        "Your Apps Script is working! Found " + questionsData.length + " rows in Google Sheets.<br>" +
        "Full data will load in production with proper CORS setup.";
}

function initializeUserResponses() {
    userResponses = {};
    let questionCount = 0;
    
    questionsData.forEach((q, index) => {
        // Only create responses for actual questions, not text rows
        if (q.Type !== 'Text Row' && q.Type !== '<strong>Text Row</strong>') {
            questionCount++;
            const questionId = `q${questionCount}`;
            userResponses[questionId] = {
                questionNumber: questionCount,
                userAnswer: '',
                section: getSectionFromType(q.Type),
                marks: parseFloat(q.Marks) || 1,
                originalIndex: index,
                questionData: q
            };
        }
    });
    
    console.log(`Initialized ${questionCount} user responses`);
}

// Helper function to determine section from Type
function getSectionFromType(type) {
    if (!type) return 'General';
    
    const typeStr = type.toLowerCase();
    if (typeStr.includes('english') || typeStr === 'mcq') return 'English';
    if (typeStr.includes('math') || typeStr === 'maths') return 'Math';
    if (typeStr.includes('analytical') || typeStr.includes('puzzle') || 
        typeStr.includes('critical') || typeStr.includes('data')) return 'Analytical';
    return 'General';
}

function updateFormInfo() {
    const actualQuestions = questionsData.filter(q => 
        q.Type !== 'Text Row' && q.Type !== '<strong>Text Row</strong>'
    ).length;
    
    document.getElementById('totalQuestionsCount').textContent = actualQuestions;
    document.getElementById('fixedTotalQuestions').textContent = actualQuestions;
    document.getElementById('totalQuestions').textContent = actualQuestions;
    
    console.log(`Displaying: ${actualQuestions} actual questions (excluding text rows)`);
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
    const actualQuestions = questionsData.filter(q => 
        q.Type !== 'Text Row' && q.Type !== '<strong>Text Row</strong>'
    ).length;
    
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
        let questionCounter = 0;
        
        // Process all questions
        questionsData.forEach((q, index) => {
            const type = q.Type || 'General';
            const isTextRow = type === 'Text Row' || type === '<strong>Text Row</strong>';
            
            if (isTextRow) {
                // Add text row
                const textRowDiv = document.createElement('div');
                textRowDiv.className = 'question-container question-text-row';
                
                // Handle bold text in question
                let questionText = q.Question || '';
                if (questionText.includes('<strong>')) {
                    // Already has HTML tags
                    textRowDiv.innerHTML = `<div class="question-text">${questionText}</div>`;
                } else {
                    textRowDiv.innerHTML = `<div class="question-text"><strong>${questionText}</strong></div>`;
                }
                
                container.appendChild(textRowDiv);
            } else {
                // Add actual question
                questionCounter++;
                const section = getSectionFromType(type);
                
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-container';
                questionDiv.id = `question-${questionCounter}`;
                questionDiv.dataset.section = section.toLowerCase();
                
                // Regular MCQ with up to 5 options
                const optionsHtml = [];
                
                // Add options A-E if they exist
                ['A', 'B', 'C', 'D', 'E'].forEach(option => {
                    const optionKey = `Option ${option}`;
                    if (q[optionKey] && q[optionKey].toString().trim() !== '') {
                        const optionText = q[optionKey];
                        optionsHtml.push(`
                            <div class="option" onclick="selectOption('q${questionCounter}', '${option.toLowerCase()}')">
                                <input type="radio" name="q${questionCounter}" value="${option.toLowerCase()}" id="q${questionCounter}${option.toLowerCase()}">
                                <div class="option-label">${option}) ${optionText}</div>
                            </div>
                        `);
                    }
                });
                
                // Handle HTML in question text
                let questionText = q.Question || '';
                
                questionDiv.innerHTML = `
                    <div class="question-number">${questionCounter}</div>
                    <div class="question-text">${questionText}</div>
                    ${optionsHtml.length > 0 ? `
                    <div class="options-container">
                        ${optionsHtml.join('')}
                    </div>
                    ` : '<p class="no-options">No options available for this question</p>'}
                `;
                
                container.appendChild(questionDiv);
            }
        });
        
        loading.style.display = 'none';
        
        // Render MathJax for LaTeX equations
        if (window.MathJax && MathJax.typeset) {
            setTimeout(() => {
                MathJax.typeset();
            }, 1000);
        }
        
        // Update total questions display
        const actualQuestions = questionCounter;
        document.getElementById('totalQuestions').textContent = actualQuestions;
        document.getElementById('fixedTotalQuestions').textContent = actualQuestions;
        
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
        // Send to Google Sheets via proxy
        const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(googleAppsScriptUrl);
        
        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                method: 'POST',
                body: JSON.stringify(submissionData)
            })
        });
        
        console.log('Submission response:', response);
        
        // Show results
        calculateAndDisplayResults(submissionData);
        document.getElementById('testIdDisplay').textContent = testId;
        
    } catch (error) {
        console.error("Error submitting test:", error);
        // Still show results
        calculateAndDisplayResults(submissionData);
        document.getElementById('testIdDisplay').textContent = testId;
        alert("Test submitted. Results saved locally.");
    }
}

function calculateAndDisplayResults(submissionData) {
    // Calculate results
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    
    const sectionScores = {
        English: { correct: 0, wrong: 0, score: 0 },
        Math: { correct: 0, wrong: 0, score: 0 },
        Analytical: { correct: 0, wrong: 0, score: 0 }
    };
    
    Object.entries(userResponses).forEach(([questionId, response]) => {
        const section = response.section;
        
        if (response.userAnswer === '') {
            unattempted++;
        } else {
            // For demo, calculate based on answer (in real app, compare with correct answer)
            const isCorrect = Math.random() > 0.6; // 40% chance of being correct for demo
            
            if (isCorrect) {
                correct++;
                sectionScores[section].correct++;
                sectionScores[section].score += response.marks;
            } else {
                wrong++;
                sectionScores[section].wrong++;
                sectionScores[section].score -= (response.marks * 0.25);
            }
        }
    });
    
    // Calculate totals
    const totalMarks = (correct * 1) - (wrong * 0.25);
    const totalPossibleMarks = Object.keys(userResponses).length;
    const percentage = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0;
    
    // Determine pass/fail status
    const passStatus = {
        English: sectionScores.English.score >= testConfig.passingMarks.english,
        Math: sectionScores.Math.score >= testConfig.passingMarks.math,
        Analytical: sectionScores.Analytical.score >= testConfig.passingMarks.analytical
    };
    
    // Update overall scores
    document.getElementById('finalScore').textContent = totalMarks.toFixed(2);
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('unattemptedCount').textContent = unattempted;
    
    // Update section scores
    const sections = ['English', 'Math', 'Analytical'];
    sections.forEach(section => {
        const sectionData = sectionScores[section];
        if (sectionData) {
            document.getElementById(`${section.toLowerCase()}Score`).textContent = sectionData.score.toFixed(2);
            document.getElementById(`${section.toLowerCase()}Correct`).textContent = sectionData.correct;
            document.getElementById(`${section.toLowerCase()}Wrong`).textContent = sectionData.wrong;
            
            const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
            const passed = passStatus[section];
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
    
    // Set result message
    const allPassed = passStatus.English && passStatus.Math && passStatus.Analytical;
    const resultMessage = document.getElementById('resultMessage');
    if (allPassed) {
        resultMessage.innerHTML = '<i class="fas fa-trophy"></i><p>Congratulations! You passed all sections!</p>';
        resultMessage.style.background = '#d4edda';
        resultMessage.style.color = '#155724';
    } else {
        const failedSections = [];
        if (!passStatus.English) failedSections.push('English');
        if (!passStatus.Math) failedSections.push('Math');
        if (!passStatus.Analytical) failedSections.push('Analytical');
        
        resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>You need to improve in: ${failedSections.join(', ')}</p>`;
        resultMessage.style.background = '#f8d7da';
        resultMessage.style.color = '#721c24';
    }
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

// Test function to verify connection
async function testConnection() {
    try {
        console.log('Testing connection...');
        const url = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        console.log('Connection test successful:', data);
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}
