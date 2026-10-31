# FFCS Planner

A simple course and timetable planner. All application code and course data are in `index.html`. Docker serves that file through NGINX; there is no backend, database, or application login.

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
