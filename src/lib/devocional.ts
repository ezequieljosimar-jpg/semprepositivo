import raw from "../content/devocional.txt?raw";

export type TaskItem = { type: "text"; text: string } | { type: "write"; label?: string | undefined; lines: number };

export type Day = {
  n: number;
  phase: number;
  title: string;
  verse: string[];
  reference: string;
  truth: string[];
  remedy: string[];
  task: TaskItem[];
  prayer: string[];
  closing: string[];
};

export type Phase = { n: number; name: string; range: string; question: string; days: [number, number] };

export const PHASE_QUESTIONS = [
  "Quem você realmente é quando para de justificar tudo?",
  "O que precisa sair da sua vida para que Deus possa trabalhar em você?",
  "Você ainda confia em Deus quando não entende o que Ele está fazendo?",
  "Você quer realmente ser curado ou apenas aprender a conviver com a ferida?",
  "Se você realmente mudou, onde isso está aparecendo nas suas escolhas?",
  "Depois de tudo que Deus mostrou a você, quem você vai escolher ser?",
];

const text = raw.replace(/\r/g, "");
const lines = text.split("\n").map((l) => l.trim());

const H_TRUTH = "A VERDADE QUE DÓI";
const H_REMEDY = "O REMÉDIO";
const H_TASK = "NÃO FECHE ESTA PÁGINA SEM RESPONDER";
const H_PRAYER = "UMA ORAÇÃO SEM DESCULPAS";

function paragraphs(ls: string[]): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const l of ls) {
    if (!l || l === "---") {
      if (cur.length) out.push(cur.join("\n"));
      cur = [];
    } else cur.push(l);
  }
  if (cur.length) out.push(cur.join("\n"));
  return out;
}

function parseTask(ls: string[]): TaskItem[] {
  const items: TaskItem[] = [];
  for (const l of ls) {
    if (!l) continue;
    const m = l.match(/^(.*?)\s*---$/);
    if (m) {
      const last = items[items.length - 1];
      if (!m[1] && last && last.type === "write") last.lines += 1;
      else items.push({ type: "write", label: m[1] || undefined, lines: 2 });
    } else items.push({ type: "text", text: l });
  }
  return items;
}

const phases: Phase[] = [];
const days: Day[] = [];
let closingPage: string[] = [];

let currentPhase = 0;
const dayStarts: { n: number; idx: number; phase: number }[] = [];
for (let i = 0; i < lines.length; i++) {
  const fm = lines[i].match(/^FASE (\d)$/);
  if (fm) {
    currentPhase = Number(fm[1]);
    let j = i + 1;
    while (!lines[j]) j++;
    const name = lines[j];
    let k = j + 1;
    while (!lines[k]) k++;
    const range = lines[k];
    const [a, b] = range.replace(/[^\d–-]/g, "").split(/[–-]/).map(Number);
    phases.push({ n: currentPhase, name, range, question: PHASE_QUESTIONS[currentPhase - 1], days: [a, b] });
  }
  const dm = lines[i].match(/^DIA (\d+)$/);
  if (dm) dayStarts.push({ n: Number(dm[1]), idx: i, phase: currentPhase });
}
const endIdx = lines.indexOf("ENCERRAMENTO");

dayStarts.forEach((s, di) => {
  let end = di + 1 < dayStarts.length ? dayStarts[di + 1].idx : endIdx;
  // trim trailing phase header block
  for (let i = s.idx + 1; i < end; i++) if (/^FASE \d$/.test(lines[i])) { end = i; break; }
  const body = lines.slice(s.idx + 1, end);
  const iT = body.indexOf(H_TRUTH);
  const iR = body.indexOf(H_REMEDY);
  const iK = body.indexOf(H_TASK);
  const iP = body.indexOf(H_PRAYER);
  const head = body.slice(0, iT).filter(Boolean);
  const title = head[0];
  const reference = head[head.length - 1];
  const verse = head.slice(1, -1);
  const prayerBlock = body.slice(iP + 1);
  const pEnd = prayerBlock.findIndex((l) => /[”"]\s*$/.test(l));
  const prayer = paragraphs(prayerBlock.slice(0, pEnd + 1));
  const closing = paragraphs(prayerBlock.slice(pEnd + 1));
  days.push({
    n: s.n,
    phase: s.phase,
    title,
    verse,
    reference,
    truth: paragraphs(body.slice(iT + 1, iR)),
    remedy: paragraphs(body.slice(iR + 1, iK)),
    task: parseTask(body.slice(iK + 1, iP)),
    prayer,
    closing,
  });
});

closingPage = paragraphs(lines.slice(endIdx + 1));

export { phases, days, closingPage };
export const getDay = (n: number) => days.find((d) => d.n === n);
export const getPhase = (n: number) => phases.find((p) => p.n === n);
