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
