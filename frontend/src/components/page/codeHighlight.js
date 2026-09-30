// 코드 블록 문법 강조 — 외부 라이브러리 없이 정규식 기반의 작은 토크나이저예요.
// 노션처럼 언어를 고르면(또는 "자동 감지") 키워드·문자열·주석·숫자·함수 이름 등을
// 서로 다른 색으로 칠해요. 토큰 종류는 CSS 클래스(tok-kw 등, page-detail.css)로만 표현해서
// 색은 스타일시트 한 곳에서 바꿀 수 있어요.

export const CODE_LANGUAGES = [
  { id: "auto", label: "자동 감지" },
  { id: "plain", label: "Plain Text" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "kotlin", label: "Kotlin" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "sql", label: "SQL" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash" },
];

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

const JS_KW = words(
  "break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return super switch this throw try typeof var void while with yield async await static get set from as",
);
const TS_KW = new Set([
  ...JS_KW,
  ...words("interface type enum implements namespace declare abstract readonly private protected public keyof infer is satisfies"),
]);
const JS_LIT = words("true false null undefined NaN Infinity");

const PY_KW = words(
  "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
);
const PY_LIT = words("True False None self cls");
const PY_BUILTIN = words("print len range int str float list dict set tuple bool type isinstance open input sum min max abs sorted enumerate zip map filter any all");

const JAVA_KW = words(
  "abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record sealed permits",
);
const JAVA_TYPES = words("int long short byte float double boolean char void String Integer Long Double Boolean Object List Map Set");
const JAVA_LIT = words("true false null");

const KOTLIN_KW = words(
  "as break class continue do else for fun if in interface is object package return super this throw try typealias typeof val var when while by catch constructor delegate dynamic field file finally get import init param property receiver set setparam value where abstract actual annotation companion const crossinline data enum expect external final infix inline inner internal lateinit noinline open operator out override private protected public reified sealed suspend tailrec vararg",
);

const C_KW = words(
  "auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while",
);
const C_TYPES = words("int long short char float double void unsigned signed size_t bool");
const CPP_KW = new Set([
  ...C_KW,
  ...words(
    "alignas alignof and asm bitand bitor catch class compl concept constexpr const_cast decltype delete dynamic_cast explicit export friend mutable namespace new noexcept not operator or private protected public reinterpret_cast requires static_assert static_cast template this throw try typeid typename using virtual xor override final",
  ),
]);
const C_LIT = words("true false NULL nullptr");

const CS_KW = words(
  "abstract as base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual volatile while var async await record init",
);
const CS_TYPES = words("int long short byte float double decimal bool char string object void");

const GO_KW = words(
  "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
);
const GO_TYPES = words("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any");
const GO_LIT = words("true false nil iota");

const RUST_KW = words(
  "as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while",
);
const RUST_TYPES = words("i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box");
const RUST_LIT = words("true false None Some Ok Err");

const SQL_KW = words(
  "SELECT FROM WHERE AND OR NOT NULL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX VIEW JOIN LEFT RIGHT INNER OUTER FULL CROSS ON AS GROUP BY ORDER HAVING LIMIT OFFSET DISTINCT UNION ALL EXISTS IN BETWEEN LIKE IS PRIMARY KEY FOREIGN REFERENCES DEFAULT CONSTRAINT UNIQUE CHECK CASE WHEN THEN ELSE END ASC DESC WITH DATABASE SCHEMA TRUNCATE BEGIN COMMIT ROLLBACK",
);
const SQL_TYPES = words("INT INTEGER BIGINT SMALLINT VARCHAR CHAR TEXT DATE DATETIME TIMESTAMP BOOLEAN FLOAT DOUBLE DECIMAL NUMERIC");
const SQL_LIT = words("TRUE FALSE");

const BASH_KW = words(
  "if then else elif fi for while until do done case esac in function select time return exit break continue export local readonly unset source alias",
);
const BASH_FN = words("echo cd ls cat grep sed awk git npm node python pip sudo mkdir rm cp mv chmod curl wget docker kubectl");

const CSS_KW = words("important");

const IDENT = "[A-Za-z_$][\\w$]*";
const NUM = "\\b0[xX][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFlLuU]*\\b";
const C_COMMENT = "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)";
const DQ = '"(?:\\\\.|[^"\\\\\\n])*"?';
const SQ = "'(?:\\\\.|[^'\\\\\\n])*'?";
const BT = "`(?:\\\\[\\s\\S]|[^`\\\\])*`?";

// 식별자를 키워드/리터럴/타입/함수 호출로 분류해요(아니면 null → 일반 글자).
const identClassifier =
  ({ kw, lit, types, fn, ci = false }) =>
  (word, code, end) => {
    const w = ci ? word.toUpperCase() : word;
    if (kw?.has(w)) return "kw";
    if (lit?.has(w)) return "lit";
    if (types?.has(w)) return "type";
    if (fn?.has(w)) return "fn";
    let i = end;
    while (code[i] === " " || code[i] === "\t") i += 1;
    if (code[i] === "(") return "fn";
    if (/^[A-Z][A-Za-z0-9_]*$/.test(word) && word.length > 1 && !/^[A-Z0-9_]+$/.test(word)) return "type";
    return null;
  };

const LANGS = {
  javascript: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}|${BT}`],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: JS_KW, lit: JS_LIT }),
  },
  typescript: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}|${BT}`],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: TS_KW, lit: JS_LIT, types: words("string number boolean any unknown never void object symbol bigint") }),
  },
  python: {
    rules: [
      ["com", "#[^\\n]*"],
      ["str", `[rRbBfFuU]{0,2}(?:"""[\\s\\S]*?(?:"""|$)|'''[\\s\\S]*?(?:'''|$)|${DQ}|${SQ})`],
      ["attr", "@[A-Za-z_][\\w.]*"],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: PY_KW, lit: PY_LIT, fn: PY_BUILTIN }),
  },
  java: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}`],
      ["attr", "@[A-Za-z_][\\w.]*"],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: JAVA_KW, lit: JAVA_LIT, types: JAVA_TYPES }),
  },
  kotlin: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}`],
      ["attr", "@[A-Za-z_][\\w.]*"],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: KOTLIN_KW, lit: words("true false null"), types: words("Int Long Short Byte Float Double Boolean Char String Unit Any") }),
  },
  c: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}`],
      ["kw", "^[ \\t]*#[ \\t]*[a-z]+"],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: C_KW, lit: C_LIT, types: C_TYPES }),
    multiline: true,
  },
  cpp: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}`],
      ["kw", "^[ \\t]*#[ \\t]*[a-z]+"],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: CPP_KW, lit: C_LIT, types: C_TYPES }),
    multiline: true,
  },
  csharp: {
    rules: [
      ["com", C_COMMENT],
      ["str", `@?${DQ}|${SQ}`],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: CS_KW, lit: words("true false null"), types: CS_TYPES }),
  },
  go: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|${SQ}|${BT}`],
      ["num", NUM],
      ["id", IDENT],
    ],
    classify: identClassifier({ kw: GO_KW, lit: GO_LIT, types: GO_TYPES }),
  },
  rust: {
    rules: [
      ["com", C_COMMENT],
      ["str", `${DQ}|'(?:\\\\.|[^'\\\\\\n])'`],
      ["attr", "#!?\\[[^\\]]*\\]"],
      ["num", NUM],
      ["id", `${IDENT}!?`],
    ],
    classify: identClassifier({ kw: RUST_KW, lit: RUST_LIT, types: RUST_TYPES }),
  },
  sql: {
    rules: [
      ["com", "--[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)"],
      ["str", "'(?:''|[^'])*'?"],
      ["num", "\\b\\d+(?:\\.\\d+)?\\b"],
      ["id", "[A-Za-z_][\\w]*"],
    ],
    classify: identClassifier({ kw: SQL_KW, lit: SQL_LIT, types: SQL_TYPES, ci: true }),
  },
  bash: {
    rules: [
      ["com", "(?:^|(?<=\\s))#[^\\n]*"],
      ["str", `${DQ}|${SQ}`],
      ["attr", "\\$(?:\\{[^}]*\\}|[A-Za-z_]\\w*|[0-9@#?$!*])"],
      ["num", "\\b\\d+\\b"],
      ["id", "[A-Za-z_][\\w-]*"],
    ],
    classify: identClassifier({ kw: BASH_KW, fn: BASH_FN }),
    multiline: true,
  },
  json: {
    rules: [
      ["prop", `"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)`],
      ["str", DQ],
      ["num", "-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b"],
      ["id", "[A-Za-z_]\\w*"],
    ],
    classify: identClassifier({ lit: words("true false null") }),
  },
  css: {
    rules: [
      ["com", "\\/\\*[\\s\\S]*?(?:\\*\\/|$)"],
      ["str", `${DQ}|${SQ}`],
      ["kw", "@[A-Za-z-]+"],
      ["num", "#[\\da-fA-F]{3,8}\\b|-?(?:\\d*\\.)?\\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch)?\\b"],
      ["prop", "[A-Za-z-]+(?=\\s*:(?!:))(?=[^{}]*[;}])"],
      ["type", "[.#][A-Za-z_][\\w-]*"],
      ["id", "[A-Za-z_-][\\w-]*"],
    ],
    classify: identClassifier({ kw: CSS_KW }),
  },
  html: {
    rules: [
      ["com", "<!--[\\s\\S]*?(?:-->|$)"],
      ["tag", "<\\/?[A-Za-z][\\w:-]*|\\/?>"],
      ["str", `${DQ}|${SQ}`],
      ["attr", "[A-Za-z_:@][\\w:.@-]*(?=\\s*=)"],
    ],
    classify: () => null,
  },
};

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const compiled = new Map();
function getCompiled(lang) {
  if (compiled.has(lang)) return compiled.get(lang);
  const def = LANGS[lang];
  if (!def) return null;
  const source = def.rules.map(([, src]) => `(${src})`).join("|");
  const entry = { def, re: new RegExp(source, def.multiline ? "gm" : "g") };
  compiled.set(lang, entry);
  return entry;
}

