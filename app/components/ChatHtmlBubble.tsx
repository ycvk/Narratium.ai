"use client";

import { useEffect, useRef, memo } from "react";

function looksLikeHtml(str: string) {
  return /</.test(str);
}

interface Props {
  html: string;
}

export default memo(function ChatHtmlBubble({ html }: Props) {
  if (!looksLikeHtml(html)) {
    return (
      <div
        className="whitespace-pre-line leading-relaxed text-[#f4e8c1]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
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
  }, []);

  const srcDoc = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">
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
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={{
        width: "100%",
        border: "none",
        overflow: "hidden",
        height: "150px",
      }}
    />
  );
});
