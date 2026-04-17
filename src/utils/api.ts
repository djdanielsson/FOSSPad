import { invoke } from "@tauri-apps/api/core";
import type { Workspace } from "../types";

export async function loadWorkspace(workspacePath: string): Promise<Workspace> {
  return invoke("load_workspace", { workspacePath });
}

export async function readPage(
  workspacePath: string,
  notebook: string,
  section: string,
  filename: string
): Promise<string> {
  return invoke("read_page", { workspacePath, notebook, section, filename });
}

export async function savePage(
  workspacePath: string,
  notebook: string,
  section: string,
  filename: string,
  content: string
): Promise<void> {
  return invoke("save_page", { workspacePath, notebook, section, filename, content });
}

export async function createNotebook(
  workspacePath: string,
  name: string,
  color: string
): Promise<string> {
  return invoke("create_notebook", { workspacePath, name, color });
}

export async function createSection(
  workspacePath: string,
  notebook: string,
  name: string
): Promise<string> {
  return invoke("create_section", { workspacePath, notebook, name });
}

export async function createPage(
  workspacePath: string,
  notebook: string,
  section: string,
  name: string
): Promise<string> {
  return invoke("create_page", { workspacePath, notebook, section, name });
}

export async function deletePage(
  workspacePath: string,
  notebook: string,
  section: string,
  filename: string
): Promise<void> {
  return invoke("delete_page", { workspacePath, notebook, section, filename });
}

export async function deleteSection(
  workspacePath: string,
  notebook: string,
  section: string
): Promise<void> {
  return invoke("delete_section", { workspacePath, notebook, section });
}

export async function deleteNotebook(
  workspacePath: string,
  notebook: string
): Promise<void> {
  return invoke("delete_notebook", { workspacePath, notebook });
}

export async function renamePage(
  workspacePath: string,
  notebook: string,
  section: string,
  oldFilename: string,
  newName: string
): Promise<string> {
  return invoke("rename_page", { workspacePath, notebook, section, oldFilename, newName });
}

export async function importMarkdownFiles(
  workspacePath: string,
  notebook: string,
  section: string,
  filePaths: string[]
): Promise<string[]> {
  return invoke("import_markdown_files", { workspacePath, notebook, section, filePaths });
}

// Search
export interface SearchResult {
  notebook: string;
  section: string;
  page_name: string;
  filename: string;
  line_number: number;
  line_content: string;
}

export async function searchWorkspace(workspacePath: string, query: string): Promise<SearchResult[]> {
  return invoke("search_workspace", { workspacePath, query });
}

// Tags
export interface TagSearchResult {
  notebook: string;
  section: string;
  page_name: string;
  filename: string;
  tags: string[];
}

export async function getPageTags(workspacePath: string, notebook: string, section: string, filename: string): Promise<string[]> {
  return invoke("get_page_tags", { workspacePath, notebook, section, filename });
}

export async function setPageTags(workspacePath: string, notebook: string, section: string, filename: string, tags: string[]): Promise<void> {
  return invoke("set_page_tags", { workspacePath, notebook, section, filename, tags });
}

export async function searchByTag(workspacePath: string, tag: string): Promise<TagSearchResult[]> {
  return invoke("search_by_tag", { workspacePath, tag });
}

// Git
export interface GitStatus {
  is_repo: boolean;
  branch: string;
  changed_files: number;
  ahead: number;
  behind: number;
}

export async function gitStatus(workspacePath: string): Promise<GitStatus> {
  return invoke("git_status", { workspacePath });
}

export async function gitCommitAndPush(workspacePath: string, message: string): Promise<string> {
  return invoke("git_commit_and_push", { workspacePath, message });
}

export async function gitPull(workspacePath: string): Promise<string> {
  return invoke("git_pull", { workspacePath });
}

export async function gitInit(workspacePath: string): Promise<string> {
  return invoke("git_init", { workspacePath });
}

export async function gitSetRemote(workspacePath: string, url: string): Promise<string> {
  return invoke("git_set_remote", { workspacePath, url });
}

export async function gitClone(url: string, workspacePath: string): Promise<string> {
  return invoke("git_clone", { url, workspacePath });
}

// Settings
export interface ThemeSettings {
  bg_primary?: string;
  bg_secondary?: string;
  bg_tertiary?: string;
  text_primary?: string;
  text_secondary?: string;
  accent?: string;
}

export interface GitSettings {
  auto_push_enabled: boolean;
  auto_push_interval_minutes: number;
  remote_url?: string;
}

export interface Settings {
  theme: ThemeSettings;
  git: GitSettings;
}

export async function loadSettings(workspacePath: string): Promise<Settings> {
  return invoke("load_settings", { workspacePath });
}

export async function saveSettings(workspacePath: string, settings: Settings): Promise<void> {
  return invoke("save_settings", { workspacePath, settings });
}
