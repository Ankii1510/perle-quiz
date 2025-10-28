/* Perle-ready Quiz — interactive UI (no backend)
   - stores high score in localStorage
   - keyboard shortcuts + share to X
*/

const quizData = [
  { q: "When you get a new annotation task, what should you do first?",
    opts: ["Start labeling immediately","Read the task instructions carefully","Guess based on intuition","Skip if confused"], a:1, explain:"Always read instructions so you follow the exact labeling rules." },
  { q: "If a label seems ambiguous or doesn’t fit perfectly, what’s the right action?",
    opts: ["Pick the closest option","Leave it blank and report as ambiguous","Ask another annotator","Delete the task"], a:1, explain:"Flagging ambiguity prevents low-quality noise." },
  { q: "Which of the following counts as data leakage?",
    opts: ["Sharing screenshots of data samples online","Discussing labeling logic privately","Reporting a bug to admin","Reading task guidelines"], a:0, explain:"Exposing raw samples publicly is data leakage." },
  { q: "Why is consistency important in labeling data?",
    opts: ["It reduces model confusion","It increases payment per task","It makes tasks faster","It’s not very important"], a:0, explain:"Consistent labels help the model learn clear patterns." },
  { q: "If an image contains two objects but you’re asked to label only the dominant one, what do you do?",
    opts: ["Label both","Label the biggest or most central object","Skip both","Label the one that looks cooler"], a:1, explain:"'Dominant' generally means largest or most central per guideline." },
  { q: "You find personal information inside a data sample. What’s the right step?",
    opts: ["Share it online","Blur or remove and report","Ignore it","Save for future reference"], a:1, explain:"Protect privacy: remove/flag sensitive data and inform admins." },
  { q: "Audio clip is very noisy and you can only hear 50%. What do you do?",
    opts: ["Write what you think you heard","Mark it low quality / inaudible","Guess missing words","Leave blank"], a:1, explain:"Marking low quality preserves data integrity." },
  { q: "Which one is NOT a valid reason to flag a task as problematic?",
    opts: ["Image is corrupted","Content violates guidelines","Task pays too little","Text is unreadable"], a:2, explain:"Payment complaints are not a task quality issue." },
  { q: "When labeling emotional tone in text, what’s the most reliable method?",
    opts: ["Focus on actual words and intent","Judge based on emojis only","Label every message neutral","Decide randomly"], a:0, explain:"Words + context give the best signal for emotional tone." },
  { q: "Why does Perle (and similar platforms) use human experts in the loop?",
    opts: ["To replace AI models","To train models with real-world understanding","To make data slower","To entertain users"], a:1, explain:"Experts provide high-quality feedback and nuance for models." }
];

const quizContainer = document.getElementById('quizContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resultCard = document.getElementById('resultCard');
const resultSummary = document.getElementById('resultSummary');
const scoreBadge = document.getElementById('scoreBadge');
const scoreMessage = document.getElementById('scoreMessage');
const retryBtn = document.getElementById('retryBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('btn-reset');

let current = 0;
let answers = new Array(quizData.length).fill(null);

// load saved progress if exists
const LS_KEY = 'perle_quiz_state_v1';
const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
if (saved && Array.isArray(saved.answers) && saved.answers.length === quizData.length) {
  answers = saved.answers;
  current = saved.current || 0;
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify({answers, current}));
}

// utility to create question card
function renderQuestion(index){
  const item = quizData[index];
  const wrapper = document.createElement('div');
  wrapper.className = 'question-card';
  wrapper.innerHTML = `
    <div>
      <h3 class="q-title">${index+1}. ${item.q}</h3>
      <p class="q-sub">Select the best answer</p>
    </div>
    <div class="options" role="list">
      ${item.opts.map((o,i)=> `
        <label class="option" data-i="${i}" tabindex="0" role="button">
          <input type="radio" name="q${index}" value="${i}" ${answers[index]===i ? 'checked' : ''} aria-checked="${answers[index]===i}" />
          <span class="label">${o}</span>
        </label>`).join('')}
    </div>
  `;

  // attach listeners
  wrapper.querySelectorAll('.option').forEach(opt=>{
    opt.addEventListener('click', ()=>{
      const i = Number(opt.dataset.i);
      answers[index] = i;
      updateOptionSelection(wrapper, i);
      saveState();
    });
    opt.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        opt.click();
      }
    });
  });

  return wrapper;
}

