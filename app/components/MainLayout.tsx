"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ModelSidebar from "./ModelSidebar";
import SettingsDropdown from "./SettingsDropdown";
import LoginModal from "./LoginModal";
import "../styles/fantasy-ui.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelSidebarOpen, setModelSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleModelSidebar = () => {
    setModelSidebarOpen(!modelSidebarOpen);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden fantasy-bg relative">
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      <div className="fixed left-0 top-0 h-full z-10">
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar} 
          openLoginModal={() => setIsLoginModalOpen(true)} 
        />
      </div>
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? "ml-72" : "ml-16"
        } ${modelSidebarOpen ? "mr-64" : "mr-0"
        }`}
      >
        <div className="h-full relative">
          <div className="absolute top-4 right-4 z-[999]">
            <SettingsDropdown toggleModelSidebar={toggleModelSidebar} />
          </div>

          {children}
        </div>
      </main>

      <div className="fixed right-0 top-0 h-full z-40">
        <ModelSidebar isOpen={modelSidebarOpen} toggleSidebar={toggleModelSidebar} />
      </div>
    </div>
  );
}
