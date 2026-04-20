//! Capture the Tauri **main** window region using the `screenshots` crate (same `image` types as the crate),
//! JPEG-encode, and return **base64** for Gemini `inlineImage` (`App.tsx`).

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use screenshots::display_info::DisplayInfo;
use screenshots::image::imageops::{self, FilterType};
use screenshots::image::{
    codecs::jpeg::JpegEncoder,
    ColorType, DynamicImage, ImageEncoder, RgbaImage,
};
use screenshots::Screen;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn capture_visual_context(app: AppHandle) -> Result<String, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Window 'main' not found".to_string())?;

    let pos = window
        .outer_position()
        .map_err(|e| format!("outer_position: {e}"))?;
    let size = window
        .outer_size()
        .map_err(|e| format!("outer_size: {e}"))?;

    if size.width == 0 || size.height == 0 {
        return Err("Window has zero size.".to_string());
    }

    let gx = pos.x;
    let gy = pos.y;
    let w = size.width;
    let h = size.height;

    tokio::task::spawn_blocking(move || capture_window_region_jpeg_b64(gx, gy, w, h))
        .await
        .map_err(|e| format!("capture task: {e}"))?
}

fn capture_window_region_jpeg_b64(gx: i32, gy: i32, w: u32, h: u32) -> Result<String, String> {
    let cx = gx + w as i32 / 2;
    let cy = gy + h as i32 / 2;

    let screen = Screen::from_point(cx, cy).map_err(|e| e.to_string())?;
    let di = screen.display_info;

    let rel_x = gx - di.x;
    let rel_y = gy - di.y;

    let rgba: RgbaImage = match screen.capture_area(rel_x, rel_y, w, h) {
        Ok(img) => img,
        Err(_) => {
            let full = screen.capture().map_err(|e| e.to_string())?;
            crop_window_from_screen(full, di, gx, gy, w, h)?
        }
    };

    let resized = downscale_max_width(rgba, 1280)?;
    let rgb = resized.to_rgb8();
    let mut buf = Vec::new();
    let enc = JpegEncoder::new_with_quality(&mut buf, 75);
    enc
        .write_image(rgb.as_raw(), rgb.width(), rgb.height(), ColorType::Rgb8)
        .map_err(|e| e.to_string())?;

    Ok(B64.encode(&buf))
}

fn crop_window_from_screen(
    full: RgbaImage,
    di: DisplayInfo,
    gx: i32,
    gy: i32,
    w: u32,
    h: u32,
) -> Result<RgbaImage, String> {
    let disp_left = di.x;
    let disp_top = di.y;
    let disp_right = di.x + di.width as i32;
    let disp_bottom = di.y + di.height as i32;

    let win_left = gx;
    let win_top = gy;
    let win_right = gx + w as i32;
    let win_bottom = gy + h as i32;

    let inter_left = win_left.max(disp_left);
    let inter_top = win_top.max(disp_top);
    let inter_right = win_right.min(disp_right);
    let inter_bottom = win_bottom.min(disp_bottom);

    if inter_left >= inter_right || inter_top >= inter_bottom {
        return Err("Window does not intersect the captured display.".to_string());
    }

    let sub_w = (inter_right - inter_left) as u32;
    let sub_h = (inter_bottom - inter_top) as u32;
    let src_x = (inter_left - disp_left) as u32;
    let src_y = (inter_top - disp_top) as u32;

    if src_x + sub_w > full.width() || src_y + sub_h > full.height() {
        return Err("Crop rectangle outside full-screen buffer.".to_string());
    }

    let sub = imageops::crop_imm(&full, src_x, src_y, sub_w, sub_h);
    Ok(sub.to_image())
}

fn downscale_max_width(img: RgbaImage, max_w: u32) -> Result<DynamicImage, String> {
    let (w, h) = (img.width(), img.height());
    if w <= max_w {
        return Ok(DynamicImage::ImageRgba8(img));
    }
    let new_h = ((h as f64) * (max_w as f64) / (w as f64)).round() as u32;
    Ok(
        DynamicImage::ImageRgba8(img).resize_exact(max_w, new_h, FilterType::Triangle),
    )
}
