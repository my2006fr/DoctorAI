
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MessageRole, ChatMessage, VisualizationData } from "../types.ts";

const SYSTEM_INSTRUCTION = `You are "DocuTutor", a world-class educational AI tutor. 
Your goal is to help the user understand their uploaded PDF document. 

Rules for your behavior:
1. Act as a supportive, knowledgeable teacher. Use metaphors, ask guiding questions, and break down complex concepts.
2. If the user asks a question that can be visualized (like comparing statistics, showing a process flow, or data distributions), you MUST include a JSON block in your response using the specific visualization schema.
3. Your text should be in Markdown format.
4. When providing a visualization, place it at the VERY END of your message within a markdown code block labeled 'json:vis'.

Visualization Schema:
{
  "type": "bar" | "pie" | "line" | "graph",
  "title": "Clear Title",
  "data": [ ... data points based on content ... ]
}

For "graph", data should be: { "nodes": [{ "id": "A", "label": "Concept A" }], "links": [{ "source": "A", "target": "B" }] }
For charts, data should be: { "name": "Label", "value": number }

Always focus on the content of the PDF provided.`;

export async function getTutorResponse(
  history: ChatMessage[],
  pdfBase64: string | null,
  userInput: string
): Promise<{ text: string; visualization?: VisualizationData }> {
  // Move initialization here to ensure process.env.API_KEY is accessible when called
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents: any[] = history.map(msg => ({
    role: msg.role === MessageRole.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const userParts: any[] = [{ text: userInput }];
  
  if (pdfBase64 && history.length < 2) {
    userParts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64
      }
    });
  }

  contents.push({ role: 'user', parts: userParts });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });

  const fullText = response.text || "I'm sorry, I couldn't process that.";
  
  let cleanText = fullText;
  let vis: VisualizationData | undefined;

  const visMatch = fullText.match(/```json:vis\s+([\s\S]*?)```/);
  if (visMatch && visMatch[1]) {
    try {
      vis = JSON.parse(visMatch[1]);
      cleanText = fullText.replace(/```json:vis\s+[\s\S]*?```/, '').trim();
    } catch (e) {
      console.error("Failed to parse visualization JSON", e);
    }
  }

  return { text: cleanText, visualization: vis };
}
