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

## Project structure

```
k8s/
├── base/                    # Main manifests (can be applied repeatedly)
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── postgresql-deployment.yaml
│   └── ...
├── overlays/
│   └── openshift/           # OpenShift-specific patches
└── secrets-templates/       # Example files (NOT applied automatically)
    ├── postgresql-secret.yaml.example
    └── smtp-secret.yaml.example
```

> **Important**: Secrets are intentionally excluded from `kustomization.yaml`.
> This allows you to run `oc apply -k k8s/base` as many times as needed
> without overwriting your configured secrets.

## Configure secrets with real values

> **CRITICAL: Change passwords BEFORE first deployment!**
>
> PostgreSQL initializes credentials only once, when the database volume is empty.
> After initialization, changing the Secret will NOT update the passwords in the database,
> causing authentication failures and pod crash loops.

### Recommended deployment order

**Step 1: Create the Secrets with your passwords FIRST**

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

**Step 2: Deploy the application (can be repeated safely)**

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

See `k8s/secrets-templates/smtp-secret.yaml.example` for a template.
To enable email, create the secret with your SMTP credentials:

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

## PostgreSQL backups

Regular backups are essential. PostgreSQL data can be corrupted by pod crashes,
storage issues, or accidental misconfiguration.

### Manual backup

```bash
# Create a backup
oc exec deployment/postgresql-retrogemini -- pg_dump -U retrogemini retrogemini > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup (after fresh deployment or data loss)
oc exec -i deployment/postgresql-retrogemini -- psql -U retrogemini retrogemini < backup_YYYYMMDD_HHMMSS.sql
```

### Automated backups with CronJob

Create a CronJob to backup daily to a separate PVC:

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: registry.redhat.io/rhel9/postgresql-15:latest
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backups/retrogemini_$(date +%Y%m%d_%H%M%S).sql"
              PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgresql -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
              # Keep only last 7 days of backups
              find /backups -name "*.sql" -mtime +7 -delete
              echo "Backup completed: $BACKUP_FILE"
            envFrom:
            - secretRef:
                name: retrogemini-super-admin
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: postgresql-backups
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-backups
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

### Best practices

- **Test your backups**: Regularly restore to a test environment
- **Store backups off-cluster**: Copy critical backups to external storage (S3, NFS, etc.)
- **Backup before upgrades**: Always backup before updating the application or PostgreSQL

## Cleanup

```bash
kubectl -n retrogemini delete -k k8s/base
oc -n retrogemini delete -k k8s/overlays/openshift
```
