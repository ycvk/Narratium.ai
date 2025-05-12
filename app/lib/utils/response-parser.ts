export interface ParsedResponse {
  rawcontent?:string;
  screen?: string;
  speech?: string;
  thought?: string;
  nextPrompts?: string[];
  compressedContent?: string;
  status?: string;
}

export function parseAIResponse(content: string): ParsedResponse {
  const result: ParsedResponse = {
    rawcontent: "",
    screen: "",
    speech: "",
    thought: "",
    nextPrompts: [],
    status: JSON.stringify([]),
  };

  const responseStart = content.indexOf("<response>");
  const responseEnd = content.indexOf("</response>");
  const responseContent = (responseStart !== -1 && responseEnd !== -1) 
    ? content.substring(responseStart + 10, responseEnd).trim() 
    : content;

  const screenStart = responseContent.indexOf("<screen>");
  const screenEnd = responseContent.indexOf("</screen>");
  if (screenStart !== -1 && screenEnd !== -1) {
    result.screen = responseContent.substring(screenStart + 8, screenEnd).trim();
  }

  const speechStart = responseContent.indexOf("<speech>");
  const speechEnd = responseContent.indexOf("</speech>");
  if (speechStart !== -1 && speechEnd !== -1) {
    result.speech = responseContent.substring(speechStart + 8, speechEnd).trim();
  }

  const thoughtStart = responseContent.indexOf("<thought>");
  const thoughtEnd = responseContent.indexOf("</thought>");
  if (thoughtStart !== -1 && thoughtEnd !== -1) {
    result.thought = responseContent.substring(thoughtStart + 9, thoughtEnd).trim();
  }

  result.rawcontent = (result.screen ?? "") + (result.speech ?? "") + (result.thought ?? "");

  const promptsStart = content.indexOf("<next_prompts>");
  const promptsEnd = content.indexOf("</next_prompts>");
  if (promptsStart !== -1 && promptsEnd !== -1) {
    const promptsText = content.substring(promptsStart + 14, promptsEnd);
    const promptLines = promptsText.trim().split("\n").map(line => line.trim())
      .filter(line => line && !line.startsWith("-") && !line.startsWith("*"));
    
    if (promptLines.length === 0) {
      const dashLines = promptsText.trim().split("\n")
        .map(line => line.trim())
        .filter(line => line)
        .map(line => line.replace(/^-\s*/, "").trim())
        .filter(line => line);
      
      if (dashLines.length > 0) {
        result.nextPrompts = dashLines.map(line => removeBrackets(line));
      }
    } else {
      result.nextPrompts = promptLines.map(line => removeBrackets(line));
    }
  }
  
  return result;
}

function removeBrackets(text: string): string {
  return text.replace(/^\s*\[(.*)\]\s*$/, "$1").trim();
}

export function parseEvent(story: string): string {
  const eventStart = story.indexOf("<event>");
  const eventEnd = story.indexOf("</event>");
  if (eventStart !== -1 && eventEnd !== -1) {
    return story.substring(eventStart + 7, eventEnd).trim();
  }
  return story;
}
