import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import PNGtext from "png-chunk-text";

const encodeBase64 = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...utf8Bytes);
  return btoa(binary);
};

const decodeBase64 = (b64: string): string => {
  const binary = atob(b64);
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
};

export const writeCharacterToPng = async (file: File, data: string): Promise<Blob> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const filteredChunks = chunks.filter(chunk => {
    if (chunk.name !== "tEXt") return true;
    const { keyword } = PNGtext.decode(chunk.data);
    return !["chara", "ccv3"].includes(keyword.toLowerCase());
  });

  const base64Data = encodeBase64(data);
  filteredChunks.splice(-1, 0, PNGtext.encode("chara", base64Data));

  try {
    const v3Data = JSON.parse(data);
    v3Data.spec = "chara_card_v3";
    v3Data.spec_version = "3.0";
    const base64V3 = encodeBase64(JSON.stringify(v3Data));
    filteredChunks.splice(-1, 0, PNGtext.encode("ccv3", base64V3));
  } catch (err) {
    console.warn("Failed to add ccv3 chunk:", err);
  }

  const newBuffer = encode(filteredChunks);
  return new Blob([newBuffer], { type: "image/png" });
};

export const readCharacterFromPng = async (file: File): Promise<string> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const textChunks = chunks
    .filter(chunk => chunk.name === "tEXt")
    .map(chunk => PNGtext.decode(chunk.data));

  const ccv3 = textChunks.find(c => c.keyword.toLowerCase() === "ccv3");
  const chara = textChunks.find(c => c.keyword.toLowerCase() === "chara");

  const raw = ccv3?.text || chara?.text;
  if (!raw) throw new Error("No PNG metadata found.");

  return decodeBase64(raw);
};

export const parseCharacterCard = async (file: File): Promise<string> => {
  if (!file.name.toLowerCase().endsWith(".png")) {
    throw new Error("Unsupported format");
  }
  return readCharacterFromPng(file);
};

export function parseCharacterIntro(text: string, language: "en" | "zh", username?: string, charName?: string): string {
  let parsed = text.replace(/<br\s*\/?>/gi, "\n");
  const userReplacement = username ?? (language === "zh" ? "我" : "I");
  parsed = parsed.replace(/{{user}}/g, userReplacement);
  parsed = parsed.replace(/{{char}}/g, charName ?? "");
  return parsed;
}

export function replaceCharacterDataPlaceholders(
  characterData: any,
  language: "en" | "zh",
  username?: string,
): any {
  const result = { ...characterData };
  const userReplacement = username ?? (language === "zh" ? "我" : "I");
  const charReplacement = characterData.name || "";

  const fieldsToProcess = [
    "description", "personality", "first_mes", "scenario",
    "mes_example", "creatorcomment", "creator_notes",
  ];

  for (const field of fieldsToProcess) {
    if (result[field]) {
      let processed = result[field].replace(/<br\s*\/?>/gi, "\n");
      processed = processed.replace(/{{user}}/g, userReplacement);
      processed = processed.replace(/{{char}}/g, charReplacement);
      result[field] = processed;
    }
  }

  if (result.character_book) {
    const bookEntries = Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || []);

    result.character_book = bookEntries.map((entry: any) => {
      const processedEntry = { ...entry };

      if (processedEntry.comment) {
        let processed = processedEntry.comment.replace(/<br\s*\/?>/gi, "\n");
        processed = processed.replace(/{{user}}/g, userReplacement);
        processed = processed.replace(/{{char}}/g, charReplacement);
        processedEntry.comment = processed;
      }

      if (processedEntry.content) {
        let processed = processedEntry.content.replace(/<br\s*\/?>/gi, "\n");
        processed = processed.replace(/{{user}}/g, userReplacement);
        processed = processed.replace(/{{char}}/g, charReplacement);
        processedEntry.content = processed;
      }

      return processedEntry;
    });
  }

  if (Array.isArray(result.alternate_greetings)) {
    for (let i = 0; i < result.alternate_greetings.length; i++) {
      let greeting = result.alternate_greetings[i];
      greeting = greeting.replace(/<br\s*\/?>/gi, "\n");
      greeting = greeting.replace(/{{user}}/g, userReplacement);
      greeting = greeting.replace(/{{char}}/g, charReplacement);
      result.alternate_greetings[i] = greeting;
    }
  }

  return result;
}
