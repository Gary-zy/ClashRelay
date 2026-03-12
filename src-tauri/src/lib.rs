use arboard::Clipboard;
use reqwest::redirect::Policy;
use reqwest::Client;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri::Manager;
use tokio::net::TcpStream;
use tokio::time::timeout;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FetchSubscriptionResponse {
    ok: bool,
    status: u16,
    text: String,
    error_kind: Option<String>,
    error_message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PingNodeResponse {
    latency: i32,
    tcp_time: Option<i32>,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveYamlResponse {
    canceled: bool,
    path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PingNodeRequest {
    server: String,
    port: u16,
}

fn app_state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("无法获取应用数据目录：{err}"))?;

    fs::create_dir_all(&app_data_dir).map_err(|err| format!("无法创建应用数据目录：{err}"))?;

    Ok(app_data_dir.join("relaybox-state.json"))
}

#[tauri::command]
async fn fetch_subscription(url: String) -> FetchSubscriptionResponse {
    let parsed = match reqwest::Url::parse(&url) {
        Ok(url) if matches!(url.scheme(), "http" | "https") => url,
        Ok(_) => {
            return FetchSubscriptionResponse {
                ok: false,
                status: 0,
                text: String::new(),
                error_kind: Some("invalid_url".into()),
                error_message: Some("仅支持 http/https 订阅地址".into()),
            };
        }
        Err(err) => {
            return FetchSubscriptionResponse {
                ok: false,
                status: 0,
                text: String::new(),
                error_kind: Some("invalid_url".into()),
                error_message: Some(err.to_string()),
            };
        }
    };

    let client = match Client::builder()
        .redirect(Policy::limited(3))
        .timeout(Duration::from_secs(20))
        .build()
    {
        Ok(client) => client,
        Err(err) => {
            return FetchSubscriptionResponse {
                ok: false,
                status: 0,
                text: String::new(),
                error_kind: Some("network".into()),
                error_message: Some(err.to_string()),
            };
        }
    };

    match client.get(parsed).send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            match response.text().await {
                Ok(text) if (200..300).contains(&status) => FetchSubscriptionResponse {
                    ok: true,
                    status,
                    text,
                    error_kind: None,
                    error_message: None,
                },
                Ok(text) => FetchSubscriptionResponse {
                    ok: false,
                    status,
                    text,
                    error_kind: Some("http".into()),
                    error_message: Some(format!("HTTP {status}")),
                },
                Err(err) => FetchSubscriptionResponse {
                    ok: false,
                    status,
                    text: String::new(),
                    error_kind: Some("network".into()),
                    error_message: Some(err.to_string()),
                },
            }
        }
        Err(err) if err.is_timeout() => FetchSubscriptionResponse {
            ok: false,
            status: 0,
            text: String::new(),
            error_kind: Some("timeout".into()),
            error_message: Some(err.to_string()),
        },
        Err(err) => FetchSubscriptionResponse {
            ok: false,
            status: 0,
            text: String::new(),
            error_kind: Some("network".into()),
            error_message: Some(err.to_string()),
        },
    }
}

#[tauri::command]
async fn ping_node(request: PingNodeRequest) -> PingNodeResponse {
    let start = std::time::Instant::now();

    match timeout(
        Duration::from_secs(5),
        TcpStream::connect((request.server.as_str(), request.port)),
    )
    .await
    {
        Ok(Ok(_stream)) => {
            let tcp_time = start.elapsed().as_millis() as i32;
            let latency = ((tcp_time * 3) + 20).max(1);
            PingNodeResponse {
                latency,
                tcp_time: Some(tcp_time),
                status: "ok".into(),
            }
        }
        Ok(Err(_)) => PingNodeResponse {
            latency: -2,
            tcp_time: None,
            status: "unreachable".into(),
        },
        Err(_) => PingNodeResponse {
            latency: -2,
            tcp_time: None,
            status: "timeout".into(),
        },
    }
}

#[tauri::command]
fn save_yaml(filename: String, content: String) -> Result<SaveYamlResponse, String> {
    let selected = FileDialog::new().set_file_name(&filename).save_file();

    let Some(path) = selected else {
        return Ok(SaveYamlResponse {
            canceled: true,
            path: None,
        });
    };

    fs::write(&path, content).map_err(|err| format!("写入 YAML 文件失败：{err}"))?;

    Ok(SaveYamlResponse {
        canceled: false,
        path: Some(path.to_string_lossy().to_string()),
    })
}

#[tauri::command]
fn copy_text(content: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|err| format!("初始化剪贴板失败：{err}"))?;
    clipboard
        .set_text(content)
        .map_err(|err| format!("写入剪贴板失败：{err}"))?;
    Ok(())
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    let status = Command::new("open")
        .arg("-R")
        .arg(path)
        .status()
        .map_err(|err| format!("调用 Finder 失败：{err}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("Finder 没有成功定位文件".into())
    }
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    let path = app_state_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(path).map_err(|err| format!("读取桌面状态失败：{err}"))?;
    let state = serde_json::from_str(&raw).map_err(|err| format!("解析桌面状态失败：{err}"))?;
    Ok(Some(state))
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, state: Value) -> Result<(), String> {
    let path = app_state_path(&app)?;
    let payload =
        serde_json::to_string_pretty(&state).map_err(|err| format!("序列化桌面状态失败：{err}"))?;
    fs::write(path, payload).map_err(|err| format!("写入桌面状态失败：{err}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_subscription,
            ping_node,
            save_yaml,
            copy_text,
            reveal_in_finder,
            load_app_state,
            save_app_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
