import { test } from "node:test";
import assert from "node:assert/strict";
import { dropKind, droppedURLs } from "../../src/drop-source.js";
const transfer = (data, files = []) => ({
  types: Object.keys(data),
  files,
  getData: (type) => data[type] || "",
});

test("browser link drops prefer URI lists and deduplicate without damaging signed query strings", () => {
  const t = transfer({
    "text/uri-list":
      "# copied links\r\nhttps://files.example/a.stl?sig=a%2Bb#one\r\nhttps://files.example/a.stl?sig=a%2Bb#two\nhttps://files.example/b.step",
    "text/plain": "unrelated link title",
    "text/html": "<a href='https://other.example/'>title</a>",
  });
  assert.equal(dropKind(t), "url");
  assert.deepEqual(droppedURLs(t), [
    "https://files.example/a.stl?sig=a%2Bb",
    "https://files.example/b.step",
  ]);
});
test("plain URL text and Firefox URL/title payloads are accepted without extension guessing", () => {
  assert.deepEqual(
    droppedURLs(
      transfer({ "text/plain": " https://files.example/download?id=123 \n" }),
    ),
    ["https://files.example/download?id=123"],
  );
  assert.deepEqual(
    droppedURLs(
      transfer({
        "text/x-moz-url": "https://files.example/part.iges\nA model title",
      }),
    ),
    ["https://files.example/part.iges"],
  );
});
test("local files take precedence over alternate URL metadata", () => {
  const t = transfer(
    { Files: "", "text/uri-list": "https://files.example/file.stl" },
    [{}],
  );
  assert.equal(dropKind(t), "files");
  assert.deepEqual(droppedURLs(t), []);
  assert.equal(dropKind(transfer({}, [{}])), "files");
});
test("arbitrary text and HTML-only drops are not scanned or executed", () => {
  for (const value of [
    "hello",
    "See https://files.example/a.stl",
    "https://files.example/a.stl\nextra title",
    "javascript:alert(1)",
  ])
    assert.deepEqual(droppedURLs(transfer({ "text/plain": value })), []);
  const html = transfer({
    "text/html":
      "<a href='https://files.example/a.stl'>file</a><img src=x onerror=alert(1)>",
  });
  assert.equal(dropKind(html), null);
  assert.deepEqual(droppedURLs(html), []);
});
test("explicit URL payloads reject unsupported schemes, credentials and malformed URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "file:///C:/part.stl",
    "data:model/stl,abc",
    "ftp://example.com/part.stl",
    "https://user:pass@example.com/part.stl",
    "not a URL",
  ])
    assert.throws(
      () => droppedURLs(transfer({ "text/uri-list": value })),
      /HTTP or HTTPS/,
    );
});
test("protected drag data can be classified without reading any payload", () => {
  const t = {
    types: ["text/uri-list"],
    files: [],
    getData() {
      throw Error("protected");
    },
  };
  assert.equal(dropKind(t), "url");
  assert.equal(dropKind(null), null);
});
