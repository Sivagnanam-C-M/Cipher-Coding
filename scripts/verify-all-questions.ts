import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PLACEHOLDER_QUESTIONS } from '../src/lib/placeholderQuestions';
import { validateAnswer } from '../src/lib/scoring';

interface LanguageResult {
  output: string;
  error?: string;
  matchesKey: boolean;
}

interface QuestionReport {
  questionNumber: number;
  title: string;
  questionText: string;
  answerType: string;
  correctAnswerKey: string;
  results: {
    python: LanguageResult;
    java: LanguageResult;
    c: LanguageResult;
    cpp: LanguageResult;
  };
  discrepancies: string[];
}

const tempDir = path.join(process.cwd(), 'tmp_question_audit');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

function runPython(code: string): { output: string; error?: string } {
  const pyFile = path.join(tempDir, 'script.py');
  fs.writeFileSync(pyFile, code, 'utf-8');
  try {
    const out = execSync(`python "${pyFile}"`, { encoding: 'utf-8', timeout: 5000 });
    return { output: out.trim() };
  } catch (err: any) {
    return { output: '', error: err.stderr || err.message };
  }
}

function runJava(code: string): { output: string; error?: string } {
  // Extract public class name if exists, else Main
  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const className = match ? match[1] : 'Main';
  const javaFile = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(javaFile, code, 'utf-8');
  try {
    execSync(`javac "${javaFile}"`, { encoding: 'utf-8', timeout: 10000 });
    const out = execSync(`java -cp "${tempDir}" ${className}`, { encoding: 'utf-8', timeout: 5000 });
    return { output: out.trim() };
  } catch (err: any) {
    return { output: '', error: err.stderr || err.message };
  }
}

function runC(code: string): { output: string; error?: string } {
  const cFile = path.join(tempDir, 'program.c');
  const exeFile = path.join(tempDir, 'program_c.exe');
  fs.writeFileSync(cFile, code, 'utf-8');
  try {
    execSync(`gcc "${cFile}" -o "${exeFile}"`, { encoding: 'utf-8', timeout: 10000 });
    const out = execSync(`"${exeFile}"`, { encoding: 'utf-8', timeout: 5000 });
    return { output: out.trim() };
  } catch (err: any) {
    return { output: '', error: err.stderr || err.message };
  }
}

function runCpp(code: string): { output: string; error?: string } {
  const cppFile = path.join(tempDir, 'program.cpp');
  const exeFile = path.join(tempDir, 'program_cpp.exe');
  fs.writeFileSync(cppFile, code, 'utf-8');
  try {
    execSync(`g++ -std=c++17 "${cppFile}" -o "${exeFile}"`, { encoding: 'utf-8', timeout: 10000 });
    const out = execSync(`"${exeFile}"`, { encoding: 'utf-8', timeout: 5000 });
    return { output: out.trim() };
  } catch (err: any) {
    return { output: '', error: err.stderr || err.message };
  }
}

