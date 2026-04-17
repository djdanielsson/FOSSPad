import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Workspace, NotebookInfo, SectionInfo, PageInfo, ActiveLocation } from "../types";
import * as api from "../utils/api";

interface WorkspaceContextType {
  workspace: Workspace | null;
  active: ActiveLocation;
  content: string;
  dirty: boolean;
  loading: boolean;
  setWorkspacePath: (path: string) => void;
  refresh: () => Promise<void>;
  selectNotebook: (name: string) => void;
  selectSection: (name: string) => void;
  selectPage: (page: PageInfo) => void;
  setContent: (content: string) => void;
  saveCurrentPage: () => Promise<void>;
  addNotebook: (name: string, color: string) => Promise<void>;
  addSection: (name: string) => Promise<void>;
  addPage: (name: string) => Promise<void>;
  removePage: () => Promise<void>;
  removeSection: () => Promise<void>;
  removeNotebook: () => Promise<void>;
  doRenamePage: (newName: string) => Promise<void>;
  importFiles: (paths: string[]) => Promise<void>;
  activeNotebook: NotebookInfo | null;
  activeSection: SectionInfo | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>(null!);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [active, setActive] = useState<ActiveLocation>({ notebook: null, section: null, page: null });
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsPathRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(async (): Promise<void> => {
    if (!wsPathRef.current) return;
    const ws = await api.loadWorkspace(wsPathRef.current);
    setWorkspace(ws);
  }, []);

  const setWorkspacePath = useCallback((path: string) => {
    wsPathRef.current = path;
    refresh();
  }, [refresh]);

  const saveCurrentPage = useCallback(async () => {
    if (!wsPathRef.current || !active.notebook || !active.section || !active.page) return;
    const nbSlug = workspace?.notebooks.find(n => n.name === active.notebook);
    if (!nbSlug) return;
    const folderName = findNotebookFolder(workspace!, active.notebook);
    if (!folderName) return;
    await api.savePage(wsPathRef.current, folderName, active.section, active.page.filename, content);
    setDirty(false);
  }, [active, content, workspace]);

  const handleSetContent = useCallback((newContent: string) => {
    setContent(newContent);
    setDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setDirty(prev => {
        return prev;
      });
    }, 2000);
  }, []);

  useEffect(() => {
    if (dirty) {
      const timer = setTimeout(() => { saveCurrentPage(); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dirty, content, saveCurrentPage]);

  const selectNotebook = useCallback((name: string) => {
    setActive(prev => {
      if (prev.notebook === name) return prev;
      const nb = workspace?.notebooks.find(n => n.name === name);
      const firstSection = nb?.sections[0]?.name ?? null;
      const firstPage = nb?.sections[0]?.pages[0] ?? null;
      return { notebook: name, section: firstSection, page: firstPage };
    });
  }, [workspace]);

  const selectSection = useCallback((name: string) => {
    setActive(prev => {
      if (prev.section === name) return prev;
      const nb = workspace?.notebooks.find(n => n.name === prev.notebook);
      const sec = nb?.sections.find(s => s.name === name);
      return { ...prev, section: name, page: sec?.pages[0] ?? null };
    });
  }, [workspace]);

  const selectPage = useCallback((page: PageInfo) => {
    setActive(prev => ({ ...prev, page }));
  }, []);

  useEffect(() => {
    if (!active.page || !active.section || !active.notebook || !workspace) {
      setContent("");
      return;
    }
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    setLoading(true);
    api.readPage(wsPathRef.current, folderName, active.section, active.page.filename)
      .then(c => { setContent(c); setDirty(false); })
      .catch(() => setContent(""))
      .finally(() => setLoading(false));
  }, [active.page?.filename, active.section, active.notebook, workspace?.path]);

  const addNotebook = useCallback(async (name: string, color: string) => {
    await api.createNotebook(wsPathRef.current, name, color);
    await refresh();
  }, [refresh]);

  const addSection = useCallback(async (name: string) => {
    if (!active.notebook || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    await api.createSection(wsPathRef.current, folderName, name);
    await refresh();
    setActive(prev => ({ ...prev, section: name }));
  }, [active.notebook, workspace, refresh]);

  const addPage = useCallback(async (name: string) => {
    if (!active.notebook || !active.section || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    const filename = await api.createPage(wsPathRef.current, folderName, active.section, name);
    await refresh();
    setActive(prev => ({ ...prev, page: { name, filename } }));
  }, [active.notebook, active.section, workspace, refresh]);

  const removePage = useCallback(async () => {
    if (!active.notebook || !active.section || !active.page || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    await api.deletePage(wsPathRef.current, folderName, active.section, active.page.filename);
    await refresh();
    setActive(prev => ({ ...prev, page: null }));
  }, [active, workspace, refresh]);

  const removeSection = useCallback(async () => {
    if (!active.notebook || !active.section || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    await api.deleteSection(wsPathRef.current, folderName, active.section);
    await refresh();
    setActive(prev => ({ ...prev, section: null, page: null }));
  }, [active, workspace, refresh]);

  const removeNotebook = useCallback(async () => {
    if (!active.notebook || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    await api.deleteNotebook(wsPathRef.current, folderName);
    await refresh();
    setActive({ notebook: null, section: null, page: null });
  }, [active, workspace, refresh]);

  const doRenamePage = useCallback(async (newName: string) => {
    if (!active.notebook || !active.section || !active.page || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    const newFilename = await api.renamePage(wsPathRef.current, folderName, active.section, active.page.filename, newName);
    await refresh();
    setActive(prev => ({ ...prev, page: { name: newName, filename: newFilename } }));
  }, [active, workspace, refresh]);

  const importFiles = useCallback(async (paths: string[]) => {
    if (!active.notebook || !active.section || !workspace) return;
    const folderName = findNotebookFolder(workspace, active.notebook);
    if (!folderName) return;
    await api.importMarkdownFiles(wsPathRef.current, folderName, active.section, paths);
    await refresh();
  }, [active, workspace, refresh]);

  const activeNotebook = workspace?.notebooks.find(n => n.name === active.notebook) ?? null;
  const activeSection = activeNotebook?.sections.find(s => s.name === active.section) ?? null;

  useEffect(() => {
    if (workspace && workspace.notebooks.length > 0 && !active.notebook) {
      const nb = workspace.notebooks[0];
      const sec = nb.sections[0]?.name ?? null;
      const page = nb.sections[0]?.pages[0] ?? null;
      setActive({ notebook: nb.name, section: sec, page });
    }
  }, [workspace]);

  return (
    <WorkspaceContext.Provider value={{
      workspace, active, content, dirty, loading,
      setWorkspacePath, refresh, selectNotebook, selectSection, selectPage,
      setContent: handleSetContent, saveCurrentPage,
      addNotebook, addSection, addPage, removePage, removeSection, removeNotebook,
      doRenamePage, importFiles, activeNotebook, activeSection,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

function findNotebookFolder(workspace: Workspace, notebookName: string): string | null {
  const slugify = (name: string) =>
    name.split("").map(c => /[a-zA-Z0-9\-_]/.test(c) ? c : "-").join("").toLowerCase();
  return slugify(notebookName);
}
