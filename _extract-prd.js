const fs = require("fs");
const xml = fs.readFileSync(
  process.env.TEMP + "/prd-extract/unzipped/word/document.xml",
  "utf8"
);
const paras = [];
const parts = xml.split(/<w:p[ >]/);
for (const part of parts) {
  const texts = [];
  const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(part))) {
    texts.push(
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    );
  }
  const line = texts.join("").trim();
  if (line) paras.push(line);
}
const out = paras.join("\n");
fs.writeFileSync("c:/Users/gmokk/Desktop/SYNAPTRA/prd-extracted.txt", out);
console.log("paras", paras.length, "chars", out.length);
