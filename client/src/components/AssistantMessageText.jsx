import React from "react";

// Turns plain text (optionally with simple "- " / "1. " list markers) into
// React elements. Deliberately does NOT parse or render any HTML/markdown
// tags — every line becomes a text node, so there is no way for AI output
// (which should never be trusted as markup) to inject real HTML into the
// page, without needing a sanitizer library.
const AssistantMessageText = ({ text }) => {
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  text
    .split("\n")
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) {
        flushList();
        return;
      }

      const bulletMatch = line.match(/^[-•*]\s+(.*)/);
      const numberedMatch = line.match(/^\d+[.)]\s+(.*)/);

      if (bulletMatch || numberedMatch) {
        const tag = numberedMatch ? "ol" : "ul";
        const content = (bulletMatch || numberedMatch)[1];
        if (!currentList || currentList.tag !== tag) {
          flushList();
          currentList = { tag, items: [], key: `list-${index}` };
        }
        currentList.items.push(content);
        return;
      }

      flushList();
      blocks.push({ tag: "p", content: line, key: `p-${index}` });
    });

  flushList();

  return (
    <>
      {blocks.map((block) => {
        if (block.tag === "ul") {
          return (
            <ul key={block.key} className="assistant-list">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.tag === "ol") {
          return (
            <ol key={block.key} className="assistant-list">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          );
        }
        return <p key={block.key}>{block.content}</p>;
      })}
    </>
  );
};

export default AssistantMessageText;
