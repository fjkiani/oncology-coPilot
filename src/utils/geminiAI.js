import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateTreatmentPlan = async (patientData) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Based on the following patient data, generate a comprehensive cancer treatment plan:
    ${JSON.stringify(patientData, null, 2)}
    
    Consider:
    1. Current diagnosis and stage
    2. Medical history and comorbidities
    3. Social determinants of health
    4. Family history
    5. Lifestyle factors
    
    Generate a structured treatment plan including:
    1. Medications and dosages
    2. Treatment schedule
    3. Follow-up appointments
    4. Supportive care recommendations
    5. Lifestyle modifications
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const analyzeSideEffects = async (sideEffectData) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Analyze these reported side effects and provide recommendations:
    ${JSON.stringify(sideEffectData, null, 2)}
    
    Consider:
    1. Severity of symptoms
    2. Potential interactions
    3. Management strategies
    4. When to seek medical attention
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const assessQualityOfLife = async (qualityOfLifeData) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Analyze this quality of life assessment and provide recommendations:
    ${JSON.stringify(qualityOfLifeData, null, 2)}
    
    Consider:
    1. Physical well-being
    2. Emotional state
    3. Social support
    4. Functional abilities
    5. Potential interventions
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const processPatientFeedback = async (feedback) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Process this patient feedback and provide actionable insights:
    ${JSON.stringify(feedback, null, 2)}
    
    Consider:
    1. Type of feedback
    2. Emotional tone
    3. Urgency level
    4. Potential interventions
    5. Follow-up actions
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const summarizePatientRecord = async (patientData) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Act as a medical professional reviewing a patient's electronic health record.
    Based *only* on the following structured patient data, generate a concise clinical summary suitable for a quick overview during a clinical encounter.

    Patient Data:
    ${JSON.stringify(patientData, null, 2)}

    Instructions for the summary:
    1. Start with a brief statement including patient name, age (calculate from DOB if possible, current year assumed to be ${new Date().getFullYear()}), and primary diagnosis with status.
    2. Briefly mention relevant active comorbidities from medical history.
    3. Summarize key findings from the most recent progress notes.
    4. Highlight any critical or significantly abnormal recent lab results (mention specific values and flags).
    5. Summarize key findings and recommendations from recent imaging reports.
    6. Note any significant events or concerning trends reported in patient-generated health data, if available.
    7. Conclude with the patient's overall current status or immediate next steps if clearly stated in the notes (e.g., awaiting biopsy, scheduled for cycle 2).
    8. Keep the summary concise, objective, and focused on clinically relevant information.
    9. Do not infer information not present in the provided data.
  `;

  try {
    console.log("Sending summarization prompt to Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();
    console.log("Received summary from Gemini.");
    return summary;
  } catch (error) {
    console.error("Error generating patient summary:", error);
    return "Error generating summary. Please check the console."; 
  }
}; 