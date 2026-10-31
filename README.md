# FFCS Planner

A simple course and timetable planner. The self-contained `index.html` contains all runtime code, course data, and faculty reviews. Editable sources are in `src/`. Docker serves that file through NGINX; there is no backend, database, or application login.

## Run

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and keep it running. From this folder:

```sh
docker compose up -d --build
```

Open **http://localhost:8080**.

Stop it with:

```sh
docker compose down
```

The first build downloads the NGINX image and needs internet. The planner itself uses no external services. Each person's timetable and teacher lists are saved in their own browser. The file version and the Docker version use different browser storage, so their saved choices do not transfer automatically.

## Put this folder on GitHub

This folder is already a local Git repository on the creator's machine. Create an empty repository named `ffcs-planner` on GitHub, then run here, replacing `YOUR_USERNAME` with your GitHub username:

```sh
git remote add origin https://github.com/YOUR_USERNAME/ffcs-planner.git
git push -u origin main
```

The downloadable ZIP contains the project files without Git history. If you start from the ZIP, initialize it before adding the remote:

```sh
git init -b main
git add .
git commit -m "Add FFCS planner"
```

Share the repository URL. Friends run:

```sh
git clone https://github.com/YOUR_USERNAME/ffcs-planner.git
cd ffcs-planner
docker compose up -d --build
```

Then they open http://localhost:8080. Friends can also extract the ZIP and run the same Compose command without using Git.

## Update

Edit `index.html`, commit and push. Friends get the update with:

```sh
git pull
docker compose up -d --build
```

If port 8080 is occupied, set `FFCS_PORT` in a local `.env` file, for example:

```text
FFCS_PORT=8081
```

Then rerun `docker compose up -d --build` and open http://localhost:8081. The port is bound to localhost for use on each person's own computer.

Docker selects the appropriate image for the machine. No Mac- or Windows-specific paths are embedded in the container.

You can also open `index.html` directly in a browser without Docker.

Reference: [Docker's build-and-share workflow](https://docs.docker.com/get-started/introduction/index.html) and the [official NGINX image](https://hub.docker.com/_/nginx).

## Faculty reviews

Open the Reviews dropdown in a faculty row to see all source remarks. Lab assessment format is shown first. Imported blacklist labels always block selection, including when another source or a manual greenlist recommends the same person. Existing saved blacklisted choices are removed on load.

Spreadsheet labels are retained verbatim. Review-based fit follows the recorded preferences for predictability, fairness, lab DAs, lenient lab marking, moderate theory marking and moderate class averages. Assessments with unspecified frequency are labelled accordingly. Unknown or conflicting evidence remains visible. There are no numerical scores.

The All saved faculty reviews section can also find teachers without a current allocation. See `FACULTY_REVIEWS.md` for the category list and import details. The canonical review data is `src/reviews.json`. The source PDFs and spreadsheet are not copied into the repository.

After editing any files in `src/`, rebuild the standalone HTML before committing:

```sh
python3 build.py
docker compose up -d --build
```

Python is only needed to rebuild edited sources. Friends can run the committed `index.html` through Docker without Python.

The qualitative review rules are preserved in `tools/apply_review_preferences.py`. If you edit review points or those rules, regenerate the fit labels and then rebuild the HTML:

```sh
python3 tools/apply_review_preferences.py
python3 build.py
```

The rules use explicit remarks only: for example, “all lab assignments as tests” is not presented as proof of a test in every lab. Frequency stays unspecified unless a source states it.
