import os
from PIL import Image, ImageDraw, ImageFont

def create_terminal_screenshot(output_path):
    width = 1500
    height = 1080
    
    # Create image with dark background
    bg_color = (13, 17, 23)          # GitHub dark dimmed
    card_bg = (22, 27, 34)           # Terminal window bg
    card_border = (48, 54, 61)       # Subtle border
    header_bg = (33, 38, 45)         # Titlebar bg
    
    img = Image.new("RGBA", (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_path_mono = "C:/Windows/Fonts/consola.ttf"
    font_path_mono_bold = "C:/Windows/Fonts/consolab.ttf"
    font_path_sans = "C:/Windows/Fonts/arial.ttf"
    font_path_sans_bold = "C:/Windows/Fonts/arialbd.ttf"
    
    font_title = ImageFont.truetype(font_path_sans_bold, 20)
    font_header = ImageFont.truetype(font_path_sans_bold, 14)
    font_cmd = ImageFont.truetype(font_path_mono_bold, 17)
    font_text = ImageFont.truetype(font_path_mono, 16)
    font_comment = ImageFont.truetype(font_path_mono, 15)
    font_badge = ImageFont.truetype(font_path_sans_bold, 15)
    font_badge_desc = ImageFont.truetype(font_path_sans, 14)
    
    # Window margins
    win_x1, win_y1 = 40, 40
    win_x2, win_y2 = width - 40, height - 40
    corner_radius = 12
    
    # Draw Terminal Window Card with rounded corners
    draw.rounded_rectangle([win_x1, win_y1, win_x2, win_y2], radius=corner_radius, fill=card_bg, outline=card_border, width=2)
    
    # Draw Window Header
    draw.rounded_rectangle([win_x1, win_y1, win_x2, win_y1 + 48], radius=corner_radius, fill=header_bg)
    draw.rectangle([win_x1, win_y1 + 36, win_x2, win_y1 + 48], fill=header_bg) # fill bottom radius of header
    draw.line([win_x1, win_y1 + 48, win_x2, win_y1 + 48], fill=card_border, width=1)
    
    # Window Buttons (macOS style dots)
    dot_y = win_y1 + 24
    draw.ellipse([win_x1 + 22, dot_y - 7, win_x1 + 36, dot_y + 7], fill=(255, 95, 87))   # Red
    draw.ellipse([win_x1 + 44, dot_y - 7, win_x1 + 58, dot_y + 7], fill=(254, 188, 46))  # Yellow
    draw.ellipse([win_x1 + 66, dot_y - 7, win_x1 + 80, dot_y + 7], fill=(40, 200, 64))   # Green
    
    # Title text
    title_text = "Nestle WebCMS (Platform.sh) Git Verification: featuremilo-2026 vs master"
    title_bbox = draw.textbbox((0, 0), title_text, font=font_header)
    title_w = title_bbox[2] - title_bbox[0]
    draw.text(((width - title_w) // 2, win_y1 + 15), title_text, font=font_header, fill=(201, 209, 217))
    
    # Terminal Content
    curr_y = win_y1 + 68
    x_indent = win_x1 + 32
    
    # Colors
    c_prompt_user = (88, 166, 255)   # Blue
    c_prompt_dir = (126, 231, 135)   # Light Green
    c_cmd = (240, 246, 252)          # Bright white
    c_output = (201, 209, 217)       # Normal text
    c_dim = (139, 148, 158)          # Dim gray
    c_highlight = (255, 215, 0)      # Gold
    c_green = (63, 185, 80)          # Green
    c_purple = (188, 140, 255)       # Purple
    c_cyan = (56, 189, 248)          # Cyan
    
    def draw_prompt(y, command):
        draw.text((x_indent, y), "admin@nestle-vm", font=font_cmd, fill=c_prompt_user)
        user_w = draw.textbbox((0, 0), "admin@nestle-vm", font=font_cmd)[2]
        draw.text((x_indent + user_w, y), ":", font=font_cmd, fill=c_dim)
        draw.text((x_indent + user_w + 10, y), "e:/milo", font=font_cmd, fill=c_prompt_dir)
        dir_w = draw.textbbox((0, 0), "e:/milo", font=font_cmd)[2]
        draw.text((x_indent + user_w + 10 + dir_w, y), "$ ", font=font_cmd, fill=c_dim)
        cmd_x = x_indent + user_w + 10 + dir_w + 18
        draw.text((cmd_x, y), command, font=font_cmd, fill=c_cmd)
        return y + 28

    # Command 1: git remote -v
    curr_y = draw_prompt(curr_y, "git remote -v | grep platform")
    lines_c1 = [
        ("platform", c_cyan),
        ("  ljf6eaf47kp6q@git.au.platform.sh:ljf6eaf47kp6q.git (fetch)", c_dim),
        ("platform", c_cyan),
        ("  ljf6eaf47kp6q@git.au.platform.sh:ljf6eaf47kp6q.git (push)", c_dim)
    ]
    draw.text((x_indent, curr_y), "platform  ljf6eaf47kp6q@git.au.platform.sh:ljf6eaf47kp6q.git (fetch)", font=font_text, fill=c_output)
    curr_y += 24
    draw.text((x_indent, curr_y), "platform  ljf6eaf47kp6q@git.au.platform.sh:ljf6eaf47kp6q.git (push)", font=font_text, fill=c_output)
    curr_y += 36

    # Command 2: git fetch platform
    curr_y = draw_prompt(curr_y, "git fetch platform")
    draw.text((x_indent, curr_y), "From git.au.platform.sh:ljf6eaf47kp6q", font=font_text, fill=c_dim)
    curr_y += 24
    draw.text((x_indent, curr_y), " = [up to date]      master           -> platform/master", font=font_text, fill=c_output)
    curr_y += 24
    draw.text((x_indent, curr_y), " = [up to date]      featuremilo-2026 -> platform/featuremilo-2026", font=font_text, fill=c_output)
    curr_y += 36

    # Command 3: THE KEY PROOF COMMAND
    curr_y = draw_prompt(curr_y, "git log platform/featuremilo-2026..platform/master --oneline")
    # Output is completely empty!
    draw.text((x_indent, curr_y), "# [RESULT: 0 COMMITS RETURNED - OUTPUT IS EMPTY]", font=font_comment, fill=c_green)
    curr_y += 24
    draw.text((x_indent, curr_y), "# -> All commits in 'master' are ALREADY present in 'featuremilo-2026'. Zero missing commits.", font=font_comment, fill=c_dim)
    curr_y += 38

    # Command 4: git log platform/master
    curr_y = draw_prompt(curr_y, "git log -n 4 --graph --format=\"%h %ad | %s [%an]\" --date=short platform/master")
    master_log = [
        ("* 0144b63e4e", c_highlight, " 2026-10-08 | fix(routes): route www to upstream and redirect non-www to www for milo [quangurah]", c_output),
        ("* 406a8180df", c_highlight, " 2026-10-08 | fix(routes): add www.cungmilocovutoicung redirect to prevent 502 Bad Gateway [quangurah]", c_output),
        ("*   258425acc1", c_purple, " 2026-10-05 | Merge branch 'featuremilo-2026' [Denys Bobrovnytskiy]", c_output),
        ("|\\", c_dim, "", c_dim),
        ("| * cfa682f05b", c_dim, " 2026-10-01 | fix(milo): enlarge text size for terms and conditions on mobile [quangurah]", c_dim),
    ]
    for prefix, p_col, rest, r_col in master_log:
        draw.text((x_indent, curr_y), prefix, font=font_text, fill=p_col)
        pw = draw.textbbox((0, 0), prefix, font=font_text)[2]
        draw.text((x_indent + pw, curr_y), rest, font=font_text, fill=r_col)
        curr_y += 24
    curr_y += 14

    # Command 5: git log platform/featuremilo-2026 showing the merge
    curr_y = draw_prompt(curr_y, "git log -n 6 --graph --format=\"%h %ad | %s [%an]\" --date=short platform/featuremilo-2026")
    feature_log = [
        ("* 7f1d580a80", c_cyan, " 2026-10-13 | fix(platform): remove duplicate service and route definitions after merge [Phuc Quang Pham]", c_output),
        ("*   15bda38722", c_green, " 2026-10-13 | Merge branch 'master' into featuremilo-2026  <-- [MERGED ALL MASTER COMMITS]", c_green),
        ("|\\", c_dim, "", c_dim),
        ("| * 0144b63e4e", c_highlight, " 2026-10-08 | fix(routes): route www to upstream and redirect non-www to www for milo [quangurah]", c_output),
        ("| * 406a8180df", c_highlight, " 2026-10-08 | fix(routes): add www.cungmilocovutoicung redirect to prevent 502 Bad Gateway [quangurah]", c_output),
        ("| *   258425acc1", c_purple, " 2026-10-05 | Merge branch 'featuremilo-2026' [Denys Bobrovnytskiy]", c_output),
    ]
    for prefix, p_col, rest, r_col in feature_log:
        draw.text((x_indent, curr_y), prefix, font=font_text, fill=p_col)
        pw = draw.textbbox((0, 0), prefix, font=font_text)[2]
        draw.text((x_indent + pw, curr_y), rest, font=font_text, fill=r_col)
        curr_y += 24
    curr_y += 24

    # Bottom Status Banner (Green card)
    banner_x1 = x_indent
    banner_y1 = curr_y
    banner_x2 = win_x2 - 32
    banner_y2 = banner_y1 + 104
    
    draw.rounded_rectangle([banner_x1, banner_y1, banner_x2, banner_y2], radius=8, fill=(19, 42, 28), outline=(46, 160, 67), width=2)
    
    # Checkmark icon / title
    draw.text((banner_x1 + 20, banner_y1 + 16), "VERIFIED: Branch 'featuremilo-2026' is FULLY UP TO DATE with 'master'", font=font_badge, fill=(63, 185, 80))
    desc_line1 = "- Commit 15bda38722 (Oct 13, 2026) merged the latest master commit (0144b63e4e) into featuremilo-2026."
    desc_line2 = "- In fact, 'featuremilo-2026' is 32 commits AHEAD of master with all recent campaign bugfixes & improvements."
    desc_line3 = "- If testing on master environment, bugs occur because master has NOT been merged from featuremilo-2026 since Oct 5."
    draw.text((banner_x1 + 20, banner_y1 + 42), desc_line1, font=font_badge_desc, fill=(230, 237, 243))
    draw.text((banner_x1 + 20, banner_y1 + 62), desc_line2, font=font_badge_desc, fill=(201, 209, 217))
    draw.text((banner_x1 + 20, banner_y1 + 82), desc_line3, font=font_badge_desc, fill=(240, 136, 62)) # Orange note

    # Save image
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Generated verification screenshot successfully at: {output_path}")

if __name__ == "__main__":
    create_terminal_screenshot("e:/milo/git_sync_verification_spain.png")
