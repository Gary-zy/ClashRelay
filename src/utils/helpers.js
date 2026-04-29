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

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const findYamlCommentStart = (line) => {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaping = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (inDoubleQuote && escaping) {
      escaping = false;
      continue;
    }
    if (inDoubleQuote && char === "\\") {
      escaping = true;
      continue;
    }
    if (!inDoubleQuote && char === "'") {
      if (inSingleQuote && line[index + 1] === "'") {
        index++;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }
    if (!inSingleQuote && char === "\"") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote && char === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      let commentStart = index;
      while (commentStart > 0 && /\s/.test(line[commentStart - 1])) commentStart--;
      return commentStart;
    }
  }

  return -1;
};

const highlightQuotedStrings = (segment) => {
  let html = "";
  let index = 0;

  while (index < segment.length) {
    const quote = segment[index];
    if (quote !== "\"" && quote !== "'") {
      html += escapeHtml(segment[index]);
      index++;
      continue;
    }

    let end = index + 1;
    while (end < segment.length) {
      if (quote === "\"" && segment[end] === "\\") {
        end += 2;
        continue;
      }
      if (quote === "'" && segment[end] === "'" && segment[end + 1] === "'") {
        end += 2;
        continue;
      }
      if (segment[end] === quote) {
        end++;
        break;
      }
      end++;
    }

    html += `<span class="yaml-string">${escapeHtml(segment.slice(index, end))}</span>`;
    index = end;
  }

  return html;
};

const highlightYamlValue = (segment) => {
  if (segment.includes("\"") || segment.includes("'")) {
    return highlightQuotedStrings(segment);
  }

  const numberMatch = segment.match(/^(\s*)(\d+)(\s*)$/);
  if (numberMatch) {
    return `${escapeHtml(numberMatch[1])}<span class="yaml-number">${numberMatch[2]}</span>${escapeHtml(numberMatch[3])}`;
  }

  const booleanMatch = segment.match(/^(\s*)(true|false)(\s*)$/);
  if (booleanMatch) {
    return `${escapeHtml(booleanMatch[1])}<span class="yaml-boolean">${booleanMatch[2]}</span>${escapeHtml(booleanMatch[3])}`;
  }

  return escapeHtml(segment);
};

const highlightYamlLine = (line) => {
  const commentStart = findYamlCommentStart(line);
  const codePart = commentStart >= 0 ? line.slice(0, commentStart) : line;
  const commentPart = commentStart >= 0 ? line.slice(commentStart) : "";
  const keyMatch = codePart.match(/^(\s*)([a-zA-Z0-9_-]+)(:)(.*)$/);
  let html;

  if (keyMatch) {
    html = `${escapeHtml(keyMatch[1])}<span class="yaml-key">${escapeHtml(keyMatch[2])}</span>${keyMatch[3]}${highlightYamlValue(keyMatch[4])}`;
  } else {
    html = highlightYamlValue(codePart);
  }

  if (commentPart) {
    html += `<span class="yaml-comment">${escapeHtml(commentPart)}</span>`;
  }

  return html;
};

export const highlightYaml = (text) => {
  if (!text) return "";
  return text.split("\n").map(highlightYamlLine).join("\n");
};
