import React, { useState } from 'react';
import { generateTreatmentPlan } from '../../utils/geminiAI';

const TreatmentPlanGenerator = ({ patientData, onPlanGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [treatmentPlan, setTreatmentPlan] = useState({
    medications: [],
    appointments: [],
    tests: [],
    recommendations: [],
    support: []
  });

  const generatePlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Generate treatment plan using Gemini AI
      const aiResponse = await generateTreatmentPlan(patientData);
      
      // Parse the AI response into structured data
      const parsedPlan = parseAITreatmentPlan(aiResponse);
      
      setTreatmentPlan(parsedPlan);
      if (onPlanGenerated) {
        onPlanGenerated(parsedPlan);
      }
    } catch (err) {
      setError('Failed to generate treatment plan. Please try again.');
      console.error('Error generating treatment plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseAITreatmentPlan = (aiResponse) => {
    // TODO: Implement more sophisticated parsing based on AI response format
    // This is a basic implementation that can be enhanced
    try {
      // Attempt to parse JSON if the AI returns structured data
      return JSON.parse(aiResponse);
    } catch {
      // If not JSON, create a basic structure
      return {
        medications: [
          {
            name: 'AI-Generated Medication',
            dosage: 'To be determined',
            frequency: 'As prescribed',
            instructions: aiResponse
          }
        ],
        appointments: [
          {
            type: 'Follow-up',
            date: 'To be scheduled',
            purpose: 'Treatment evaluation'
          }
        ],
        recommendations: [
          {
            category: 'General',
            description: aiResponse,
            rationale: 'AI-generated recommendation'
          }
        ]
      };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Treatment Plan Generator</h2>
      
      <div className="mb-6">
        <button
          onClick={generatePlan}
          disabled={isGenerating}
          className={`px-4 py-2 rounded-md ${
            isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        >
          {isGenerating ? 'Generating Plan...' : 'Generate Treatment Plan'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {treatmentPlan.medications.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4">Medications</h3>
          <div className="space-y-4">
            {treatmentPlan.medications.map((med, index) => (
              <div key={index} className="border p-4 rounded">
                <h4 className="font-medium">{med.name}</h4>
                <p>Dosage: {med.dosage}</p>
                <p>Frequency: {med.frequency}</p>
                <p>Instructions: {med.instructions}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {treatmentPlan.appointments.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4">Appointments</h3>
          <div className="space-y-4">
            {treatmentPlan.appointments.map((appt, index) => (
              <div key={index} className="border p-4 rounded">
                <h4 className="font-medium">{appt.type}</h4>
                <p>Date: {appt.date}</p>
                <p>Purpose: {appt.purpose}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {treatmentPlan.recommendations.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            {treatmentPlan.recommendations.map((rec, index) => (
              <div key={index} className="border p-4 rounded">
                <h4 className="font-medium">{rec.category}</h4>
                <p>{rec.description}</p>
                <p className="text-sm text-gray-600">Rationale: {rec.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TreatmentPlanGenerator; 