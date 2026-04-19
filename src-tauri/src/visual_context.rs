use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use image::{codecs::jpeg::JpegEncoder, ExtendedColorType, ImageEncoder};
use tauri::{AppHandle, Manager};

/// Capture the webview window as a JPEG and return it as a base64-encoded string.
///
/// - Runs entirely in Rust on a Tauri managed thread — zero browser main-thread cost.
/// - Captures only the webview surface (no OS title bar, no surrounding desktop).
/// - Downsamples to a max width of 1280 px before encoding to keep the payload small (~60–80 KB).
/// - JPEG quality 75 — visually lossless for UI screenshots at this size.
///
/// The caller (React frontend) caches the returned string in a `useRef` and attaches it
/// as `inlineData` in the Gemini multimodal request at query time.
#[tauri::command]
pub async fn capture_visual_context(app: AppHandle) -> Result<String, String> {
    // Grab the main webview window.
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Window 'main' not found".to_string())?;

    // capture_image() returns tauri::image::Image (RGBA8, packed rows).
    let capture = window
        .capture_image()
        .map_err(|e| format!("Capture failed: {e}"))?;

    let orig_w = capture.width();
    let orig_h = capture.height();
    let rgba_bytes = capture.rgba().to_vec();

    // Build an RgbaImage so we can resize.
    let img = image::RgbaImage::from_raw(orig_w, orig_h, rgba_bytes)
        .ok_or_else(|| "Failed to build RgbaImage from capture buffer".to_string())?;

    // Downsample to at most 1280 px wide, maintaining aspect ratio.
    let max_w: u32 = 1280;
    let dynamic = image::DynamicImage::ImageRgba8(img);
    let resized = if orig_w > max_w {
        let new_h = (orig_h as f64 * max_w as f64 / orig_w as f64).round() as u32;
        dynamic.resize(max_w, new_h, image::imageops::FilterType::Triangle)
    } else {
        dynamic
    };

    // Convert to RGB8 — JPEG does not support an alpha channel.
    let rgb = resized.to_rgb8();
    let (w, h) = (rgb.width(), rgb.height());
    let raw: &[u8] = rgb.as_raw();

    // JPEG-encode into a memory buffer.
    let mut jpeg_buf: Vec<u8> = Vec::with_capacity((w * h * 3 / 4) as usize);
    let encoder = JpegEncoder::new_with_quality(&mut jpeg_buf, 75);
    encoder
        .write_image(raw, w, h, ExtendedColorType::Rgb8)
        .map_err(|e| format!("JPEG encode failed: {e}"))?;

    Ok(BASE64_STANDARD.encode(&jpeg_buf))
}
