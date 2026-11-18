# IEADPG Media Worker (R2 Storage & Streaming)

Microsserviço de armazenamento de mídia, streaming com suporte a HTTP Range e zero custo de tráfego de saída (zero egress) da **IEADPG**.

## Arquitetura & Stack Tecnológica
- **Runtime**: Cloudflare Workers (TypeScript)
- **Framework Web**: [Hono v4](https://hono.dev/)
- **Storage**: Cloudflare R2 (`ieadpg` bucket)
- **Streaming & Cache**: Suporte nativo a HTTP Range (status 206), ETag e `Cache-Control: public, max-age=31536000, immutable`
- **Domínio**: `media.ieadpg.org`
- **CI/CD**: GitHub Actions com `cloudflare/wrangler-action`

## Rotas
- `GET /`: Informações sobre o serviço.
- `GET /:key`: Download ou streaming do arquivo no bucket R2 com suporte a `Range: bytes=start-end`.
- `HEAD /:key`: Obtenção dos metadados e tamanho do arquivo sem transferir o corpo.
- `PUT /:key`: Upload autenticado via token Bearer (`MEDIA_UPLOAD_SECRET`).

## Desenvolvimento Local
```bash
npm install
npm run typecheck
npm run dev
```
