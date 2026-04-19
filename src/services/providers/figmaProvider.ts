import axios from "axios";

import { config } from "../../core/config";
import { FigmaElement, FigmaScreen } from "../../models/types";

export async function getFigmaScreens(
  figmaFileKey?: string,
  figmaNodeIds: string[] = []
): Promise<FigmaScreen[]> {
  if (!figmaFileKey || !config.figmaAccessToken) {
    return [
      {
        nodeId: "dummy-login-screen",
        name: "Login Screen",
        elements: [
          { elementId: "email", name: "Email", elementType: "TEXT_FIELD", text: "Email*" },
          { elementId: "password", name: "Password", elementType: "TEXT_FIELD", text: "Password*" },
          { elementId: "forgot", name: "Forgot Password", elementType: "LINK", text: "Forgot Your Password?" },
          { elementId: "signin", name: "Sign In", elementType: "BUTTON", text: "Sign In" }
        ]
      }
    ];
  }

  const ids = figmaNodeIds.join(",");
  const response = await axios.get(`https://api.figma.com/v1/files/${figmaFileKey}/nodes`, {
    params: ids ? { ids } : undefined,
    headers: { "X-Figma-Token": config.figmaAccessToken }
  });

  const nodes = response.data?.nodes ?? {};
  return Object.entries(nodes).map(([nodeId, wrapped]) => {
    const document = (wrapped as any)?.document ?? {};
    return {
      nodeId,
      name: document.name ?? "Unnamed Screen",
      elements: collectElements(document)
    };
  });
}

function collectElements(root: any): FigmaElement[] {
  const out: FigmaElement[] = [];

  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.id === "string") {
      out.push({
        elementId: node.id,
        name: node.name ?? "",
        elementType: node.type ?? "UNKNOWN",
        text: node.characters
      });
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };

  walk(root);
  return out.slice(0, 200);
}
