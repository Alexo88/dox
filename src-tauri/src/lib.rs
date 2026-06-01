use tauri::Window;

/// Devuelve los argumentos de línea de comandos (sin el path del EXE)
#[tauri::command]
fn get_open_args() -> Vec<String> {
    std::env::args().skip(1).collect()
}

#[tauri::command]
async fn expand_window_for_document(window: Window) -> Result<(), String> {
    // Obtener el monitor donde está la ventana
    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No se pudo obtener el monitor")?;
    
    // Tamaño del monitor
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    
    // Dejar espacio para la barra de tareas (aprox 40px) y un pequeño margen
    let taskbar_margin = 50;
    let target_height = monitor_size.height - taskbar_margin;
    let target_y = monitor_pos.y + 10; // Pequeño margen arriba
    
    // Ancho: usar el mismo o expandir un poco si está muy chico
    let current_size = window.inner_size().map_err(|e| e.to_string())?;
    let target_width = if current_size.width < 1000 {
        1000 // Mínimo cómodo para lectura
    } else {
        current_size.width
    };
    
    // Centrar horizontalmente
    let target_x = monitor_pos.x + (monitor_size.width as i32 - target_width as i32) / 2;
    
    // Aplicar nuevo tamaño y posición
    window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: target_width,
        height: target_height,
    })).map_err(|e| e.to_string())?;
    
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: target_x,
        y: target_y,
    })).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn reset_window_size(window: Window) -> Result<(), String> {
    // Volver al tamaño por defecto (900x700 centrado)
    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No se pudo obtener el monitor")?;
    
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    
    let target_width = 900;
    let target_height = 700;
    
    let target_x = monitor_pos.x + (monitor_size.width as i32 - target_width as i32) / 2;
    let target_y = monitor_pos.y + (monitor_size.height as i32 - target_height as i32) / 2;
    
    window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: target_width,
        height: target_height,
    })).map_err(|e| e.to_string())?;
    
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: target_x,
        y: target_y,
    })).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_maximize(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_open_args,
            expand_window_for_document,
            reset_window_size,
            minimize,
            toggle_maximize,
            close_window
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
