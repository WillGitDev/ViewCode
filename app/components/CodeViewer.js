// app/components/CodeViewer.js
"use client";

import { useEffect, useRef } from "react";

export default function CodeViewer({ sourceCode, highlightLine }) {
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current && highlightLine > 0) {
      const targetElement = codeRef.current.children[highlightLine - 1];
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [highlightLine, sourceCode]);

  if (!sourceCode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#0d1117]">
        <p>Survolez un élément pour voir son code source.</p>
      </div>
    );
  }

  const lines = sourceCode.split("\n");

  return (
    // CHANGEMENT ICI : h-full, w-full et suppression de max-h-60
    <div
      className="text-sm font-mono bg-[#0d1117] text-gray-300 h-full w-full overflow-auto p-4"
      ref={codeRef}
    >
      {lines.map((lineContent, index) => {
        const lineNumber = index + 1;
        const isHighlighted = lineNumber === highlightLine;

        return (
          <div
            key={lineNumber}
            className={`flex w-full ${
              isHighlighted
                ? "bg-[#373e47] text-white border-l-4 border-purple-500" // Style plus "GitHub Dark"
                : "hover:bg-[#161b22]"
            }`}
          >
            {/* Numéro de ligne fixe */}
            <span
              className={`w-12 text-right pr-4 flex-shrink-0 select-none ${
                isHighlighted ? "text-gray-200 font-bold" : "text-gray-600"
              }`}
            >
              {lineNumber}
            </span>
            {/* Code */}
            <pre className="flex-grow whitespace-pre bg-transparent m-0 font-inherit">
              {lineContent}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
