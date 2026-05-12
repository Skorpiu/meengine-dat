# GitLab Runner on Windows (Docker Desktop + Git Bash)

This document describes a **local** GitLab Runner setup used for DAT development and CI on a Windows laptop: GitLab Runner runs in Docker Desktop, jobs use the Docker executor, and shells use Git Bash. It is operational guidance only; it does not change application or CI behavior.

Do **not** commit a `config.toml` that contains real runner authentication tokens. Use placeholders in notes and examples.

## Prerequisites

- **Docker Desktop** for Windows, running Linux containers.
- **Git for Windows** (includes **Git Bash**).
- A **project runner registration token** from GitLab: **Settings → CI/CD → Runners → New project runner** (or your org’s equivalent). The token format is typically `glrt-...`. Treat it like a secret; rotate it if it leaks.

This repository’s `.gitlab-ci.yml` assigns the tag **`dat`** to all jobs (`default.tags`). Register the runner in GitLab and assign the **`dat`** tag in the runner’s settings in the UI (see below); new runner flows may not accept `--tag-list` on the CLI.

## Git Bash and Linux-style paths

Git Bash (MSYS) can rewrite Linux-style paths (for example `/var/run/docker.sock`, `/cache`) into Windows paths when invoking `docker`, which breaks volume mounts.

**Fix:** prefix affected `docker` commands with `MSYS_NO_PATHCONV=1` so paths are passed through unchanged.

Example (one line; adjust names to match your setup):

```bash
MSYS_NO_PATHCONV=1 docker run -d --name gitlab-runner --restart always \
  -v //var/run/docker.sock:/var/run/docker.sock \
  -v gitlab-runner-config:/etc/gitlab-runner \
  gitlab/gitlab-runner:latest
```

Use the same prefix for any `docker run` / `docker exec` that mounts POSIX paths you need preserved literally.

## 1. Create a Docker volume for runner config

Persist registration data outside the container:

```bash
MSYS_NO_PATHCONV=1 docker volume create gitlab-runner-config
```

## 2. Start the GitLab Runner container

Use your preferred image tag (for example `gitlab/gitlab-runner:latest`). The important points are: bind-mount the Docker socket, mount the config volume, and use `MSYS_NO_PATHCONV=1` from Git Bash as shown above.

## 3. Register the runner

New **GitLab runner authentication tokens** (`glrt-...`) often **do not** accept `--tag-list` or `--run-untagged` during `gitlab-runner register`. Configure **tags** (for DAT: **`dat`**) and **run untagged** behavior in **GitLab → Settings → CI/CD → Runners** for that runner after registration.

Example registration (placeholders only; run inside the runner container or via `docker exec`):

```bash
MSYS_NO_PATHCONV=1 docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "<GITLAB_RUNNER_TOKEN>" \
  --executor "docker" \
  --docker-image "node:20" \
  --description "DAT local docker runner"
```

Replace `<GITLAB_RUNNER_TOKEN>` with the value from the GitLab UI. Do not paste real tokens into tickets, chat, or git history.

After registration, open the runner in GitLab and ensure tag **`dat`** is set so it picks up this project’s jobs.

## 4. Docker executor cache and volumes (recommended)

On Windows, naive cache bind mounts are easy to misconfigure (for example Git Bash rewriting paths, pointing at `C:/Program Files/Git/cache`, or duplicating `/cache` entries). A **simple, reliable** local setup is to disable the runner’s Docker executor cache and use no extra volumes:

```toml
[runners.docker]
  disable_cache = true
  volumes = []
```

Edit the runner’s `config.toml` inside the config volume (for example by `docker exec` with an editor, or by inspecting the volume mount path from Docker Desktop’s docs). **Never** commit a file that contains your real `token =` line.

## 5. Verify the runner

```bash
MSYS_NO_PATHCONV=1 docker exec -it gitlab-runner gitlab-runner verify
```

You should see the runner configuration checked successfully.

## 6. Retry a failed pipeline or job

- **Whole pipeline:** GitLab → **CI/CD → Pipelines** → open the pipeline → **Retry**.
- **Single job:** open the job log → **Retry** (or from the pipeline graph, retry one job).

Re-running uses the same commit and `.gitlab-ci.yml` unless you start a new pipeline from a new push.

## Known non-blocking warning: long polling

You may see a warning about **long polling** and `request_concurrency=1`. For small projects and a single local runner, this is usually **non-blocking** and can be ignored unless GitLab or runner docs for your version recommend a specific tuning.

## Related

- **[deployment-readiness.md](./deployment-readiness.md)** — pre-deploy checks including `pnpm check`.
- **[environment-variables.md](./environment-variables.md)** — CI and host secrets; keep tokens out of the repo.
