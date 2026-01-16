# OpenShift/Kubernetes deployment guide

This repository provides baseline OpenShift-ready manifests under `k8s/base/`.
Apply them with Kustomize so the Secret, PostgreSQL, and the app are created together.

## Deploy the manifests

```bash
oc apply -k k8s/base
```

## Configure secrets with real values

The manifests include a Secret template at `k8s/base/postgresql-secret.yaml` with placeholder values.
Replace the values in your cluster with real credentials before running in production:

```bash
oc apply -f k8s/base/postgresql-secret.yaml
oc create secret generic retrogemini-super-admin \
  --from-literal=POSTGRES_DB=retrogemini \
  --from-literal=POSTGRES_HOST=postgresql \
  --from-literal=POSTGRES_USER=retrogemini \
  --from-literal=POSTGRES_PASSWORD='<your-password>' \
  --from-literal=SUPER_ADMIN_PASSWORD='<your-admin-password>' \
  --dry-run=client -o yaml | oc apply -f -
```

## If your cluster pulls images through a Nexus mirror

If your OpenShift cluster cannot reach Docker Hub directly, point the app image to your Nexus mirror.
You can override the image after applying the manifests:

```bash
oc set image deployment/retrogemini \
  container=<nexus-host>/jpfroud/retrogemini:latest
```

## Cleanup

```bash
oc delete -k k8s/base
```
