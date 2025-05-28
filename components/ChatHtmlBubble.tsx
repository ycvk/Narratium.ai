"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";

function convertMarkdown(str: string): string {
  const imagePlaceholders: string[] = [];

  str = str.replace(/!\[\]\(([^)]+)\)/g, (_match,url) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
    imagePlaceholders.push(`<img src="${url}" alt="Image" />`);
    return placeholder;
  });

  str = str.replace(/^---$/gm, "");
  str = str.replace(/```[\s\S]*?```/g, (match,_) => {
    const content = match.replace(/^```\w*\n?/, "").replace(/```$/, "");
    return `<pre>${content}</pre>`;
  });

  str = str.replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>");
  str = str.replace(/<\/blockquote>\s*<blockquote>/g, "\n");

  str = str.replace(/!\[\]\(([^)]+)\)/g, "<img src=\"$1\" alt=\"Image\" />");
  str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  str = str.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  str = str.replace(/(<[^>]+>)|(["“][^"”]+["”])/g, (_match, tag, quote) => {
    if (tag) return tag;
    return `<span class="dialogue">${quote}</span>`;
  });

  str = str.replace(/\[([^\]]+)\]|【([^】]+)】/g, (_match, latinContent, cjkContent) => {
    const content = latinContent || cjkContent;
    return `<span class="bracket-content">${content}</span>`;
  });

  imagePlaceholders.forEach((html, i) => {
    str = str.replace(`__IMAGE_PLACEHOLDER_${i}__`, html);
  });

  return str;
}

function isCompleteHtmlDocument(str: string): boolean {
  const trimmed = str.trim().toLowerCase();
  return (
    trimmed.includes("<!doctype html") ||
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
  const predefinedColors: Record<string, string> = {
    "strong": "#fb7185",
    "em": "#c4b5fd", 
    "blockquote": "#93c5fd", 
    "pre": "#86efac",        
    "code": "#86efac",        
    "dialogue": "#fda4af",    
    "img": "#67e8f9",        
    "a": "#93c5fd",    
  };

  const availableColors = [
    "#fde047", "#a78bfa", "#34d399", "#f59e0b", "#60a5fa",
    "#10b981", "#f97316", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
    "#facc15", "#f472b6", "#818cf8", "#22d3ee", "#4ade80", "#fb923c",
    "#d946ef", "#06b6d4", "#65a30d", "#dc2626", "#7c3aed", "#059669",
  ];

  const colours: Record<string, string> = {};
  const usedColors = new Set<string>();

  uniqueTags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    if (predefinedColors[lowerTag]) {
      colours[lowerTag] = predefinedColors[lowerTag];
      usedColors.add(predefinedColors[lowerTag]);
    }
  });

  const unassignedTags = uniqueTags.filter(tag => !predefinedColors[tag.toLowerCase()]);
  const unusedColors = availableColors.filter(color => !usedColors.has(color));
  
  unassignedTags.sort((a, b) => a.localeCompare(b)).forEach((tag, i) => {
    const lowerTag = tag.toLowerCase();
    if (!colours[lowerTag]) {
      const colorIndex = i % (unusedColors.length || availableColors.length);
      colours[lowerTag] = unusedColors.length > 0 ? unusedColors[colorIndex] : availableColors[colorIndex];
    }
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
}: Props) {
  const [showLoader, setShowLoader] = useState(
    isLoading || rawHtml.trim() === "",
  );
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setShowLoader(isLoading || rawHtml.trim() === "");
    if (rawHtml.trim() !== "") {
      const t = setTimeout(() => setShowLoader(false), 250);
      return () => clearTimeout(t);
    }
  }, [rawHtml, isLoading]);

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
  
  const isFullDoc = isCompleteHtmlDocument(rawHtml);
  if (isFullDoc) {
    return (
      <iframe
        ref={frameRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={rawHtml}
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
  const html = convertMarkdown(rawHtml);
  const processedHtml = replaceTags(html).replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box;max-width:100%}html,body{margin:0;padding:0;color:#f4e8c1;font:16px/${1.5} serif;background:transparent;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;}img,video,iframe{max-width:100%;height:auto;display:block;margin:0 auto}table{width:100%;border-collapse:collapse;overflow-x:auto;display:block}code,pre{font-family:monospace;font-size:0.9rem;white-space:pre-wrap;background:rgba(40,40,40,0.8);padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);}pre{background:rgba(40,40,40,0.8);padding:12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);margin:8px 0;}blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid #93c5fd;background:rgba(147,197,253,0.08);border-radius:0 4px 4px 0;font-style:italic;color:#93c5fd;}strong{color:#fb7185;font-weight:bold;}em{color:#c4b5fd;font-style:italic;}.dialogue{color:#fda4af;}a{color:#93c5fd}.tag-styled{white-space:inherit;}</style></head><body>${processedHtml}<script>let lastHeight=0;function postHeight(){try{const h=Math.max(document.documentElement.scrollHeight||0,document.body.scrollHeight||0,document.documentElement.offsetHeight||0,document.body.offsetHeight||0);if(h!==lastHeight){lastHeight=h;parent.postMessage({__chatBubbleHeight:h+10},'*');}}catch(e){}}function delayedHeight(){setTimeout(postHeight,50);}window.addEventListener('load',delayedHeight);document.addEventListener('DOMContentLoaded',delayedHeight);setTimeout(postHeight,100);setTimeout(postHeight,300);new ResizeObserver(postHeight).observe(document.body);</script></body></html>`;

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
