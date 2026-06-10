// Import Firebase modular SDK from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Firebase config (from user)
const firebaseConfig = {
  apiKey: "AIzaSyBgzGTkEZjsOm0oDjeWem7V2nQ7wLQIBS0",
  authDomain: "form-18da4.firebaseapp.com",
  projectId: "form-18da4",
  storageBucket: "form-18da4.firebasestorage.app",
  messagingSenderId: "396735927620",
  appId: "1:396735927620:web:823a807cb4933ded683311"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple SPA stepper and UI handling
const stages = Array.from(document.querySelectorAll('.stage'));
let current = 0;
let transitionTimer = null;

function show(index){
  if(index === current) return;

  const previous = stages[current];
  const next = stages[index];
  if(!next) return;

  // Update Progress Bar
  const progress = (index / (stages.length - 1)) * 100;
  const pb = document.getElementById('progressBar');
  if(pb) pb.style.width = `${progress}%`;

  clearTimeout(transitionTimer);

  stages.forEach((stage, i)=>{
    stage.classList.remove('is-entering', 'is-leaving');
    if(i !== current && i !== index){
      stage.classList.remove('active');
    }
  });

  if(previous){
    previous.classList.add('is-leaving');
  }
  next.classList.add('active', 'is-entering');

  requestAnimationFrame(()=>{
    if(previous){
      previous.classList.remove('active');
    }
    next.classList.remove('is-entering');
  });

  transitionTimer = setTimeout(()=>{
    if(previous){
      previous.classList.remove('is-leaving');
    }
  }, 600);

  current = index;

  // focus first interactive element in the shown stage
  const active = stages[index];
  if(active){
    const input = active.querySelector('input, textarea, button.selected, button');
    if(input) input.focus();
  }
}

// Start at intro
stages.forEach(stage => stage.classList.remove('active', 'is-entering', 'is-leaving'));
stages[0].classList.add('active');
show(0);

// start button
document.addEventListener('click', e=>{
  if(e.target.matches('.start')){
    // go to name stage (assumed to be index 1)
    const idx = stages.findIndex(s=>s.id === 'stage-name');
    if(idx !== -1) show(idx);
  }
});

// rating selection
document.querySelectorAll('.rating').forEach(group=>{
  group.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    group.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    // subtle confirmation flash on selection
    btn.classList.add('flash');
    setTimeout(()=>btn.classList.remove('flash'), 520);

    // Auto-advance smoothly to the next stage after a short delay
    const parentStage = group.closest('.stage');
    const stageIndex = stages.indexOf(parentStage);
    // advance only if there's a next stage (and not the final thanks screen)
    if(stageIndex >= 0 && stageIndex < stages.length - 2){
      setTimeout(()=>{
        show(stageIndex + 1);
      }, 500); // 500ms delay to let the green color sink in
    }
  });
});

// nav buttons
document.addEventListener('click', e=>{
  if(e.target.matches('.next')){
    if(current < stages.length-2) show(current+1);
    else show(current+1);
  }
  if(e.target.matches('.prev')){
    if(current>0) show(current-1);
  }
  if(e.target.matches('.restart')){
    // reset
    document.querySelectorAll('.rating button').forEach(b=>b.classList.remove('selected'));
    document.querySelector('textarea').value='';
    show(0);
  }
  if(e.target.matches('.submit')){
    submitResponse();
  }
});

// auto-advance on Enter inside name input
const nameInput = document.querySelector('input[data-key="fullName"]');
if(nameInput){
  nameInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      // move to next stage
      const parentStage = nameInput.closest('.stage');
      const idx = stages.indexOf(parentStage);
      if(idx !== -1 && idx < stages.length-1) show(idx+1);
    }
  });
}

