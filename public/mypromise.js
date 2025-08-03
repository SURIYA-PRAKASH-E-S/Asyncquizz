firebase.initializeApp(window.FIREBASE_CONFIG);
const db = firebase.database();

let currentQuestion = 0;
let userAnswers = [];
let timerInterval;
const QUESTION_TIME = 30; // seconds per question
let quizQuestions = [];
let userName = "";
let userId = "";
let quizKey = "";

function startQuiz() {
  userName = document.getElementById("username").value.trim();
  if (!userName) {
    document.getElementById("joinMsg").innerText = "Please enter your name.";
    return;
  }
  document.getElementById("joinMsg").innerText = "";

  // Anonymous login
  firebase.auth().signInAnonymously().then((userCred) => {
    userId = userCred.user.uid;
    loadQuestions();
  }).catch((err) => {
    document.getElementById("joinMsg").innerText = "Login failed. Try again.";
  });
}

function loadQuestions() {
  db.ref('questions').once('value', (snap) => {
    const val = snap.val();
    if (!val) {
      alert("No questions available. Contact admin.");
      return;
    }
    quizQuestions = Object.values(val);
    userAnswers = new Array(quizQuestions.length).fill(null);
    currentQuestion = 0;
    document.getElementById("aboutSection").classList.add("d-none");
    document.getElementById("joinSection").classList.add("d-none");
    document.getElementById("quizSection").classList.remove("d-none");
    document.getElementById("resultSection").classList.add("d-none");
    showQuestion(currentQuestion);
  });
}

function showQuestion(index) {
  clearInterval(timerInterval);
  let timeLeft = QUESTION_TIME;
  const q = quizQuestions[index];
  const options = Object.keys(q.options);
  document.getElementById("quizSection").innerHTML = `
    <div class="card p-4 shadow-sm fade-in">
      <h4>Question ${index + 1} of ${quizQuestions.length}</h4>
      <div id="timer" class="mb-2"><b>Time Left: ${timeLeft}s</b></div>
      <form id="quizForm">
        <div class="mb-3">
          <p><b>${q.question}</b></p>
          ${options.map(opt =>
            `<div class="form-check">
              <input class="form-check-input" type="radio" name="q${index}" value="${opt}" ${userAnswers[index] === opt ? "checked" : ""}>
              <label class="form-check-label">${q.options[opt]}</label>
            </div>`
          ).join("")}
        </div>
      </form>
      <button class="btn btn-primary mt-3 w-100" onclick="nextQuestion()">Next</button>
    </div>
  `;
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerHTML = `<b>Time Left: ${timeLeft}s</b>`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      nextQuestion(true);
    }
  }, 1000);
}

function nextQuestion(auto = false) {
  const userAns = document.querySelector(`input[name=q${currentQuestion}]:checked`);
  if (userAns) userAnswers[currentQuestion] = userAns.value;
  else if (!auto) {
    alert("Please select an answer or wait for the timer.");
    return;
  }
  currentQuestion++;
  if (currentQuestion < quizQuestions.length) {
    showQuestion(currentQuestion);
  } else {
    clearInterval(timerInterval);
    submitQuizWithAnswers();
  }
}

function submitQuizWithAnswers() {
  let score = 0;
  quizQuestions.forEach((q, i) => {
    if (userAnswers[i] === q.correct) score++;
  });
  // Save participant result
  quizKey = db.ref('participants').push().key;
  db.ref('participants/' + quizKey).set({
    name: userName,
    score: score,
    total: quizQuestions.length,
    time: Date.now()
  });
  // Show result
  document.getElementById("quizSection").classList.add("d-none");
  document.getElementById("resultSection").classList.remove("d-none");
  document.getElementById("resultSection").innerHTML = `
    <div class="card p-4 shadow-sm fade-in text-center">
      <h3>Quiz Finished!</h3>
      <div class="score-badge text-success mb-3">${score} / ${quizQuestions.length}</div>
      <p>Thank you, <b>${userName}</b>! Your score has been saved.</p>
      <button class="btn btn-outline-primary mt-3" onclick="goHome()">Go to Home</button>
    </div>
  `;
}

function goHome() {
  document.getElementById("resultSection").classList.add("d-none");
  showTab('about');
}