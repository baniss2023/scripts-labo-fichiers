function storageKeyForProof(id){ return `proof:${id}`; }
function storageKeyForTeam(id){ return `team:${id}`; }

function setProofImage(proofEl, dataUrl){
  const img = proofEl.querySelector(".proofImg");
  const empty = proofEl.querySelector(".proofEmpty");
  const body = proofEl.querySelector(".proof-body");
  if(!img || !empty) return;

  if(dataUrl){
    img.src = dataUrl;
    img.style.display = "";
    empty.style.display = "none";
    proofEl.classList.add("has-proof");
    if(body) body.classList.add("has-image");
  }else{
    img.removeAttribute("src");
    img.style.display = "none";
    empty.style.display = "";
    proofEl.classList.remove("has-proof");
    if(body) body.classList.remove("has-image");
  }

  syncCaptureChecklist();
}


function syncCaptureChecklist(){
  document.querySelectorAll('.capture-check[data-proof-target]').forEach(box => {
    const proofId = box.getAttribute('data-proof-target');
    const proofEl = document.querySelector(`.proof[data-proof-id="${proofId}"]`);
    const hasImage = !!(proofEl && proofEl.classList.contains('has-proof') && proofEl.querySelector('.proofImg') && proofEl.querySelector('.proofImg').getAttribute('src'));
    box.checked = hasImage;
  });
}

function loadImageFileIntoProof(proofEl, file){
  if(!file || !String(file.type || "").startsWith("image/")) return;
  const id = proofEl.getAttribute("data-proof-id");
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    setProofImage(proofEl, dataUrl);
    try{ localStorage.setItem(storageKeyForProof(id), dataUrl); }catch(_e){}
  };
  reader.readAsDataURL(file);
}

function handleProofPaste(proofEl, event){
  const items = Array.from((event.clipboardData && event.clipboardData.items) || []);
  const imageItem = items.find(item => String(item.type || "").startsWith("image/"));
  if(!imageItem) return;
  const file = imageItem.getAsFile();
  if(!file) return;
  event.preventDefault();
  loadImageFileIntoProof(proofEl, file);
}

function wireProofBlocks(){
  document.querySelectorAll(".proof[data-proof-id]").forEach(proofEl => {
    const id = proofEl.getAttribute("data-proof-id");
    const btnCap = proofEl.querySelector(".btnCapture");
    const btnClr = proofEl.querySelector(".btnClear");
    const file = proofEl.querySelector(".proofFile");
    const body = proofEl.querySelector(".proof-body");

    try{
      const saved = localStorage.getItem(storageKeyForProof(id));
      if(saved) setProofImage(proofEl, saved);
      else setProofImage(proofEl, null);
    }catch(_e){
      setProofImage(proofEl, null);
    }

    if(btnCap && file){
      btnCap.addEventListener("click", () => file.click());
      file.addEventListener("change", () => {
        const f = file.files && file.files[0];
        if(!f) return;
        loadImageFileIntoProof(proofEl, f);
      });
    }

    if(btnClr){
      btnClr.addEventListener("click", () => {
        setProofImage(proofEl, null);
        if(file) file.value = "";
        try{ localStorage.removeItem(storageKeyForProof(id)); }catch(_e){}
      });
    }

    if(body){
      if(!body.hasAttribute("tabindex")) body.setAttribute("tabindex", "0");
      body.addEventListener("click", () => body.focus());
      body.addEventListener("paste", event => handleProofPaste(proofEl, event));
      body.addEventListener("dragover", event => event.preventDefault());
      body.addEventListener("drop", event => {
        event.preventDefault();
        const fileFromDrop = Array.from(event.dataTransfer?.files || []).find(f => String(f.type || "").startsWith("image/"));
        if(fileFromDrop) loadImageFileIntoProof(proofEl, fileFromDrop);
      });
    }
  });
}

function extractCommandText(target){
  const clone = target.cloneNode(true);
  clone.querySelectorAll('.prompt').forEach(el => el.remove());
  return clone.textContent.replace(/^\s+|\s+$/g, "");
}

