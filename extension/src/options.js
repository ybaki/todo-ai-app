const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const extensionTokenInput = document.getElementById("extensionToken");
const statusEl = document.getElementById("status");

async function restore() {
  const { apiBaseUrl, extensionToken } = await chrome.storage.local.get([
    "apiBaseUrl",
    "extensionToken",
  ]);
  if (apiBaseUrl) apiBaseUrlInput.value = apiBaseUrl;
  if (extensionToken) extensionTokenInput.value = extensionToken;
}

document.getElementById("saveButton").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiBaseUrl: apiBaseUrlInput.value.trim(),
    extensionToken: extensionTokenInput.value.trim(),
  });
  statusEl.textContent = "Kaydedildi.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

void restore();
