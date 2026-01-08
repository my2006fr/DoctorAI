
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  visualization?: VisualizationData;
}

export interface VisualizationData {
  type: 'bar' | 'pie' | 'line' | 'graph';
  title: string;
  data: any[];
}

export interface AppState {
  messages: ChatMessage[];
  isUploading: boolean;
  isProcessing: boolean;
  currentPdfName: string | null;
  currentPdfBase64: string | null;
}
