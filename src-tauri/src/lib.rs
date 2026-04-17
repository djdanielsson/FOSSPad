use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotebookMeta {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub path: String,
    pub notebooks: Vec<NotebookInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotebookInfo {
    pub name: String,
    pub color: String,
    pub sections: Vec<SectionInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SectionInfo {
    pub name: String,
    pub pages: Vec<PageInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageInfo {
    pub name: String,
    pub filename: String,
}

fn slugify(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .to_lowercase()
}

#[tauri::command]
fn load_workspace(workspace_path: String) -> Result<Workspace, String> {
    let root = Path::new(&workspace_path);
    if !root.exists() {
        fs::create_dir_all(root).map_err(|e| e.to_string())?;
    }

    let mut notebooks = Vec::new();

    let mut entries: Vec<_> = fs::read_dir(root)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .collect();
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let nb_path = entry.path();
        let nb_name = entry.file_name().to_string_lossy().to_string();

        let meta_path = nb_path.join(".notebook.json");
        let meta: NotebookMeta = if meta_path.exists() {
            let content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or(NotebookMeta {
                name: nb_name.clone(),
                color: "#7B68EE".to_string(),
            })
        } else {
            NotebookMeta {
                name: nb_name.clone(),
                color: "#7B68EE".to_string(),
            }
        };

        let mut sections = Vec::new();
        let mut sec_entries: Vec<_> = fs::read_dir(&nb_path)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .collect();
        sec_entries.sort_by_key(|e| e.file_name());

        for sec_entry in sec_entries {
            let sec_path = sec_entry.path();
            let sec_name = sec_entry.file_name().to_string_lossy().to_string();

            let mut pages = Vec::new();
            let mut page_entries: Vec<_> = fs::read_dir(&sec_path)
                .map_err(|e| e.to_string())?
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path().extension().map_or(false, |ext| ext == "md")
                })
                .collect();
            page_entries.sort_by_key(|e| e.file_name());

            for page_entry in page_entries {
                let filename = page_entry.file_name().to_string_lossy().to_string();
                let page_name = filename.trim_end_matches(".md").to_string();
                pages.push(PageInfo {
                    name: page_name,
                    filename,
                });
            }

            sections.push(SectionInfo {
                name: sec_name,
                pages,
            });
        }

        notebooks.push(NotebookInfo {
            name: meta.name,
            color: meta.color,
            sections,
        });
    }

    Ok(Workspace {
        path: workspace_path,
        notebooks,
    })
}

#[tauri::command]
fn read_page(workspace_path: String, notebook: String, section: String, filename: String) -> Result<String, String> {
    let path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_page(workspace_path: String, notebook: String, section: String, filename: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_notebook(workspace_path: String, name: String, color: String) -> Result<String, String> {
    let slug = slugify(&name);
    let nb_path = PathBuf::from(&workspace_path).join(&slug);
    fs::create_dir_all(&nb_path).map_err(|e| e.to_string())?;

    let meta = NotebookMeta {
        name: name.clone(),
        color,
    };
    let meta_json = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(nb_path.join(".notebook.json"), meta_json).map_err(|e| e.to_string())?;

    let default_section = nb_path.join("General");
    fs::create_dir_all(&default_section).map_err(|e| e.to_string())?;
    fs::write(
        default_section.join("Untitled.md"),
        "# Untitled\n\nStart writing here...\n",
    )
    .map_err(|e| e.to_string())?;

    Ok(slug)
}

#[tauri::command]
fn create_section(workspace_path: String, notebook: String, name: String) -> Result<String, String> {
    let sec_path = PathBuf::from(&workspace_path).join(&notebook).join(&name);
    fs::create_dir_all(&sec_path).map_err(|e| e.to_string())?;
    fs::write(
        sec_path.join("Untitled.md"),
        "# Untitled\n\nStart writing here...\n",
    )
    .map_err(|e| e.to_string())?;
    Ok(name)
}

#[tauri::command]
fn create_page(workspace_path: String, notebook: String, section: String, name: String) -> Result<String, String> {
    let filename = format!("{}.md", name);
    let page_path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    if page_path.exists() {
        return Err("Page already exists".to_string());
    }
    fs::write(&page_path, format!("# {}\n\n", name)).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
fn delete_page(workspace_path: String, notebook: String, section: String, filename: String) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_section(workspace_path: String, notebook: String, section: String) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path).join(&notebook).join(&section);
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_notebook(workspace_path: String, notebook: String) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path).join(&notebook);
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_page(workspace_path: String, notebook: String, section: String, old_filename: String, new_name: String) -> Result<String, String> {
    let dir = PathBuf::from(&workspace_path).join(&notebook).join(&section);
    let old_path = dir.join(&old_filename);
    let new_filename = format!("{}.md", new_name);
    let new_path = dir.join(&new_filename);
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    Ok(new_filename)
}

#[tauri::command]
fn import_markdown_files(workspace_path: String, notebook: String, section: String, file_paths: Vec<String>) -> Result<Vec<String>, String> {
    let dest_dir = PathBuf::from(&workspace_path).join(&notebook).join(&section);
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let mut imported = Vec::new();
    for fp in file_paths {
        let src = Path::new(&fp);
        if let Some(fname) = src.file_name() {
            let dest = dest_dir.join(fname);
            fs::copy(src, &dest).map_err(|e| e.to_string())?;
            imported.push(fname.to_string_lossy().to_string());
        }
    }
    Ok(imported)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            read_page,
            save_page,
            create_notebook,
            create_section,
            create_page,
            delete_page,
            delete_section,
            delete_notebook,
            rename_page,
            import_markdown_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
