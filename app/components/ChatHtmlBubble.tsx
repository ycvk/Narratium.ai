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

  function processHtml(htmlStr: string): string {
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    
    return htmlStr.replace(tagRegex, (match, tagName: string, attributes: string, innerContent: string) => {
      const lowerTagName = tagName.toLowerCase();

      const skipTags = ["script", "style", "head", "meta", "link", "title"];
      if (skipTags.includes(lowerTagName)) {
        return match;
      }

      const processedInner = processHtml(innerContent);

      if (colours[lowerTagName]) {
        const preservedAttrs = attributes.trim();
        const styleAttr = `style="color:${colours[lowerTagName]}"`;
        const dataAttr = `data-tag="${tagName}"`;
        const classAttr = "class=\"tag-styled\"";
        
        let finalAttrs = "";
        if (preservedAttrs) {
          const styleMatch = preservedAttrs.match(/style\s*=\s*["']([^"']*)["']/i);
          const classMatch = preservedAttrs.match(/class\s*=\s*["']([^"']*)["']/i);
          
          let modifiedAttrs = preservedAttrs;
          
          if (styleMatch) {
            const existingStyle = styleMatch[1];
            const newStyle = `${existingStyle}; color:${colours[lowerTagName]}`;
            modifiedAttrs = modifiedAttrs.replace(styleMatch[0], `style="${newStyle}"`);
          } else {
            modifiedAttrs += ` ${styleAttr}`;
          }
          
          if (classMatch) {
            const existingClass = classMatch[1];
            const newClass = `${existingClass} tag-styled`;
            modifiedAttrs = modifiedAttrs.replace(classMatch[0], `class="${newClass}"`);
          } else {
            modifiedAttrs += ` ${classAttr}`;
          }
          
          finalAttrs = modifiedAttrs + ` ${dataAttr}`;
        } else {
          finalAttrs = `${classAttr} ${styleAttr} ${dataAttr}`;
        }
        
        return `<${tagName}${finalAttrs ? " " + finalAttrs : ""}>${processedInner}</${tagName}>`;
      } else {
        return `<${tagName}${attributes ? " " + attributes : ""}>${processedInner}</${tagName}>`;
      }
    });
  }
  
  function processSelfClosingTags(htmlStr: string): string {
    const selfClosingRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\s*\/\s*>/g;
    
    return htmlStr.replace(selfClosingRegex, (match, tagName: string, attributes: string) => {
      const lowerTagName = tagName.toLowerCase();
      
      const skipTags = ["br", "hr", "img", "input", "meta", "link"];
      if (skipTags.includes(lowerTagName)) {
        return match;
      }
      
      if (colours[lowerTagName]) {
        const preservedAttrs = attributes.trim();
        const styleAttr = `style="color:${colours[lowerTagName]}"`;
        const dataAttr = `data-tag="${tagName}"`;
        const classAttr = "class=\"tag-styled\"";
        
        let finalAttrs = "";
        if (preservedAttrs) {
          const styleMatch = preservedAttrs.match(/style\s*=\s*["']([^"']*)["']/i);
          const classMatch = preservedAttrs.match(/class\s*=\s*["']([^"']*)["']/i);
          
          let modifiedAttrs = preservedAttrs;
          
          if (styleMatch) {
            const existingStyle = styleMatch[1];
            const newStyle = `${existingStyle}; color:${colours[lowerTagName]}`;
            modifiedAttrs = modifiedAttrs.replace(styleMatch[0], `style="${newStyle}"`);
          } else {
            modifiedAttrs += ` ${styleAttr}`;
          }
          
          if (classMatch) {
            const existingClass = classMatch[1];
            const newClass = `${existingClass} tag-styled`;
            modifiedAttrs = modifiedAttrs.replace(classMatch[0], `class="${newClass}"`);
          } else {
            modifiedAttrs += ` ${classAttr}`;
          }
          
          finalAttrs = modifiedAttrs + ` ${dataAttr}`;
        } else {
          finalAttrs = `${classAttr} ${styleAttr} ${dataAttr}`;
        }
        
        return `<${tagName}${finalAttrs ? " " + finalAttrs : ""} />`;
      } else {
        return match;
      }
    });
  }

  let result = processHtml(html);
  result = processSelfClosingTags(result);

  return result;
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
      const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
      frame.style.height = `${h}px`;
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
          height: "600px",
          background: "transparent",
        }}
      />
    );
  }
  const processedHtml = replaceTags(html).replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box;max-width:100%}html,body{margin:0;padding:0;color:#f4e8c1;font:16px/${1.5} serif;background:transparent;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;}img,video,iframe{max-width:100%;height:auto;display:block;margin:0 auto}table{width:100%;border-collapse:collapse;overflow-x:auto;display:block}code,pre{font-family:monospace;font-size:0.9rem;white-space:pre-wrap}pre{background:rgba(255,255,255,0.05);padding:8px;border-radius:4px}a{color:#93c5fd}.tag-styled{padding:2px 4px;border-radius:3px;border:1px solid rgba(255,255,255,0.1);white-space:inherit}</style></head><body>${processedHtml}<script>function postHeight(){const h=document.documentElement.scrollHeight||document.body.scrollHeight;parent.postMessage({__chatBubbleHeight:h+4},'*');}window.addEventListener('load',postHeight,{once:true});new ResizeObserver(postHeight).observe(document.body);</script></body></html>`;

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
      style={{ width: "100%", border: 0, overflow: "hidden", height: "150px", background: "transparent" }}
    />
  );
});
