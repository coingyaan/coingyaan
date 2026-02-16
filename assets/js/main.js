// ===== SHARING HELPERS =====

function shareOnX(text, url) {
  const shareUrl =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(text + "\n" + url);
  window.open(shareUrl, "_blank");
}

function shareOnTelegram(text, url) {
  const shareUrl =
    "https://t.me/share/url?url=" +
    encodeURIComponent(url) +
    "&text=" +
    encodeURIComponent(text);
  window.open(shareUrl, "_blank");
}

