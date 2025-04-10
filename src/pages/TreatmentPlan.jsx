import React, { useState } from 'react';
import PatientAssessment from '../components/treatment/PatientAssessment';
import TreatmentPlanGenerator from '../components/treatment/TreatmentPlanGenerator';
import ProgressTracker from '../components/treatment/ProgressTracker';

const TreatmentPlan = () => {
  const [currentStep, setCurrentStep] = useState('assessment');
  const [patientData, setPatientData] = useState(null);
  const [treatmentPlan, setTreatmentPlan] = useState(null);

  const handleAssessmentComplete = (data) => {
    setPatientData(data);
    setCurrentStep('generator');
  };

  const handlePlanGenerated = (plan) => {
    setTreatmentPlan(plan);
    setCurrentStep('tracking');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Navigation Steps */}
        <div className="mb-8">
          <nav className="flex items-center justify-center">
            <ol className="flex items-center space-x-4">
              <li>
                <button
                  onClick={() => setCurrentStep('assessment')}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === 'assessment'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Assessment
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentStep('generator')}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === 'generator'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  disabled={!patientData}
                >
                  Treatment Plan
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentStep('tracking')}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === 'tracking'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  disabled={!treatmentPlan}
                >
                  Progress Tracking
                </button>
              </li>
            </ol>
          </nav>
        </div>

        {/* Content Area */}
        <div className="bg-white shadow rounded-lg">
          {currentStep === 'assessment' && (
            <PatientAssessment onComplete={handleAssessmentComplete} />
          )}
          {currentStep === 'generator' && patientData && (
            <TreatmentPlanGenerator
              patientData={patientData}
              onPlanGenerated={handlePlanGenerated}
            />
          )}
          {currentStep === 'tracking' && treatmentPlan && (
            <ProgressTracker treatmentPlan={treatmentPlan} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TreatmentPlan; 