// Type definitions for the Attio CRM Data Extractor
// Schema matches the exact structure from requirements

export interface Contact {
    id: string;
    name: string;
    emails: string[];
    phones: string[];
    extractedAt: number;
}

export interface Deal {
    id: string;
    name: string;
    value: number | null;
    stage: string;
    company: string;
}

export interface Task {
    id: string;
    title: string;
    dueDate: string | null;
    assignee: string;
    done: boolean;
}

export interface AttioData {
    contacts: Contact[];
    deals: Deal[];
    tasks: Task[];
    lastSync: number;
}

export type DataType = 'contacts' | 'deals' | 'tasks';

// Message types for communication between components
export type MessageAction =
    | { action: 'EXTRACT_NOW'; viewType?: ViewType }
    | { action: 'GET_DATA' }
    | { action: 'DELETE_RECORD'; type: DataType; id: string }
    | { action: 'EXPORT_DATA'; format: 'csv' | 'json' }
    | { action: 'EXTRACTION_STARTED' }
    | { action: 'EXTRACTION_PROGRESS'; current: number; total: number; type: DataType }
    | { action: 'EXTRACTION_COMPLETE'; data: Partial<AttioData>; success: boolean; message?: string }
    | { action: 'EXTRACTION_ERROR'; error: string }
    | { action: 'GET_CURRENT_VIEW' }
    | { action: 'VIEW_INFO'; viewType: ViewType | null };

export type ViewType = 'people' | 'companies' | 'deals' | 'tasks' | 'unknown';

export interface ExtractionResult {
    success: boolean;
    data: Contact[] | Deal[] | Task[];
    type: DataType;
    message?: string;
}

// Indicator state for Shadow DOM UI
export type IndicatorState = 'idle' | 'extracting' | 'success' | 'error';

export interface IndicatorMessage {
    state: IndicatorState;
    message?: string;
    progress?: { current: number; total: number };
}
