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
