import React, { useState, useEffect } from "react";
import { IconCirclePlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
// import { usePrivy } from "@privy-io/react-auth"; // Remove import
import { useStateContext } from "../../context/index";
import CreateRecordModal from "./components/create-record-modal"; // Adjust the import path
import RecordCard from "./components/record-card"; // Adjust the import path

const Index = () => {
  const navigate = useNavigate();
  // const { user } = usePrivy(); // Comment out Privy hook
  const {
    records,
    fetchUserRecords,
    createRecord,
    fetchUserByEmail,
    currentUser,
  } = useStateContext();
  const [userRecords, setUserRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Placeholder: Need a way to get the current user's email without Privy
    const currentUserEmail = 'dummy@example.com'; // Replace with actual user email source

    // if (user) { // Comment out check for Privy user
      fetchUserByEmail(currentUserEmail); // Use placeholder email
      fetchUserRecords(currentUserEmail); // Use placeholder email
    // }
  }, [fetchUserByEmail, fetchUserRecords]); // Keep other dependencies

  useEffect(() => {
    setUserRecords(records);
    localStorage.setItem("userRecords", JSON.stringify(records));
  }, [records]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const createFolder = async (foldername) => {
    try {
      if (currentUser) {
        const newRecord = await createRecord({
          userId: currentUser.id,
          recordName: foldername,
          analysisResult: "",
          kanbanRecords: "",
          // createdBy: user.email.address,
          createdBy: currentUser?.createdBy || 'dummy@example.com', // Use context user or placeholder
        });

        if (newRecord) {
          // fetchUserRecords(user.email.address);
          fetchUserRecords(currentUser?.createdBy || 'dummy@example.com'); // Use context user or placeholder
          handleCloseModal();
        }
      }
    } catch (e) {
      console.log(e);
      handleCloseModal();
    }
  };

  const handleNavigate = (name) => {
    const filteredRecords = userRecords.filter(
      (record) => record.recordName === name,
    );
    navigate(`/medical-records/${name}`, {
      state: filteredRecords[0],
    });
  };

  return (
    <div className="flex flex-wrap gap-[26px]">
      <button
        type="button"
        className="mt-6 inline-flex items-center gap-x-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-[#13131a] dark:text-white dark:hover:bg-neutral-800"
        onClick={handleOpenModal}
      >
        <IconCirclePlus />
        Create Record
      </button>

      <CreateRecordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={createFolder}
      />

      <div className="grid w-full gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {userRecords?.map((record) => (
          <RecordCard
            key={record.recordName}
            record={record}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
