import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="i8_downloader",
    version="0.1.3",
    author="Moris Doratiotto",
    author_email="moris.doratiotto@gmail.com",
    description="A python module to download icons from icons8.com",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/mortafix/i8-downloader",
    packages=setuptools.find_packages(),
    install_requires=[
        "pymortafix==0.2.2",
        "requests",
        "tqdm",
    ],
    classifiers=[
        "Programming Language :: Python :: 3.8",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
    ],
    python_requires=">=3.8",
    keywords=["icons", "icons8", "download"],
    entry_points={"console_scripts": ["i8-downloader=i8_downloader.downloader:main"]},
)