async function submitResponse(){
  const payload = {};
  // gather ratings
  document.querySelectorAll('.rating').forEach(g=>{
    const key = g.dataset.key;
    const sel = g.querySelector('button.selected');
    payload[key] = sel ? parseInt(sel.textContent.trim(),10) : null;
  });
  payload.comments = document.querySelector('textarea').value.trim();
  // gather text inputs
  const textInputs = document.querySelectorAll('input[data-key]');
  textInputs.forEach(inp=>{
    payload[inp.dataset.key] = inp.value.trim();
  });
  payload.createdAt = serverTimestamp();

  try{
    // show skeleton / submission state briefly
    const submitBtn = document.querySelector('.submit');
    submitBtn.classList.add('disabled');
    submitBtn.textContent = 'Submitting...';
    await addDoc(collection(db, 'responses'), payload);
    // success flash on submit button
    submitBtn.classList.add('flash');
    setTimeout(()=>submitBtn.classList.remove('flash'),520);
    show(stages.length-1); // thanks
  }catch(err){
    console.error('submit error', err);
    alert('Failed to submit — check console for details.');
  }
}

// allow Shift+Enter in textarea for newline, Enter submits nothing by default
const ta = document.querySelector('textarea');
ta && ta.addEventListener('keydown', e=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
  }
});

// Translation Logic
const translations = {
  en: {
    start: "start",
    next: "Next",
    back: "Back",
    submit: "Submit",
    again: "again",
    lang: "日本語",
    questions: [
      "Please enter your full name.",
      "How easy was it to understand the purpose of the Attention & Working Memory site?",
      "How would you rate the interface and overall design of the site?",
      "How smooth did the experience feel as you used the site?",
      "How responsive did the site feel during your use?",
      "How easy was the site to understand and navigate?",
      "How useful or relevant did the experience feel to you?",
      "Please share any additional comments or feedback."
    ],
    hints: {
      veryDifficult: "Very difficult",
      veryEasy: "Very easy",
      poor: "Poor",
      excellent: "Excellent",
      veryRough: "Very rough",
      verySmooth: "Very smooth",
      verySlow: "Very slow",
      veryResponsive: "Very responsive",
      notUseful: "Not useful",
      veryUseful: "Very useful"
    },
    intro: {
      h1: "Thank you for helping us test the Attention & Working Memory experience!",
      lead1: "Your feedback is valuable and helps us enhance our product and drive R&D improvements.",
      lead2: "Please share your honest thoughts after exploring <a href=\"https://awmpublic.xiberlinc.one/\" target=\"_blank\" rel=\"noopener noreferrer\">https://awmpublic.xiberlinc.one/</a>."
    },
    thanks: {
      h1: "Thank you for testing the Xiberlinc Attention & Working Memory site and sharing your insights!",
      sub: "Your feedback helps us continuously improve the experience. We truly appreciate your time and input.",
      footer: "<strong>crafted with ❤️ in Tokyo, Japan</strong>"
    }
  },
  jp: {
    start: "開始",
    next: "次へ",
    back: "戻る",
    submit: "送信",
    again: "もう一度",
    lang: "English",
    questions: [
      "フルネームを入力してください。",
      "Attention & Working Memory サイトの目的を理解するのはどれくらい簡単でしたか？",
      "サイトのインターフェースと全体的なデザインをどのように評価しますか？",
      "サイトを使用している際、使い心地はどれくらいスムーズに感じましたか？",
      "使用中、サイトのレスポンスはどれくらい速く感じましたか？",
      "サイトの理解やナビゲーションはどれくらい簡単でしたか？",
      "体験はあなたにとってどれくらい有用、または関連性があると感じましたか？",
      "その他のコメントやフィードバックがあれば共有してください。"
    ],
    hints: {
      veryDifficult: "非常に難しい",
      veryEasy: "非常に簡単",
      poor: "悪い",
      excellent: "素晴らしい",
      veryRough: "非常に粗い",
      verySmooth: "非常にスムーズ",
      verySlow: "非常に遅い",
      veryResponsive: "非常にレスポンスが良い",
      notUseful: "役に立たない",
      veryUseful: "非常に役に立つ"
    },
    intro: {
      h1: "Attention & Working Memory の体験テストにご協力いただきありがとうございます！",
      lead1: "あなたのフィードバックは貴重であり、製品の強化や研究開発の改善に役立ちます。",
      lead2: "<a href=\"https://awmpublic.xiberlinc.one/\" target=\"_blank\" rel=\"noopener noreferrer\">https://awmpublic.xiberlinc.one/</a> をご覧になった後、率直な感想をお聞かせください。"
    },
    thanks: {
      h1: "Xiberlinc Attention & Working Memory サイトのテストと意見の共有、ありがとうございました！",
      sub: "フィードバックは継続的な体験の改善に役立ちます。お時間とお力添えに心より感謝いたします。",
      footer: "<strong>東京で ❤️ を込めて作られました</strong>"
    }
  }
};

