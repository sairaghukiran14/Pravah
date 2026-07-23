export interface SarvamSTTRequest {
  file?: string; // base64 string or audio buffer description
  text_input?: string; // fallback string if audio is missing
  language_code?: string;
  model?: string;
  mode?: string;
}

export interface SarvamSTTResponse {
  request_id?: string;
  transcript: string;
  language_code?: string;
  confidence?: number;
}

export interface SarvamTranslateRequest {
  input: string;
  source_language_code: string;
  target_language_code: string;
  mode?: string;
}

export interface SarvamTranslateResponse {
  request_id?: string;
  translated_text: string;
  source_language_code?: string;
  target_language_code?: string;
}

export interface SarvamTTSRequest {
  text: string;
  target_language_code: string;
  speaker?: string;
  pace?: number;
  model?: string;
}

export interface SarvamTTSResponse {
  request_id?: string;
  audios: string[]; // array of base64 encoded audio strings
  format?: string;
}
