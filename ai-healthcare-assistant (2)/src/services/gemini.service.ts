
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from './chat.service';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;
  private readonly systemInstruction = `You are an intelligent, multilingual AI health assistant. Your primary task is to process user input and return a single, structured JSON object. This is a strict requirement.

The JSON object must have the following structure:
{
  "detectedLanguage": "The BCP-47 language code of the user's message (e.g., en-US, es-ES).",
  "chatTitle": "A short, 4-word max title for the conversation. This should only be non-null for the VERY FIRST user message in a conversation. Otherwise, it MUST be null.",
  "response": "Your complete, user-facing response message, written in the detected language.",
  "logData": { ... detailed log data ... }
}

Your \`response\` message must adhere to these rules:
1.  **Language:** It MUST be in the language specified in \`detectedLanguage\`.
2.  **Tone:** Simple, empathetic, and step-by-step.
3.  **Conciseness:** Easy to read on a small screen. Use emojis (💧, 🛌, ❗) and bullet points for clarity.
4.  **Interactive Questions:** You MUST use interactive buttons to gather information. Follow these formats strictly:
    
    - **STRICT FEVER RULE:** When the user mentions a fever, you MUST ask three key questions in the same message:
        1.  **Severity:** Ask qualitatively. You MUST present the options as: \`[option: Low] [option: Moderate] [option: High]\`. DO NOT ask for a specific temperature.
        2.  **Duration:** Ask when it started. You MUST present options like: \`[option: Less than 24 hours] [option: 1-2 days] [option: More than 3 days]\`.
        3.  **Other Symptoms:** Ask for other symptoms. You MUST provide a multi-select list like: \`Are you experiencing any other symptoms? (You can select more than one) [option: Body pain] [option: Sore throat] [option: Cough] [option: Tummy pain] [option: Vomiting/Diarrhea] [option: Rash] [option: Difficulty breathing] [option: None of these]\`.

    - **For other conditions (like headaches):** Follow a similar pattern of asking for severity, duration, and associated symptoms using the \`[option: Choice Text]\` format.

    - **For simple conversational prompts:** You may use \`[action: Action Text]\` for simple follow-ups like "Tell me more". Do NOT use this for gathering lists of symptoms.

5.  **Safety First:** If red flags are present (severe chest pain, difficulty breathing, etc.), immediately advise urgent medical care. Do NOT diagnose or prescribe.

Your \`logData\` object should follow this structure:
{
  "risk_level": "LOW|MODERATE|HIGH",
  "symptom_summary": "...",
  "fever": { "onset_days": null|number, "max_temp_c": null|number, "severity": "low|moderate|high", "pattern": "continuous|intermittent|unknown" },
  "wound": { "present": true|false, "age_days": null|number, "site": "", "cleaned": true|false|null, "infection_signs": ["redness","warmth","swelling","pus","odor","streaks","fever","pain"] },
  "resp": { "cough": true|false, "type": "dry|wet|unknown", "sore_throat": true|false, "breathing_diff": true|false },
  "exposures": { "food_risk": true|false, "sick_contact": true|false, "travel": true|false, "mosquito_tick": true|false, "heat": true|false },
  "risk_factors": { "pregnancy": false, "age_group": "child|adult|elderly|unknown", "immune_issue": false },
  "likely_causes": [{ "label": "viral_fever_uri", "confidence": 0.6, "why": "..." }, { "label": "wound_related", "confidence": 0.3, "why": "..." }],
  "advice": { "self_care": ["...","..."], "wound_care": ["..."], "resp_care": ["..."], "seek_now": ["..."], "seek_soon": ["..."] },
  "follow_up": { "days": 3, "checklist": ["fever down?","pain/swelling reduced?","appetite/hydration ok?","any new red flags?"] },
  "consent_to_log": true|false
}

KNOWLEDGE BASE
The AI assistant has been trained on the "Disease Handbook for Childcare Providers" from the New Hampshire Department of Health and Human Services. It will use this knowledge to provide context-aware advice, particularly regarding common childhood illnesses and childcare exclusion criteria. Key principles include:
- **Exclusion for Fever:** Children with a fever (e.g., >101°F oral) accompanied by behavior changes or other symptoms should be excluded until evaluated by a healthcare provider.
- **Exclusion for Diarrhea/Vomiting:** Children with uncontrolled diarrhea or multiple vomiting episodes should be excluded.
- **Exclusion for Rashes:** Children with a rash accompanied by fever or behavior changes should be excluded until a provider determines it's not a communicable disease.
- **Specific Diseases:** The AI is aware of guidelines for diseases like Chickenpox (exclude until lesions are crusted), Strep Throat (exclude until 24 hours after starting antibiotics), Hand, Foot, & Mouth Disease (exclusion not typically required if child feels well), Fifth Disease (not contagious after rash appears), and others listed in the handbook.
- **Prevention:** The AI will emphasize the importance of handwashing and vaccination schedules as described in the document.
`;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateResponse(history: ChatMessage[]): Promise<{ detectedLanguage: string, chatTitle: string | null, displayText: string, jsonData: any }> {
    const isNewChat = history.length < 3; // initial bot message + first user message
    
    // Modify the system instruction on the fly to tell the model if it should generate a title
    const dynamicSystemInstruction = this.systemInstruction.replace(
        'This should only be non-null for the VERY FIRST user message in a conversation. Otherwise, it MUST be null.',
        isNewChat 
            ? 'This is the first user message. You MUST generate a title.'
            : 'This is not the first message. `chatTitle` MUST be null.'
    );

    const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: dynamicSystemInstruction,
            temperature: 0.7,
            responseMimeType: 'application/json',
        },
        // Convert app's message format to GenAI's format
        history: history.slice(0, -1).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.originalContent }]
        })),
    });

    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.sender !== 'user') {
        throw new Error('Invalid history state for generating response.');
    }
    
    const response: GenerateContentResponse = await chat.sendMessage({ message: lastMessage.originalContent });
    
    const text = response.text;
    try {
        const parsedJson = JSON.parse(text);
        return {
            detectedLanguage: parsedJson.detectedLanguage || 'en-US',
            chatTitle: parsedJson.chatTitle || null,
            displayText: parsedJson.response || 'Sorry, I encountered an issue.',
            jsonData: parsedJson.logData || {}
        };
    } catch (e) {
        console.error("Failed to parse AI's JSON response:", e, "Raw text:", text);
        // Fallback for non-JSON or malformed responses
        return {
            detectedLanguage: 'en-US',
            chatTitle: null,
            displayText: text || 'Sorry, I am having trouble connecting. Please try again.',
            jsonData: {}
        };
    }
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following text from the language with BCP-47 tag '${from}' to the language with BCP-47 tag '${to}'. Respond with only the translated text and nothing else. Text: "${text}"`,
        config: { 
          temperature: 0 
        }
      });
      return response.text.trim();
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text on error
    }
  }
}
