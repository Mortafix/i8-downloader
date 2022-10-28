from math import log
from os import path
from re import search
from sys import argv

from colorifix.colorifix import paint, ppaint
from pymortafix.utils import strict_input
from requests import get
from tqdm import tqdm

# ---- BASE

BASE_IMAGE_URL = "https://img.icons8.com"
BASE_FOLDER = "."
BASE_PACKAGE = "stickers"
BASE_SIZE = "1024"
BASE_COLOR = "000000"
BASE_ICONS = "star,heart"

# ---- UTILS


def is_valid_icon(url):
    if not search(r"img\.icons8\.com", url):
        ppaint("[#red]URL is not valid![/]\n")
        return None
    if not (match := search(r"com\/(\w+)\/(\d{2,4})\/(\w{6})\/([\w-]+\.png)", url)):
        ppaint("[#red]URL format is not valid![/]\n")
        return None
    return match.groups()


def is_2_power(size):
    if size == "":
        return True
    if not size.isdigit() or int(size) > 2100:
        return False
    return divmod(log(int(size), 2), 1)[1] == 0


def is_hex_color(color):
    if color == "":
        return True
    return search(r"[\dA-Fa-f]{6}", color)


def is_valid_icon_response(response):
    try:
        response.json()
        return False
    except Exception:
        return True


def is_valid_path(folder_path):
    if folder_path == "":
        return True
    return path.exists(folder_path)


# ---- SCRIPT


def main():

    res = None
    if len(argv) > 1 and (res := is_valid_icon(argv[-1])):
        ppaint("[#green]URL is valid![/]\n")
        package, size, color, _ = res

    if not res:
        # folder
        folder_base = f"[@bold]Folder [/@][[@underline]{BASE_FOLDER}[/@]][@bold]: [/@]"
        folder = (
            strict_input(
                paint(folder_base),
                wrong_text=paint(f"[#red]Path isn't exists![/] {folder_base}"),
                check=is_valid_path,
                flush=True,
            )
            or BASE_FOLDER
        )

        # package
        package_base = (
            f"[@bold]Package name [/@][[@underline]{BASE_PACKAGE}[/@]][@bold]: [/@]"
        )
        package = input(paint(package_base)) or BASE_PACKAGE

        # size
        size_base = f"[@bold]Size [/@][[@underline]{BASE_SIZE}[/@]][@bold]: [/@]"
        size = (
            strict_input(
                paint(size_base),
                wrong_text=paint(f"[#red]Need to be a power-2 number![/] {size_base}"),
                check=is_2_power,
            )
            or BASE_SIZE
        )

        # color
        color_base = f"[@bold]Color [/@][[@underline]{BASE_COLOR}[/@]][@bold]: [/@]"
        color = (
            strict_input(
                paint(color_base),
                wrong_text=paint(f"[#red]Need to be an HEX color![/] {color_base}"),
                check=is_hex_color,
            )
            or BASE_COLOR
        )

    # icons
    icon_base = f"[@bold]Icons [/@][[@underline]{BASE_ICONS}[/@]][@bold]: [/@]"
    icons = input(paint(icon_base)) or BASE_ICONS
    icons = [icon for icon in icons.replace(" ", ",").split(",") if icon]

    # downloading
    ppaint(
        f"\nDownloading [#blue]{', '.join(icons)}[/] from [#blue]{package}[/] package "
        f"in [#blue]{size}px[/] and [#blue]#{color}[/].."
    )
    for icon in tqdm(icons):
        file_path = path.join(folder, f"{icon}.png")
        if path.exists(file_path):
            continue
        response = get(f"{BASE_IMAGE_URL}/{package}/{size}/{color}/{icon}.png")
        if not is_valid_icon_response(response):
            continue
        open(file_path, "wb+").write(response.content)


if __name__ == "__main__":
    main()
