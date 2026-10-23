# API Usage Examples

> Examples use placeholders only. Never commit real credentials, tokens, patient details, or chat content. The login examples read a local demo password from `DEMO_PASSWORD`; choose it yourself and do not reuse it outside a local demo.

## Register a Mother

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Local Demo User","email":"demo-mother@example.com","password":"<strong-local-password>","role":"mother","preferred_language":"en"}'
```

Doctor and admin self-registration are rejected.

## Login

```bash
export DEMO_PASSWORD="<your-local-demo-password>"
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo-mother@example.com\",\"password\":\"$DEMO_PASSWORD\",\"portal\":\"mother\"}"
```

Admin login uses `/api/v1/auth/admin/login`. Store the returned access token in an environment variable; do not paste it into documentation or tickets.

```bash
export ACCESS_TOKEN="<access-token-from-response>"
```

## Current User

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## PCOS Prediction

Current request fields:

```bash
curl -X POST http://localhost:8000/api/v1/pcos/predict \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"age":28,"bmi":31,"cycle":2,"cycle_length":35,"weight_gain":true,"hair_growth":true,"skin_darkening":false,"hair_loss":true,"pimples":true}'
```

`cycle` is a neutral dataset encoding (`2` or `4`), not a clinical label. The response is a risk-support output, not a diagnosis.

## PPD Assessment

```bash
curl -X POST http://localhost:8000/api/v1/ppd/assessment \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answers":[0,1,0,1,0,1,0,0,1,0],"journal_text":"Optional local test text."}'
```

`answers` must contain exactly 10 integers, each 0–3. Do not put real patient text in example requests.

## Chat

```bash
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are common warning signs I should not ignore?","language":"en"}'
```

The reply may include `sources` resolved from retrieved knowledge-base or corpus IDs. Citations are traceability metadata, not proof of clinical correctness.

## CareCircle Access Request

A mother generates a QR token with `POST /carecircle/qr/generate`; a requester submits it:

```bash
curl -X POST http://localhost:8000/api/v1/carecircle/request-access \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"<qr-token-from-mother>","relationship_label":"Caregiver"}'
```

A request does not grant access. The mother must approve it and explicitly choose sharing scopes. Use placeholders for tokens; a real QR token is bearer-like until expiry.

## Doctor Patient List

```bash
curl http://localhost:8000/api/v1/doctor/patients \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

A doctor token only returns mothers with approved, unrevoked CareCircle access unless the account is an administrator.

## PowerShell Notes

PowerShell does not use `export` or `$VAR` in the same way as bash. Set values with `$env:DEMO_PASSWORD` and use `curl.exe` or `Invoke-RestMethod`. Avoid putting passwords directly on the command line; use local environment variables and clear them after testing.
