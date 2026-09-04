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
      "フルネームを<ruby>入力<rt>にゅうりょく</rt></ruby>してください。",
      "この「システム」を<ruby>頻繁<rt>ひんぱん</rt></ruby>に<ruby>利用<rt>りよう</rt></ruby>したいと<ruby>思<rt>おも</rt></ruby>う",
      "この「システム」は<ruby>必要<rt>ひつよう</rt></ruby><ruby>以上<rt>いじょう</rt></ruby>に<ruby>複雑<rt>ふくざつ</rt></ruby>だと<ruby>感<rt>かん</rt></ruby>じた<span class=\"question-subtext\">（「<ruby>必要<rt>ひつよう</rt></ruby><ruby>以上<rt>いじょう</rt></ruby>に<ruby>複雑<rt>ふくざつ</rt></ruby>」とは、「このシステムの<ruby>目的<rt>もくてき</rt></ruby>を<ruby>達成<rt>たっせい</rt></ruby>するためにやむを<ruby>得<rt>え</rt></ruby>ないと<ruby>思<rt>おも</rt></ruby>われる<ruby>複雑<rt>ふくざつ</rt></ruby>さ<ruby>以上<rt>いじょう</rt></ruby>に<ruby>複雑<rt>ふくざつ</rt></ruby>」ということ）</span>",
      "この「システム」は<ruby>使<rt>つか</rt></ruby>いやすいと<ruby>思<rt>おも</rt></ruby>った",
      "<ruby>私<rt>わたし</rt></ruby>がこの「システム」を<ruby>使<rt>つか</rt></ruby>えるようになるには、<ruby>技術者<rt>ぎじゅつしゃ</rt></ruby>のサポートが<ruby>必要<rt>ひつよう</rt></ruby>だと<ruby>思<rt>おも</rt></ruby>う",
      "この「システム」の<ruby>様々<rt>さまざま</rt></ruby>な<ruby>機能<rt>きのう</rt></ruby>は、<ruby>互<rt>たが</rt></ruby>いによく<ruby>連携<rt>れんけい</rt></ruby>されていると<ruby>感<rt>かん</rt></ruby>じた",
      "この「システム」には<ruby>一貫性<rt>いっかんせい</rt></ruby>がなさすぎると<ruby>思<rt>おも</rt></ruby>った",
      "ほとんどの<ruby>人<rt>ひと</rt></ruby>はこの「システム」をすぐに<ruby>使<rt>つか</rt></ruby>いこなせるようになると<ruby>思<rt>おも</rt></ruby>う",
      "この「システム」はとても<ruby>使<rt>つか</rt></ruby>いづらいと<ruby>感<rt>かん</rt></ruby>じた",
      "この「システム」を<ruby>使<rt>つか</rt></ruby>う<ruby>自信<rt>じしん</rt></ruby>が<ruby>持<rt>も</rt></ruby>てた",
      "<ruby>私<rt>わたし</rt></ruby>がこの「システム」を<ruby>使<rt>つか</rt></ruby>う<ruby>際<rt>さい</rt></ruby>には、<ruby>多<rt>おお</rt></ruby>くのことを<ruby>学<rt>まな</rt></ruby>ぶ<ruby>必要<rt>ひつよう</rt></ruby>があった",
      "その<ruby>他<rt>ほか</rt></ruby>のコメントやフィードバックがあれば<ruby>共有<rt>きょうゆう</rt></ruby>してください。"
    ],
    hints: {
      stronglyDisagree: "<ruby>全<rt>まった</rt></ruby>くそう<ruby>思<rt>おも</rt></ruby>わない",
      stronglyAgree: "<ruby>強<rt>つよ</rt></ruby>くそう<ruby>思<rt>おも</rt></ruby>う"
    },
    intro: {
      h1: "Attention & Working Memory の<ruby>体験<rt>たいけん</rt></ruby>テストにご<ruby>協力<rt>きょうりょく</rt></ruby>いただきありがとうございます！",
      lead1: "<ruby>評価<rt>ひょうか</rt></ruby><ruby>対象<rt>たいしょう</rt></ruby>となる「システム」を<ruby>利用<rt>りよう</rt></ruby>した<ruby>後<rt>あと</rt></ruby>、「システム」についてのフィードバックや<ruby>議論<rt>ぎろん</rt></ruby>を<ruby>行<rt>おこな</rt></ruby>う<ruby>前<rt>まえ</rt></ruby>に、<ruby>以下<rt>いか</rt></ruby>の<ruby>質問<rt>しつもん</rt></ruby>に<ruby>回答<rt>かいとう</rt></ruby>してください。<ruby>各<rt>かく</rt></ruby><ruby>項目<rt>こうもく</rt></ruby>について、<ruby>深<rt>ふか</rt></ruby>く<ruby>考<rt>かんが</rt></ruby>えずに<ruby>即座<rt>そくざ</rt></ruby>に<ruby>回答<rt>かいとう</rt></ruby>してください。<ruby>必<rt>かなら</rt></ruby>ずすべての<ruby>項目<rt>こうもく</rt></ruby>に<ruby>対<rt>たい</rt></ruby>して<ruby>回答<rt>かいとう</rt></ruby>してください。<ruby>回答<rt>かいとう</rt></ruby>しにくい<ruby>項目<rt>こうもく</rt></ruby>がある<ruby>場合<rt>ばあい</rt></ruby>には、<ruby>中間<rt>ちゅうかん</rt></ruby>の「3」にチェックを<ruby>入<rt>い</rt></ruby>れてください。",
      lead2: "※ <ruby>利用<rt>りよう</rt></ruby>した「システム」の<ruby>種類<rt>しゅるい</rt></ruby>によっては、「システム」でなく「<ruby>製品<rt>せいひん</rt></ruby>」、「コンテンツ」などと<ruby>読<rt>よ</rt></ruby>み<ruby>替<rt>か</rt></ruby>えてもらった<ruby>方<rt>ほう</rt></ruby>が<ruby>分<rt>わ</rt></ruby>かりやすい<ruby>可能性<rt>かのうせい</rt></ruby>があります。<br>こちらから<ruby>体験<rt>たいけん</rt></ruby>してください: <a href=\"https://awmpublic.xiberlinc.one/\" target=\"_blank\" rel=\"noopener noreferrer\">https://awmpublic.xiberlinc.one/</a>"
    },
    thanks: {
      h1: "Xiberlinc Attention & Working Memory サイトのテストと<ruby>意見<rt>いけん</rt></ruby>の<ruby>共有<rt>きょうゆう</rt></ruby>、ありがとうございました！",
      sub: "フィードバックは<ruby>継続的<rt>けいぞくてき</rt></ruby>な<ruby>体験<rt>たいけん</rt></ruby>の<ruby>改善<rt>かいぜん</rt></ruby>に<ruby>役立<rt>やくだ</rt></ruby>ちます。お<ruby>時間<rt>じかん</rt></ruby>とお<ruby>力添<rt>ちからぞ</rt></ruby>えに<ruby>心<rt>こころ</rt></ruby>より<ruby>感謝<rt>かんしゃ</rt></ruby>いたします。",
      footer: "<strong><ruby>東京<rt>とうきょう</rt></ruby>で ❤️ を<ruby>込<rt>こ</rt></ruby>めて<ruby>作<rt>つく</rt></ruby>られました</strong>"
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
  document.querySelectorAll('.hint.left').forEach(el => {
    el.innerHTML = dict.hints.stronglyDisagree;
  });
  document.querySelectorAll('.hint.right').forEach(el => {
    el.innerHTML = dict.hints.stronglyAgree;
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
