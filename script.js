// Global variables
let startTime;
let timerInterval;
let timeLeft = 1800; // 30 minutes in seconds (30 * 60)
let totalQuestions = 0;
let questionsData = [];
let correctAnswers = {};
let redirectTimer;
let redirectSeconds = 5;
let questionSections = new Set();
let testConfig = {
    duration: 1800, // 30 minutes in seconds
    correctMark: 1,
    wrongPenalty: 0.25,
    allowNegative: true // Allow negative scores
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Input validation on blur
    document.getElementById('name').addEventListener('blur', validateName);
    document.getElementById('email').addEventListener('blur', validateEmail);
    document.getElementById('phone').addEventListener('blur', validatePhone);
    
    // Enter key to start test
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.getElementById('testForm').style.display !== 'none') {
            validateAndStartTest();
        }
    });
}

// Function to process LaTeX
function processLaTeX(text) {
    if (!text || typeof text !== 'string') return text || '';
    
    // Replace $...$ with \\(...\\) for inline math
    let processed = text.replace(/\$(.*?)\$/g, '\\($1\\)');
    
    return processed;
}

// Fetch questions from Google Sheets
async function loadQuestions() {
    try {
        // Show loading state
        document.getElementById('formLoading').style.display = 'block';
        document.getElementById('formError').style.display = 'none';
        document.getElementById('startTestBtn').disabled = true;
        document.getElementById('questionSourceInfo').textContent = 'Connecting to Google Sheets...';
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
            
            console.log("Raw questions data:", questionsData);
            
            // Clear previous data
            correctAnswers = {};
            questionSections.clear();
            
            // Process questions data
            questionsData.forEach((q, index) => {
                const questionId = `q${index + 1}`;
                
                // Normalize the answer - handle spaces and case
                let answer = '';
                if (q.answer) {
                    answer = String(q.answer).trim().toLowerCase();
                } else if (q.Answer) {
                    answer = String(q.Answer).trim().toLowerCase();
                } else if (q.ANSWER) {
                    answer = String(q.ANSWER).trim().toLowerCase();
                } else if (q['Answer']) {
                    answer = String(q['Answer']).trim().toLowerCase();
                }
                
                if (answer) {
                    correctAnswers[questionId] = answer;
                }
                
                // Get question type
                const type = q.Type || q.type || q['Type'] || 'General';
                questionSections.add(type);
                
                // Store marks per question
                q.marksValue = parseFloat(q.Marks || q.marks || q['Marks'] || testConfig.correctMark) || testConfig.correctMark;
                
                // Store question text and options with LaTeX processing
                q.questionText = processLaTeX(q.Question || q.question || q['Question'] || '');
                q.optionA = processLaTeX(q['Option A'] || q.optiona || q['option a'] || q.optionA || '');
                q.optionB = processLaTeX(q['Option B'] || q.optionb || q['option b'] || q.optionB || '');
                q.optionC = processLaTeX(q['Option C'] || q.optionc || q['option c'] || q.optionC || '');
                q.optionD = processLaTeX(q['Option D'] || q.optiond || q['option d'] || q.optionD || '');
            });
            
            console.log(`Successfully loaded ${totalQuestions} questions from Google Sheets`);
            
            // Update UI with loaded data
            updateFormInfo();
            
            // Enable start button
            document.getElementById('startTestBtn').disabled = false;
            document.getElementById('formLoading').style.display = 'none';
            document.getElementById('questionSourceInfo').textContent = `Loaded ${totalQuestions} questions from Google Sheets`;
            document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
            
        } else {
            throw new Error("No questions found in Google Sheets or invalid response format");
        }
    } catch (error) {
        console.error("Error loading questions from Google Sheets:", error);
        
        // Show error message
        document.getElementById('formLoading').style.display = 'none';
        document.getElementById('formError').style.display = 'block';
        document.getElementById('errorMessage').textContent = `Error: ${error.message}. Please check the browser console for more details.`;
        document.getElementById('questionSourceInfo').textContent = 'Failed to load questions from Google Sheets';
        document.getElementById('startTestBtn').disabled = true;
    }
}

