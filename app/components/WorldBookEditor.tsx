"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getWorldBookEntries } from "@/app/function/worldbook/info";
import { saveWorldBookEntry } from "@/app/function/worldbook/edit";

interface WorldBookEditorProps {
  onClose: () => void;
  characterName: string;
  characterId: string;
  entryId?: string;
}

interface WorldBookEntryContent {
  title: string;
  content: string;
  position?: number;
  depth?: number;
}

export default function WorldBookEditor({ 
  onClose, 
  characterName, 
  characterId,
  entryId, 
}: WorldBookEditorProps) {
  const [entry, setEntry] = useState<WorldBookEntryContent>({
    title: "",
    content: "",
    position: 4,
    depth: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEntry = async () => {
      if (!entryId) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getWorldBookEntries(characterId);
        if (result.success && result.entries) {
          const entryData = result.entries.find(e => e.id === entryId);
          if (entryData) {
            const title = Array.isArray(entryData.keys) && entryData.keys.length > 0 
              ? entryData.keys[0] 
              : "";
              
            setEntry({
              title: title,
              content: entryData.content || "",
              position: typeof entryData.position === "number" ? entryData.position : 4,
              depth: entryData.depth || 1,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load world book entry:", error);
        toast.error("加载世界书条目失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadEntry();
  }, [characterId, entryId]);

  const handleSave = async () => {
    if (!entry.title.trim() || !entry.content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }

    setIsSaving(true);
    try {
      const numericId = entryId ? parseInt(entryId.replace(/\D/g, "")) : undefined;
      
      const result = await saveWorldBookEntry(characterId, {
        id: numericId,
        content: entry.content,
        position: entry.position || 4,
        depth: entry.depth || 1,
        keys: [entry.title],
        selective: false,
        constant: false,
      });

      if (result.success) {
        toast.success("保存成功");
        onClose();
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存世界书条目失败:", error);
      toast.error("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1816]">
        <div className="flex flex-col items-center">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
            <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
          </div>
          <p className="mt-3 text-[#c0a480]">加载世界书条目...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1816] text-[#eae6db]">
      <div className="p-4 border-b border-[#534741] bg-[#252220]">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium text-[#eae6db]">
            <span className="magical-text">世界书编辑器</span> - {characterName}
            <span className="ml-2 text-sm text-[#a18d6f]">
              {entryId ? "(编辑)" : "(新建)"}
            </span>
          </h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 fantasy-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#a18d6f]">标题</label>
            <div className="magical-input">
              <input
                type="text"
                value={entry.title}
                onChange={(e) => setEntry({ ...entry, title: e.target.value })}
                className="w-full bg-[#252220] border border-[#534741] rounded-md px-3 py-2 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#a18d6f] transition-all duration-200"
                placeholder="输入标题"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#a18d6f]">位置</label>
              <select
                value={entry.position}
                onChange={(e) => setEntry({ ...entry, position: Number(e.target.value) })}
                className="w-full bg-[#252220] border border-[#534741] rounded-md px-3 py-2 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#a18d6f]"
              >
                <option value={0}>系统提示开头</option>
                <option value={1}>系统提示之后</option>
                <option value={2}>用户消息开头</option>
                <option value={3}>响应模式声明之后</option>
                <option value={4}>基于深度（默认）</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#a18d6f]">
                深度 <span className="text-xs text-[#a18d6f]/70">(仅位置4有效)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={entry.depth}
                onChange={(e) => setEntry({ ...entry, depth: Number(e.target.value) })}
                className="w-full bg-[#252220] border border-[#534741] rounded-md px-3 py-2 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#a18d6f]"
              />
            </div>
          </div>
          
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-[#a18d6f]">内容</label>
              <span className="text-xs text-[#a18d6f]/70">
                {entry.content.length} 字符
              </span>
            </div>
            <textarea
              value={entry.content}
              onChange={(e) => setEntry({ ...entry, content: e.target.value })}
              className="w-full h-[calc(100vh-400px)] min-h-[300px] bg-[#252220] border border-[#534741] rounded-md px-3 py-2 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#a18d6f] transition-all duration-200 resize-none fantasy-scrollbar"
              placeholder="输入世界书内容..."
            ></textarea>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-[#534741] bg-[#1a1816]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-sm text-[#a18d6f]">
            {entryId ? "编辑世界书条目" : "创建新的世界书条目"}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-[#a18d6f] hover:text-[#eae6db] transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !entry.title.trim() || !entry.content.trim()}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isSaving || !entry.title.trim() || !entry.content.trim()
                  ? "bg-[#534741] text-[#a18d6f] cursor-not-allowed"
                  : "bg-[#a18d6f] text-[#1a1816] hover:bg-[#b8a47c] portal-button"
              }`}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <div className="relative w-4 h-4 mr-2">
                    <div className="absolute inset-0 rounded-full border-2 border-t-[#1a1816] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  </div>
                  保存中...
                </span>
              ) : "保存更改"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
