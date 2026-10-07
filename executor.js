const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const TIMEOUT_MS = 10000;
const TEMP_DIR = path.join(__dirname, "temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const LANG_CONFIG = {
  python: {
    image: "python:3.10-slim",
    filename: "solution.py",
    cmd: (f) => `python ${f}`,
  },
  javascript: {
    image: "node:18-slim",
    filename: "solution.js",
    cmd: (f) => `node ${f}`,
  },
  cpp: {
    image: "gcc:latest",
    filename: "solution.cpp",
    cmd: (f) => `g++ -o /tmp/out ${f} && /tmp/out`,
  },
  c: {
    image: "gcc:latest",
    filename: "solution.c",
    cmd: (f) => `gcc -o /tmp/out ${f} && /tmp/out`,
  },
  java: {
    image: "eclipse-temurin:17-jdk-alpine",
    filename: "Main.java",
    cmd: (f) => `javac ${f} && java -cp $(dirname ${f}) Main`,
  },
};

/**
 * Directly execute code in Docker — no queue, no delay.
 */
async function executeCode(language, code, stdin = "") {
  const lang = LANG_CONFIG[language];
  if (!lang) throw new Error(`Unsupported language: ${language}`);

  const jobId = uuidv4();
  const jobDir = path.join(TEMP_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const codeFile = path.join(jobDir, lang.filename);
  const stdinFile = path.join(jobDir, "stdin.txt");
  fs.writeFileSync(codeFile, code);
  fs.writeFileSync(stdinFile, stdin);

  const containerName = `codz_${jobId.replace(/-/g, "").slice(0, 12)}`;
  const dockerCmd = [
    `docker run --rm`,
    `--name ${containerName}`,
    `--memory=128m --cpus=0.5`,
    `--network none`,
    `--ulimit nofile=64:64`,
    `-v "${jobDir}:/code"`,
    `-w /code`,
    lang.image,
    `sh -c "${lang.cmd("/code/" + lang.filename)} < /code/stdin.txt"`,
  ].join(" ");

  return new Promise((resolve) => {
    const startTime = Date.now();

    const proc = exec(
      dockerCmd,
      { timeout: TIMEOUT_MS },
      (error, stdout, stderr) => {
        const execTime = Date.now() - startTime;

        // Cleanup temp dir
        try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}

        if (error) {
          if (error.killed || error.signal === "SIGTERM") {
            return resolve({ success: false, output: "", error: "Time Limit Exceeded (10s)", execTime });
          }
          return resolve({ success: false, output: stdout || "", error: stderr || error.message, execTime });
        }

        resolve({ success: true, output: stdout, error: stderr || "", execTime });
      }
    );

    // Extra safety timeout
    setTimeout(() => {
      try { exec(`docker kill ${containerName}`); } catch {}
    }, TIMEOUT_MS + 1000);
  });
}

module.exports = { executeCode };
