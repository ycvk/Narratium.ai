import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { Character } from "@/app/lib/core/character";
import { adaptText } from "@/app/lib/adapter/tagReplacer";
import { RegexProcessor } from "@/app/lib/core/regex-processor";

export async function getCharacterDialogue(characterId: string, language: "en" | "zh" = "zh", username?: string) {
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
    const character = new Character(characterRecord);

    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);

    let processedDialogue = null;

    if (dialogueTree) {
      const currentPath = dialogueTree.current_node_id !== "root"
        ? await LocalCharacterDialogueOperations.getDialoguePathToNode(characterId, dialogueTree.current_node_id)
        : [];

      const messagePromises = [];
      
      for (const node of currentPath) {
        const nodeMessages = [];
        
        if (node.user_input) {
          nodeMessages.push({
            id: node.node_id,
            role: "user",
            content: node.user_input,
            parsedContent: null,
          });
        }
        
        if (node.assistant_response) {
          const assistantMessagePromise = async () => {
            const regexResult = await RegexProcessor.processFullContext(
              adaptText(node.assistant_response, language, username),
              {
                ownerId: characterId,
              },
            );
            
            return {
              id: node.node_id,
              role: "assistant",
              content: regexResult.replacedText,
              parsedContent: node.parsed_content || null,
            };
          };
          
          messagePromises.push(assistantMessagePromise());
        }

        for (const msg of nodeMessages) {
          messagePromises.push(Promise.resolve(msg));
        }
      }
      
      const messages = await Promise.all(messagePromises);

      processedDialogue = {
        id: dialogueTree.id,
        character_id: dialogueTree.character_id,
        current_node_id: dialogueTree.current_node_id,
        current_branch_id: dialogueTree.current_branch_id,
        created_at: dialogueTree.created_at,
        updated_at: dialogueTree.updated_at,
        messages,
        tree: {
          nodes: dialogueTree.nodes,
          currentNodeId: dialogueTree.current_node_id,
        },
      };
    }

    return {
      success: true,
      character: {
        id: character.id,
        data: character.getData(language, username),
        imagePath: character.imagePath,
      },
      dialogue: processedDialogue,
    };
  } catch (error: any) {
    console.error("Failed to get character information:", error);
    throw new Error(`Failed to get character information: ${error.message}`);
  }
}
