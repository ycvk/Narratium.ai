"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getWorldBookEntries } from "@/app/function/worldbook/info";
import { deleteWorldBookEntry } from "@/app/function/worldbook/delete";
import { saveAdvancedWorldBookEntry } from "@/app/function/worldbook/advanced-edit";
import { bulkToggleWorldBookEntries } from "@/app/function/worldbook/bulk-operations";
import { getWorldBookSettings } from "@/app/function/worldbook/settings";
import { useLanguage } from "@/app/i18n";
import WorldBookEntryEditor from "./WorldBookEntryEditor";
import "@/app/styles/fantasy-ui.css";
import React from "react";
import { v4 as uuidv4 } from "uuid";

interface WorldBookEditorProps {
  onClose: () => void;
  characterName: string;
  characterId: string;
}

interface WorldBookEntryData {
  entry_id: string;
  id?: number;
  content: string;
  keys: string[];
  secondary_keys: string[];
  selective: boolean;
  constant: boolean;
  position: string | number;
  insertion_order: number;
  enabled: boolean;
  use_regex: boolean;
  depth: number;
  comment: string;
  tokens?: number;
  extensions?: any;
  primaryKey: string;
  keyCount: number;
  secondaryKeyCount: number;
  contentLength: number;
  isActive: boolean;
  lastUpdated: number;
}

interface EditingEntry {
  entry_id: string;
  id?: number;
  comment: string;
  keys: string[];
  secondary_keys: string[];
  content: string;
  position: number;
  depth: number;
  enabled: boolean;
  use_regex: boolean;
  selective: boolean;
  constant: boolean;
  insertion_order: number;
}

