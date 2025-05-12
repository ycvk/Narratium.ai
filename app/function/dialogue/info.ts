import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { Character } from "@/app/lib/models/character-model";

const formatNodeContent = (node: any): string => {
  if (node.parent_node_id == "root") {
    return node.assistant_response || "";
  }

  let formattedContent = "";

  if (node.parsed_content?.screen) {
    formattedContent += `<screen>${node.parsed_content.screen}</screen>`;
  }

  if (node.parsed_content?.speech) {
    formattedContent += `<speech>${node.parsed_content.speech}</speech>`;
  }

  if (node.parsed_content?.thought) {
    formattedContent += `<thought>${node.parsed_content.thought}</thought>`;
  }

  return formattedContent;
};

export async function getCharacterDialogue(characterId: string) {
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

      const messages = currentPath.flatMap((node) => {
        const messages = [];

        if (node.user_input) {
          messages.push({
            id: node.node_id,
            role: "user",
            content: node.user_input,
            parsedContent: null,
          });
        }

        if (node.assistant_response) {
          messages.push({
            id: node.node_id,
            role: "assistant",
            content: formatNodeContent(node),
            parsedContent: node.parsed_content || null,
          });
        }

        return messages;
      });

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
      character,
      dialogue: processedDialogue,
    };
  } catch (error: any) {
    console.error("Failed to get character information:", error);
    throw new Error(`Failed to get character information: ${error.message}`);
  }
}
