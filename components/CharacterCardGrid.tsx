/**
 * Character Card Grid Component (Performance Optimized)
 * 
 * This component provides a grid layout display for character cards with the following features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Animated card appearance with staggered loading
 * - Interactive card tilt effect with glare
 * - Quick action buttons for chat, edit, and delete
 * - Avatar display with fallback
 * - Character name and personality preview
 * - Pagination for performance with large datasets
 * 
 * Performance improvements:
 * - Pagination to limit DOM nodes
 * - Memoized pagination calculations
 * - React.memo for prop comparison
 */

import React, { useState, useMemo, memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { useLanguage } from "@/app/i18n";
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import { trackButtonClick } from "@/utils/google-analytics";

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

interface CharacterCardGridProps {
  characters: Character[];
  onEditClick: (character: Character, e: React.MouseEvent) => void;
  onDeleteClick: (characterId: string) => void;
  itemsPerPage?: number;
}

const CharacterCardGrid: React.FC<CharacterCardGridProps> = memo(({
  characters,
  onEditClick,
  onDeleteClick,
  itemsPerPage = 12,
}) => {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);

  // Memoize pagination calculations to avoid unnecessary recalculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(characters.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCharacters = characters.slice(startIndex, endIndex);
    
    return {
      totalPages,
      paginatedCharacters,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [characters, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {paginationData.paginatedCharacters.map((character, index) => (
          <motion.div
            key={character.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="scale-[0.85]"
          >
            <Tilt
              tiltMaxAngleX={-15}
              tiltMaxAngleY={-15}
              glareEnable={true}
              glareMaxOpacity={0.1}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="8px"
              scale={1.02}
              transitionSpeed={2000}
              className="h-full"
            >
              <div className="relative session-card h-full transition-all duration-300">
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
                    onClick={(e) => {trackButtonClick("edit_character_btn", "编辑角色"); onEditClick(character, e);}}
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
                      onDeleteClick(character.id);
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
                  <div className="relative w-full overflow-hidden rounded aspect-[4/5]">
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
            </Tilt>
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination Controls */}
      {paginationData.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!paginationData.hasPrev}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              paginationData.hasPrev 
                ? "bg-[#252220] text-[#f4e8c1] hover:bg-[#3a2a2a] border border-[#534741]" 
                : "bg-[#1a1a1a] text-[#666] cursor-not-allowed border border-[#333]"
            }`}
          >
            {t("pagination.previous") || "Previous"}
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  page === currentPage
                    ? "bg-[#f9c86d] text-[#1a1a1a] font-medium"
                    : "bg-[#252220] text-[#f4e8c1] hover:bg-[#3a2a2a] border border-[#534741]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!paginationData.hasNext}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              paginationData.hasNext 
                ? "bg-[#252220] text-[#f4e8c1] hover:bg-[#3a2a2a] border border-[#534741]" 
                : "bg-[#1a1a1a] text-[#666] cursor-not-allowed border border-[#333]"
            }`}
          >
            {t("pagination.next") || "Next"}
          </button>
        </div>
      )}

      {/* Results info */}
      <div className="text-center text-sm text-[#a18d6f]">
        {t("pagination.showing") || "Showing"} {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, characters.length)} {t("pagination.of") || "of"} {characters.length} {t("pagination.characters") || "characters"}
      </div>
    </div>
  );
});

CharacterCardGrid.displayName = "CharacterCardGrid";

export default CharacterCardGrid;
