export type StudyPromptInput = {
  grade: string;
  board: string;
  subject: string;
  syllabus: string;
};

export function buildClaudePrompt({
  grade,
  board,
  subject,
  syllabus,
}: StudyPromptInput): string {
  const gradeLabel = grade.trim() || "10";
  const boardLabel = board.trim() || "CBSE";
  const subjectLabel = subject.trim() || "exam";
  const syllabusLabel = syllabus.trim() || "(add your topics above)";

  return `I am in class ${gradeLabel} ${boardLabel}. I want to prepare for my ${subjectLabel} exam. I want you to generate MCQs, short answer type and long answer type questions with answers. Generate a lot of questions from each of these three types. Below is the syllabus. Make sure the difficulty is not too easy but not too hard.

${syllabusLabel}

After generating all the questions and answers, put everything into a single self-contained HTML file that I can use as a website. The HTML must work completely offline — no internet, no CDN links, no external scripts or stylesheets.

The website must include:

1. Sticky header with a live score tracker (MCQs attempted, correct count)
2. Progress bar that fills as I attempt questions
3. MCQs — click an option to instantly see if you're right or wrong (green = correct, red = wrong), with score tracked
4. Short Answer questions (3–4 marks) — attempt mentally first, then click "Show answer" to reveal the model answer
5. Long Answer questions (5–6 marks) — toggle to show/hide model answers; answers should be well-structured with clear points
6. Topic/chapter filters so I can focus on one topic at a time
7. Mobile-friendly responsive layout
8. Clean, modern styling — professional look, good typography, readable on phone and desktop
9. Include brief exam tips at the top for the topics covered

Generate plenty of questions for each topic in the syllabus. Cover all topics listed above.

Please provide the complete HTML file as a downloadable artifact I can save and open in any browser.`;
}
