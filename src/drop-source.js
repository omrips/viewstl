// Read payloads synchronously during drop; browsers hide them during dragover.
export function dropKind(transfer) {
  const types = Array.from(transfer?.types || [], (type) => type.toLowerCase());
  if (types.includes("files") || transfer?.files?.length) return "files";
  if (types.includes("text/uri-list") || types.includes("text/x-moz-url"))
    return "url";
  if (types.includes("text/plain")) return "text";
  return null;
}

export function droppedURLs(transfer) {
  if (dropKind(transfer) === "files") return [];
  const uriList = transfer?.getData("text/uri-list")?.trim();
  const mozURL = !uriList && transfer?.getData("text/x-moz-url")?.trim();
  const plain = !uriList && !mozURL && transfer?.getData("text/plain")?.trim();
  let lines;
  if (uriList)
    lines = uriList
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"));
  else if (mozURL)
    lines = [mozURL.split(/\r?\n/)[0]]; // Firefox: URL followed by its title.
  else if (plain) {
    lines = plain
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    // An arbitrary text selection is not a request to scan its contents for links.
    if (!lines.every((s) => /^https?:\/\/\S+$/i.test(s))) return [];
  } else return [];
  const urls = new Set();
  for (const line of lines) {
    let url;
    try {
      url = new URL(line);
    } catch {}
    if (
      !url ||
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "Drop a public HTTP or HTTPS file URL without login credentials.",
      );
    url.hash = "";
    urls.add(url.href);
  }
  return [...urls];
}
