export const formatTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const highlightYaml = (text) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/(#.*$)/gm, '<span class="yaml-comment">$1</span>')
    .replace(/^(\s*)([a-zA-Z0-9_-]+)(:)/gm, '$1<span class="yaml-key">$2</span>$3')
    .replace(/:\s*(\d+)(\s*)$/gm, ': <span class="yaml-number">$1</span>$2')
    .replace(/:\s*(true|false)(\s*)$/gm, ': <span class="yaml-boolean">$1</span>$2')
    .replace(/"([^"]+)"/g, '<span class="yaml-string">"$1"</span>');

  return html;
};
