use std::sync::{Arc, Mutex};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[derive(Default, Clone, Copy, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DisplayInfo {
    pub id: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_current: bool,
}

pub struct OverlayState {
    pub is_glass_mode: bool,
    pub is_dragging: bool,
    pub toolbar_bounds: Rect,
    pub is_cursor_in_toolbar: bool,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            is_glass_mode: true,
            is_dragging: false,
            toolbar_bounds: Rect::default(),
            is_cursor_in_toolbar: false,
        }
    }
}

type SharedOverlayState = Arc<Mutex<OverlayState>>;

#[tauri::command]
fn save_snapshot_native(path: String, data: Vec<u8>) -> Result<(), String> {
    use std::path::Path;

    let target_path = Path::new(&path);

    // Validate path is absolute and has a valid image extension
    if !target_path.is_absolute() {
        return Err("Target path must be an absolute path".to_string());
    }

    if let Some(ext) = target_path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        if ext_lower != "png" && ext_lower != "jpg" && ext_lower != "jpeg" && ext_lower != "webp" {
            return Err("Disallowed file format for snapshot".to_string());
        }
    } else {
        return Err("Missing file extension".to_string());
    }

    // Security check: Guard against writing to sensitive system paths or directory traversal
    let path_str_lower = path.to_lowercase().replace('/', "\\");
    if path_str_lower.starts_with("c:\\windows")
        || path_str_lower.contains("\\system32")
        || path_str_lower.contains("\\syswow64")
        || path_str_lower.contains("..")
    {
        return Err("Writing to protected operating system locations is prohibited".to_string());
    }

    std::fs::write(&target_path, &data).map_err(|e| format!("Failed to write snapshot file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn get_available_displays(app: tauri::AppHandle) -> Vec<DisplayInfo> {
    let mut list = Vec::new();
    let window = app.get_webview_window("main");
    let current_pos = window.as_ref().and_then(|w| w.outer_position().ok());

    if let Ok(monitors) = app.available_monitors() {
        for (i, m) in monitors.into_iter().enumerate() {
            let m_pos = m.position();
            let is_curr = current_pos
                .map(|cp| cp.x == m_pos.x && cp.y == m_pos.y)
                .unwrap_or(i == 0);
            let name = m.name().cloned().unwrap_or_else(|| format!("Display {}", i + 1));
            let size = m.size();
            list.push(DisplayInfo {
                id: i,
                name,
                width: size.width,
                height: size.height,
                scale_factor: m.scale_factor(),
                is_current: is_curr,
            });
        }
    }
    list
}

#[tauri::command]
fn switch_display(app: tauri::AppHandle, display_id: usize) -> Result<(), String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    if let Some(target_monitor) = monitors.get(display_id) {
        if let Some(window) = app.get_webview_window("main") {
            let pos = *target_monitor.position();
            let size = *target_monitor.size();
            
            // On Windows, moving a fullscreen window across monitors requires disabling fullscreen,
            // positioning precisely, updating the size, and restoring fullscreen.
            let _ = window.set_fullscreen(false);
            let _ = window.set_position(pos);
            let _ = window.set_size(size);
            
            // Small pause ensures Windows DWM registers the monitor change before re-engaging fullscreen
            let win_clone = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(50));
                let _ = win_clone.set_position(pos);
                let _ = win_clone.set_size(size);
                let _ = win_clone.set_fullscreen(true);
                let _ = win_clone.set_focus();
                let _ = win_clone.emit("display-changed", ());
            });

            return Ok(());
        }
    }
    Err("Display not found".to_string())
}

#[tauri::command]
fn switch_to_next_display(app: tauri::AppHandle) -> Result<usize, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Ok(0);
    }
    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => return Err("Window not found".to_string()),
    };
    let current_pos = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });

    let current_idx = monitors.iter().position(|m| {
        let p = m.position();
        let s = m.size();
        current_pos.x >= p.x && current_pos.x < (p.x + s.width as i32)
            && current_pos.y >= p.y && current_pos.y < (p.y + s.height as i32)
    }).unwrap_or(0);

    let next_idx = (current_idx + 1) % monitors.len();
    switch_display(app, next_idx)?;
    Ok(next_idx)
}

#[tauri::command]
fn set_glass_mode(
    state: tauri::State<'_, SharedOverlayState>,
    app: tauri::AppHandle,
    active: bool,
) {
    let mut s = match state.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };
    s.is_glass_mode = active;
    if !active {
        s.is_cursor_in_toolbar = true;
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_ignore_cursor_events(false);
        }
    } else {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_ignore_cursor_events(!s.is_cursor_in_toolbar);
        }
    }
}

#[tauri::command]
fn set_toolbar_drag_state(
    state: tauri::State<'_, SharedOverlayState>,
    app: tauri::AppHandle,
    is_dragging: bool,
) {
    if let Ok(mut s) = state.lock() {
        s.is_dragging = is_dragging;
        if is_dragging {
            s.is_cursor_in_toolbar = true;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_ignore_cursor_events(false);
            }
        }
    }
}

