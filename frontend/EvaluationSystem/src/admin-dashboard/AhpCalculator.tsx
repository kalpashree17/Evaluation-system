import { useMemo, useState } from 'react';

type Group = 'Acoustic' | 'Communication';

type Criterion = {
  id: string;
  label: string;
  group: Group;
  suggested: number;
};

const criteria: Criterion[] = [
  { id: 'filler_behaviour', label: 'Filler behaviour', group: 'Communication', suggested: 20 },
  { id: 'speech_rate', label: 'Speech rate', group: 'Acoustic', suggested: 20 },
  { id: 'pause_score', label: 'Pause score', group: 'Acoustic', suggested: 17 },
  { id: 'pitch_variation', label: 'Pitch variation', group: 'Acoustic', suggested: 12 },
  { id: 'energy_stability', label: 'Energy stability', group: 'Acoustic', suggested: 10 },
  { id: 'lexical_certainty', label: 'Lexical certainty', group: 'Communication', suggested: 8 },
  { id: 'silence_ratio', label: 'Silence ratio', group: 'Acoustic', suggested: 6 },
  { id: 'fluency', label: 'Fluency', group: 'Communication', suggested: 4 },
  { id: 'response_organization', label: 'Response organization', group: 'Communication', suggested: 3 },
];

const saatyScale = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const pairKey = (first: number, second: number) => `${first}-${second}`;

const nearestSaatyValue = (value: number) => saatyScale.reduce((nearest, candidate) =>
  Math.abs(Math.log(candidate / value)) < Math.abs(Math.log(nearest / value)) ? candidate : nearest,
);

const presetComparisons = () => {
  const values: Record<string, number> = {};
  for (let first = 0; first < criteria.length; first += 1) {
    for (let second = first + 1; second < criteria.length; second += 1) {
      values[pairKey(first, second)] = nearestSaatyValue(criteria[first].suggested / criteria[second].suggested);
    }
  }
  return values;
};

const scaleLabel = (value: number) => {
  if (value === 1) return 'Equal importance (1)';
  if (value > 1) return `A is ${value}x more important than B`;
  return `B is ${Math.round(1 / value)}x more important than A`;
};

const AhpCalculator = () => {
  const [comparisons, setComparisons] = useState<Record<string, number>>(presetComparisons);

  const result = useMemo(() => {
    const count = criteria.length;
    const matrix = Array.from({ length: count }, () => Array(count).fill(1));

    for (let first = 0; first < count; first += 1) {
      for (let second = first + 1; second < count; second += 1) {
        const value = comparisons[pairKey(first, second)] ?? 1;
        matrix[first][second] = value;
        matrix[second][first] = 1 / value;
      }
    }

    let weights = Array(count).fill(1 / count);
    for (let iteration = 0; iteration < 1000; iteration += 1) {
      const next = matrix.map((row) => row.reduce((sum, value, index) => sum + value * weights[index], 0));
      const total = next.reduce((sum, value) => sum + value, 0);
      weights = next.map((value) => value / total);
    }

    const multiplied = matrix.map((row) => row.reduce((sum, value, index) => sum + value * weights[index], 0));
    const lambdaMax = multiplied.reduce((sum, value, index) => sum + value / weights[index], 0) / count;
    const consistencyIndex = (lambdaMax - count) / (count - 1);
    const consistencyRatio = consistencyIndex / 1.45; // Saaty random index for n = 9
    const acoustic = weights.reduce((sum, weight, index) => sum + (criteria[index].group === 'Acoustic' ? weight : 0), 0);

    return { weights, acoustic, communication: 1 - acoustic, consistencyRatio };
  }, [comparisons]);

  const updateComparison = (key: string, value: number) => {
    setComparisons((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-white">AHP Confidence Weight Calculator</h1>
        <p className="text-slate-400 mt-1">Use Saaty's 1-9 pairwise comparisons to calculate defensible confidence-analysis weights.</p>
      </div>

      <div className="rounded-xl border border-[#26314b] bg-[#111827] p-4 flex flex-wrap items-center gap-4">
        <button onClick={() => setComparisons(presetComparisons())} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
          Load suggested preset
        </button>
        <span className={result.consistencyRatio < 0.1 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
          Consistency Ratio: {result.consistencyRatio.toFixed(4)} {result.consistencyRatio < 0.1 ? '(acceptable)' : '(review comparisons)'}
        </span>
        <span className="text-slate-400 text-sm">A CR below 0.10 means the comparisons are logically consistent.</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#26314b] bg-[#111827] p-4"><p className="text-sm text-slate-400">Acoustic total</p><p className="text-2xl font-bold text-white">{(result.acoustic * 100).toFixed(2)}%</p></div>
        <div className="rounded-xl border border-[#26314b] bg-[#111827] p-4"><p className="text-sm text-slate-400">Communication total</p><p className="text-2xl font-bold text-white">{(result.communication * 100).toFixed(2)}%</p></div>
        <div className="rounded-xl border border-[#26314b] bg-[#111827] p-4"><p className="text-sm text-slate-400">Recommended preset</p><p className="text-2xl font-bold text-white">65% / 35%</p></div>
      </div>

      <div className="rounded-xl border border-[#26314b] bg-[#111827] overflow-hidden">
        <div className="p-4 border-b border-[#26314b]"><h2 className="font-semibold text-white">36 pairwise comparisons</h2><p className="text-sm text-slate-400">For each row, decide whether parameter A or B is more important.</p></div>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#182238] text-slate-300"><tr><th className="p-3 text-left">Parameter A</th><th className="p-3 text-left">Comparison</th><th className="p-3 text-left">Parameter B</th></tr></thead>
            <tbody>{criteria.flatMap((first, firstIndex) => criteria.slice(firstIndex + 1).map((second, offset) => {
              const secondIndex = firstIndex + offset + 1;
              const key = pairKey(firstIndex, secondIndex);
              return <tr key={key} className="border-t border-[#26314b]"><td className="p-3">{first.label}<span className="block text-xs text-slate-500">{first.group}</span></td><td className="p-3 min-w-70"><select value={comparisons[key] ?? 1} onChange={(event) => updateComparison(key, Number(event.target.value))} className="w-full rounded-lg border border-slate-600 bg-[#0d1221] p-2 text-white">{saatyScale.map((value) => <option key={value} value={value}>{scaleLabel(value)}</option>)}</select></td><td className="p-3">{second.label}<span className="block text-xs text-slate-500">{second.group}</span></td></tr>;
            }))}</tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#26314b] bg-[#111827] overflow-hidden">
        <div className="p-4 border-b border-[#26314b]"><h2 className="font-semibold text-white">Calculated weights</h2></div>
        <table className="w-full text-sm"><thead className="bg-[#182238] text-slate-300"><tr><th className="p-3 text-left">Parameter</th><th className="p-3 text-left">Group</th><th className="p-3 text-right">AHP weight</th></tr></thead><tbody>{criteria.map((criterion, index) => <tr key={criterion.id} className="border-t border-[#26314b]"><td className="p-3">{criterion.label}</td><td className="p-3 text-slate-400">{criterion.group}</td><td className="p-3 text-right font-medium">{(result.weights[index] * 100).toFixed(2)}%</td></tr>)}</tbody></table>
      </div>
    </div>
  );
};

export default AhpCalculator;
