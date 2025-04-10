import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import { usePrivy } from "@privy-io/react-auth"; // Remove import
import { useStateContext } from "../context"; // Adjust the import path

import { CustomButton } from ".";
import { menu, search } from "../assets";
import { navlinks } from "../constants";
import { IconHeartHandshake } from "@tabler/icons-react";

const Navbar = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState("dashboard");
  const [toggleDrawer, setToggleDrawer] = useState(false);
  // const { ready, authenticated, login, user, logout } = usePrivy(); // Comment out Privy hook
  const { fetchUsers, users, fetchUserRecords } = useStateContext();

  // Placeholder state for authentication status (replace with actual logic if needed)
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // Placeholder for user data

  const fetchUserInfo = useCallback(async () => {
    // if (!user) return; // Comment out check for Privy user

    try {
      await fetchUsers();
      // Placeholder: Need a way to get the current user's email without Privy
      const currentUserEmail = 'dummy@example.com'; // Replace with actual user email source
      const existingUser = users.find(
        // (u) => u.createdBy === user.email.address, // Use placeholder email
        (u) => u.createdBy === currentUserEmail,
      );
      if (existingUser) {
        // await fetchUserRecords(user.email.address); // Use placeholder email
        await fetchUserRecords(currentUserEmail);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  // }, [user, fetchUsers, users, fetchUserRecords]); // Remove user from dependency array
  }, [fetchUsers, users, fetchUserRecords]); // Keep other dependencies


  useEffect(() => {
    if (authenticated && user) { // Keep check, but relies on placeholder state now
      fetchUserInfo();
    }
  }, [authenticated, user, fetchUserInfo]);

  const handleLoginLogout = useCallback(() => {
    if (authenticated) {
      // logout(); // Comment out Privy logout
      setAuthenticated(false); // Update placeholder state
      setUser(null); // Clear placeholder user
      console.log("User logged out (placeholder)");
    } else {
      // login().then(() => { // Comment out Privy login
      //   if (user) {
      //     fetchUserInfo();
      //   }
      // });
      setAuthenticated(true); // Update placeholder state
      // Simulate setting user data after login (replace with actual logic)
      setUser({ email: { address: 'dummy@example.com' } });
      console.log("User logged in (placeholder)");
      // Manually call fetchUserInfo after simulated login
      fetchUserInfo();
    }
  // }, [authenticated, login, logout, user, fetchUserInfo]); // Remove Privy dependencies
  }, [authenticated, fetchUserInfo]); // Keep necessary dependencies

  return (
    <div className="mb-[35px] flex flex-col-reverse justify-between gap-6 md:flex-row">
      <div className="flex h-[52px] max-w-[458px] flex-row rounded-[100px] bg-[#1c1c24] py-2 pl-4 pr-2 lg:flex-1">
        <input
          type="text"
          placeholder="Search for records"
          className="flex w-full bg-transparent font-epilogue text-[14px] font-normal text-white outline-none placeholder:text-[#4b5264]"
        />
        <div className="flex h-full w-[72px] cursor-pointer items-center justify-center rounded-[20px] bg-[#4acd8d]">
          <img
            src={search}
            alt="search"
            className="h-[15px] w-[15px] object-contain"
          />
        </div>
      </div>

      <div className="hidden flex-row justify-end gap-2 sm:flex">
        <CustomButton
          btnType="button"
          title={authenticated ? "Log Out" : "Log In"}
          styles={authenticated ? "bg-[#1dc071]" : "bg-[#8c6dfd]"}
          handleClick={handleLoginLogout}
        />
      </div>

      <div className="relative flex items-center justify-between sm:hidden">
        <div className="flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-[10px] bg-[#2c2f32]">
          <IconHeartHandshake size={40} color="#1ec070" className="p-2" />
        </div>
        <img
          src={menu}
          alt="menu"
          className="h-[34px] w-[34px] cursor-pointer object-contain"
          onClick={() => setToggleDrawer((prev) => !prev)}
        />
        <div
          className={`absolute left-0 right-0 top-[60px] z-10 bg-[#1c1c24] py-4 shadow-secondary ${
            !toggleDrawer ? "-translate-y-[100vh]" : "translate-y-0"
          } transition-all duration-700`}
        >
          <ul className="mb-4">
            {navlinks.map((link) => (
              <li
                key={link.name}
                className={`flex p-4 ${isActive === link.name && "bg-[#3a3a43]"}`}
                onClick={() => {
                  setIsActive(link.name);
                  setToggleDrawer(false);
                  navigate(link.link);
                }}
              >
                <img
                  src={link.imgUrl}
                  alt={link.name}
                  className={`h-[24px] w-[24px] object-contain ${
                    isActive === link.name ? "grayscale-0" : "grayscale"
                  }`}
                />
                <p
                  className={`ml-[20px] font-epilogue text-[14px] font-semibold ${
                    isActive === link.name ? "text-[#1dc071]" : "text-[#808191]"
                  }`}
                >
                  {link.name}
                </p>
              </li>
            ))}
          </ul>
          <div className="mx-4 flex"></div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
