// Proper JS brace tracker that handles nested template literals
const fs = require("fs");
const src = fs.readFileSync("js/app.js", "utf8");

function parse(src) {
  let i = 0;
  let line = 1;
  let depth = 0;
  const opens = [];

  function skipLineComment() {
    while (i < src.length && src[i] !== "\n") i++;
  }

  function skipBlockComment() {
    i += 2;
    while (i < src.length) {
      if (src[i] === "\n") line++;
      if (src[i - 1] === "*" && src[i] === "/") {
        i++;
        return;
      }
      i++;
    }
  }

  function skipString(q) {
    i++; // skip opening quote
    while (i < src.length && src[i] !== q) {
      if (src[i] === "\\") i++;
      if (src[i] === "\n") line++;
      i++;
    }
    i++; // skip closing quote
  }

  function skipTemplateLiteral() {
    i++; // skip opening backtick
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") {
        line++;
        i++;
        continue;
      }
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        i++;
        return;
      } // closing backtick
      if (c === "$" && src[i + 1] === "{") {
        i += 2; // skip ${
        depth++; // entering expression
        const exprOpenLine = line;
        opens.push({ depth, line });
        // Parse the expression body until matching }
        parseUntilClose();
        continue;
      }
      i++;
    }
  }

  function parseUntilClose() {
    // Parse JS until we hit a } that closes the current depth
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") {
        line++;
        i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "/") {
        skipLineComment();
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        skipBlockComment();
        continue;
      }
      if (c === '"') {
        skipString('"');
        continue;
      }
      if (c === "'") {
        skipString("'");
        continue;
      }
      if (c === "`") {
        skipTemplateLiteral();
        continue;
      }
      if (c === "{") {
        depth++;
        opens.push({ depth, line });
        i++;
        continue;
      }
      if (c === "}") {
        opens.pop();
        depth--;
        i++;
        if (depth < 0) {
          // This should not happen at top level
          console.log("Unexpected } at line " + line);
          depth = 0;
        }
        return; // closed this level
      }
      i++;
    }
  }

  // Main parse loop
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      skipLineComment();
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      skipBlockComment();
      continue;
    }
    if (c === '"') {
      skipString('"');
      continue;
    }
    if (c === "'") {
      skipString("'");
      continue;
    }
    if (c === "`") {
      skipTemplateLiteral();
      continue;
    }
    if (c === "{") {
      depth++;
      opens.push({ depth, line });
      i++;
      continue;
    }
    if (c === "}") {
      opens.pop();
      depth--;
      i++;
      continue;
    }
    i++;
  }

  return { depth, opens, line };
}

const result = parse(src);
console.log("Final brace depth: " + result.depth);
if (result.depth !== 0) {
  console.log("Unclosed braces (all):");
  result.opens.forEach((o) =>
    console.log("  depth " + o.depth + " opened at line " + o.line),
  );
} else {
  console.log("All braces balanced!");
}
