import React, { useState } from 'react';
import { analyzeSideEffects, assessQualityOfLife, processPatientFeedback } from '../../utils/geminiAI';

const ProgressTracker = ({ treatmentPlan }) => {
  const [progress, setProgress] = useState({
    milestones: [],
    sideEffects: [],
    qualityOfLife: {
      physical: 0,
      emotional: 0,
      social: 0,
      functional: 0
    },
    patientFeedback: []
  });

  const [aiInsights, setAiInsights] = useState({
    sideEffects: null,
    qualityOfLife: null,
    feedback: null
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSideEffectReport = async (effect) => {
    const newEffect = {
      ...effect,
      date: new Date().toISOString()
    };

    setProgress(prev => ({
      ...prev,
      sideEffects: [...prev.sideEffects, newEffect]
    }));

    // Analyze side effects using AI
    try {
      setIsAnalyzing(true);
      const analysis = await analyzeSideEffects([...progress.sideEffects, newEffect]);
      setAiInsights(prev => ({
        ...prev,
        sideEffects: analysis
      }));
    } catch (error) {
      console.error('Error analyzing side effects:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQualityOfLifeUpdate = async (category, value) => {
    const updatedQualityOfLife = {
      ...progress.qualityOfLife,
      [category]: value
    };

    setProgress(prev => ({
      ...prev,
      qualityOfLife: updatedQualityOfLife
    }));

    // Analyze quality of life using AI
    try {
      setIsAnalyzing(true);
      const analysis = await assessQualityOfLife(updatedQualityOfLife);
      setAiInsights(prev => ({
        ...prev,
        qualityOfLife: analysis
      }));
    } catch (error) {
      console.error('Error analyzing quality of life:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePatientFeedback = async (feedback) => {
    const newFeedback = {
      ...feedback,
      date: new Date().toISOString()
    };

    setProgress(prev => ({
      ...prev,
      patientFeedback: [...prev.patientFeedback, newFeedback]
    }));

    // Process feedback using AI
    try {
      setIsAnalyzing(true);
      const analysis = await processPatientFeedback([...progress.patientFeedback, newFeedback]);
      setAiInsights(prev => ({
        ...prev,
        feedback: analysis
      }));
    } catch (error) {
      console.error('Error processing feedback:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Progress Tracking</h2>

      {/* Side Effects Tracking */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Side Effects</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleSideEffectReport({
            type: formData.get('type'),
            severity: formData.get('severity'),
            notes: formData.get('notes')
          });
          e.target.reset();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <input
              type="text"
              name="type"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Severity (1-10)</label>
            <input
              type="number"
              name="severity"
              min="1"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className={`px-4 py-2 rounded-md ${
              isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Report Side Effect'}
          </button>
        </form>

        {aiInsights.sideEffects && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800">AI Analysis</h4>
            <p className="mt-2 text-blue-700">{aiInsights.sideEffects}</p>
          </div>
        )}
      </section>

      {/* Quality of Life Assessment */}
      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold mb-4">Quality of Life Assessment</h3>
        <div className="space-y-4">
          {Object.entries(progress.qualityOfLife).map(([category, value]) => (
            <div key={category}>
              <label className="block text-sm font-medium text-gray-700 capitalize">
                {category} Well-being (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={value}
                onChange={(e) => handleQualityOfLifeUpdate(category, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          ))}
        </div>

        {aiInsights.qualityOfLife && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800">AI Recommendations</h4>
            <p className="mt-2 text-green-700">{aiInsights.qualityOfLife}</p>
          </div>
        )}
      </section>

      {/* Patient Feedback */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Patient Feedback</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handlePatientFeedback({
            type: formData.get('feedbackType'),
            content: formData.get('content')
          });
          e.target.reset();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type of Feedback</label>
            <select
              name="feedbackType"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="concern">Concern</option>
              <option value="improvement">Improvement</option>
              <option value="question">Question</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Feedback</label>
            <textarea
              name="content"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className={`px-4 py-2 rounded-md ${
              isAnalyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            {isAnalyzing ? 'Processing...' : 'Submit Feedback'}
          </button>
        </form>

        {aiInsights.feedback && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800">AI Insights</h4>
            <p className="mt-2 text-purple-700">{aiInsights.feedback}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProgressTracker; 