function wireCopyButtons(){
  document.querySelectorAll('.copybtn[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const target = document.getElementById(id);
      if(!target) return;
      const text = extractCommandText(target);
      try{
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = 'Copié';
        setTimeout(() => { btn.textContent = old; }, 1200);
      }catch(_e){
        const old = btn.textContent;
        btn.textContent = 'Échec';
        setTimeout(() => { btn.textContent = old; }, 1200);
      }
    });
  });
}

function renderTeamPrint(){
  const box = document.getElementById("teamPrint");
  if(!box) return;

  const values = [1,2,3,4].map(i => {
    const input = document.getElementById(`teamMember${i}`);
    return input ? String(input.value || "").trim() : "";
  });

  box.innerHTML = `
    <div class="team-print-title">Equipe</div>
    <div class="team-print-grid">
      ${values.map((value, index) => `
        <div class="team-print-item">
          <span class="team-print-label">Nom${index + 1} :</span>
          <span class="team-print-value"> ${value || '................................................'}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function wireTeam(){
  document.querySelectorAll('.team-member-input').forEach(input => {
    try{
      const saved = localStorage.getItem(storageKeyForTeam(input.id));
      if(saved !== null) input.value = saved;
    }catch(_e){}

    const sync = () => {
      try{ localStorage.setItem(storageKeyForTeam(input.id), input.value); }catch(_e){}
      renderTeamPrint();
    };

    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
  });

  renderTeamPrint();
}

function getMissingProofCount(){
  syncCaptureChecklist();
  return Array.from(document.querySelectorAll('.proof[data-proof-id]')).filter(proofEl => {
    const img = proofEl.querySelector('.proofImg');
    return !(proofEl.classList.contains('has-proof') && img && img.getAttribute('src'));
  }).length;
}

function ensureExportConfirmDialog(){
  let overlay = document.getElementById('exportConfirmOverlay');
  if(overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'export-confirm-overlay';
  overlay.id = 'exportConfirmOverlay';
  overlay.innerHTML = `
    <div class="export-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="exportConfirmTitle">
      <h2 class="export-confirm-title" id="exportConfirmTitle">Captures obligatoires manquantes</h2>
      <p class="export-confirm-text" id="exportConfirmText"></p>
      <div class="export-confirm-actions">
        <button class="secondarybtn" id="exportConfirmCancel" type="button">Retourner au labo</button>
        <button class="actionbtn" id="exportConfirmYes" type="button">Oui</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', event => {
    if(event.target === overlay){
      closeExportConfirmDialog();
    }
  });

  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && overlay.classList.contains('is-visible')){
      closeExportConfirmDialog();
    }
  });

  return overlay;
}

function closeExportConfirmDialog(){
  const overlay = document.getElementById('exportConfirmOverlay');
  if(!overlay) return;
  overlay.classList.remove('is-visible');
}

function openExportConfirmDialog(missingCount, onConfirm){
  const overlay = ensureExportConfirmDialog();
  const text = overlay.querySelector('#exportConfirmText');
  const yes = overlay.querySelector('#exportConfirmYes');
  const cancel = overlay.querySelector('#exportConfirmCancel');

  if(text){
    if(missingCount === 1){
      text.textContent = "Il manque encore 1 capture obligatoire. Voulez-vous continuer vers l’exportation PDF ?";
    }else if(missingCount === 2){
      text.textContent = "Il manque encore 2 captures obligatoires. Voulez-vous continuer vers l’exportation PDF ?";
    }else{
      text.textContent = `Certaines captures obligatoires ne sont pas encore insérées (${missingCount}). Voulez-vous continuer vers l’exportation PDF ?`;
    }
  }

  if(yes){
    yes.onclick = () => {
      closeExportConfirmDialog();
      onConfirm?.();
    };
  }

  if(cancel){
    cancel.onclick = () => {
      closeExportConfirmDialog();
    };
  }

  overlay.classList.add('is-visible');
}

function wireExport(){
  const btn = document.getElementById("exportPdf");
  if(!btn) return;

  btn.addEventListener("click", () => {
    renderTeamPrint?.();
    const missingCount = getMissingProofCount();

    if(missingCount > 0){
      openExportConfirmDialog(missingCount, () => window.print());
      return;
    }

    window.print();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireCopyButtons();
  wireProofBlocks();
  wireTeam?.();
  wireExport();
  syncCaptureChecklist();
});