export default function WorldBookEditor({ 
  onClose, 
  characterName, 
  characterId,
}: WorldBookEditorProps) {
  const { t, fontClass,serifFontClass } = useLanguage();
  const [entries, setEntries] = useState<WorldBookEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState({
    enabled: true,
    contextWindow: 5,
  });

  useEffect(() => {
    loadWorldBookData();
    loadSettings();
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, [characterId]);

  const loadWorldBookData = async () => {
    try {
      setIsLoading(true);
      const result = await getWorldBookEntries(characterId);
      if (result.success) {
        setEntries(result.entries || []);
      }
    } catch (error) {
      console.error("Failed to load world book entries:", error);
      toast.error(t("worldBook.loading"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await getWorldBookSettings(characterId);
      if (result.success) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.id?.toString() || "")));
    }
  };

  const handleBulkToggle = async (enabled: boolean) => {
    if (selectedEntries.size === 0) {
      toast.error(t("worldBook.selectEntriesFirst"));
      return;
    }

    try {
      const result = await bulkToggleWorldBookEntries(
        characterId,
        Array.from(selectedEntries),
        enabled,
      );
      
      if (result.success) {
        const action = enabled ? t("worldBook.bulkToggleEnabled") : t("worldBook.bulkToggleDisabled");
        toast.success(t("worldBook.bulkToggleSuccess").replace("{count}", selectedEntries.size.toString()).replace("{action}", action));
        await loadWorldBookData();
        setSelectedEntries(new Set());
      }
    } catch (error) {
      console.error("Bulk toggle failed:", error);
      toast.error(t("worldBook.bulkOperationFailed"));
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm(t("worldBook.confirmDelete"))) return;

    try {
      const result = await deleteWorldBookEntry(characterId, entryId);
      if (result.success) {
        toast.success(t("worldBook.deleteSuccess"));
        await loadWorldBookData();
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(t("worldBook.deleteFailed"));
    }
  };

  const handleEditEntry = (entry?: WorldBookEntryData) => {
    if (entry) {
      setEditingEntry({
        entry_id: entry.entry_id,
        id: entry.id,
        comment: entry.comment || "",
        keys: entry.keys || [],
        secondary_keys: entry.secondary_keys || [],
        content: entry.content || "",
        position: typeof entry.position === "number" ? entry.position : 4,
        depth: entry.depth || 1,
        enabled: entry.enabled !== false,
        use_regex: entry.use_regex || false,
        selective: entry.selective || false,
        constant: entry.constant || false,
        insertion_order: entry.insertion_order || 0,
      });
    } else {
      setEditingEntry({
        entry_id: `entry_${uuidv4()}`,
        id: entries.length + 1,
        comment: "",
        keys: [""],
        secondary_keys: [],
        content: "",
        position: 4,
        depth: 1,
        enabled: true,
        use_regex: false,
        selective: false,
        constant: false,
        insertion_order: 0,
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!editingEntry) return;

    if (!editingEntry.content.trim()) {
      toast.error(t("worldBook.contentRequired"));
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveAdvancedWorldBookEntry(characterId, {
        entry_id: editingEntry.entry_id,
        content: editingEntry.content,
        keys: editingEntry.keys.filter(k => k.trim()),
        secondary_keys: editingEntry.secondary_keys.filter(k => k.trim()),
        comment: editingEntry.comment,
        position: editingEntry.position,
        depth: editingEntry.depth,
        enabled: editingEntry.enabled,
        use_regex: editingEntry.use_regex,
        selective: editingEntry.selective,
        constant: editingEntry.constant,
        insertion_order: editingEntry.insertion_order,
      });

      if (result.success) {
        toast.success(t("worldBook.saveSuccess"));
        setIsEditModalOpen(false);
        setEditingEntry(null);
        await loadWorldBookData();
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(t("worldBook.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRowExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedRows(newExpanded);
  };

  const getPositionText = (position: string | number) => {
    const positionMap: Record<string | number, string> = {
      0: t("worldBook.positionOptions.systemPromptStart"),
      1: t("worldBook.positionOptions.afterSystemPrompt"), 
      2: t("worldBook.positionOptions.userMessageStart"),
      3: t("worldBook.positionOptions.afterResponseMode"),
      4: t("worldBook.positionOptions.basedOnDepth"),
    };
    return positionMap[position] || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center breathing-bg">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
          </div>
          <p className="mt-4 text-[#c0a480] magical-text">{t("worldBook.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col breathing-bg text-[#eae6db]">
      <div className="p-3 border-b border-[#534741] bg-[#252220] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex justify-between items-center min-h-[2rem]">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <h2 className="text-lg font-medium text-[#eae6db] flex-shrink-0">
              <span className={`magical-text bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 ${serifFontClass}`}>
                {t("worldBook.title")}
              </span>
              <span className={`ml-2 text-sm text-[#a18d6f] ${serifFontClass} truncate`}>- {characterName}</span>
            </h2>
            <div className={`hidden md:flex items-center space-x-2 text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="whitespace-nowrap">{t("worldBook.totalCount")} {entries.length}</span>
              <span>•</span>
              <span className="text-emerald-400 whitespace-nowrap">{t("worldBook.enabledCount")} {entries.filter(e => e.isActive).length}</span>
              <span>•</span>
              <span className="text-rose-400 whitespace-nowrap">{t("worldBook.disabledCount")} {entries.filter(e => !e.isActive).length}</span>
            </div>
            <div className={`md:hidden flex items-center space-x-1 text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="bg-[#1a1816] px-2 py-1 rounded border border-[#534741] whitespace-nowrap">
                {entries.length} / {entries.filter(e => e.isActive).length} / {entries.filter(e => !e.isActive).length}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333] group flex-shrink-0 ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-[#534741] bg-[#1a1816]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={() => handleEditEntry()}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-md transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-emerald-500/25 group flex-shrink-0"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {t("worldBook.createEntry")}
              </span>
            </button>
            
            {selectedEntries.size > 0 && (
              <div className="flex items-center space-x-2 flex-wrap">
                <button
                  onClick={() => handleBulkToggle(true)}
                  className={`px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-md transition-all duration-300 text-xs font-medium shadow-md hover:shadow-blue-500/25 ${serifFontClass} flex-shrink-0`}
                >
                  {t("worldBook.bulkEnable")}
                </button>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className={`px-2.5 py-1.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-md transition-all duration-300 text-xs font-medium shadow-md hover:shadow-orange-500/25 ${serifFontClass} flex-shrink-0`}
                >
                  {t("worldBook.bulkDisable")}
                </button>
                <span className="text-xs text-[#a18d6f] bg-[#252220] px-2 py-1 rounded border border-[#534741] whitespace-nowrap">
                  {t("worldBook.selectedItems")} {selectedEntries.size} {t("worldBook.items")}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-[#a18d6f] bg-[#252220] px-2 py-1 rounded border border-[#534741] flex-shrink-0">
            <span className="whitespace-nowrap">{t("worldBook.contextWindow")} {settings.contextWindow}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto fantasy-scrollbar pb-15">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-[#252220] border-b border-[#534741] z-10">
              <tr>
                <th className="w-12 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === entries.length && entries.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-[#a18d6f] focus:ring-[#a18d6f] focus:ring-1"
                  />
                </th>
                <th className="w-8 p-3"></th>
                <th className={`w-32 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.status")}</th>
                <th className={`w-32 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.comment")}</th>
                <th className={`w-32 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.keywords")}</th>
                <th className={`w-28 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.position")}</th>
                <th className={`w-16 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.depth")}</th>
                <th className={`w-20 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.characterCount")}</th>
                <th className={`w-20 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.priority")}</th>
                <th className={`w-20 p-3 text-left text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <React.Fragment key={entry.entry_id}>
                  <tr 
                    className={`border-b border-[#534741] hover:bg-[#252220] transition-all duration-300 group ${
                      selectedEntries.has(entry.entry_id) ? "bg-[#252220]" : ""
                    }`}
                    style={{
                      opacity: animationComplete ? 1 : 0,
                      transform: animationComplete ? "translateY(0)" : "translateY(20px)",
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.entry_id)}
                        onChange={() => handleSelectEntry(entry.entry_id)}
                        className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-[#a18d6f] focus:ring-[#a18d6f] focus:ring-1"
                      />
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleRowExpansion(entry.entry_id)}
                        className="w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333]"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className={`transition-transform duration-300 ${expandedRows.has(entry.entry_id) ? "rotate-90" : ""}`}
                        >
                          <path d="M9 18l6-6-6-6"></path>
                        </svg>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                            entry.isActive 
                              ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-green-500/30 hover:border-emerald-400/50" 
                              : "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 border border-rose-500/30 hover:from-rose-500/30 hover:to-red-500/30 hover:border-rose-400/50"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              entry.isActive ? "bg-emerald-400" : "bg-rose-400"
                            } opacity-80`}></span>
                            {entry.isActive ? t("worldBook.enabled") : t("worldBook.disabled")}
                          </span>
                        </div>
                        {entry.constant && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border border-purple-500/30 hover:from-purple-500/30 hover:to-fuchsia-500/30 hover:border-purple-400/50 transition-all duration-300">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1.5 opacity-80"></span>
                            {t("worldBook.constant")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-[#eae6db] max-w-xs truncate">
                      {entry.comment || entry.primaryKey || t("worldBook.noComment")}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.keys.slice(0, 2).map((key, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-full font-medium hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-400/50 transition-all duration-200 cursor-default"
                            title={key}
                          >
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 opacity-80"></span>
                            <span className="truncate max-w-[80px]">{key}</span>
                          </span>
                        ))}
                        {entry.keys.length > 2 && (
                          <span 
                            className="inline-flex items-center text-xs bg-gradient-to-r from-slate-600/20 to-slate-700/20 border border-slate-500/30 text-slate-300 px-2 py-1 rounded-full font-medium cursor-default"
                            title={`还有 ${entry.keys.length - 2} 个关键词: ${entry.keys.slice(2).join(", ")}`}
                          >
                            +{entry.keys.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-[#c0a480] whitespace-nowrap overflow-hidden">
                      <span className="block truncate" title={getPositionText(entry.position)}>
                        {getPositionText(entry.position)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-[#c0a480]">
                      {entry.depth}
                    </td>
                    <td className="p-3 text-sm text-[#c0a480]">
                      {entry.contentLength}
                    </td>
                    <td className="p-3 text-sm text-[#c0a480]">
                      {entry.insertion_order}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("worldBook.edit")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.entry_id)}
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("worldBook.delete")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedRows.has(entry.entry_id) && (
                    <tr className="border-b border-[#534741] bg-[#1a1816]">
                      <td colSpan={10} className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-[#a18d6f] mb-2">{t("worldBook.contentPreview")}</h4>
                            <div className="bg-[#252220] border border-[#534741] rounded-md p-3 text-sm text-[#eae6db] max-h-32 overflow-y-auto fantasy-scrollbar">
                              {entry.content || t("worldBook.noContent")}
                            </div>
                          </div>
                          
                          {entry.secondary_keys.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-[#a18d6f] mb-2">{t("worldBook.secondaryKeywords")}</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.secondary_keys.map((key, i) => (
                                  <span 
                                    key={i} 
                                    className="inline-flex items-center text-xs bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-200 px-2.5 py-1 rounded-full font-medium hover:from-blue-500/30 hover:to-indigo-500/30 hover:border-blue-400/50 transition-all duration-200 cursor-default"
                                    title={key}
                                  >
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 opacity-80"></span>
                                    <span className="truncate max-w-[100px]">{key}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-[#a18d6f]">{t("worldBook.selectiveMatching")}</span>
                              <span className="ml-2 text-[#eae6db]">{entry.selective ? t("worldBook.yes") : t("worldBook.no")}</span>
                            </div>
                            <div>
                              <span className="text-[#a18d6f]">{t("worldBook.tokenCount")}</span>
                              <span className="ml-2 text-[#eae6db]">{entry.tokens || t("worldBook.notCalculated")}</span>
                            </div>
                            <div>
                              <span className="text-[#a18d6f]">{t("worldBook.lastUpdated")}</span>
                              <span className="ml-2 text-[#eae6db]">
                                {new Date(entry.lastUpdated).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#a18d6f]">{t("worldBook.totalKeywords")}</span>
                              <span className="ml-2 text-[#eae6db]">{entry.keyCount + entry.secondaryKeyCount}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-[#a18d6f]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <p className="text-lg mb-2">{t("worldBook.noEntries")}</p>
              <p className="text-sm opacity-70">{t("worldBook.noEntriesDescription")}</p>
            </div>
          )}
        </div>
      </div>
      
      <WorldBookEntryEditor
        isOpen={isEditModalOpen}
        editingEntry={editingEntry}
        isSaving={isSaving}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        onEntryChange={setEditingEntry}
      />
    </div>
  );
}
