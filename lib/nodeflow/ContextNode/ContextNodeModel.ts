export class DialogueStory {
  language: string;
  userInput: string[];
  responses: string[];

  constructor(language: string, userInput: string[] | null = null, responses: string[] | null = null) {
    this.language = language;
    this.userInput = userInput || [];
    this.responses = responses || [];
  }

  getStory(startIndex: number | null = null, endIndex: number | null = null): string {
    if (startIndex === null) startIndex = 0;
    if (endIndex === null) endIndex = this.responses.length;
  
    let result = "";
    const userLabel = "User";
    const assistantLabel = "Character";
  
    for (let i = startIndex; i < endIndex; i++) {
      const userInput = this.userInput[i];
      const response = this.responses[i];
  
      if (userInput) result += `${userLabel}: ${userInput}\n`;
      if (response) result += `${assistantLabel}: ${response}\n`;
    }
  
    return result.trim();
  }
}