function updateFormInfo() {
    // Update total questions count
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('totalQuestionsSticky').textContent = totalQuestions;
    document.getElementById('totalQuestionsResult').textContent = totalQuestions;
    
    // Update sections info
    const sectionsArray = Array.from(questionSections);
    let sectionsText = "";
    
    if (sectionsArray.length > 0) {
        // Count questions per section
        const sectionCounts = {};
        questionsData.forEach(q => {
            const type = q.Type || q.type || q['Type'] || 'General';
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

// Validation functions
function validateName() {
    const name = document.getElementById('name').value.trim();
    const errorElement = document.getElementById('nameError');
    
    if (name === '') {
        errorElement.textContent = 'Please enter your full name';
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
    
    // Reset timer display
    timeLeft = testConfig.duration;
    updateStickyTimerDisplay();
    document.getElementById('stickyTimer').className = 'sticky-timer';
    document.getElementById('autoSubmitWarning').style.display = 'none';
    
    // Display questions
    displayQuestions();
    
    // Start the timer
    startTimer();
    
    // Update progress bar
    updateProgressBar();
}

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
        
        // Add section header
        const sectionHeader = document.createElement('h3');
        sectionHeader.className = 'section-title';
        sectionHeader.style.fontSize = '1.3rem';
        sectionHeader.innerHTML = `<i class="fas fa-book"></i> ${type} (${typeQuestions.length} Questions)`;
        questionsContainer.appendChild(sectionHeader);
        
        // Add questions for this section
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
    
    // Re-render MathJax after loading questions
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
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
        
        // Update timer display
        updateStickyTimerDisplay();
        
        // Change timer color based on remaining time
        const timerElement = document.getElementById('stickyTimer');
        if (timeLeft <= Math.floor(testConfig.duration * 0.33)) {
            timerElement.className = 'sticky-timer danger';
        } else if (timeLeft <= Math.floor(testConfig.duration * 0.66)) {
            timerElement.className = 'sticky-timer warning';
        }
        
        // Show warning when 10 minutes left
        if (timeLeft === 600) { // 10 minutes = 600 seconds
            document.getElementById('autoSubmitWarning').style.display = 'block';
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
            submitTest();
        }
    }, 1000);
}

function updateStickyTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('stickyTime').textContent = timeString;
    
    // Update progress bar on timer
    const progressPercentage = (timeLeft / testConfig.duration) * 100;
    document.getElementById('timerProgressFill').style.width = `${progressPercentage}%`;
}

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
            
            console.log(`Question ${i}: User Answer=${userAnswer}, Correct Answer=${correctAnswer}`);
            
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
    
    // Start redirect countdown
    startRedirectCountdown();
    
    // Prepare data for Google Sheets
    const data = {
        testId: testId,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        startTime: startTime,
        endTime: endTime,
        duration: durationSeconds.toString(),
        correct: correct,
        wrong: wrong,
        unattempted: unattempted,
        positiveMarks: positiveMarks.toFixed(2),
        negativeMarks: negativeMarks.toFixed(2),
        totalMarks: totalMarks.toFixed(2),
        percentage: percentage,
        totalQuestions: totalQuestions,
        source: "Google Sheets",
        timestamp: new Date().toISOString()
    };
    
    // Send data to Google Sheets
    sendToGoogleSheets(data);
}

function sendToGoogleSheets(data) {
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
        updateStickyTimerDisplay();
        document.getElementById('stickyTimer').className = 'sticky-timer';
        document.getElementById('autoSubmitWarning').style.display = 'none';
        
        // Reset progress bar and answered count
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('answeredCount').textContent = '0';
        
        // Show form again
        document.getElementById('testForm').style.display = 'block';
        document.getElementById('quiz').style.display = 'none';
        
        // Reset form fields
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
    }
}

function showQuestionStats() {
    const statsDiv = document.getElementById('adminStats');
    const isVisible = statsDiv.style.display !== 'none';
    
    if (!isVisible) {
        let statsHTML = `<h4>Question Statistics</h4>`;
        statsHTML += `<p><strong>Total Questions:</strong> ${totalQuestions}</p>`;
        statsHTML += `<p><strong>Loaded From:</strong> Google Sheets</p>`;
        statsHTML += `<p><strong>Test Duration:</strong> ${testConfig.duration / 60} minutes</p>`;
        statsHTML += `<p><strong>Marking System:</strong> +${testConfig.correctMark} / -${testConfig.wrongPenalty}</p>`;
        statsHTML += `<p><strong>Negative Scores Allowed:</strong> ${testConfig.allowNegative ? 'Yes' : 'No'}</p>`;
        
        if (questionSections.size > 0) {
            statsHTML += `<p><strong>Sections:</strong></p><ul>`;
            const sectionCounts = {};
            questionsData.forEach(q => {
                const type = q.Type || q.type || q['Type'] || 'General';
                sectionCounts[type] = (sectionCounts[type] || 0) + 1;
            });
            
            Object.keys(sectionCounts).forEach(section => {
                statsHTML += `<li>${section}: ${sectionCounts[section]} questions</li>`;
            });
            statsHTML += `</ul>`;
        }
        
        // Show raw data for debugging
        statsHTML += `<p><strong>Debug Data (first 3 questions):</strong></p>`;
        statsHTML += `<pre style="font-size: 10px; max-height: 200px; overflow: auto; background: #f0f0f0; padding: 10px;">`;
        questionsData.slice(0, 3).forEach((q, i) => {
            statsHTML += `Question ${i + 1}:\n`;
            statsHTML += `  Type: ${q.Type || q.type || q['Type']}\n`;
            statsHTML += `  Question: ${(q.Question || q.question || q['Question'] || '').substring(0, 100)}...\n`;
            statsHTML += `  Option A: ${(q['Option A'] || q.optionA || '').substring(0, 50)}...\n`;
            statsHTML += `  Option B: ${(q['Option B'] || q.optionB || '').substring(0, 50)}...\n`;
            statsHTML += `  Option C: ${(q['Option C'] || q.optionC || '').substring(0, 50)}...\n`;
            statsHTML += `  Option D: ${(q['Option D'] || q.optionD || '').substring(0, 50)}...\n`;
            statsHTML += `  Answer: ${q.Answer || q.answer || q['Answer'] || ''}\n\n`;
        });
        statsHTML += `</pre>`;
        
        statsHTML += `<p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>`;
        statsDiv.innerHTML = statsHTML;
        statsDiv.style.display = 'block';
    } else {
        statsDiv.style.display = 'none';
    }
}

function exportResults() {
    // In a real implementation, this would make an API call to get all results
    alert("Export feature would typically download a CSV file of all test results. This requires additional backend setup.");
}