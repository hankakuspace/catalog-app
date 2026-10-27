import sanitizeHtml from "sanitize-html";

// Match Quill formatting without admitting arbitrary CSS, embedded content or DOM IDs.
const quillClasses = [
  "ql-align-center", "ql-align-right", "ql-align-justify", "ql-direction-rtl",
  "ql-size-small", "ql-size-normal", "ql-size-large", "ql-size-huge",
  ...["sans", "serif", "monospace", "noto-sans", "noto-serif", "noto-sans-jp",
    "noto-serif-jp", "yu-gothic", "hiragino-kaku-gothic"].map((font) => `ql-font-${font}`),
  ...Array.from({ length: 8 }, (_, index) => `ql-indent-${index + 1}`),
];

function safeStyle(style: string): string {
  // Only color and alignment values are supported by the editor. No URLs, variables,
  // escapes, layout positioning or arbitrary CSS are allowed, even on the client.
  return style.split(";").flatMap((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon < 0) return [];
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (name === "text-align" && /^(left|right|center|justify)$/i.test(value)) {
      return [`${name}: ${value}`];
    }
    if (["color", "background-color"].includes(name) &&
        /^(?:#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([0-9.,% +\-]+\))$/i.test(value)) {
      return [`${name}: ${value}`];
    }
    return [];
  }).join("; ");
}

/** Pure, shared policy: sanitize writes, legacy reads and unsaved editor previews. */
export function sanitizeRichText(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "span",
      "div", "a", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "sub", "sup"],
    allowedAttributes: { "*": ["class", "style"], a: ["href", "title", "target", "rel"] },
    allowedClasses: { "*": quillClasses },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    // CSS is reduced to the strict value grammar above, consistently in Node and browsers.
    parseStyleAttributes: false,
    nonTextTags: ["script", "style", "textarea", "option", "xmp", "iframe", "object",
      "embed", "svg", "math", "template", "noscript"],
    transformTags: {
      "*": (tagName, attributes) => {
        const attribs = { ...attributes };
        if (attribs.style) attribs.style = safeStyle(attribs.style);
        if (tagName === "a") {
          if (!["_blank", "_self"].includes(attribs.target)) delete attribs.target;
          if (attribs.target === "_blank") attribs.rel = "noopener noreferrer";
          else delete attribs.rel;
        }
        return { tagName, attribs };
      },
    },
  });
}
