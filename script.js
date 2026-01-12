// ============================================
// DU IBA MOCK TEST - COMPLETE SCRIPT
// ============================================

// Check if already loaded
if (typeof window.DU_IBA_TEST_LOADED === 'undefined') {
    window.DU_IBA_TEST_LOADED = true;
    
    // Global variables
    let startTime;
    let timerInterval;
    let timeLeft = 5400;
    let totalQuestions = 0;
    let questionsData = [];
    let correctAnswers = {};
    let questionSections = new Set();
    let userResponses = {};
    let redirectTimer;
    let redirectSeconds = 5;
    
    // Test config
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
    let isTestActive = false;
    let switchCount = 0;
    const maxSwitches = 3;
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Google Apps Script URL
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIrNECITCYBgUHJlqULgL1OMyMN5R4O4dB2Cfhr9VRzbuCXTVFFyeVh3K5xcAPYFSUYA/exec";
    
    // ============================================
    // INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DU IBA Mock Test Initialized');
        loadQuestions();
        setupEventListeners();
        setupTouchEvents();
    });
    
    function setupEventListeners() {
        // Form validation
        ['name', 'email', 'phone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', window[`validate${id.charAt(0).toUpperCase() + id.slice(1)}`]);
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
    
    // ============================================
    // SECURITY FUNCTIONS (Tab Switching Prevention)
    // ============================================
    function setupTestSecurity() {
        isTestActive = true;
        switchCount = 0;
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
    }
    
    function removeTestSecurity() {
        isTestActive = false;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
    }
    
    function handleVisibilityChange() {
        if (isTestActive && document.hidden) {
            switchCount++;
            updateSwitchCount();
            
            alert(`Warning ${switchCount}/${maxSwitches}: Switching tabs during the test is prohibited!`);
            
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
    
    function updateSwitchCount() {
        const countEl = document.getElementById('switchCount');
        if (countEl) {
            countEl.textContent = maxSwitches - switchCount;
        }
    }
    
    // ============================================
    // LOAD QUESTIONS
    // ============================================
    async function loadQuestions() {
        try {
            console.log('📥 Loading questions...');
            showElement('formLoading', true);
            showElement('formError', false);
            
            const startBtn = document.getElementById('startTestBtn');
            if (startBtn) startBtn.disabled = true;
            
            const url = APPS_SCRIPT_URL + "?t=" + Date.now();
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.questions) {
                questionsData = result.questions;
                totalQuestions = countActualQuestions(questionsData);
                
                if (result.config) {
                    testConfig = { ...testConfig, ...result.config };
                }
                
                console.log(`✅ Loaded ${questionsData.length} rows, ${totalQuestions} questions`);
                
                processQuestions();
                updateFormInfo();
                
                if (startBtn) startBtn.disabled = false;
                showElement('formLoading', false);
                
            } else {
                throw new Error('No valid questions found');
            }
            
        } catch (error) {
            console.error('❌ Error loading questions:', error);
            showElement('formLoading', false);
            showElement('formError', true);
            
            const errorMsg = document.getElementById('errorMessage');
            if (errorMsg) {
                errorMsg.textContent = `Failed to load questions: ${error.message}. Please check your internet connection.`;
            }
            
            loadSampleQuestions();
        }
    }
    
    function countActualQuestions(data) {
        return data.filter(q => {
            const type = q.Type || '';
            return !type.includes('Text Row') && q.Question;
        }).length;
    }
    
    function processQuestions() {
        correctAnswers = {};
        userResponses = {};
        let questionCounter = 0;
        
        questionsData.forEach((q, index) => {
            const type = q.Type || '';
            if (type.includes('Text Row') || !q.Question) return;
            
            questionCounter++;
            const questionId = `q${questionCounter}`;
            const answer = (q.Answer || '').toString().toLowerCase().trim();
            const section = getSectionFromType(type);
            
            if (answer) {
                correctAnswers[questionId] = answer;
            }
            
            userResponses[questionId] = {
                questionNumber: questionCounter,
                questionText: q.Question || '',
                userAnswer: '',
                correctAnswer: answer,
                isCorrect: false,
                selectedOption: '',
                section: section,
                marks: parseFloat(q.Marks) || 1
            };
        });
        
        console.log(`📝 Processed ${questionCounter} questions`);
    }
    
    function getSectionFromType(type) {
        if (!type) return 'English';
        const typeLower = type.toLowerCase();
        if (typeLower.includes('math')) return 'Math';
        if (typeLower.includes('analytical') || typeLower.includes('puzzle') || 
            typeLower.includes('critical') || typeLower.includes('data')) return 'Analytical';
        return 'English';
    }
    
    function loadSampleQuestions() {
        console.log('🔄 Loading sample questions...');
        
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
        
        totalQuestions = 2;
        processQuestions();
        updateFormInfo();
        
        const startBtn = document.getElementById('startTestBtn');
        if (startBtn) startBtn.disabled = false;
    }
    
    // ============================================
    // UI HELPER FUNCTIONS
    // ============================================
    function showElement(id, show) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    }
    
    function updateFormInfo() {
        // Update question counts
        const countElements = [
            'totalQuestionsCount', 
            'fixedTotalQuestions', 
            'totalQuestions'
        ];
        
        countElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = totalQuestions;
        });
        
        // Update test info
        const durationMinutes = testConfig.duration / 60;
        const durationEl = document.getElementById('testDurationInfo');
        if (durationEl) durationEl.textContent = durationMinutes;
        
        const autoSubmitEl = document.getElementById('autoSubmitInfo');
        if (autoSubmitEl) autoSubmitEl.textContent = `Auto-submission after ${durationMinutes} minutes`;
        
        // Update marking system
        const correctMarkEl = document.getElementById('correctMarking');
        const wrongMarkEl = document.getElementById('wrongMarking');
        const marksPerQEl = document.getElementById('marksPerQuestion');
        const negativeMarksEl = document.getElementById('negativeMarks');
        
        if (correctMarkEl) correctMarkEl.textContent = testConfig.correctMark;
        if (wrongMarkEl) wrongMarkEl.textContent = testConfig.wrongPenalty;
        if (marksPerQEl) marksPerQEl.textContent = testConfig.correctMark;
        if (negativeMarksEl) negativeMarksEl.textContent = testConfig.wrongPenalty;
    }
    
    // ============================================
    // VALIDATION FUNCTIONS
    // ============================================
    function validateName() {
        const name = document.getElementById('name').value.trim();
        const errorElement = document.getElementById('nameError');
        
        if (!name) {
            showError(errorElement, 'Please enter your full name');
            return false;
        }
        
        if (name.length < 3) {
            showError(errorElement, 'Name must be at least 3 characters');
            return false;
        }
        
        hideError(errorElement);
        return true;
    }
    
    function validateEmail() {
        const email = document.getElementById('email').value.trim();
        const errorElement = document.getElementById('emailError');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            showError(errorElement, 'Please enter a valid email address');
            return false;
        }
        
        hideError(errorElement);
        return true;
    }
    
    function validatePhone() {
        const phone = document.getElementById('phone').value.trim();
        const errorElement = document.getElementById('phoneError');
        const phoneRegex = /^[0-9+\-\s]{10,15}$/;
        
        if (!phoneRegex.test(phone)) {
            showError(errorElement, 'Please enter a valid phone number (10-15 digits)');
            return false;
        }
        
        hideError(errorElement);
        return true;
    }
    
    function showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    function hideError(element) {
        if (element) {
            element.style.display = 'none';
        }
    }
    
    function validateAndStartTest() {
        // Check terms agreement
        const agreeTerms = document.getElementById('agreeTerms');
        if (!agreeTerms || !agreeTerms.checked) {
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
    
    // ============================================
    // TEST FUNCTIONS
    // ============================================
    function startTest() {
        // Setup security
        setupTestSecurity();
        updateSwitchCount();
        
        // Record start time
        startTime = new Date().toISOString();
        
        // Switch views
        document.getElementById('testForm').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
        document.getElementById('fixedTimer').style.display = 'block';
        
        // Show mobile submit button
        if (isMobile) {
            const mobileSubmit = document.getElementById('mobileSubmit');
            if (mobileSubmit) mobileSubmit.style.display = 'block';
        }
        
        // Reset timer
        timeLeft = testConfig.duration;
        updateFixedTimerDisplay();
        document.getElementById('fixedTimer').className = 'fixed-timer-container';
        
        // Hide auto-submit warning
        const autoSubmitWarning = document.getElementById('autoSubmitWarning');
        if (autoSubmitWarning) autoSubmitWarning.style.display = 'none';
        
        // Display questions
        displayQuestions();
        
        // Start timer
        startTimer();
        
        // Update progress
        updateProgressBar();
        
        // Setup beforeunload warning
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Scroll to top
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    }
    
    function handleBeforeUnload(e) {
        if (isTestActive) {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
            return e.returnValue;
        }
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
        
        if (!questionsContainer || !questionLoading) return;
        
        questionsContainer.innerHTML = '';
        questionLoading.style.display = 'block';
        
        setTimeout(() => {
            let questionCounter = 0;
            
            // Group questions by section
            const questionsBySection = {
                English: [],
                Math: [],
                Analytical: []
            };
            
            // First pass: categorize questions
            questionsData.forEach((q, index) => {
                const type = q.Type || '';
                
                if (type.includes('Text Row')) {
                    // Add text row
                    const textDiv = document.createElement('div');
                    textDiv.className = 'question-container question-text-row';
                    textDiv.innerHTML = `<div class="question-text">${escapeHtml(q.Question || '')}</div>`;
                    questionsContainer.appendChild(textDiv);
                } else if (q.Question) {
                    questionCounter++;
                    const section = getSectionFromType(type);
                    
                    if (!questionsBySection[section]) {
                        questionsBySection[section] = [];
                    }
                    
                    questionsBySection[section].push({
                        ...q,
                        index: questionCounter
                    });
                }
            });
            
            // Second pass: display by section
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
                                ${['A', 'B', 'C', 'D'].map(option => `
                                    <div class="option" onclick="window.selectOption('q${q.index}', '${option.toLowerCase()}')">
                                        <input type="radio" name="q${q.index}" value="${option.toLowerCase()}" id="q${q.index}${option.toLowerCase()}">
                                        <div class="option-label">${option}) ${escapeHtml(q[`Option ${option}`] || '')}</div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                        
                        questionsContainer.appendChild(questionDiv);
                    });
                }
            });
            
            questionLoading.style.display = 'none';
            
            // Render MathJax
            if (window.MathJax && MathJax.typeset) {
                setTimeout(() => {
                    MathJax.typeset();
                }, 1000);
            }
            
        }, 500);
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================
    // QUESTION SELECTION
    // ============================================
    window.selectOption = function(questionId, option) {
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
                userResponses[questionId].userAnswer = option.toLowerCase();
                userResponses[questionId].selectedOption = option.toUpperCase();
                userResponses[questionId].isCorrect = (option.toLowerCase() === userResponses[questionId].correctAnswer);
            }
            
            // Haptic feedback on mobile
            if (isMobile && navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // Update progress
            updateProgressBar();
            updateAnsweredCount();
        }
    };
    
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
    
    function updateProgressBar() {
        let answered = 0;
        for (let i = 1; i <= totalQuestions; i++) {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if (selected) answered++;
        }
        
        const progressPercentage = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
        }
        
        const progressPercentageEl = document.getElementById('progressPercentage');
        if (progressPercentageEl) {
            progressPercentageEl.textContent = Math.round(progressPercentage);
        }
    }
    
    function updateAnsweredCount() {
        let answered = 0;
        for (let i = 1; i <= totalQuestions; i++) {
            const selected = document.querySelector(`input[name="q${i}"]:checked`);
            if (selected) answered++;
        }
        
        const fixedAnsweredEl = document.getElementById('fixedAnsweredCount');
        const answeredEl = document.getElementById('answeredCount');
        
        if (fixedAnsweredEl) fixedAnsweredEl.textContent = answered;
        if (answeredEl) answeredEl.textContent = answered;
    }
    
    // ============================================
    // TIMER FUNCTIONS
    // ============================================
    function startTimer() {
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            timeLeft--;
            
            updateFixedTimerDisplay();
            updateTimerProgress();
            
            // Change timer color based on time
            const timerElement = document.getElementById('fixedTimer');
            if (timeLeft <= 300) { // 5 minutes
                timerElement.className = 'fixed-timer-container danger';
            } else if (timeLeft <= 900) { // 15 minutes
                timerElement.className = 'fixed-timer-container warning';
            }
            
            // Update warning countdown
            if (timeLeft <= 600 && timeLeft > 0) {
                const minutesLeft = Math.ceil(timeLeft / 60);
                const warningEl = document.getElementById('warningCountdown');
                if (warningEl) warningEl.textContent = minutesLeft;
            }
            
            // Show warnings
            if (timeLeft === 600) {
                showNotification('10 minutes remaining! Auto-submit soon.');
            }
            
            if (timeLeft === 300) {
                showNotification('5 minutes remaining! Hurry up!');
            }
            
            if (timeLeft === 60) {
                showNotification('1 minute remaining! Submit now!');
            }
            
            // Auto-submit when time is up
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                showNotification('Time is up! Auto-submitting...');
                setTimeout(submitTest, 1000);
            }
        }, 1000);
    }
    
    function updateFixedTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const fixedTimeEl = document.getElementById('fixedTime');
        if (fixedTimeEl) fixedTimeEl.textContent = timeString;
    }
    
    function updateTimerProgress() {
        const progressPercentage = (timeLeft / testConfig.duration) * 100;
        const progressFill = document.getElementById('fixedTimerProgress');
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
            
            // Change progress bar color
            if (timeLeft <= 300) {
                progressFill.style.background = 'linear-gradient(to right, #ff4500, #ff6a00)';
            } else if (timeLeft <= 900) {
                progressFill.style.background = 'linear-gradient(to right, #ff9800, #ffb74d)';
            }
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
    
    // Add notification styles
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
    
    // ============================================
    // SUBMIT TEST
    // ============================================
    function submitTest() {
        clearInterval(timerInterval);
        removeTestSecurity();
        
        const endTime = new Date().toISOString();
        
        let correct = 0;
        let wrong = 0;
        let unattempted = 0;
        let totalMarks = 0;
        let positiveMarks = 0;
        let negativeMarks = 0;
        
        const sectionScores = {
            English: { correct: 0, wrong: 0, score: 0 },
            Math: { correct: 0, wrong: 0, score: 0 },
            Analytical: { correct: 0, wrong: 0, score: 0 }
        };
        
        const detailedAnalysis = [];
        
        // Calculate scores
        for (let i = 1; i <= totalQuestions; i++) {
            const questionId = `q${i}`;
            const selected = document.querySelector(`input[name="${questionId}"]:checked`);
            const response = userResponses[questionId];
            const section = response?.section || 'English';
            
            if (!selected) {
                unattempted++;
            } else {
                const userAnswer = selected.value.toLowerCase().trim();
                const correctAnswer = correctAnswers[questionId];
                const marksForQuestion = response?.marks || 1;
                
                detailedAnalysis.push({
                    questionNumber: i,
                    questionText: response?.questionText?.substring(0, 100) || '',
                    userAnswer: userAnswer.toUpperCase(),
                    correctAnswer: correctAnswer ? correctAnswer.toUpperCase() : '',
                    isCorrect: correctAnswer && userAnswer === correctAnswer,
                    section: section,
                    marks: marksForQuestion
                });
                
                if (correctAnswer && userAnswer === correctAnswer) {
                    correct++;
                    positiveMarks += marksForQuestion;
                    totalMarks += marksForQuestion;
                    sectionScores[section].correct++;
                    sectionScores[section].score += marksForQuestion;
                } else {
                    wrong++;
                    const penalty = marksForQuestion * testConfig.wrongPenalty;
                    negativeMarks += penalty;
                    totalMarks -= penalty;
                    sectionScores[section].wrong++;
                    sectionScores[section].score -= penalty;
                }
            }
        }
        
        // Calculate duration
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationSeconds = Math.round((end - start) / 1000);
        const durationMinutes = (durationSeconds / 60).toFixed(2);
        
        // Generate test ID
        const testId = "IBA-" + Date.now().toString().substr(-8);
        
        // Calculate pass/fail status
        const passStatus = {
            English: sectionScores.English.score >= testConfig.passingMarks.english,
            Math: sectionScores.Math.score >= testConfig.passingMarks.math,
            Analytical: sectionScores.Analytical.score >= testConfig.passingMarks.analytical
        };
        
        const allPassed = passStatus.English && passStatus.Math && passStatus.Analytical;
        
        // Show results
        showResults(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationMinutes);
        
        // Send to Google Sheets
        sendToGoogleSheets(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationSeconds, detailedAnalysis);
    }
    
    function showResults(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationMinutes) {
        // Update overall scores
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
        
        // Update test info
        document.getElementById('resultName').textContent = document.getElementById('name').value;
        document.getElementById('resultEmail').textContent = document.getElementById('email').value;
        document.getElementById('testIdDisplay').textContent = testId;
        document.getElementById('testDuration').textContent = durationMinutes;
        document.getElementById('questionsAttempted').textContent = totalQuestions - unattempted;
        
        // Update section scores
        const sections = ['English', 'Math', 'Analytical'];
        sections.forEach(section => {
            const sectionData = sectionScores[section];
            const passed = passStatus[section];
            
            document.getElementById(`${section.toLowerCase()}Score`).textContent = sectionData.score.toFixed(2);
            document.getElementById(`${section.toLowerCase()}Correct`).textContent = sectionData.correct;
            document.getElementById(`${section.toLowerCase()}Wrong`).textContent = sectionData.wrong;
            
            const statusElement = document.getElementById(`${section.toLowerCase()}Status`);
            if (statusElement) {
                statusElement.textContent = passed ? 'PASS' : 'FAIL';
                statusElement.className = `status-badge ${passed ? 'pass' : 'fail'}`;
            }
            
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
        const resultMessage = document.getElementById('resultMessage');
        if (allPassed) {
            resultMessage.innerHTML = '<i class="fas fa-trophy"></i><p>Congratulations! You passed all sections!</p>';
            resultMessage.style.background = '#d4edda';
            resultMessage.style.color = '#155724';
        } else {
            const failedSections = sections.filter(s => !passStatus[s]);
            resultMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>You need to improve in: ${failedSections.join(', ')}</p>`;
            resultMessage.style.background = '#f8d7da';
            resultMessage.style.color = '#721c24';
        }
        
        // Show result overlay
        document.getElementById('resultOverlay').style.display = 'flex';
        document.getElementById('fixedTimer').style.display = 'none';
        
        const mobileSubmit = document.getElementById('mobileSubmit');
        if (mobileSubmit) mobileSubmit.style.display = 'none';
        
        // Start redirect countdown
        startRedirectCountdown();
    }
    
    function sendToGoogleSheets(correct, wrong, unattempted, totalMarks, sectionScores, passStatus, allPassed, testId, durationSeconds, detailedAnalysis) {
        const data = {
            testId: testId,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
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
        
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            console.log("Data sent to Google Sheets successfully:", result);
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
    
    // ============================================
    // GLOBAL FUNCTIONS
    // ============================================
    window.validateAndStartTest = validateAndStartTest;
    window.submitTest = submitTest;
    window.showSection = showSection;
    window.closeResults = closeResults;
    window.printResults = printResults;
    window.resetTest = resetTest;
    
    function closeResults() {
        document.getElementById('resultOverlay').style.display = 'none';
        resetTest();
    }
    
    function printResults() {
        window.print();
    }
    
    function resetTest() {
        if (confirm("Are you sure you want to reset the test? All your answers will be lost.")) {
            // Clear selections
            for (let i = 1; i <= totalQuestions; i++) {
                const options = document.querySelectorAll(`input[name="q${i}"]`);
                options.forEach(opt => {
                    opt.checked = false;
                    opt.parentElement.classList.remove('selected');
                });
            }
            
            // Reset timer
            clearInterval(timerInterval);
            timeLeft = testConfig.duration;
            updateFixedTimerDisplay();
            
            // Reset security
            removeTestSecurity();
            switchCount = 0;
            updateSwitchCount();
            
            // Reset progress
            updateProgressBar();
            updateAnsweredCount();
            
            // Hide elements
            document.getElementById('fixedTimer').style.display = 'none';
            document.getElementById('mobileSubmit').style.display = 'none';
            document.getElementById('autoSubmitWarning').style.display = 'none';
            
            // Show form
            document.getElementById('testForm').style.display = 'block';
            document.getElementById('quiz').style.display = 'none';
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
    }
    
    console.log('✅ DU IBA Test Script Loaded');
}
