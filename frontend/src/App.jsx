import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import MedicalRecords from "./pages/records/index";
import ScreeningSchedule from "./pages/ScreeningSchedule";
import SingleRecordDetails from "./pages/records/single-record-details";
import Research from "./pages/Research";
import { useStateContext } from "./context";

function App() {
  // Example of using context if needed, adjust as necessary
  // const { someValue } = useStateContext(); 

  return (
    <div className="app-container"> 
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/medical-records" element={<MedicalRecords />} />
          <Route
            path="/medical-records/:id"
            element={<SingleRecordDetails />}
          />
          <Route 
            path="/medical-records/:patientId/research" 
            element={<Research />} 
          />
          <Route path="/screening-schedules" element={<ScreeningSchedule />} />
          <Route path="/research" element={<Research />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;