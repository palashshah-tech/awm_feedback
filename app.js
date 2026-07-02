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
  
  // Calculate SUS Score
  // Standard SUS calculation:
  // Odd items (sus1, sus3, sus5, sus7, sus9): contribution is response - 1
  // Even items (sus2, sus4, sus6, sus8, sus10): contribution is 5 - response
  // Sum * 2.5
  let totalScore = 0;
  let complete = true;
  for (let i = 1; i <= 10; i++) {
    const val = payload[`sus${i}`];
    if (val === null || val === undefined) {
      complete = false;
      break;
    }
    if (i % 2 !== 0) {
      // Odd questions (1, 3, 5, 7, 9)
      totalScore += (val - 1);
    } else {
      // Even questions (2, 4, 6, 8, 10)
      totalScore += (5 - val);
    }
  }
  if (complete) {
    payload.susScore = totalScore * 2.5;
  } else {
    payload.susScore = null;
  }

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

/// Translation Logic
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
      "I think that I would like to use this \"system\" frequently.",
      "I felt that this \"system\" was unnecessarily complex. <span class=\"question-subtext\">(“Unnecessarily complex” means complexity beyond what is deemed unavoidable to achieve the objectives of this system)</span>",
      "I thought this \"system\" was easy to use.",
      "I think that I would need the support of a technician for me to be able to use this \"system\".",
      "I felt that the various functions of this \"system\" were well integrated with each other.",
      "I thought that there was too much inconsistency in this \"system\".",
      "I think that most people would learn to use this \"system\" very quickly.",
      "I felt that this \"system\" was very difficult to use.",
      "I was able to have confidence in using this \"system\".",
      "I needed to learn many things when I used this \"system\".",
      "Please share any additional comments or feedback."
    ],
    hints: {
      stronglyDisagree: "Strongly disagree",
      stronglyAgree: "Strongly agree"
    },
    intro: {
      h1: "Thank you for helping us test the Attention & Working Memory experience!",
      lead1: "After exploring the \"system\", please respond to the following questions immediately without thinking too deeply, before providing feedback or discussion. Please make sure to answer all items. If you find an item difficult to answer, please check the middle \"3\".",
      lead2: "* Depending on the type of \"system\" used, it might be easier to understand if you replace \"system\" with \"product\", \"content\", etc. <br>Explore it here: <a href=\"https://awmpublic.xiberlinc.one/\" target=\"_blank\" rel=\"noopener noreferrer\">https://awmpublic.xiberlinc.one/</a>"
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
      "この「システム」を頻繁に利用したいと思う",
      "この「システム」は必要以上に複雑だと感じた<span class=\"question-subtext\">（「必要以上に複雑」とは、「このシステムの目的を達成するためにやむを得ないと思われる複雑さ以上に複雑」ということ）</span>",
      "この「システム」は使いやすいと思った",
      "私がこの「システム」を使えるようになるには、技術者のサポートが必要だと思う",
      "この「システム」の様々な機能は、互いによく連携されていると感じた",
      "この「システム」には一貫性がなさすぎると思った",
      "ほとんどの人はこの「システム」をすぐに使いこなせるようになると思う",
      "この「システム」はとても使いづらいと感じた",
      "この「システム」を使う自信が持てた",
      "私がこの「システム」を使う際には、多くのことを学ぶ必要があった",
      "その他のコメントやフィードバックがあれば共有してください。"
    ],
    hints: {
      stronglyDisagree: "全くそう思わない",
      stronglyAgree: "強くそう思う"
    },
    intro: {
      h1: "Attention & Working Memory の体験テストにご協力いただきありがとうございます！",
      lead1: "評価対象となる「システム」を利用した後、「システム」についてのフィードバックや議論を行う前に、以下の質問に回答してください。各項目について、深く考えずに即座に回答してください。必ずすべての項目に対して回答してください。回答しにくい項目がある場合には、中間の「3」にチェックを入れてください。",
      lead2: "※ 利用した「システム」の種類によっては、「システム」でなく「製品」、「コンテンツ」などと読み替えてもらった方が分かりやすい可能性があります。<br>こちらから体験してください: <a href=\"https://awmpublic.xiberlinc.one/\" target=\"_blank\" rel=\"noopener noreferrer\">https://awmpublic.xiberlinc.one/</a>"
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
    if (dict.questions[i]) el.innerHTML = dict.questions[i];
  });

  // Update Hints
  const hintMap = {
    "Strongly disagree": dict.hints.stronglyDisagree,
    "Strongly agree": dict.hints.stronglyAgree,
    "全くそう思わない": dict.hints.stronglyDisagree,
    "非常にそう思う": dict.hints.stronglyAgree,
    "強くそう思う": dict.hints.stronglyAgree,
    // Keep old ones in case of DOM state reuse
    "Very difficult": dict.hints.stronglyDisagree,
    "Very easy": dict.hints.stronglyAgree,
    "Poor": dict.hints.stronglyDisagree,
    "Excellent": dict.hints.stronglyAgree,
    "Very rough": dict.hints.stronglyDisagree,
    "Very smooth": dict.hints.stronglyAgree,
    "Very slow": dict.hints.stronglyDisagree,
    "Very responsive": dict.hints.stronglyAgree,
    "Not useful": dict.hints.stronglyDisagree,
    "Very useful": dict.hints.stronglyAgree
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