let currentLang = 'en';

function updateLanguage() {
  const dict = translations[currentLang];
  
  // Update Buttons
  document.querySelector('.start').textContent = dict.start;
  document.querySelectorAll('.next').forEach(b => { if(b.textContent !== 'OK') b.textContent = dict.next; });
  document.querySelectorAll('.prev').forEach(b => b.textContent = dict.back);
  const submitBtn = document.querySelector('.submit');
  if(submitBtn) submitBtn.textContent = dict.submit;
  document.querySelector('.restart').textContent = dict.again;
  document.getElementById('langToggle').textContent = dict.lang;

  // Update Questions
  const qElements = document.querySelectorAll('.question-text');
  qElements.forEach((el, i) => {
    if (dict.questions[i]) el.textContent = dict.questions[i];
  });

  // Update Hints
  const hintMap = {
    "Very difficult": dict.hints.veryDifficult,
    "Very easy": dict.hints.veryEasy,
    "Poor": dict.hints.poor,
    "Excellent": dict.hints.excellent,
    "Very rough": dict.hints.veryRough,
    "Very smooth": dict.hints.verySmooth,
    "Very slow": dict.hints.verySlow,
    "Very responsive": dict.hints.veryResponsive,
    "Not useful": dict.hints.notUseful,
    "Very useful": dict.hints.veryUseful,
    // Reverse map for switching back
    "非常に難しい": dict.hints.veryDifficult,
    "非常に簡単": dict.hints.veryEasy,
    "悪い": dict.hints.poor,
    "素晴らしい": dict.hints.excellent,
    "非常に粗い": dict.hints.veryRough,
    "非常にスムーズ": dict.hints.verySmooth,
    "非常に遅い": dict.hints.verySlow,
    "非常にレスポンスが良い": dict.hints.veryResponsive,
    "役に立たない": dict.hints.notUseful,
    "非常に役に立つ": dict.hints.veryUseful
  };

  document.querySelectorAll('.hint').forEach(el => {
    const txt = el.textContent.trim();
    if (hintMap[txt]) el.textContent = hintMap[txt];
  });

  // Update Intro
  document.querySelector('.intro-inner h1').innerHTML = dict.intro.h1;
  const leads = document.querySelectorAll('.intro-inner .lead');
  if(leads[0]) leads[0].innerHTML = dict.intro.lead1;
  if(leads[1]) leads[1].innerHTML = dict.intro.lead2;

  // Update Thanks
  const thanksH1 = document.querySelector('.thanks-inner h1');
  if(thanksH1) thanksH1.innerHTML = dict.thanks.h1;
  const thanksSub = document.querySelector('.thanks-inner .sub');
  if(thanksSub) thanksSub.innerHTML = dict.thanks.sub;
  const thanksFooter = document.querySelector('.made-in');
  if(thanksFooter) thanksFooter.innerHTML = dict.thanks.footer;
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'jp' : 'en';
  updateLanguage();
});
