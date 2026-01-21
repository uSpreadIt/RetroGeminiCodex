# OpenShift/Kubernetes deployment guide

This repository provides baseline Kubernetes manifests under `k8s/base/` plus an
OpenShift overlay under `k8s/overlays/openshift`. Apply them with Kustomize so the
Secret, PostgreSQL, and the app are created together.

## Kubernetes

```bash
kubectl create namespace retrogemini
kubectl apply -k k8s/base -n retrogemini
```

### Access the app locally (Docker Desktop)

The Service is exposed as a NodePort on `30080`, so you can open:

```
http://localhost:30080
```

### Update the image (example for a private Nexus registry)

```bash
kubectl -n retrogemini set image deployment/retrogemini \
  container=<nexus_repository>/jpfroud/retrogemini:1.12
```

### Troubleshooting: PostgreSQL pod stuck in Pending

If the PostgreSQL pod stays in **Pending**, it usually means the
`PersistentVolumeClaim` could not be bound (no default storage class or no
available storage). Check your storage classes and PVC status:

```bash
kubectl -n retrogemini get storageclass
kubectl -n retrogemini describe pvc retrogemini-postgresql-data
```

### Troubleshooting: app deployment stuck in Progressing

If the `retrogemini` Deployment shows **Progressing** with 0 ready pods, inspect
the pod events and logs:

```bash
kubectl -n retrogemini describe pod -l app=retrogemini
kubectl -n retrogemini logs -l app=retrogemini --all-containers
```

The base manifests set the app replicas to 2. If your cluster still shows 3
replicas from a previous apply, scale it back down:

```bash
kubectl -n retrogemini scale deployment/retrogemini --replicas=2
```

## OpenShift

```bash
oc new-project retrogemini
oc apply -k k8s/base
oc apply -k k8s/overlays/openshift
```

The OpenShift overlay switches PostgreSQL to the Red Hat image and adjusts the
expected environment variables and data directory. It also resets the app
Service back to ClusterIP because the Route is the public entrypoint.

## Configure secrets with real values

> **CRITICAL: Change passwords BEFORE first deployment!**
>
> PostgreSQL initializes credentials only once, when the database volume is empty.
> After initialization, changing the Secret will NOT update the passwords in the database,
> causing authentication failures and pod crash loops.

### Recommended deployment order

**Step 1: Create/update the Secret with your passwords FIRST**

```bash
oc -n <namespace> create secret generic retrogemini-super-admin \
  --from-literal=POSTGRES_DB=retrogemini \
  --from-literal=POSTGRES_HOST=postgresql \
  --from-literal=POSTGRES_USER=retrogemini \
  --from-literal=POSTGRES_PASSWORD='<your-secure-password>' \
  --from-literal=SUPER_ADMIN_PASSWORD='<your-admin-password>' \
  --dry-run=client -o yaml | oc apply -f -
```

If you are using Windows CMD, use `^` for line continuation:

```bat
oc -n <namespace> create secret generic retrogemini-super-admin ^
  --from-literal=POSTGRES_DB=retrogemini ^
  --from-literal=POSTGRES_HOST=postgresql ^
  --from-literal=POSTGRES_USER=retrogemini ^
  --from-literal=POSTGRES_PASSWORD="<your-secure-password>" ^
  --from-literal=SUPER_ADMIN_PASSWORD="<your-admin-password>" ^
  --dry-run=client -o yaml | oc apply -f -
```

**Step 2: Then deploy the application**

```bash
oc apply -k k8s/base
oc apply -k k8s/overlays/openshift  # for OpenShift only
```

### Changing passwords after initial deployment

If PostgreSQL is already initialized and you need to change the password:

**Option A: Fresh start (data loss)**

```bash
# Delete the PVC to reset the database
oc -n <namespace> delete pvc retrogemini-postgresql-data

# Update the Secret with new password (see Step 1 above)

# Redeploy - PostgreSQL will reinitialize with new credentials
oc rollout restart deployment/postgresql-retrogemini
```

**Option B: Keep existing data**

```bash
# 1. Update password in PostgreSQL
oc exec -it deployment/postgresql-retrogemini -- psql -U retrogemini -c \
  "ALTER USER retrogemini WITH PASSWORD '<new-password>';"

# 2. Update the Secret to match
oc -n <namespace> create secret generic retrogemini-super-admin \
  --from-literal=POSTGRES_DB=retrogemini \
  --from-literal=POSTGRES_HOST=postgresql \
  --from-literal=POSTGRES_USER=retrogemini \
  --from-literal=POSTGRES_PASSWORD='<new-password>' \
  --from-literal=SUPER_ADMIN_PASSWORD='<your-admin-password>' \
  --dry-run=client -o yaml | oc apply -f -

# 3. Restart the app to pick up new Secret
oc rollout restart deployment/retrogemini
```

## Configure SMTP for email (optional)

Email functionality is optional. When configured, it enables:
- Email invitations to join team sessions
- Password reset emails for teams with a facilitator email

The base manifests include an SMTP secret template at `k8s/base/smtp-secret.yaml` with empty values
(email disabled by default). To enable email, create the secret with your SMTP credentials:

```bash
oc -n <namespace> create secret generic retrogemini-smtp \
  --from-literal=SMTP_HOST='smtp.example.com' \
  --from-literal=SMTP_PORT='587' \
  --from-literal=SMTP_SECURE='false' \
  --from-literal=SMTP_USER='your-smtp-username' \
  --from-literal=SMTP_PASS='your-smtp-password' \
  --from-literal=FROM_EMAIL='noreply@example.com' \
  --dry-run=client -o yaml | oc apply -f -
```

If you are using Windows CMD, use `^` for line continuation:

```bat
oc -n <namespace> create secret generic retrogemini-smtp ^
  --from-literal=SMTP_HOST="smtp.example.com" ^
  --from-literal=SMTP_PORT="587" ^
  --from-literal=SMTP_SECURE="false" ^
  --from-literal=SMTP_USER="your-smtp-username" ^
  --from-literal=SMTP_PASS="your-smtp-password" ^
  --from-literal=FROM_EMAIL="noreply@example.com" ^
  --dry-run=client -o yaml | oc apply -f -
```

### SMTP configuration variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname (required to enable email) | _(empty - disabled)_ |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS (`true` or `false`) | `false` |
| `SMTP_USER` | SMTP authentication username | _(none)_ |
| `SMTP_PASS` | SMTP authentication password | _(none)_ |
| `FROM_EMAIL` | Sender email address | `SMTP_USER` |

> **Note**: If `SMTP_HOST` is empty or not set, email features are disabled but the application
> continues to work normally. Users can still share invite links manually.

## Cleanup

```bash
kubectl -n retrogemini delete -k k8s/base
oc -n retrogemini delete -k k8s/overlays/openshift
```
