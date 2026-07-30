const textArea = document.getElementById("taskText");
const submitButton = document.getElementById("submitButton");
const statusEl = document.getElementById("status");

document.getElementById("openOptions").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

submitButton.addEventListener("click", async () => {
  const rawText = textArea.value.trim();
  if (!rawText) return;

  const { apiBaseUrl, extensionToken } = await chrome.storage.local.get([
    "apiBaseUrl",
    "extensionToken",
  ]);

  if (!apiBaseUrl || !extensionToken) {
    statusEl.textContent = "Önce Ayarlar'dan API adresi ve anahtarınızı girin.";
    return;
  }

  statusEl.textContent = "Gönderiliyor...";
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${extensionToken}` },
      body: JSON.stringify({ rawText, source: "chrome_extension" }),
    });

    if (!response.ok) {
      statusEl.textContent = `Hata: HTTP ${response.status}`;
      return;
    }

    statusEl.textContent = "Eklendi ✓";
    textArea.value = "";
  } catch {
    statusEl.textContent = "Bağlantı hatası.";
  }
});
