import React, { useState } from 'react';

const PatientAssessment = () => {
  const [formData, setFormData] = useState({
    medicalHistory: {
      previousDiagnoses: '',
      surgeries: '',
      medications: '',
      allergies: '',
    },
    currentStatus: {
      diagnosis: '',
      stage: '',
      currentTreatments: '',
      symptoms: '',
    },
    comorbidities: {
      conditions: '',
      medications: '',
      impact: '',
    },
    socialDeterminants: {
      livingSituation: '',
      supportSystem: '',
      transportation: '',
      financialConcerns: '',
    },
    familyHistory: {
      cancerHistory: '',
      otherConditions: '',
    },
    lifestyle: {
      diet: '',
      exercise: '',
      smoking: '',
      alcohol: '',
      stressLevel: '',
    }
  });

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Patient Assessment</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Medical History Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Medical History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Previous Diagnoses</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.medicalHistory.previousDiagnoses}
                onChange={(e) => handleChange('medicalHistory', 'previousDiagnoses', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Surgeries</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.medicalHistory.surgeries}
                onChange={(e) => handleChange('medicalHistory', 'surgeries', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Current Status Section */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.currentStatus.diagnosis}
                onChange={(e) => handleChange('currentStatus', 'diagnosis', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stage</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.currentStatus.stage}
                onChange={(e) => handleChange('currentStatus', 'stage', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Submit Assessment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientAssessment; 