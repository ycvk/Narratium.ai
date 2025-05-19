"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/i18n";
import { motion } from "framer-motion";
import ImportCharacterModal from "@/app/components/ImportCharacterModal";
import EditCharacterModal from "@/app/components/EditCharacterModal";
import DownloadCharacterModal from "@/app/components/DownloadCharacterModal";
import { CharacterAvatarBackground } from "@/app/components/CharacterAvatarBackground";
import { trackButtonClick } from "@/app/lib/utils/google-analytics";
import { getAllCharacters } from "@/app/function/character/list";
import { deleteCharacter } from "@/app/function/character/delete";
import "@/app/styles/fantasy-ui.css";

interface Character {
  id: string;
  name: string;
  personality: string;
  scenario?: string;
  first_mes?: string;
  creatorcomment?: string;
  created_at: string;
  avatar_path?: string;
}

export default function CharacterCards() {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);

  const fetchCharacters = async () => {
    setIsLoading(true);
    const username = localStorage.getItem("username") || "";
    const language = localStorage.getItem("language") || "zh";
    try {
      const response = await getAllCharacters(language as "zh" | "en", username);

      if (!response) {
        setCharacters([]);
        return;
      }

      setCharacters(response);
    } catch (err) {
      console.error("Error fetching characters:", err);
      setCharacters([]);
    } finally {
      setIsLoading(false);
    }
  };
    
  const handleDeleteCharacter = async (characterId: string) => {
    setIsLoading(true);
    try {
      const response = await deleteCharacter(characterId);

      if (!response.success) {
        throw new Error(t("characterCardsPage.deleteFailed"));
      }

      fetchCharacters();
    } catch (err) {
      console.error("Error deleting character:", err);
      alert(t("characterCardsPage.deleteFailed"));
      setIsLoading(false);
    }
  };

  const handleEditClick = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentCharacter(character);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchCharacters();
    setIsEditModalOpen(false);
    setCurrentCharacter(null);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  return (
    <div className="min-h-screen w-full overflow-auto login-fantasy-bg">
      <div
        className="fixed inset-0 z-0 opacity-35"
        style={{
          backgroundImage: "url('/background_yellow.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div
        className="fixed inset-0 z-1 opacity-45"
        style={{
          backgroundImage: "url('/background_red.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "multiply",
        }}
      />
      
      <div className="flex flex-col items-center justify-start w-full py-8">
        <div className="w-full max-w-4xl relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-between items-center mb-8"
          >
            <h1 className={`text-2xl magical-login-text ${serifFontClass}`}>{t("sidebar.characterCards")}</h1>
            <div className="flex gap-3">
              <motion.div
                className={`portal-button text-[#c0a480] hover:text-[#ffd475] px-4 py-2 border border-[#534741] rounded-lg cursor-pointer ${fontClass}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={() => setIsImportModalOpen(true)}
              >
                {t("characterCardsPage.importCharacter")}
              </motion.div>
              <motion.div
                className={`portal-button text-[#c0a480] hover:text-[#ffd475] px-4 py-2 border border-[#534741] rounded-lg cursor-pointer ${fontClass}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={() => setIsDownloadModalOpen(true)}
              >
                {t("characterCardsPage.downloadCharacter")}
              </motion.div>
            </div>
          </motion.div>

          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center h-64"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
                <div className={`absolute w-full text-center top-20 text-[#c0a480] ${fontClass}`}>{t("characterCardsPage.loading")}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {characters.map((character, index) => (
                <motion.div
                  key={character.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="relative session-card h-full transition-all duration-300 hover:translate-y-[-4px]">
                    <div className="absolute top-2 right-2 flex space-x-1 z-10">
                      <Link
                        href={`/character?id=${character.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                        title={t("characterCardsPage.chat")}
                        aria-label={t("characterCardsPage.chat")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c0a480] hover:text-[#ffd475] transition-colors">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </Link>
                      <button
                        onClick={(e) => {trackButtonClick("edit_character_btn", "编辑角色"); handleEditClick(character, e);}}
                        className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                        title={t("characterCardsPage.edit")}
                        aria-label={t("characterCardsPage.edit")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          trackButtonClick("delete_character_btn", "删除角色");
                          e.stopPropagation();
                          handleDeleteCharacter(character.id);
                        }}
                        className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                        title={t("characterCardsPage.delete")}
                        aria-label={t("characterCardsPage.delete")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  
                    <Link
                      href={`/character?id=${character.id}`}
                      className="block h-full flex flex-col"
                    >

                      <div className="h-80 w-full relative overflow-hidden">
                        {character.avatar_path ? (
                          <CharacterAvatarBackground avatarPath={character.avatar_path} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#252220]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-[#534741]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    
                      <div className="p-4">
                        <h2 className={`text-lg text-[#eae6db] line-clamp-1 magical-text ${serifFontClass}`}>{character.name}</h2>
                        <div className={`text-xs text-[#a18d6f] mt-2 italic ${fontClass}`}>
                          <span className="inline-block mr-1 opacity-70">✨</span>
                          <span className="line-clamp-2">{character.personality}</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && characters.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="session-card p-8 text-center"
            >
              <div className="mb-6 opacity-60">
                <svg className="mx-auto" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 0L38 20H60L42 32L48 52L32 40L16 52L22 32L4 20H26L32 0Z" fill="#f9c86d" fillOpacity="0.3" />
                </svg>
              </div>
              <p className={`text-[#eae6db] mb-6 ${serifFontClass}`}>{t("characterCardsPage.noCharacters")}</p>
              <motion.div
                className={`portal-button inline-block text-[#c0a480] hover:text-[#ffd475] px-5 py-2 border border-[#534741] rounded-lg cursor-pointer ${fontClass}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={() => setIsImportModalOpen(true)}
              >
                {t("characterCardsPage.importFirstCharacter")}
              </motion.div>
            </motion.div>
          )}
        </div>

        <ImportCharacterModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={fetchCharacters}
        />
        <DownloadCharacterModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          onImport={fetchCharacters}
        />
        {currentCharacter && (
          <EditCharacterModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            characterId={currentCharacter.id}
            characterData={{
              name: currentCharacter.name,
              personality: currentCharacter.personality,
              scenario: currentCharacter.scenario,
              first_mes: currentCharacter.first_mes,
              creatorcomment: currentCharacter.creatorcomment,
              avatar_path: currentCharacter.avatar_path,
            }}
            onSave={handleEditSuccess}
          />
        )}
      </div>
    </div>
  );
}