async function verifyAll() {
  console.log(`Auditing ${PLACEHOLDER_QUESTIONS.length} Questions across Python, Java, C, C++...\n`);

  const reports: QuestionReport[] = [];

  for (const q of PLACEHOLDER_QUESTIONS) {
    console.log(`Checking Question ${q.questionNumber}: ${q.title}...`);
    const discrepancies: string[] = [];

    const pyCode = q.codeBlocks?.python || q.codeBlock;
    const javaCode = q.codeBlocks?.java || '';
    const cCode = q.codeBlocks?.c || '';
    const cppCode = q.codeBlocks?.cpp || '';

    const pyRes = runPython(pyCode);
    const javaRes = javaCode ? runJava(javaCode) : { output: '', error: 'No Java code' };
    const cRes = cCode ? runC(cCode) : { output: '', error: 'No C code' };
    const cppRes = cppCode ? runCpp(cppCode) : { output: '', error: 'No C++ code' };

    const pyValid = validateAnswer(pyRes.output, q.correctAnswer, q.answerType).isCorrect;
    const javaValid = javaCode ? validateAnswer(javaRes.output, q.correctAnswer, q.answerType).isCorrect : false;
    const cValid = cCode ? validateAnswer(cRes.output, q.correctAnswer, q.answerType).isCorrect : false;
    const cppValid = cppCode ? validateAnswer(cppRes.output, q.correctAnswer, q.answerType).isCorrect : false;

    // Check errors
    if (pyRes.error) discrepancies.push(`Python execution error: ${pyRes.error.trim()}`);
    if (javaRes.error) discrepancies.push(`Java execution error: ${javaRes.error.trim()}`);
    if (cRes.error) discrepancies.push(`C execution error: ${cRes.error.trim()}`);
    if (cppRes.error) discrepancies.push(`C++ execution error: ${cppRes.error.trim()}`);

    // Check consistency between languages
    const outputs = [
      { lang: 'Python', out: pyRes.output, err: pyRes.error },
      { lang: 'Java', out: javaRes.output, err: javaRes.error },
      { lang: 'C', out: cRes.output, err: cRes.error },
      { lang: 'C++', out: cppRes.output, err: cppRes.error },
    ].filter((x) => !x.err);

    if (outputs.length > 1) {
      const baseOut = outputs[0].out;
      for (let i = 1; i < outputs.length; i++) {
        if (outputs[i].out !== baseOut) {
          discrepancies.push(
            `Output mismatch between ${outputs[0].lang} ("${baseOut}") and ${outputs[i].lang} ("${outputs[i].out}")`
          );
        }
      }
    }

    // Check match against answer key
    if (!pyValid && !pyRes.error) {
      discrepancies.push(
        `Python output "${pyRes.output}" DOES NOT match answer key "${q.correctAnswer}" (type: ${q.answerType})`
      );
    }
    if (javaCode && !javaValid && !javaRes.error) {
      discrepancies.push(
        `Java output "${javaRes.output}" DOES NOT match answer key "${q.correctAnswer}" (type: ${q.answerType})`
      );
    }
    if (cCode && !cValid && !cRes.error) {
      discrepancies.push(
        `C output "${cRes.output}" DOES NOT match answer key "${q.correctAnswer}" (type: ${q.answerType})`
      );
    }
    if (cppCode && !cppValid && !cppRes.error) {
      discrepancies.push(
        `C++ output "${cppRes.output}" DOES NOT match answer key "${q.correctAnswer}" (type: ${q.answerType})`
      );
    }

    reports.push({
      questionNumber: q.questionNumber,
      title: q.title,
      questionText: q.questionText,
      answerType: q.answerType,
      correctAnswerKey: q.correctAnswer,
      results: {
        python: { ...pyRes, matchesKey: pyValid },
        java: { ...javaRes, matchesKey: javaValid },
        c: { ...cRes, matchesKey: cValid },
        cpp: { ...cppRes, matchesKey: cppValid },
      },
      discrepancies,
    });
  }

  // Cleanup temp dir
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  console.log('\n========================================');
  console.log('AUDIT SUMMARY:');
  console.log('========================================');
  for (const r of reports) {
    console.log(`\nQ${r.questionNumber}: ${r.title}`);
    console.log(`  Question Text: "${r.questionText}"`);
    console.log(`  Answer Key: "${r.correctAnswerKey}" (Type: ${r.answerType})`);
    console.log(`  Python Output : "${r.results.python.output}" [Matches Key: ${r.results.python.matchesKey}]`);
    console.log(`  Java Output   : "${r.results.java.output}" [Matches Key: ${r.results.java.matchesKey}]`);
    console.log(`  C Output      : "${r.results.c.output}" [Matches Key: ${r.results.c.matchesKey}]`);
    console.log(`  C++ Output    : "${r.results.cpp.output}" [Matches Key: ${r.results.cpp.matchesKey}]`);
    if (r.discrepancies.length > 0) {
      console.log(`  ⚠️ DISCREPANCIES / ISSUES:`);
      for (const d of r.discrepancies) {
        console.log(`    - ${d}`);
      }
    } else {
      console.log(`  ✅ ALL 4 LANGUAGES COMPILE, RUN, AND MATCH THE ANSWER KEY!`);
    }
  }

  // Save report as JSON
  const reportPath = path.join(process.cwd(), 'question_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2), 'utf-8');
  console.log(`\nDetailed JSON report written to: ${reportPath}`);
}

verifyAll().catch(console.error);
