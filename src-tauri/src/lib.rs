use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::{State, Window};
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

#[derive(serde::Serialize)]
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

/// Detecta si un archivo es texto basándose en la extensión
fn is_text_file(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".svg")
}

/// Genera un nuevo token UUID v4
fn generate_token() -> String {
    Uuid::new_v4().to_string()
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

    // 1. Escribir a archivo temporal
    let mut temp_file = File::create(&temp_path).map_err(|e| format!("No se pudo crear archivo temporal: {}", e))?;
    temp_file.write_all(content).map_err(|e| format!("Error escribiendo archivo temporal: {}", e))?;
    temp_file.flush().map_err(|e| format!("Error en flush: {}", e))?;
    temp_file.sync_all().map_err(|e| format!("Error en sync_all: {}", e))?;
    drop(temp_file); // Cerrar explícitamente antes del rename en Windows

    // 2. Atomic rename (mismo filesystem = atómico en Windows también)
    std::fs::rename(&temp_path, path).map_err(|e| {
        // Intentar limpiar el temp si falla
        let _ = std::fs::remove_file(&temp_path);
        format!("Error en rename atómico: {}", e)
    })?;

    Ok(())
}

/// 1. Abrir documento desde argv (reemplaza get_open_args + fs.read)
/// Lee el primer argumento de línea de comandos y abre el archivo
#[tauri::command]
async fn open_document_from_argv(state: State<'_, AppState>) -> Result<DocumentInfo, String> {
    // Obtener el primer argumento (skip el nombre del ejecutable)
    let args: Vec<String> = std::env::args().skip(1).collect();
    let path = args.first().ok_or("No file argument in argv")?;

    let content = read_file(path)?;
    let is_text = is_text_file(path);

    // Extraer nombre del archivo
    let file_name = Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("documento")
        .to_string();

    // Generar token y guardar mapping
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

/// 2. Guardar markdown (sobrescribe archivo existente usando token)
#[tauri::command]
async fn save_markdown(
    token: String,
    existing_token: Option<String>,
    content: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let docs = state.documents.lock().map_err(|e| e.to_string())?;

    // Resolver token: existing_token tiene prioridad si es Some
    let target_token = existing_token.unwrap_or(token.clone());
    let path = docs.get(&target_token).ok_or("NotFound")?.clone();
    drop(docs);

    atomic_write(&path, content.as_bytes())?;

    Ok(path)
}

/// 3. Guardar como (Save As) — valida extensión, abre dialog, escribe atómico, guarda token
/// Funciona incluso si `token` no existe en el estado (archivo abierto por picker HTML)
#[tauri::command]
async fn save_markdown_as(
    token: String,
    content: String,
    suggested_name: String,
    state: State<'_, AppState>,
) -> Result<SaveAsResult, String> {
    // Validar extensión del nombre sugerido
    let lower = suggested_name.to_lowercase();
    if !lower.ends_with(".md") && !lower.ends_with(".markdown") {
        return Err("Extensión inválida: solo se permiten .md o .markdown".into());
    }

    // Abrir dialog de guardar (Tauri v1 API)
    let path = match FileDialogBuilder::new()
        .set_file_name(&suggested_name)
        .add_filter("Markdown", &["md", "markdown"])
        .save_file()
    {
        Some(p) => p,
        None => return Ok(SaveAsResult {
            path: String::new(),
            new_token: String::new(),
        }), // Usuario canceló — resultado vacío, no es error
    };

    let path_str = path.to_string_lossy().to_string();

    // Validar extensión REAL del archivo seleccionado (el usuario puede escribir cualquier cosa)
    let lower_path = path_str.to_lowercase();
    if !lower_path.ends_with(".md") && !lower_path.ends_with(".markdown") {
        return Err("Extensión inválida: el archivo debe terminar en .md o .markdown".into());
    }

    // Escritura atómica
    atomic_write(&path_str, content.as_bytes())?;

    // Generar NUEVO token para el archivo guardado
    let new_token = generate_token();
    {
        let mut docs = state.documents.lock().map_err(|e| e.to_string())?;
        // Si el token viejo existe en el estado, removerlo (ya no es necesario)
        if !token.is_empty() {
            docs.remove(&token);
        }
        docs.insert(new_token.clone(), path_str.clone());
    }

    Ok(SaveAsResult {
        path: path_str,
        new_token,
    })
}

/// 4. Cerrar documento — remover token del estado (idempotente)
#[tauri::command]
async fn close_document(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut docs = state.documents.lock().map_err(|e| e.to_string())?;
    docs.remove(&token);
    Ok(())
}

/// 5. Verificar si ventana está maximizada
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

    let taskbar_margin = 50;
    let target_height = monitor_size.height - taskbar_margin;
    let target_y = monitor_pos.y + 10;

    let current_size = window.inner_size().map_err(|e| e.to_string())?;
    let target_width = if current_size.width < 1000 { 1000 } else { current_size.width };

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
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            open_document_from_argv,
            save_markdown,
            save_markdown_as,
            close_document,
            is_window_maximized,
            expand_window_for_document,
            minimize,
            toggle_maximize,
            close_window,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let window = _app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}