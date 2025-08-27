// script.js

const searchInput = document.getElementById('search-input');

// Autofocus and select-on-focus
window.addEventListener('DOMContentLoaded', () => {
  if (searchInput) searchInput.focus();
});
searchInput?.addEventListener('focus', () => searchInput.select());

// Format API text: strip [1][2] style citations and markdown bold
function formatResponse(text) {
  let cleanText = (text || '').replace(/\[\d+\](\[\d+\])*/g, '');
  // Keep the content but drop markdown asterisks around bold
  cleanText = cleanText.replace(/\*{2}(.*?)\*{2}/g, '$1');
  return cleanText;
}

document.getElementById('search-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const prompt = searchInput.value.trim();
  const responseContainer = document.getElementById('response-container');
  const responseTextEl = document.getElementById('response-text');
  const loadingIndicator = document.getElementById('loading-indicator');
  const copyButton = document.getElementById('copy-button');
  const disclaimer = document.querySelector('.disclaimer');

  responseContainer.style.display = 'block';
  loadingIndicator.style.display = 'block';
  responseTextEl.style.display = 'none';
  copyButton.style.display = 'none';
  disclaimer.style.display = 'none';

  const apiUrl = 'https://getinforsearch-backend.onrender.com/api/search';

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, online: true }),
    });

    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok || !contentType.includes('application/json')) {
      const text = await resp.text();
      throw new Error(`Server error ${resp.status}. Body: ${text.slice(0, 400)}`);
    }

    const data = await resp.json();

    loadingIndicator.style.display = 'none';
    responseTextEl.style.display = 'block';
    copyButton.style.display = 'inline-block';
    disclaimer.style.display = 'block';

    const msg = data?.choices?.?.message?.content || '';
    responseTextEl.innerHTML = formatResponse(msg) || 'No content returned.';
  } catch (error) {
    loadingIndicator.style.display = 'none';
    responseTextEl.style.display = 'block';
    responseTextEl.innerText = `Error: ${error.message}`;
    console.error('Fetch operation failed:', error);
  }
});

// Copy button
document.getElementById('copy-button')?.addEventListener('click', function () {
  const txt = document.getElementById('response-text').innerText;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(() => {
      this.innerText = 'Copied!';
      setTimeout(() => (this.innerText = 'Copy'), 2000);
    });
  }
});
