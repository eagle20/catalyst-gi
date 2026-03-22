'use client';

import { useState } from 'react';

const INITIAL_COUNT = 5;

export function QnAList({ items }: { items: Array<{ question: string; answer: string }> }) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? items : items.slice(0, INITIAL_COUNT);
  const remaining = items.length - INITIAL_COUNT;

  return (
    <>
      <ol className="flex flex-col gap-8">
        {visible.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-0.5 shrink-0 font-mono text-sm text-contrast-400">{i + 1}.</span>
            <div className="flex flex-col gap-2">
              <p className="font-medium leading-snug">{item.question}</p>
              <p className="leading-relaxed text-contrast-500">{item.answer}</p>
            </div>
          </li>
        ))}
      </ol>

      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-8 font-medium text-foreground underline underline-offset-4 hover:text-contrast-500"
        >
          See {remaining} more question{remaining !== 1 ? 's' : ''}
        </button>
      )}
    </>
  );
}
