import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";

interface GetCharacterStatusOptions {
  characterId: string;
  nodeId?: string;
}

export async function getCharacterStatus({ characterId, nodeId }: GetCharacterStatusOptions) {
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);

    if (!dialogueTree || !dialogueTree.nodes || dialogueTree.nodes.length === 0) {
      throw new Error("No dialogue found for this character");
    }

    let targetNode;

    if (nodeId) {
      targetNode = dialogueTree.nodes.find((node) => node.node_id === nodeId);
      if (!targetNode) {
        return { success: true, status: null, nodeId: null };
      }
    } else {
      if (dialogueTree.current_node_id !== "root") {
        targetNode = dialogueTree.nodes.find((node) => node.node_id === dialogueTree.current_node_id);
      }

      if (!targetNode && dialogueTree.nodes.length > 0) {
        targetNode = dialogueTree.nodes[dialogueTree.nodes.length - 1];
      }

      if (!targetNode) {
        return { success: true, status: null, nodeId: null };
      }
    }

    let statusInfo: string | null = null;

    if (targetNode.parsed_content?.status) {
      statusInfo = targetNode.parsed_content.status;
    } else if (targetNode.assistant_response) {
      const statusMatch = targetNode.assistant_response.match(/<status>([\s\S]*?)<\/status>/);
      if (statusMatch?.[1]) {
        statusInfo = statusMatch[1];
      }
    }

    return {
      success: true,
      status: statusInfo,
      nodeId: targetNode.node_id,
      branchId: targetNode.branch_id,
    };
  } catch (error) {
    console.error("Error fetching character status:", error);
    throw new Error("Failed to fetch character status");
  }
}
