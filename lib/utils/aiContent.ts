export interface ContentSegment {
  type: "text" | "think";
  content: string;
}

export function parseThinkBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    const openIdx = remaining.indexOf("<think>");
    if (openIdx === -1) {
      if (remaining.trim()) segments.push({ type: "text", content: remaining });
      break;
    }

    const before = remaining.slice(0, openIdx);
    if (before.trim()) segments.push({ type: "text", content: before });

    const closeIdx = remaining.indexOf("</think>", openIdx);
    if (closeIdx === -1) {
      const thinkContent = remaining.slice(openIdx + 7);
      segments.push({ type: "think", content: thinkContent });
      break;
    }

    const thinkContent = remaining.slice(openIdx + 7, closeIdx);
    segments.push({ type: "think", content: thinkContent });
    remaining = remaining.slice(closeIdx + 8);
  }

  return segments;
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

function buildMarkdownSeparatorFromHeader(headerLine: string): string {
  const columns = headerLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (columns.length < 2) return "";
  return `| ${columns.map(() => "---").join(" | ")} |`;
}

export function normalizeMarkdownTables(raw: string): string {
  const expanded = raw.replace(/\|\s+\|/g, "|\n|");
  const lines = expanded.split("\n");
  const normalized: string[] = [];
  let inTableBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith("|");
    const isSep = isMarkdownTableSeparator(line);

    if (!isTableRow) {
      inTableBody = false;
      normalized.push(line);
      continue;
    }

    if (inTableBody && isSep) continue;

    if (isSep) {
      inTableBody = true;
      normalized.push(line);
      continue;
    }

    normalized.push(line);

    if (!inTableBody) {
      const nextLine = lines[i + 1];
      const nextIsTable =
        typeof nextLine === "string" && nextLine.trim().startsWith("|");
      if (nextIsTable && !isMarkdownTableSeparator(nextLine)) {
        const separator = buildMarkdownSeparatorFromHeader(line);
        if (separator) {
          normalized.push(separator);
          inTableBody = true;
        }
      }
    }
  }

  return normalized.join("\n");
}
