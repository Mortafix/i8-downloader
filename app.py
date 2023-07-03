from io import BytesIO
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import streamlit as st
from requests import get

BASE_IMAGE_URL = "https://img.icons8.com"
STYLES = open("styles.txt").read().split("\n")

st.set_page_config(page_title="Wow Icons", page_icon="🦄")

# ---- UTILS


def get_icons_link(package, size, color, icon):
    return f"{BASE_IMAGE_URL}/{package}/{size}/{color[1:]}/{icon}.png"


@st.cache_data(show_spinner=False)
def search_icon(url):
    return get(url)


def is_valid(content):
    try:
        content.json()
        return False
    except Exception:
        return True


# ---- APP


def main():
    st.header("Icons Downloader 🦄")
    form = st.form("download")
    cols = form.columns((5, 1, 3))
    packages = cols[0].multiselect("Style", STYLES)
    color = cols[1].color_picker("Color")
    size = cols[2].selectbox("Size", [64, 128, 256, 512, 1024], index=4)
    icons = form.text_input("Icons", placeholder="Icons name separated by commas")
    if form.form_submit_button("Find 🔎", use_container_width=True):
        # retrieve
        with st.spinner("Searching.."):
            icons_url = {
                f"{package} {icon.strip()}": get_icons_link(
                    package, size, color, icon.strip()
                )
                for package in packages
                for icon in icons.split(",")
            }
            icons_html = {icon: search_icon(url) for icon, url in icons_url.items()}
            icons = {
                icon: url
                for icon, url in icons_url.items()
                if is_valid(icons_html.get(icon))
            }

        # no icons found
        if not icons:
            st.subheader("No icons found.. 🥲")
            return

        # display
        st.subheader(f"Found {len(icons)} icon(s)! 🥳", anchor=False)
        res_cols = st.columns(4)
        for i, (icon, url) in enumerate(icons.items()):
            res_cols[i % 4].image(url)
            res_cols[i % 4].info(f"**{icon}**")
        with st.expander("**URLs**"):
            st.json(icons)

        # download archive
        with NamedTemporaryFile(suffix=".zip") as tmp_zip:
            with ZipFile(tmp_zip.name, mode="w") as zipf:
                for icon in icons:
                    content = icons_html.get(icon).content
                    data = BytesIO(content)
                    with NamedTemporaryFile(suffix=".png") as tmp_file:
                        tmp_file.write(data.read())
                        tmp_file.flush()
                        zipf.write(tmp_file.name, f"{icon.replace(' ', '_')}.png")
            st.download_button(
                "Download **archive** with all icons ✅",
                open(tmp_zip.name, "rb"),
                "icons8-archive.zip",
                mime="application/zip",
                use_container_width=True,
            )


if __name__ == "__main__":
    main()
