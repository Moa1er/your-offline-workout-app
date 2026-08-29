# python script to generate clean, modern, minimalist white-theme fitness app icons and notification silhouettes

import os
from PIL import Image, ImageDraw

def create_sleek_fitness_logo(size=(1024, 1024), is_foreground=False, is_background=False, is_round=False, is_monochrome=False, is_light=True, is_silhouette=False):
    width, height = size

    # pure white for light theme, deep pitch black for dark
    bg_color = (255, 255, 255, 255) if is_light else (12, 10, 14, 255)

    if is_background:
        img = Image.new("RGBA", (width, height), bg_color)
        return img

    if is_foreground or is_monochrome or is_silhouette:
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (width, height), bg_color)

    draw = ImageDraw.Draw(img)
    cx, cy = width // 2, height // 2
    scale = width / 512.0

    # outer sleek rounded container/badge if not foreground / silhouette
    if not is_foreground and not is_monochrome and not is_silhouette:
        pad = int(24 * scale)
        rad = int(96 * scale)
        badge_bg = (255, 255, 255, 255) if is_light else (18, 16, 22, 255)
        badge_border = (230, 232, 235, 255) if is_light else (40, 36, 46, 255)
        draw.rounded_rectangle(
            [pad, pad, width - pad, height - pad],
            radius=rad,
            fill=badge_bg,
            outline=badge_border,
            width=int(4 * scale)
        )

        # subtle circular ring framing the barbell
        ring_r = int(175 * scale)
        ring_color = (240, 242, 245, 255) if is_light else (26, 24, 32, 255)
        draw.ellipse(
            [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
            outline=ring_color,
            width=int(12 * scale)
        )

    # color definitions
    if is_silhouette:
        color_bar = (255, 255, 255, 255)
        color_pink = (255, 255, 255, 255)
        color_teal = (255, 255, 255, 255)
        color_collar = (255, 255, 255, 255)
        color_center = (255, 255, 255, 255)
    elif is_monochrome:
        color_bar = (0, 0, 0, 255)
        color_pink = (80, 80, 80, 255)
        color_teal = (0, 0, 0, 255)
        color_collar = (120, 120, 120, 255)
        color_center = (40, 40, 40, 255)
    else:
        color_bar = (24, 24, 27, 255) if is_light else (255, 255, 255, 255)
        color_pink = (255, 45, 149, 255)      # cyber hot pink
        color_teal = (0, 175, 165, 255) if is_light else (0, 212, 199, 255) # vibrant cyber teal
        color_collar = (80, 80, 88, 255) if is_light else (180, 180, 190, 255)
        color_center = (255, 45, 149, 255)

    bar_len = int(155 * scale)
    bar_h = int(18 * scale)

    # 1. center barbell shaft
    draw.rounded_rectangle(
        [cx - bar_len, cy - bar_h // 2, cx + bar_len, cy + bar_h // 2],
        radius=int(6 * scale),
        fill=color_bar
    )

    # 2. center knurling / grip rings
    if not is_silhouette:
        grip_w = int(24 * scale)
        draw.rounded_rectangle(
            [cx - int(60 * scale) - grip_w, cy - bar_h // 2, cx - int(60 * scale), cy + bar_h // 2],
            radius=int(2 * scale),
            fill=color_collar
        )
        draw.rounded_rectangle(
            [cx + int(60 * scale), cy - bar_h // 2, cx + int(60 * scale) + grip_w, cy + bar_h // 2],
            radius=int(2 * scale),
            fill=color_collar
        )

    # 3. inner collars
    collar_w = int(14 * scale)
    collar_h = int(54 * scale)
    draw.rounded_rectangle(
        [cx - bar_len + int(12 * scale), cy - collar_h // 2, cx - bar_len + int(12 * scale) + collar_w, cy + collar_h // 2],
        radius=int(4 * scale),
        fill=color_collar
    )
    draw.rounded_rectangle(
        [cx + bar_len - int(12 * scale) - collar_w, cy - collar_h // 2, cx + bar_len - int(12 * scale), cy + collar_h // 2],
        radius=int(4 * scale),
        fill=color_collar
    )

    # 4. inner main weight plates (cyber teal)
    plate1_w = int(24 * scale)
    plate1_h = int(125 * scale)
    draw.rounded_rectangle(
        [cx - bar_len - int(18 * scale), cy - plate1_h // 2, cx - bar_len - int(18 * scale) + plate1_w, cy + plate1_h // 2],
        radius=int(7 * scale),
        fill=color_teal
    )
    draw.rounded_rectangle(
        [cx + bar_len + int(18 * scale) - plate1_w, cy - plate1_h // 2, cx + bar_len + int(18 * scale), cy + plate1_h // 2],
        radius=int(7 * scale),
        fill=color_teal
    )

    # 5. outer heavy weight plates (cyber hot pink)
    plate2_w = int(22 * scale)
    plate2_h = int(100 * scale)
    draw.rounded_rectangle(
        [cx - bar_len - int(46 * scale), cy - plate2_h // 2, cx - bar_len - int(46 * scale) + plate2_w, cy + plate2_h // 2],
        radius=int(6 * scale),
        fill=color_pink
    )
    draw.rounded_rectangle(
        [cx + bar_len + int(46 * scale) - plate2_w, cy - plate2_h // 2, cx + bar_len + int(46 * scale), cy + plate2_h // 2],
        radius=int(6 * scale),
        fill=color_pink
    )

    # 6. outer third plate accent (cyber teal)
    plate3_w = int(16 * scale)
    plate3_h = int(72 * scale)
    draw.rounded_rectangle(
        [cx - bar_len - int(68 * scale), cy - plate3_h // 2, cx - bar_len - int(68 * scale) + plate3_w, cy + plate3_h // 2],
        radius=int(5 * scale),
        fill=color_teal
    )
    draw.rounded_rectangle(
        [cx + bar_len + int(68 * scale) - plate3_w, cy - plate3_h // 2, cx + bar_len + int(68 * scale), cy + plate3_h // 2],
        radius=int(5 * scale),
        fill=color_teal
    )

    # 7. center sleek geometric emblem
    if not is_silhouette:
        emblem_r = int(28 * scale)
        draw.ellipse(
            [cx - emblem_r, cy - emblem_r, cx + emblem_r, cy + emblem_r],
            fill=color_center,
            outline=(255, 255, 255, 255) if is_light else (12, 10, 14, 255),
            width=int(4 * scale)
        )
        inner_dot_r = int(10 * scale)
        draw.ellipse(
            [cx - inner_dot_r, cy - inner_dot_r, cx + inner_dot_r, cy + inner_dot_r],
            fill=(255, 255, 255, 255)
        )

    if is_round:
        mask = Image.new('L', (width, height), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, width, height), fill=255)
        output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        output.paste(img, (0, 0), mask=mask)
        return output

    return img

def main():
    base_dir = r"c:\github\your-offline-workout-app"
    images_dir = os.path.join(base_dir, "assets", "images")
    res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")
    os.makedirs(images_dir, exist_ok=True)

    print("generating clean white-theme fitness app icons and notification silhouettes...")
    # 1. 1024x1024 main app icon (pure white theme)
    icon_1024 = create_sleek_fitness_logo((1024, 1024), is_light=True)
    icon_1024.save(os.path.join(images_dir, "icon.png"), "PNG")
    icon_1024.save(os.path.join(images_dir, "logo-light.png"), "PNG")
    icon_1024.save(os.path.join(images_dir, "expo-logo.png"), "PNG")
    icon_1024.save(os.path.join(images_dir, "expo-badge.png"), "PNG")
    icon_1024.save(os.path.join(images_dir, "expo-badge-white.png"), "PNG")
    icon_1024.save(os.path.join(images_dir, "logo-glow.png"), "PNG")

    icon_dark = create_sleek_fitness_logo((1024, 1024), is_light=False)
    icon_dark.save(os.path.join(images_dir, "logo-dark.png"), "PNG")

    # 2. android adaptive icon components (white background #ffffff)
    fg_512 = create_sleek_fitness_logo((512, 512), is_foreground=True, is_light=True)
    fg_512.save(os.path.join(images_dir, "android-icon-foreground.png"), "PNG")

    bg_512 = create_sleek_fitness_logo((512, 512), is_background=True, is_light=True)
    bg_512.save(os.path.join(images_dir, "android-icon-background.png"), "PNG")

    mono_512 = create_sleek_fitness_logo((512, 512), is_monochrome=True, is_light=True)
    mono_512.save(os.path.join(images_dir, "android-icon-monochrome.png"), "PNG")

    splash_img = create_sleek_fitness_logo((512, 512), is_foreground=True, is_light=True)
    splash_img.save(os.path.join(images_dir, "splash-icon.png"), "PNG")

    favicon_img = create_sleek_fitness_logo((64, 64), is_light=True)
    favicon_img.save(os.path.join(images_dir, "favicon.png"), "PNG")

    # 3. notification silhouette icon (pure white on transparent)
    notif_img = create_sleek_fitness_logo((96, 96), is_silhouette=True)
    notif_img.save(os.path.join(images_dir, "notification-icon.png"), "PNG")

    # 4. native android splash screen drawables across all densities
    drawable_sizes = {
        "drawable-mdpi": (128, 128),
        "drawable-hdpi": (192, 192),
        "drawable-xhdpi": (256, 256),
        "drawable-xxhdpi": (384, 384),
        "drawable-xxxhdpi": (512, 512),
    }

    for folder, size in drawable_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash_logo = create_sleek_fitness_logo(size, is_foreground=True, is_light=True)
        splash_logo.save(os.path.join(folder_path, "splashscreen_logo.png"), "PNG")

    # 5. native android notification drawables
    notif_sizes = {
        "drawable": (48, 48),
        "drawable-mdpi": (24, 24),
        "drawable-hdpi": (36, 36),
        "drawable-xhdpi": (48, 48),
        "drawable-xxhdpi": (72, 72),
        "drawable-xxxhdpi": (96, 96),
    }

    for folder, size in notif_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        notif_asset = create_sleek_fitness_logo(size, is_silhouette=True)
        notif_asset.save(os.path.join(folder_path, "notification_icon.png"), "PNG")

    # 6. native android mipmaps for launcher (clean white theme)
    mipmap_sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }

    for folder, size in mipmap_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        launcher_img = create_sleek_fitness_logo(size, is_light=True)
        launcher_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

        round_img = create_sleek_fitness_logo(size, is_round=True, is_light=True)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        fg_mip = create_sleek_fitness_logo(size, is_foreground=True, is_light=True)
        fg_mip.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

        bg_mip = create_sleek_fitness_logo(size, is_background=True, is_light=True)
        bg_mip.save(os.path.join(folder_path, "ic_launcher_background.png"), "PNG")

        mono_mip = create_sleek_fitness_logo(size, is_monochrome=True, is_light=True)
        mono_mip.save(os.path.join(folder_path, "ic_launcher_monochrome.png"), "PNG")

    print("all sleek white-theme app icons, notification silhouettes, and android mipmaps successfully generated.")

if __name__ == '__main__':
    main()
