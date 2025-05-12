"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "../i18n";
import "../styles/fantasy-ui.css";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  openLoginModal: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar, openLoginModal }: SidebarProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(true);
  const [isCreationOpen, setIsCreationOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const { t, language, fontClass } = useLanguage();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUsername = localStorage.getItem("username");

    setIsLoggedIn(loggedIn);
    if (storedUsername) {
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimationComplete(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(false);
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");

    setIsLoggedIn(false);

    router.push("/");
  };

  return (
    <div
      className={`h-full magic-border text-[#d0d0d0] transition-all duration-300 ease-in-out flex flex-col ${isOpen ? "w-72" : "w-16"}`}
      style={{ overflow: "hidden" }}
    >
      <div className="flex justify-between items-center h-16 py-3 px-4">
        <div className={`logo-magic-container transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"}`} style={{ overflow: "hidden", transitionDelay: isOpen ? "0ms" : "0ms" }}>
          <div className="flex items-center h-10">
            <div className="w-[80px] h-10 flex items-center">
              <Image src="/logo.png" alt="Narratium" width={80} height={20} className="object-contain" />
            </div>
            <span className="ml-1 text-lg font-cinzel font-bold tracking-wider h-10 flex items-center -translate-x-3" style={{ fontFamily: "var(--font-cinzel)" }}>
              <span className={"bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)] font-cinzel"}>Narratium</span>
            </span>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
          aria-label={isOpen ? (language === "zh" ? "收起侧边栏" : "Collapse Sidebar") : (language === "zh" ? "展开侧边栏" : "Expand Sidebar")}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </button>
      </div>
      <div className="mx-2 my-1 menu-divider"></div>
      <nav className="mt-3 flex-none px-2">
        <ul className="space-y-1">
          <li className="min-h-[10px]">
            <div className="mb-4">
              <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden" style={{ width: isOpen ? "auto" : "0", maxWidth: isOpen ? "100%" : "0", padding: isOpen ? "0.25rem 0.5rem" : "0", opacity: isOpen ? 1 : 0, whiteSpace: "nowrap", transitionDelay: isOpen ? "0ms" : "0ms" }}>
                <span>{t("sidebar.home")}</span>
                {isOpen && (
                  <button 
                    onClick={() => setIsHomeOpen(!isHomeOpen)}
                    className="w-5 h-5 flex items-center justify-center text-[#8a8a8a] hover:text-amber-400 transition-colors duration-300 login-fantasy-bg rounded-sm"
                    aria-label={isHomeOpen ? t("sidebar.collapseHome") : t("sidebar.expandHome")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isHomeOpen ? "rotate-180" : ""}`}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${isOpen ? (isHomeOpen ? "max-h-20 opacity-100 mb-1" : "max-h-0 opacity-0 mb-0") : "max-h-20 opacity-100 mb-1"}`}>
                {!isOpen ? (
                  <Link href="/" className="menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300">
                    <div className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                  </Link>
                ) : (
                  <Link href="/" className="menu-item flex items-center p-2 rounded-md hover:bg-[#252525] overflow-hidden transition-all duration-300 group">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden" style={{ transitionDelay: isOpen ? "50ms" : "0ms", opacity: isOpen ? 1 : 0 }}>
                      <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                        {isOpen && t("sidebar.home").split("").map((char, index) => (
                          <span 
                            key={index} 
                            className="inline-block transition-all duration-300" 
                            style={{ 
                              opacity: animationComplete ? 1 : 0,
                              transform: animationComplete ? "translateY(0)" : "translateY(8px)",
                              transitionDelay: `${100 + index * 30}ms`,
                              width: char === " " ? "0.25em" : "auto",
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </li>
          
          <li className="min-h-[15px]">
            <div className="mb-4">
              <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden" style={{ width: isOpen ? "auto" : "0", maxWidth: isOpen ? "100%" : "0", padding: isOpen ? "0.25rem 0.5rem" : "0", opacity: isOpen ? 1 : 0, whiteSpace: "nowrap", transitionDelay: isOpen ? "0ms" : "0ms" }}>
                <span>{t("sidebar.creationArea")}</span>
                {isOpen && (
                  <button 
                    onClick={() => setIsCreationOpen(!isCreationOpen)}
                    className="w-5 h-5 flex items-center justify-center text-[#8a8a8a] hover:text-amber-400 transition-colors duration-300 login-fantasy-bg rounded-sm"
                    aria-label={isCreationOpen ? t("sidebar.collapseCreation") : t("sidebar.expandCreation")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isCreationOpen ? "rotate-180" : ""}`}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${isOpen ? (isCreationOpen ? "max-h-20 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0") : "max-h-20 opacity-100 mt-1"}`}>
                {!isOpen ? (
                  <Link href="/characters-cards" className="menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300">
                    <div className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </Link>
                ) : (
                  <Link href="/character-cards" className="menu-item flex items-center p-2 rounded-md hover:bg-[#252525] overflow-hidden transition-all duration-300 group">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden" style={{ transitionDelay: isOpen ? "50ms" : "0ms", opacity: isOpen ? 1 : 0 }}>
                      <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                        {isOpen && t("sidebar.characterCards").split("").map((char, index) => (
                          <span 
                            key={index} 
                            className="inline-block transition-all duration-300" 
                            style={{ 
                              opacity: animationComplete ? 1 : 0,
                              transform: animationComplete ? "translateY(0)" : "translateY(8px)",
                              transitionDelay: `${200 + index * 30}ms`,
                              width: char === " " ? "0.25em" : "auto",
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </li>
        </ul>
      </nav>
      <div className="mt-auto px-2 mb-3 transition-all duration-300 overflow-hidden">
        <div>
          {!isOpen ? (
            <a 
              href="https://github.com/Narratium/Narratium.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="focus:outline-none focus:ring-0 focus:border-transparent menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#1c1c1c] maxWidth: 220px"
            >
              <div className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 
            3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 
            0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416 
            -.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.084-.729.084-.729 
            1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.304 
            3.495.997.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.334-5.466-5.93 
            0-1.31.468-2.38 1.236-3.22-.124-.303-.536-1.523.117-3.176 
            0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.018.005 2.045.138 3.003.404 
            2.29-1.552 3.295-1.23 3.295-1.23.655 1.653.243 2.873.12 3.176 
            .77.84 1.234 1.91 1.234 3.22 0 4.61-2.807 5.625-5.48 5.92.43.37.823 1.096.823 2.21 
            0 1.595-.015 2.88-.015 3.27 0 .32.216.694.825.576 
            C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </div>
            </a>
          ) : (
            <a 
              href="https://github.com/Narratium/Narratium.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="focus:outline-none focus:ring-0 focus:border-transparent menu-item flex items-center justify-center py-1.5 px-3 rounded-md overflow-hidden transition-all duration-300 mx-auto max-w-xs"
              style={{ minWidth: 0 }}
            >
              <div className="flex items-center justify-center transition-all duration-300">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#f4e8c1]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 
              3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 
              0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416 
              -.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.084-.729.084-.729 
              1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.304 
              3.495.997.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.334-5.466-5.93 
              0-1.31.468-2.38 1.236-3.22-.124-.303-.536-1.523.117-3.176 
              0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.003-.404c1.018.005 2.045.138 3.003.404 
              2.29-1.552 3.295-1.23 3.295-1.23.655 1.653.243 2.873.12 3.176 
              .77.84 1.234 1.91 1.234 3.22 0 4.61-2.807 5.625-5.48 5.92.43.37.823 1.096.823 2.21 
              0 1.595-.015 2.88-.015 3.27 0 .32.216.694.825.576 
              C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
                <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden" style={{ transitionDelay: isOpen ? "50ms" : "0ms", opacity: isOpen ? 1 : 0 }}>
                  <span className={`magical-text whitespace-nowrap block text-xs font-medium ${fontClass}`}>
                    {isOpen && "Star us on GitHub".split("").map((char, index) => (
                      <span 
                        key={index} 
                        className="inline-block transition-all duration-300" 
                        style={{ 
                          opacity: animationComplete ? 1 : 0,
                          transform: animationComplete ? "translateY(0)" : "translateY(8px)",
                          transitionDelay: `${250 + index * 30}ms`,
                          width: char === " " ? "0.25em" : "auto",
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
