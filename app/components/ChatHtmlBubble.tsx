"use client";

import { useEffect, useRef, memo, useState } from "react";
import { marked } from "marked";

function looksLikeHtml(str: string) {
  return /</.test(str);
}

interface Props {
  html: string;
  isLoading?: boolean;
  serifFontClass?: string;
}

export default memo(function ChatHtmlBubble({ html, isLoading = false, serifFontClass = "" }: Props) {
  const [showLoader, setShowLoader] = useState(isLoading || html.trim() === "");
  const frameRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    setShowLoader(isLoading || html.trim() === "");
    
    if (html.trim() !== "") {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [html, isLoading]);

  useEffect(() => {
    if (!looksLikeHtml(html) || showLoader) return;
    
    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        typeof e.data === "object" &&
        e.data.__chatBubbleHeight &&
        frameRef.current &&
        e.source === frameRef.current.contentWindow
      ) {
        frameRef.current.style.height = `${e.data.__chatBubbleHeight}px`;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [html, showLoader]);

  if (showLoader) {
    return (
      <div className="relative min-h-[80px] bg-[#1a1816] bg-opacity-40 rounded-lg p-4 backdrop-blur-sm border border-[#534741]">
        <div className="fantasy-loader">
          <div className="rune-circle">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rune" style={{ animationDelay: `${i * 0.15}s` }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M12 3v18M3 12h18M7 7l10 10M7 17l10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            ))}
          </div>
          <div className="pulse-glow"></div>
        </div>
      </div>
    );
  }

  if (!looksLikeHtml(html)) {
    const parsedHtml = marked.parse(html);
    return (
      <div
        className={`whitespace-pre-line text-[#f4e8c1] story-text ${serifFontClass} leading-relaxed magical-text`}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
    );
  }
  
  const srcDoc = `
<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 10px;
      color: #f4e8c1;
      font-size: 0.95rem;
      line-height: 1.8;
      white-space: pre-wrap;
      font-family: 'Noto Serif', 'Source Serif Pro', 'Crimson Pro', Georgia, 'Times New Roman', serif;
      letter-spacing: 0.01em;
      text-rendering: optimizeLegibility;
      background-color: rgba(26, 24, 22, 0.6);
      background-image: linear-gradient(to bottom, rgba(40, 36, 32, 0.7), rgba(26, 24, 22, 0.6));
      border-radius: 8px;
      overflow: hidden;
    }
    p:not([style]), div:not([style]), span:not([style]), li:not([style]) {
      color: inherit;
      font-family: inherit;
      line-height: inherit;
    }
    html, body {
      backdrop-filter: blur(3px);
    }
  </style>
</head>
<body class="story-text">
${html}
<script>
  function postHeight(){
    const h = document.documentElement.scrollHeight || document.body.scrollHeight;
    parent.postMessage({__chatBubbleHeight: h}, '*');
  }
  window.addEventListener('load', postHeight);
  new ResizeObserver(postHeight).observe(document.body);
</script>
</body></html>`.trim();

  return (
    <iframe
      ref={frameRef}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
      style={{
        width: "100%",
        border: "1px solid rgba(83, 71, 65, 0.5)",
        overflow: "hidden",
        height: "150px",
        backgroundColor: "rgba(26, 24, 22, 0.4)",
        transition: "all 0.3s ease",
      }}
      className="rounded-lg shadow-md hover:shadow-[0_0_10px_rgba(249,200,109,0.15)]"
    />
  );
});
