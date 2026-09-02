import React from "react";
import { AlertTriangle, Bot, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import AssistantMessageText from "../components/AssistantMessageText.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MAX_QUESTION_LENGTH = 2000;

const Assistant = () => {
  const { logout } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me about overspending, savings, budgets, or your monthly spending pattern."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return; // guards against empty submits and duplicate/overlapping requests

    if (trimmed.length > MAX_QUESTION_LENGTH) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: `Please keep questions under ${MAX_QUESTION_LENGTH} characters.`, isError: true }
      ]);
      return;
    }

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const { data } = await api.post("/assistant/ask", { question: trimmed });
      setMessages((current) => [...current, { role: "assistant", text: data.answer }]);
    } catch (apiError) {
      const status = apiError.response?.status;

      if (status === 401) {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: "Your session has expired. Please log in again to continue.", isError: true }
        ]);
        await logout();
        return;
      }

      const message =
        apiError.response?.data?.message ||
        "The AI assistant is temporarily unavailable. Please try again later.";
      setMessages((current) => [...current, { role: "assistant", text: message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">AI finance assistant</p>
        <h1>Ask smarter questions about your money</h1>
      </div>

      <section className="chat-panel">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <article
              className={`chat-message ${message.role}${message.isError ? " chat-message--error" : ""}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (message.isError ? <AlertTriangle size={18} /> : <Bot size={18} />)}
              <div>
                <AssistantMessageText text={message.text} />
              </div>
            </article>
          ))}
          {loading && (
            <article className="chat-message assistant" aria-live="polite">
              <Bot size={18} />
              <p className="empty-state">Analyzing your finances…</p>
            </article>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-form" onSubmit={ask}>
          <input
            placeholder="Where am I overspending?"
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={loading}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="primary-button" type="submit" disabled={loading || !question.trim()}>
            <Send size={18} /> {loading ? "Thinking…" : "Ask"}
          </button>
        </form>

        <p className="assistant-disclaimer">
          AI-generated insights are for informational purposes only and may not always be accurate. They should not
          be considered professional financial, tax, or investment advice.
        </p>
      </section>
    </section>
  );
};

export default Assistant;
