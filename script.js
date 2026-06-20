document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------
     Data: scenarios (your exact input)
     --------------------------- */
  const SCENARIOS = { 
    "Daily Life": [
      "Abdullah wakes up early and goes for a morning walk everyday.",
      "Ayaan always reads the newspaper at breakfast.",
      "Ali practices speaking English every evening.",
      "Sara listens to podcasts to improve her pronunciation.",
      "Fatima makes breakfast for her family."
    ],
    "Academics": [
      "Ayaan studies mathematics with his friend Saad.",
      "Shaheer loves learning new English words every day.",
      "Ahmed helps his classmates with difficult grammar lessons.",
      "Sara enjoys participating in the school debate competition.",
      "Abdullah writes essays to improve his English writing skills."
    ],
    "Work": [
      "Ali checked the meeting agenda before the presentation.",
      "Ayaan is preparing a short report for his manager.",
      "Saad will call the client to confirm the meeting time.",
      "Ahmed organized the team's tasks for the week.",
      "Fatima contacted her HR about the interview schedule."
    ],
    "Travel": [
      "Ayaan is traveling to London for a business meeting.",
      "Abdullah forgot his passport at home before his flight.",
      "Ali checked into a hotel near the airport.",
      "Sara asked the receptionist for a map of the city.",
      "Saad is practicing English to communicate with international clients."
    ],
    "Sports": [
      "Ali plays football with his friends every weekend.",
      "Abdullah practices cricket every weekend.",
      "Shaheer and Ahmed watch the big match together.",
      "Ayaan loves to swim to stay healthy.",
      "Fatima supports her favorite tennis player during tournaments."
    ]
  };

  /* ---------------------------
     Motivation Corner: daily images
     --------------------------- */
  const MOTIVATIONS = [
    { img:"https://source.unsplash.com/600x200/?nature,peace", text:"Every day is a chance to improve!" },
    { img:"https://source.unsplash.com/600x200/?sky,calm", text:"Keep going, your effort counts!" },
    { img:"https://source.unsplash.com/600x200/?mountains,sunrise", text:"Small steps every day lead to big results." },
    { img:"https://source.unsplash.com/600x200/?forest,river", text:"Practice makes progress." },
    { img:"https://source.unsplash.com/600x200/?beach,calm", text:"Believe in yourself and keep learning!" }
  ];
  
  function showDailyMotivation() {
    const index = new Date().getDate() % MOTIVATIONS.length;
    const motiv = MOTIVATIONS[index];
    const box = document.getElementById("motivationBox");
    box.innerHTML = `
      <div class="motivation-card">
        <img src="${motiv.img}" alt="Motivation">
        <div class="motivation-text">${motiv.text}</div>
      </div>
    `;
  }
  showDailyMotivation();

  /* ---------------------------
     Elements
     --------------------------- */
  const scenarioSelect = document.getElementById("scenarioSelect");
  const newSentenceBtn = document.getElementById("newSentenceBtn");
  const sentenceText = document.getElementById("sentenceText");
  const listenBtn = document.getElementById("listenBtn");
  const recordBtn = document.getElementById("recordBtn");
  const stopRecordBtn = document.getElementById("stopRecordBtn");
  const playback = document.getElementById("playback");
  const startRecBtn = document.getElementById("startRecBtn");
  const transcriptEl = document.getElementById("transcript");
  const scoreBlock = document.getElementById("scoreBlock");
  const totalScoreEl = document.getElementById("totalScore");
  const accScoreEl = document.getElementById("accScore");
  const pronScoreEl = document.getElementById("pronScore");
  const fluScoreEl = document.getElementById("fluScore");
  const summaryEl = document.getElementById("summary");
  const scoreChartCanvas = document.getElementById("progressChart");
  const historyTableBody = document.querySelector("#historyTable tbody");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const opinionBox = document.getElementById("opinionBox");
  const submitOpinionBtn = document.getElementById("submitOpinionBtn");
  const opinionsList = document.getElementById("opinionsList");
  const fasaiInput = document.getElementById("fasaiInput");
  const fasaiReply = document.getElementById("fasaiReply");
  const askFasAI = document.getElementById("askFasAI");
  const suggestPractice = document.getElementById("suggestPractice");

  /* ---------------------------
     Populate scenario dropdown
     --------------------------- */
  Object.keys(SCENARIOS).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = key;
    scenarioSelect.appendChild(opt);
  });

  let currentScenario = Object.keys(SCENARIOS)[0];
  let currentSentence = "";
  scenarioSelect.addEventListener("change", e => currentScenario = e.target.value);

  /* ---------------------------
     Utilities
     --------------------------- */
  const STORAGE_KEY = "chatquest_history_v2";
  const OPINIONS_KEY = "chatquest_opinions_v1";

  function nowStr() { return new Date().toLocaleString(); }
  function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

  function loadHistory(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}catch{return[];} }
  function saveHistory(hist){ localStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); }
  function loadOpinions(){ try{return JSON.parse(localStorage.getItem(OPINIONS_KEY))||[];}catch{return[];} }
  function saveOpinions(list){ localStorage.setItem(OPINIONS_KEY, JSON.stringify(list)); }

  /* ---------------------------
     Sentence Generation + Listen
     --------------------------- */
  function generateSentence() {
    const list = SCENARIOS[currentScenario] || [];
    if(!list.length){ sentenceText.textContent="No sentences for this scenario."; return; }
    currentSentence = rand(list);
    sentenceText.textContent = currentSentence;
    transcriptEl.textContent = "Transcript will appear here.";
    hideScore();
  }
  newSentenceBtn.addEventListener("click", generateSentence);

  listenBtn.addEventListener("click", () => {
    if(!currentSentence){ alert("Click Generate first."); return; }
    const utt = new SpeechSynthesisUtterance(currentSentence);
    utt.lang = "en-US"; utt.rate=0.95;
    speechSynthesis.cancel(); speechSynthesis.speak(utt);
  });

  /* ---------------------------
     Recording
     --------------------------- */
  let mediaRecorder=null, recordedChunks=[];
  recordBtn.addEventListener("click", async ()=>{
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      recordedChunks=[]; mediaRecorder=new MediaRecorder(stream);
      mediaRecorder.ondataavailable=e=>{if(e.data && e.data.size) recordedChunks.push(e.data);}
      mediaRecorder.onstop=()=>{playback.src=URL.createObjectURL(new Blob(recordedChunks,{type:'audio/webm'})); playback.classList.remove("hidden-audio");}
      mediaRecorder.start(); recordBtn.disabled=true; stopRecordBtn.disabled=false;
    }catch{ alert("Microphone access required."); }
  });
  stopRecordBtn.addEventListener("click", ()=>{
    if(mediaRecorder && mediaRecorder.state!=="inactive"){ mediaRecorder.stop(); recordBtn.disabled=false; stopRecordBtn.disabled=true; }
  });

  /* ---------------------------
     Speech Recognition + Scoring
     --------------------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recognition = SR ? new SR() : null;
  if(recognition){ recognition.lang="en-US"; recognition.interimResults=false; recognition.maxAlternatives=1; }
  else { startRecBtn.disabled=true; transcriptEl.textContent="Speech recognition not supported (Chrome/Edge)."; }

  function levenshtein(a="",b=""){ a=a||"";b=b||"";const m=a.length,n=b.length;if(m===0)return n;if(n===0)return m;const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0)); for(let i=0;i<=m;i++)dp[i][0]=i;for(let j=0;j<=n;j++)dp[0][j]=j;for(let i=1;i<=m;i++){for(let j=1;j<=n;j++){const cost=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);}}return dp[m][n];}
  function wordAccuracy(ref,hyp){ const r=ref.toLowerCase().replace(/[^\w\s]/g,"").split(/\s+/).filter(Boolean); const h=hyp.toLowerCase().replace(/[^\w\s]/g,"").split(/\s+/).filter(Boolean); if(r.length===0)return 0; let matches=0; r.forEach((w,i)=>{if(h[i]===w)matches++;}); return matches/r.length; }
  function pronunciationEst(ref,hyp){ const a=ref.toLowerCase(),b=hyp.toLowerCase(); const dist=levenshtein(a,b); return Math.max(0,(Math.max(a.length,b.length)-dist)/Math.max(a.length,b.length,1)); }
  function fluencyEst(hyp,durationMs){ const words=hyp.trim().split(/\s+/).filter(Boolean).length; const minutes=Math.max(durationMs/60000,0.01); const wpm=words/minutes; const min=60,max=160; return Math.max(0,Math.min(1,(wpm-min)/(max-min))); }
  function combinedPercent(acc,pron,flu){ return Math.round((acc*0.5+pron*0.3+flu*0.2)*100); }

  let attemptStartTime=null;
  if(recognition){
    recognition.onstart=()=>{ attemptStartTime=Date.now(); transcriptEl.textContent="Listening..."; }
    recognition.onresult=ev=>{
      const text=ev.results[0][0].transcript; const duration=Date.now()-(attemptStartTime||Date.now());
      transcriptEl.textContent=`You said: "${text}"`;
      evaluateAttempt(text,duration);
      try{ if(mediaRecorder && mediaRecorder.state!=="inactive"){ mediaRecorder.stop(); stopRecordBtn.disabled=true; recordBtn.disabled=false; }}catch{}
    };
    recognition.onerror=e=>{ transcriptEl.textContent=`Recognition error: ${e.error||e.message||e}`; };
  }
  startRecBtn.addEventListener("click", ()=>{
    if(!currentSentence){ alert("Generate a sentence first."); return; }
    if(!recognition){ alert("Speech recognition not available."); return; }
    try{ recognition.start(); } catch(err){ recognition=new (window.SpeechRecognition||window.webkitSpeechRecognition)(); recognition.lang="en-US"; recognition.interimResults=false; recognition.maxAlternatives=1; recognition.start();}
  });

  /* ---------------------------
     Evaluate Attempt
     --------------------------- */
  let lastAttempt=null;
  function evaluateAttempt(hyp,durationMs=2000){
    const ref=currentSentence||"";
    const acc=wordAccuracy(ref,hyp);
    const pron=pronunciationEst(ref,hyp);
    const flu=fluencyEst(hyp,durationMs);
    const accPct=Math.round(acc*100),pronPct=Math.round(pron*100),fluPct=Math.round(flu*100);
    const total=combinedPercent(acc,pron,flu);

    scoreBlock.classList.remove("hidden");
    totalScoreEl.textContent=total;
    accScoreEl.textContent=accPct;
    pronScoreEl.textContent=pronPct;
    fluScoreEl.textContent=fluPct;
    summaryEl.innerHTML=generateSummary(accPct,pronPct,fluPct);

    const attempt={time:nowStr(),scenario:currentScenario,sentence:ref,hyp,accPct,pronPct,fluPct,total};
    const hist=loadHistory(); hist.unshift(attempt); saveHistory(hist);

    renderHistory(); updateChartFromHistory();
    lastAttempt=attempt;
  }

  function generateSummary(acc,pron,flu){
    const parts=[]; const suggestions=[];
    if(acc<75) { parts.push("<div><b>Accuracy:</b> Practice matching words exactly.</div>"); suggestions.push("Practice sentence slowly word-by-word."); } 
    else parts.push("<div><b>Accuracy:</b> Good.</div>");
    if(pron<70){ parts.push("<div><b>Pronunciation:</b> Focus on sounds and intonation.</div>"); suggestions.push("Record problem words and repeat them."); } 
    else if(pron<85) parts.push("<div><b>Pronunciation:</b> Decent — focus on tricky sounds.</div>");
    else parts.push("<div><b>Pronunciation:</b> Very good.</div>");
    if(flu<50){ parts.push("<div><b>Fluency:</b> Reduce pauses, read along with model audio.</div>"); suggestions.push("Read aloud steadily."); }
    else if(flu<80) parts.push("<div><b>Fluency:</b> Good pace.</div>");
    else parts.push("<div><b>Fluency:</b> Excellent.</div>");
    return `<div>Attempt summary (${nowStr()}):</div><div class="summary-list">${parts.join("")}</div><div style="margin-top:8px"><b>Actionable:</b> ${suggestions.length?suggestions.join(" "):"Keep practicing."}</div>`;
  }

  /* ---------------------------
     History + Chart
     --------------------------- */
  const chartCtx=scoreChartCanvas.getContext("2d");
  const chartObj=new Chart(chartCtx,{type:'bar',data:{labels:[],datasets:[{label:'Score',data:[],backgroundColor:[],borderWidth:1}]},options:{scales:{y:{beginAtZero:true,max:100}},plugins:{legend:{display:false}}}});
  function renderHistory(){ const hist=loadHistory(); historyTableBody.innerHTML=""; hist.slice(0,100).forEach((a,i)=>{ const tr=document.createElement("tr"); tr.innerHTML=`<td>${i+1}</td><td>${a.time}</td><td>${a.scenario}</td><td><strong>${a.total}%</strong></td><td>Acc:${a.accPct}% Pron:${a.pronPct}% Flu:${a.fluPct}%</td>`; historyTableBody.appendChild(tr); }); updateChartFromHistory();}
  function updateChartFromHistory(){ const hist=loadHistory().slice(0,20); const labels=hist.map((h,i)=>`${i+1}`).reverse(); const data=hist.map(h=>h.total).reverse(); const colorize=data.map(v=>v>=85?'rgba(16,185,129,0.8)':v>=60?'rgba(59,130,246,0.8)':'rgba(239,68,68,0.8)'); chartObj.data.labels=labels; chartObj.data.datasets[0].data=data; chartObj.data.datasets[0].backgroundColor=colorize; chartObj.update();}
  clearHistoryBtn.addEventListener("click",()=>{ if(!confirm("Clear history?")) return; localStorage.removeItem(STORAGE_KEY); renderHistory(); hideScore(); });

  function hideScore(){ scoreBlock.classList.add("hidden"); totalScoreEl.textContent="—"; accScoreEl.textContent="—"; pronScoreEl.textContent="—"; fluScoreEl.textContent="—"; summaryEl.innerHTML=""; }

  /* ---------------------------
     Opinions
     --------------------------- */
  function renderOpinions(){ const list=loadOpinions(); opinionsList.innerHTML=""; list.forEach(item=>{ const div=document.createElement("div"); div.className="opinion-item"; const p=document.createElement("div"); p.textContent=item.text; const t=document.createElement("div"); t.style.fontSize="0.8rem"; t.style.color="#334155"; t.textContent=item.time; div.appendChild(p); div.appendChild(t); opinionsList.appendChild(div); }); }
  submitOpinionBtn.addEventListener("click",()=>{
    const text=opinionBox.value.trim();
    if(!text){ alert("Write your opinion first."); return; }
    const words=text.split(/\s+/).filter(Boolean).length;
    if(words>500){ alert("Exceeds 500 words!"); return; }
    const list=loadOpinions(); list.unshift({text,time:nowStr()}); saveOpinions(list); opinionBox.value=""; renderOpinions();
  });

  /* ---------------------------
     FasAI Assistant
     --------------------------- */
  function fasaiAnswer(promptText){
    if(!promptText||promptText.trim().length===0){ 
      if(!lastAttempt) return "Do a practice attempt first.";
      const parts=[]; if(lastAttempt.accPct<80) parts.push("accuracy"); if(lastAttempt.pronPct<80) parts.push("pronunciation"); if(lastAttempt.fluPct<60) parts.push("fluency");
      const area=parts.length?parts.join(", "):"your speaking overall"; 
      return `Based on last score ${lastAttempt.total}%: focus on ${area}.`;
    }
    const q=promptText.toLowerCase();
    if(q.includes("accent")||q.includes("reduce")) return "Accent tips: practice minimal pairs, shadow slowly, record yourself.";
    if(q.includes("fluency")||q.includes("speed")) return "Fluency tips: practice linked speech, read aloud steadily.";
    if(q.includes("pronunciation")||q.includes("sounds")) return "Pronunciation tips: isolate sounds, then words, then sentences.";
    if(q.includes("practice")||q.includes("sentence")) return `Practice suggestion: "${suggestPracticeSentence()}" — listen, shadow, record, compare.`;
    return "Ask FasAI for targeted practice or a sound explanation.";
  }
  askFasAI.addEventListener("click",()=>{ const q=fasaiInput.value.trim(); fasaiReply.textContent="FasAI is thinking..."; setTimeout(()=>{ fasaiReply.textContent=fasaiAnswer(q); },300); });
  suggestPractice.addEventListener("click",()=>{ fasaiReply.textContent=`Practice suggestion: "${suggestPracticeSentence()}" — click Generate.`; });
  function suggestPracticeSentence(){ const all=Object.values(SCENARIOS).flat(); return rand(all); }

  /* ---------------------------
     Init
     --------------------------- */
  (function init(){ scenarioSelect.value=currentScenario; generateSentence(); renderHistory(); renderOpinions(); hideScore(); })();
  window.addEventListener("resize",()=>{ setTimeout(updateChartFromHistory,220); });
});
