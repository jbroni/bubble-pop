const els = {
  overlay: document.getElementById('howToPlayOverlay'),
  closeBtn: document.getElementById('howToPlayCloseBtn'),
};
els.closeBtn.onclick = () => hideHowToPlayOverlay();

export function showHowToPlayOverlay() {
  els.overlay.hidden = false;
}

export function hideHowToPlayOverlay() {
  els.overlay.hidden = true;
}
