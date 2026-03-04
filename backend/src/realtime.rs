use crate::handlers::auth::extract_claims;
use actix_web::{web, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeMessage {
    pub target_user_id: Option<String>,
    pub event: String,
    pub payload: serde_json::Value,
}

pub struct Hub {
    tx: broadcast::Sender<RealtimeMessage>,
}

impl Hub {
    pub fn new() -> Arc<Self> {
        let (tx, _) = broadcast::channel(100);
        Arc::new(Self { tx })
    }

    pub fn subscribe(&self) -> broadcast::Receiver<RealtimeMessage> {
        self.tx.subscribe()
    }

    pub fn send(&self, msg: RealtimeMessage) {
        let _ = self.tx.send(msg);
    }

    pub fn notify_user(&self, user_id: &str, event: &str, payload: serde_json::Value) {
        self.send(RealtimeMessage {
            target_user_id: Some(user_id.to_string()),
            event: event.to_string(),
            payload,
        });
    }

    pub fn broadcast(&self, event: &str, payload: serde_json::Value) {
        self.send(RealtimeMessage {
            target_user_id: None,
            event: event.to_string(),
            payload,
        });
    }
}

pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    hub: web::Data<Arc<Hub>>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = extract_claims(&req); // Optional auth
    let user_id = claims.map(|c| c.sub);

    let (res, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;

    let mut hub_rx = hub.subscribe();

    actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                // Messages from WebSocket client
                Some(Ok(msg)) = msg_stream.next() => {
                    match msg {
                        Message::Ping(bytes) => {
                            if session.pong(&bytes).await.is_err() { break; }
                        }
                        Message::Text(_) => {
                            // We don't really expect messages from client for now
                        }
                        Message::Close(reason) => {
                            let _ = session.close(reason).await;
                            break;
                        }
                        _ => {}
                    }
                }
                // Messages from Hub (Broadcast)
                Ok(msg) = hub_rx.recv() => {
                    // Send if it's a global broadcast or specifically for this user
                    let should_send = match &msg.target_user_id {
                        None => true,
                        Some(tid) => user_id.as_ref().map_or(false, |uid| uid == tid),
                    };

                    if should_send {
                        if let Ok(text) = serde_json::to_string(&msg) {
                            if session.text(text).await.is_err() { break; }
                        }
                    }
                }
                else => break,
            }
        }
    });

    Ok(res)
}
