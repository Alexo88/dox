use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State, Window};
use tauri::api::dialog::blocking::FileDialogBuilder;
use uuid::Uuid;

/// Estado compartido: token (UUID string) → path del archivo
struct AppState {
    documents: Mutex<HashMap<String, String>>, // token -> path
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            documents: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(serde::Serialize, Clone)]
struct DocumentInfo {
    token: String,
    content: Vec<u8>,
    is_text: bool,
    file_name: String,
}

#[derive(serde::Serialize)]
struct SaveAsResult {
    path: String,
    new_token: String,
}

#[derive(serde::Serialize, Clone)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
}

/// Detecta si un archivo es texto basándose en la extensión
fn is_text_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".svg")
}

/// Genera un nuevo token UUID v4
fn generate_token() -> String {
    Uuid::new_v4().to_string()
}

/// Ruta para settings de la aplicación
fn get_settings_path() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        let dir = Path::new(&app_data).join("com.maudev.khipucodex");
        let _ = std::fs::create_dir_all(&dir);
        dir.join("settings.json")
    } else {
        PathBuf::from("settings.json")
    }
}

/// Lee el modo de apertura ("reuse" o "new_window")
fn read_open_mode() -> String {
    let path = get_settings_path();
    if let Ok(content) = std::fs::read_to_string(path) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(mode) = val.get("open_mode").and_then(|v| v.as_str()) {
                return mode.to_string();
            }
        }
    }
    "reuse".to_string()
}

/// Lee un archivo (texto o binario según extensión)
fn read_file(path: &str) -> Result<Vec<u8>, String> {
    let mut file = File::open(path).map_err(|e| format!("No se pudo abrir el archivo: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| format!("Error leyendo archivo: {}", e))?;
    Ok(buffer)
}

/// Escribe archivo de forma atómica: temp → sync_all → rename
fn atomic_write(path: &str, content: &[u8]) -> Result<(), String> {
    let path = Path::new(path);
    let parent = path.parent().ok_or("No se pudo obtener directorio padre")?;
    let file_name = path.file_name().ok_or("Nombre de archivo inválido")?;
    let temp_name = format!(".{}_tmp", file_name.to_string_lossy());
    let temp_path = parent.join(temp_name);

    let mut temp_file = File::create(&temp_path).map_err(|e| format!("No se pudo crear archivo temporal: {}", e))?;
    temp_file.write_all(content).map_err(|e| format!("Error escribiendo archivo temporal: {}", e))?;
    temp_file.flush().map_err(|e| format!("Error en flush: {}", e))?;
    temp_file.sync_all().map_err(|e| format!("Error en sync_all: {}", e))?;
    drop(temp_file);

    std::fs::rename(&temp_path, path).map_err(|e| {
        let _ = std::fs::remove_file(&temp_path);
        format!("Error en rename atómico: {}", e)
    })?;

    Ok(())
}

#[tauri::command]
async fn open_document_from_argv(state: State<'_, AppState>) -> Result<DocumentInfo, String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let path = args.first().ok_or("No file argument in argv")?;
    open_document_from_path(path.clone(), state).await
}

/// Abrir documento desde un path específico (usado por single-instance)
#[tauri::command]
async fn open_document_from_path(path: String, state: State<'_, AppState>) -> Result<DocumentInfo, String> {
    let content = read_file(&path)?;
    let is_text = is_text_file(&path);

    let file_name = Path::new(&path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("documento")
        .to_string();

    let token = generate_token();
    {
        let mut docs = state.documents.lock().map_err(|e| e.to_string())?;
        docs.insert(token.clone(), path.clone());
    }

    Ok(DocumentInfo {
        token,
        content,
        is_text,
        file_name,
    })
}

/// Obtener modo de apertura actual
#[tauri::command]
fn get_open_mode() -> Result<String, String> {
    Ok(read_open_mode())
}

/// Guardar modo de apertura ("reuse" o "new_window")
#[tauri::command]
fn set_open_mode(mode: String) -> Result<(), String> {
    let path = get_settings_path();
    let val = serde_json::json!({ "open_mode": mode });
    std::fs::write(path, val.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

/// 2. Guardar markdown (sobrescribe archivo existente usando token)
#[tauri::command]
async fn save_markdown(
    token: String,
    existing_token: Option<String>,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let lookup_token = existing_token.as_ref().unwrap_or(&token);

    let path = {
        let docs = state.documents.lock().map_err(|e| e.to_string())?;
        docs.get(lookup_token)
            .ok_or_else(|| "Token no encontrado. Use 'Guardar como...' primero.".to_string())?
            .clone()
    };

    atomic_write(&path, content.as_bytes())?;
    Ok(())
}

/// 3. Guardar como (diálogo nativo + nuevo token)
#[tauri::command]
async fn save_markdown_as(
    token: String,
    content: String,
    suggested_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Option<SaveAsResult>, String> {
    let dialog = FileDialogBuilder::new()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("Todos los archivos", &["*"]);

    let dialog = if let Some(ref name) = suggested_name {
        dialog.set_file_name(name)
    } else {
        dialog
    };

    let file_path = dialog.save_file();

    match file_path {
        Some(path_buf) => {
            let path_str = path_buf.to_string_lossy().to_string();

            atomic_write(&path_str, content.as_bytes())?;

            let new_token = generate_token();
            {
                let mut docs = state.documents.lock().map_err(|e| e.to_string())?;
                if !token.is_empty() {
                    docs.remove(&token);
                }
                docs.insert(new_token.clone(), path_str.clone());
            }

            Ok(Some(SaveAsResult {
                path: path_str,
                new_token,
            }))
        }
        None => Ok(None),
    }
}

/// 4. Cerrar documento (limpia token del mapa)
#[tauri::command]
async fn close_document(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut docs = state.documents.lock().map_err(|e| e.to_string())?;
    docs.remove(&token);
    Ok(())
}

/// 5. Consultar si la ventana está maximizada
#[tauri::command]
async fn is_window_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

/// Expandir ventana para documento
#[tauri::command]
async fn expand_window_for_document(window: Window) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No se pudo obtener el monitor")?;

    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();

    let taskbar_margin = 60;
    let target_height = if monitor_size.height > taskbar_margin { monitor_size.height - taskbar_margin } else { 940 };
    let target_y = monitor_pos.y + 10;

    let current_size = window.inner_size().map_err(|e| e.to_string())?;
    let target_width = if current_size.width > 850 { current_size.width } else { 780 };

    let target_x = monitor_pos.x + (monitor_size.width as i32 - target_width as i32) / 2;

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: target_width,
            height: target_height,
        }))
        .map_err(|e| e.to_string())?;

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_x,
            y: target_y,
        }))
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Minimizar ventana
#[tauri::command]
async fn minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Maximizar / restaurar
#[tauri::command]
async fn toggle_maximize(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

/// Cerrar ventana
#[tauri::command]
async fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

pub fn run() {
    let open_mode = read_open_mode();
    let mut builder = tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            open_document_from_argv,
            open_document_from_path,
            get_open_mode,
            set_open_mode,
            save_markdown,
            save_markdown_as,
            close_document,
            is_window_maximized,
            expand_window_for_document,
            minimize,
            toggle_maximize,
            close_window,
        ]);

    if open_mode != "new_window" {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            if let Some(window) = app.get_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }

            let _ = app.emit_all("single-instance-open", SingleInstancePayload {
                args: argv,
                cwd,
            });
        }));
    }

    builder
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                let window = _app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}