// 코드가 어떤 언어처럼 보이는지 대충 추정해요(사용자가 언어를 안 골랐을 때만 써요).
export function detectLanguage(code) {
  const text = code.trim();
  if (!text) return "plain";
  if (/^[[{][\s\S]*[\]}]$/.test(text)) {
    try {
      JSON.parse(text);
      return "json";
    } catch {
      /* JSON이 아니면 아래 규칙으로 */
    }
  }
  if (/^<!DOCTYPE|^<html|^<\/?[a-z][\w-]*(\s[^>]*)?>/i.test(text)) return "html";
  if (/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE)\b/i.test(text)) return "sql";
  if (/^\s*(def\s+\w+\(|class\s+\w+(\(.*\))?:|from\s+\w+\s+import|import\s+\w+\s*$|print\()/m.test(text) || /:\s*$/m.test(text) && /^\s{4}\S/m.test(text)) return "python";
  if (/\bpublic\s+(static\s+)?(class|void|int|String)|System\.out\.|@Override/.test(text)) return "java";
  if (/\b(using\s+System|Console\.Write|namespace\s+\w+\s*\{)/.test(text)) return "csharp";
  if (/#include\s*[<"]/.test(text)) return /std::|cout|template\s*</.test(text) ? "cpp" : "c";
  if (/\bpackage\s+main\b|\bfunc\s+\w+\(|:=/.test(text)) return "go";
  if (/\bfn\s+\w+\(|\blet\s+mut\b|println!/.test(text)) return "rust";
  if (/\bfun\s+\w+\(|\bval\s+\w+\s*[:=]/.test(text)) return "kotlin";
  if (/^#!\/bin\/(ba)?sh|^\s*(sudo|npm|git|cd|echo|export)\s/m.test(text) || /^\$\s/m.test(text)) return "bash";
  if (/[.#]?[\w-]+\s*\{[^}]*:[^}]*;[^}]*\}/.test(text) && !/=>|function|const |let /.test(text)) return "css";
  if (/\binterface\s+\w+\s*\{|:\s*(string|number|boolean)\b/.test(text)) return "typescript";
  return "javascript";
}

// code를 언어 규칙대로 색칠한 HTML 문자열로 돌려줘요(모든 글자는 이스케이프돼요).
export function highlightCode(code, language = "auto") {
  const lang = language === "auto" ? detectLanguage(code) : language;
  const entry = lang === "plain" ? null : getCompiled(lang);
  if (!entry) return escapeHtml(code);

  const { def, re } = entry;
  re.lastIndex = 0;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[0] === "") {
      re.lastIndex += 1;
      continue;
    }
    const groupIndex = m.findIndex((g, i) => i > 0 && g !== undefined);
    const [ruleCls] = def.rules[groupIndex - 1];
    let cls = ruleCls;
    if (ruleCls === "id") cls = def.classify(m[0], code, m.index + m[0].length);
    out += escapeHtml(code.slice(last, m.index));
    out += cls ? `<span class="tok-${cls}">${escapeHtml(m[0])}</span>` : escapeHtml(m[0]);
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}
