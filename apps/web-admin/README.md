# NextGuardian — Web Admin (console)

Console operacional do NextGuardian (perfil Family/MVP): login, visão geral, dispositivos, vínculo (código de ativação), assinatura e configurações. Consome a API do backend (`services/api`).

Next.js (App Router) + TypeScript + Tailwind CSS.

## Portas
- **Web (este app):** `3001`
- **Backend (`services/api`):** `3000`

Apenas essas duas portas. Configure o backend em `NEXT_PUBLIC_API_BASE_URL` (padrão `http://localhost:3000`).

## Executar (desenvolvimento)
```bash
# 1) backend, em services/api
npm run start          # porta 3000 (requer DATABASE_URL)

# 2) web, aqui
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_BASE_URL se preciso
npm install
npm run dev            # porta 3001
```

## Build
```bash
npm install
npm run build
npm start              # porta 3001
```
