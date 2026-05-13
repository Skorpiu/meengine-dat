# GitLab Runner on Windows (Docker Desktop + Git Bash)

This document describes a **local** GitLab Runner setup used for DAT development and CI on a Windows laptop: GitLab Runner runs in Docker Desktop, jobs use the Docker executor, and shells use Git Bash. It is operational guidance only; it does not change application or CI behavior.

Do **not** commit `config.toml` from the runner into git: it lives in the Docker volume and includes the registration `token = ...` line. Use placeholders in notes and examples only.

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

## 4. Docker executor cache, volumes, and pull policy (recommended)

On Windows, naive cache bind mounts are easy to misconfigure (for example Git Bash rewriting paths, pointing at `C:/Program Files/Git/cache`, or duplicating `/cache` entries). A **simple, reliable** local setup is to disable the runner’s Docker executor cache, use no extra volumes, and (for a **private project runner on one machine**) set **`pull_policy = "if-not-present"`** so jobs prefer the local `node:20` image instead of always pulling from the registry.

```toml
[runners.docker]
  pull_policy = "if-not-present"
  disable_cache = true
  volumes = []
```

If the runner is **shared** or **exposed beyond your own laptop**, review GitLab’s guidance on `pull_policy` and supply-chain expectations; `if-not-present` trades fresher automatic pulls for fewer registry round-trips and is not always appropriate on multi-tenant or untrusted workloads.

Edit the runner’s `config.toml` inside the config volume (for example by `docker exec` with an editor, or by inspecting the volume mount path from Docker Desktop’s docs). **Never** commit a file that contains your real `token =` line.

## 5. Timeouts while pulling `node:20` (effective pull policy `always`)

**Symptom:** a job sits for a long time and eventually times out while the log shows something like:

- `Using effective pull policy of [always]`
- `Pulling docker image node:20 ...`

**Why:** depending on runner defaults and registration, the effective Docker executor pull policy can be **`always`**, so every job tries to pull `node:20` from the registry. On a slow or flaky network (common on a home or mobile connection), that step can exceed the job’s patience window even though the image would work if it were already local.

**Mitigation (private project runner on your machine):**

1. **Pre-pull the image on the Docker host** (same machine where Docker Desktop runs):

   ```bash
   docker pull node:20
   ```

2. **Set `pull_policy = "if-not-present"`** under `[runners.docker]` in `/etc/gitlab-runner/config.toml` inside the runner container (merge with the fragment in section 4; keep **`disable_cache = true`** and **`volumes = []`** unless you have a deliberate, tested reason to change them). Edit without exposing secrets—for example open a shell and use an editor on the file:

   ```bash
   MSYS_NO_PATHCONV=1 docker exec -it gitlab-runner sh -lc 'vi /etc/gitlab-runner/config.toml'
   ```

   Avoid pasting or screensharing lines that contain **`token =`**. You are only adding or adjusting executor keys such as `pull_policy`, `disable_cache`, and `volumes`.

3. **Restart the runner container** so the change is picked up:

   ```bash
   docker restart gitlab-runner
   ```

4. **Verify** configuration still loads:

   ```bash
   MSYS_NO_PATHCONV=1 docker exec -it gitlab-runner gitlab-runner verify
   ```

5. In GitLab, **retry** the failed job or pipeline (see section 7).

**Same commands without `MSYS_NO_PATHCONV=1`** (for example **PowerShell** or **Command Prompt** on the Docker host):

```bash
docker pull node:20
docker exec -it gitlab-runner sh -lc 'vi /etc/gitlab-runner/config.toml'
docker restart gitlab-runner
docker exec -it gitlab-runner gitlab-runner verify
```

From **Git Bash**, keep the `MSYS_NO_PATHCONV=1` prefix on `docker exec` / `docker run` so POSIX paths are not rewritten (see above).

## 6. Verify the runner

```bash
MSYS_NO_PATHCONV=1 docker exec -it gitlab-runner gitlab-runner verify
```

You should see the runner configuration checked successfully.

## 7. Retry a failed pipeline or job

- **Whole pipeline:** GitLab → **CI/CD → Pipelines** → open the pipeline → **Retry**.
- **Single job:** open the job log → **Retry** (or from the pipeline graph, retry one job).

Re-running uses the same commit and `.gitlab-ci.yml` unless you start a new pipeline from a new push.

## Known non-blocking warning: long polling

You may see a warning about **long polling** and `request_concurrency=1`. For small projects and a single local runner, this is usually **non-blocking** and can be ignored unless GitLab or runner docs for your version recommend a specific tuning.

## Related

- **[deployment-readiness.md](./deployment-readiness.md)** — pre-deploy checks including `pnpm check`.
- **[environment-variables.md](./environment-variables.md)** — CI and host secrets; keep tokens out of the repo.
