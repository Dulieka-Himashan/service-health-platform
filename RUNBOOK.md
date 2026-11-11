# Runbook: Service Health & Incident Dashboard

Operations guide for the Minikube deployment. Namespaces: `shid` (app), `monitoring` (Prometheus, Grafana).

## 1. Prerequisites

Docker, Minikube, kubectl. About 4 GB free RAM for the cluster.

## 2. First-time setup

Secrets and two ConfigMaps are created by command and are **not** in Git.

```bash
minikube start
kubectl apply -f k8s/namespace.yaml

# App secrets (keys must match what the Deployments reference)
kubectl -n shid create secret generic db-credentials \
  --from-literal=POSTGRES_DB=<db-name> \
  --from-literal=POSTGRES_USER=<db-user> \
  --from-literal=POSTGRES_PASSWORD='<password>'

# DB schema, mounted at /docker-entrypoint-initdb.d (key: init.sql)
kubectl -n shid create configmap db-init --from-file=database/init.sql

# App
kubectl apply -f k8s/
kubectl -n shid wait --for=condition=ready pod --all --timeout=240s
```

### Monitoring

`kubectl apply -f k8s/` does not recurse, so apply monitoring separately.

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/prometheus-rules.yaml
kubectl -n monitoring create secret generic grafana-admin \
  --from-literal=admin-password="$(openssl rand -base64 18)"
kubectl -n monitoring create configmap grafana-dashboards \
  --from-file=k8s/monitoring/dashboard.json
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl -n monitoring wait --for=condition=ready pod --all --timeout=240s
```

Check `k8s/monitoring/grafana.yaml` for any other keys the `grafana-admin` secret needs and for the exact ConfigMap name and key it mounts.

## 3. Access

Port-forwards drop when a pod restarts or the VM sleeps. Run each in its own terminal tab.

| What | Command | URL |
|---|---|---|
| App | `kubectl -n shid port-forward svc/frontend 8080:80` | http://localhost:8080 |
| Grafana | `kubectl -n monitoring port-forward svc/grafana 3000:3000` | http://localhost:3000/d/shid-backend |
| Prometheus | `kubectl -n monitoring port-forward svc/prometheus 9090:9090` | http://localhost:9090/alerts |

Read the Grafana password in a terminal only. Never paste it into chat, tickets or commits:

```bash
kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d; echo
```

## 4. Verify a healthy system

```bash
kubectl get pods -A                 # all 1/1 Running
kubectl -n shid get pods            # note RESTARTS
```

- Grafana "Backend pods up" shows 2
- Prometheus Status → Targets: both backend pods UP
- Prometheus Alerts: `BackendNotReady` inactive

## 5. Deploying a new version

CI builds, scans and pushes images tagged with the full commit SHA on every push to `main`.

1. Update the `image:` tag in `k8s/backend-deployment.yaml` (or `frontend-deployment.yaml`) to the new SHA.
2. Preview: `kubectl diff -f k8s/backend-deployment.yaml`
3. Apply: `kubectl apply -f k8s/backend-deployment.yaml`
4. Watch: `kubectl -n shid rollout status deploy/backend`

Readiness probes gate the rolling update: new pods must pass `/ready` before old ones are removed. A bad image stalls the rollout while old pods keep serving.

## 6. Rollback

```bash
kubectl -n shid rollout history deploy/backend
kubectl -n shid rollout undo deploy/backend
kubectl -n shid rollout status deploy/backend
```

Then revert the image tag in Git so the repo matches the cluster.

## 7. Troubleshooting

| Symptom | Likely cause | Check / fix |
|---|---|---|
| Backend pods `0/1`, not restarting | Database unreachable (readiness `/ready` returns 503) | `kubectl -n shid get pods`; check Postgres pod; `kubectl -n shid logs deploy/postgres` |
| `BackendNotReady` firing | Same as above | Restore Postgres: `kubectl -n shid scale deploy/postgres --replicas=1` |
| Pod stuck `ImagePullBackOff` | Wrong tag or GHCR package private | `kubectl -n shid describe pod <pod>`; verify tag exists in GHCR |
| Pod `CrashLoopBackOff` | App error or missing Secret key | `kubectl -n shid logs <pod> --previous` |
| Postgres has no tables | `db-init` ConfigMap created after the DB's first start | Init scripts run only on an empty data dir; recreate the PVC (destroys data) or run `init.sql` manually with `psql` |
| Grafana/Prometheus page won't load | Port-forward died | Restart it (section 3) |
| Grafana panels empty | No traffic since Prometheus restarted (no persistent storage) | Generate requests; set range to last 15 minutes |
| `kubectl` connection refused | Minikube stopped (e.g. after VM reboot) | `minikube start` |

### Useful commands

```bash
kubectl -n shid logs deploy/backend
kubectl -n shid describe pod <pod>
kubectl -n shid get events --sort-by=.lastTimestamp
kubectl -n shid exec -it deploy/postgres -- psql -U <db-user> -d <db-name>
```

## 8. Failure drill: database outage

```bash
kubectl -n shid scale deploy/postgres --replicas=0
# ~90s: backends 0/1, restarts unchanged, frontend still up, alert FIRING
kubectl -n shid scale deploy/postgres --replicas=1
kubectl -n shid wait --for=condition=ready pod --all --timeout=180s
```

Expected: no backend restarts (liveness `/health` does not touch the DB), `/ready` returns 503 during the outage, and normal service after recovery. Data persists on the PVC.

## 9. Cleanup

```bash
kubectl delete ns shid monitoring     # removes workloads (PVC data too)
minikube stop                         # keeps the cluster
minikube delete                       # removes the cluster entirely
```

## 10. Known issues and limits

- **Restarts after a VM stall:** a backend pod was killed (exit 137, reason `Error`, not `OOMKilled`) around a period when the VM stalled. Likely a liveness probe timeout. Restarts can happen when the VM is suspended or under memory pressure.
- **Prometheus has no persistent storage:** metric history is lost when its pod or the cluster restarts.
- **Secrets are base64, not encrypted:** acceptable for a local lab, not for production.
- **Resource limits:** backend has a 256Mi memory limit and no CPU limit.
- **`/api/metrics` is reachable through the frontend proxy.** Block it in `nginx.conf`.
- **Trivy gate fails on CRITICAL only**, with unfixed vulnerabilities ignored.
- **Frontend nginx master process runs as root** (consider `nginx-unprivileged`).
- **Dev-tool audit findings:** `npm audit` reports issues in Jest's dev dependencies. Runtime dependencies are audited with `--omit=dev`.
- **`prom-client` is flagged as deprecated** upstream; revisit when choosing a metrics library.
- **Grafana plugin installs** need internet access from the cluster.
- **Port-forward is fragile.** An Ingress would be the production approach.
- No Alertmanager (alerts show only in Prometheus/Grafana), no automated deploy stage.
