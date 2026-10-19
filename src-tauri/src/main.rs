//! Lanius Desktop 壳入口。职责：装配插件、守护 sidecar、暴露薄 invoke 层。

mod commands;
mod error;
mod prefs;
mod sidecar;
mod updater;

use tauri::Manager;

use commands::ShellState;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    tauri::Builder::default()
        .manage(ShellState {
            engine: tokio::sync::Mutex::new(None),
            prefs: std::sync::Mutex::new(prefs::ShellPrefs::default()),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let loaded = prefs::load(&handle);
            if let Ok(mut guard) = handle.state::<ShellState>().prefs.lock() {
                *guard = loaded.clone();
            }
            if let Err(err) = prefs::apply_autostart(&handle, loaded.autostart) {
                tracing::warn!(target: "shell", "开机自启同步失败: {err}");
            }
            prefs::append_log(&handle, "shell started");

            tauri::async_runtime::spawn(async move {
                match sidecar::EngineClient::spawn(handle.clone()).await {
                    Ok(client) => {
                        let state = handle.state::<ShellState>();
                        *state.engine.lock().await = Some(client);
                        prefs::append_log(&handle, "engine ready");
                        let _ = tauri::Emitter::emit(
                            &handle,
                            "engine://event",
                            serde_json::json!({ "kind": "status", "status": "ready" }),
                        );
                    }
                    Err(err) => {
                        tracing::error!(target: "sidecar", "引擎启动失败: {err}");
                        prefs::append_log(&handle, &format!("engine spawn failed: {err}"));
                        let _ = tauri::Emitter::emit(
                            &handle,
                            "engine://event",
                            serde_json::json!({ "kind": "status", "status": "degraded" }),
                        );
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<ShellState>();
                let behavior = state
                    .prefs
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner())
                    .close_behavior
                    .clone();
                if behavior == "minimize" {
                    api.prevent_close();
                    let _ = window.minimize();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::engine_info,
            commands::engine_ping,
            commands::engine_call,
            commands::flow_run,
            commands::flow_cancel,
            commands::prefs_get,
            commands::prefs_set,
            commands::shell_debug_info,
            commands::logs_tail,
            commands::updater_list,
            commands::updater_check,
            commands::updater_download,
            commands::updater_install,
        ])
        .build(tauri::generate_context!())
        .expect("启动 Tauri 应用失败")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                // 优雅关停引擎：shutdown → 3s → kill（sidecar.rs）
                let state = app.state::<ShellState>();
                let engine = state.engine.blocking_lock().clone();
                if let Some(client) = engine {
                    tauri::async_runtime::block_on(client.shutdown());
                }
            }
        });
}
