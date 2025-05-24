"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";
import { marked } from "marked";

function looksLikeHtml(str: string) {
  return /</.test(str);
}

function stripCodeFences(str: string): string {
  const trimmed = str.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) return str;

  const firstNewline = trimmed.indexOf("\n");
  if (firstNewline === -1) return str;

  const withoutOpen = trimmed.slice(firstNewline + 1);
  const lastFence = withoutOpen.lastIndexOf("```\n") > -1
    ? withoutOpen.lastIndexOf("```\n")
    : withoutOpen.lastIndexOf("```");
  if (lastFence === -1) return str;
  return withoutOpen.slice(0, lastFence).trim();
}

function isCompleteHtmlDocument(str: string): boolean {
  const trimmed = str.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    (trimmed.startsWith("<html") && trimmed.includes("</html>"))
  );
}

function detectHtmlTags(str: string) {
  const htmlTagRegex = /<\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/g;
  const selfClosingTagRegex = /<\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/\s*>/g;
  const tags = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = htmlTagRegex.exec(str)) !== null) tags.add(match[1].toLowerCase());
  while ((match = selfClosingTagRegex.exec(str)) !== null) tags.add(match[1].toLowerCase());
  return [...tags];
}

function generatePalette(uniqueTags: string[]): Record<string, string> {
  const palette = [
    "#fcd34d", "#93c5fd", "#86efac", "#c4b5fd", "#fda4af", "#fde047",
    "#67e8f9", "#fb7185", "#a78bfa", "#34d399", "#f59e0b", "#60a5fa",
    "#10b981", "#f97316", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
  ];
  const colours: Record<string, string> = {};
  uniqueTags.sort((a, b) => a.localeCompare(b)).forEach((t, i) => {
    colours[t] = palette[i % palette.length];
  });
  return colours;
}

function replaceTags(html: string) {
  const tags = detectHtmlTags(html);
  if (tags.length === 0) return html;
  const colours = generatePalette(tags);

  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/g,
    (_, tag: string, _attrs: string, inner: string) =>
      `<span class="tag-styled" style="color:${colours[tag.toLowerCase()]}" data-tag="${tag}">${inner}</span>`,
  );
}

interface Props {
  html: string;
  isLoading?: boolean;
  serifFontClass?: string;
  forceFullDocument?: boolean;
}

export default memo(function ChatHtmlBubble({
  html: rawHtml,
  isLoading = false,
  serifFontClass = "",
  forceFullDocument = false,
}: Props) {
  const html = stripCodeFences(rawHtml);

  const [showLoader, setShowLoader] = useState(
    isLoading || html.trim() === "",
  );
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setShowLoader(isLoading || html.trim() === "");
    if (html.trim() !== "") {
      const t = setTimeout(() => setShowLoader(false), 250);
      return () => clearTimeout(t);
    }
  }, [html, isLoading]);

  const adjustHeightOnce = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement.scrollHeight || 0,
        doc.body.scrollHeight || 0,
        doc.body.offsetHeight || 0,
      );
      const bufferHeight = Math.max(50, h * 0.1);
      frame.style.height = `${h + bufferHeight}px`;
    } catch (_) {
    }
  }, []);

  if (!looksLikeHtml(html)) {
    const parsed = marked.parse(html);
    return (
      <div
        className={`whitespace-pre-wrap text-[#f4e8c1] ${serifFontClass} leading-relaxed`}
        dangerouslySetInnerHTML={{ __html: parsed }}
      />
    );
  }
  const isFullDoc = forceFullDocument || isCompleteHtmlDocument(html);
  if (isFullDoc) {
    return (
      <iframe
        ref={frameRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={html}
        onLoad={adjustHeightOnce}
        style={{
          width: "100%",
          border: 0,
          overflow: "auto",
          height: "700px",
          background: "transparent",
        }}
      />
    );
  }
  const processedHtml = replaceTags(html).replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box;max-width:100%}html,body{margin:0;padding:0;color:#f4e8c1;font:16px/${1.5} serif;background:transparent;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;}img,video,iframe{max-width:100%;height:auto;display:block;margin:0 auto}table{width:100%;border-collapse:collapse;overflow-x:auto;display:block}code,pre{font-family:monospace;font-size:0.9rem;white-space:pre-wrap}pre{background:rgba(255,255,255,0.05);padding:8px;border-radius:4px}a{color:#93c5fd}.tag-styled{padding:2px 4px;border-radius:3px;border:1px solid rgba(255,255,255,0.1);white-space:inherit}strong{font-weight:bold;color:#f4e8c1}em{font-style:italic;color:#f4e8c1}del{text-decoration:line-through;color:#a18d6f}code{background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:3px;font-family:monospace;font-size:0.9em}</style></head><body>${processedHtml}<script>function postHeight(){const h=Math.max(document.documentElement.scrollHeight||0,document.body.scrollHeight||0,document.body.offsetHeight||0);const bufferHeight=Math.max(30,h*0.1);parent.postMessage({__chatBubbleHeight:h+bufferHeight},'*');}window.addEventListener('load',postHeight,{once:true});new ResizeObserver(postHeight).observe(document.body);setTimeout(postHeight,100);setTimeout(postHeight,300);</script></body></html>`;

  useEffect(() => {
    if (showLoader) return;
    const handler = (e: MessageEvent) => {
      if (
        e.source === frameRef.current?.contentWindow &&
        typeof e.data === "object" &&
        e.data.__chatBubbleHeight
      ) {
        frameRef.current!.style.height = `${e.data.__chatBubbleHeight}px`;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [showLoader]);

  if (showLoader) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-b-transparent rounded-full" />
      </div>
    );
  }

  return (
    <iframe
      ref={frameRef}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
      style={{ width: "100%", border: 0, overflow: "hidden", height: "200px", background: "transparent" }}
    />
  );
});