function updateOptionSelection(wrapper, selectedIndex){
  wrapper.querySelectorAll('.option').forEach(el=>{
    const i = Number(el.dataset.i);
    if(i === selectedIndex) el.classList.add('selected');
    else el.classList.remove('selected');
    const input = el.querySelector('input');
    input.checked = (i === selectedIndex);
    input.setAttribute('aria-checked', i===selectedIndex);
  });
}

function showCurrent(){
  quizContainer.innerHTML = '';
  const node = renderQuestion(current);
  quizContainer.appendChild(node);

  // pre-select UI if answer exists
  if(answers[current] !== null) updateOptionSelection(node, answers[current]);

  progressText.textContent = `Question ${current+1} of ${quizData.length}`;
  const pct = Math.round(((current) / (quizData.length-1)) * 100);
  progressBar.style.width = `${pct}%`;

  prevBtn.disabled = current === 0;
  nextBtn.textContent = (current === quizData.length - 1) ? 'Finish' : 'Next →';

  // hide result if navigating
  resultCard.classList.add('hidden');
  saveState();
}

prevBtn.addEventListener('click', ()=>{
  if(current > 0) current--;
  showCurrent();
});

nextBtn.addEventListener('click', ()=>{
  // if last and clicked Finish -> grade
  if(current < quizData.length - 1){
    current++;
    showCurrent();
  } else {
    gradeQuiz();
  }
});

function gradeQuiz(){
  let score = 0;
  const details = quizData.map((it, idx)=>{
    const correct = it.a;
    const selected = answers[idx];
    const ok = selected === correct;
    if(ok) score++;
    return { idx, ok, selected, correct, explain: it.explain };
  });

  // result UI
  scoreBadge.textContent = `${score} / ${quizData.length}`;
  let msg = '';
  if(score >= 8) msg = '🥇 Perle-Ready Pro';
  else if(score >= 5) msg = '🧠 Learner';
  else msg = '🐣 Rookie — keep practicing';
  scoreMessage.textContent = msg;

  // detailed summary (compact)
  resultSummary.innerHTML = details.map(d=>{
    return `<div style="text-align:left;padding:8px 10px;border-radius:10px;margin:6px 0;background:rgba(255,255,255,0.01)">
      <strong>Q${d.idx+1}:</strong> ${d.ok ? '<span style="color:#9fffd6">Correct</span>' : '<span style="color:#ff9f9f">Wrong</span>'}
      ${!d.ok ? `<div style="margin-top:6px;color:var(--muted);font-size:13px">Correct: ${quizData[d.idx].opts[d.correct]}<br><em style="color:#9aa3b2">${d.explain}</em></div>` : ''}
    </div>`;
  }).join('');

  // high score in localStorage
  const HS_KEY = 'perle_quiz_highscore_v1';
  const prevHigh = Number(localStorage.getItem(HS_KEY) || 0);
  if(score > prevHigh){
    localStorage.setItem(HS_KEY, score);
    resultSummary.innerHTML = `<div style="padding:8px;border-radius:8px;background:linear-gradient(90deg,#ffe9b5,#ffd5ff);color:#02121a;font-weight:700;margin-bottom:10px">New high score! ${score}/${quizData.length}</div>` + resultSummary.innerHTML;
  } else {
    resultSummary.innerHTML = `<div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.02);color:var(--muted);margin-bottom:10px">High score: ${prevHigh}/${quizData.length}</div>` + resultSummary.innerHTML;
  }

  // show result card
  resultCard.classList.remove('hidden');
  // set progress to 100%
  progressBar.style.width = `100%`;
}

// retry
retryBtn.addEventListener('click', ()=>{
  answers = new Array(quizData.length).fill(null);
  current = 0;
  localStorage.removeItem(LS_KEY);
  showCurrent();
});

// share on X (twitter)
shareBtn.addEventListener('click', ()=>{
  const HS_KEY = 'perle_quiz_highscore_v1';
  const high = Number(localStorage.getItem(HS_KEY) || 0);
  const txt = encodeURIComponent(`I scored ${scoreBadge.textContent} on the "Are You Perle-Ready?" quiz — try it yourself:`);
  const url = encodeURIComponent(window.location.href);
  const href = `https://x.com/intent/tweet?text=${txt}&url=${url}`;
  window.open(href, '_blank');
});

// reset progress
resetBtn.addEventListener('click', ()=>{
  if(confirm('Clear saved progress and high score on this device?')){
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem('perle_quiz_highscore_v1');
    answers = new Array(quizData.length).fill(null);
    current = 0;
    showCurrent();
    alert('Progress cleared.');
  }
});

// keyboard navigation: left/right
window.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft') prevBtn.click();
  if(e.key === 'ArrowRight') nextBtn.click();
});

showCurrent();
