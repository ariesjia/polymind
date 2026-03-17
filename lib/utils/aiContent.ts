export interface ContentSegment {
  type: "text" | "think";
  content: string;
}

/** Remove tool call blocks (minimax:tool_call, FunctionCallBegin/End) from text so they are never shown to users */
export function stripToolCallBlocks(text: string): string {
  let out = text
    .replace(/<FunctionCallBegin>[\s\S]*?<FunctionCallEnd>\s*/g, "")
    .replace(/minimax:tool_call\s*<invoke[\s\S]*?<\/minimax:tool_call>\s*/gi, "");
  // Remove incomplete blocks (e.g. during streaming before closing tag arrives)
  out = out.replace(/minimax:tool_call\s*<invoke[\s\S]*$/gi, "");
  out = out.replace(/<FunctionCallBegin>[\s\S]*$/g, "");
  return out.trim();
}

export function parseThinkBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = stripToolCallBlocks(raw);

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
