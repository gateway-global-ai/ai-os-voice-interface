# Getting Started with Rust MCP SDK

This guide walks you through setting up and running an MCP server using the `rust-mcp-sdk` crate. The canonical upstream tutorial lives with the SDK; this file is a local copy for offline reference while you work inside the AI OS voice app.

**Upstream:** [rust-mcp-stack / rust-mcp-sdk](https://github.com/rust-mcp-stack/rust-mcp-sdk)

## Prerequisites

- Rust (install via [rustup](https://rustup.rs/))
- Cargo (bundled with Rust)

## Step 1: Create a new project

```bash
cargo new hello-world-mcp-server
cd hello-world-mcp-server
```

You can also create a project from the **Coding agent** panel in the desktop app; it runs `cargo new` for you and stores the project in SQLite.

## Step 2: Add dependencies

```bash
cargo add rust-mcp-sdk
cargo add tokio async-trait serde serde_json
```

Example `Cargo.toml` fragment:

```toml
[dependencies]
async-trait = "0.1"
rust-mcp-sdk = "0.8"
serde = "1.0"
serde_json = "1.0"
tokio = "1.4"
```

## Step 3: `main()` with `SdkResult`

```rust
use rust_mcp_sdk::error::SdkResult;

#[tokio::main]
async fn main() -> SdkResult<()> {
    Ok(())
}
```

## Step 4–6: Tools, handler, transport

Define MCP tools (e.g. `say_hello`, `say_goodbye`) with `mcp_tool` / `JsonSchema`, implement `ServerHandler`, then create a `StdioTransport` and start the server via `server_runtime::create_server` with `McpServerOptions`. See the full SDK guide for `tools.rs`, `handler.rs`, and `main.rs` wiring.

## Test with MCP Inspector

Build a release binary, then:

```bash
npx -y @modelcontextprotocol/inspector ./target/release/hello-world-mcp-server
```

The **Coding agent** panel can run **Build release** and **MCP Inspector** for projects it created; it uses the same `npx` flow with paths resolved from your project directory.

## Desktop shortcut (Windows)

After installing the Tauri app, you can create a desktop shortcut that opens the Coding agent surface directly:

```text
"path\to\ai-os-voice.exe" --coding-agent
```

(Adjust the executable name to match your build output.)
