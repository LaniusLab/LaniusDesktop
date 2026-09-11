//! Lanius Desktop 壳入口。职责：装配插件、守护 sidecar、暴露薄 invoke 层。

mod commands;
mod error;
mod sidecar;

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
        })
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match sidecar::EngineClient::spawn(handle.clone()).await {
                    Ok(client) => {
                        let state = handle.state::<ShellState>();
                        *state.engine.lock().await = Some(client);
                        let _ = tauri::Emitter::emit(
                            &handle,
                            "engine://event",
                            serde_json::json!({ "kind": "status", "status": "ready" }),
                        );
                    }
                    Err(err) => {
                        tracing::error!(target: "sidecar", "引擎启动失败: {err}");
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
        .invoke_handler(tauri::generate_handler![
            commands::engine_info,
            commands::engine_ping,
            commands::engine_call,
            commands::flow_run,
            commands::flow_cancel,
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
