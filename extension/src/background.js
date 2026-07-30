// Manifest V3 service worker. Web uygulamasindaki Supabase oturumuna
// DOGRUDAN erisilemez (farkli origin); bunun yerine kullanicinin web
// ayarlar sayfasinda urettigi opak "eklenti anahtari" kullanilir.
// Bkz. plan bolum 1, madde 2 ve supabase/migrations/0004_extension_tokens.sql.

const CONTEXT_MENU_ID = "akilli-todo-add-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Akıllı Todo'ya ekle: \"%s\"",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    void sendTask(info.selectionText);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "send-selection") return;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  const [{ result: selectedText }] = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => window.getSelection()?.toString() ?? "",
  });

  if (selectedText) {
    void sendTask(selectedText);
  } else {
    notify("Akıllı Todo", "Önce bir metin seçmelisiniz.");
  }
});

async function getSettings() {
  const { apiBaseUrl, extensionToken } = await chrome.storage.local.get([
    "apiBaseUrl",
    "extensionToken",
  ]);
  return { apiBaseUrl, extensionToken };
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
  });
}

// FR-10: Ayni secim birden fazla kez gonderilse bile tek gorev olusmali.
function buildIdempotencyKey(rawText) {
  const today = new Date().toISOString().slice(0, 10);
  return `ext:${today}:${rawText.trim().slice(0, 80)}`;
}

async function sendTask(rawText) {
  const { apiBaseUrl, extensionToken } = await getSettings();

  if (!apiBaseUrl || !extensionToken) {
    notify(
      "Akıllı Todo - Kurulum gerekli",
      "Lütfen eklenti ayarlarından API adresi ve anahtarınızı girin."
    );
    chrome.runtime.openOptionsPage();
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        rawText: rawText.trim(),
        source: "chrome_extension",
        idempotencyKey: buildIdempotencyKey(rawText),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      notify("Akıllı Todo - Hata", body.error ?? `İstek başarısız (HTTP ${response.status})`);
      return;
    }

    notify("Akıllı Todo", "Görev Inbox'a eklendi.");
  } catch {
    notify("Akıllı Todo - Bağlantı hatası", "Sunucuya ulaşılamadı; internet bağlantınızı kontrol edin.");
  }
}