#[tauri::command]
fn update_toolbar_bounds(
    state: tauri::State<'_, SharedOverlayState>,
    bounds: Rect,
) {
    if let Ok(mut s) = state.lock() {
        s.toolbar_bounds = bounds;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let overlay_state: SharedOverlayState = Arc::new(Mutex::new(OverlayState::default()));
            app.manage(overlay_state.clone());

            let toggle_i = MenuItem::with_id(app, "toggle", "Toggle Inkova (Show / Hide)", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show & Focus", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide to Tray", true, None::<&str>)?;
            let update_i = MenuItem::with_id(app, "update", "Check for Updates...", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Inkova", true, None::<&str>)?;

            let menu = Menu::new(app)?;
            menu.append(&toggle_i)?;
            menu.append(&show_i)?;
            menu.append(&hide_i)?;

            let available_monitors = app.available_monitors().unwrap_or_default();
            if available_monitors.len() > 1 {
                if let Ok(display_sub) = Submenu::new(app, "🖥️ Switch Display", true) {
                    for (idx, mon) in available_monitors.iter().enumerate() {
                        let name = mon.name().cloned().unwrap_or_else(|| format!("Display {}", idx + 1));
                        let size = mon.size();
                        let label = format!("{}: {}x{}", name, size.width, size.height);
                        if let Ok(item) = MenuItem::with_id(app, format!("disp_{idx}"), label, true, None::<&str>) {
                            let _ = display_sub.append(&item);
                        }
                    }
                    let _ = menu.append(&display_sub);
                }
            }
            menu.append(&update_i)?;
            menu.append(&quit_i)?;

            let icon = app
                .default_window_icon()
                .cloned()
                .or_else(|| Image::from_bytes(include_bytes!("../icons/32x32.png")).ok());

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false);

            if let Some(ref ic) = icon {
                tray_builder = tray_builder.icon(ic.clone());
            }

            let state_for_tray = overlay_state.clone();
            let tray_result = tray_builder
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                if let Ok(mut s) = state_for_tray.lock() {
                                    s.is_glass_mode = false;
                                    s.is_cursor_in_toolbar = true;
                                }
                                let _ = window.show();
                                let _ = window.set_ignore_cursor_events(false);
                                let _ = window.set_focus();
                                let _ = window.emit("glass-mode-disable", ());
                            }
                        }
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(mut s) = state_for_tray.lock() {
                                s.is_glass_mode = false;
                                s.is_cursor_in_toolbar = true;
                            }
                            let _ = window.show();
                            let _ = window.set_ignore_cursor_events(false);
                            let _ = window.set_focus();
                            let _ = window.emit("glass-mode-disable", ());
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "update" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("check-update-requested", ());
                        }
                    }
                    id if id.starts_with("disp_") => {
                        if let Ok(idx) = id.trim_start_matches("disp_").parse::<usize>() {
                            let _ = switch_display(app.clone(), idx);
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event({
                    let state_for_tray_click = overlay_state.clone();
                    move |tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    if let Ok(mut s) = state_for_tray_click.lock() {
                                        s.is_glass_mode = false;
                                        s.is_cursor_in_toolbar = true;
                                    }
                                    let _ = window.show();
                                    let _ = window.set_ignore_cursor_events(false);
                                    let _ = window.set_focus();
                                    let _ = window.emit("glass-mode-disable", ());
                                }
                            }
                        }
                    }
                })
                .build(app);

            if let Err(e) = tray_result {
                eprintln!("[WARN] System tray creation skipped: {e}");
            }

            // High-precision DPI-aware background cursor tracker:
            // Translates physical screen cursor position relative to the window's physical screen coordinates.
            // Works seamlessly across 100%, 125%, 150%, 200% DPI and multi-monitor setups.
            #[cfg(target_os = "windows")]
            {
                let app_handle = app.handle().clone();
                let state_clone = overlay_state.clone();
                std::thread::spawn(move || {
                    #[repr(C)]
                    struct POINT {
                        x: i32,
                        y: i32,
                    }
                    unsafe extern "system" {
                        fn GetCursorPos(lpPoint: *mut POINT) -> i32;
                    }

                    loop {
                        std::thread::sleep(Duration::from_millis(25));

                        let (is_glass, is_dragging, bounds, was_in_toolbar) = {
                            let s = match state_clone.lock() {
                                Ok(guard) => guard,
                                Err(_) => break,
                            };
                            (s.is_glass_mode, s.is_dragging, s.toolbar_bounds, s.is_cursor_in_toolbar)
                        };

                        if !is_glass {
                            continue;
                        }

                        // While actively dragging, keep window capturing mouse events without switching to pass-through
                        if is_dragging {
                            continue;
                        }

                        let window = match app_handle.get_webview_window("main") {
                            Some(w) => w,
                            None => continue,
                        };

                        let win_pos = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });

                        let mut pt = POINT { x: 0, y: 0 };
                        unsafe { GetCursorPos(&mut pt) };

                        // Relative physical cursor inside window
                        let px = (pt.x - win_pos.x) as f64;
                        let py = (pt.y - win_pos.y) as f64;

                        // Generous padding around the toolbar for smooth hover entry
                        let pad = 16.0;
                        let in_toolbar = px >= (bounds.x - pad)
                            && px <= (bounds.x + bounds.width + pad)
                            && py >= (bounds.y - pad)
                            && py <= (bounds.y + bounds.height + pad);

                        if in_toolbar != was_in_toolbar {
                            if let Ok(mut s) = state_clone.lock() {
                                s.is_cursor_in_toolbar = in_toolbar;
                            }

                            if in_toolbar {
                                let _ = window.set_ignore_cursor_events(false);
                            } else {
                                let _ = window.set_ignore_cursor_events(true);
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_snapshot_native,
            exit_app,
            restart_app,
            set_glass_mode,
            set_toolbar_drag_state,
            update_toolbar_bounds,
            get_available_displays,
            switch_display,
            switch_to_next_display
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
