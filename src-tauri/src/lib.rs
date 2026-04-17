use serde::{Deserialize, Serialize};
use serde_yaml::Value as YamlValue;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub notebook: String,
    pub section: String,
    pub page_name: String,
    pub filename: String,
    pub line_number: usize,
    pub line_content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagSearchResult {
    pub notebook: String,
    pub section: String,
    pub page_name: String,
    pub filename: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub changed_files: usize,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeSettings {
    pub bg_primary: Option<String>,
    pub bg_secondary: Option<String>,
    pub bg_tertiary: Option<String>,
    pub text_primary: Option<String>,
    pub text_secondary: Option<String>,
    pub accent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitSettings {
    pub auto_push_enabled: bool,
    pub auto_push_interval_minutes: u32,
    pub remote_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub theme: ThemeSettings,
    pub git: GitSettings,
}

fn default_settings() -> Settings {
    Settings {
        theme: ThemeSettings {
            bg_primary: None,
            bg_secondary: None,
            bg_tertiary: None,
            text_primary: None,
            text_secondary: None,
            accent: None,
        },
        git: GitSettings {
            auto_push_enabled: false,
            auto_push_interval_minutes: 60,
            remote_url: None,
        },
    }
}

fn settings_path(workspace_path: &str) -> PathBuf {
    PathBuf::from(workspace_path).join(".notedesk").join("settings.json")
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

fn walk_markdown_files(root: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    if !root.exists() {
        return Ok(());
    }
    let entries = fs::read_dir(root).map_err(|e| e.to_string())?;
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_dir() {
            walk_markdown_files(&path, out)?;
        } else if path.extension().map_or(false, |e| e == "md") {
            out.push(path);
        }
    }
    Ok(())
}

fn relative_md_parts(workspace: &Path, file: &Path) -> (String, String, String, String) {
    let rel = file.strip_prefix(workspace).unwrap_or(file);
    let components: Vec<_> = rel
        .components()
        .filter_map(|c| match c {
            std::path::Component::Normal(s) => Some(s.to_string_lossy().to_string()),
            _ => None,
        })
        .collect();

    let filename = components
        .last()
        .cloned()
        .unwrap_or_default();
    let page_name = filename.trim_end_matches(".md").to_string();

    match components.len() {
        0 => (String::new(), String::new(), page_name, filename),
        1 => (String::new(), String::new(), page_name, filename),
        2 => (
            components[0].clone(),
            String::new(),
            page_name,
            filename,
        ),
        _ => (
            components[0].clone(),
            components[1].clone(),
            page_name,
            filename,
        ),
    }
}

#[tauri::command]
fn search_workspace(workspace_path: String, query: String) -> Result<Vec<SearchResult>, String> {
    let root = Path::new(&workspace_path);
    let mut files = Vec::new();
    walk_markdown_files(root, &mut files)?;

    let q = query.to_lowercase();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    for path in files {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let (notebook, section, page_name, filename) = relative_md_parts(root, &path);
        for (i, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(&q) {
                results.push(SearchResult {
                    notebook: notebook.clone(),
                    section: section.clone(),
                    page_name: page_name.clone(),
                    filename: filename.clone(),
                    line_number: i + 1,
                    line_content: line.to_string(),
                });
            }
        }
    }

    Ok(results)
}

fn split_frontmatter(content: &str) -> Option<(String, String)> {
    let s = content.strip_prefix('\u{feff}').unwrap_or(content);
    if !s.starts_with("---") {
        return None;
    }
    let after_open = s.get(3..)?;
    let rest = after_open
        .strip_prefix('\n')
        .or_else(|| after_open.strip_prefix("\r\n"))?;

    let (fm_raw, body) = if let Some(pos) = rest.find("\n---\n") {
        (&rest[..pos], rest[pos + 5..].to_string())
    } else if let Some(pos) = rest.find("\n---\r\n") {
        (&rest[..pos], rest[pos + 7..].to_string())
    } else if let Some(pos) = rest.find("\r\n---\r\n") {
        (&rest[..pos], rest[pos + 7..].to_string())
    } else {
        return None;
    };

    Some((fm_raw.trim().to_string(), body))
}

fn yaml_tags_from_frontmatter(fm: &str) -> Vec<String> {
    let Ok(v) = serde_yaml::from_str::<YamlValue>(fm) else {
        return Vec::new();
    };
    let Some(tags_val) = v.get("tags") else {
        return Vec::new();
    };
    match tags_val {
        YamlValue::Sequence(seq) => seq
            .iter()
            .filter_map(|x| {
                if let YamlValue::String(s) = x {
                    Some(s.clone())
                } else {
                    x.as_str().map(|s| s.to_string())
                }
            })
            .collect(),
        YamlValue::String(s) => vec![s.clone()],
        _ => Vec::new(),
    }
}

#[tauri::command]
fn get_page_tags(
    workspace_path: String,
    notebook: String,
    section: String,
    filename: String,
) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let Some((fm, _)) = split_frontmatter(&content) else {
        return Ok(Vec::new());
    };
    Ok(yaml_tags_from_frontmatter(&fm))
}

fn set_yaml_tags_in_frontmatter(fm: &str, tags: &[String]) -> String {
    let mut map: serde_yaml::Mapping = serde_yaml::from_str(fm).unwrap_or_default();
    map.insert(
        YamlValue::String("tags".to_string()),
        YamlValue::Sequence(
            tags.iter()
                .map(|t| YamlValue::String(t.clone()))
                .collect(),
        ),
    );
    serde_yaml::to_string(&YamlValue::Mapping(map)).unwrap_or_else(|_| "---\n".to_string())
}

#[tauri::command]
fn set_page_tags(
    workspace_path: String,
    notebook: String,
    section: String,
    filename: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let path = PathBuf::from(&workspace_path)
        .join(&notebook)
        .join(&section)
        .join(&filename);
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let new_content = if let Some((fm, body)) = split_frontmatter(&content) {
        let yaml_block = set_yaml_tags_in_frontmatter(&fm, &tags);
        let yaml_trimmed = yaml_block.trim_end();
        format!("---\n{yaml_trimmed}\n---\n{body}")
    } else {
        let yaml_block = set_yaml_tags_in_frontmatter("", &tags);
        let yaml_trimmed = yaml_block.trim_end();
        format!("---\n{yaml_trimmed}\n---\n{content}")
    };

    fs::write(&path, new_content).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_by_tag(workspace_path: String, tag: String) -> Result<Vec<TagSearchResult>, String> {
    let root = Path::new(&workspace_path);
    let mut files = Vec::new();
    walk_markdown_files(root, &mut files)?;

    let needle = tag.to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    for path in files {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let Some((fm, _)) = split_frontmatter(&content) else {
            continue;
        };
        let file_tags = yaml_tags_from_frontmatter(&fm);
        let has = file_tags
            .iter()
            .any(|t| t.to_lowercase() == needle);
        if !has {
            continue;
        }
        let (notebook, section, page_name, filename) = relative_md_parts(root, &path);
        results.push(TagSearchResult {
            notebook,
            section,
            page_name,
            filename,
            tags: file_tags,
        });
    }

    Ok(results)
}

fn git_output_success(workspace: &Path, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .current_dir(workspace)
        .args(args)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
    if out.status.success() {
        Ok(if stdout.is_empty() { stderr } else { stdout })
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

#[tauri::command]
fn git_status(workspace_path: String) -> Result<GitStatus, String> {
    let root = Path::new(&workspace_path);
    let check = Command::new("git")
        .current_dir(root)
        .args(["rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|e| e.to_string())?;

    if !check.status.success() || String::from_utf8_lossy(&check.stdout).trim() != "true" {
        return Ok(GitStatus {
            is_repo: false,
            branch: String::new(),
            changed_files: 0,
            ahead: 0,
            behind: 0,
        });
    }

    let branch_out = Command::new("git")
        .current_dir(root)
        .args(["branch", "--show-current"])
        .output()
        .map_err(|e| e.to_string())?;
    let branch = if branch_out.status.success() {
        String::from_utf8_lossy(&branch_out.stdout).trim().to_string()
    } else {
        String::new()
    };

    let status_out = Command::new("git")
        .current_dir(root)
        .args(["status", "--porcelain"])
        .output()
        .map_err(|e| e.to_string())?;
    let changed_files = if status_out.status.success() {
        String::from_utf8_lossy(&status_out.stdout)
            .lines()
            .filter(|l| !l.is_empty())
            .count()
    } else {
        0
    };

    let ab_out = Command::new("git")
        .current_dir(root)
        .args(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
        .output()
        .map_err(|e| e.to_string())?;

    let (behind, ahead) = if ab_out.status.success() {
        let s = String::from_utf8_lossy(&ab_out.stdout);
        let mut parts = s.split_whitespace();
        let left = parts.next().and_then(|x| x.parse::<usize>().ok()).unwrap_or(0);
        let right = parts.next().and_then(|x| x.parse::<usize>().ok()).unwrap_or(0);
        (left, right)
    } else {
        (0, 0)
    };

    Ok(GitStatus {
        is_repo: true,
        branch,
        changed_files,
        ahead,
        behind,
    })
}

#[tauri::command]
fn git_commit_and_push(workspace_path: String, message: String) -> Result<String, String> {
    let root = Path::new(&workspace_path);
    git_output_success(root, &["add", "-A"])?;
    let commit_msg = if message.is_empty() {
        "Update"
    } else {
        &message
    };
    let commit_out = Command::new("git")
        .current_dir(root)
        .args(["commit", "-m", commit_msg])
        .output()
        .map_err(|e| format!("failed to run git commit: {e}"))?;
    let c_out = String::from_utf8_lossy(&commit_out.stdout);
    let c_err = String::from_utf8_lossy(&commit_out.stderr);
    if !commit_out.status.success() {
        let msg = format!("{}{}", c_out, c_err);
        if msg.contains("nothing to commit") {
            // still try push
        } else {
            return Err(msg.trim().to_string());
        }
    }
    let push_out = Command::new("git")
        .current_dir(root)
        .args(["push"])
        .output()
        .map_err(|e| format!("failed to run git push: {e}"))?;
    let p_out = String::from_utf8_lossy(&push_out.stdout);
    let p_err = String::from_utf8_lossy(&push_out.stderr);
    if !push_out.status.success() {
        return Err(format!("{}{}", p_out, p_err).trim().to_string());
    }
    let combined = format!("{}{}{}{}", c_out, c_err, p_out, p_err);
    Ok(combined.trim().to_string())
}

#[tauri::command]
fn git_pull(workspace_path: String) -> Result<String, String> {
    let root = Path::new(&workspace_path);
    let out = Command::new("git")
        .current_dir(root)
        .args(["pull"])
        .output()
        .map_err(|e| format!("failed to run git pull: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    if !out.status.success() {
        return Err(format!("{}{}", stdout, stderr).trim().to_string());
    }
    Ok(format!("{}{}", stdout, stderr).trim().to_string())
}

#[tauri::command]
fn git_init(workspace_path: String) -> Result<String, String> {
    let root = Path::new(&workspace_path);
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    git_output_success(root, &["init"])
}

#[tauri::command]
fn git_set_remote(workspace_path: String, url: String) -> Result<String, String> {
    let root = Path::new(&workspace_path);
    let check = Command::new("git")
        .current_dir(root)
        .args(["remote", "get-url", "origin"])
        .output()
        .map_err(|e| e.to_string())?;
    if check.status.success() {
        git_output_success(root, &["remote", "set-url", "origin", &url])
    } else {
        git_output_success(root, &["remote", "add", "origin", &url])
    }
}

#[tauri::command]
fn git_clone(url: String, workspace_path: String) -> Result<String, String> {
    let dest = Path::new(&workspace_path);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let out = Command::new("git")
        .args(["clone", &url, &workspace_path])
        .output()
        .map_err(|e| format!("failed to run git clone: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    if !out.status.success() {
        return Err(format!("{}{}", stdout, stderr).trim().to_string());
    }
    Ok(format!("{}{}", stdout, stderr).trim().to_string())
}

#[tauri::command]
fn load_settings(workspace_path: String) -> Result<Settings, String> {
    let path = settings_path(&workspace_path);
    if !path.exists() {
        return Ok(default_settings());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(workspace_path: String, settings: Settings) -> Result<(), String> {
    let dir = PathBuf::from(&workspace_path).join(".notedesk");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("settings.json");
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
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
            search_workspace,
            get_page_tags,
            set_page_tags,
            search_by_tag,
            git_status,
            git_commit_and_push,
            git_pull,
            git_init,
            git_set_remote,
            git_clone,
            load_settings,
            save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
