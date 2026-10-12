# API Usage Examples

Register:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Mira","email":"mira@example.com","password":"Strong@123","role":"mother","preferred_language":"en"}'
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mira@example.com","password":"Strong@123"}'
```

PCOS prediction:

```bash
curl -X POST http://localhost:8000/api/v1/pcos/predict \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"age":28,"bmi":31,"cycle_irregularity":true,"hair_growth":true,"skin_darkening":false,"weight_gain":true,"follicle_count":18}'
```

