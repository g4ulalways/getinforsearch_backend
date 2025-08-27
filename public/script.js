// --- NEW FEATURES START HERE ---

// Get the search input element once to use it multiple times
const searchInput = document.getElementById('search-input');

// 1. Autofocus on page load
// This waits for the page to fully load and then places the cursor in the search bar.
window.addEventListener('DOMContentLoaded', () => {
    searchInput.focus();
});

// 2. Select all text when the search bar is clicked again
// This makes it easy to delete the previous query.
searchInput.addEventListener('focus', () => {
    searchInput.select();
});

// --- NEW FEATURES END HERE ---


// --- Function to format the API response ---
function formatResponse(text) {
    // First, remove the citation numbers like [1], [1][3], etc.
    let cleanText = text.replace(/\[\d+\](\[\d+\])*/g, '');

    // Next, replace the markdown-style bolding (**) with HTML <strong> tags
    let formattedText = cleanText.replace(/\*{2}(.*?)\*{2}/g, '<strong>$1</strong>');

    return formattedText;
}

document.getElementById('search-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const prompt = searchInput.value;
    const responseContainer = document.getElementById('response-container');
    const responseText = document.getElementById('response-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    const copyButton = document.getElementById('copy-button');
    const disclaimer = document.querySelector('.disclaimer');

    responseContainer.style.display = 'block';
    loadingIndicator.style.display = 'block';
    responseText.style.display = 'none';
    copyButton.style.display = 'none';
    disclaimer.style.display = 'none';

    // --- FINAL CHANGE FOR DEPLOYMENT ---
    // This URL points to your live backend server on Render.
    const apiUrl = 'https://getinforsearch-backend.onrender.com/api/search';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt }),
        });

        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            const responseText = await response.text();
            console.error("Server did not return JSON. Response:", responseText);
            throw new Error(`The server returned an invalid response. This is often a sign of a server-side routing issue.`);
        }

        const data = await response.json();
        
        loadingIndicator.style.display = 'none';
        responseText.style.display = 'block';
        copyButton.style.display = 'inline-block';
        disclaimer.style.display = 'block';

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            const perplexityResponse = data.choices[0].message.content;
            // Use the new formatting function and innerHTML
            responseText.innerHTML = formatResponse(perplexityResponse);
        } else {
            throw new Error("Received an empty or invalid response from the API.");
        }

    } catch (error) {
        loadingIndicator.style.display = 'none';
        responseText.style.display = 'block';
        responseText.innerText = `Error: ${error.message}`;
        console.error('There was a problem with the fetch operation:', error);
    }
});

// --- Copy Button Logic ---
document.getElementById('copy-button').addEventListener('click', function() {
    const responseTextToCopy = document.getElementById('response-text').innerText;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(responseTextToCopy).then(() => {
            this.innerText = 'Copied!';
            setTimeout(() => { this.innerText = 'Copy'; }, 2000);
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = responseTextToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.innerText = 'Copied!';
        setTimeout(() => { this.innerText = 'Copy'; }, 2000);
    }
});
