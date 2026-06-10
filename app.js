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
